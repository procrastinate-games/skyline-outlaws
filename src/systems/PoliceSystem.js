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
    gameState.pursuit.inSight = true;

    this.ensureUnitCount();

    if (!wasActive) {
      eventBus.emit(Events.PURSUIT_STARTED, { heat: gameState.pursuit.heat });
    }
  }

  ensureUnitCount() {
    const heat = gameState.pursuit.heat;
    const targetCount = POLICE.MAX_UNITS_PER_HEAT[heat] || 2;

    while (this.units.length < targetCount) {
      const idx = this.units.length;
      const isDrone = heat >= 2 && idx === targetCount - 1;
      const built = isDrone ? this.buildDroneMesh() : this.buildCruiserMesh();

      // Spawn ahead/around the player outside immediate collision radius
      const angle = (idx / targetCount) * Math.PI * 2 + 0.4;
      const dist = 34 + idx * 8;
      const sx = this.player.position.x + Math.sin(angle) * dist;
      const sz = this.player.position.z + Math.cos(angle) * dist;
      const sy = isDrone ? Math.max(18, this.player.position.y + 8) : 0.55;

      built.group.position.set(sx, sy, sz);
      this.root.add(built.group);

      this.units.push({
        type: isDrone ? 'drone' : 'cruiser',
        mesh: built.group,
        leftStrobe: built.leftStrobe,
        rightStrobe: built.rightStrobe,
        speed: isDrone ? POLICE.DRONE_BASE_SPEED : POLICE.CRUISER_BASE_SPEED + idx * 3,
      });
    }
  }

  applyDamage(amount) {
    if (gameState.busted) return;
    gameState.integrity = Math.max(0, gameState.integrity - amount);
    if (gameState.integrity <= 0) {
      gameState.busted = true;
      gameState.pursuit.active = false;
      eventBus.emit(Events.PLAYER_BUSTED, {
        score: gameState.score,
        bestScore: gameState.bestScore,
      });
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

    for (const unit of this.units) {
      unit.leftStrobe.visible = strobeToggle;
      unit.rightStrobe.visible = !strobeToggle;

      const dx = this.player.position.x - unit.mesh.position.x;
      const dz = this.player.position.z - unit.mesh.position.z;
      const dy = this.player.position.y - unit.mesh.position.y;

      const horizDist = Math.hypot(dx, dz) || 0.001;
      const fullDist = Math.hypot(dx, dy, dz);

      if (fullDist < minUnitDist) {
        minUnitDist = fullDist;
      }

      const dirX = dx / horizDist;
      const dirZ = dz / horizDist;

      const heatSpeedBoost = 1 + (gameState.pursuit.heat - 1) * 0.08;
      const moveSpeed = unit.speed * heatSpeedBoost;

      unit.mesh.position.x += dirX * moveSpeed * dt;
      unit.mesh.position.z += dirZ * moveSpeed * dt;
      unit.mesh.rotation.y = Math.atan2(-dirX, -dirZ);

      if (unit.type === 'drone') {
        const targetY = Math.max(10, this.player.position.y + 2);
        unit.mesh.position.y += (targetY - unit.mesh.position.y) * Math.min(1, 3.0 * dt);
      } else {
        const surf = this.city.getSurfaceAt(unit.mesh.position.x, unit.mesh.position.z, unit.mesh.position.y);
        const targetY = surf.isRooftop ? 0.55 : surf.height + 0.55;
        unit.mesh.position.y += (targetY - unit.mesh.position.y) * Math.min(1, 8.0 * dt);
        this.city.resolveHorizontalCollision(unit.mesh.position, 1.8);
      }

      // Ram / Contact check
      if (fullDist < 3.7 && this.ramCooldown === 0) {
        this.ramCooldown = POLICE.RAM_COOLDOWN;
        this.applyDamage(POLICE.RAM_DAMAGE);
        eventBus.emit(Events.PLAYER_COLLISION, {
          impactSpeed: moveSpeed,
          fromPolice: true,
        });
      }
    }

    // Determine if player is in sight of police or escaping
    const inSight = minUnitDist <= POLICE.DETECTION_RADIUS;
    gameState.pursuit.inSight = inSight;

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
