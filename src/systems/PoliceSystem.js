import * as THREE from 'three';
import { PHYSICS, POLICE, STUNTS } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { buildPoliceCar } from '../gameplay/PoliceCarModel.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smoothing = (rate, dt) => 1 - Math.exp(-rate * dt);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Metro Police pursuit.
 * - Interceptors are full police cars that drive like cars and, when the player takes off,
 *   deploy wings and chase in the air (landing again when the player is back on the road).
 * - Units only know where the player is while they can SEE them (within detection range and
 *   not blocked by a building). Out of sight they hunt the last known position, so breaking
 *   line of sight or outrunning them fills the escape bar.
 * - Top speeds are a heat-dependent share of the player's own vehicle; they only rubber-band
 *   when the player is slower than them, so full throttle / boost / flight can open a gap.
 */
export class PoliceSystem {
  constructor(scene, player, city) {
    this.scene = scene;
    this.player = player;
    this.city = city;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.units = [];
    this.ramCooldown = 0;
    this.graceTimer = 10; // Initial grace period so player can enjoy first jump before sirens
    this.strobeClock = 0;
    this.lastKnown = new THREE.Vector3();
    this.lastKnownVelocity = new THREE.Vector3();
    this.timeSinceSeen = 0;
    this.playerGroundedTime = 0;
    this._eye = new THREE.Vector3();
    this._target = new THREE.Vector3();
  }

  reset() {
    this.clearUnits();
    this.ramCooldown = 0;
    this.graceTimer = 8;
    this.timeSinceSeen = 0;
    this.playerGroundedTime = 0;
    gameState.pursuit.active = false;
    gameState.pursuit.heat = 0;
    gameState.pursuit.escapeProgress = 0;
    gameState.pursuit.captureProgress = 0;
    gameState.pursuit.inSight = false;
    gameState.pursuit.timeActive = 0;
  }

  clearUnits() {
    for (const u of this.units) {
      this.root.remove(u.mesh);
    }
    this.units = [];
  }

  startPursuit(heatLevel = 1) {
    if (gameState.busted) return;
    const heat = Math.max(1, Math.min(3, heatLevel));
    const wasActive = gameState.pursuit.active;

    gameState.pursuit.active = true;
    gameState.pursuit.heat = Math.max(gameState.pursuit.heat, heat);
    gameState.pursuit.escapeProgress = 0;
    if (!wasActive) {
      gameState.pursuit.captureProgress = 0;
    }
    gameState.pursuit.inSight = true;
    this.lastKnown.copy(this.player.position);
    this.lastKnownVelocity.copy(this.player.velocity || new THREE.Vector3());
    this.timeSinceSeen = 0;

    this.ensureUnitCount();

    if (!wasActive) {
      eventBus.emit(Events.PURSUIT_STARTED, { heat: gameState.pursuit.heat });
    }
  }

  playerIsAirborneTarget() {
    if (this.player.mode !== 'FLIGHT') return false;
    const surface = this.city.getSurfaceAt(this.player.position.x, this.player.position.z, this.player.position.y);
    return this.player.position.y - surface.height > POLICE.AIR_PURSUIT_MIN_ALTITUDE;
  }

  ensureUnitCount() {
    const heat = gameState.pursuit.heat;
    const targetCount = POLICE.MAX_UNITS_PER_HEAT[heat] || 2;
    const heading = this.player.heading || 0;
    const fwdX = -Math.sin(heading);
    const fwdZ = -Math.cos(heading);
    const rightX = Math.cos(heading);
    const rightZ = -Math.sin(heading);
    const airborne = this.playerIsAirborneTarget();

    while (this.units.length < targetCount) {
      const idx = this.units.length;
      const slot = POLICE.FORMATION[idx % POLICE.FORMATION.length];
      const model = buildPoliceCar();

      // Spawn behind the player so units roar up from the rear and visibly chase
      const spawnForward = -POLICE.SPAWN_BEHIND_DISTANCE;
      const sx = this.player.position.x + fwdX * spawnForward + rightX * slot.spawnRight;
      const sz = this.player.position.z + fwdZ * spawnForward + rightZ * slot.spawnRight;
      const sy = airborne ? this.player.position.y + slot.air.up : this.city.getSurfaceAt(sx, sz, 0).height + POLICE.RIDE_HEIGHT;
      model.group.position.set(sx, sy, sz);
      model.group.rotation.order = 'YXZ';
      model.group.rotation.y = heading;
      model.setFlight(airborne ? 1 : 0);
      this.root.add(model.group);

      this.units.push({
        type: 'cruiser',
        mode: airborne ? 'air' : 'ground',
        mesh: model.group,
        model,
        leftStrobe: model.leftStrobe,
        rightStrobe: model.rightStrobe,
        speedJitter: 1 + idx * POLICE.UNIT_SPEED_STAGGER,
        slot,
        heading,
        currentSpeed: Math.max(0, this.player.speed || 0),
        verticalSpeed: 0,
        wingDeploy: airborne ? 1 : 0,
        yawRate: 0,
        pitch: 0,
        roll: 0,
      });
    }
  }

