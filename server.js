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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════
// App State
// ═══════════════════════════════════════════════
let s7 = null;
let sim = null;
let appMode = 'disconnected';   // 'disconnected' | 'plc' | 'simulation'
let blocks = {};                // blockId → block object

const BLOCKS_FILE = path.join(__dirname, 'data', 'blocks.json');

function loadBlocks() {
  try {
    if (fs.existsSync(BLOCKS_FILE)) {
      blocks = JSON.parse(fs.readFileSync(BLOCKS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to load blocks:', err);
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

loadBlocks();
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
  stopPoller();
  if (s7) { s7.disconnect(); s7 = null; }
  appMode = 'disconnected';
  broadcast({ type: 'status', connected: false, mode: 'disconnected' });
  res.json({ success: true });
});

app.get('/api/status', (req, res) => {
  res.json({
    mode: appMode,
    connected: appMode !== 'disconnected',
    blockCount: Object.keys(blocks).length,
    defaultOffsets: DEFAULT_OFFSETS,
  });
});

// ── PID Blocks ────────────────────────────────
app.get('/api/blocks', (req, res) => {
  res.json({ blocks: Object.values(blocks) });
});

app.post('/api/blocks', (req, res) => {
  const { name, dbNumber, pvUnit = '', spUnit = '', outputUnit = '%', offsets } = req.body;
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

  const { name, dbNumber, pvUnit, spUnit, outputUnit, offsets } = req.body;
  if (name)       b.name       = name;
  if (dbNumber)   b.dbNumber   = parseInt(dbNumber);
  if (pvUnit !== undefined)    b.pvUnit    = pvUnit;
  if (spUnit !== undefined)    b.spUnit    = spUnit;
  if (outputUnit !== undefined) b.outputUnit = outputUnit;
  if (offsets)    b.offsets    = { ...b.offsets, ...Object.fromEntries(Object.entries(offsets || {}).filter(([_, v]) => v !== '' && v !== null && v !== undefined)) };

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

        // ── Data Logger (write to CSV every 5s) ──
        const now = Date.now();
        if (now - (lastLogTime[id] || 0) >= LOG_INTERVAL_MS) {
          lastLogTime[id] = now;
          const dateStr = new Date(now).toISOString().slice(0, 10);
          const blockNameSafe = blocks[id].name.replace(/\W+/g, '_');
          const fileName = `log_${blockNameSafe}_${dateStr}.csv`;
          const filePath = path.join(LOGS_DIR, fileName);
          
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
// Shutdown Endpoint
// ═══════════════════════════════════════════════
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
server.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║   PID Tuning App  •  IOT2050 Ready   ║`);
  console.log(`  ╠══════════════════════════════════════╣`);
  console.log(`  ║  http://localhost:${PORT}               ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});
