/* ═══════════════════════════════════════════════════════════
   PID Tuning Studio — app.js  (v2 — with PIN lock + chart fix)
   ═══════════════════════════════════════════════════════════ */
'use strict';

// ── State ──────────────────────────────────────────────────
const State = {
  mode:            'disconnected',
  selectedBlockId: null,
  blocks:          {},
  ws:              null,
  chart:           null,
  dashCharts:      {},
  chartWindow:     300,
  chartData:       {},
  lastLiveData:    {},
  simParams:       { K: 1, T: 10, L: 2, lambda: 5 },
  paramLocked:     true,   // locked by default
  alarms:          [],
  lastErrorBits:   {},
  lowPerfMode:     false,
  lastChartUpdate: 0
};

// ── PIN helpers (localStorage, base64 encoded — UX protection) ──
const PIN_KEY = 'pid_app_pin_hash';
function getStoredPin()  { return localStorage.getItem(PIN_KEY) || btoa('1234'); }
function hashPin(pin)    { return btoa(pin); }

// ── PIDCompact V2 offset descriptors ──────────────────────
const OFFSET_DEFS = [
  { key: 'setpoint',            tag: 'Setpoint',                  type: 'Real',  desc: 'Input: Setpoint value'              },
  { key: 'input',               tag: 'Input',                     type: 'Real',  desc: 'Input: Raw process value'           },
  { key: 'disturbance',         tag: 'Disturbance',               type: 'Real',  desc: 'Input: Disturbance (feedforward)'   },
  { key: 'manualValue',         tag: 'ManualValue',               type: 'Real',  desc: 'Input: Manual output value'         },
  { key: 'modeActivate',        tag: 'ModeActivate',              type: 'Bool',  desc: 'Input: Mode change trigger (bit 2)' },
  { key: 'scaledInput',         tag: 'ScaledInput',               type: 'Real',  desc: 'Output: Scaled PV'                 },
  { key: 'output',              tag: 'Output',                    type: 'Real',  desc: 'Output: Controller output (%)'      },
  { key: 'state',               tag: 'State',                     type: 'Int',   desc: 'Output: PID state code'             },
  { key: 'mode',                tag: 'Mode',                      type: 'Int',   desc: 'InOut: Operating mode'              },
  { key: 'errorBits',           tag: 'ErrorBits',                 type: 'DWord', desc: 'Output: Error code (PID fault)'      },
  { key: 'errorAck',            tag: 'ErrorAck',                  type: 'Bool',  desc: 'Input: Reset error acknowledgement (bit 0)' },
  { key: 'gain',                tag: 'Retain.Gain',               type: 'Real',  desc: 'Static: Proportional gain Kp'       },
  { key: 'ti',                  tag: 'Retain.Ti',                 type: 'Real',  desc: 'Static: Integration time (s)'       },
  { key: 'td',                  tag: 'Retain.Td',                 type: 'Real',  desc: 'Static: Derivative time (s)'        },
  { key: 'tdFiltRatio',         tag: 'Retain.TdFiltRatio',        type: 'Real',  desc: 'Static: Derivative filter (0–1)'    },
  { key: 'pWeighting',          tag: 'Retain.PWeighting',         type: 'Real',  desc: 'Static: P-action weighting'         },
  { key: 'dWeighting',          tag: 'Retain.DWeighting',         type: 'Real',  desc: 'Static: D-action weighting'         },
  { key: 'cycle',               tag: 'Retain.Cycle',              type: 'Real',  desc: 'Static: Sample time (s)'            },
  { key: 'setpointUpperLimit',  tag: 'Retain.SetpointUpperLimit', type: 'Real',  desc: 'Retain: SP upper limit'             },
  { key: 'setpointLowerLimit',  tag: 'Retain.SetpointLowerLimit', type: 'Real',  desc: 'Retain: SP lower limit'             },
  { key: 'outputUpperLimit',    tag: 'Retain.OutputUpperLimit',   type: 'Real',  desc: 'Retain: Output upper limit (%)'     },
  { key: 'outputLowerLimit',    tag: 'Retain.OutputLowerLimit',   type: 'Real',  desc: 'Retain: Output lower limit (%)'     },
  { key: 'inputUpperLimit',     tag: 'Config.InputUpperLimit',    type: 'Real',  desc: 'Config: PV scaling upper'           },
  { key: 'inputLowerLimit',     tag: 'Config.InputLowerLimit',    type: 'Real',  desc: 'Config: PV scaling lower'           },
  { key: 'invertControl',       tag: 'Config.InvertControl',      type: 'Bool',  desc: 'Config: Reverse acting control'     },
];

const DEFAULT_OFFSETS = {
  setpoint:0, input:4, disturbance:10, manualValue:14,
  modeActivate:18, scaledInput:20, output:24, state:32,
  error_bit:34, errorBits:36, mode:40,
  gain:50, ti:54, td:58, tdFiltRatio:62,
  pWeighting:66, dWeighting:70, cycle:74,
  setpointUpperLimit:78, setpointLowerLimit:82,
  outputUpperLimit:86, outputLowerLimit:90,
  inputUpperLimit:100, inputLowerLimit:104, invertControl:116,
};
let currentOffsets = { ...DEFAULT_OFFSETS };

// ══════════════════════════════════════════════
// Init
// ══════════════════════════════════════════════
window.onload = async () => {
  try {
    initChart();
    initDashCharts();
  } catch (err) {
    console.error('Chart init failed:', err);
    toast('Chart Error: ' + err.message, 'error', 30000); // 30 seconds
  }
  connectWebSocket();
  await fetchStatus();
  setInterval(updateAnalytics, 2000);

  // Lock button right-click → Change PIN
  const lb = document.getElementById('lockBtn');
  if (lb) {
    lb.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!State.paramLocked) openChangePinModal();
      else toast('Unlock first to change PIN', 'warning');
    });
  }
  
  applyLockState();
};

// ══════════════════════════════════════════════
// WebSocket
// ══════════════════════════════════════════════
function connectWebSocket() {
  try {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = location.hostname === 'localhost' ? '127.0.0.1' : location.hostname;
    let port = location.port ? ':' + location.port : '';
    
    State.ws = new WebSocket(`${proto}//${host}${port}/`);
    State.ws.onopen    = () => {
      console.log('[WS] Connected');
      toast('WebSocket Connected!', 'success', 2000);
    };
    State.ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type === 'status') onStatus(msg);
      if (msg.type === 'data')   onData(msg);
      if (msg.type === 'error')  { toast(msg.message, 'error'); }
    };
    State.ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      toast('WebSocket Error! Connection failed.', 'error', 10000);
    };
    State.ws.onclose = () => {
      toast('WebSocket Disconnected. Reconnecting...', 'warning');
      setTimeout(connectWebSocket, 3000);
    };
  } catch (err) {
    console.error('[WS] Setup Error:', err);
    setTimeout(connectWebSocket, 5000);
  }
}

function onStatus(msg) { State.mode = msg.mode; updateStatusUI(); }

function onData(msg) {
  const { blockId, sp, pv, output, mode, state, errorBits } = msg;
  State.lastLiveData[blockId] = { sp, pv, output, mode, state, errorBits, timestamp: msg.timestamp };
  if (blockId === State.selectedBlockId) updateLiveDisplay(sp, pv, output, mode, state, errorBits);
  pushChartData(blockId, sp, pv, output, msg.timestamp);
  
  if (typeof dlUpdateLive === 'function') dlUpdateLive(msg);
  
  // Alarm History Detection
  const prevErr = State.lastErrorBits[blockId] || 0;
  if (errorBits !== prevErr) {
    detectNewAlarms(blockId, prevErr, errorBits || 0);
    State.lastErrorBits[blockId] = errorBits || 0;
  }

  const dot = document.querySelector(`[data-block-dot="${blockId}"]`);
  if (dot) dot.className = `block-dot ${state === 3 ? 'online' : state === 0 ? '' : 'error'}`;
}

