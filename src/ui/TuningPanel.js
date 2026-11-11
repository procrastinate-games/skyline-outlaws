import { VEHICLE_TUNING } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { activePreset, applyPreset, exportTuning, setTuningValue, tuning } from '../core/Tuning.js';

const PRESET_LABELS = { responsive: 'Responsive', reference: 'Reference', stable: 'Stable' };

/**
 * Developer tuning panel for vehicle game feel. Toggle with the ` key or open via ?tune in the URL.
 * Changes apply live and are remembered under pg:skyline-outlaws:tuning.
 */
export class TuningPanel {
  constructor(rootEl, game) {
    this.rootEl = rootEl;
    this.game = game;
    this.visible = false;
    this.inputs = new Map();
    this.fpsSmoothed = 60;

    this.el = document.createElement('div');
    this.el.className = 'tuning-panel hidden';
    this.el.setAttribute('aria-label', 'Vehicle tuning panel');
    this.rootEl.appendChild(this.el);
    this.build();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') {
        e.preventDefault();
        this.toggle();
      }
    });
    eventBus.on(Events.TUNING_CHANGED, () => this.syncInputs());

    if (/[?&]tune\b/.test(window.location.search)) this.toggle(true);
  }

  build() {
    const presetButtons = Object.keys(VEHICLE_TUNING.PRESETS)
      .map((name) => `<button class="hud-btn" data-preset="${name}">${PRESET_LABELS[name] || name}</button>`)
      .join('');

    let currentGroup = '';
    const rows = VEHICLE_TUNING.SCHEMA.map(([group, key, label, min, max, step]) => {
      const header = group !== currentGroup ? `<div class="tuning-group">${group.toUpperCase()}</div>` : '';
      currentGroup = group;
      return `${header}
        <label class="tuning-row">
          <span>${label}</span>
          <input type="range" min="${min}" max="${max}" step="${step}" data-group="${group}" data-key="${key}" />
          <output data-out="${group}.${key}"></output>
        </label>`;
    }).join('');

    this.el.innerHTML = `
      <div class="tuning-head">
        <strong>VEHICLE FEEL</strong>
        <span class="tuning-preset" data-active-preset></span>
        <button class="hud-btn" data-close>✕</button>
      </div>
      <div class="tuning-presets">${presetButtons}</div>
      <div class="tuning-telemetry" data-telemetry></div>
      <div class="tuning-rows">${rows}</div>
      <div class="tuning-foot">
        <button class="hud-btn" data-copy>COPY JSON</button>
        <span class="tuning-hint">[\`] toggle · values saved locally</span>
      </div>
    `;

    this.el.querySelectorAll('input[type="range"]').forEach((input) => {
      this.inputs.set(`${input.dataset.group}.${input.dataset.key}`, input);
      input.addEventListener('input', () => {
        setTuningValue(input.dataset.group, input.dataset.key, parseFloat(input.value));
      });
      // Give keyboard focus back to the game so arrow keys keep driving instead of moving the slider
      input.addEventListener('change', () => input.blur());
      input.addEventListener('pointerup', () => input.blur());
    });
    this.el.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyPreset(btn.dataset.preset);
        btn.blur();
      });
    });
    this.el.querySelector('[data-close]').addEventListener('click', () => this.toggle(false));
    this.el.querySelector('[data-copy]').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      try {
        await navigator.clipboard.writeText(exportTuning());
        btn.textContent = 'COPIED!';
      } catch (_) {
        console.info(exportTuning());
        btn.textContent = 'SEE CONSOLE';
      }
      setTimeout(() => (btn.textContent = 'COPY JSON'), 1400);
      btn.blur();
    });
    this.syncInputs();
  }

  syncInputs() {
    for (const [path, input] of this.inputs) {
      const [group, key] = path.split('.');
      input.value = tuning[group][key];
      const out = this.el.querySelector(`[data-out="${path}"]`);
      if (out) out.textContent = Number(tuning[group][key]).toFixed(input.step.includes('.') ? input.step.split('.')[1].length : 0);
    }
    const label = this.el.querySelector('[data-active-preset]');
    if (label) label.textContent = PRESET_LABELS[activePreset] || activePreset;
    this.el.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.classList.toggle('accent', btn.dataset.preset === activePreset);
    });
  }

  toggle(force) {
    this.visible = typeof force === 'boolean' ? force : !this.visible;
    this.el.classList.toggle('hidden', !this.visible);
    if (this.visible) this.syncInputs();
  }

  /** Live telemetry so tuning changes can be judged with numbers, not only by eye. */
  update(dt) {
    if (!this.visible || dt <= 0) return;
    this.fpsSmoothed += (1 / dt - this.fpsSmoothed) * 0.05;
    const p = this.game.player;
    const el = this.el.querySelector('[data-telemetry]');
    if (!el) return;
    el.textContent =
      `${Math.round(Math.abs(p.speed) * 3.2)} km/h · slip ${(p.slipAngle * 57.3).toFixed(1)}° · ` +
      `yaw ${p.yawRate.toFixed(2)} rad/s · accel ${p.longAccel.toFixed(1)} · ${Math.round(this.fpsSmoothed)} fps`;
  }
}
