import * as THREE from 'three';
import { COLORS, GAME } from '../core/Constants.js';

export class CityBuilder {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.buildings = [];
    this.ramps = [];
    this.elevatedDecks = [];
    this.skyRings = [];
    this.rooftopPads = [];

    this.buildLightingAndSky();
    this.buildGroundAndRoads();
    this.buildElevatedOverpass();
    this.buildDistrictBuildings();
    this.buildRamps();
    this.buildSkyRings();
  }

  buildLightingAndSky() {
    this.scene.background = new THREE.Color(COLORS.SKY_TOP);
    this.scene.fog = new THREE.FogExp2(COLORS.FOG, 0.0022);

    const hemi = new THREE.HemisphereLight(COLORS.AMBIENT_LIGHT, COLORS.HEMI_GROUND, 1.35);
    this.root.add(hemi);

    const sun = new THREE.DirectionalLight(COLORS.SUN_LIGHT, 1.6);
    sun.position.set(120, 220, 140);
    this.root.add(sun);

    const rimLight = new THREE.DirectionalLight(0x00f5d4, 0.65);
    rimLight.position.set(-140, 120, -160);
    this.root.add(rimLight);

    // Cyber-sunset horizon dome & distant synth sun
    const sunGeo = new THREE.CircleGeometry(75, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xff2a85,
      fog: false,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(0, 115, -520);
    this.root.add(sunMesh);
  }

  buildGroundAndRoads() {
    const worldSize = GAME.WORLD_BOUNDS * 2.4;
    const groundGeo = new THREE.PlaneGeometry(worldSize, worldSize);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x10131e,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    this.root.add(ground);

    const roadMat = new THREE.MeshStandardMaterial({
      color: COLORS.ROAD_ASPHALT,
      roughness: 0.65,
      metalness: 0.2,
    });
    const cyanLineMat = new THREE.MeshBasicMaterial({ color: COLORS.ROAD_LINE_CYAN });
    const amberLineMat = new THREE.MeshBasicMaterial({ color: COLORS.ROAD_LINE_AMBER });

    // North-South Avenues (x = -120, 0, 120)
    const avenuesX = [-120, 0, 120];
    for (const x of avenuesX) {
      const road = new THREE.Mesh(new THREE.BoxGeometry(24, 0.1, 640), roadMat);
      road.position.set(x, 0, 0);
      this.root.add(road);

      // Edge neon strips
      const leftEdge = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 640), cyanLineMat);
      leftEdge.position.set(x - 11.4, 0.02, 0);
      this.root.add(leftEdge);

      const rightEdge = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 640), cyanLineMat);
      rightEdge.position.set(x + 11.4, 0.02, 0);
      this.root.add(rightEdge);
    }

    // East-West Cross Streets (z = -160, -60, 40, 140)
    const streetsZ = [-160, -60, 40, 140];
    for (const z of streetsZ) {
      const street = new THREE.Mesh(new THREE.BoxGeometry(640, 0.1, 22), roadMat);
      street.position.set(0, 0.01, z);
      this.root.add(street);

      const centerLine = new THREE.Mesh(new THREE.BoxGeometry(640, 0.14, 0.35), amberLineMat);
      centerLine.position.set(0, 0.03, z);
      this.root.add(centerLine);
    }

    // Instanced dashed center lines & glowing street bollards along Neon Boulevard
    const dashGeo = new THREE.BoxGeometry(0.4, 0.15, 4.5);
    const dashCount = 48;
    const dashInst = new THREE.InstancedMesh(dashGeo, amberLineMat, dashCount);
    const mat4 = new THREE.Matrix4();
    for (let i = 0; i < dashCount; i++) {
      mat4.makeTranslation(0, 0.03, -280 + i * 12);
      dashInst.setMatrixAt(i, mat4);
    }
    dashInst.instanceMatrix.needsUpdate = true;
    this.root.add(dashInst);
  }

  buildElevatedOverpass() {
    // Elevated East-West Skyway Deck at z = -110, height = 12
    const deck = {
      minX: -180,
      maxX: 180,
      minZ: -121,
      maxZ: -99,
      height: 12,
    };
    this.elevatedDecks.push(deck);

    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x20263a,
      roughness: 0.5,
      metalness: 0.35,
    });
    const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(360, 1.2, 22), deckMat);
    deckMesh.position.set(0, 11.4, -110);
    this.root.add(deckMesh);

    const railMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    const northRail = new THREE.Mesh(new THREE.BoxGeometry(360, 0.6, 0.4), railMat);
    northRail.position.set(0, 12.3, -120.7);
    this.root.add(northRail);

    const southRail = new THREE.Mesh(new THREE.BoxGeometry(360, 0.6, 0.4), railMat);
    southRail.position.set(0, 12.3, -99.3);
    this.root.add(southRail);

    // Support pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2c334d, roughness: 0.7 });
    const pillarGeo = new THREE.CylinderGeometry(1.4, 1.8, 12, 8);
    for (let x = -150; x <= 150; x += 50) {
      if (Math.abs(x) < 15) continue; // Keep central avenue clear
      const p = new THREE.Mesh(pillarGeo, pillarMat);
      p.position.set(x, 6, -110);
      this.root.add(p);
    }
  }

  buildDistrictBuildings() {
    // Carefully curated city blocks leaving roads and stunt flight corridors open
    const specs = [
      // Twin Cyber Towers framing Neon Boulevard (with Skybridge at y=36)
      { x: -25, z: 0, w: 20, d: 20, h: 68, color: 0x192340, accent: 0x00f2fe, hasHelipad: true },
      { x: 25, z: 0, w: 20, d: 20, h: 68, color: 0x192340, accent: 0x00f2fe, hasHelipad: true },

      // Downtown Core blocks
      { x: -55, z: 85, w: 26, d: 28, h: 42, color: 0x1f1b38, accent: 0xff007f, hasHelipad: true },
      { x: 55, z: 85, w: 26, d: 28, h: 38, color: 0x1b263b, accent: 0x00f5d4, hasHelipad: true },
      { x: -55, z: -25, w: 28, d: 24, h: 52, color: 0x221c35, accent: 0xffbe0b, hasHelipad: false },
      { x: 55, z: -25, w: 28, d: 24, h: 48, color: 0x1a243a, accent: 0xff007f, hasHelipad: true },

      // North Spire District (tall skyscraper canyon)
      { x: -34, z: -195, w: 24, d: 24, h: 82, color: 0x141e38, accent: 0x00f5d4, hasHelipad: true },
      { x: 34, z: -195, w: 24, d: 24, h: 78, color: 0x1e1836, accent: 0xff007f, hasHelipad: true },
      { x: 0, z: -245, w: 30, d: 26, h: 95, color: 0x16203a, accent: 0xffbe0b, hasHelipad: true },

      // West Harbor / Industrial District
      { x: -165, z: 80, w: 34, d: 28, h: 28, color: 0x23293a, accent: 0xff6b00, hasHelipad: false },
      { x: -165, z: -10, w: 32, d: 32, h: 36, color: 0x1d2436, accent: 0x00f2fe, hasHelipad: true },
      { x: -165, z: -190, w: 36, d: 30, h: 44, color: 0x251e38, accent: 0xffbe0b, hasHelipad: false },
      { x: -85, z: -195, w: 24, d: 26, h: 56, color: 0x182238, accent: 0x00f5d4, hasHelipad: false },

      // East Neon Plaza District
      { x: 165, z: 80, w: 30, d: 30, h: 34, color: 0x1e2038, accent: 0x00f5d4, hasHelipad: true },
      { x: 165, z: -10, w: 32, d: 28, h: 46, color: 0x241a38, accent: 0xff007f, hasHelipad: false },
      { x: 165, z: -190, w: 32, d: 32, h: 54, color: 0x17243c, accent: 0x00f2fe, hasHelipad: true },
      { x: 85, z: -195, w: 24, d: 26, h: 60, color: 0x201c38, accent: 0xffbe0b, hasHelipad: false },

      // South Entry Framing Towers
      { x: -50, z: 185, w: 26, d: 26, h: 35, color: 0x1a2238, accent: 0x00f5d4, hasHelipad: false },
      { x: 50, z: 185, w: 26, d: 26, h: 35, color: 0x221b38, accent: 0xff007f, hasHelipad: false },
    ];

    const windowTransforms = [];
    const dummy = new THREE.Object3D();

    for (const b of specs) {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mat = new THREE.MeshStandardMaterial({
        color: b.color,
        roughness: 0.45,
        metalness: 0.35,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.h * 0.5, b.z);
      this.root.add(mesh);

      // Glowing neon roofline trim
      const trimGeo = new THREE.BoxGeometry(b.w + 0.5, 0.7, b.d + 0.5);
      const trimMat = new THREE.MeshBasicMaterial({ color: b.accent });
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.set(b.x, b.h - 0.2, b.z);
      this.root.add(trim);

      // Collect instanced neon window bands along front/back faces
      for (let y = 6; y < b.h - 4; y += 6.5) {
        dummy.position.set(b.x, y, b.z + b.d * 0.5 + 0.08);
        dummy.scale.set(b.w * 0.78, 1.3, 0.1);
        dummy.updateMatrix();
        windowTransforms.push(dummy.matrix.clone());

        dummy.position.set(b.x, y, b.z - b.d * 0.5 - 0.08);
        dummy.updateMatrix();
        windowTransforms.push(dummy.matrix.clone());
      }

      if (b.hasHelipad) {
        const padMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
        const padRing = new THREE.Mesh(
          new THREE.RingGeometry(4.2, 5.2, 24),
          new THREE.MeshBasicMaterial({ color: 0xffbe0b, side: THREE.DoubleSide })
        );
        padRing.rotation.x = -Math.PI / 2;
        padRing.position.set(b.x, b.h + 0.08, b.z);
        this.root.add(padRing);

        const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 2.2, 8), padMat);
        beacon.position.set(b.x, b.h + 1.1, b.z);
        this.root.add(beacon);

        this.rooftopPads.push({
          x: b.x,
          y: b.h,
          z: b.z,
          radius: Math.min(b.w, b.d) * 0.45,
        });
      }

      this.buildings.push({
        x: b.x,
        z: b.z,
        w: b.w,
        d: b.d,
        h: b.h,
        minX: b.x - b.w * 0.5,
        maxX: b.x + b.w * 0.5,
        minZ: b.z - b.d * 0.5,
        maxZ: b.z + b.d * 0.5,
        hasHelipad: b.hasHelipad,
      });
    }

    // Twin Towers high-altitude Skybridge at z = 0, y = 40
    const bridgeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(30, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x1d2d50, metalness: 0.5, roughness: 0.3 })
    );
    bridgeMesh.position.set(0, 40, 0);
    this.root.add(bridgeMesh);

    // Single InstancedMesh for all building window strips (threejs-perf pattern)
    if (windowTransforms.length > 0) {
      const winGeo = new THREE.BoxGeometry(1, 1, 1);
      const winMat = new THREE.MeshBasicMaterial({ color: 0x64dfdf });
      const winInst = new THREE.InstancedMesh(winGeo, winMat, windowTransforms.length);
      for (let i = 0; i < windowTransforms.length; i++) {
        winInst.setMatrixAt(i, windowTransforms[i]);
      }
      winInst.instanceMatrix.needsUpdate = true;
      this.root.add(winInst);
    }
  }

  buildRamps() {
    // Ramps oriented along -Z or +Z or X to launch player into Flight corridors
    const rampConfigs = [
      // 1. Signature First-60-Seconds Central Launch Ramp right in front of spawn!
      { x: 0, z: 68, width: 10, length: 20, height: 5.5, dir: '-Z' },
      // 2. Second Central Mega Ramp toward Overpass & Skybridge
      { x: 0, z: -55, width: 10, length: 22, height: 7.0, dir: '-Z' },
      // 3. Southbound Return Mega Ramp
      { x: 8, z: -155, width: 9, length: 20, height: 6.5, dir: '+Z' },
      // 4. West Avenue Northbound Ramp
      { x: -120, z: 50, width: 10, length: 20, height: 6.0, dir: '-Z' },
      // 5. East Avenue Northbound Ramp
      { x: 120, z: 50, width: 10, length: 20, height: 6.0, dir: '-Z' },
      // 6. Overpass West Climb Ramp (connects ground to y=12 overpass)
      { x: -155, z: -110, width: 12, length: 34, height: 12.0, dir: '+X' },
      // 7. Overpass East Climb Ramp (connects ground to y=12 overpass)
      { x: 155, z: -110, width: 12, length: 34, height: 12.0, dir: '-X' },
      // 8. Harbor Jump Ramp
      { x: -120, z: -80, width: 10, length: 18, height: 6.0, dir: '-Z' },
    ];

    const rampMat = new THREE.MeshStandardMaterial({
      color: COLORS.RAMP_SURFACE,
      roughness: 0.4,
      metalness: 0.3,
    });
    const stripMat = new THREE.MeshBasicMaterial({ color: COLORS.RAMP_GLOW });

    for (const r of rampConfigs) {
      // Build a wedge geometry for visual clarity
      const group = new THREE.Group();
      const slopeAngle = Math.atan2(r.height, r.length);
      const hyp = Math.hypot(r.length, r.height);

      const plank = new THREE.Mesh(new THREE.BoxGeometry(r.width, 0.5, hyp), rampMat);
      plank.position.set(0, r.height * 0.5, 0);
      plank.rotation.x = slopeAngle;
      group.add(plank);

      const leftStrip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, hyp), stripMat);
      leftStrip.position.set(-r.width * 0.48, r.height * 0.5, 0);
      leftStrip.rotation.x = slopeAngle;
      group.add(leftStrip);

      const rightStrip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, hyp), stripMat);
      rightStrip.position.set(r.width * 0.48, r.height * 0.5, 0);
      rightStrip.rotation.x = slopeAngle;
      group.add(rightStrip);

      group.position.set(r.x, 0, r.z);
      if (r.dir === '+Z') group.rotation.y = Math.PI;
      if (r.dir === '+X') group.rotation.y = -Math.PI / 2;
      if (r.dir === '-X') group.rotation.y = Math.PI / 2;

      this.root.add(group);

      const halfW = (r.dir === '+X' || r.dir === '-X' ? r.length : r.width) * 0.5;
      const halfD = (r.dir === '+X' || r.dir === '-X' ? r.width : r.length) * 0.5;

      this.ramps.push({
        ...r,
        minX: r.x - halfW,
        maxX: r.x + halfW,
        minZ: r.z - halfD,
        maxZ: r.z + halfD,
        slope: r.height / r.length,
      });
    }
  }

  buildSkyRings() {
    const ringPositions = [
      // Ring 0: Right after the First-60-Seconds Central Launch Ramp!
      { x: 0, y: 12, z: 32 },
      // Ring 1: Between the Twin Cyber Towers under the Skybridge!
      { x: 0, y: 21, z: 0 },
      // Ring 2: High above the Skybridge!
      { x: 0, y: 48, z: -20 },
      // Ring 3: Above the Elevated Overpass
      { x: 0, y: 24, z: -90 },
      // Ring 4: North Spire Canyon
      { x: 0, y: 34, z: -175 },
      // Ring 5: High Spire Halo
      { x: 0, y: 65, z: -220 },
      // Ring 6 & 7: West Harbor flight line
      { x: -120, y: 18, z: 10 },
      { x: -120, y: 28, z: -125 },
      // Ring 8 & 9: East Avenue flight line
      { x: 120, y: 18, z: 10 },
      { x: 120, y: 28, z: -125 },
      // Ring 10 & 11: Cross-city banking rings
      { x: -60, y: 32, z: -60 },
      { x: 60, y: 32, z: -60 },
      // Ring 12 & 13: Rooftop hoppers
      { x: -55, y: 50, z: 85 },
      { x: 55, y: 46, z: 85 },
    ];

    const torusGeo = new THREE.TorusGeometry(5.2, 0.42, 12, 32);

    ringPositions.forEach((pos, idx) => {
      const color = idx % 2 === 0 ? COLORS.RING_GOLD : COLORS.RING_CYAN;
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(torusGeo, mat);
      mesh.position.set(pos.x, pos.y, pos.z);
      this.root.add(mesh);

      this.skyRings.push({
        id: idx,
        mesh,
        position: new THREE.Vector3(pos.x, pos.y, pos.z),
        radius: 6.2,
        cooldown: 0,
      });
    });
  }

  update(dt, elapsedTime = 0) {
    for (const ring of this.skyRings) {
      if (ring.cooldown > 0) {
        ring.cooldown = Math.max(0, ring.cooldown - dt);
        ring.mesh.scale.setScalar(0.5 + 0.5 * (1 - ring.cooldown / 6));
      } else {
        ring.mesh.scale.setScalar(1 + Math.sin(elapsedTime * 3 + ring.id) * 0.05);
      }
      ring.mesh.rotation.z += dt * 1.1;
    }
  }

  /**
   * Returns highest valid supporting surface under (x, z) near currentY
   */
  getSurfaceAt(x, z, currentY = 0) {
    let bestHeight = 0;
    let surfaceType = 'ground';
    let isRamp = false;
    let isRooftop = false;
    let rampSlope = 0;
    let rampDir = null;

    // 1. Check ramps
    for (const r of this.ramps) {
      if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) {
        let t = 0;
        if (r.dir === '-Z') t = (r.maxZ - z) / (r.maxZ - r.minZ);
        else if (r.dir === '+Z') t = (z - r.minZ) / (r.maxZ - r.minZ);
        else if (r.dir === '+X') t = (x - r.minX) / (r.maxX - r.minX);
        else if (r.dir === '-X') t = (r.maxX - x) / (r.maxX - r.minX);

        t = Math.max(0, Math.min(1, t));
        const h = t * r.height;
        if (currentY >= h - 2.5 && h >= bestHeight) {
          bestHeight = h;
          surfaceType = 'ramp';
          isRamp = true;
          rampSlope = r.slope;
          rampDir = r.dir;
        }
      }
    }

    // 2. Check elevated overpass decks
    for (const d of this.elevatedDecks) {
      if (x >= d.minX && x <= d.maxX && z >= d.minZ && z <= d.maxZ) {
        if (currentY >= d.height - 2.2 && d.height >= bestHeight) {
          bestHeight = d.height;
          surfaceType = 'overpass';
          isRamp = false;
        }
      }
    }

    // 3. Check building rooftops (landable from above!)
    for (const b of this.buildings) {
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
        if (currentY >= b.h - 2.0 && b.h >= bestHeight) {
          bestHeight = b.h;
          surfaceType = 'rooftop';
          isRooftop = true;
          isRamp = false;
        }
      }
    }

    return {
      height: bestHeight,
      surfaceType,
      isRamp,
      isRooftop,
      rampSlope,
      rampDir,
    };
  }

  /**
   * Resolves horizontal AABB collision against buildings (when below roof height)
   * and computes closest distance to any building for Close Call detection.
   */
  resolveHorizontalCollision(position, radius = 1.8) {
    let collided = false;
    let minDistance = Infinity;
    let hitBuilding = null;

    for (const b of this.buildings) {
      // If vehicle is clearly above the building roof, no wall collision
      if (position.y >= b.h - 0.8) continue;

      const clampedX = Math.max(b.minX, Math.min(position.x, b.maxX));
      const clampedZ = Math.max(b.minZ, Math.min(position.z, b.maxZ));
      const dx = position.x - clampedX;
      const dz = position.z - clampedZ;
      const distSq = dx * dx + dz * dz;
      const dist = Math.sqrt(distSq);

      if (dist < minDistance) {
        minDistance = dist;
      }

      if (dist < radius) {
        collided = true;
        hitBuilding = b;
        // Push out along shortest penetration axis
        const penLeft = Math.abs(position.x - b.minX);
        const penRight = Math.abs(b.maxX - position.x);
        const penFront = Math.abs(position.z - b.minZ);
        const penBack = Math.abs(b.maxZ - position.z);
        const minPen = Math.min(penLeft, penRight, penFront, penBack);

        if (minPen === penLeft) position.x = b.minX - radius;
        else if (minPen === penRight) position.x = b.maxX + radius;
        else if (minPen === penFront) position.z = b.minZ - radius;
        else position.z = b.maxZ + radius;
      }
    }

    return {
      collided,
      minDistance,
      hitBuilding,
    };
  }
}
