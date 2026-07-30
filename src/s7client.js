// src/s7client.js
// S7-1200 communication via nodes7 (ISO-on-TCP port 102)
// PIDCompact V2 byte offset map (TIA V17/V18/V19)

const NodeS7 = require('nodes7');

// Default PIDCompact V2 byte offsets (approximate - user should verify in TIA DB view)
const DEFAULT_OFFSETS = {
  // ─── Input Section ───────────────────────────────
  setpoint:            0,   // Real (4 bytes) — Setpoint
  input:               4,   // Real (4 bytes) — Raw input (before scaling)
  // input_PER:         8,   // Word (2 bytes) — Peripheral input (unused if using 'Input')
  disturbance:        10,   // Real (4 bytes) — Disturbance (feedforward)
  manualValue:        14,   // Real (4 bytes) — Manual output value
  errorAck:           18,   // Bool bit 0     — Reset error acknowledgement
  reset:              18,   // Bool bit 1     — Reset PID
  modeActivate:       18,   // Bool bit 2     — Trigger mode change (rising edge)

  // ─── Output Section ──────────────────────────────
  scaledInput:        20,   // Real (4 bytes) — Scaled process value (PV display)
  output:             24,   // Real (4 bytes) — Controller output (%)
  // output_PER:       28,   // Word (2 bytes) — Peripheral output (%)
  setpointLimit_H:    30,   // Bool bit 0     — SP high limit reached
  setpointLimit_L:    30,   // Bool bit 1     — SP low limit reached
  inputWarning_H:     30,   // Bool bit 2     — PV high warning
  inputWarning_L:     30,   // Bool bit 3     — PV low warning
  state:              32,   // Int  (2 bytes) — PID state (0=Inactive,3=Auto,4=Manual)
  error_bit:          34,   // Bool bit 0     — Error flag
  errorBits:          36,   // DWord (4 bytes)— Error code

  // ─── InOut Section ───────────────────────────────
  mode:               40,   // Int  (2 bytes) — Mode (0=Inactive,3=Auto,4=Manual,5=Hold)

  // ─── Static / Retain Section ─────────────────────
  // *** These depend on the compiled DB. Verify in TIA → DB Editor → Offset column ***
  gain:               50,   // Real — Kp (Proportional gain)
  ti:                 54,   // Real — Ti (Integration time, seconds)
  td:                 58,   // Real — Td (Derivative time, seconds)
  tdFiltRatio:        62,   // Real — Derivative filter coefficient (0–1)
  pWeighting:         66,   // Real — P-action weighting (0=SP,1=Error)
  dWeighting:         70,   // Real — D-action weighting (0=PV,1=Error)
  cycle:              74,   // Real — Sample time (seconds)
  setpointUpperLimit: 78,   // Real — SP upper limit
  setpointLowerLimit: 82,   // Real — SP lower limit
  outputUpperLimit:   86,   // Real — Output upper limit (%)
  outputLowerLimit:   90,   // Real — Output lower limit (%)

  // ─── Config Section ──────────────────────────────
  inputUpperLimit:   100,   // Real — PV scaling upper limit
  inputLowerLimit:   104,   // Real — PV scaling lower limit
  invertControl:     116,   // Bool — Reverse acting (heating=false, cooling=true)
};

class S7Client {
  constructor() {
    this.conn = null;
    this.connected = false;
    this.connectParams = null;
  }

  // Build nodes7 tag string
  _tag(db, offset, type, bit = 0) {
    let byte = Math.floor(offset);
    let myBit = bit;
    if (offset !== byte) {
      myBit = Math.round((offset - byte) * 10);
    }
    switch (type) {
      case 'REAL':  return `DB${db},REAL${byte}`;
      case 'INT':   return `DB${db},INT${byte}`;
      case 'DINT':  return `DB${db},DINT${byte}`;
      case 'WORD':  return `DB${db},WORD${byte}`;
      case 'DWORD': return `DB${db},DWORD${byte}`;
      case 'BOOL':  return `DB${db},X${byte}.${myBit}`;
      default:      return `DB${db},REAL${byte}`;
    }
  }

