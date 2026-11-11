import * as THREE from 'three';
import { COLORS, GAME, PHYSICS, VEHICLE_TUNING, VISUALS } from '../core/Constants.js';
import { tuning } from '../core/Tuning.js';
import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const approach = (current, target, maxDelta) =>
  current < target ? Math.min(target, current + maxDelta) : Math.max(target, current - maxDelta);
/** Frame-rate independent smoothing factor for an exponential response of the given rate (1/s). */
const expAlpha = (rate, h) => 1 - Math.exp(-rate * h);

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

    // Glossy clear-coated car paint (reflects the scene environment instead of reading as black metal)
    this.bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: stats.primaryColor,
      metalness: 0.3,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });

    const darkChassisMat = new THREE.MeshStandardMaterial({
      color: COLORS.CAR_CHASSIS,
      metalness: 0.4,
      roughness: 0.5,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: COLORS.CAR_GLASS,
      metalness: 0.1,
      roughness: 0.05,
      clearcoat: 1,
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

    const tailBarMat = new THREE.MeshBasicMaterial({ color: COLORS.TAIL_LIGHT });
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
    const tireMat = new THREE.MeshStandardMaterial({ color: COLORS.CAR_TIRE, roughness: 0.8 });
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

    // 9. Neon underglow pool on the road (additive soft ellipse tinted with the thruster color)
    const glowSize = 32;
    const glowData = new Uint8Array(glowSize * glowSize * 4);
    for (let y = 0; y < glowSize; y++) {
      for (let x = 0; x < glowSize; x++) {
        const dx = (x + 0.5) / glowSize - 0.5;
        const dy = (y + 0.5) / glowSize - 0.5;
        const a = Math.pow(Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 2), 1.6);
        const i = (y * glowSize + x) * 4;
        glowData.set([255, 255, 255, Math.round(a * 255)], i);
      }
    }
    const glowTex = new THREE.DataTexture(glowData, glowSize, glowSize, THREE.RGBAFormat);
    glowTex.needsUpdate = true;
    this.underglowMaterial = new THREE.MeshBasicMaterial({
      color: stats.thrusterColor,
      map: glowTex,
      transparent: true,
      opacity: VISUALS.UNDERGLOW_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const underglow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 6.4), this.underglowMaterial);
    underglow.rotation.x = -Math.PI / 2;
    underglow.position.y = -0.45;
    underglow.renderOrder = 2;
    this.mesh.add(underglow);
  }

  refreshAppearance() {
    const stats = gameState.getVehicleStats();
    if (this.bodyMaterial) this.bodyMaterial.color.setHex(stats.primaryColor);
    if (this.accentMaterial) this.accentMaterial.color.setHex(stats.thrusterColor);
    if (this.underglowMaterial) this.underglowMaterial.color.setHex(stats.thrusterColor);
  }

  reset() {
    this.position.set(PHYSICS.START_X, PHYSICS.START_Y, PHYSICS.START_Z);
    this.velocity.set(0, 0, 0);
    this.heading = 0; // 0 = facing -Z (north along Neon Boulevard)
    this.speed = 0; // Drive: signed forward speed · Flight: airspeed
    this.verticalVelocity = 0;
    this.pitchAngle = 0;
    this.rollAngle = 0;
    this.pitchVel = 0;
    this.rollVel = 0;
    this.driftSlipAngle = 0;

    // Game-feel state
    this.steerAxis = 0; // smoothed "steering wheel" position (-1..1)
    this.yawRate = 0; // angular velocity around Y (rad/s)
    this.slipAngle = 0; // angle between body heading and travel direction
    this.longAccel = 0; // smoothed longitudinal acceleration (m/s²) for camera & body pitch
    this.latAccel = 0; // lateral acceleration (m/s²) for body roll
    this.crashStun = 0; // seconds of reduced steering after a heavy hit
    this.isAirBraking = false;
    this.glanceRemaining = 0; // heading still to swing through after a glancing wall hit (applied smoothly)
    this.groundPitchTarget = 0;
    this.autoLevelTimer = 0;
    this.takeoffTimer = 0;

    this.mode = 'DRIVE';
    this.wingDeploy = 0;
    this.isGrounded = true;
    this.isDrifting = false;
    this.isBoosting = false;
    this.currentSurface = 'ground';
    this.collisionCooldown = 0;
    this.justCollidedTimer = 0;
    this.closestBuildingDist = Infinity;

    if (this.leftWing && this.rightWing) {
      this.leftWing.scale.x = 0.15;
      this.rightWing.scale.x = 0.15;
    }
    this.refreshAppearance();
    this.syncMeshTransform();
  }

  toggleMode(targetMode = null) {
    const nextMode = targetMode || (this.mode === 'DRIVE' ? 'FLIGHT' : 'DRIVE');
    if (nextMode === this.mode) return;

    this.mode = nextMode;
    gameState.mode = this.mode;

    if (this.mode === 'FLIGHT') {
      // Take-off keeps the car's full momentum and adds a lift kick instead of snapping speed or pitch
      const f = tuning.flight;
      this.isGrounded = false;
      this.isDrifting = false;
      const horizontal = Math.hypot(this.velocity.x, this.velocity.z);
      this.speed = Math.max(horizontal, PHYSICS.FLIGHT_MIN_CRUISE_SPEED);
      this.velocity.y = Math.max(this.verticalVelocity, 0) + f.takeoffLift;
      this.verticalVelocity = this.velocity.y;
      this.takeoffTimer = f.takeoffAssistTime;
      this.autoLevelTimer = 0;
    } else {
      // Cutting the jets mid-air: most upward momentum is lost so the car starts dropping promptly
      const vy = this.velocity.y;
      this.verticalVelocity = vy > 0 ? vy * PHYSICS.ENGINE_CUT_LIFT_KEEP : vy;
      this.velocity.y = this.verticalVelocity;
      this.speed = this.forwardSpeed();
    }

    eventBus.emit(Events.MODE_CHANGED, { mode: this.mode });
  }

  forwardSpeed() {
    return this.velocity.x * -Math.sin(this.heading) + this.velocity.z * -Math.cos(this.heading);
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

    // Fixed sub-steps: identical handling at 30, 60 or 144 FPS
    const steps = Math.max(1, Math.ceil(dt / VEHICLE_TUNING.MAX_SUBSTEP - 1e-6));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      if (this.mode === 'DRIVE') {
        this.stepDrive(h, input, stats, boostMult);
      } else {
        this.stepFlight(h, input, stats, boostMult);
      }
    }

    this.keepInsideWorld();

    // Animate wing deployment (0 in Drive, 1 in Flight)
    const targetWing = this.mode === 'FLIGHT' ? 1 : 0;
    this.wingDeploy += (targetWing - this.wingDeploy) * expAlpha(PHYSICS.WING_DEPLOY_SPEED, dt);
    if (this.leftWing && this.rightWing) {
      this.leftWing.scale.x = 0.15 + 0.85 * this.wingDeploy;
      this.rightWing.scale.x = 0.15 + 0.85 * this.wingDeploy;
    }

    // Spin wheels with road speed & steer front wheels with the smoothed steering wheel
    const wheelSpin = (this.mode === 'DRIVE' ? this.speed : 0) * dt * 1.8;
    for (const w of this.wheels) {
      w.rotation.x -= wheelSpin;
    }
    const steerAngle = -this.steerAxis * 0.42;
    for (const pivot of this.frontWheelPivots) {
      pivot.rotation.y = steerAngle;
    }

    // Scale jet thruster flames dynamically (acceleration makes them flare)
    const accelFlare = clamp(this.longAccel / 40, 0, 0.5);
    const flameIntensity =
      this.mode === 'FLIGHT'
        ? this.isBoosting
          ? 1.65
          : this.isAirBraking
            ? 0.35
            : 1.1
        : this.isBoosting
          ? 1.35
          : Math.max(0.15, (Math.abs(this.speed) / stats.maxDriveSpeed) * 0.55 + accelFlare);

    for (const flame of this.thrusterFlames) {
      flame.scale.set(
        0.55 + flameIntensity * 0.35,
        0.55 + flameIntensity * 0.35,
        0.25 + flameIntensity * 1.15
      );
    }

    this.syncMeshTransform();

    // Update GameState telemetry
    gameState.mode = this.mode;
    gameState.speedKmh = Math.round(Math.abs(this.speed) * 3.2);
    gameState.altitude = Math.max(0, Math.round(this.position.y));
  }

  /** Shared smoothed steering wheel: turns in at steerRise, re-centres / counter-steers at steerReturn. */
  updateSteerAxis(h, input) {
    const t = tuning.drive;
    const stunRatio = t.crashStunTime > 0 ? this.crashStun / t.crashStunTime : 0;
    const authority = 1 - PHYSICS.CRASH_STEER_LOSS * clamp(stunRatio, 0, 1);
    this.crashStun = Math.max(0, this.crashStun - h);

    // Glancing wall hits swing the nose along the wall over ~0.2 s instead of snapping it in one frame
    if (this.glanceRemaining !== 0) {
      const swing = this.glanceRemaining * expAlpha(PHYSICS.WALL_GLANCE_RATE, h);
      this.heading += swing;
      this.glanceRemaining -= swing;
      if (Math.abs(this.glanceRemaining) < 1e-4) this.glanceRemaining = 0;
    }

    const rawSteer = clamp(input.steer || 0, -1, 1) * authority;
    const returning = Math.abs(rawSteer) < Math.abs(this.steerAxis) || rawSteer * this.steerAxis < 0;
    this.steerAxis = approach(this.steerAxis, rawSteer, (returning ? t.steerReturn : t.steerRise) * h);
  }

  stepDrive(h, input, stats, boostMult) {
    const t = tuning.drive;
    const throttle = clamp(input.throttle || 0, 0, 1);
    const brake = clamp(input.brake || 0, 0, 1);
    this.updateSteerAxis(h, input);

    // Body-space basis (heading 0 faces -Z)
    const fx = -Math.sin(this.heading);
    const fz = -Math.cos(this.heading);
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    let vf = this.velocity.x * fx + this.velocity.z * fz;
    let vl = this.velocity.x * rx + this.velocity.z * rz;
    const vfBefore = vf;
    const maxSpeed = stats.maxDriveSpeed * boostMult;

    // 1. Longitudinal: punchy-then-tapering acceleration curve, constant braking, inertial coasting
    if (this.isGrounded) {
      if (throttle > 0) {
        if (vf < -0.5) {
          vf = Math.min(0, vf + t.brakeDecel * throttle * h);
        } else if (vf < maxSpeed) {
          const ratio = clamp(vf / maxSpeed, 0, 1);
          const curve = Math.max(PHYSICS.ACCEL_CURVE_FLOOR, Math.pow(1 - ratio, t.accelCurve));
          vf = Math.min(maxSpeed, vf + stats.acceleration * t.accelMult * boostMult * throttle * curve * h);
        }
      } else if (brake > 0) {
        if (vf > 0.5) {
          vf = Math.max(0, vf - t.brakeDecel * brake * h);
        } else {
          vf = Math.max(-PHYSICS.REVERSE_MAX_SPEED, vf - stats.acceleration * 0.6 * brake * h);
        }
      } else {
        vf *= Math.exp(-t.coastDrag * h);
        vf = approach(vf, 0, t.rollingDecel * h);
      }

      if (this.isBoosting && vf >= 0 && vf < maxSpeed * 0.65) {
        vf += stats.acceleration * 0.9 * h; // nitro kick off the line
      }
      if (vf > maxSpeed) {
        vf = maxSpeed + (vf - maxSpeed) * Math.exp(-PHYSICS.OVERSPEED_DECAY * h);
      }
    } else {
      vf *= Math.exp(-PHYSICS.AIR_DRAG * 0.2 * h);
      if (throttle > 0 && vf < maxSpeed) {
        vf = Math.min(maxSpeed, vf + stats.acceleration * t.accelMult * t.airAccel * throttle * h);
      } else if (brake > 0 && vf > 0) {
        vf = Math.max(0, vf - t.brakeDecel * t.airAccel * brake * h);
      }
    }

    // 2. Lateral grip: slip is damped quickly (micro-slide for weight), never instantly zeroed
    this.isDrifting = this.isGrounded && Boolean(input.drift) && Math.abs(vf) > 16 && Math.abs(this.steerAxis) > 0.1;
    if (this.isGrounded) {
      // While scraping along a wall the car slides sideways (no slip guard) as its nose swings round
      const scraping = this.glanceRemaining !== 0;
      const grip = this.isDrifting || scraping
        ? t.driftGrip
        : t.lateralGrip + (Math.abs(this.steerAxis) < 0.05 ? t.slipRecovery : 0);
      const newVl = vl * Math.exp(-grip * h);
      const scrubbed = Math.abs(vl) - Math.abs(newVl);
      vl = newVl;
      if (vf > 0.5) {
        // Cornering converts scrubbed sideways speed back into forward speed (arcade flow)
        vf = Math.min(Math.max(vf, maxSpeed), vf + scrubbed * t.cornerRetention);
      }
      // Spin-out guard: slip angle can never exceed the configured limit
      const absVf = Math.abs(vf);
      if (scraping) {
        // keep the sideways momentum; grip above re-aligns it smoothly
      } else if (absVf > 2) {
        const maxSlip = this.isDrifting ? t.driftMaxSlipAngle : t.maxSlipAngle;
        const limit = absVf * Math.tan(maxSlip);
        if (Math.abs(vl) > limit) vl = Math.sign(vl) * limit;
      } else {
        vl *= Math.exp(-PHYSICS.PARKED_LATERAL_DAMPING * h);
      }
    } else {
      // Arcade air control: sideways drift relative to the nose bleeds off into forward motion,
      // so steering mid-air actually changes where the car lands
      const newVl = vl * Math.exp(-t.airGrip * h);
      const scrubbed = Math.abs(vl) - Math.abs(newVl);
      vl = newVl;
      if (vf > 0.5) vf = Math.min(Math.max(vf, maxSpeed), vf + scrubbed * t.cornerRetention);
    }

    // 3. Yaw: speed-sensitive steering with angular inertia while steering, strong damping on release
    const absVf = Math.abs(vf);
    const lowSpeedFactor = clamp(absVf / t.steerFullSpeed, 0, 1);
    const highT = clamp(
      (absVf - PHYSICS.HIGH_SPEED_STEER_START) / Math.max(1, stats.maxDriveSpeed - PHYSICS.HIGH_SPEED_STEER_START),
      0,
      1
    );
    const speedFactor = lowSpeedFactor * (1 + (t.highSpeedSteer - 1) * highT);
    const driftMult = this.isDrifting ? stats.driftTurnMultiplier : 1;
    const direction = vf >= 0 ? 1 : -1;
    const airControl = this.isGrounded ? 1 : t.airSteer;
    const targetYaw = this.steerAxis * stats.turnRate * t.steerRateMult * speedFactor * driftMult * direction * airControl;
    const yawRateConst = Math.abs(this.steerAxis) > 0.02 ? t.yawResponse : t.yawDamping;
    this.yawRate += (targetYaw - this.yawRate) * expAlpha(yawRateConst, h);
    this.heading += this.yawRate * h;

    // Velocity stays in the pre-turn basis, so the body leads the travel direction (natural slip)
    this.velocity.x = fx * vf + rx * vl;
    this.velocity.z = fz * vf + rz * vl;
    this.position.x += this.velocity.x * h;
    this.position.z += this.velocity.z * h;

    this.speed = vf;
    this.slipAngle = absVf > PHYSICS.SLIP_MIN_SPEED ? Math.atan2(vl, absVf) : 0;
    this.longAccel += ((vf - vfBefore) / h - this.longAccel) * expAlpha(PHYSICS.ACCEL_SMOOTHING, h);
    this.latAccel = this.yawRate * vf;

    // 4. Vertical: ground, ramps, overpass, rooftops (unchanged arcade surface solver)
    const surface = this.city.getSurfaceAt(this.position.x, this.position.z, this.position.y);
    const targetY = surface.height + 0.55;
    const wasGrounded = this.isGrounded;

    if (this.position.y <= targetY + 0.25 && this.verticalVelocity <= 4.0) {
      this.position.y = targetY;
      this.isGrounded = true;
      this.currentSurface = surface.surfaceType;

      if (surface.isRamp && vf > 8) {
        // Riding up a ramp imparts upward launch velocity!
        this.verticalVelocity = vf * surface.rampSlope * 1.18;
        this.groundPitchTarget = Math.atan(surface.rampSlope);
      } else {
        if (!wasGrounded && this.verticalVelocity < -6) {
          eventBus.emit(Events.PLAYER_LANDED, {
            surfaceType: surface.surfaceType,
            isRooftop: surface.isRooftop,
            impactSpeed: Math.abs(this.verticalVelocity),
          });
        }
        this.verticalVelocity = 0;
        this.groundPitchTarget = 0;
      }
    } else {
      if (wasGrounded && this.verticalVelocity > 3) {
        eventBus.emit(Events.PLAYER_JUMP, { speed: vf });
      }
      this.isGrounded = false;
      // Falling pulls harder than rising: snappy arcs and drops that don't feel floaty
      const gravity = this.verticalVelocity < 0 ? PHYSICS.GRAVITY * t.fallGravityMult : PHYSICS.GRAVITY;
      this.verticalVelocity = Math.max(-PHYSICS.TERMINAL_FALL_SPEED, this.verticalVelocity - gravity * h);
      this.position.y += this.verticalVelocity * h;

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
      }
    }
    this.velocity.y = this.verticalVelocity;

    // 5. Body attitude: critically damped springs (auto-stabilisation without jerks or overshoot)
    let pitchTarget;
    let rollTarget;
    if (this.isGrounded) {
      pitchTarget = this.groundPitchTarget + clamp(this.longAccel * t.bodyPitch, -PHYSICS.MAX_BODY_PITCH, PHYSICS.MAX_BODY_PITCH);
      rollTarget = clamp(-this.latAccel * t.bodyRoll, -PHYSICS.MAX_BODY_ROLL, PHYSICS.MAX_BODY_ROLL);
    } else {
      pitchTarget = clamp(this.verticalVelocity * 0.02, -0.45, 0.45);
      rollTarget = 0;
    }
    this.springBody(h, pitchTarget, rollTarget, t.autoRight);

    // 6. Walls: slide along them instead of stopping dead
    const col = this.city.resolveHorizontalCollision(this.position, 1.85);
    this.closestBuildingDist = col.minDistance;
    if (col.collided) {
      this.handleWallHit(col, PHYSICS.COLLISION_EVENT_MIN_IMPACT);
    }
  }

  stepFlight(h, input, stats, boostMult) {
    const f = tuning.flight;
    this.isGrounded = false;
    this.isDrifting = false;
    this.updateSteerAxis(h, input);

    const throttle = clamp(input.throttle || 0, 0, 1);
    const brake = clamp(input.brake || 0, 0, 1);
    const pitchInput = clamp(input.pitch || 0, -1, 1);

    // 1. Yaw with inertia (bank-and-turn)
    const maxYaw = stats.flightBankRate * f.yawRateMult;
    const targetYaw = this.steerAxis * maxYaw;
    const yawRateConst = Math.abs(this.steerAxis) > 0.02 ? f.yawResponse : f.yawDamping;
    this.yawRate += (targetYaw - this.yawRate) * expAlpha(yawRateConst, h);
    this.heading += this.yawRate * h;

    // 2. Pitch: responsive command, auto-level only after a short delay so it never fights manoeuvres
    this.takeoffTimer = Math.max(0, this.takeoffTimer - h);
    let targetPitch = 0;
    let pitchRate = 0;
    if (Math.abs(pitchInput) > 0.05) {
      targetPitch = pitchInput * PHYSICS.FLIGHT_MAX_PITCH;
      pitchRate = f.pitchResponse;
      this.autoLevelTimer = 0;
    } else {
      this.autoLevelTimer += h;
      pitchRate = this.autoLevelTimer >= f.autoLevelDelay ? f.autoLevel : 0;
    }
    if (this.takeoffTimer > 0 && targetPitch < f.takeoffPitch) {
      targetPitch = f.takeoffPitch;
      pitchRate = Math.max(pitchRate, f.pitchResponse);
    }
    const surface = this.city.getSurfaceAt(this.position.x, this.position.z, this.position.y);
    const altitude = this.position.y - surface.height;
    if (altitude < f.landingAssistHeight && targetPitch < f.landingMinPitch) {
      targetPitch = f.landingMinPitch; // landing flare: soften steep dives near the ground
      pitchRate = Math.max(pitchRate, f.pitchResponse);
    }
    const prevPitch = this.pitchAngle;
    this.pitchAngle += (targetPitch - this.pitchAngle) * expAlpha(pitchRate, h);
    this.pitchVel = (this.pitchAngle - prevPitch) / h;

    // 2b. Sky-ring assist: when roughly lined up with a ring ahead, gently pull the nose to its centre
    this.applyRingAssist(h);

    // 3. Airspeed: throttle sets the target, the air brake (Space) sheds speed fast for precise lines,
    //    diving trades altitude for speed
    const maxFlight = stats.maxFlightSpeed * boostMult;
    this.isAirBraking = Boolean(input.airBrake) && !this.isBoosting;
    let targetSpeed =
      throttle > 0 ? maxFlight : brake > 0 ? PHYSICS.FLIGHT_MIN_CRUISE_SPEED : stats.maxFlightSpeed * 0.72 * boostMult;
    let speedRate = f.accel;
    if (this.isAirBraking) {
      targetSpeed = f.airBrakeSpeed;
      speedRate = f.airBrakeRate;
    }
    const prevSpeed = this.speed;
    this.speed += (targetSpeed - this.speed) * expAlpha(speedRate, h);
    this.speed -= Math.sin(this.pitchAngle) * f.diveSpeedGain * h;
    this.speed = clamp(this.speed, PHYSICS.FLIGHT_MIN_CRUISE_SPEED * 0.8, maxFlight * 1.12);
    this.longAccel += ((this.speed - prevSpeed) / h - this.longAccel) * expAlpha(PHYSICS.ACCEL_SMOOTHING, h);
    this.latAccel = this.yawRate * this.speed;

    // 4. Momentum: velocity eases toward the nose direction (take-off speed & direction are preserved)
    const cosPitch = Math.cos(this.pitchAngle);
    const desiredX = -Math.sin(this.heading) * cosPitch * this.speed;
    const desiredZ = -Math.cos(this.heading) * cosPitch * this.speed;
    const sinPitch = Math.sin(this.pitchAngle);
    const desiredY =
      sinPitch >= 0
        ? sinPitch * stats.flightClimbRate * (this.isBoosting ? 1.3 : 1.0)
        : sinPitch * this.speed * f.diveRate;
    const m = expAlpha(f.momentum, h);
    this.velocity.x += (desiredX - this.velocity.x) * m;
    this.velocity.y += (desiredY - this.velocity.y) * m;
    this.velocity.z += (desiredZ - this.velocity.z) * m;
    this.position.addScaledVector(this.velocity, h);
    this.verticalVelocity = this.velocity.y;
    this.slipAngle = 0;

    // Clamp max ceiling
    if (this.position.y > PHYSICS.FLIGHT_CEILING) {
      this.position.y = PHYSICS.FLIGHT_CEILING;
      this.pitchAngle = Math.min(0, this.pitchAngle);
      this.velocity.y = Math.min(0, this.velocity.y);
    }

    // 5. Bank into the turn (left turn = left wing down)
    const bank = clamp(this.yawRate / Math.max(0.01, maxYaw), -1, 1) * f.bankAngle;
    this.springBody(h, null, bank, tuning.drive.autoRight * 1.2);

    // 6. Ground / rooftop contact: dive in to land, otherwise skim
    const contact = this.city.getSurfaceAt(this.position.x, this.position.z, this.position.y);
    const minFlightY = contact.height + 0.65;
    if (this.position.y <= minFlightY) {
      this.position.y = minFlightY;
      if (this.pitchAngle < -0.15) {
        const impactSpeed = Math.abs(this.velocity.y);
        this.toggleMode('DRIVE');
        this.isGrounded = true;
        this.currentSurface = contact.surfaceType;
        this.velocity.y = 0;
        this.verticalVelocity = 0;
        this.speed = this.forwardSpeed();
        eventBus.emit(Events.PLAYER_LANDED, {
          surfaceType: contact.surfaceType,
          isRooftop: contact.isRooftop,
          impactSpeed,
        });
        return;
      }
      this.pitchAngle = Math.max(0, this.pitchAngle);
      this.velocity.y = Math.max(0, this.velocity.y);
    }

    // 7. Walls: glance off and keep flying
    const col = this.city.resolveHorizontalCollision(this.position, 1.9);
    this.closestBuildingDist = col.minDistance;
    if (col.collided) {
      this.handleWallHit(col, PHYSICS.COLLISION_EVENT_MIN_IMPACT_FLIGHT);
      this.speed = Math.max(PHYSICS.FLIGHT_MIN_SPEED_AFTER_HIT, Math.hypot(this.velocity.x, this.velocity.z));
    }
  }

  /**
   * Arcade aim assist for sky rings: if a ring is ahead within range and the nose line passes within
   * the capture radius, ease heading/pitch toward the ring centre. Never fights a player steering away.
   */
  applyRingAssist(h) {
    const f = tuning.flight;
    if (!f.ringAssist || !this.city.skyRings) return;
    const cosP = Math.cos(this.pitchAngle);
    const nx = -Math.sin(this.heading) * cosP;
    const ny = Math.sin(this.pitchAngle);
    const nz = -Math.cos(this.heading) * cosP;
    let best = null;
    for (const ring of this.city.skyRings) {
      if (ring.cooldown > 0) continue;
      const rx = ring.position.x - this.position.x;
      const ry = ring.position.y - this.position.y;
      const rz = ring.position.z - this.position.z;
      const along = rx * nx + ry * ny + rz * nz;
      if (along <= 0 || along > f.ringAssistRange) continue;
      const lateral = Math.hypot(rx - nx * along, ry - ny * along, rz - nz * along);
      if (lateral < f.ringAssistCapture && (!best || lateral < best.lateral)) best = { rx, ry, rz, lateral };
    }
    if (!best) return;

    const weight = f.ringAssist * (1 - best.lateral / f.ringAssistCapture);
    const k = expAlpha(f.ringAssistRate * weight, h);
    const headingFix = Math.atan2(Math.sin(Math.atan2(-best.rx, -best.rz) - this.heading), Math.cos(Math.atan2(-best.rx, -best.rz) - this.heading));
    const pitchFix = Math.atan2(best.ry, Math.hypot(best.rx, best.rz)) - this.pitchAngle;
    // Skip the axis the player is actively steering against
    if (!(Math.abs(this.steerAxis) > 0.3 && Math.sign(this.steerAxis) !== Math.sign(headingFix))) {
      this.heading += headingFix * k;
    }
    this.pitchAngle += clamp(pitchFix, -PHYSICS.FLIGHT_MAX_PITCH, PHYSICS.FLIGHT_MAX_PITCH) * k;
  }

  /** Remove the into-wall velocity, keep most tangential speed, kick a short spin away from the wall. */
  handleWallHit(col, minEventImpact) {
    const t = tuning.drive;
    const nx = col.normalX;
    const nz = col.normalZ;
    const vn = this.velocity.x * nx + this.velocity.z * nz;
    this.justCollidedTimer = 0.85;
    if (vn >= 0) return;

    const impact = -vn;
    const tx = this.velocity.x - nx * vn;
    const tz = this.velocity.z - nz * vn;
    // Friction scales with how hard the hit is, so sustained light scraping doesn't bleed speed every sub-step
    const hitShare = clamp(impact / PHYSICS.WALL_FULL_FRICTION_IMPACT, 0, 1);
    const keep = 1 - (1 - t.wallFriction) * hitShare;
    this.velocity.x = tx * keep - nx * vn * t.wallRestitution;
    this.velocity.z = tz * keep - nz * vn * t.wallRestitution;

    // Glancing hits swing the nose along the wall so the car slides on instead of re-hitting it every frame;
    // near head-on hits (nose ~perpendicular to the wall) just bounce.
    const tanX = -nz;
    const tanZ = nx;
    const along = -Math.sin(this.heading) * tanX + -Math.cos(this.heading) * tanZ;
    if (Math.abs(along) > PHYSICS.WALL_HEAD_ON_COS) {
      const dir = along >= 0 ? 1 : -1;
      const tangentHeading = Math.atan2(-tanX * dir, -tanZ * dir);
      const diff = Math.atan2(Math.sin(tangentHeading - this.heading), Math.cos(tangentHeading - this.heading));
      this.glanceRemaining = diff * t.wallAlign; // overwrite (not accumulate) on repeated contacts
      // Short spin in the same direction sells the impact; damping removes it within a fraction of a second
      const kick = Math.sign(diff) * impact * t.crashSpin;
      this.yawRate = clamp(this.yawRate + kick, -PHYSICS.MAX_CRASH_YAW_RATE, PHYSICS.MAX_CRASH_YAW_RATE);
    }
    this.crashStun = Math.max(this.crashStun, t.crashStunTime * clamp(impact / PHYSICS.CRASH_FULL_STUN_IMPACT, 0, 1));

    if (this.collisionCooldown <= 0 && impact > minEventImpact) {
      this.collisionCooldown = 0.55;
      eventBus.emit(Events.PLAYER_COLLISION, { impactSpeed: impact });
    }
  }

  /** Critically damped spring toward target attitude (null pitch = pitch driven elsewhere). */
  springBody(h, pitchTarget, rollTarget, omega) {
    const k = omega * omega;
    const c = 2 * omega;
    if (pitchTarget !== null) {
      this.pitchVel += (k * (pitchTarget - this.pitchAngle) - c * this.pitchVel) * h;
      this.pitchAngle += this.pitchVel * h;
    }
    this.rollVel += (k * (rollTarget - this.rollAngle) - c * this.rollVel) * h;
    this.rollAngle += this.rollVel * h;
  }

  /** Bounce off the invisible city limits by mirroring heading and velocity. */
  keepInsideWorld() {
    const bound = GAME.WORLD_BOUNDS;
    if (Math.abs(this.position.x) > bound) {
      this.position.x = Math.sign(this.position.x) * bound;
      this.heading = -this.heading;
      this.velocity.x = -this.velocity.x;
      this.yawRate = 0;
    }
    if (Math.abs(this.position.z) > bound) {
      this.position.z = Math.sign(this.position.z) * bound;
      this.heading = Math.PI - this.heading;
      this.velocity.z = -this.velocity.z;
      this.yawRate = 0;
    }
  }

  syncMeshTransform() {
    this.mesh.rotation.order = 'YXZ';
    this.mesh.rotation.y = this.heading;
    this.mesh.rotation.x = this.pitchAngle;
    this.mesh.rotation.z = this.rollAngle;
  }
}
