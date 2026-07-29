// src/simulator.js
// First-Order Plus Dead Time (FOPDT) Process Simulator
// G(s) = K * e^(-Ls) / (Ts + 1)

class PIDController {
  constructor(kp = 1, ti = 10, td = 0, cycle = 0.5) {
    this.kp = kp;
    this.ti = ti;
    this.td = td;
    this.cycle = cycle;
    this.integral = 0;
    this.prevError = 0;
    this.outputUpperLimit = 100;
    this.outputLowerLimit = 0;
  }

  compute(sp, pv) {
    const error = sp - pv;
    const p = this.kp * error;

    // Integral with anti-windup clamping
    const iTerm = (this.ti > 0)
      ? (this.kp * this.cycle / this.ti) * error
      : 0;
    this.integral += iTerm;
    this.integral = Math.max(this.outputLowerLimit, Math.min(this.outputUpperLimit, this.integral));

    // Derivative on measurement (avoids kick on SP change)
    const d = (this.td > 0)
      ? this.kp * (this.td / this.cycle) * (this.prevError - error)
      : 0;

    let output = p + this.integral + d;
    output = Math.max(this.outputLowerLimit, Math.min(this.outputUpperLimit, output));

    this.prevError = error;
    return output;
  }

  reset() {
    this.integral = 0;
    this.prevError = 0;
  }

  update(p) {
    if (p.kp !== undefined) this.kp = parseFloat(p.kp);
    if (p.ti !== undefined) this.ti = parseFloat(p.ti);
    if (p.td !== undefined) this.td = parseFloat(p.td);
    if (p.outputUpperLimit !== undefined) this.outputUpperLimit = parseFloat(p.outputUpperLimit);
    if (p.outputLowerLimit !== undefined) this.outputLowerLimit = parseFloat(p.outputLowerLimit);
  }
}

class FOPDTProcess {
  constructor(gain = 1, timeConstant = 10, deadTime = 2, sampleTime = 0.5) {
    this.gain = gain;
    this.timeConstant = timeConstant;
    this.deadTime = deadTime;
    this.sampleTime = sampleTime;
    this.output = 0;
    this._initBuffer();
  }

  _initBuffer() {
    const size = Math.max(1, Math.ceil(this.deadTime / this.sampleTime) + 1);
    this.buffer = new Array(size).fill(0);
    this.bufIdx = 0;
  }

  step(input) {
    // Dead time delay using circular buffer
    const delayed = this.buffer[this.bufIdx];
    this.buffer[this.bufIdx] = input;
    this.bufIdx = (this.bufIdx + 1) % this.buffer.length;

    // Euler integration: dy = dt/T * (K*u - y)
    const alpha = this.sampleTime / this.timeConstant;
    this.output += alpha * (this.gain * delayed - this.output);
    return this.output;
  }

  update(p) {
    if (p.gain !== undefined) this.gain = parseFloat(p.gain);
    if (p.timeConstant !== undefined) this.timeConstant = parseFloat(p.timeConstant);
    if (p.deadTime !== undefined) {
      this.deadTime = parseFloat(p.deadTime);
      const currentOut = this.output;
      this._initBuffer();
      this.buffer.fill(currentOut / (this.gain || 1));
    }
  }
}

class Simulator {
  constructor({ processGain = 1, timeConstant = 10, deadTime = 2 } = {}) {
    this.processParams = { processGain, timeConstant, deadTime };
    this.loops = {};
  }

  addLoop(blockId, p = {}) {
    const pid = new PIDController(p.kp || 1, p.ti || 10, p.td || 0, 0.5);
    pid.outputUpperLimit = p.outputUpperLimit ?? 100;
    pid.outputLowerLimit = p.outputLowerLimit ?? 0;

    const proc = new FOPDTProcess(
      this.processParams.processGain,
      this.processParams.timeConstant,
      this.processParams.deadTime
    );

    this.loops[blockId] = {
      pid, proc,
      setpoint: p.setpoint ?? 50,
      mode: 3,          // 3=Auto, 4=Manual
      manualOutput: 50,
      pv: 0,
      output: 0,
    };
  }

  step(blockId) {
    const loop = this.loops[blockId];
    if (!loop) return null;

    let output;
    if (loop.mode === 4) {
      output = loop.manualOutput;
    } else {
      output = loop.pid.compute(loop.setpoint, loop.pv);
    }

    loop.output = output;
    loop.pv = loop.proc.step(output);

    return {
      sp: loop.setpoint,
      pv: parseFloat(loop.pv.toFixed(4)),
      output: parseFloat(loop.output.toFixed(4)),
      mode: loop.mode,
      state: 3,
      error: parseFloat((loop.setpoint - loop.pv).toFixed(4)),
    };
  }

  setSetpoint(blockId, sp) {
    if (this.loops[blockId]) this.loops[blockId].setpoint = parseFloat(sp);
  }

  setManualOutput(blockId, out) {
    if (this.loops[blockId]) this.loops[blockId].manualOutput = parseFloat(out);
  }

  setMode(blockId, mode) {
    const loop = this.loops[blockId];
    if (!loop) return;
    loop.mode = parseInt(mode);
    if (loop.mode === 3) loop.pid.reset();
  }

  updatePID(blockId, p) {
    const loop = this.loops[blockId];
    if (!loop) return;
    loop.pid.update(p);
    if (p.setpoint !== undefined) loop.setpoint = parseFloat(p.setpoint);
    if (p.outputUpperLimit !== undefined) loop.pid.outputUpperLimit = parseFloat(p.outputUpperLimit);
    if (p.outputLowerLimit !== undefined) loop.pid.outputLowerLimit = parseFloat(p.outputLowerLimit);
  }

  updateProcess(p) {
    if (p.processGain !== undefined) this.processParams.processGain = parseFloat(p.processGain);
    if (p.timeConstant !== undefined) this.processParams.timeConstant = parseFloat(p.timeConstant);
    if (p.deadTime !== undefined) this.processParams.deadTime = parseFloat(p.deadTime);

    Object.values(this.loops).forEach(loop => {
      loop.proc.update({
        gain: this.processParams.processGain,
        timeConstant: this.processParams.timeConstant,
        deadTime: this.processParams.deadTime,
      });
    });
  }

  removeLoop(blockId) {
    delete this.loops[blockId];
  }
}

module.exports = Simulator;
