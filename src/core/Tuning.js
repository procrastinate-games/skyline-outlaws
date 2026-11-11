import { VEHICLE_TUNING } from './Constants.js';
import { eventBus, Events } from './EventBus.js';

const clonePreset = (name) => structuredClone(VEHICLE_TUNING.PRESETS[name] || VEHICLE_TUNING.PRESETS[VEHICLE_TUNING.DEFAULT_PRESET]);

/**
 * Live vehicle-feel parameters read every frame by PlayerVehicle and CameraSystem.
 * The object identity never changes, so systems can hold a reference to `tuning.drive` etc.
 */
export const tuning = clonePreset(VEHICLE_TUNING.DEFAULT_PRESET);
export let activePreset = VEHICLE_TUNING.DEFAULT_PRESET;

function assignInto(source) {
  for (const group of Object.keys(tuning)) {
    Object.assign(tuning[group], source[group] || {});
  }
}

export function applyPreset(name) {
  if (!VEHICLE_TUNING.PRESETS[name]) return false;
  assignInto(clonePreset(name));
  activePreset = name;
  saveTuning();
  eventBus.emit(Events.TUNING_CHANGED, { preset: name });
  return true;
}

export function setTuningValue(group, key, value) {
  if (!tuning[group] || typeof tuning[group][key] !== 'number' || !Number.isFinite(value)) return false;
  tuning[group][key] = value;
  activePreset = 'custom';
  saveTuning();
  eventBus.emit(Events.TUNING_CHANGED, { group, key, value });
  return true;
}

export function exportTuning() {
  return JSON.stringify({ preset: activePreset, ...tuning }, null, 2);
}

function saveTuning() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(VEHICLE_TUNING.STORAGE_KEY, JSON.stringify({ preset: activePreset, values: tuning }));
  } catch (_) {
    // Storage may be unavailable (private mode, quota); tuning still works for this session
  }
}

/** Restore the last chosen preset / custom values (only numeric keys that still exist are accepted). */
export function loadTuning() {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(VEHICLE_TUNING.STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.preset && VEHICLE_TUNING.PRESETS[data.preset]) {
      assignInto(clonePreset(data.preset));
      activePreset = data.preset;
    }
    if (data.preset === 'custom' && data.values) {
      for (const group of Object.keys(tuning)) {
        for (const key of Object.keys(tuning[group])) {
          const v = data.values[group]?.[key];
          if (typeof v === 'number' && Number.isFinite(v)) tuning[group][key] = v;
        }
      }
      activePreset = 'custom';
    }
  } catch (_) {
    // Ignore corrupt tuning data and keep defaults
  }
}
