import { audioManager } from './AudioManager.js';

class SfxEngine {
  constructor() {
    this.engineOsc = null;
    this.jetOsc = null;
    this.engineGain = null;
    this.jetGain = null;
    this.sirenClock = 0;
  }

  ensureContinuousNodes() {
    const ctx = audioManager.getCtx();
    const master = audioManager.getMaster();
    if (!ctx || !master || this.engineOsc) return;

    try {
      this.engineOsc = ctx.createOscillator();
      this.engineGain = ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain.gain.value = 0;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(master);
      this.engineOsc.start();

      // Jet turbine harmonic oscillator
      this.jetOsc = ctx.createOscillator();
      this.jetGain = ctx.createGain();
      this.jetOsc.type = 'triangle';
      this.jetOsc.frequency.value = 180;
      this.jetGain.gain.value = 0;

      this.jetOsc.connect(this.jetGain);
      this.jetGain.connect(master);
      this.jetOsc.start();
    } catch (_) {
      this.engineOsc = null;
    }
  }

  updateContinuous(dt, player, gameState) {
    if (!audioManager.initialized || !gameState.started || gameState.paused || gameState.busted) {
      if (this.engineGain && audioManager.ctx) {
        this.engineGain.gain.setTargetAtTime(0, audioManager.ctx.currentTime, 0.05);
        this.jetGain.gain.setTargetAtTime(0, audioManager.ctx.currentTime, 0.05);
      }
      return;
    }

    this.ensureContinuousNodes();
    const ctx = audioManager.getCtx();
    if (!ctx || !this.engineOsc) return;

    const now = ctx.currentTime;
    const speedRatio = Math.min(1.4, Math.abs(player.speed) / 70);
    const isFlight = player.mode === 'FLIGHT';

    const targetEngineFreq = 52 + speedRatio * 125 + (player.isBoosting ? 35 : 0);
    const targetEngineVol = isFlight ? 0.035 : 0.065 + speedRatio * 0.04;

    const targetJetFreq = 190 + speedRatio * 280 + (player.isBoosting ? 110 : 0);
    const targetJetVol = isFlight
      ? 0.075 + (player.isBoosting ? 0.04 : 0)
      : player.isBoosting
        ? 0.05
        : 0.005;

    this.engineOsc.frequency.setTargetAtTime(targetEngineFreq, now, 0.06);
    this.engineGain.gain.setTargetAtTime(targetEngineVol, now, 0.06);

    this.jetOsc.frequency.setTargetAtTime(targetJetFreq, now, 0.06);
    this.jetGain.gain.setTargetAtTime(targetJetVol, now, 0.06);

    // Periodic police siren chirp when pursuit is active and in sight
    if (gameState.pursuit.active) {
      this.sirenClock += dt;
      if (this.sirenClock >= 0.65) {
        this.sirenClock = 0;
        const high = Math.floor(now * 2) % 2 === 0;
        this.playTone(high ? 680 : 510, 0.22, 'sine', 0.035);
      }
    }
  }

  playTone(freq, duration = 0.15, type = 'triangle', volume = 0.1, slideTo = null) {
    const ctx = audioManager.getCtx();
    const master = audioManager.getMaster();
    if (!ctx || !master || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  transformSfx(toFlight = true) {
    if (toFlight) {
      this.playTone(180, 0.28, 'sawtooth', 0.11, 620);
      this.playTone(320, 0.32, 'triangle', 0.09, 880);
    } else {
      this.playTone(540, 0.22, 'triangle', 0.09, 190);
    }
  }

  stuntSfx(combo = 1) {
    const base = 330 + Math.min(8, combo) * 45;
    this.playTone(base, 0.14, 'triangle', 0.11);
    setTimeout(() => this.playTone(base * 1.25, 0.18, 'triangle', 0.11), 65);
    setTimeout(() => this.playTone(base * 1.5, 0.24, 'sine', 0.12), 130);
  }

  ringSfx() {
    this.playTone(587.33, 0.12, 'sine', 0.12, 880);
    setTimeout(() => this.playTone(1174.66, 0.25, 'triangle', 0.12), 70);
  }

  crashSfx() {
    this.playTone(115, 0.22, 'sawtooth', 0.14, 38);
  }

  bustedSfx() {
    this.playTone(440, 0.25, 'sawtooth', 0.12, 220);
    setTimeout(() => this.playTone(220, 0.45, 'sawtooth', 0.14, 95), 180);
  }
}

export const sfx = new SfxEngine();
