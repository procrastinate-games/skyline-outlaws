import * as THREE from 'three';
import { CAMERA_CONFIG } from '../core/Constants.js';
import { gameState } from '../core/GameState.js';
import { tuning } from '../core/Tuning.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/** Frame-rate independent exponential smoothing factor. */
const smoothing = (rate, dt) => 1 - Math.exp(-rate * dt);

export class CameraSystem {
  constructor(camera, player, city) {
    this.camera = camera;
    this.player = player;
    this.city = city;

    this.currentLookAt = new THREE.Vector3();
    this.desiredPosition = new THREE.Vector3();
    this.desiredLookAt = new THREE.Vector3();
    this.followPosition = new THREE.Vector3();
    this.pullback = 0;
    this.cameraYaw = 0;
    this.shakeIntensity = 0;
    this.menuOrbitAngle = 0;
    this.introTimer = 0;
    this.wasStarted = false;
  }

  reset() {
    this.cameraYaw = this.player.heading;
    this.shakeIntensity = 0;
    this.snapToPlayer();
  }

  triggerShake(intensity = 0.4) {
    this.shakeIntensity = Math.min(1.2, Math.max(this.shakeIntensity, intensity));
  }

  snapToPlayer() {
    const p = this.player.position;
    const h = this.player.heading;
    const backX = Math.sin(h) * tuning.camera.distance;
    const backZ = Math.cos(h) * tuning.camera.distance;

    this.camera.position.set(p.x + backX, p.y + tuning.camera.height, p.z + backZ);
    this.followPosition.copy(this.camera.position);
    this.pullback = 0;
    this.currentLookAt.set(
      p.x - Math.sin(h) * CAMERA_CONFIG.LOOK_AHEAD,
      p.y + 1.4,
      p.z - Math.cos(h) * CAMERA_CONFIG.LOOK_AHEAD
    );
    this.camera.lookAt(this.currentLookAt);
  }

  /** Attract-mode orbit around the parked car while the main menu is open. */
  updateMenuOrbit(dt) {
    const p = this.player.position;
    this.menuOrbitAngle += CAMERA_CONFIG.MENU_ORBIT_SPEED * dt;
    const a = this.menuOrbitAngle;
    this.camera.position.set(
      p.x + Math.sin(a) * CAMERA_CONFIG.MENU_ORBIT_RADIUS,
      p.y + CAMERA_CONFIG.MENU_ORBIT_HEIGHT,
      p.z + Math.cos(a) * CAMERA_CONFIG.MENU_ORBIT_RADIUS
    );
    this.currentLookAt.set(p.x, p.y + 1.6, p.z);
    this.camera.lookAt(this.currentLookAt);
  }

  update(dt) {
    if (!gameState.started) {
      this.wasStarted = false;
      this.updateMenuOrbit(dt);
      this.followPosition.copy(this.camera.position);
      return;
    }
    if (!this.wasStarted) {
      // Cinematic swoop from the menu orbit into the chase position
      this.wasStarted = true;
      this.introTimer = CAMERA_CONFIG.INTRO_DURATION;
      this.followPosition.copy(this.camera.position);
    }
    this.introTimer = Math.max(0, this.introTimer - dt);

    const c = tuning.camera;
    const p = this.player.position;
    const isFlight = this.player.mode === 'FLIGHT';

    // Heading follow with lag: in sharp turns / lane changes the camera trails and shows the car's side
    let angleDiff = this.player.heading - this.cameraYaw;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.cameraYaw += angleDiff * smoothing(c.yawLag, dt);

    // Distance: speed stretch + spring pull-back under acceleration (pushes in under braking)
    const speedRatio = Math.min(1.2, Math.abs(this.player.speed) / CAMERA_CONFIG.SPEED_REFERENCE);
    const pullbackTarget = clamp(
      (this.player.longAccel || 0) * c.accelPullback,
      -CAMERA_CONFIG.MAX_BRAKE_PUSH_IN,
      CAMERA_CONFIG.MAX_ACCEL_PULLBACK
    );
    this.pullback += (pullbackTarget - this.pullback) * smoothing(CAMERA_CONFIG.PULLBACK_SMOOTHING, dt);
    const boostExtra = this.player.isBoosting ? CAMERA_CONFIG.BOOST_EXTRA_DISTANCE : 0;
    const baseDist = isFlight ? c.flightDistance : c.distance;
    const dist = baseDist + speedRatio * c.distanceSpeed + boostExtra + this.pullback;
    const height = isFlight ? c.flightHeight - Math.sin(this.player.pitchAngle) * 3.2 : c.height;

    const backX = Math.sin(this.cameraYaw) * dist;
    const backZ = Math.cos(this.cameraYaw) * dist;
    this.desiredPosition.set(p.x + backX, p.y + height, p.z + backZ);

    // Prevent camera from clipping below ground or rooftop below it
    const camSurface = this.city.getSurfaceAt(this.desiredPosition.x, this.desiredPosition.z, this.desiredPosition.y);
    if (this.desiredPosition.y < camSurface.height + 1.4) {
      this.desiredPosition.y = camSurface.height + 1.4;
    }

    // Frame-rate independent spring follow; shake is applied on top so it never feeds back into the follow
    const posLag = this.introTimer > 0 ? CAMERA_CONFIG.INTRO_POS_SMOOTHING : c.posLag;
    this.followPosition.lerp(this.desiredPosition, smoothing(posLag, dt));
    this.camera.position.copy(this.followPosition);
    if (this.shakeIntensity > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= Math.exp(-CAMERA_CONFIG.SHAKE_DECAY * dt);
    } else {
      this.shakeIntensity = 0;
    }

    // Look ahead along the actual travel direction (blended with heading) so motion reads clearly
    const v = this.player.velocity;
    const horizSpeed = Math.hypot(v.x, v.z);
    let lookDirX = -Math.sin(this.player.heading);
    let lookDirZ = -Math.cos(this.player.heading);
    if (horizSpeed > CAMERA_CONFIG.TRAVEL_LOOK_MIN_SPEED && this.player.speed >= 0) {
      const w = CAMERA_CONFIG.TRAVEL_LOOK_BLEND;
      lookDirX = lookDirX * (1 - w) + (v.x / horizSpeed) * w;
      lookDirZ = lookDirZ * (1 - w) + (v.z / horizSpeed) * w;
    }
    const lookYOffset = isFlight ? 1.5 + Math.sin(this.player.pitchAngle) * 3.5 : 1.45;
    this.desiredLookAt.set(
      p.x + lookDirX * CAMERA_CONFIG.LOOK_AHEAD,
      p.y + lookYOffset,
      p.z + lookDirZ * CAMERA_CONFIG.LOOK_AHEAD
    );
    this.currentLookAt.lerp(this.desiredLookAt, smoothing(CAMERA_CONFIG.LOOK_SMOOTHING, dt));
    this.camera.lookAt(this.currentLookAt);

    // Dynamic speed-reactive FOV (configurable, capped to stay readable)
    const targetFov =
      c.fovBase + Math.min(1, speedRatio) * (c.fovMax - c.fovBase) + (this.player.isBoosting ? c.fovBoost : 0);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * smoothing(CAMERA_CONFIG.FOV_SMOOTHING, dt);
      this.camera.updateProjectionMatrix();
    }
  }
}
