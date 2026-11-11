import * as THREE from 'three';
import { COLORS, GAME, VISUALS } from '../core/Constants.js';

const AVENUES_X = [-120, 0, 120];
const STREETS_Z = [-160, -60, 40, 140];
const AVENUE_HALF_WIDTH = 12;
const STREET_HALF_WIDTH = 11;
const ROAD_LENGTH = 640;

/** Seeded PRNG so decorative scenery is identical every session (and in tests). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
    this.buildScenery();
  }

  buildLightingAndSky() {
    // Sky dome, sun disc & stars live in AtmosphereSystem; fog matches its horizon for seamless haze
    this.scene.background = new THREE.Color(VISUALS.SKY.HORIZON);
    this.scene.fog = new THREE.Fog(COLORS.FOG, VISUALS.FOG_NEAR, VISUALS.FOG_FAR);

    const hemi = new THREE.HemisphereLight(COLORS.AMBIENT_LIGHT, COLORS.HEMI_GROUND, VISUALS.HEMI_INTENSITY);
    this.root.add(hemi);

    const sun = new THREE.DirectionalLight(COLORS.SUN_LIGHT, VISUALS.SUN_INTENSITY);
    sun.position.set(...VISUALS.SUN_LIGHT_POSITION);
    this.root.add(sun);

    // Warm golden rim light from the visible sunset direction
    const rimLight = new THREE.DirectionalLight(COLORS.SUN_RIM_LIGHT, VISUALS.RIM_INTENSITY);
    rimLight.position.set(...VISUALS.SKY.SUN_DIRECTION.map((v) => v * 300));
    this.root.add(rimLight);
  }

  buildGroundAndRoads() {
    const groundMat = new THREE.MeshStandardMaterial({ color: COLORS.GRASS, roughness: 0.95, metalness: 0 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(VISUALS.GROUND_SIZE, VISUALS.GROUND_SIZE), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    this.root.add(ground);

    const roadMat = new THREE.MeshStandardMaterial({ color: COLORS.ROAD_ASPHALT, roughness: 0.75, metalness: 0.05 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: COLORS.SIDEWALK, roughness: 0.85, metalness: 0 });
    const edgeLineMat = new THREE.MeshBasicMaterial({ color: COLORS.ROAD_LINE_WHITE });
    const amberLineMat = new THREE.MeshBasicMaterial({ color: COLORS.ROAD_LINE_AMBER });
    const sw = VISUALS.SIDEWALK_WIDTH;

    // North-South Avenues with light sidewalks and neon edge strips
    for (const x of AVENUES_X) {
      const road = new THREE.Mesh(new THREE.BoxGeometry(AVENUE_HALF_WIDTH * 2, 0.1, ROAD_LENGTH), roadMat);
      road.position.set(x, 0, 0);
      this.root.add(road);

      for (const side of [-1, 1]) {
        const walk = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.08, ROAD_LENGTH), sidewalkMat);
        walk.position.set(x + side * (AVENUE_HALF_WIDTH + sw * 0.5), -0.01, 0);
        this.root.add(walk);

        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, ROAD_LENGTH), edgeLineMat);
        edge.position.set(x + side * (AVENUE_HALF_WIDTH - 0.6), 0.02, 0);
        this.root.add(edge);
      }
    }

    // East-West Cross Streets
    for (const z of STREETS_Z) {
      const street = new THREE.Mesh(new THREE.BoxGeometry(ROAD_LENGTH, 0.1, STREET_HALF_WIDTH * 2), roadMat);
      street.position.set(0, 0.01, z);
      this.root.add(street);

      for (const side of [-1, 1]) {
        const walk = new THREE.Mesh(new THREE.BoxGeometry(ROAD_LENGTH, 0.08, sw), sidewalkMat);
        walk.position.set(0, -0.02, z + side * (STREET_HALF_WIDTH + sw * 0.5));
        this.root.add(walk);
      }

      const centerLine = new THREE.Mesh(new THREE.BoxGeometry(ROAD_LENGTH, 0.14, 0.35), amberLineMat);
      centerLine.position.set(0, 0.03, z);
      this.root.add(centerLine);
    }

    // Instanced dashed center lines along Neon Boulevard
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

    this.buildKerbs();
  }

  buildKerbs() {
    // Red/white racing kerbs along every avenue edge (skipping cross-street intersections)
    const len = VISUALS.KERB_LENGTH;
    const transforms = [];
    for (const x of AVENUES_X) {
      for (const side of [-1, 1]) {
        let idx = 0;
        for (let z = -ROAD_LENGTH / 2 + len / 2; z < ROAD_LENGTH / 2; z += len, idx++) {
          if (STREETS_Z.some((sz) => Math.abs(z - sz) < STREET_HALF_WIDTH + VISUALS.SIDEWALK_WIDTH + len * 0.5)) continue;
          transforms.push({ x: x + side * (AVENUE_HALF_WIDTH + 0.45), z, red: idx % 2 === 0 });
        }
      }
    }
    const kerbs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.9, 0.22, len),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
      transforms.length
    );
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    transforms.forEach((t, i) => {
      m.makeTranslation(t.x, 0.06, t.z);
      kerbs.setMatrixAt(i, m);
      kerbs.setColorAt(i, c.setHex(t.red ? COLORS.KERB_RED : COLORS.KERB_WHITE));
    });
    kerbs.instanceMatrix.needsUpdate = true;
    this.root.add(kerbs);
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
      color: COLORS.OVERPASS_DECK,
      roughness: 0.6,
      metalness: 0.15,
    });
    const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(360, 1.2, 22), deckMat);
    deckMesh.position.set(0, 11.4, -110);
    this.root.add(deckMesh);

    const railMat = new THREE.MeshStandardMaterial({ color: COLORS.ROAD_LINE_WHITE, roughness: 0.6 });
    const northRail = new THREE.Mesh(new THREE.BoxGeometry(360, 0.6, 0.4), railMat);
    northRail.position.set(0, 12.3, -120.7);
    this.root.add(northRail);

    const southRail = new THREE.Mesh(new THREE.BoxGeometry(360, 0.6, 0.4), railMat);
    southRail.position.set(0, 12.3, -99.3);
    this.root.add(southRail);

    // Support pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: COLORS.OVERPASS_PILLAR, roughness: 0.8 });
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
      { x: -25, z: 0, w: 20, d: 20, h: 68, twin: true, accent: 0x00f2fe, hasHelipad: true },
      { x: 25, z: 0, w: 20, d: 20, h: 68, twin: true, accent: 0x00f2fe, hasHelipad: true },

      // Downtown Core blocks
      { x: -55, z: 85, w: 26, d: 28, h: 42, accent: 0xff007f, hasHelipad: true },
      { x: 55, z: 85, w: 26, d: 28, h: 38, accent: 0x00f5d4, hasHelipad: true },
      { x: -55, z: -25, w: 28, d: 24, h: 52, accent: 0xffbe0b, hasHelipad: false },
      { x: 55, z: -25, w: 28, d: 24, h: 48, accent: 0xff007f, hasHelipad: true },

      // North Spire District (tall skyscraper canyon flanking Neon Boulevard)
      { x: -34, z: -195, w: 24, d: 24, h: 82, accent: 0x00f5d4, hasHelipad: true },
      { x: 34, z: -195, w: 24, d: 24, h: 78, accent: 0xff007f, hasHelipad: true },
      { x: -42, z: -260, w: 28, d: 26, h: 95, accent: 0xffbe0b, hasHelipad: true },
      { x: 42, z: -260, w: 28, d: 26, h: 92, accent: 0x00f2fe, hasHelipad: true },

      // West Harbor / Industrial District
      { x: -165, z: 80, w: 34, d: 28, h: 28, accent: 0xff6b00, hasHelipad: false },
      { x: -165, z: -10, w: 32, d: 32, h: 36, accent: 0x00f2fe, hasHelipad: true },
      { x: -165, z: -190, w: 36, d: 30, h: 44, accent: 0xffbe0b, hasHelipad: false },
      { x: -85, z: -195, w: 24, d: 26, h: 56, accent: 0x00f5d4, hasHelipad: false },

      // East Neon Plaza District
      { x: 165, z: 80, w: 30, d: 30, h: 34, accent: 0x00f5d4, hasHelipad: true },
      { x: 165, z: -10, w: 32, d: 28, h: 46, accent: 0xff007f, hasHelipad: false },
      { x: 165, z: -190, w: 32, d: 32, h: 54, accent: 0x00f2fe, hasHelipad: true },
      { x: 85, z: -195, w: 24, d: 26, h: 60, accent: 0xffbe0b, hasHelipad: false },

      // South Entry Framing Towers
      { x: -50, z: 185, w: 26, d: 26, h: 35, accent: 0x00f5d4, hasHelipad: false },
      { x: 50, z: 185, w: 26, d: 26, h: 35, accent: 0xff007f, hasHelipad: false },
    ];

    const windowTransforms = [];
    const windowColors = [];
    const dummy = new THREE.Object3D();
    const plazaMat = new THREE.MeshStandardMaterial({ color: COLORS.PLAZA, roughness: 0.85 });
    const palette = VISUALS.BUILDING_PALETTE;

    specs.forEach((b, i) => {
      const isTwinTower = Boolean(b.twin);
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mat = new THREE.MeshStandardMaterial({
        color: isTwinTower ? VISUALS.TWIN_TOWER_COLOR : palette[i % palette.length],
        roughness: VISUALS.BUILDING_ROUGHNESS,
        metalness: VISUALS.BUILDING_METALNESS,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.h * 0.5, b.z);
      this.root.add(mesh);

      // Light concrete plaza around each tower base
      const plaza = new THREE.Mesh(new THREE.BoxGeometry(b.w + 10, 0.1, b.d + 10), plazaMat);
      plaza.position.set(b.x, -0.03, b.z);
      this.root.add(plaza);

      // Glowing neon roofline trim
      const trimGeo = new THREE.BoxGeometry(b.w + 0.5, 0.7, b.d + 0.5);
      const trimMat = new THREE.MeshStandardMaterial({ color: COLORS.ROOF_TRIM, roughness: 0.5 });
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.set(b.x, b.h - 0.2, b.z);
      this.root.add(trim);

      // Instanced glass window bands on all four faces (sky-blue glass or warm lit offices)
      const bandColor = i % 3 === 0 ? COLORS.WINDOW_WARM : COLORS.WINDOW_GLASS;
      for (let y = 6; y < b.h - 4; y += 6.5) {
        for (const side of [-1, 1]) {
          dummy.position.set(b.x, y, b.z + side * (b.d * 0.5 + 0.08));
          dummy.scale.set(b.w * 0.78, 1.3, 0.1);
          dummy.updateMatrix();
          windowTransforms.push(dummy.matrix.clone());
          windowColors.push(bandColor);

          dummy.position.set(b.x + side * (b.w * 0.5 + 0.08), y, b.z);
          dummy.scale.set(0.1, 1.3, b.d * 0.78);
          dummy.updateMatrix();
          windowTransforms.push(dummy.matrix.clone());
          windowColors.push(bandColor);
        }
      }

      if (b.hasHelipad) {
        const padMat = new THREE.MeshBasicMaterial({ color: COLORS.ROAD_LINE_CYAN });
        const padRing = new THREE.Mesh(
          new THREE.RingGeometry(4.2, 5.2, 24),
          new THREE.MeshBasicMaterial({ color: COLORS.RING_GOLD, side: THREE.DoubleSide })
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
    });

    // Twin Towers high-altitude Skybridge at z = 0, y = 40
    const bridgeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(30, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: COLORS.SKYBRIDGE, metalness: 0.3, roughness: 0.25 })
    );
    bridgeMesh.position.set(0, 40, 0);
    this.root.add(bridgeMesh);

    // Single InstancedMesh for all building window strips (threejs-perf pattern)
    if (windowTransforms.length > 0) {
      const winGeo = new THREE.BoxGeometry(1, 1, 1);
      const winMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const winInst = new THREE.InstancedMesh(winGeo, winMat, windowTransforms.length);
      const winColor = new THREE.Color();
      for (let i = 0; i < windowTransforms.length; i++) {
        winInst.setMatrixAt(i, windowTransforms[i]);
        winInst.setColorAt(i, winColor.setHex(windowColors[i]));
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

  /**
   * Decorative low-poly scenery (no collision): mountain ring on the horizon, trees on
   * open grass between blocks, and desert boulders on the outskirts.
   */
  buildScenery() {
    const rng = mulberry32(VISUALS.SCENERY_SEED);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];

    // 1. Mountain ring
    const mtn = VISUALS.MOUNTAINS;
    const mountains = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 1, 6, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }),
      mtn.COUNT
    );
    for (let i = 0; i < mtn.COUNT; i++) {
      const angle = (i / mtn.COUNT) * Math.PI * 2 + rng() * 0.12;
      const r = mtn.MIN_RADIUS + rng() * (mtn.MAX_RADIUS - mtn.MIN_RADIUS);
      const h = mtn.MIN_HEIGHT + rng() * (mtn.MAX_HEIGHT - mtn.MIN_HEIGHT);
      const width = h * (0.75 + rng() * 0.55);
      dummy.position.set(Math.cos(angle) * r, h * 0.5 - 4, Math.sin(angle) * r);
      dummy.rotation.set(0, rng() * Math.PI, 0);
      dummy.scale.set(width, h, width * (0.8 + rng() * 0.4));
      dummy.updateMatrix();
      mountains.setMatrixAt(i, dummy.matrix);
      mountains.setColorAt(i, color.setHex(pick(mtn.COLORS)));
    }
    this.root.add(mountains);

    // 2. Trees on open grass (rejects roads, sidewalks, building plazas, ramps & overpass)
    const tr = VISUALS.TREES;
    const clear = tr.CLEARANCE;
    const isBlocked = (x, z) => {
      if (Math.hypot(x - 0, z - 120) < 30) return true; // spawn area
      if (AVENUES_X.some((ax) => Math.abs(x - ax) < AVENUE_HALF_WIDTH + VISUALS.SIDEWALK_WIDTH + clear)) return true;
      if (STREETS_Z.some((sz) => Math.abs(z - sz) < STREET_HALF_WIDTH + VISUALS.SIDEWALK_WIDTH + clear)) return true;
      const inBox = (o, pad) => x > o.minX - pad && x < o.maxX + pad && z > o.minZ - pad && z < o.maxZ + pad;
      if (this.buildings.some((b) => inBox(b, 5 + clear))) return true;
      if (this.ramps.some((r) => inBox(r, clear))) return true;
      if (this.elevatedDecks.some((d) => inBox(d, clear))) return true;
      return false;
    };
    const treeSpots = [];
    for (let attempt = 0; attempt < tr.COUNT * 12 && treeSpots.length < tr.COUNT; attempt++) {
      const x = (rng() * 2 - 1) * tr.AREA;
      const z = (rng() * 2 - 1) * tr.AREA;
      if (!isBlocked(x, z)) treeSpots.push({ x, z, s: 0.8 + rng() * 0.9 });
    }
    const trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.35, 0.55, 3, 5),
      new THREE.MeshStandardMaterial({ color: tr.TRUNK_COLOR, roughness: 0.9, flatShading: true }),
      treeSpots.length
    );
    const crowns = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(2.6, 0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }),
      treeSpots.length
    );
    treeSpots.forEach((t, i) => {
      dummy.rotation.set(0, rng() * Math.PI, 0);
      dummy.position.set(t.x, 1.5 * t.s, t.z);
      dummy.scale.setScalar(t.s);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      dummy.position.set(t.x, 4.6 * t.s, t.z);
      dummy.scale.set(t.s, t.s * (1 + rng() * 0.4), t.s);
      dummy.updateMatrix();
      crowns.setMatrixAt(i, dummy.matrix);
      crowns.setColorAt(i, color.setHex(pick(tr.COLORS)));
    });
    this.root.add(trunks, crowns);

    // 3. Desert boulders on the outskirts
    const rk = VISUALS.ROCKS;
    const rocks = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }),
      rk.COUNT
    );
    for (let i = 0; i < rk.COUNT; i++) {
      let x = 0;
      let z = 0;
      for (let tries = 0; tries < 20; tries++) {
        const angle = rng() * Math.PI * 2;
        const r = rk.MIN_RADIUS + rng() * (rk.MAX_RADIUS - rk.MIN_RADIUS);
        x = Math.cos(angle) * r;
        z = Math.sin(angle) * r;
        if (!isBlocked(x, z)) break;
      }
      const size = 2 + rng() * 6;
      dummy.position.set(x, size * 0.25, z);
      dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      dummy.scale.set(size * (1 + rng() * 0.6), size * (0.6 + rng() * 0.3), size);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
      rocks.setColorAt(i, color.setHex(pick(rk.COLORS)));
    }
    this.root.add(rocks);
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