function decodePIDError(errBits) {
  if (!errBits) return null;
  const errors = [];
  if (errBits & 0x0001) errors.push('PV out of limits');
  if (errBits & 0x0002) errors.push('Input_PER out of limits');
  if (errBits & 0x0004) errors.push('Wire break');
  if (errBits & 0x0008) errors.push('Error during tuning');
  if (errBits & 0x0010) errors.push('Invalid parameters (Gain, Ti, Td)');
  if (errBits & 0x0020) errors.push('Invalid Setpoint / ManualValue');
  if (errBits & 0x0040) errors.push('Invalid output limits');
  if (errBits & 0x0080) errors.push('Sampling time error');
  if (errBits & 0x10000) errors.push('Pre-tuning failed');
  if (errBits & 0x20000) errors.push('Fine tuning failed');
  if (errors.length === 0) errors.push(`Unknown Error (16#${errBits.toString(16)})`);
  return errors;
}

function detectNewAlarms(blockId, oldBits, newBits) {
  const block = State.blocks[blockId];
  const bName = block ? block.name : 'Unknown Loop';
  const newSetBits = newBits & ~oldBits; // Bits that just turned on
  
  const errMap = [
    { bit: 0x0001, msg: 'PV out of limits', fix: 'Check PV scaling limits (InputLowerLimit, InputUpperLimit) and sensor wiring.' },
    { bit: 0x0002, msg: 'Input_PER out of limits', fix: 'Check analog input wiring and limits for Input_PER.' },
    { bit: 0x0004, msg: 'Wire break', fix: 'Check sensor wiring to analog input card.' },
    { bit: 0x0008, msg: 'Error during tuning', fix: 'Process too unstable. Increase step size or check manual mode.' },
    { bit: 0x0010, msg: 'Invalid parameters', fix: 'Gain, Ti, Td cannot be 0. Click "Write to PLC" to send valid defaults.' },
    { bit: 0x0020, msg: 'Invalid Setpoint / ManualValue', fix: 'Check Setpoint limits. SP must be between SP Lower and Upper limits.' },
    { bit: 0x0040, msg: 'Invalid output limits', fix: 'OutputUpperLimit must be greater than OutputLowerLimit.' },
    { bit: 0x0080, msg: 'Sampling time error', fix: 'Ensure PID_Compact is called in a Cyclic Interrupt OB (e.g. OB30).' },
    { bit: 0x10000, msg: 'Pre-tuning failed', fix: 'PV is too close to SP. Move PV away from SP before tuning.' },
    { bit: 0x20000, msg: 'Fine tuning failed', fix: 'Process is not stable enough or oscillation cannot be determined.' }
  ];

  let added = false;
  errMap.forEach(e => {
    if (newSetBits & e.bit) {
      // Prevent spam: don't add if the exact same alarm is already at the top
      const lastAlarm = State.alarms[0];
      if (!lastAlarm || lastAlarm.block !== bName || lastAlarm.msg !== e.msg) {
        State.alarms.unshift({ time: new Date(), block: bName, msg: e.msg, fix: e.fix });
        added = true;
      }
    }
  });
  
  if (added) {
    if (State.alarms.length > 50) State.alarms.length = 50; // Reduce max rows to 50 for performance on IOT2050
    renderAlarmHistory();
  }
}

function renderAlarmHistory() {
  const tbody = document.getElementById('alarmHistoryBody');
  if (!tbody) return;
  if (State.alarms.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text-muted);">No alarms recorded yet.</td></tr>';
    return;
  }
  tbody.innerHTML = State.alarms.map(a => `
    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="padding:10px 14px; color:var(--text-muted);">${a.time.toLocaleTimeString()}</td>
      <td style="padding:10px 14px; color:#f87171; font-weight:500;">[${a.block}]<br/>${a.msg}</td>
      <td style="padding:10px 14px; color:#94a3b8;">${a.fix}</td>
    </tr>
  `).join('');
}

function clearAlarmHistory() {
  State.alarms = [];
  renderAlarmHistory();
  toast('Alarm history cleared', 'info');
}

