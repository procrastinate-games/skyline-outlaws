import * as THREE from 'three';
import { CAMERA_CONFIG, GAME } from '../core/Constants.js';

export class CameraSystem {
  constructor(camera, player, city) {
    this.camera = camera;
    this.player = player;
    this.city = city;

    this.currentLookAt = new THREE.Vector3();
    this.desiredPosition = new THREE.Vector3();
    this.desiredLookAt = new THREE.Vector3();
    this.cameraYaw = 0;
    this.shakeIntensity = 0;
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
    const backX = Math.sin(h) * CAMERA_CONFIG.DRIVE_DISTANCE;
    const backZ = Math.cos(h) * CAMERA_CONFIG.DRIVE_DISTANCE;

    this.camera.position.set(p.x + backX, p.y + CAMERA_CONFIG.DRIVE_HEIGHT, p.z + backZ);
    this.currentLookAt.set(
      p.x - Math.sin(h) * CAMERA_CONFIG.LOOK_AHEAD,
      p.y + 1.4,
      p.z - Math.cos(h) * CAMERA_CONFIG.LOOK_AHEAD
    );
    this.camera.lookAt(this.currentLookAt);
  }

  update(dt) {
    const p = this.player.position;
    const isFlight = this.player.mode === 'FLIGHT';

    // Smoothly follow vehicle heading (leaves slight cinematic angle during drifts)
    let angleDiff = this.player.heading - this.cameraYaw;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.cameraYaw += angleDiff * Math.min(1, 7.5 * dt);

    const speedRatio = Math.min(1.2, Math.abs(this.player.speed) / 75);
    const boostExtra = this.player.isBoosting ? CAMERA_CONFIG.BOOST_EXTRA_DISTANCE : 0;

    const baseDist = isFlight ? CAMERA_CONFIG.FLIGHT_DISTANCE : CAMERA_CONFIG.DRIVE_DISTANCE;
    const dist = baseDist + speedRatio * 1.6 + boostExtra;
    const height = isFlight
      ? CAMERA_CONFIG.FLIGHT_HEIGHT - Math.sin(this.player.pitchAngle) * 3.2
      : CAMERA_CONFIG.DRIVE_HEIGHT;

    const backX = Math.sin(this.cameraYaw) * dist;
    const backZ = Math.cos(this.cameraYaw) * dist;

    this.desiredPosition.set(p.x + backX, p.y + height, p.z + backZ);

    // Prevent camera from clipping below ground or rooftop below it
    const camSurface = this.city.getSurfaceAt(this.desiredPosition.x, this.desiredPosition.z, this.desiredPosition.y);
    if (this.desiredPosition.y < camSurface.height + 1.4) {
      this.desiredPosition.y = camSurface.height + 1.4;
    }

    this.camera.position.lerp(this.desiredPosition, Math.min(1, CAMERA_CONFIG.POS_SMOOTHING * dt));

    // Apply subtle impact camera shake if active
    if (this.shakeIntensity > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= Math.max(0, 1 - 9 * dt);
    } else {
      this.shakeIntensity = 0;
    }

    const forwardX = -Math.sin(this.player.heading);
    const forwardZ = -Math.cos(this.player.heading);
    const lookYOffset = isFlight ? 1.5 + Math.sin(this.player.pitchAngle) * 3.5 : 1.45;

    this.desiredLookAt.set(
      p.x + forwardX * CAMERA_CONFIG.LOOK_AHEAD,
      p.y + lookYOffset,
      p.z + forwardZ * CAMERA_CONFIG.LOOK_AHEAD
    );
    this.currentLookAt.lerp(this.desiredLookAt, Math.min(1, CAMERA_CONFIG.LOOK_SMOOTHING * dt));
    this.camera.lookAt(this.currentLookAt);

    // Dynamic speed-reactive FOV
    const targetFov =
      GAME.FOV_BASE +
      speedRatio * (GAME.FOV_MAX - GAME.FOV_BASE) * 0.75 +
      (this.player.isBoosting ? 5.5 : 0);

    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, 6.0 * dt);
      this.camera.updateProjectionMatrix();
    }
  }
}