  triggerBust() {
    if (gameState.busted) return;
    gameState.pursuit.captureProgress = 1;
    gameState.integrity = 0;
    gameState.busted = true;
    gameState.pursuit.active = false;
    eventBus.emit(Events.PLAYER_BUSTED, {
      score: gameState.score,
      bestScore: gameState.bestScore,
    });
  }

  applyDamage(amount) {
    if (gameState.busted) return;
    gameState.integrity = Math.max(0, gameState.integrity - amount);
    gameState.pursuit.captureProgress = Math.min(
      1,
      Math.max(gameState.pursuit.captureProgress, 1 - gameState.integrity / gameState.maxIntegrity)
    );
    if (gameState.integrity <= 0 || gameState.pursuit.captureProgress >= 1) {
      this.triggerBust();
    }
  }

  /** Can this unit see the player right now? (range + no building in between) */
  canSee(unit, detectionRadius = POLICE.DETECTION_RADIUS) {
    const p = this.player.position;
    const u = unit.mesh.position;
    if (u.distanceTo(p) > detectionRadius) return false;
    this._eye.set(u.x, u.y + POLICE.EYE_HEIGHT, u.z);
    this._target.set(p.x, p.y + POLICE.EYE_HEIGHT * 0.5, p.z);
    return this.city.hasLineOfSight(this._eye, this._target);
  }

