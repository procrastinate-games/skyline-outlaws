import { gameState } from '../core/GameState.js';

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.currentBgm = null;
    this.initialized = false;
  }

  init() {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = gameState.muted ? 0 : 0.85;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  getCtx() {
    if (!this.ctx) this.init();
    return this.ctx;
  }

  getMaster() {
    if (!this.masterGain) this.init();
    return this.masterGain;
  }

  playMusic(patternFn) {
    this.stopMusic();
    const ctx = this.getCtx();
    const master = this.getMaster();
    if (!ctx || !master) return;
    try {
      this.currentBgm = patternFn(ctx, master);
    } catch (_) {
      // Ignore audio scheduling errors in restricted contexts
    }
  }

  stopMusic() {
    if (this.currentBgm) {
      try {
        this.currentBgm.stop();
      } catch (_) {}
      this.currentBgm = null;
    }
  }

  toggleMute() {
    gameState.muted = !gameState.muted;
    gameState.save();
    this.setMuted(gameState.muted);
    return gameState.muted;
  }

  setMuted(muted) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.03);
    }
  }
}

export const audioManager = new AudioManager();