// ══════════════════════════════════════════════
// API helpers
// ══════════════════════════════════════════════
async function api(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch (e) { throw new Error('Server Error: ' + text.substring(0, 80)); }
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

async function fetchStatus() {
  try {
    const data = await api('GET', '/api/status');
    State.mode = data.mode;
    updateStatusUI();
    
    if (data.plcConfig) {
      document.getElementById('plcIp').value = localStorage.getItem('plcIp') || data.plcConfig.plcIp || '192.168.1.10';
      document.getElementById('plcRack').value = localStorage.getItem('plcRack') || data.plcConfig.plcRack || 0;
      document.getElementById('plcSlot').value = localStorage.getItem('plcSlot') || data.plcConfig.plcSlot || 0;
    }
    
    const bdata = await api('GET', '/api/blocks');
    bdata.blocks.forEach(b => {
      State.blocks[b.id] = b;
      State.chartData[b.id] = { sp:[], pv:[], out:[], labels:[] };
    });
    renderBlockList();
  } catch (_) {}
}

// ══════════════════════════════════════════════
// Connection
// ══════════════════════════════════════════════
async function toggleConnect() {
  if (State.mode === 'plc') {
    try { 
      await api('DELETE', '/api/connect'); 
      toast('Disconnected', 'info'); 
      State.mode = 'disconnected';
      updateStatusUI();
    }
    catch (e) { toast(e.message, 'error'); }
  } else {
    const ip   = document.getElementById('plcIp').value.trim();
    const rack = parseInt(document.getElementById('plcRack').value, 10);
    const slot = parseInt(document.getElementById('plcSlot').value, 10);

    // Save to browser cache so it remembers on refresh
    localStorage.setItem('plcIp', ip);
    localStorage.setItem('plcRack', rack);
    localStorage.setItem('plcSlot', slot);
    
    if (!ip) return toast('Enter PLC IP address', 'warning');
    const btn = document.getElementById('connectBtn');
    btn.textContent = '⏳ Connecting...';
    btn.disabled = true;
    try {
      await api('POST', '/api/connect', { ip, rack, slot });
      toast(`Connected to S7-1200 at ${ip}`, 'success');
      State.mode = 'plc';
      updateStatusUI();
    } catch (e) { 
      toast(e.message, 'error'); 
      btn.textContent = '⚡ Connect to PLC'; 
    }
    finally { btn.disabled = false; }
  }
}

// ══════════════════════════════════════════════
// Status UI
// ══════════════════════════════════════════════
function updateStatusUI() {
  const dot        = document.getElementById('statusDot');
  const statusTxt  = document.getElementById('statusText');
  const modeChip   = document.getElementById('modeChip');
  const connectBtn = document.getElementById('connectBtn');
  const simBtn     = document.getElementById('simBtn');
  const readBtn    = document.getElementById('readBtn');
  const offsetBtn  = document.getElementById('offsetBtn');
  const m = State.mode;

  dot.className    = `status-dot ${m === 'plc' ? 'connected' : m === 'simulation' ? 'simulating' : ''}`;
  modeChip.className = `mode-chip ${m === 'plc' ? 'plc' : m === 'simulation' ? 'simulation' : 'offline'}`;

  if (m === 'plc') {
    statusTxt.textContent = 'PLC Connected';
    modeChip.textContent  = 'LIVE PLC';
    connectBtn.innerHTML  = '<span>⛔</span> Disconnect';
    connectBtn.className  = 'btn btn-danger btn-full';
    simBtn.disabled = true;
    readBtn.disabled = false;
    offsetBtn.disabled = false;
  } else if (m === 'simulation') {
    statusTxt.textContent = 'Simulation Running';
    modeChip.textContent  = 'SIMULATION';
    connectBtn.innerHTML  = '<span>⚡</span> Connect to PLC';
    connectBtn.className  = 'btn btn-primary btn-full';
    simBtn.disabled = false;
    simBtn.textContent = '⬛ Stop Simulation';
    readBtn.disabled = true;
    offsetBtn.disabled = true;
  } else {
    statusTxt.textContent = 'Disconnected';
    modeChip.textContent  = 'OFFLINE';
    connectBtn.innerHTML  = '<span>⚡</span> Connect to PLC';
    connectBtn.className  = 'btn btn-primary btn-full';
    simBtn.disabled = false;
    simBtn.textContent = '🔬 Start Simulation';
    readBtn.disabled = true;
    offsetBtn.disabled = true;
  }
}

// ══════════════════════════════════════════════
// Block Management
// ══════════════════════════════════════════════
function openAddBlockModal() {
  ['newBlockName','newBlockDB','newBlockSpUnit','newBlockPvUnit'].forEach(id => document.getElementById(id).value = '');
  openModal('addBlockModal');
}

async function confirmAddBlock() {
  const name   = document.getElementById('newBlockName').value.trim();
  const dbNum  = document.getElementById('newBlockDB').value;
  const spUnit = document.getElementById('newBlockSpUnit').value.trim();
  const pvUnit = document.getElementById('newBlockPvUnit').value.trim();
  if (!dbNum) return toast('DB Number is required', 'warning');
  try {
    const data = await api('POST', '/api/blocks', {
      name: name || `PID Loop ${Object.keys(State.blocks).length + 1}`,
      dbNumber: dbNum, spUnit, pvUnit, offsets: { ...currentOffsets },
    });
    State.blocks[data.block.id] = data.block;
    State.chartData[data.block.id] = { sp:[], pv:[], out:[], labels:[] };
    renderBlockList();
    selectBlock(data.block.id);
    closeModal('addBlockModal');
    toast(`Added: ${data.block.name}`, 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteBlock(id, evt) {
  evt.stopPropagation();
  try {
    await api('DELETE', `/api/blocks/${id}`);
    delete State.blocks[id];
    delete State.chartData[id];
    delete State.lastLiveData[id];
    if (State.selectedBlockId === id) {
      State.selectedBlockId = null;
      clearLiveDisplay();
    }
    renderBlockList();
    toast('Loop removed', 'info');
  } catch (e) { toast(e.message, 'error'); }
}

function renderBlockList() {
  const list = document.getElementById('blockList');
  const ids  = Object.keys(State.blocks);
  if (ids.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding:20px">
      <div class="empty-icon">📊</div>
      <div class="empty-text text-sm">No loops added yet</div></div>`;
    return;
  }
  list.innerHTML = ids.map(id => {
    const b = State.blocks[id];
    const active = id === State.selectedBlockId ? ' active' : '';
    return `<div class="block-item${active}" onclick="selectBlock('${id}')" id="blockItem_${id}">
      <div class="block-dot" data-block-dot="${id}"></div>
      <div class="block-info">
        <div class="block-name">${b.name}</div>
        <div class="block-sub">DB${b.dbNumber}${b.pvUnit ? ` • ${b.pvUnit}` : ''}</div>
      </div>
      <button class="btn btn-xs btn-ghost block-del" onclick="deleteBlock('${id}',event)">✕</button>
    </div>`;
  }).join('');
  
  if (typeof dlUpdateTopicList === 'function') dlUpdateTopicList();
}

function selectBlock(id) {
  State.selectedBlockId = id;
  document.querySelectorAll('.block-item').forEach(el => el.classList.remove('active'));
  const item = document.getElementById(`blockItem_${id}`);
  if (item) item.classList.add('active');
  const block = State.blocks[id];
  const pvUnit = block.pvUnit || '';
  const spUnit = block.spUnit || pvUnit;
  document.getElementById('lv-sp-unit').textContent   = spUnit;
  document.getElementById('lv-pv-unit').textContent   = pvUnit;
  document.getElementById('lv-out-unit').textContent  = '%';
  document.getElementById('spLabel').textContent      = `Setpoint (${spUnit})`;
  document.getElementById('spControlCard').style.display = 'block';
  const live = State.lastLiveData[id];
  if (live) updateLiveDisplay(live.sp, live.pv, live.output, live.mode, live.state, live.errorBits);
  renderParams(block);
  rebuildChart(id);
  document.getElementById('paramActions').style.display = 'flex';
}

// ══════════════════════════════════════════════
// Live Display
// ══════════════════════════════════════════════
function updateLiveDisplay(sp, pv, output, mode, state, errorBits) {
  document.getElementById('lv-sp').textContent  = fmt(sp);
  document.getElementById('lv-pv').textContent  = fmt(pv);
  document.getElementById('lv-out').textContent = fmt(output);

  const modes = {
    0: { btn: 'modeInactive', cls: 'active-inactive' },
    3: { btn: 'modeAuto',     cls: 'active-auto'     },
    4: { btn: 'modeManual',   cls: 'active-manual'   },
    5: { btn: 'modeInactive', cls: 'active-inactive' },
  };
  document.querySelectorAll('.pid-mode-btn').forEach(b => b.className = 'pid-mode-btn');
  const m = modes[mode] || modes[0];
  const mBtn = document.getElementById(m.btn);
  if (mBtn) mBtn.classList.add(m.cls);

  document.getElementById('manualOutSection').style.display = (mode === 4) ? 'block' : 'none';

  const stateNames = { 0:'Inactive', 1:'Pre-tuning', 2:'Fine tuning', 3:'Auto', 4:'Manual', 5:'Hold' };
  document.getElementById('stateLabel').textContent = `State: ${stateNames[state] || state}`;

  const hasError = state < 0 || state > 5 || errorBits > 0;
  document.getElementById('resetErrBtn').style.display = hasError ? 'inline-flex' : 'none';

  const errList = decodePIDError(errorBits);
  let alarmBanner = document.getElementById('alarmBanner');
  if (!alarmBanner) {
    alarmBanner = document.createElement('div');
    alarmBanner.id = 'alarmBanner';
    alarmBanner.className = 'alarm-banner';
    const liveRow = document.querySelector('.live-row');
    if (liveRow) liveRow.parentNode.insertBefore(alarmBanner, liveRow);
  }
  if (errList && errList.length > 0) {
    alarmBanner.style.display = 'block';
    alarmBanner.innerHTML = `⚠️ <b>PID ALARM:</b> ${errList.join(' | ')}`;
  } else {
    alarmBanner.style.display = 'none';
  }

  const spInput = document.getElementById('spInput');
  if (sp !== undefined && spInput.value === '') spInput.placeholder = fmt(sp);
}

function clearLiveDisplay() {
  ['lv-sp','lv-pv','lv-out'].forEach(id => document.getElementById(id).textContent = '—');
  document.getElementById('spControlCard').style.display = 'none';
}

function fmt(v, d = 2) {
  if (v === null || v === undefined) return '—';
  return typeof v === 'number' ? v.toFixed(d) : v;
}

// ══════════════════════════════════════════════
// Parameters Panel
// ══════════════════════════════════════════════
function renderParams(block) {
  const p      = block.params || {};
  const pvUnit = block.pvUnit || '';
  const spUnit = block.spUnit || pvUnit;

  document.getElementById('paramScroll').innerHTML = `
    <div class="param-section-title">🎯 Control</div>
    <div class="param-grid">
      ${pf('setpoint',           'Setpoint',             p.setpoint,            spUnit, 'Desired process value')}
      ${pf('gain',               'Proportional Gain Kp', p.gain,                '',     'Proportional action (larger=faster, may oscillate)')}
      ${pf('ti',                 'Integration Time Ti',  p.ti,                  's',    'Integral time constant')}
      ${pf('td',                 'Derivative Time Td',   p.td,                  's',    'Derivative time (0 = disable D action)')}
    </div>
    <div class="param-section-title">⚡ Output Limits</div>
    <div class="param-grid">
      ${pf('outputUpperLimit',   'Output Max',           p.outputUpperLimit,    '%',    'Maximum controller output')}
      ${pf('outputLowerLimit',   'Output Min',           p.outputLowerLimit,    '%',    'Minimum controller output')}
    </div>
    <div class="param-section-title">📐 Input (PV) Scaling</div>
    <div class="param-grid">
      ${pf('inputUpperLimit',    'PV Scaling Max',       p.inputUpperLimit,     pvUnit, 'Engineering range upper')}
      ${pf('inputLowerLimit',    'PV Scaling Min',       p.inputLowerLimit,     pvUnit, 'Engineering range lower')}
    </div>
    <div class="param-section-title">🎛 Setpoint Limits</div>
    <div class="param-grid">
      ${pf('setpointUpperLimit', 'SP Upper Limit',       p.setpointUpperLimit,  spUnit, 'Maximum allowed setpoint')}
      ${pf('setpointLowerLimit', 'SP Lower Limit',       p.setpointLowerLimit,  spUnit, 'Minimum allowed setpoint')}
    </div>
    <div class="param-section-title">🔧 Advanced</div>
    <div class="param-grid">
      ${pf('tdFiltRatio',        'Derivative Filter',    p.tdFiltRatio,         '',     'D filter coefficient (0=max filter, 1=no filter)')}
      ${pf('pWeighting',         'P-action Weighting',   p.pWeighting,          '',     '0=SP based, 1=error based')}
      ${pf('dWeighting',         'D-action Weighting',   p.dWeighting,          '',     '0=PV based (recommended), 1=error based')}
      ${pf('cycle',              'Sample Time',          p.cycle,               's',    'PIDCompact execution cycle time')}
    </div>
  `;
  applyLockState();   // ← Apply lock immediately after render
}

function pf(key, label, value, unit, desc) {
  const v = (value !== undefined && value !== null) ? Number(value).toFixed(4).replace(/\.?0+$/, '') : '';
  return `<div class="param-field">
    <div class="param-label">${label}</div>
    <div class="param-value-row">
      <input class="param-input" type="number" step="any" id="p_${key}" value="${v}" placeholder="—">
      <span class="param-unit">${unit}</span>
    </div>
    ${desc ? `<div class="param-desc">${desc}</div>` : ''}
  </div>`;
}
// alias for backward compat
function paramField(k,l,v,u,d) { return pf(k,l,v,u,d); }

async function readAllParams() {
  if (!State.selectedBlockId) return toast('Select a PID loop first', 'warning');
  try {
    const data = await api('GET', `/api/blocks/${State.selectedBlockId}/read`);
    State.blocks[State.selectedBlockId].params = data.params;
    renderParams(State.blocks[State.selectedBlockId]);
    toast('Parameters read from PLC ✓', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function writeAllParams() {
  if (!State.selectedBlockId) return toast('Select a PID loop first', 'warning');
  if (State.paramLocked) return toast('🔒 Parameters are locked. Click the lock button to unlock.', 'warning');

  const paramKeys = ['setpoint','gain','ti','td','tdFiltRatio','pWeighting','dWeighting',
    'cycle','outputUpperLimit','outputLowerLimit','setpointUpperLimit','setpointLowerLimit',
    'inputUpperLimit','inputLowerLimit'];
  const params = {};
  paramKeys.forEach(k => {
    const el = document.getElementById(`p_${k}`);
    if (el && el.value !== '') params[k] = parseFloat(el.value);
  });
  try {
    await api('POST', `/api/blocks/${State.selectedBlockId}/write`, { params });
    State.blocks[State.selectedBlockId].params = {
      ...State.blocks[State.selectedBlockId].params, ...params
    };
    toast('Parameters written ✓', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════
// Mode & Setpoint Controls
// ══════════════════════════════════════════════
async function setPIDMode(mode) {
  if (!State.selectedBlockId) return toast('Select a PID loop first', 'warning');
  try {
    await api('POST', `/api/blocks/${State.selectedBlockId}/mode`, { mode });
    const names = { 0:'Inactive', 3:'Auto', 4:'Manual', 5:'Hold' };
    toast(`Mode → ${names[mode] || mode}`, 'info');
  } catch (e) { toast(e.message, 'error'); }
}

async function writeSetpoint() {
  if (!State.selectedBlockId) return toast('Select a PID loop first', 'warning');
  const sp = document.getElementById('spInput').value;
  if (sp === '') return toast('Enter setpoint value', 'warning');
  try {
    await api('POST', `/api/blocks/${State.selectedBlockId}/setpoint`, { setpoint: parseFloat(sp) });
    toast(`Setpoint → ${sp}`, 'success');
  } catch (e) { toast(e.message, 'error'); }
}

function onManualSlider(val) {
  document.getElementById('manualSliderVal').textContent = parseFloat(val).toFixed(1);
  if (!State.selectedBlockId) return;
  api('POST', `/api/blocks/${State.selectedBlockId}/manual`, { value: parseFloat(val) })
    .catch(console.error);
}

async function resetError() {
  if (!State.selectedBlockId) return;
  try {
    await api('POST', `/api/blocks/${State.selectedBlockId}/reset-error`);
    toast('Error acknowledged', 'info');
  } catch (e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════
// Trend Chart
// ══════════════════════════════════════════════
function initChart() {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded (no internet). Chart disabled.');
    const el = document.getElementById('trendChart');
    if (el && el.parentElement) {
      el.parentElement.innerHTML = '<div style="color:var(--amber); text-align:center; margin-top:100px; font-size:20px;">⚠️ Trend Graph Unavailable<br><span style="font-size:14px; color:var(--text-muted);">Chart.js could not load from CDN. Please connect to internet once to cache it.</span></div>';
    }
    return;
  }
  const ctx = document.getElementById('trendChart').getContext('2d');
  State.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label:'SP',     data:[], borderColor:'#00d4ff', borderDash:[6,3], borderWidth:1.5, pointRadius:0, tension:0.3 },
        { label:'PV',     data:[], borderColor:'#22c55e', borderWidth:2,    pointRadius:0, tension:0.3 },
        { label:'Output', data:[], borderColor:'#f59e0b', borderWidth:1.5,  pointRadius:0, tension:0.3, yAxisID:'y2' },
      ],
    },
    options: {
      responsive:true, maintainAspectRatio:false, animation:false,
      interaction:{ intersect:false, mode:'index' },
      plugins:{
        legend:{ display:false },
        tooltip:{ backgroundColor:'rgba(7,13,26,0.95)', borderColor:'rgba(255,255,255,0.1)', borderWidth:1, titleColor:'#8b9ab5', bodyColor:'#f0f6ff', padding:10 },
      },
      scales:{
        x:{ type:'category', ticks:{ color:'#4a5a75', maxTicksLimit:6, font:{size:10} }, grid:{ color:'rgba(255,255,255,0.04)' } },
        y:{ position:'left', ticks:{ color:'#4a5a75', font:{size:10} }, grid:{ color:'rgba(255,255,255,0.04)' } },
        y2:{ position:'right', min:0, max:100, ticks:{ color:'#f59e0b', font:{size:10}, callback:v=>v+'%' }, grid:{ display:false } },
      },
    },
  });
}

function pushChartData(blockId, sp, pv, output, ts) {
  if (!State.chart || typeof Chart === 'undefined') return;
  if (!State.chartData[blockId]) State.chartData[blockId] = { sp:[], pv:[], out:[], labels:[] };
  const cd = State.chartData[blockId];
  const label = new Date(ts).toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const numSp = Number(sp);
  const numPv = Number(pv);
  const numOut = Number(output);
  cd.sp.push(isNaN(numSp) ? 0 : numSp); 
  cd.pv.push(isNaN(numPv) ? 0 : numPv); 
  cd.out.push(isNaN(numOut) ? 0 : numOut); 
  cd.labels.push(label);
  const maxPts = State.chartWindow * 30;
  if (cd.sp.length > maxPts) { cd.sp.shift(); cd.pv.shift(); cd.out.shift(); cd.labels.shift(); }
  if (blockId === State.selectedBlockId) {
    State.chart.data.labels           = cd.labels;
    State.chart.data.datasets[0].data = cd.sp;
    State.chart.data.datasets[1].data = cd.pv;
    State.chart.data.datasets[2].data = cd.out;
    if (State.lowPerfMode) {
      const now = Date.now();
      if (now - State.lastChartUpdate > 1000) {
        State.chart.update('none'); // Update without animation
        State.lastChartUpdate = now;
      }
    } else {
      State.chart.update();
    }
  }
}

function exportChartCSV() {
  if (!State.selectedBlockId) return toast('Select a PID loop first', 'warning');
  const cd = State.chartData[State.selectedBlockId];
  if (!cd || cd.labels.length === 0) return toast('No data to export', 'warning');
  
  const block = State.blocks[State.selectedBlockId];
  let csv = 'Time,Setpoint,ProcessValue,Output\n';
  for (let i = 0; i < cd.labels.length; i++) {
    csv += `"${cd.labels[i]}",${cd.sp[i]},${cd.pv[i]},${cd.out[i]}\n`;
  }
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PID_History_${block.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Exported to CSV', 'success');
}

function rebuildChart(blockId) {
  if (!State.chart || typeof Chart === 'undefined') return;
  const cd = State.chartData[blockId];
  if (!cd) return;
  State.chart.data.labels           = cd.labels;
  State.chart.data.datasets[0].data = cd.sp;
  State.chart.data.datasets[1].data = cd.pv;
  State.chart.data.datasets[2].data = cd.out;
  State.chart.update();
}

function setChartWindow(val) {
  State.chartWindow = parseInt(val);
  const maxPts = State.chartWindow * 30;
  Object.keys(State.chartData).forEach(id => {
    const cd = State.chartData[id];
    while (cd.sp.length > maxPts) { cd.sp.shift(); cd.pv.shift(); cd.out.shift(); cd.labels.shift(); }
  });
  if (State.selectedBlockId) rebuildChart(State.selectedBlockId);
}

function clearHistory() {
  Object.keys(State.chartData).forEach(id => {
    State.chartData[id] = { sp:[], pv:[], out:[], labels:[] };
    api('DELETE', `/api/blocks/${id}/history`).catch(()=>{});
  });
  if (State.chart) {
    State.chart.data.labels = [];
    State.chart.data.datasets.forEach(d => d.data = []);
    State.chart.update('none');
  }
  toast('History cleared', 'info');
}

// ══════════════════════════════════════════════
// Dashboard Analytics
// ══════════════════════════════════════════════
function updateAnalytics() {
  if (!State.selectedBlockId) return;
  const cd = State.chartData[State.selectedBlockId];
  if (!cd || cd.pv.length < 2) return;
  const { sp, pv, out } = cd;
  const n = pv.length, dt = 0.5;
  const w = Math.min(120, n);
  const pvW  = pv.slice(-w), spW = sp.slice(-w), outW = out.slice(-w);
  const errs = pvW.map((v,i) => spW[i] - v);

  const curErr = sp[n-1] - pv[n-1];
  setKPI('kpi-error', curErr.toFixed(2), Math.abs(curErr)<0.5?'good':Math.abs(curErr)<2?'warning':'bad');
  const iae  = errs.reduce((s,e) => s + Math.abs(e)*dt, 0);
  const ise  = errs.reduce((s,e) => s + e*e*dt, 0);
  const rmse = Math.sqrt(errs.reduce((s,e)=>s+e*e,0)/errs.length);
  const avgO = outW.reduce((s,v)=>s+v,0)/outW.length;
  setKPI('kpi-iae', iae.toFixed(1));
  setKPI('kpi-ise', ise.toFixed(1));
  setKPI('kpi-rmse', rmse.toFixed(2), rmse<0.5?'good':rmse<2?'warning':'bad');
  setKPI('kpi-avgout', avgO.toFixed(1)+'%');
  calcOvershootSettling(sp, pv);
  updateErrorChart(errs);
  updateOutputChart(outW);
}

function calcOvershootSettling(sp, pv) {
  const n = pv.length;
  if (n < 10) return;
  let stepIdx = -1;
  const lookback = Math.min(300, n-1);
  for (let i = n-2; i >= n-1-lookback; i--) {
    if (Math.abs(sp[i] - sp[i-1]) > 0.5) { stepIdx = i; break; }
  }
  if (stepIdx < 0) {
    setKPI('kpi-overshoot','N/A'); setKPI('kpi-rise','N/A'); setKPI('kpi-settle','N/A'); return;
  }
  const spFinal = sp[n-1], pvInit = pv[stepIdx-1]||0, stepSize = spFinal - pvInit;
  const pvSlice = pv.slice(stepIdx);
  if (Math.abs(stepSize) < 0.1) return;
  const maxPV = Math.max(...pvSlice), minPV = Math.min(...pvSlice);
  const overshoot = stepSize > 0
    ? Math.max(0,(maxPV-spFinal)/Math.abs(stepSize)*100)
    : Math.max(0,(spFinal-minPV)/Math.abs(stepSize)*100);
  setKPI('kpi-overshoot', overshoot.toFixed(1)+'%', overshoot<5?'good':overshoot<15?'warning':'bad');
  const t10 = pvSlice.findIndex(v=>Math.abs(v-pvInit)>=0.1*Math.abs(stepSize));
  const t90 = pvSlice.findIndex(v=>Math.abs(v-pvInit)>=0.9*Math.abs(stepSize));
  if (t10>=0&&t90>=0) setKPI('kpi-rise',((t90-t10)*0.5).toFixed(1)+'s'); else setKPI('kpi-rise','N/A');
  let settleIdx = -1;
  const band = 0.02*Math.abs(stepSize);
  for (let i=pvSlice.length-1;i>=0;i--) { if(Math.abs(pvSlice[i]-spFinal)>band){settleIdx=i+1;break;} }
  if (settleIdx<0) setKPI('kpi-settle','> '+(pvSlice.length*0.5).toFixed(0)+'s');
  else setKPI('kpi-settle',(settleIdx*0.5).toFixed(1)+'s', settleIdx<60?'good':settleIdx<120?'warning':'bad');
}

function setKPI(id, value, quality='') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  el.className = `kpi-value${quality?' '+quality:''}`;
}

// ── Dashboard Charts ──────────────────────────
function initDashCharts() {
  const barOpts = (color) => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: '#4a5a75', font: { size: 9 }, maxTicksLimit: 8 },
        grid: { color: 'rgba(255,255,255,0.04)' }
      },
      y: {
        type: 'linear',
        ticks: { color: '#4a5a75', font: { size: 9 } },
        grid: { color: 'rgba(255,255,255,0.04)' }
      }
    }
  });

  State.dashCharts.error = new Chart(
    document.getElementById('errorChart').getContext('2d'),
    { type:'bar', data:{ labels:[], datasets:[{ label:'Error', data:[], backgroundColor:'rgba(0,212,255,0.4)', borderColor:'#00d4ff', borderWidth:1 }]}, options:barOpts('#00d4ff') }
  );
  State.dashCharts.output = new Chart(
    document.getElementById('outputChart').getContext('2d'),
    { type:'bar', data:{ labels:[], datasets:[{ label:'Output', data:[], backgroundColor:'rgba(245,158,11,0.4)', borderColor:'#f59e0b', borderWidth:1 }]}, options:barOpts('#f59e0b') }
  );
}

function updateErrorChart(errors) {
  const bins=10, min=Math.min(...errors), max=Math.max(...errors), range=max-min||1;
  const counts=new Array(bins).fill(0);
  errors.forEach(e=>{ const idx=Math.min(bins-1,Math.floor((e-min)/range*bins)); counts[idx]++; });
  State.dashCharts.error.data.labels = counts.map((_,i)=>(min+(i/bins)*range).toFixed(1));
  State.dashCharts.error.data.datasets[0].data = counts;
  State.dashCharts.error.update();
}

function updateOutputChart(outputs) {
  const bins=10, counts=new Array(bins).fill(0);
  outputs.forEach(v=>{ const idx=Math.min(bins-1,Math.floor(v/100*bins)); counts[idx]++; });
  State.dashCharts.output.data.labels = counts.map((_,i)=>(i*10)+'%');
  State.dashCharts.output.data.datasets[0].data = counts;
  State.dashCharts.output.update();
}

// ══════════════════════════════════════════════
// Simulation
// ══════════════════════════════════════════════
async function startSimulation() {
  if (State.mode === 'simulation') return stopSimulation();
  if (State.mode === 'plc') return toast('Disconnect from PLC first', 'warning');
  if (Object.keys(State.blocks).length === 0) {
    toast('Add at least one PID loop first', 'warning');
    openAddBlockModal(); return;
  }
  try {
    await api('POST', '/api/simulation/start', {
      processGain: State.simParams.K, timeConstant: State.simParams.T, deadTime: State.simParams.L,
    });
    toast('Simulation started', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function stopSimulation() {
  try { await api('POST', '/api/simulation/stop'); toast('Simulation stopped', 'info'); }
  catch (e) { toast(e.message, 'error'); }
}

function updateSimParam(param, val) {
  State.simParams[param] = parseFloat(val);
  document.getElementById(`sim${param}Val`).textContent = parseFloat(val).toFixed(param==='K'?2:1);
  if (State.mode === 'simulation') {
    api('POST', '/api/simulation/process', {
      processGain: State.simParams.K, timeConstant: State.simParams.T, deadTime: State.simParams.L,
    }).catch(console.error);
  }
}

function updateLambda(val) {
  State.simParams.lambda = parseFloat(val);
  document.getElementById('simLambdaVal').textContent = parseFloat(val).toFixed(1);
}

async function calculateTuning() {
  const { K, T, L, lambda } = State.simParams;
  try {
    const data = await api('GET', `/api/tune/imc?K=${K}&T=${T}&L=${L}&lambda=${lambda}`);
    document.getElementById('tuneBody').innerHTML = [
      { name:'IMC / Lambda',     r:data.imc },
      { name:'Cohen-Coon',       r:data.cohenCoon },
      { name:'Ziegler-Nichols',  r:data.ziglerNichols },
    ].map(({ name, r }) => `<tr>
      <td><strong>${name}</strong></td>
      <td>${r.kp}</td><td>${r.ti}</td><td>${r.td}</td>
      <td><button class="apply-btn btn btn-xs btn-ghost" onclick="applyTuning(${r.kp},${r.ti},${r.td})">Apply</button></td>
    </tr>`).join('');
  } catch (e) { toast(e.message, 'error'); }
}

function applyTuning(kp, ti, td) {
  if (State.paramLocked) return toast('🔒 Unlock parameters first to apply tuning', 'warning');
  ['gain','ti','td'].forEach((k,i) => {
    const el = document.getElementById(`p_${k}`);
    if (el) el.value = [kp,ti,td][i];
  });
  switchTab('params');
  toast(`Applied: Kp=${kp}, Ti=${ti}, Td=${td} — Click Write to confirm`, 'info');
}

async function doStepTest() {
  if (State.mode !== 'simulation') return toast('Start simulation first', 'warning');
  if (!State.selectedBlockId) return toast('Select a PID loop first', 'warning');
  const from = parseFloat(document.getElementById('stepFrom').value);
  const to   = parseFloat(document.getElementById('stepTo').value);
  await api('POST', `/api/blocks/${State.selectedBlockId}/setpoint`, { setpoint: from });
  document.getElementById('spInput').value = from;
  await new Promise(r => setTimeout(r, 2000));
  await api('POST', `/api/blocks/${State.selectedBlockId}/setpoint`, { setpoint: to });
  document.getElementById('spInput').value = to;
  toast(`Step: ${from} → ${to}`, 'info');
  switchTab('trend');
}

// ══════════════════════════════════════════════
// DB Offset Config Modal
// ══════════════════════════════════════════════
function openOffsetModal() {
  if (!State.selectedBlockId) return toast('Select a block first', 'warning');
  const blockOffsets = State.blocks[State.selectedBlockId].offsets || {};
  
  // Sync global currentOffsets so saveOffsets() works correctly if we just view and save
  currentOffsets = { ...DEFAULT_OFFSETS, ...blockOffsets };

  document.getElementById('offsetTableBody').innerHTML = OFFSET_DEFS.map(def => {
    let val = currentOffsets[def.key];
    if (val === undefined || val === null) val = 0;
    return `
    <tr>
      <td>${def.key}</td>
      <td class="tag-name">${def.tag}</td>
      <td class="tag-type">${def.type}</td>
      <td><input class="offset-input" type="number" id="ofs_${def.key}" value="${val}"></td>
      <td class="text-xs text-muted">${def.desc}</td>
    </tr>`;
  }).join('');
  openModal('offsetModal');
}

function saveOffsets() {
  OFFSET_DEFS.forEach(def => {
    const el = document.getElementById(`ofs_${def.key}`);
    if (el) currentOffsets[def.key] = parseFloat(el.value) || 0;
  });
  if (State.selectedBlockId) {
    State.blocks[State.selectedBlockId].offsets = { ...currentOffsets };
    api('PUT', `/api/blocks/${State.selectedBlockId}`, { offsets: currentOffsets }).catch(console.error);
  }
  closeModal('offsetModal');
  toast('Byte offsets saved', 'success');
}

function resetOffsets() {
  currentOffsets = { ...DEFAULT_OFFSETS };
  OFFSET_DEFS.forEach(def => {
    const el = document.getElementById(`ofs_${def.key}`);
    if (el) el.value = DEFAULT_OFFSETS[def.key] !== undefined ? DEFAULT_OFFSETS[def.key] : 0;
  });
  toast('Offsets reset to defaults', 'info');
}

// ══════════════════════════════════════════════
// 🔒 Parameter Lock / PIN System
// ══════════════════════════════════════════════
function toggleParamLock() {
  if (State.paramLocked) {
    document.getElementById('pinInput').value = '';
    document.getElementById('pinError').style.display = 'none';
    openModal('pinModal');
    setTimeout(() => document.getElementById('pinInput').focus(), 100);
  } else {
    State.paramLocked = true;
    applyLockState();
    toast('Parameters locked 🔒', 'warning');
  }
}

function confirmPin() {
  const entered = document.getElementById('pinInput').value;
  if (hashPin(entered) === getStoredPin()) {
    State.paramLocked = false;
    applyLockState();
    closeModal('pinModal');
    toast('Parameters unlocked 🔓 — Remember to lock when done', 'success');
  } else {
    document.getElementById('pinError').style.display = 'block';
    document.getElementById('pinInput').value = '';
    document.getElementById('pinInput').focus();
    document.getElementById('pinInput').animate(
      [{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],
      {duration:300}
    );
  }
}

function applyLockState() {
  const locked   = State.paramLocked;
  const lockBtn  = document.getElementById('lockBtn');
  const lockBnr  = document.getElementById('lockBanner');
  const writeBtn = document.getElementById('writeParamBtn');
  const statusLb = document.getElementById('lockStatusLabel');

  if (locked) {
    lockBtn.innerHTML  = '🔒 Locked';
    lockBtn.className  = 'btn btn-amber btn-sm';
    if (lockBnr)  lockBnr.style.display = 'block';
    if (writeBtn) { writeBtn.disabled = true;  writeBtn.title = 'Unlock parameters first'; }
    if (statusLb) statusLb.textContent = '🔒 Locked — unlock to edit';
  } else {
    lockBtn.innerHTML  = '🔓 Unlocked';
    lockBtn.className  = 'btn btn-success btn-sm';
    if (lockBnr)  lockBnr.style.display = 'none';
    if (writeBtn) { writeBtn.disabled = false; writeBtn.title = ''; }
    if (statusLb) statusLb.textContent = '🔓 Unlocked — Lock after changes!';
  }

  document.querySelectorAll('.param-input').forEach(inp => {
    inp.disabled     = locked;
    inp.style.cursor  = locked ? 'not-allowed' : '';
    inp.style.opacity = locked ? '0.5' : '1';
  });
}

function openChangePinModal() {
  ['cpOldPin','cpNewPin','cpConfirmPin'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('cpError').style.display = 'none';
  openModal('changePinModal');
}

function confirmChangePin() {
  const oldPin   = document.getElementById('cpOldPin').value;
  const newPin   = document.getElementById('cpNewPin').value;
  const confirm2 = document.getElementById('cpConfirmPin').value;
  const errEl    = document.getElementById('cpError');
  if (hashPin(oldPin) !== getStoredPin()) { errEl.textContent='❌ Current PIN incorrect'; errEl.style.display='block'; return; }
  if (newPin.length < 4)                  { errEl.textContent='❌ PIN must be ≥ 4 digits'; errEl.style.display='block'; return; }
  if (newPin !== confirm2)                { errEl.textContent='❌ PINs do not match';      errEl.style.display='block'; return; }
  localStorage.setItem(PIN_KEY, hashPin(newPin));
  closeModal('changePinModal');
  toast('PIN changed successfully 🔑', 'success');
}

// ══════════════════════════════════════════════
// Tabs
// ══════════════════════════════════════════════
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));
}

// ══════════════════════════════════════════════
// Modal helpers
// ══════════════════════════════════════════════
function openModal(id)  { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// ══════════════════════════════════════════════
// Toast
// ══════════════════════════════════════════════
function toast(msg, type = 'info', duration = 3200) {
  const c  = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className   = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ════════════════════════════════════════════════
// System Clock
// ════════════════════════════════════════════════
setInterval(() => {
  const dt = new Date();
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  const ss = String(dt.getSeconds()).padStart(2, '0');
  
  const sysDateEl = document.getElementById('sysDateTime');
  if (sysDateEl) {
    sysDateEl.innerHTML = `Date: <span style="color:var(--cyan)">${d}/${m}/${y}</span> &nbsp;&nbsp; Time: <span style="color:var(--amber)">${hh}:${mm}:${ss}</span>`;
  }
}, 1000);

// ════════════════════════════════════════════════
// Shutdown System
// ════════════════════════════════════════════════
function shutdownSystem() {
  if (confirm('⚠️ WARNING ⚠️\n\nAre you sure you want to SHUT DOWN the IOT2050?\nYou will need to manually cycle power to start it again.')) {
    fetch('/api/shutdown', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'shutting_down') {
          document.body.innerHTML = `
            <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; background: radial-gradient(circle at center, #1a1a1a 0%, #000000 100%); color:#fff; font-family: 'Inter', sans-serif; text-align:center;">
              <div style="font-size: 60px; font-weight: 900; letter-spacing: 6px; background: linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: gold-shine 3s linear infinite; filter: drop-shadow(0 0 25px rgba(252, 246, 186, 0.4)); margin-bottom: 10px;">
                MITR PHOL
              </div>
              <div style="color: #bf953f; font-size: 18px; letter-spacing: 3px; text-shadow: 0 0 10px rgba(191, 149, 63, 0.5); margin-bottom: 50px;">
                SYSTEM SHUTTING DOWN
              </div>
              
              <div style="width: 50px; height: 50px; border: 4px solid rgba(191,149,63,0.3); border-top-color: #fcf6ba; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              
              <div id="shutdownCountdown" style="margin-top: 40px; font-size: 24px; color: #ef4444; font-weight: bold; text-shadow: 0 0 15px rgba(239, 68, 68, 0.5); letter-spacing: 2px;">
                Powering off in 10s...
              </div>
            </div>
            <style>
              @keyframes spin { 100% { transform: rotate(360deg); } }
              @keyframes gold-shine { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
            </style>
          `;
          let timeLeft = 10;
          const cd = document.getElementById('shutdownCountdown');
          const timer = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
              cd.innerText = `Powering off in ${timeLeft}s...`;
            } else {
              clearInterval(timer);
              cd.style.color = '#10b981';
              cd.style.textShadow = '0 0 15px rgba(16, 185, 129, 0.5)';
              cd.innerText = "SAFE TO TURN OFF POWER";
            }
          }, 1000);
        }
      })
      .catch(err => toast('Connection error during shutdown.', 'error'));
  }
}

// ════════════════════════════════════════════════
// System Time Setup
// ════════════════════════════════════════════════
function openTimeModal() {
  const dt = new Date();
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  const ss = String(dt.getSeconds()).padStart(2, '0');
  document.getElementById('timeInput').value = `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
  openModal('timeModal');
}

async function saveSystemTime() {
  const val = document.getElementById('timeInput').value.trim();
  try {
    const data = await api('POST', '/api/system/time', { datetime: val });
    if (data.success) {
      toast('System time updated successfully!', 'success');
      closeModal('timeModal');
    }
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ════════════════════════════════════════════════
// Restart System
// ════════════════════════════════════════════════
function restartSystem() {
  if (confirm('⚠️ WARNING ⚠️\n\nAre you sure you want to RESTART the IOT2050?')) {
    fetch('/api/restart', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'restarting') {
          document.body.innerHTML = `
            <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; background: radial-gradient(circle at center, #1a1a1a 0%, #000000 100%); color:#fff; font-family: 'Inter', sans-serif; text-align:center;">
              <div style="font-size: 60px; font-weight: 900; letter-spacing: 6px; background: linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: gold-shine 3s linear infinite; filter: drop-shadow(0 0 25px rgba(252, 246, 186, 0.4)); margin-bottom: 10px;">
                MITR PHOL
              </div>
              <div style="color: #bf953f; font-size: 18px; letter-spacing: 3px; text-shadow: 0 0 10px rgba(191, 149, 63, 0.5); margin-bottom: 50px;">
                SYSTEM RESTARTING
              </div>
              <div style="width: 50px; height: 50px; border: 4px solid rgba(191,149,63,0.3); border-top-color: #fcf6ba; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <div style="margin-top: 40px; font-size: 24px; color: #3b82f6; font-weight: bold; text-shadow: 0 0 15px rgba(59, 130, 246, 0.5); letter-spacing: 2px;">
                Rebooting system...
              </div>
            </div>
            <style>
              @keyframes spin { 100% { transform: rotate(360deg); } }
              @keyframes gold-shine { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
            </style>
          `;
          setTimeout(() => location.reload(), 20000);
        }
      })
      .catch(err => toast('Connection error during restart.', 'error'));
  }
}

// ═══════════════════════════════════════════════
// DATA LOGGING LOGIC
// ═══════════════════════════════════════════════

function dlUpdateTopicList() {
  const sel = document.getElementById('dlTopicSelect');
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">-- Select Loop --</option>';
  Object.values(State.blocks).forEach(b => {
    sel.innerHTML += `<option value="${b.id}">${b.name} (DB${b.dbNumber})</option>`;
  });
  if (State.blocks[currentVal]) sel.value = currentVal;
}

function dlLoadSettings() {
  const sel = document.getElementById('dlTopicSelect');
  if (!sel || !sel.value) return;
  const b = State.blocks[sel.value];
  if (!b) return;
  
  document.getElementById('dlInterval').value = b.logInterval || 5;
  document.getElementById('dlAutoClear').value = b.logAutoClearMonths || 1;
  document.getElementById('dlPath').value = b.logPath || '';
  
  dlRefreshLogs();
}

async function scanDrives() {
  try {
    toast('Scanning for USB drives...', 'info');
    const res = await api('GET', '/api/drives');
    const dl = document.getElementById('driveList');
    if (!dl) return;
    dl.innerHTML = '';
    if (res.drives && res.drives.length > 0) {
      res.drives.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        dl.appendChild(opt);
      });
      toast(`Found ${res.drives.length} location(s). Click the input box to see them.`, 'success');
    } else {
      toast('No external drives found', 'warning');
    }
  } catch(e) {
    toast('Failed to scan drives', 'error');
  }
}

function dlSaveSettings() {
  const sel = document.getElementById('dlTopicSelect');
  if (!sel || !sel.value) {
    toast('Please select a topic first', 'error');
    return;
  }
  
  const payload = {
    logInterval: document.getElementById('dlInterval').value,
    logAutoClearMonths: document.getElementById('dlAutoClear').value,
    logPath: document.getElementById('dlPath').value
  };
  
  api('PUT', `/api/blocks/${sel.value}`, payload)
    .then(res => {
      if (res.success) {
        toast('Logging settings saved successfully!', 'success');
      }
    });
}

function dlRefreshLogs() {
  const sel = document.getElementById('dlTopicSelect');
  if (!sel || !sel.value) return;
  
  api('GET', `/api/logs/${sel.value}`)
    .then(res => {
      const tbody = document.getElementById('dlLogsTable');
      if (!res.logs || res.logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No logs found for this topic</td></tr>';
        return;
      }
      
      tbody.innerHTML = '';
      res.logs.forEach(log => {
        const date = new Date(log.mtime).toLocaleString('th-TH');
        const sizeKb = (log.size / 1024).toFixed(1);
        tbody.innerHTML += `
          <tr>
            <td>
              <div style="color:var(--text-1)">${date}</div>
              <div class="text-xs text-muted">${log.filename}</div>
            </td>
            <td style="text-align:right">${sizeKb} KB</td>
            <td style="text-align:center">
              <a href="/api/logs/download/${sel.value}?file=${log.filename}" class="btn btn-primary btn-sm" style="display:inline-block; padding:4px 8px; text-decoration:none" download>⬇️ CSV</a>
            </td>
          </tr>
        `;
      });
    });
}

function dlUpdateLive(data) {
  const sel = document.getElementById('dlTopicSelect');
  if (sel && sel.value === data.blockId) {
    const b = State.blocks[data.blockId];
    if (!b) return;
    document.getElementById('dlLiveSp').innerText = Number(data.sp).toFixed(2);
    document.getElementById('dlLivePv').innerText = Number(data.pv).toFixed(2);
    document.getElementById('dlLiveOut').innerText = Number(data.output).toFixed(2);
    document.getElementById('dlUnitSp').innerText = b.spUnit || '';
    document.getElementById('dlUnitPv').innerText = b.pvUnit || '';
  }
}

function dlExportPDF() {
  const sel = document.getElementById('dlTopicSelect');
  if (!sel || !sel.value) {
    toast('Please select a topic first', 'error');
    return;
  }
  
  if (typeof window.jspdf === 'undefined') {
    toast('PDF Library not loaded. Check internet or local files.', 'error');
    return;
  }
  
  api('GET', `/api/logs/${sel.value}`)
    .then(async res => {
      if (!res.logs || res.logs.length === 0) {
        toast('No logs available to export.', 'error');
        return;
      }
      
      const latestFile = res.logs[0].filename;
      toast('Generating PDF summary...', 'info');
      
      try {
        const fileContent = await fetch(`/api/logs/download/${sel.value}?file=${latestFile}`).then(r => r.text());
        const lines = fileContent.split('\n').filter(l => l.trim() !== '');
        
        if (lines.length < 2) {
          toast('CSV is empty', 'error');
          return;
        }
        
        const headers = lines[0].split(',');
        // Parse CSV data, keeping max 1000 rows for PDF summary to avoid memory crash
        const maxRows = 1000;
        const rowCount = lines.length - 1;
        
        // Take evenly distributed rows if > 1000
        const step = Math.ceil(rowCount / maxRows);
        const tableData = [];
        for (let i = 1; i < lines.length; i += step) {
          if (lines[i]) {
            let row = lines[i].split(',');
            // Format time: remove T and Z, e.g. 2026-07-31 08:29:30
            if (row[0] && row[0].includes('T')) row[0] = row[0].replace('T', ' ').substring(0, 19);
            // Truncate Setpoint, ProcessValue, Output to 2 decimals
            for (let j=1; j<=3; j++) {
               if (row[j] && !isNaN(row[j])) row[j] = Number(row[j]).toFixed(2);
            }
            tableData.push(row);
          }
        }
        
        const logoBase64 = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } catch(e) { resolve(null); }
          };
          img.onerror = () => resolve(null);
          img.src = '/logo.png';
        });
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text(`Data Logging Report - ${State.blocks[sel.value].name}`, 14, 15);
        
        doc.setFontSize(10);
        doc.text(`Source File: ${latestFile}`, 14, 22);
        doc.text(`Total Data Points: ${rowCount} (Showing ${tableData.length} sampled points)`, 14, 27);
        doc.text(`Generated: ${new Date().toLocaleString('th-TH')}`, 14, 32);
        
        // Add header text on the left of the logo
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('PIN MILL PLANT', 162, 14, { align: 'right' });
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('GATE VALVE CONTROL AND MONITORING PROJECT', 162, 19, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        
        // Add logo image on the far right
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 165, 8.5, 30, 13.5);
        }
        
        doc.autoTable({
          startY: 40,
          head: [headers],
          body: tableData,
          theme: 'striped',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [7, 13, 26] }
        });
        
        doc.save(`Report_${latestFile.replace('.csv', '')}.pdf`);
        toast('PDF Downloaded!', 'success');
      } catch (err) {
        toast('Error generating PDF', 'error');
        console.error(err);
      }
    });
}

