import { STORAGE_KEY, VEHICLES, UPGRADE_CONFIG, PAINTS, STUNTS } from './Constants.js';
import { eventBus, Events } from './EventBus.js';

class GameState {
  constructor() {
    this.bestScore = 0;
    this.credits = 250;
    this.selectedVehicle = 'apex';
    this.unlockedVehicles = ['apex'];
    this.selectedPaint = 'cyber_cyan';
    this.upgrades = {
      topSpeed: 0,
      acceleration: 0,
      jetThrust: 0,
      boostCapacity: 0,
    };
    this.completedChallenges = [];
    this.muted = false;

    this.loadSave();
  }

  reset() {
    this.started = false;
    this.paused = false;
    this.busted = false;
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.maxCombo = 1;
    this.stuntsLanded = 0;
    this.ringsCollected = 0;
    this.escapes = 0;
    this.runCreditsEarned = 0;

    this.mode = 'DRIVE';
    this.speedKmh = 0;
    this.altitude = 0;
    this.maxIntegrity = 100;
    this.integrity = 100;

    const boostBonus = 1 + (this.upgrades.boostCapacity || 0) * UPGRADE_CONFIG.boostCapacity.perLevelBonus;
    this.maxBoost = Math.round(100 * boostBonus);
    this.boost = this.maxBoost;

    this.pursuit = {
      active: false,
      heat: 0,
      escapeProgress: 0,
      inSight: false,
      timeActive: 0,
    };

    this.activeChallenge = null;
    this.recentStunts = [];
  }

  getVehicleStats() {
    const base = VEHICLES[this.selectedVehicle] || VEHICLES.apex;
    const paint = PAINTS[this.selectedPaint] || PAINTS.cyber_cyan;
    const speedMult = 1 + (this.upgrades.topSpeed || 0) * UPGRADE_CONFIG.topSpeed.perLevelBonus;
    const accelMult = 1 + (this.upgrades.acceleration || 0) * UPGRADE_CONFIG.acceleration.perLevelBonus;
    const jetMult = 1 + (this.upgrades.jetThrust || 0) * UPGRADE_CONFIG.jetThrust.perLevelBonus;

    return {
      ...base,
      maxDriveSpeed: base.maxDriveSpeed * speedMult,
      maxFlightSpeed: base.maxFlightSpeed * ((speedMult + jetMult) * 0.5),
      acceleration: base.acceleration * accelMult,
      flightClimbRate: base.flightClimbRate * jetMult,
      primaryColor: paint.body,
      thrusterColor: paint.thruster,
    };
  }

  addScore(basePoints, label = null) {
    const pts = Math.round(basePoints * this.combo);
    this.score += pts;
    const creditGain = Math.max(5, Math.round(pts * 0.12));
    this.credits += creditGain;
    this.runCreditsEarned += creditGain;

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
    }

    if (this.activeChallenge && this.activeChallenge.targetType === 'score') {
      this.activeChallenge.progress += pts;
    }