  update(dt) {
    if (!gameState.started || gameState.paused || gameState.busted) return;

    this.strobeClock += dt * 10;
    if (this.ramCooldown > 0) {
      this.ramCooldown = Math.max(0, this.ramCooldown - dt);
    }

    if (!gameState.pursuit.active) {
      if (this.graceTimer > 0) {
        this.graceTimer = Math.max(0, this.graceTimer - dt);
      } else if (gameState.score >= POLICE.TRIGGER_SCORE_THRESHOLD) {
        const autoHeat = gameState.score > 4500 ? 3 : gameState.score > 1800 ? 2 : 1;
        this.startPursuit(autoHeat);
      }
      return;
    }

    // Heat escalates the longer the chase lasts
    gameState.pursuit.timeActive += dt;
    if (gameState.pursuit.timeActive > POLICE.HEAT2_AFTER && gameState.pursuit.heat < 2) {
      gameState.pursuit.heat = 2;
      this.ensureUnitCount();
    } else if (gameState.pursuit.timeActive > POLICE.HEAT3_AFTER && gameState.pursuit.heat < 3) {
      gameState.pursuit.heat = 3;
      this.ensureUnitCount();
    }

    // 1. Visibility: any unit with a clear view updates the shared last-known position.
    //    In open sky police can spot the player from further away than between buildings.
    const playerAirborne = this.playerIsAirborneTarget();
    const detectionRadius = playerAirborne ? POLICE.DETECTION_RADIUS_AIR : POLICE.DETECTION_RADIUS;
    let seen = false;
    let minSeenDist = Infinity;
    for (const unit of this.units) {
      if (this.canSee(unit, detectionRadius)) {
        seen = true;
        minSeenDist = Math.min(minSeenDist, unit.mesh.position.distanceTo(this.player.position));
      }
    }
    if (seen) {
      this.lastKnown.copy(this.player.position);
      this.lastKnownVelocity.copy(this.player.velocity);
      this.timeSinceSeen = 0;
    } else {
      this.timeSinceSeen += dt;
    }
    gameState.pursuit.inSight = seen;

    // 2. Air pursuit follows the player into the sky; units land again once the player is back on the road
    this.playerGroundedTime = playerAirborne ? 0 : this.playerGroundedTime + dt;
    const strobeToggle = Math.floor(this.strobeClock) % 2 === 0;

    for (let i = 0; i < this.units.length; i++) {
      const unit = this.units[i];
      unit.leftStrobe.visible = strobeToggle;
      unit.rightStrobe.visible = !strobeToggle;

      if (unit.mode === 'ground' && playerAirborne) {
        unit.mode = 'air';
        unit.verticalSpeed = POLICE.TAKEOFF_LIFT;
      } else if (unit.mode === 'air' && this.playerGroundedTime > POLICE.AIR_LAND_DELAY) {
        unit.mode = 'landing';
      }

      this.steerUnit(unit, dt, seen);
      this.separate(unit, i);
    }
    // Stand-off runs last so unit-to-unit separation can never shove a car into the player
    for (const unit of this.units) {
      this.keepStandoff(unit);
      this.animateUnit(unit, dt);
    }

    // 3. Arrest meter: only fills while police can see a slow/stopped player up close
    const isOutrunning =
      this.player.isBoosting ||
      this.player.speed >= POLICE.OUTRUN_SPEED ||
      (this.player.mode === 'FLIGHT' && this.player.speed >= POLICE.OUTRUN_FLIGHT_SPEED);
    const inCaptureZone = seen && minSeenDist <= POLICE.CAPTURE_RADIUS;

    if (inCaptureZone && !isOutrunning) {
      const speedRatio = Math.min(1, Math.max(0, this.player.speed) / 48);
      const fillMultiplier = 1.0 - speedRatio * 0.58; // 1.0x at rest -> 0.42x at moderate speed
      const heatFactor = 1 + (gameState.pursuit.heat - 1) * 0.12;
      const fillRate = (fillMultiplier * heatFactor) / POLICE.CAPTURE_DURATION;
      gameState.pursuit.captureProgress = Math.min(1, gameState.pursuit.captureProgress + fillRate * dt);
    } else {
      gameState.pursuit.captureProgress = Math.max(0, gameState.pursuit.captureProgress - POLICE.CAPTURE_DECAY_RATE * dt);
    }

    // Keep integrity mirrored to remaining arrest margin (100% -> 0% as captureProgress goes 0 -> 1)
    gameState.integrity = Math.max(0, Math.round((1 - gameState.pursuit.captureProgress) * gameState.maxIntegrity));

    if (gameState.pursuit.captureProgress >= 1) {
      this.triggerBust();
      return;
    }

    // 4. Escape: stay unseen until the bar fills
    if (!seen) {
      gameState.pursuit.escapeProgress = Math.min(1, gameState.pursuit.escapeProgress + dt / POLICE.ESCAPE_DURATION);
      if (gameState.pursuit.escapeProgress >= 1) {
        this.completeEscape();
      }
    } else {
      gameState.pursuit.escapeProgress = Math.max(0, gameState.pursuit.escapeProgress - dt * POLICE.ESCAPE_DECAY_RATE);
    }
  }