// ══════════════════════════════════════════════
// USB Management
// ══════════════════════════════════════════════
function checkUsbStatus() {
  fetch('/api/usb/status')
    .then(r => r.json())
    .then(data => {
      const badge = document.getElementById('usbStatusBadge');
      if (badge) {
        if (data.mounted) {
          badge.textContent = 'USB Mounted / Ready';
          badge.style.background = 'rgba(34, 197, 94, 0.15)';
          badge.style.color = '#22c55e';
        } else {
          badge.textContent = 'Not Mounted';
          badge.style.background = 'rgba(239, 68, 68, 0.15)';
          badge.style.color = '#ef4444';
        }
      }
    })
    .catch(err => console.error(err));
}

function usbMount() {
  toast('Mounting USB...', 'info');
  fetch('/api/usb/mount', { method: 'POST' })
    .then(r => r.json())
    .then(data => {
      if (data.error) toast('Mount Error: ' + data.error, 'error');
      else {
        toast('USB Mounted Successfully!', 'success');
        checkUsbStatus();
        dlRefreshLogs();
      }
    })
    .catch(err => toast('Error mounting USB', 'error'));
}

function usbEject() {
  toast('Ejecting safely... Please wait', 'info');
  fetch('/api/usb/eject', { method: 'POST' })
    .then(r => r.json())
    .then(data => {
      if (data.error) toast('Eject Error: ' + data.error, 'error');
      else {
        toast('Ejected! You can safely remove the USB drive now.', 'success');
        checkUsbStatus();
      }
    })
    .catch(err => toast('Error ejecting USB', 'error'));
}

// Call status check periodically
setInterval(checkUsbStatus, 5000);

// ════════════════════════════════════════════════
// Low Performance Mode for IOT2050
// ════════════════════════════════════════════════
function toggleLowPerfMode() {
  State.lowPerfMode = !State.lowPerfMode;
  const btn = document.getElementById('perfToggleBtn');
  if (State.lowPerfMode) {
    document.body.classList.add('low-perf');
    if (btn) btn.innerHTML = '🐢 Perf: Low';
    if (btn) btn.classList.replace('btn-ghost', 'btn-amber');
    toast('Low Performance Mode Enabled (Animations off, Chart throttled)', 'info');
  } else {
    document.body.classList.remove('low-perf');
    if (btn) btn.innerHTML = '🚀 Perf: High';
    if (btn) btn.classList.replace('btn-amber', 'btn-ghost');
    toast('High Performance Mode Enabled', 'info');
  }
}

setTimeout(checkUsbStatus, 1000);
