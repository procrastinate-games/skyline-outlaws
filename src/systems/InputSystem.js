import { eventBus, Events } from '../core/EventBus.js';

export class InputSystem {
  constructor() {
    this.keys = new Set();
    this.justPressedFlight = false;
    this.touchState = {
      steer: 0,
      pitch: 0,
      throttle: 0,
      brake: 0,
      drift: false,
      boost: false,
    };

    if (typeof window !== 'undefined') {
      this.bindKeyboard();
    }
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(code)
      ) {
        e.preventDefault();
      }

      if (!this.keys.has(code)) {
        if (code === 'KeyF' || code === 'Tab') {
          this.justPressedFlight = true;
        }
        if (code === 'KeyM') {
          eventBus.emit(Events.AUDIO_TOGGLE_MUTE);
        }
      }

      this.keys.add(code);
      eventBus.emit(Events.AUDIO_INIT);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  /** Drop one-shot presses (e.g. F tapped while busted) so they don't fire after a restart. */
  resetTransient() {
    this.justPressedFlight = false;
  }

  triggerFlightToggle() {
    this.justPressedFlight = true;
    eventBus.emit(Events.AUDIO_INIT);
  }

  setTouchControl(key, value) {
    this.touchState[key] = value;
    eventBus.emit(Events.AUDIO_INIT);
  }

  getSnapshot(currentMode = 'DRIVE') {
    const up = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const down = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight');

    let steer = 0;
    if (left) steer += 1;
    if (right) steer -= 1;
    if (Math.abs(this.touchState.steer) > 0.05) {
      steer = -this.touchState.steer;
    }

    let throttle = up ? 1 : this.touchState.throttle;
    let brake = down ? 1 : this.touchState.brake;
    let pitch = 0;

    if (currentMode === 'FLIGHT') {
      // In Flight Mode, engines maintain cruise thrust automatically while W/S or Up/Down control climb/dive pitch!
      throttle = down ? 0 : 1;
      if (up) pitch = 1;
      else if (down) pitch = -1;
      else if (Math.abs(this.touchState.pitch) > 0.05) {
        pitch = this.touchState.pitch;
      }
    }

    // Space / DRIFT button: powerslide on the road, air brake in Flight Mode
    const drift = this.keys.has('Space') || this.touchState.drift;
    const airBrake = currentMode === 'FLIGHT' && drift;
    const boost =
      this.keys.has('ShiftLeft') ||
      this.keys.has('ShiftRight') ||
      this.keys.has('KeyE') ||
      this.keys.has('KeyB') ||
      this.touchState.boost;

    const flightToggleJustPressed = this.justPressedFlight;
    this.justPressedFlight = false;

    return {
      throttle,
      brake,
      steer,
      pitch,
      drift,
      boost,
      airBrake,
      flightToggleJustPressed,
    };
  }
}
