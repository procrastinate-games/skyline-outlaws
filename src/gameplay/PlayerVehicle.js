import * as THREE from 'three';
import { GAME, PHYSICS } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

export class PlayerVehicle {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;

    this.mesh = new THREE.Group();
    this.scene.add(this.mesh);

    this.position = this.mesh.position;
    this.velocity = new THREE.Vector3();

    this.wheels = [];
    this.frontWheelPivots = [];
    this.leftWing = null;
    this.rightWing = null;
    this.thrusterFlames = [];
    this.bodyMaterial = null;
    this.accentMaterial = null;

    this.buildVehicleMesh();
    this.reset();
  }

  buildVehicleMesh() {
    const stats = gameState.getVehicleStats();

    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: stats.primaryColor,
      metalness: 0.65,
      roughness: 0.25,
    });

    const darkChassisMat = new THREE.MeshStandardMaterial({
      color: 0x111522,
      metalness: 0.5,
      roughness: 0.45,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x091326,
      metalness: 0.9,
      roughness: 0.1,
    });

    this.accentMaterial = new THREE.MeshBasicMaterial({
      color: stats.thrusterColor,
    });

    // 1. Lower carbon splitter & aerodynamic floor pan
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.22, 4.7), darkChassisMat);
    splitter.position.set(0, 0.28, 0);
    this.mesh.add(splitter);

    // 2. Sculpted main sports body
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.48, 4.4), this.bodyMaterial);
    mainBody.position.set(0, 0.56, 0.05);
    this.mesh.add(mainBody);

    // Sleek sloped nose hood
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.34, 1.35), this.bodyMaterial);
    nose.position.set(0, 0.52, -1.75);
    nose.rotation.x = 0.16;
    this.mesh.add(nose);

    // Side aero intakes / fenders
    const leftPod = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 2.8), this.bodyMaterial);
    leftPod.position.set(-1.05, 0.55, 0.1);
    this.mesh.add(leftPod);

    const rightPod = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 2.8), this.bodyMaterial);
    rightPod.position.set(1.05, 0.55, 0.1);
    this.mesh.add(rightPod);

    // 3. Teardrop cockpit canopy
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.46, 2.05), glassMat);
    cabin.position.set(0, 0.95, -0.05);
    this.mesh.add(cabin);

    // Rear engine louversspine
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 1.4), darkChassisMat);
    spine.position.set(0, 1.02, 1.15);
    this.mesh.add(spine);

    // 4. Aggressive rear GT wing spoiler
    const spoilerBlade = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.1, 0.42), this.bodyMaterial);
    spoilerBlade.position.set(0, 1.12, 1.98);
    this.mesh.add(spoilerBlade);

    const leftStrut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.3), darkChassisMat);
    leftStrut.position.set(-0.7, 0.94, 1.95);
    this.mesh.add(leftStrut);

    const rightStrut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.3), darkChassisMat);
    rightStrut.position.set(0.7, 0.94, 1.95);
    this.mesh.add(rightStrut);

    // 5. Expressive LED headlights & full-width cyber tail light bar
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xe0fbfc });
    const leftHeadlight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.12), headlightMat);
    leftHeadlight.position.set(-0.68, 0.58, -2.35);
    this.mesh.add(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.12), headlightMat);
    rightHeadlight.position.set(0.68, 0.58, -2.35);
    this.mesh.add(rightHeadlight);

    const tailBarMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.14, 0.1), tailBarMat);
    tailBar.position.set(0, 0.68, 2.26);
    this.mesh.add(tailBar);

    // Neon side trim strips
    const leftTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 3.6), this.accentMaterial);
    leftTrim.position.set(-1.17, 0.44, 0);
    this.mesh.add(leftTrim);

    const rightTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 3.6), this.accentMaterial);
    rightTrim.position.set(1.17, 0.44, 0);
    this.mesh.add(rightTrim);

    // 6. Retractable Flight Aero-Wings (deploy outward in Flight Mode)
    this.leftWing = new THREE.Group();
    const lwMesh = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 1.35), this.bodyMaterial);
    lwMesh.position.set(-1.1, 0, 0);
    const lwTip = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.12, 0.16), this.accentMaterial);
    lwTip.position.set(-1.1, 0, -0.62);
    this.leftWing.add(lwMesh, lwTip);
    this.leftWing.position.set(-0.2, 0.58, 0.25);
    this.mesh.add(this.leftWing);

    this.rightWing = new THREE.Group();
    const rwMesh = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 1.35), this.bodyMaterial);
    rwMesh.position.set(1.1, 0, 0);
    const rwTip = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.12, 0.16), this.accentMaterial);
    rwTip.position.set(1.1, 0, -0.62);
    this.rightWing.add(rwMesh, rwTip);
    this.rightWing.position.set(0.2, 0.58, 0.25);
    this.mesh.add(this.rightWing);

    // 7. Twin Rear Jet Thruster Nozzles & Animated Flame Cones
    const nozzleGeo = new THREE.CylinderGeometry(0.24, 0.3, 0.45, 12);
    nozzleGeo.rotateX(Math.PI / 2);
    const flameGeo = new THREE.ConeGeometry(0.22, 1.5, 12);
    flameGeo.rotateX(Math.PI / 2);

    for (const xOffset of [-0.52, 0.52]) {
      const nozzle = new THREE.Mesh(nozzleGeo, darkChassisMat);
      nozzle.position.set(xOffset, 0.48, 2.28);
      this.mesh.add(nozzle);

      const flame = new THREE.Mesh(flameGeo, this.accentMaterial);
      flame.position.set(xOffset, 0.48, 3.05);
      flame.scale.set(0.5, 0.5, 0.2);
      this.mesh.add(flame);
      this.thrusterFlames.push(flame);
    }

    // 8. 4 Rotating Wheels with glowing rims
    const tireGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.32, 16);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x15171e, roughness: 0.8 });
    const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.34, 10);
    rimGeo.rotateZ(Math.PI / 2);

    const wheelCoords = [
      { x: -1.12, y: 0.4, z: -1.38, front: true },
      { x: 1.12, y: 0.4, z: -1.38, front: true },
      { x: -1.12, y: 0.4, z: 1.38, front: false },
      { x: 1.12, y: 0.4, z: 1.38, front: false },
    ];

    for (const wc of wheelCoords) {
      const pivot = new THREE.Group();
      pivot.position.set(wc.x, wc.y, wc.z);

      const wheelGroup = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, tireMat);
      const rim = new THREE.Mesh(rimGeo, this.accentMaterial);
      wheelGroup.add(tire, rim);

      pivot.add(wheelGroup);
      this.mesh.add(pivot);
      this.wheels.push(wheelGroup);
      if (wc.front) this.frontWheelPivots.push(pivot);
    }
  }

  refreshAppearance() {
    const stats = gameState.getVehicleStats();
    if (this.bodyMaterial) this.bodyMaterial.color.setHex(stats.primaryColor);
    if (this.accentMaterial) this.accentMaterial.color.setHex(stats.thrusterColor);
  }

  reset() {
    this.position.set(PHYSICS.START_X, PHYSICS.START_Y, PHYSICS.START_Z);
    this.velocity.set(0, 0, 0);
    this.heading = 0; // 0 = facing -Z (north along Neon Boulevard)
    this.speed = 0;
    this.verticalVelocity = 0;
    this.pitchAngle = 0;
    this.rollAngle = 0;
    this.driftSlipAngle = 0;

    this.mode = 'DRIVE';
    this.wingDeploy = 0;
    this.isGrounded = true;
    this.isDrifting = false;
    this.isBoosting = false;
    this.currentSurface = 'ground';
    this.collisionCooldown = 0;
    this.justCollidedTimer = 0;
    this.closestBuildingDist = Infinity;

    this.refreshAppearance();
    this.syncMeshTransform();
  }

  toggleMode(targetMode = null) {
    const nextMode = targetMode || (this.mode === 'DRIVE' ? 'FLIGHT' : 'DRIVE');
    if (nextMode === this.mode) return;

    this.mode = nextMode;
    gameState.mode = this.mode;

    if (this.mode === 'FLIGHT') {
      this.isGrounded = false;
      this.isDrifting = false;
      this.speed = Math.max(this.speed, PHYSICS.FLIGHT_MIN_CRUISE_SPEED);
      this.verticalVelocity = Math.max(this.verticalVelocity, 7.5);
      this.pitchAngle = Math.max(this.pitchAngle, 0.22);
    }

    eventBus.emit(Events.MODE_CHANGED, { mode: this.mode });
  }

  update(dt, input) {
    const stats = gameState.getVehicleStats();

    if (this.collisionCooldown > 0) {
      this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
    }
    if (this.justCollidedTimer > 0) {
      this.justCollidedTimer = Math.max(0, this.justCollidedTimer - dt);
    }

    if (input.flightToggleJustPressed) {
      this.toggleMode();
    }

    // Handle Boost energy
    const wantsBoost = Boolean(input.boost) && gameState.boost > 2;
    this.isBoosting = wantsBoost;
    if (this.isBoosting) {
      gameState.boost = Math.max(0, gameState.boost - PHYSICS.BOOST_DRAIN_RATE * dt);
    } else {
      gameState.boost = Math.min(gameState.maxBoost, gameState.boost + PHYSICS.BOOST_RECHARGE_RATE * dt);
    }

    const boostMult = this.isBoosting ? stats.boostMultiplier : 1.0;

    if (this.mode === 'DRIVE') {
      this.updateDriveMode(dt, input, stats, boostMult);
    } else {
      this.updateFlightMode(dt, input, stats, boostMult);
    }

    // Animate wing deployment (0 in Drive, 1 in Flight)
    const targetWing = this.mode === 'FLIGHT' ? 1 : 0;
    this.wingDeploy += (targetWing - this.wingDeploy) * Math.min(1, PHYSICS.WING_DEPLOY_SPEED * dt);

    if (this.leftWing && this.rightWing) {
      this.leftWing.scale.x = 0.15 + 0.85 * this.wingDeploy;
      this.rightWing.scale.x = 0.15 + 0.85 * this.wingDeploy;
    }

    // Spin wheels & steer front wheels
    const wheelSpin = this.speed * dt * 1.8;
    for (const w of this.wheels) {
      w.rotation.x -= wheelSpin;
    }
    const steerAngle = -(input.steer || 0) * 0.42;
    for (const pivot of this.frontWheelPivots) {
      pivot.rotation.y = steerAngle;
    }

    // Scale jet thruster flames dynamically
    const flameIntensity =
      this.mode === 'FLIGHT'
        ? this.isBoosting
          ? 1.65
          : 1.1
        : this.isBoosting
          ? 1.35
          : Math.max(0.15, (this.speed / stats.maxDriveSpeed) * 0.55);

    for (const flame of this.thrusterFlames) {
      flame.scale.set(
        0.55 + flameIntensity * 0.35,
        0.55 + flameIntensity * 0.35,
        0.25 + flameIntensity * 1.15
      );
    }

    // Keep inside city world bounds smoothly
    const bound = GAME.WORLD_BOUNDS;
    if (Math.abs(this.position.x) > bound) {
      this.position.x = Math.sign(this.position.x) * bound;
      this.heading = -this.heading;
    }
    if (Math.abs(this.position.z) > bound) {
      this.position.z = Math.sign(this.position.z) * bound;
      this.heading = Math.PI - this.heading;
    }

    this.syncMeshTransform();

    // Update GameState telemetry
    gameState.mode = this.mode;
    gameState.speedKmh = Math.round(Math.abs(this.speed) * 3.2);
    gameState.altitude = Math.max(0, Math.round(this.position.y));
  }

  updateDriveMode(dt, input, stats, boostMult) {
    const throttle = input.throttle || 0;
    const brake = input.brake || 0;
    const steer = input.steer || 0;
    const maxSpeed = stats.maxDriveSpeed * boostMult;

    if (throttle > 0) {
      this.speed += stats.acceleration * boostMult * throttle * dt;
    } else if (brake > 0) {
      if (this.speed > 1) {
        this.speed = Math.max(0, this.speed - stats.brakeForce * brake * dt);
      } else {
        this.speed = Math.max(-24, this.speed - stats.acceleration * 0.65 * brake * dt);
      }
    } else {
      const drag = this.isGrounded ? PHYSICS.GROUND_FRICTION : PHYSICS.AIR_DRAG;
      this.speed *= Math.max(0, 1 - drag * dt);
      if (Math.abs(this.speed) < 0.2) this.speed = 0;
    }

    if (this.isBoosting && this.speed < maxSpeed * 0.65) {
      this.speed += stats.acceleration * 0.9 * dt;
    }
    this.speed = Math.min(maxSpeed, Math.max(-24, this.speed));

    // Drift & steering
    const canDrift = this.isGrounded && Boolean(input.drift) && Math.abs(this.speed) > 16 && Math.abs(steer) > 0.1;
    this.isDrifting = canDrift;

    const turnFactor = Math.min(1, Math.abs(this.speed) / 14);
    const driftMult = this.isDrifting ? stats.driftTurnMultiplier : 1.0;
    const reverseSign = this.speed >= 0 ? 1 : -1;
    this.heading += steer * stats.turnRate * driftMult * turnFactor * reverseSign * dt;

    // Visual powerslide slip angle
    const targetSlip = this.isDrifting ? steer * 0.34 : 0;
    this.driftSlipAngle += (targetSlip - this.driftSlipAngle) * Math.min(1, 8 * dt);

    // Forward movement vector (heading 0 faces -Z)
    const forwardX = -Math.sin(this.heading);
    const forwardZ = -Math.cos(this.heading);

    this.velocity.x = forwardX * this.speed;
    this.velocity.z = forwardZ * this.speed;

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Query surface height (ground, ramp, overpass, rooftop)
    const surface = this.city.getSurfaceAt(this.position.x, this.position.z, this.position.y);
    const targetY = surface.height + 0.55;

    const wasGrounded = this.isGrounded;

    if (this.position.y <= targetY + 0.25 && this.verticalVelocity <= 4.0) {
      this.position.y = targetY;
      this.isGrounded = true;
      this.currentSurface = surface.surfaceType;

      if (surface.isRamp && this.speed > 8) {
        // Riding up a ramp imparts upward launch velocity!
        this.verticalVelocity = this.speed * surface.rampSlope * 1.18;
        this.pitchAngle = Math.atan(surface.rampSlope);
      } else {
        if (!wasGrounded && this.verticalVelocity < -6) {
          eventBus.emit(Events.PLAYER_LANDED, {
            surfaceType: surface.surfaceType,
            isRooftop: surface.isRooftop,
            impactSpeed: Math.abs(this.verticalVelocity),
          });
        }
        this.verticalVelocity = 0;
        this.pitchAngle += (0 - this.pitchAngle) * Math.min(1, 10 * dt);
      }
    } else {
      // Airborne jump!
      if (wasGrounded && this.verticalVelocity > 3) {
        eventBus.emit(Events.PLAYER_JUMP, { speed: this.speed });
      }
      this.isGrounded = false;
      this.verticalVelocity -= PHYSICS.GRAVITY * dt;
      this.position.y += this.verticalVelocity * dt;

      if (this.position.y <= targetY) {
        this.position.y = targetY;
        this.isGrounded = true;
        this.currentSurface = surface.surfaceType;
        eventBus.emit(Events.PLAYER_LANDED, {
          surfaceType: surface.surfaceType,
          isRooftop: surface.isRooftop,
          impactSpeed: Math.abs(this.verticalVelocity),
        });
        this.verticalVelocity = 0;
      } else {
        this.pitchAngle = Math.max(-0.45, Math.min(0.45, this.verticalVelocity * 0.02));
      }
    }

    // Subtle body roll into turns
    const targetRoll = steer * Math.min(1, Math.abs(this.speed) / 40) * (this.isDrifting ? 0.18 : 0.08);
    this.rollAngle += (targetRoll - this.rollAngle) * Math.min(1, 10 * dt);

    // Building wall collision
    const col = this.city.resolveHorizontalCollision(this.position, 1.85);
    this.closestBuildingDist = col.minDistance;
    if (col.collided) {
      const impact = Math.abs(this.speed);
      this.speed *= 0.35;
      this.justCollidedTimer = 0.85;
      if (this.collisionCooldown <= 0 && impact > 10) {
        this.collisionCooldown = 0.55;
        eventBus.emit(Events.PLAYER_COLLISION, { impactSpeed: impact });
      }
    }
  }

  updateFlightMode(dt, input, stats, boostMult) {
    this.isGrounded = false;
    this.isDrifting = false;
    this.driftSlipAngle *= Math.max(0, 1 - 8 * dt);

    const throttle = input.throttle || 0;
    const brake = input.brake || 0;
    const steer = input.steer || 0;
    const pitchInput = input.pitch || 0;

    const maxFlightSpeed = stats.maxFlightSpeed * boostMult;
    const targetCruise = throttle > 0
      ? maxFlightSpeed
      : brake > 0
        ? PHYSICS.FLIGHT_MIN_CRUISE_SPEED
        : stats.maxFlightSpeed * 0.72 * boostMult;

    this.speed += (targetCruise - this.speed) * Math.min(1, 3.2 * dt);

    // Smooth bank & yaw turning
    this.heading += steer * stats.flightBankRate * dt;

    // Pitch control + gentle auto-level when pitchInput is 0
    if (Math.abs(pitchInput) > 0.05) {
      const targetPitch = pitchInput * PHYSICS.FLIGHT_MAX_PITCH;
      this.pitchAngle += (targetPitch - this.pitchAngle) * Math.min(1, 5.5 * dt);
    } else {
      this.pitchAngle += (0 - this.pitchAngle) * Math.min(1, PHYSICS.FLIGHT_AUTO_LEVEL_RATE * dt);
    }

    // Bank roll angle with auto-leveling
    const targetRoll = -steer * PHYSICS.FLIGHT_MAX_ROLL;
    this.rollAngle += (targetRoll - this.rollAngle) * Math.min(1, 6.5 * dt);

    // 3D velocity vector from heading & pitch
    const cosPitch = Math.cos(this.pitchAngle);
    const forwardX = -Math.sin(this.heading) * cosPitch;
    const forwardZ = -Math.cos(this.heading) * cosPitch;
    this.verticalVelocity = Math.sin(this.pitchAngle) * stats.flightClimbRate * (this.isBoosting ? 1.3 : 1.0);

    this.velocity.set(forwardX * this.speed, this.verticalVelocity, forwardZ * this.speed);
    this.position.addScaledVector(this.velocity, dt);

    // Clamp max ceiling
    if (this.position.y > 165) {
      this.position.y = 165;
      this.pitchAngle = Math.min(0, this.pitchAngle);
    }

    // Check ground/rooftop contact in Flight Mode
    const surface = this.city.getSurfaceAt(this.position.x, this.position.z, this.position.y);
    const minFlightY = surface.height + 0.65;
    if (this.position.y <= minFlightY) {
      this.position.y = minFlightY;
      if (this.pitchAngle < -0.15) {
        // Automatic smooth touchdown transition if diving onto a road or rooftop pad
        this.toggleMode('DRIVE');
        this.isGrounded = true;
        this.currentSurface = surface.surfaceType;
        eventBus.emit(Events.PLAYER_LANDED, {
          surfaceType: surface.surfaceType,
          isRooftop: surface.isRooftop,
          impactSpeed: Math.abs(this.verticalVelocity),
        });
      } else {
        this.pitchAngle = Math.max(0, this.pitchAngle);
      }
    }

    // Horizontal building collision in flight
    const col = this.city.resolveHorizontalCollision(this.position, 1.9);
    this.closestBuildingDist = col.minDistance;
    if (col.collided) {
      const impact = Math.abs(this.speed);
      this.speed = Math.max(12, this.speed * 0.45);
      this.justCollidedTimer = 0.85;
      if (col.hitBuilding) {
        // Gently deflect heading away from the building wall so player glances off instead of grinding
        const awayX = this.position.x - col.hitBuilding.x;
        const awayZ = this.position.z - col.hitBuilding.z;
        const awayHeading = Math.atan2(-awayX, -awayZ);
        let diff = awayHeading - this.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.heading += diff * 0.45;
      }
      if (this.collisionCooldown <= 0 && impact > 14) {
        this.collisionCooldown = 0.55;
        eventBus.emit(Events.PLAYER_COLLISION, { impactSpeed: impact });
      }
    }
  }

  syncMeshTransform() {
    this.mesh.rotation.order = 'YXZ';
    this.mesh.rotation.y = this.heading - this.driftSlipAngle;
    this.mesh.rotation.x = this.pitchAngle;
    this.mesh.rotation.z = this.rollAngle;
  }
}
