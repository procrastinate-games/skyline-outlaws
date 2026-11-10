export const Events = {
  // Game flow
  GAME_START: 'game:start',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_RESTART: 'game:restart',

  // Vehicle & transformation
  MODE_CHANGED: 'vehicle:mode_changed',
  PLAYER_JUMP: 'player:jump',
  PLAYER_LANDED: 'player:landed',
  PLAYER_COLLISION: 'player:collision',
  PLAYER_BUSTED: 'player:busted',

  // Stunts, Rings & Scoring
  STUNT_PERFORMED: 'stunt:performed',
  RING_COLLECTED: 'ring:collected',
  COMBO_UPDATED: 'combo:updated',
  SCORE_CHANGED: 'score:changed',

  // Police Pursuit
  PURSUIT_STARTED: 'pursuit:started',
  PURSUIT_UPDATED: 'pursuit:updated',
  PURSUIT_ESCAPED: 'pursuit:escaped',

  // Progression & Challenges
  UPGRADE_PURCHASED: 'progression:upgrade_purchased',
  VEHICLE_CHANGED: 'progression:vehicle_changed',
  PAINT_CHANGED: 'progression:paint_changed',
  CHALLENGE_STARTED: 'challenge:started',
  CHALLENGE_COMPLETED: 'challenge:completed',
  CHALLENGE_FAILED: 'challenge:failed',

  // Audio
  AUDIO_INIT: 'audio:init',
  AUDIO_TOGGLE_MUTE: 'audio:toggle_mute',
  MUSIC_GAMEPLAY: 'music:gameplay',
  MUSIC_STOP: 'music:stop',
};

class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this;
  }

  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    return this.on(event, wrapper);
  }

  off(event, callback) {
    if (!this.listeners[event]) return this;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    return this;
  }

  emit(event, data = {}) {
    if (!this.listeners[event]) return this;
    for (const callback of [...this.listeners[event]]) {
      try {
        callback(data);
      } catch (err) {
        console.error(`EventBus error in ${event}:`, err);
      }
    }
    return this;
  }

  removeAll() {
    this.listeners = {};
    return this;
  }

  clear() {
    return this.removeAll();
  }
}

export const eventBus = new EventBus();