  /**
   * Car-like pursuit steering on the ground or in the air. With the player in sight units take
   * formation slots around them; out of sight they head for the last known position (extrapolated briefly).
   */
  steerUnit(unit, dt, seen) {
    const player = this.player;
    const stats = gameState.getVehicleStats();
    const heat = gameState.pursuit.heat || 1;
    const pos = unit.mesh.position;
    const inAir = unit.mode !== 'ground';
    const playerSpeed = Math.max(0, player.speed || 0);

    // Target point
    let targetX;
    let targetY;
    let targetZ;
    let arrivedHeading = null;
    if (seen) {
      const h = player.heading || 0;
      const fwdX = -Math.sin(h);
      const fwdZ = -Math.cos(h);
      const rightX = Math.cos(h);
      const rightZ = -Math.sin(h);
      const boxingIn = player.mode === 'DRIVE' && playerSpeed < POLICE.BOX_IN_SPEED;
      const slot = inAir ? unit.slot.air : boxingIn ? unit.slot.box : unit.slot.chase;
      targetX = player.position.x + fwdX * slot.forward + rightX * slot.right;
      targetZ = player.position.z + fwdZ * slot.forward + rightZ * slot.right;
      targetY = player.position.y + (inAir ? slot.up || 0 : 0);
      arrivedHeading = h;
    } else {
      const lead = Math.min(this.timeSinceSeen, POLICE.SEARCH_EXTRAPOLATE_TIME);
      targetX = this.lastKnown.x + this.lastKnownVelocity.x * lead;
      targetZ = this.lastKnown.z + this.lastKnownVelocity.z * lead;
      targetY = this.lastKnown.y + this.lastKnownVelocity.y * lead;
    }
    if (unit.mode === 'landing') {
      // Land on the road level under the unit (not on rooftops), then rejoin the ground chase
      targetY = this.city.getSurfaceAt(pos.x, pos.z, 0).height + POLICE.RIDE_HEIGHT;
    }

    const toX = targetX - pos.x;
    const toZ = targetZ - pos.z;
    const dist = Math.hypot(toX, toZ);

    // Heading: steer toward the target with a limited turn rate; hold the player's heading in formation
    const arrived = arrivedHeading !== null && dist < POLICE.ARRIVE_DISTANCE;
    const desiredHeading = arrived ? arrivedHeading : Math.atan2(-toX, -toZ);
    const diff = wrap(desiredHeading - unit.heading);
    const turnRate = inAir ? POLICE.AIR_TURN_RATE : POLICE.TURN_RATE;
    const prevHeading = unit.heading;
    unit.heading += clamp(diff, -turnRate * dt, turnRate * dt);
    unit.yawRate = wrap(unit.heading - prevHeading) / Math.max(dt, 1e-6);

    // Speed: a heat-dependent share of the player's top speed; rubber-band only when the player is slower
    const ratio = (inAir ? POLICE.AIR_SPEED_RATIO : POLICE.GROUND_SPEED_RATIO)[heat] || 0.9;
    const playerTop = inAir ? stats.maxFlightSpeed : stats.maxDriveSpeed;
    let maxSpeed = playerTop * ratio * unit.speedJitter;
    if (seen && dist > POLICE.CATCHUP_DISTANCE && playerSpeed < maxSpeed) {
      maxSpeed = Math.max(maxSpeed, Math.min(playerSpeed * POLICE.CATCHUP_SPEED_MULT, maxSpeed * 1.25));
    }
    if (!seen) maxSpeed *= POLICE.SEARCH_SPEED_FACTOR;
    const closingSpeed = seen ? playerSpeed + dist * POLICE.CLOSING_GAIN : maxSpeed;
    const cornering = Math.max(POLICE.MIN_CORNER_SPEED_FACTOR, Math.cos(diff));
    const targetSpeed = Math.min(maxSpeed, closingSpeed) * cornering;
    const accelStep = POLICE.ACCELERATION * dt;
    unit.currentSpeed += clamp(targetSpeed - unit.currentSpeed, -accelStep * 1.5, accelStep);

    pos.x += -Math.sin(unit.heading) * unit.currentSpeed * dt;
    pos.z += -Math.cos(unit.heading) * unit.currentSpeed * dt;
    if (arrived) {
      const settle = smoothing(POLICE.SETTLE_RATE, dt);
      pos.x += (targetX - pos.x) * settle;
      pos.z += (targetZ - pos.z) * settle;
    }

    // Vertical: ride the road, or fly at the target's altitude with a capped climb rate
    const surface = this.city.getSurfaceAt(pos.x, pos.z, pos.y);
    if (!inAir) {
      const groundY = (surface.isRooftop ? 0 : surface.height) + POLICE.RIDE_HEIGHT;
      pos.y += (groundY - pos.y) * smoothing(8, dt);
      unit.verticalSpeed = 0;
    } else {
      const landing = unit.mode === 'landing';
      // While flying keep a safety gap above whatever is below; while landing aim for road level itself
      const floor = landing ? targetY : surface.height + POLICE.AIR_MIN_CLEARANCE;
      const desiredVy = clamp((Math.max(targetY, floor) - pos.y) * POLICE.AIR_VERTICAL_GAIN, -POLICE.AIR_DESCENT_RATE, POLICE.AIR_CLIMB_RATE);
      unit.verticalSpeed += (desiredVy - unit.verticalSpeed) * smoothing(4, dt);
      pos.y = Math.min(PHYSICS.FLIGHT_CEILING, pos.y + unit.verticalSpeed * dt);
      const lowest = surface.height + POLICE.RIDE_HEIGHT;
      if (pos.y < lowest) pos.y = lowest;
      if (landing && pos.y - targetY <= POLICE.LANDING_SNAP_HEIGHT) {
        pos.y = Math.max(pos.y, targetY);
        unit.mode = 'ground';
        unit.verticalSpeed = 0;
      }
    }

    // Buildings stop cruisers (and low-flying units) instead of letting them ghost through
    this.city.resolveHorizontalCollision(pos, POLICE.UNIT_RADIUS);
  }

