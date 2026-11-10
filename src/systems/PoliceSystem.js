import * as THREE from 'three';
import { COLORS, POLICE, STUNTS } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

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
  }

  reset() {
    this.clearUnits();
    this.ramCooldown = 0;
    this.graceTimer = 8;
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

  buildCruiserMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x101420, metalness: 0.6, roughness: 0.3 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.4 });
    const redMat = new THREE.MeshBasicMaterial({ color: COLORS.POLICE_RED });
    const blueMat = new THREE.MeshBasicMaterial({ color: COLORS.POLICE_BLUE });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.55, 4.5), bodyMat);
    chassis.position.set(0, 0.55, 0);
    group.add(chassis);

    const doors = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.48, 1.9), whiteMat);
    doors.position.set(0, 0.56, 0);
    group.add(doors);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.45, 1.9), bodyMat);
    cabin.position.set(0, 0.98, 0.05);
    group.add(cabin);

    const leftStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.28), redMat);
    leftStrobe.position.set(-0.36, 1.26, 0);
    group.add(leftStrobe);

    const rightStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.28), blueMat);
    rightStrobe.position.set(0.36, 1.26, 0);
    group.add(rightStrobe);

    return { group, leftStrobe, rightStrobe };
  }

  buildDroneMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1b2234, metalness: 0.7, roughness: 0.2 });
    const redMat = new THREE.MeshBasicMaterial({ color: COLORS.POLICE_RED });
    const blueMat = new THREE.MeshBasicMaterial({ color: COLORS.POLICE_BLUE });

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 12), bodyMat);
    group.add(core);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.12, 8, 20), bodyMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const leftStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), redMat);
    leftStrobe.position.set(-0.9, 0.3, 0);
    group.add(leftStrobe);

    const rightStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), blueMat);
    rightStrobe.position.set(0.9, 0.3, 0);
    group.add(rightStrobe);

    return { group, leftStrobe, rightStrobe };
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

    this.ensureUnitCount();

    if (!wasActive) {
      eventBus.emit(Events.PURSUIT_STARTED, { heat: gameState.pursuit.heat });
    }
  }

  ensureUnitCount() {
    const heat = gameState.pursuit.heat;
    const targetCount = POLICE.MAX_UNITS_PER_HEAT[heat] || 2;
    const slotAngles = [-0.48, 0.48, -0.95, 0.95];

    while (this.units.length < targetCount) {
      const idx = this.units.length;
      const isDrone = heat >= 2 && idx === targetCount - 1;
      const built = isDrone ? this.buildDroneMesh() : this.buildCruiserMesh();

      // Spawn behind/around the player at a safe pursuit distance
      const heading = this.player.heading || 0;
      const slotOffset = slotAngles[idx % slotAngles.length];
      const spawnAngle = heading + slotOffset;
      const dist = 30 + idx * 7;
      const sx = this.player.position.x + Math.sin(spawnAngle) * dist;
      const sz = this.player.position.z + Math.cos(spawnAngle) * dist;
      const sy = isDrone ? Math.max(16, this.player.position.y + 8) : 0.55;

      built.group.position.set(sx, sy, sz);
      this.root.add(built.group);

      this.units.push({
        type: isDrone ? 'drone' : 'cruiser',
        mesh: built.group,
        leftStrobe: built.leftStrobe,
        rightStrobe: built.rightStrobe,
        speed: isDrone ? POLICE.DRONE_BASE_SPEED : POLICE.CRUISER_BASE_SPEED + idx * 2.5,
        slotAngle: slotOffset,
        standoff: POLICE.STANDOFF_DISTANCE + (idx % 2) * 2.5,
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

  update(dt) {
    if (!gameState.started || gameState.paused || gameState.busted) return;

    this.strobeClock += dt * 10;
    if (this.ramCooldown > 0) {
      this.ramCooldown = Math.max(0, this.ramCooldown - dt);
    }

    if (!gameState.pursuit.active) {
      if (this.graceTimer > 0) {
        this.graceTimer = Math.max(0, this.graceTimer - dt);
      } else if (gameState.score >= POLICE.TRIGGER_SCORE_THRESHOLD && this.player.speed > 28) {
        const autoHeat = gameState.score > 4500 ? 3 : gameState.score > 1800 ? 2 : 1;
        this.startPursuit(autoHeat);
      }
      return;
    }

    // Active pursuit logic
    gameState.pursuit.timeActive += dt;
    if (gameState.pursuit.timeActive > 28 && gameState.pursuit.heat < 2) {
      gameState.pursuit.heat = 2;
      this.ensureUnitCount();
    } else if (gameState.pursuit.timeActive > 60 && gameState.pursuit.heat < 3) {
      gameState.pursuit.heat = 3;
      this.ensureUnitCount();
    }

    let minUnitDist = Infinity;
    const strobeToggle = Math.floor(this.strobeClock) % 2 === 0;
    const playerHeading = this.player.heading || 0;

    for (let i = 0; i < this.units.length; i++) {
      const unit = this.units[i];
      unit.leftStrobe.visible = strobeToggle;
      unit.rightStrobe.visible = !strobeToggle;

      // Tactical formation target behind/flanking the player at standoff distance
      const formationAngle = playerHeading + (unit.slotAngle || 0);
      const standoffDist = unit.standoff || POLICE.STANDOFF_DISTANCE;
      const targetX = this.player.position.x + Math.sin(formationAngle) * standoffDist;
      const targetZ = this.player.position.z + Math.cos(formationAngle) * standoffDist;

      const toTargetX = targetX - unit.mesh.position.x;
      const toTargetZ = targetZ - unit.mesh.position.z;
      const distToTarget = Math.hypot(toTargetX, toTargetZ);

      const heatSpeedBoost = 1 + (gameState.pursuit.heat - 1) * 0.08;
      const maxUnitSpeed = unit.speed * heatSpeedBoost;

      if (distToTarget > 0.6) {
        const dirX = toTargetX / distToTarget;
        const dirZ = toTargetZ / distToTarget;
        // Smoothly throttle down as unit reaches its standoff formation pocket
        const approachFactor = Math.min(1, distToTarget / 10);
        const desiredSpeed = Math.max(
          Math.min(this.player.speed * 0.95, maxUnitSpeed),
          maxUnitSpeed * approachFactor
        );
        const step = Math.min(distToTarget, desiredSpeed * dt);
        unit.mesh.position.x += dirX * step;
        unit.mesh.position.z += dirZ * step;
      }

      // Enforce minimum standoff distance from player so police never slam into the player
      const dxFromPlayer = unit.mesh.position.x - this.player.position.x;
      const dzFromPlayer = unit.mesh.position.z - this.player.position.z;
      const horizDistFromPlayer = Math.hypot(dxFromPlayer, dzFromPlayer) || 0.001;
      const minStandOff = POLICE.MIN_PLAYER_DISTANCE;

      if (horizDistFromPlayer < minStandOff) {
        const pushOutX = dxFromPlayer / horizDistFromPlayer;
        const pushOutZ = dzFromPlayer / horizDistFromPlayer;
        unit.mesh.position.x = this.player.position.x + pushOutX * minStandOff;
        unit.mesh.position.z = this.player.position.z + pushOutZ * minStandOff;
      }

      // Enforce separation between police units so they don't overlap each other
      for (let j = 0; j < i; j++) {
        const other = this.units[j];
        const sepX = unit.mesh.position.x - other.mesh.position.x;
        const sepZ = unit.mesh.position.z - other.mesh.position.z;
        const sepDist = Math.hypot(sepX, sepZ) || 0.001;
        if (sepDist < POLICE.UNIT_SEPARATION) {
          const push = (POLICE.UNIT_SEPARATION - sepDist) * 0.5;
          const nx = sepX / sepDist;
          const nz = sepZ / sepDist;
          unit.mesh.position.x += nx * push;
          unit.mesh.position.z += nz * push;
          other.mesh.position.x -= nx * push;
          other.mesh.position.z -= nz * push;
        }
      }

      if (unit.type === 'drone') {
        const targetY = Math.max(9, this.player.position.y + 4.5);
        unit.mesh.position.y += (targetY - unit.mesh.position.y) * Math.min(1, 3.2 * dt);
      } else {
        const surf = this.city.getSurfaceAt(unit.mesh.position.x, unit.mesh.position.z, unit.mesh.position.y);
        const targetY = surf.isRooftop ? 0.55 : surf.height + 0.55;
        unit.mesh.position.y += (targetY - unit.mesh.position.y) * Math.min(1, 8.0 * dt);
        this.city.resolveHorizontalCollision(unit.mesh.position, 1.8);
      }

      // Face toward the player cleanly
      const lookDx = this.player.position.x - unit.mesh.position.x;
      const lookDz = this.player.position.z - unit.mesh.position.z;
      const lookDy = this.player.position.y - unit.mesh.position.y;
      const fullDist = Math.hypot(lookDx, lookDy, lookDz);

      if (fullDist < minUnitDist) {
        minUnitDist = fullDist;
      }

      unit.mesh.rotation.y = Math.atan2(-lookDx, -lookDz);
    }

    // Determine if player is in sight of police or escaping
    const inSight = minUnitDist <= POLICE.DETECTION_RADIUS;
    const inCaptureZone = minUnitDist <= POLICE.CAPTURE_RADIUS;
    gameState.pursuit.inSight = inSight;

    // Update Capture / Arrest Progress Bar
    const isOutrunning =
      this.player.isBoosting ||
      this.player.speed >= 52 ||
      (this.player.mode === 'FLIGHT' && this.player.position.y > 14 && this.player.speed >= 32);

    if (inCaptureZone && !isOutrunning) {
      // Fill faster when stopped/slow, slower when cruising at moderate speed
      const speedRatio = Math.min(1, this.player.speed / 48);
      const fillMultiplier = 1.0 - speedRatio * 0.58; // 1.0x at rest -> 0.42x at moderate speed
      const heatFactor = 1 + (gameState.pursuit.heat - 1) * 0.12;
      const fillRate = (fillMultiplier * heatFactor) / POLICE.CAPTURE_DURATION;

      gameState.pursuit.captureProgress = Math.min(
        1,
        gameState.pursuit.captureProgress + fillRate * dt
      );
    } else {
      // Drain arrest meter when outrunning police, boosting, flying high, or outside capture zone
      gameState.pursuit.captureProgress = Math.max(
        0,
        gameState.pursuit.captureProgress - POLICE.CAPTURE_DECAY_RATE * dt
      );
    }

    // Keep integrity mirrored to remaining arrest margin (100% -> 0% as captureProgress goes 0 -> 1)
    gameState.integrity = Math.max(
      0,
      Math.round((1 - gameState.pursuit.captureProgress) * gameState.maxIntegrity)
    );

    if (gameState.pursuit.captureProgress >= 1) {
      this.triggerBust();
      return;
    }

    if (!inSight) {
      gameState.pursuit.escapeProgress = Math.min(
        1,
        gameState.pursuit.escapeProgress + dt / POLICE.ESCAPE_DURATION
      );
      if (gameState.pursuit.escapeProgress >= 1) {
        this.completeEscape();
      }
    } else {
      gameState.pursuit.escapeProgress = Math.max(
        0,
        gameState.pursuit.escapeProgress - dt * 0.35
      );
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