  connect(opts) {
    return new Promise((resolve, reject) => {
      if (this.conn) this._drop();

      this.conn = new NodeS7({ silent: true });
      this.connectParams = opts;

      // S7-1200: rack=0, slot=0 (TSAP=0x0300)
      this.conn.initiateConnection({
        port:        102,
        host:        opts.host,
        rack:        opts.rack ?? 0,
        slot:        opts.slot ?? 0,
        localTSAP:   0x0100,
        remoteTSAP:  0x0300,
        timeout:     8000,
      }, (err) => {
        if (err) {
          this.connected = false;
          return reject(new Error(`S7 connection failed: ${err}`));
        }
        this.connected = true;
        resolve();
      });
    });
  }

  disconnect() {
    this._drop();
  }

  _drop() {
    try { if (this.conn) this.conn.dropConnection(); } catch (_) {}
    this.conn = null;
    this.connected = false;
  }

  // Generic multi-tag read
  _read(tags) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.conn) return reject(new Error('Not connected'));
      const keys = Object.keys(tags);
      const tagArr = keys.map(k => tags[k]);
      
      // Clear all items manually from nodes7 internal state to prevent ghost tags
      this.conn.translationCb = (tag) => tag; // reset translations if any
      this.conn.polledItems = [];
      this.conn.polledReadSpace = [];
      
      try {
        this.conn.addItems(tagArr);
      } catch (err) {
        return reject(new Error(`addItems failed: ${err.message}`));
      }
      
      this.conn.readAllItems((err, values) => {
        // We do not reject immediately on err=true because some tags might be valid.
        const result = {};
        let allBad = true;
        
        keys.forEach(k => {
          const val = values[tags[k]];
          if (val === undefined || (typeof val === 'string' && val.startsWith('BAD'))) {
            result[k] = null;
          } else {
            result[k] = val;
            allBad = false;
          }
        });
        
        if (allBad && err) {
          return reject(new Error('Read error for all requested tags'));
        }
        resolve(result);
      });
    });
  }

  // Generic multi-tag write
  _write(tagArr, valueArr) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.conn) return reject(new Error('Not connected'));
      this.conn.writeItems(tagArr, valueArr, (err) => {
        if (err) return reject(new Error(`Write error: ${err}`));
        resolve();
      });
    });
  }

  // Read monitoring values (fast poll: SP, PV, Output, Mode, State)
  async readMonitorValues(db, offsets) {
    const o = { ...DEFAULT_OFFSETS, ...offsets };
    return this._read({
      sp:        this._tag(db, o.setpoint,    'REAL'),
      pv:        this._tag(db, o.scaledInput, 'REAL'),
      output:    this._tag(db, o.output,      'REAL'),
      mode:      this._tag(db, o.mode,        'INT'),
      state:     this._tag(db, o.state,       'INT'),
      errorBits: this._tag(db, o.errorBits,   'DWORD'),
    });
  }

  // Read all tuning parameters
  async readPIDParams(db, offsets) {
    const o = { ...DEFAULT_OFFSETS, ...offsets };
    return this._read({
      setpoint:            this._tag(db, o.setpoint,            'REAL'),
      output:              this._tag(db, o.output,              'REAL'),
      scaledInput:         this._tag(db, o.scaledInput,         'REAL'),
      mode:                this._tag(db, o.mode,                'INT'),
      state:               this._tag(db, o.state,               'INT'),
      gain:                this._tag(db, o.gain,                'REAL'),
      ti:                  this._tag(db, o.ti,                  'REAL'),
      td:                  this._tag(db, o.td,                  'REAL'),
      tdFiltRatio:         this._tag(db, o.tdFiltRatio,         'REAL'),
      pWeighting:          this._tag(db, o.pWeighting,          'REAL'),
      dWeighting:          this._tag(db, o.dWeighting,          'REAL'),
      cycle:               this._tag(db, o.cycle,               'REAL'),
      setpointUpperLimit:  this._tag(db, o.setpointUpperLimit,  'REAL'),
      setpointLowerLimit:  this._tag(db, o.setpointLowerLimit,  'REAL'),
      outputUpperLimit:    this._tag(db, o.outputUpperLimit,    'REAL'),
      outputLowerLimit:    this._tag(db, o.outputLowerLimit,    'REAL'),
      inputUpperLimit:     this._tag(db, o.inputUpperLimit,     'REAL'),
      inputLowerLimit:     this._tag(db, o.inputLowerLimit,     'REAL'),
      invertControl:       this._tag(db, o.invertControl,       'BOOL', 0),
    });
  }

  // Write tuning parameters
  async writePIDParams(db, offsets, params) {
    const o = { ...DEFAULT_OFFSETS, ...offsets };
    const map = {
      gain:                { offset: o.gain,                type: 'REAL' },
      ti:                  { offset: o.ti,                  type: 'REAL' },
      td:                  { offset: o.td,                  type: 'REAL' },
      tdFiltRatio:         { offset: o.tdFiltRatio,         type: 'REAL' },
      pWeighting:          { offset: o.pWeighting,          type: 'REAL' },
      dWeighting:          { offset: o.dWeighting,          type: 'REAL' },
      cycle:               { offset: o.cycle,               type: 'REAL' },
      setpointUpperLimit:  { offset: o.setpointUpperLimit,  type: 'REAL' },
      setpointLowerLimit:  { offset: o.setpointLowerLimit,  type: 'REAL' },
      outputUpperLimit:    { offset: o.outputUpperLimit,    type: 'REAL' },
      outputLowerLimit:    { offset: o.outputLowerLimit,    type: 'REAL' },
      inputUpperLimit:     { offset: o.inputUpperLimit,     type: 'REAL' },
      inputLowerLimit:     { offset: o.inputLowerLimit,     type: 'REAL' },
      setpoint:            { offset: o.setpoint,            type: 'REAL' },
      manualValue:         { offset: o.manualValue,         type: 'REAL' },
    };

    const tags = [], values = [];
    for (const [key, cfg] of Object.entries(map)) {
      if (params[key] !== undefined && params[key] !== null) {
        tags.push(this._tag(db, cfg.offset, cfg.type));
        values.push(parseFloat(params[key]));
      }
    }
    if (tags.length > 0) await this._write(tags, values);
  }

  // Set PID mode (write Mode + pulse ModeActivate)
  async setMode(db, offsets, mode) {
    const o = { ...DEFAULT_OFFSETS, ...offsets };
    await this._write(
      [this._tag(db, o.mode, 'INT')],
      [parseInt(mode)]
    );
    // Pulse ModeActivate
    await this._write([this._tag(db, o.modeActivate, 'BOOL', 0)], [true]);
    await new Promise(r => setTimeout(r, 150));
    await this._write([this._tag(db, o.modeActivate, 'BOOL', 0)], [false]);
  }

  // Quick setpoint write
  async writeSetpoint(db, offsets, sp) {
    const o = { ...DEFAULT_OFFSETS, ...offsets };
    await this._write([this._tag(db, o.setpoint, 'REAL')], [parseFloat(sp)]);
  }

  // Quick manual value write
  async writeManualValue(db, offsets, mv) {
    const o = { ...DEFAULT_OFFSETS, ...offsets };
    await this._write([this._tag(db, o.manualValue, 'REAL')], [parseFloat(mv)]);
  }

  // ErrorAck pulse (reset errors)
  async resetError(db, offsets) {
    const o = { ...DEFAULT_OFFSETS, ...offsets };
    await this._write([this._tag(db, o.errorAck, 'BOOL', 0)], [true]);
    await new Promise(r => setTimeout(r, 150));
    await this._write([this._tag(db, o.errorAck, 'BOOL', 0)], [false]);
  }
}

module.exports = { S7Client, DEFAULT_OFFSETS };
