import * as THREE from 'three';
import { COLORS, VISUALS } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';

export class ParticleSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    this.maxParticles = 280;
    this.particles = [];

    const geo = new THREE.BoxGeometry(0.32, 0.32, 0.32);
    // Additive glowing plasma so trails & bursts pop against the bright daytime city
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: VISUALS.PARTICLE_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.instancedMesh = new THREE.InstancedMesh(geo, mat, this.maxParticles);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Instances move all over the city; a cached bounding sphere would cull the whole pool
    this.instancedMesh.frustumCulled = false;
    this.scene.add(this.instancedMesh);

    this.dummy = new THREE.Object3D();
    this.colorHelper = new THREE.Color();

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 1,
        stretch: 1,
        flatten: 1,
        rotY: 0,
        color: 0x00f5d4,
      });
      this.dummy.position.set(0, -100, 0);
      this.dummy.scale.setScalar(0.001);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      this.instancedMesh.setColorAt(i, this.colorHelper.setHex(0x00f5d4));
    }

    this.spawnAccumulator = 0;

    eventBus.on(Events.RING_COLLECTED, ({ position }) => {
      if (position) this.spawnBurst(position, 0xffbe0b, 18);
    });
    eventBus.on(Events.MODE_CHANGED, () => {
      this.spawnBurst(this.player.position, 0x00f5d4, 14);
    });
    eventBus.on(Events.PLAYER_COLLISION, () => {
      this.spawnBurst(this.player.position, 0xff2a55, 12);
    });
    eventBus.on(Events.PLAYER_LANDED, ({ impactSpeed }) => {
      // Surface contact: a puff of dust scaled by how hard the car touched down
      const count = Math.min(VISUALS.LANDING_DUST_MAX, Math.round((impactSpeed || 0) * VISUALS.LANDING_DUST_PER_IMPACT));
      if (count > 2) this.spawnBurst(this.player.position, VISUALS.DUST_COLOR, count);
    });
  }

  spawnParticle(x, y, z, vx, vy, vz, colorHex, maxLife = 0.45, scale = 1.0, shape = null) {
    const slot = this.particles.find((p) => !p.active) || this.particles[0];
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.vx = vx;
    slot.vy = vy;
    slot.vz = vz;
    slot.life = maxLife;
    slot.maxLife = maxLife;
    slot.scale = scale;
    slot.stretch = shape ? shape.stretch : 1;
    slot.flatten = shape ? shape.flatten : 1;
    slot.rotY = shape ? shape.rotY : 0;
    slot.color = colorHex;
  }

  spawnBurst(pos, colorHex, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 6 + Math.random() * 10;
      this.spawnParticle(
        pos.x,
        pos.y + 0.6,
        pos.z,
        Math.cos(angle) * speed,
        2 + Math.random() * 6,
        Math.sin(angle) * speed,
        colorHex,
        0.55,
        VISUALS.BURST_PARTICLE_SCALE
      );
    }
  }

  reset() {
    this.spawnAccumulator = 0;
    this.dummy.position.set(0, -100, 0);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.scale.setScalar(0.001);
    this.dummy.updateMatrix();
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles[i].active = false;
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  update(dt) {
    this.spawnAccumulator += dt;

    // Emit continuous thruster plasma or drift tire sparks
    if (this.spawnAccumulator >= 0.02) {
      this.spawnAccumulator = 0;
      const p = this.player.position;
      const h = this.player.heading;
      const backX = Math.sin(h) * 2.4;
      const backZ = Math.cos(h) * 2.4;

      if (this.player.mode === 'FLIGHT' || this.player.isBoosting) {
        // Thin jet-exhaust streaks from both nozzles (boost = hot gold, cruise = thruster color)
        const color = this.player.isBoosting
          ? COLORS.RING_GOLD
          : this.player.accentMaterial
            ? this.player.accentMaterial.color.getHex()
            : COLORS.ROAD_LINE_CYAN;
        const nozzleX = Math.cos(h) * 0.52;
        const nozzleZ = -Math.sin(h) * 0.52;
        for (const side of [-1, 1]) {
          this.spawnParticle(
            p.x + backX * 1.25 + nozzleX * side,
            p.y - 0.05 + (Math.random() - 0.5) * 0.15,
            p.z + backZ * 1.25 + nozzleZ * side,
            backX * 2.2,
            0,
            backZ * 2.2,
            color,
            VISUALS.EXHAUST_LIFE,
            VISUALS.EXHAUST_SCALE,
            { stretch: VISUALS.EXHAUST_STRETCH, flatten: VISUALS.EXHAUST_FLATTEN, rotY: h }
          );
        }
      }

      // Neon thruster light trails streaming from the rear wheels (reference-style cyan ribbons)
      if (this.player.mode === 'DRIVE' && Math.abs(this.player.speed) > VISUALS.TAIL_TRAIL_MIN_SPEED) {
        const trailColor = this.player.accentMaterial
          ? this.player.accentMaterial.color.getHex()
          : COLORS.ROAD_LINE_CYAN;
        const rightX = Math.cos(h) * 0.95;
        const rightZ = -Math.sin(h) * 0.95;
        for (const side of [-1, 1]) {
          this.spawnParticle(
            p.x + backX * 0.6 + rightX * side,
            p.y - 0.25,
            p.z + backZ * 0.6 + rightZ * side,
            backX * 0.4,
            0,
            backZ * 0.4,
            trailColor,
            VISUALS.TAIL_TRAIL_LIFE,
            VISUALS.TAIL_TRAIL_SCALE,
            { stretch: VISUALS.TAIL_TRAIL_STRETCH, flatten: VISUALS.TAIL_TRAIL_FLATTEN, rotY: h }
          );
        }
      }

      // Tyre smoke whenever the tyres actually slide sideways (grip-limited micro-slip, not just drifting)
      const slip = Math.abs(this.player.slipAngle || 0);
      if (
        this.player.isGrounded &&
        this.player.mode === 'DRIVE' &&
        !this.player.isDrifting &&
        slip > VISUALS.TYRE_SMOKE_MIN_SLIP &&
        Math.abs(this.player.speed) > VISUALS.TYRE_SMOKE_MIN_SPEED
      ) {
        this.spawnParticle(
          p.x + backX * 0.6 + (Math.random() - 0.5) * 1.6,
          p.y - 0.3,
          p.z + backZ * 0.6 + (Math.random() - 0.5) * 1.6,
          (Math.random() - 0.5) * 2,
          0.8 + Math.random(),
          (Math.random() - 0.5) * 2,
          VISUALS.DUST_COLOR,
          0.4,
          0.7
        );
      }

      if (this.player.isDrifting) {
        this.spawnParticle(
          p.x + backX + (Math.random() - 0.5) * 1.6,
          p.y + 0.15,
          p.z + backZ + (Math.random() - 0.5) * 1.6,
          (Math.random() - 0.5) * 5,
          1.5 + Math.random() * 3,
          (Math.random() - 0.5) * 5,
          0xff9e00,
          0.3,
          VISUALS.DRIFT_SPARK_SCALE
        );
      }
    }

    for (let i = 0; i < this.maxParticles; i++) {
      const pt = this.particles[i];
      if (!pt.active) continue;

      pt.life -= dt;
      if (pt.life <= 0) {
        pt.active = false;
        this.dummy.position.set(0, -100, 0);
        this.dummy.scale.setScalar(0.001);
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.z += pt.vz * dt;

      const ratio = pt.life / pt.maxLife;
      this.dummy.position.set(pt.x, pt.y, pt.z);
      this.dummy.rotation.set(0, pt.rotY, 0);
      const s = pt.scale * ratio;
      this.dummy.scale.set(s, s * pt.flatten, pt.scale * pt.stretch * (0.75 + 0.25 * ratio));
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      this.instancedMesh.setColorAt(i, this.colorHelper.setHex(pt.color));
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }
}
