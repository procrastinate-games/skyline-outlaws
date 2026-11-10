import * as THREE from 'three';
import { eventBus, Events } from '../core/EventBus.js';

export class ParticleSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    this.maxParticles = 140;
    this.particles = [];

    const geo = new THREE.BoxGeometry(0.32, 0.32, 0.32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    this.instancedMesh = new THREE.InstancedMesh(geo, mat, this.maxParticles);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
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
  }

  spawnParticle(x, y, z, vx, vy, vz, colorHex, maxLife = 0.45, scale = 1.0) {
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
        1.4
      );
    }
  }

  update(dt) {
    this.spawnAccumulator += dt;

    // Emit continuous thruster plasma or drift tire sparks
    if (this.spawnAccumulator >= 0.03) {
      this.spawnAccumulator = 0;
      const p = this.player.position;
      const h = this.player.heading;
      const backX = Math.sin(h) * 2.4;
      const backZ = Math.cos(h) * 2.4;

      if (this.player.mode === 'FLIGHT' || this.player.isBoosting) {
        const color = this.player.isBoosting ? 0xffbe0b : 0x00f5d4;
        this.spawnParticle(
          p.x + backX + (Math.random() - 0.5) * 0.8,
          p.y + 0.45,
          p.z + backZ + (Math.random() - 0.5) * 0.8,
          backX * 2.5,
          (Math.random() - 0.5) * 2,
          backZ * 2.5,
          color,
          0.35,
          1.2
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
          0.95
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
      this.dummy.scale.setScalar(pt.scale * ratio);
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