    this.save();
    eventBus.emit(Events.SCORE_CHANGED, {
      score: this.score,
      bestScore: this.bestScore,
      pointsAdded: pts,
      combo: this.combo,
      credits: this.credits,
      label,
    });
    return pts;
  }

  registerStunt(id, label, basePoints, incrementCombo = true) {
    if (incrementCombo) {
      if (this.comboTimer > 0) {
        this.combo = Math.min(STUNTS.MAX_COMBO, this.combo + 1);
      } else {
        this.combo = 1;
      }
      this.comboTimer = STUNTS.COMBO_WINDOW;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
    }

    this.stuntsLanded += 1;
    const awarded = this.addScore(basePoints, label);
    const entry = {
      id,
      label,
      points: awarded,
      combo: this.combo,
      timestamp: Date.now(),
    };
    this.recentStunts.unshift(entry);
    if (this.recentStunts.length > 5) {
      this.recentStunts.pop();
    }

    eventBus.emit(Events.STUNT_PERFORMED, entry);
    eventBus.emit(Events.COMBO_UPDATED, {
      combo: this.combo,
      comboTimer: this.comboTimer,
    });
    return entry;
  }

  updateComboTimer(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer === 0 && this.combo > 1) {
        this.combo = 1;
        eventBus.emit(Events.COMBO_UPDATED, { combo: this.combo, comboTimer: 0 });
      }
    }
  }

  getUpgradeCost(statId) {
    const cfg = UPGRADE_CONFIG[statId];
    if (!cfg) return Infinity;
    const currentLevel = this.upgrades[statId] || 0;
    if (currentLevel >= cfg.maxLevel) return Infinity;
    return Math.round(cfg.baseCost * Math.pow(1.45, currentLevel));
  }

  upgradeStat(statId) {
    const cfg = UPGRADE_CONFIG[statId];
    if (!cfg) return false;
    const level = this.upgrades[statId] || 0;
    if (level >= cfg.maxLevel) return false;
    const cost = this.getUpgradeCost(statId);
    if (this.credits < cost) return false;

    this.credits -= cost;
    this.upgrades[statId] = level + 1;
    const boostBonus = 1 + (this.upgrades.boostCapacity || 0) * UPGRADE_CONFIG.boostCapacity.perLevelBonus;
    this.maxBoost = Math.round(100 * boostBonus);
    this.boost = Math.min(this.maxBoost, this.boost + 25);

    this.save();
    eventBus.emit(Events.UPGRADE_PURCHASED, {
      statId,
      level: this.upgrades[statId],
      credits: this.credits,
    });
    return true;
  }

  selectVehicle(vehicleId) {
    const vehicle = VEHICLES[vehicleId];
    if (!vehicle) return false;
    if (!this.unlockedVehicles.includes(vehicleId)) {
      if (this.credits < vehicle.cost) return false;
      this.credits -= vehicle.cost;
      this.unlockedVehicles.push(vehicleId);
    }
    this.selectedVehicle = vehicleId;
    this.save();
    eventBus.emit(Events.VEHICLE_CHANGED, {
      vehicleId,
      credits: this.credits,
    });
    return true;
  }

  selectPaint(paintId) {
    if (!PAINTS[paintId]) return false;
    this.selectedPaint = paintId;
    this.save();
    eventBus.emit(Events.PAINT_CHANGED, { paintId });
    return true;
  }

  loadSave() {
    this.bestScore = 0;
    this.credits = 250;
    this.selectedVehicle = 'apex';
    this.unlockedVehicles = ['apex'];
    this.selectedPaint = 'cyber_cyan';
    this.upgrades = {
      topSpeed: 0,
      acceleration: 0,
      jetThrust: 0,
      boostCapacity: 0,
    };
    this.completedChallenges = [];
    this.muted = false;
    this.reset();

    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.bestScore === 'number') this.bestScore = data.bestScore;
      if (typeof data.credits === 'number') this.credits = data.credits;
      if (typeof data.selectedVehicle === 'string' && VEHICLES[data.selectedVehicle]) {
        this.selectedVehicle = data.selectedVehicle;
      }
      if (Array.isArray(data.unlockedVehicles) && data.unlockedVehicles.length) {
        this.unlockedVehicles = [...new Set(['apex', ...data.unlockedVehicles])];
      }
      if (typeof data.selectedPaint === 'string' && PAINTS[data.selectedPaint]) {
        this.selectedPaint = data.selectedPaint;
      }
      if (data.upgrades && typeof data.upgrades === 'object') {
        for (const k of Object.keys(this.upgrades)) {
          if (typeof data.upgrades[k] === 'number') {
            this.upgrades[k] = Math.min(UPGRADE_CONFIG[k].maxLevel, Math.max(0, data.upgrades[k]));
          }
        }
      }
      if (Array.isArray(data.completedChallenges)) {
        this.completedChallenges = data.completedChallenges;
      }
      if (typeof data.muted === 'boolean') {
        this.muted = data.muted;
      }
    } catch (_) {
      // Ignore corrupt save data
    }
    this.reset();
  }

  save() {
    try {
      if (typeof localStorage === 'undefined') return;
      const payload = {
        bestScore: this.bestScore,
        credits: this.credits,
        selectedVehicle: this.selectedVehicle,
        unlockedVehicles: this.unlockedVehicles,
        selectedPaint: this.selectedPaint,
        upgrades: this.upgrades,
        completedChallenges: this.completedChallenges,
        muted: this.muted,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {
      // Ignore storage quota errors
    }
  }
}

export const gameState = new GameState();
