import { audioManager } from './AudioManager.js';
import { VISUALS } from '../core/Constants.js';

class SfxEngine {
  constructor() {
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.windSource = null;
    this.windFilter = null;
    this.windGain = null;
    this.screechSource = null;
    this.screechFilter = null;
    this.screechGain = null;
    this.noiseBuffer = null;
    this.sirenClock = 0;
    this.lastCrashTime = 0;
    this.pendingTimers = new Set();
  }

  createNoiseBuffer(ctx) {
    if (this.noiseBuffer) return this.noiseBuffer;
    const sampleRate = ctx.sampleRate || 44100;
    const length = sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Soft pink-ish filtered noise for natural aerodynamic wind & clean thuds
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.06) * 0.7));
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  ensureContinuousNodes() {
    const ctx = audioManager.getCtx();
    const master = audioManager.getMaster();
    if (!ctx || !master || this.engineOsc) return;

    try {
      // Warm low-passed sub-hum for sports engine (no harsh sawtooth buzz)
      this.engineOsc = ctx.createOscillator();
      this.engineFilter = ctx.createBiquadFilter();
      this.engineGain = ctx.createGain();
      this.engineOsc.type = 'triangle';
      this.engineOsc.frequency.value = 50;
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 210;
      this.engineGain.gain.value = 0;

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(master);
      this.engineOsc.start();

      // Smooth aerodynamic wind / jet whoosh using filtered noise (no annoying oscillator whistle)
      const buf = this.createNoiseBuffer(ctx);
      this.windSource = ctx.createBufferSource();
      this.windSource.buffer = buf;
      this.windSource.loop = true;

      this.windFilter = ctx.createBiquadFilter();
      this.windFilter.type = 'lowpass';
      this.windFilter.frequency.value = 320;
      this.windFilter.Q.value = 0.8;

      this.windGain = ctx.createGain();
      this.windGain.gain.value = 0;

      this.windSource.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(master);
      this.windSource.start();

      // Tyre screech: band-passed noise whose level follows the real lateral slip angle
      this.screechSource = ctx.createBufferSource();
      this.screechSource.buffer = buf;
      this.screechSource.loop = true;
      this.screechFilter = ctx.createBiquadFilter();
      this.screechFilter.type = 'bandpass';
      this.screechFilter.frequency.value = 1700;
      this.screechFilter.Q.value = 6;
      this.screechGain = ctx.createGain();
      this.screechGain.gain.value = 0;
      this.screechSource.connect(this.screechFilter);
      this.screechFilter.connect(this.screechGain);
      this.screechGain.connect(master);
      this.screechSource.start();
    } catch (_) {
      this.engineOsc = null;
    }
  }

  clearPendingTimers() {
    for (const id of this.pendingTimers) {
      clearTimeout(id);
    }
    this.pendingTimers.clear();
  }

  schedule(fn, delayMs) {
    const id = setTimeout(() => {
      this.pendingTimers.delete(id);
      fn();
    }, delayMs);
    this.pendingTimers.add(id);
  }

  updateContinuous(dt, player, gameState) {
    if (!audioManager.initialized || !gameState.started || gameState.paused || gameState.busted) {
      if (this.engineGain && audioManager.ctx) {
        const t = audioManager.ctx.currentTime;
        this.engineGain.gain.setTargetAtTime(0, t, 0.06);
        if (this.windGain) this.windGain.gain.setTargetAtTime(0, t, 0.06);
        if (this.screechGain) this.screechGain.gain.setTargetAtTime(0, t, 0.06);
      }
      return;
    }

    this.ensureContinuousNodes();
    const ctx = audioManager.getCtx();
    if (!ctx || !this.engineOsc) return;

    const now = ctx.currentTime;
    const speedRatio = Math.min(1.35, Math.abs(player.speed) / 72);
    const isFlight = player.mode === 'FLIGHT';
    const pitchNorm = Math.max(-1, Math.min(1, (player.pitchAngle || 0) / 0.72));

    // Gentle warm engine hum on ground, softer in air
    const targetEngineFreq = 46 + speedRatio * 56 + (player.isBoosting ? 14 : 0);
    const targetEngineVol = isFlight ? 0.018 : 0.022 + speedRatio * 0.024;
    this.engineOsc.frequency.setTargetAtTime(targetEngineFreq, now, 0.1);
    this.engineGain.gain.setTargetAtTime(targetEngineVol, now, 0.1);

    // Smooth filtered air/turbine rush (pitch climbs gently brighten airflow, dives warm it)
    const targetWindCutoff = isFlight
      ? 300 + speedRatio * 340 + pitchNorm * 95 + (player.isBoosting ? 240 : 0)
      : 220 + speedRatio * 200 + (player.isBoosting ? 260 : 0);
    const targetWindVol = isFlight
      ? 0.042 + speedRatio * 0.028 + (player.isBoosting ? 0.032 : 0)
      : player.isBoosting
        ? 0.038
        : speedRatio * 0.014;

    if (this.windFilter && this.windGain) {
      this.windFilter.frequency.setTargetAtTime(Math.max(160, targetWindCutoff), now, 0.14);
      this.windGain.gain.setTargetAtTime(targetWindVol, now, 0.12);
    }

    if (this.screechGain) {
      const slip = Math.abs(player.slipAngle || 0);
      const sliding = player.mode === 'DRIVE' && player.isGrounded && Math.abs(player.speed) > 15;
      const amount = sliding ? Math.min(1, Math.max(0, (slip - VISUALS.TYRE_SCREECH_MIN_SLIP) / 0.2)) : 0;
      const drift = player.isDrifting ? 0.6 : 0;
      const level = Math.min(1, amount + drift) * VISUALS.TYRE_SCREECH_MAX_VOLUME;
      this.screechGain.gain.setTargetAtTime(level, now, 0.05);
      this.screechFilter.frequency.setTargetAtTime(1500 + speedRatio * 600, now, 0.1);
    }

    // Soft distant police siren chirp only when pursuit is active and units are in sight
    if (gameState.pursuit.active && gameState.pursuit.inSight) {
      this.sirenClock += dt;
      if (this.sirenClock >= 0.9) {
        this.sirenClock = 0;
        const high = Math.floor(now * 1.5) % 2 === 0;
        this.playTone(high ? 580 : 460, 0.24, 'sine', 0.018);
      }
    } else {
      this.sirenClock = 0;
    }
  }

  playTone(freq, duration = 0.15, type = 'triangle', volume = 0.08, slideTo = null) {
    const ctx = audioManager.getCtx();
    const master = audioManager.getMaster();
    if (!ctx || !master || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playNoiseBurst(duration = 0.18, startFreq = 380, endFreq = 95, volume = 0.09) {
    const ctx = audioManager.getCtx();
    const master = audioManager.getMaster();
    if (!ctx || !master || ctx.state !== 'running') return;

    const buf = this.createNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  transformSfx(toFlight = true) {
    if (toFlight) {
      this.playNoiseBurst(0.28, 320, 880, 0.065);
      this.playTone(220, 0.26, 'sine', 0.06, 520);
    } else {
      this.playNoiseBurst(0.22, 680, 220, 0.05);
      this.playTone(420, 0.2, 'sine', 0.05, 180);
    }
  }

  stuntSfx(combo = 1) {
    const base = 330 + Math.min(8, combo) * 42;
    this.playTone(base, 0.14, 'triangle', 0.08);
    this.schedule(() => this.playTone(base * 1.25, 0.18, 'triangle', 0.08), 65);
    this.schedule(() => this.playTone(base * 1.5, 0.24, 'sine', 0.09), 130);
  }

  ringSfx() {
    this.playTone(587.33, 0.12, 'sine', 0.09, 880);
    this.schedule(() => this.playTone(1174.66, 0.22, 'sine', 0.08), 70);
  }

  crashSfx() {
    const nowMs = Date.now();
    if (nowMs - this.lastCrashTime < 450) return;
    this.lastCrashTime = nowMs;

    // Clean muffled thump instead of harsh sawtooth buzzing
    this.playNoiseBurst(0.18, 360, 85, 0.085);
    this.playTone(88, 0.16, 'sine', 0.075, 38);
  }

  bustedSfx() {
    this.clearPendingTimers();
    this.playTone(360, 0.24, 'triangle', 0.09, 190);
    this.schedule(() => this.playTone(190, 0.4, 'sine', 0.1, 88), 180);
  }
}

export const sfx = new SfxEngine();
