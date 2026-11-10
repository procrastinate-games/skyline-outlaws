import { eventBus, Events } from '../core/EventBus.js';
import { audioManager } from './AudioManager.js';
import { gameplayBGM } from './music.js';
import { sfx } from './sfx.js';

export function initAudioBridge() {
  eventBus.on(Events.AUDIO_INIT, () => {
    const wasInit = audioManager.initialized;
    audioManager.init();
    if (!wasInit && audioManager.initialized) {
      audioManager.playMusic(gameplayBGM);
    }
  });

  eventBus.on(Events.AUDIO_TOGGLE_MUTE, () => {
    sfx.clearPendingTimers();
    audioManager.toggleMute();
  });

  eventBus.on(Events.GAME_RESTART, () => {
    sfx.clearPendingTimers();
  });

  eventBus.on(Events.MODE_CHANGED, ({ mode }) => {
    sfx.transformSfx(mode === 'FLIGHT');
  });

  eventBus.on(Events.STUNT_PERFORMED, ({ combo }) => {
    sfx.stuntSfx(combo);
  });

  eventBus.on(Events.RING_COLLECTED, () => {
    sfx.ringSfx();
  });

  eventBus.on(Events.PLAYER_COLLISION, () => {
    sfx.crashSfx();
  });

  eventBus.on(Events.PLAYER_BUSTED, () => {
    sfx.bustedSfx();
  });

  eventBus.on(Events.UPGRADE_PURCHASED, () => {
    sfx.ringSfx();
  });
}