  /** Never ram straight into the player. */
  keepStandoff(unit) {
    const pos = unit.mesh.position;
    const p = this.player.position;
    const dx = pos.x - p.x;
    const dz = pos.z - p.z;
    const horiz = Math.hypot(dx, dz) || 0.001;
    if (Math.abs(pos.y - p.y) < POLICE.STANDOFF_VERTICAL && horiz < POLICE.MIN_PLAYER_DISTANCE) {
      pos.x = p.x + (dx / horiz) * POLICE.MIN_PLAYER_DISTANCE;
      pos.z = p.z + (dz / horiz) * POLICE.MIN_PLAYER_DISTANCE;
    }
  }

  /** Keep units from overlapping each other. */
  separate(unit, index) {
    const pos = unit.mesh.position;
    for (let j = 0; j < index; j++) {
      const other = this.units[j].mesh.position;
      const sx = pos.x - other.x;
      const sz = pos.z - other.z;
      const sep = Math.hypot(sx, sz) || 0.001;
      if (sep < POLICE.UNIT_SEPARATION && Math.abs(pos.y - other.y) < POLICE.STANDOFF_VERTICAL) {
        const push = (POLICE.UNIT_SEPARATION - sep) * 0.5;
        pos.x += (sx / sep) * push;
        pos.z += (sz / sep) * push;
        other.x -= (sx / sep) * push;
        other.z -= (sz / sep) * push;
      }
    }
  }

  /** Wings, thrusters, wheel spin, bank and pitch so units visibly drive and fly. */
  animateUnit(unit, dt) {
    const target = unit.mode === 'ground' ? 0 : 1;
    unit.wingDeploy += (target - unit.wingDeploy) * smoothing(POLICE.WING_DEPLOY_RATE, dt);
    unit.model.setFlight(unit.wingDeploy);

    const inAir = unit.mode !== 'ground';
    const pitchTarget = inAir ? clamp(Math.atan2(unit.verticalSpeed, Math.max(10, unit.currentSpeed)), -0.6, 0.6) : 0;
    const rollTarget = inAir
      ? clamp(unit.yawRate / POLICE.AIR_TURN_RATE, -1, 1) * POLICE.AIR_BANK_ANGLE
      : clamp(-unit.yawRate * unit.currentSpeed * 0.004, -0.08, 0.08);
    unit.pitch += (pitchTarget - unit.pitch) * smoothing(6, dt);
    unit.roll += (rollTarget - unit.roll) * smoothing(6, dt);
    unit.mesh.rotation.y = unit.heading;
    unit.mesh.rotation.x = unit.pitch;
    unit.mesh.rotation.z = unit.roll;

    if (!inAir) {
      for (const wheel of unit.model.wheels) wheel.rotation.x -= unit.currentSpeed * dt * 1.8;
    }
  }

  completeEscape() {
    const heat = gameState.pursuit.heat || 1;
    gameState.pursuit.active = false;
    gameState.pursuit.heat = 0;
    gameState.pursuit.escapeProgress = 0;
    gameState.pursuit.captureProgress = 0;
    gameState.pursuit.inSight = false;
    gameState.pursuit.timeActive = 0;
    gameState.escapes += 1;
    gameState.integrity = gameState.maxIntegrity;

    if (gameState.activeChallenge && gameState.activeChallenge.targetType === 'escapes') {
      gameState.activeChallenge.progress += 1;
    }

    this.clearUnits();
    this.graceTimer = 18; // Give breathing room after an escape

    gameState.registerStunt('escaped', 'ESCAPED!', STUNTS.POINTS.ESCAPED * heat);
    eventBus.emit(Events.PURSUIT_ESCAPED, { heat });
  }
}
