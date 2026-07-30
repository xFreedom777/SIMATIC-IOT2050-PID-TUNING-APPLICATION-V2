// server.js — PID Tuning App Backend
// Express + WebSocket + S7-1200 + FOPDT Simulator

const express  = require('express');
const http     = require('http');
const WebSocket = require('ws');
const path     = require('path');
const fs       = require('fs');

const { S7Client, DEFAULT_OFFSETS } = require('./src/s7client');
const Simulator = require('./src/simulator');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const LOGS_DIR = path.join(__dirname, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR);
}

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════
// App State
// ═══════════════════════════════════════════════
let s7 = null;
let sim = null;
let appMode = 'disconnected';   // 'disconnected' | 'plc' | 'simulation'
let blocks = {};                // blockId → block object
let appConfig = { plcIp: '192.168.1.10', plcRack: 0, plcSlot: 0 };

const BLOCKS_FILE = path.join(__dirname, 'data', 'blocks.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

function loadBlocks() {
  try {
    if (fs.existsSync(BLOCKS_FILE)) {
      blocks = JSON.parse(fs.readFileSync(BLOCKS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to load blocks:', err);
  }
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      appConfig = { ...appConfig, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

function saveBlocks() {
  try {
    if (!fs.existsSync(path.dirname(BLOCKS_FILE))) {
      fs.mkdirSync(path.dirname(BLOCKS_FILE), { recursive: true });
    }
    fs.writeFileSync(BLOCKS_FILE, JSON.stringify(blocks, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save blocks:', err);
  }
}

function saveConfig() {
  try {
    if (!fs.existsSync(path.dirname(CONFIG_FILE))) {
      fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(appConfig, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

loadBlocks();
loadConfig();
let history = {};               // blockId → [{sp,pv,output,mode,timestamp}]
let pollerTimer = null;
const POLL_MS      = 500;
const MAX_HISTORY  = 10000;

const LOG_INTERVAL_MS = 5000;
let lastLogTime = {};

// ─── WebSocket broadcast ──────────────────────
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

// ─── Default block offsets ────────────────────
function defaultOffsets() {
  return { ...DEFAULT_OFFSETS };
}

// ═══════════════════════════════════════════════
// REST API
// ═══════════════════════════════════════════════

// ── Connection ────────────────────────────────
app.post('/api/connect', async (req, res) => {
  const { ip, rack = 0, slot = 0 } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP address required' });

  appConfig.plcIp = ip;
  appConfig.plcRack = rack;
  appConfig.plcSlot = slot;
  saveConfig();

  try {
    if (s7) { s7.disconnect(); s7 = null; }

    s7 = new S7Client();
    await s7.connect({ host: ip, rack: parseInt(rack), slot: parseInt(slot) });
    appMode = 'plc';

    broadcast({ type: 'status', connected: true, mode: 'plc', plcIp: ip });
    startPoller();
    res.json({ success: true });
  } catch (err) {
    s7 = null;
    appMode = 'disconnected';
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/connect', (req, res) => {
  try {
    stopPoller();
    appMode = 'disconnected';
    if (s7) {
      s7.dropConnection(() => {
        s7 = null;
        broadcast({ type: 'status', connected: false, mode: 'disconnected' });
        res.json({ success: true });
      });
    } else {
      broadcast({ type: 'status', connected: false, mode: 'disconnected' });
      res.json({ success: true });
    }
  } catch (err) {
    console.error('[Disconnect Error]:', err);
    broadcast({ type: 'status', connected: false, mode: 'disconnected' });
    res.json({ success: true });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    mode: appMode,
    connected: appMode !== 'disconnected',
    blockCount: Object.keys(blocks).length,
    defaultOffsets: DEFAULT_OFFSETS,
    plcConfig: appConfig
  });
});

// ── PID Blocks ────────────────────────────────
app.get('/api/blocks', (req, res) => {
  res.json({ blocks: Object.values(blocks) });
});

app.post('/api/blocks', (req, res) => {
  const { name, dbNumber, pvUnit = '', spUnit = '', outputUnit = '%', offsets, logInterval = 5, logPath = '', logAutoClearMonths = 1 } = req.body;
  if (!dbNumber) return res.status(400).json({ error: 'DB number required' });

  const id = `blk_${Date.now()}`;
  blocks[id] = {
    id,
    name:       name || `PID Loop ${Object.keys(blocks).length + 1}`,
    dbNumber:   parseInt(dbNumber),
    pvUnit,
    spUnit,
    outputUnit,
    offsets:    { ...defaultOffsets(), ...Object.fromEntries(Object.entries(offsets || {}).filter(([_, v]) => v !== '' && v !== null && v !== undefined)) },
    logInterval: parseInt(logInterval) || 5,
    logPath:     logPath,
    logAutoClearMonths: parseInt(logAutoClearMonths) || 1,
    params:     {},
    lastData:   null,
  };
  history[id] = [];

  // If simulation running, add the loop
  if (appMode === 'simulation' && sim) {
    sim.addLoop(id, {
      kp:               blocks[id].params.gain            ?? 1,
      ti:               blocks[id].params.ti              ?? 10,
      td:               blocks[id].params.td              ?? 0,
      setpoint:         blocks[id].params.setpoint        ?? 50,
      outputUpperLimit: blocks[id].params.outputUpperLimit ?? 100,
      outputLowerLimit: blocks[id].params.outputLowerLimit ?? 0,
    });
  }

  saveBlocks();
  res.json({ success: true, block: blocks[id] });
});

app.put('/api/blocks/:id', (req, res) => {
  const b = blocks[req.params.id];
  if (!b) return res.status(404).json({ error: 'Block not found' });

  const { name, dbNumber, pvUnit, spUnit, outputUnit, offsets, logInterval, logPath, logAutoClearMonths } = req.body;
  if (name)       b.name       = name;
  if (dbNumber)   b.dbNumber   = parseInt(dbNumber);
  if (pvUnit !== undefined)    b.pvUnit    = pvUnit;
  if (spUnit !== undefined)    b.spUnit    = spUnit;
  if (outputUnit !== undefined) b.outputUnit = outputUnit;
  if (offsets)    b.offsets    = { ...b.offsets, ...Object.fromEntries(Object.entries(offsets || {}).filter(([_, v]) => v !== '' && v !== null && v !== undefined)) };
  if (logInterval !== undefined) b.logInterval = parseInt(logInterval) || 5;
  if (logPath !== undefined)     b.logPath = logPath;
  if (logAutoClearMonths !== undefined) b.logAutoClearMonths = parseInt(logAutoClearMonths) || 1;

  saveBlocks();
  res.json({ success: true, block: b });
});

app.delete('/api/blocks/:id', (req, res) => {
  const { id } = req.params;
  if (!blocks[id]) return res.status(404).json({ error: 'Block not found' });

  if (sim) sim.removeLoop(id);
  delete blocks[id];
  delete history[id];
  saveBlocks();
  res.json({ success: true });
});

// ── Read parameters from PLC ──────────────────
app.get('/api/blocks/:id/read', async (req, res) => {
  const b = blocks[req.params.id];
  if (!b) return res.status(404).json({ error: 'Block not found' });
  if (appMode !== 'plc' || !s7) return res.status(400).json({ error: 'Not connected to PLC' });

  try {
    const params = await s7.readPIDParams(b.dbNumber, b.offsets);
    b.params = params;
    saveBlocks();
    res.json({ success: true, params });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Write parameters to PLC ───────────────────
app.post('/api/blocks/:id/write', async (req, res) => {
  const b = blocks[req.params.id];
  if (!b) return res.status(404).json({ error: 'Block not found' });

  const { params } = req.body;

  if (appMode === 'plc' && s7) {
    try {
      await s7.writePIDParams(b.dbNumber, b.offsets, params);
      b.params = { ...b.params, ...params };
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else if (appMode === 'simulation' && sim) {
    sim.updatePID(req.params.id, {
      kp:               params.gain,
      ti:               params.ti,
      td:               params.td,
      setpoint:         params.setpoint,
      outputUpperLimit: params.outputUpperLimit,
      outputLowerLimit: params.outputLowerLimit,
    });
    b.params = { ...b.params, ...params };
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Not connected' });
  }
});

// ── Change PID Mode ───────────────────────────
app.post('/api/blocks/:id/mode', async (req, res) => {
  const b = blocks[req.params.id];
  if (!b) return res.status(404).json({ error: 'Block not found' });

  const { mode } = req.body;

  if (appMode === 'plc' && s7) {
    try {
      await s7.setMode(b.dbNumber, b.offsets, mode);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else if (appMode === 'simulation' && sim) {
    sim.setMode(req.params.id, mode);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Not connected' });
  }
});

// ── Setpoint write ────────────────────────────
app.post('/api/blocks/:id/setpoint', async (req, res) => {
  const b = blocks[req.params.id];
  if (!b) return res.status(404).json({ error: 'Block not found' });

  const { setpoint } = req.body;

  if (appMode === 'plc' && s7) {
    try {
      await s7.writeSetpoint(b.dbNumber, b.offsets, setpoint);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else if (appMode === 'simulation' && sim) {
    sim.setSetpoint(req.params.id, setpoint);
    b.params.setpoint = parseFloat(setpoint);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Not connected' });
  }
});

// ── Manual output write ───────────────────────
app.post('/api/blocks/:id/manual', async (req, res) => {
  const b = blocks[req.params.id];
  if (!b) return res.status(404).json({ error: 'Block not found' });

  const { value } = req.body;

  if (appMode === 'plc' && s7) {
    try {
      await s7.writeManualValue(b.dbNumber, b.offsets, value);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else if (appMode === 'simulation' && sim) {
    sim.setManualOutput(req.params.id, value);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Not connected' });
  }
});

// ── Error reset ───────────────────────────────
app.post('/api/blocks/:id/reset-error', async (req, res) => {
  const b = blocks[req.params.id];
  if (!b) return res.status(404).json({ error: 'Block not found' });
  if (appMode !== 'plc' || !s7) return res.status(400).json({ error: 'Not connected to PLC' });

  try {
    await s7.resetError(b.dbNumber, b.offsets);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Historical data ───────────────────────────
app.get('/api/blocks/:id/history', (req, res) => {
  const data = history[req.params.id] || [];
  const limit = parseInt(req.query.limit) || 600;
  res.json({ data: data.slice(-limit) });
});

app.delete('/api/blocks/:id/history', (req, res) => {
  if (history[req.params.id]) history[req.params.id] = [];
  res.json({ success: true });
});

// ── Simulation Control ────────────────────────
app.post('/api/simulation/start', (req, res) => {
  if (appMode === 'plc') return res.status(400).json({ error: 'Disconnect from PLC first' });

  const { processGain = 1, timeConstant = 10, deadTime = 2 } = req.body;

  sim = new Simulator({ processGain, timeConstant, deadTime });

  Object.keys(blocks).forEach(id => {
    const b = blocks[id];
    sim.addLoop(id, {
      kp:               b.params.gain             ?? 1,
      ti:               b.params.ti               ?? 10,
      td:               b.params.td               ?? 0,
      setpoint:         b.params.setpoint          ?? 50,
      outputUpperLimit: b.params.outputUpperLimit  ?? 100,
      outputLowerLimit: b.params.outputLowerLimit  ?? 0,
    });
  });

  appMode = 'simulation';
  broadcast({ type: 'status', connected: true, mode: 'simulation' });
  startPoller();
  res.json({ success: true });
});

app.post('/api/simulation/stop', (req, res) => {
  stopPoller();
  if (sim) sim = null;
  appMode = 'disconnected';
  broadcast({ type: 'status', connected: false, mode: 'disconnected' });
  res.json({ success: true });
});

app.post('/api/simulation/process', (req, res) => {
  if (!sim) return res.status(400).json({ error: 'Simulation not running' });
  sim.updateProcess(req.body);
  res.json({ success: true });
});

// ── IMC Tuning calculator ─────────────────────
app.get('/api/tune/imc', (req, res) => {
  const K  = parseFloat(req.query.K)      || 1;
  const T  = parseFloat(req.query.T)      || 10;
  const L  = parseFloat(req.query.L)      || 2;
  const lam = parseFloat(req.query.lambda) || Math.max(T * 0.2, L);

  // IMC-based PID (for FOPDT)
  const Kp = T / (K * (lam + L));
  const Ti = T;
  const Td = L / 2;

  // Cohen-Coon (classic)
  const rr  = L / T;
  const Kp_cc = (1 / K) * (T / L) * (4/3 + rr/4);
  const Ti_cc = L * (32 + 6*rr) / (13 + 8*rr);
  const Td_cc = 4 * L / (11 + 2*rr);

  // Ziegler-Nichols (open-loop step)
  const Kp_zn = 1.2 / (K * rr);
  const Ti_zn = 2 * L;
  const Td_zn = 0.5 * L;

  res.json({
    imc:         { kp: +Kp.toFixed(4),    ti: +Ti.toFixed(4),    td: +Td.toFixed(4),    lambda: lam },
    cohenCoon:   { kp: +Kp_cc.toFixed(4), ti: +Ti_cc.toFixed(4), td: +Td_cc.toFixed(4) },
    ziglerNichols:{ kp: +Kp_zn.toFixed(4),ti: +Ti_zn.toFixed(4), td: +Td_zn.toFixed(4) },
  });
});

// ═══════════════════════════════════════════════
// Polling Loop (500ms)
// ═══════════════════════════════════════════════
function startPoller() {
  stopPoller();
  pollerTimer = setInterval(async () => {
    for (const id of Object.keys(blocks)) {
      try {
        let data = null;

        if (appMode === 'plc' && s7) {
          data = await s7.readMonitorValues(blocks[id].dbNumber, blocks[id].offsets);
        } else if (appMode === 'simulation' && sim) {
          data = sim.step(id);
        }

        if (!data) continue;

        const point = { ...data, timestamp: Date.now() };
        blocks[id].lastData = point;

        if (!history[id]) history[id] = [];
        history[id].push(point);
        if (history[id].length > MAX_HISTORY) history[id].shift();

        // ── Data Logger (write to CSV asynchronously) ──
        const now = Date.now();
        const intervalMs = (blocks[id].logInterval || 5) * 1000;
        if (now - (lastLogTime[id] || 0) >= intervalMs) {
          lastLogTime[id] = now;
          const dateStr = new Date(now).toISOString().slice(0, 10);
          const blockNameSafe = blocks[id].name.replace(/\W+/g, '_');
          const fileName = `log_${blockNameSafe}_${dateStr}.csv`;
          
          let targetDir = LOGS_DIR;
          if (blocks[id].logPath && blocks[id].logPath.trim() !== '') {
            targetDir = blocks[id].logPath.trim();
            if (!fs.existsSync(targetDir)) {
              try { fs.mkdirSync(targetDir, { recursive: true }); }
              catch(e) { targetDir = LOGS_DIR; } // fallback to default if error
            }
          }
          const filePath = path.join(targetDir, fileName);
          
          let line = '';
          if (!fs.existsSync(filePath)) {
            line += 'Time,Setpoint,ProcessValue,Output,Mode,State,ErrorBits\n';
          }
          const timeStr = new Date(now).toISOString();
          const { sp, pv, output, mode, state, errorBits } = point;
          line += `${timeStr},${sp},${pv},${output},${mode},${state},${errorBits||0}\n`;
          
          fs.appendFile(filePath, line, (err) => {
            if (err) console.error(`[Logger] Failed to write log for ${id}:`, err);
          });
        }

        broadcast({ type: 'data', blockId: id, ...point });
      } catch (err) {
        console.error(`[Poll] ${id}:`, err.message);
        if (appMode === 'plc') {
          broadcast({ type: 'error', blockId: id, message: err.message });
        }
      }
    }
  }, POLL_MS);
}

function stopPoller() {
  if (pollerTimer) { clearInterval(pollerTimer); pollerTimer = null; }
}

// ═══════════════════════════════════════════════
// WebSocket — send current state on connect
// ═══════════════════════════════════════════════
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'status',
    connected: appMode !== 'disconnected',
    mode: appMode,
  }));

  // Send latest data for all blocks
  Object.values(blocks).forEach(b => {
    if (b.lastData) {
      ws.send(JSON.stringify({ type: 'data', blockId: b.id, ...b.lastData }));
    }
  });
});

// ═══════════════════════════════════════════════
// Restart & Shutdown Endpoints
// ═══════════════════════════════════════════════
app.post('/api/restart', (req, res) => {
  console.log('[System] Restart requested via Web UI.');
  res.json({ status: 'restarting' });
  setTimeout(() => {
    require('child_process').exec('reboot', (err) => {
      if (err) console.error('Restart error:', err);
    });
  }, 2000);
});

app.post('/api/shutdown', (req, res) => {
  console.log('[System] Shutdown requested via Web UI. Waiting 10s...');
  res.json({ status: 'shutting_down' });
  setTimeout(() => {
    require('child_process').exec('poweroff', (err) => {
      if (err) console.error('Shutdown error:', err);
    });
  }, 10000); // 10 seconds delay
});

// ═══════════════════════════════════════════════
// Set System Time Endpoint
// ═══════════════════════════════════════════════
app.post('/api/system/time', (req, res) => {
  const { datetime } = req.body;
  if (!datetime) return res.status(400).json({ error: 'Datetime required' });
  const parts = datetime.split(' ');
  if (parts.length !== 2) return res.status(400).json({ error: 'Format must be DD/MM/YYYY HH:MM:SS' });
  const dateParts = parts[0].split('/');
  if (dateParts.length !== 3) return res.status(400).json({ error: 'Invalid date format' });
  
  const linuxDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]} ${parts[1]}`;
  const cmd = `timedatectl set-ntp false && timedatectl set-timezone Asia/Bangkok && date -s "${linuxDate}" && hwclock -w`;
  
  require('child_process').exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error('Time set error:', err);
      return res.status(500).json({ error: 'Failed to set time. Must run as root.' });
    }
    res.json({ success: true });
  });
});

// ═══════════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════════
// ── Data Logging APIs ──
app.get('/api/drives', (req, res) => {
  const drives = [];
  try {
    const os = require('os');
    if (os.platform() === 'win32') {
      const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ';
      for (let i = 0; i < letters.length; i++) {
        try { fs.accessSync(letters[i] + ':\\'); drives.push(letters[i] + ':\\'); } catch(e) {}
      }
    } else {
      ['/media', '/mnt', '/run/media'].forEach(base => {
        if (fs.existsSync(base)) {
          fs.readdirSync(base).forEach(item => {
            const full = path.join(base, item);
            try {
              if (fs.statSync(full).isDirectory()) {
                drives.push(full);
                if (base === '/media') {
                  fs.readdirSync(full).forEach(sub => {
                    const subFull = path.join(full, sub);
                    try { if (fs.statSync(subFull).isDirectory()) drives.push(subFull); } catch(e){}
                  });
                }
              }
            } catch(e) {}
          });
        }
      });
    }
  } catch (err) { console.error('Drive detect error:', err); }
  res.json({ drives });
});

app.get('/api/logs/:id', (req, res) => {
  const b = blocks[req.params.id];
  if (!b) return res.status(404).json({ error: 'Block not found' });
  
  let targetDir = LOGS_DIR;
  if (b.logPath && b.logPath.trim() !== '') {
    targetDir = b.logPath.trim();
  }
  
  if (!fs.existsSync(targetDir)) {
    return res.json({ logs: [] });
  }
  
  const blockNameSafe = b.name.replace(/\W+/g, '_');
  const prefix = `log_${blockNameSafe}_`;
  
  fs.readdir(targetDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to read logs directory' });
    const logs = [];
    files.forEach(file => {
      if (file.startsWith(prefix) && file.endsWith('.csv')) {
        const filePath = path.join(targetDir, file);
        const stats = fs.statSync(filePath);
        logs.push({
          filename: file,
          size: stats.size,
          mtime: stats.mtimeMs,
          path: filePath
        });
      }
    });
    // Sort descending by modified time
    logs.sort((a, b) => b.mtime - a.mtime);
    res.json({ logs });
  });
});

app.get('/api/logs/download/:id', (req, res) => {
  const b = blocks[req.params.id];
  if (!b) return res.status(404).json({ error: 'Block not found' });
  
  const filename = req.query.file;
  if (!filename) return res.status(400).json({ error: 'File name required' });
  
  let targetDir = LOGS_DIR;
  if (b.logPath && b.logPath.trim() !== '') {
    targetDir = b.logPath.trim();
  }
  
  const filePath = path.join(targetDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.download(filePath, filename);
});

// ── Auto-Clear Logs Routine ──
function autoClearLogs() {
  console.log('[Auto-Clear] Running log cleanup task...');
  const now = Date.now();
  Object.values(blocks).forEach(b => {
    const months = b.logAutoClearMonths || 1;
    const maxAgeMs = months * 30 * 24 * 60 * 60 * 1000;
    
    let targetDir = LOGS_DIR;
    if (b.logPath && b.logPath.trim() !== '') {
      targetDir = b.logPath.trim();
    }
    
    if (!fs.existsSync(targetDir)) return;
    
    const blockNameSafe = b.name.replace(/\W+/g, '_');
    const prefix = `log_${blockNameSafe}_`;
    
    fs.readdir(targetDir, (err, files) => {
      if (err) return;
      files.forEach(file => {
        if (file.startsWith(prefix) && file.endsWith('.csv')) {
          const filePath = path.join(targetDir, file);
          fs.stat(filePath, (err, stats) => {
            if (err) return;
            if (now - stats.mtimeMs > maxAgeMs) {
              fs.unlink(filePath, err => {
                if (!err) console.log(`[Auto-Clear] Deleted old log: ${filePath}`);
              });
            }
          });
        }
      });
    });
  });
}

// Run auto-clear on startup, then every 24 hours
setTimeout(autoClearLogs, 5000);
setInterval(autoClearLogs, 24 * 60 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║   PID Tuning App  •  IOT2050 Ready   ║`);
  console.log(`  ╠══════════════════════════════════════╣`);
  console.log(`  ║  http://localhost:${PORT}               ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});
