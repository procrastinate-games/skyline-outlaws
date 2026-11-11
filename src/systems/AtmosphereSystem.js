import * as THREE from 'three';
import { VISUALS } from '../core/Constants.js';

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uUpper;
  uniform vec3 uHorizon;
  uniform vec3 uBelow;
  uniform vec3 uGlow;
  uniform vec3 uSunCore;
  uniform vec3 uSunDir;
  uniform float uSunDiscCos;
  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;
    vec3 col = mix(uHorizon, uUpper, smoothstep(0.0, 0.32, h));
    col = mix(col, uTop, smoothstep(0.28, 0.9, h));
    col = mix(col, uBelow, smoothstep(0.0, -0.2, h));

    float s = max(dot(dir, normalize(uSunDir)), 0.0);
    col += uGlow * (pow(s, 6.0) * 0.45 + pow(s, 48.0) * 0.55);
    col = mix(col, uSunCore, smoothstep(uSunDiscCos - 0.0008, uSunDiscCos, s));

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Seeded PRNG so the decorative sky layout is identical every session. */
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

/** Soft round glow sprite generated in code (no external assets, no DOM canvas). */
function createGlowTexture(size = 32) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
      const a = Math.pow(1 - d, 2.2);
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(a * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Visual-only atmosphere: golden-hour sky dome with sun and stars that follow the camera,
 * drifting low-poly clouds, and ambient floating sparkles around the player.
 */
export class AtmosphereSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.rng = mulberry32(VISUALS.SCENERY_SEED + 7);

    this.glowTexture = createGlowTexture();
    this.skyGroup = new THREE.Group();
    this.scene.add(this.skyGroup);

    this.buildSkyDome();
    this.buildStars();
    this.buildClouds();
    this.buildSparkles();
  }

  buildSkyDome() {
    const sky = VISUALS.SKY;
    const sunDir = new THREE.Vector3(...sky.SUN_DIRECTION).normalize();
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color(sky.TOP) },
        uUpper: { value: new THREE.Color(sky.UPPER) },
        uHorizon: { value: new THREE.Color(sky.HORIZON) },
        uBelow: { value: new THREE.Color(sky.BELOW) },
        uGlow: { value: new THREE.Color(sky.GLOW) },
        uSunCore: { value: new THREE.Color(sky.SUN_CORE) },
        uSunDir: { value: sunDir },
        uSunDiscCos: { value: sky.SUN_DISC_COS },
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(sky.RADIUS, 48, 24), this.skyMaterial);
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    this.skyGroup.add(dome);
  }

  buildStars() {
    const sky = VISUALS.SKY;
    if (!sky.STAR_COUNT) return;
    const positions = new Float32Array(sky.STAR_COUNT * 3);
    const r = sky.RADIUS * 0.95;
    for (let i = 0; i < sky.STAR_COUNT; i++) {
      const y = sky.STAR_MIN_ELEVATION + this.rng() * (1 - sky.STAR_MIN_ELEVATION);
      const theta = this.rng() * Math.PI * 2;
      const ring = Math.sqrt(1 - y * y);
      positions[i * 3] = Math.cos(theta) * ring * r;
      positions[i * 3 + 1] = y * r;
      positions[i * 3 + 2] = Math.sin(theta) * ring * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: sky.STAR_SIZE * 1.6,
      sizeAttenuation: false,
      map: this.glowTexture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      fog: false,
    });
    const stars = new THREE.Points(geo, this.starMaterial);
    stars.renderOrder = -9;
    stars.frustumCulled = false;
    this.skyGroup.add(stars);
  }

  buildClouds() {
    const cfg = VISUALS.CLOUDS;
    const puffGeo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: cfg.COLOR,
      emissive: cfg.EMISSIVE,
      emissiveIntensity: 0.25,
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });
    const count = cfg.COUNT * cfg.PUFFS_PER_CLOUD;
    this.clouds = new THREE.InstancedMesh(puffGeo, mat, count);
    this.clouds.frustumCulled = false;
    this.cloudCenters = [];
    this.cloudPuffs = [];

    for (let c = 0; c < cfg.COUNT; c++) {
      this.cloudCenters.push(
        new THREE.Vector3(
          (this.rng() * 2 - 1) * cfg.SPREAD,
          cfg.MIN_Y + this.rng() * (cfg.MAX_Y - cfg.MIN_Y),
          (this.rng() * 2 - 1) * cfg.SPREAD
        )
      );
      const size = cfg.SIZE_MIN + this.rng() * (cfg.SIZE_MAX - cfg.SIZE_MIN);
      for (let p = 0; p < cfg.PUFFS_PER_CLOUD; p++) {
        const t = p / (cfg.PUFFS_PER_CLOUD - 1) - 0.5;
        this.cloudPuffs.push({
          cloud: c,
          offset: new THREE.Vector3(t * size * 2.4, (this.rng() - 0.3) * size * 0.35, (this.rng() - 0.5) * size * 0.8),
          scale: new THREE.Vector3(size * (0.7 + this.rng() * 0.5), size * (0.45 + this.rng() * 0.25), size * (0.6 + this.rng() * 0.4)),
          rotY: this.rng() * Math.PI,
        });
      }
    }
    this.cloudDummy = new THREE.Object3D();
    this.updateClouds(0);
    this.scene.add(this.clouds);
  }

  updateClouds(dt) {
    const cfg = VISUALS.CLOUDS;
    for (const center of this.cloudCenters) {
      center.x += cfg.DRIFT_SPEED * dt;
      if (center.x > cfg.SPREAD) center.x -= cfg.SPREAD * 2;
    }
    for (let i = 0; i < this.cloudPuffs.length; i++) {
      const puff = this.cloudPuffs[i];
      const center = this.cloudCenters[puff.cloud];
      this.cloudDummy.position.copy(center).add(puff.offset);
      this.cloudDummy.scale.copy(puff.scale);
      this.cloudDummy.rotation.set(0, puff.rotY, 0);
      this.cloudDummy.updateMatrix();
      this.clouds.setMatrixAt(i, this.cloudDummy.matrix);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  buildSparkles() {
    const cfg = VISUALS.SPARKLES;
    const positions = new Float32Array(cfg.COUNT * 3);
    const colors = new Float32Array(cfg.COUNT * 3);
    const color = new THREE.Color();
    for (let i = 0; i < cfg.COUNT; i++) {
      positions[i * 3] = (this.rng() - 0.5) * cfg.BOX;
      positions[i * 3 + 1] = this.rng() * cfg.BOX * 0.5;
      positions[i * 3 + 2] = (this.rng() - 0.5) * cfg.BOX;
      color.setHex(cfg.COLORS[i % cfg.COLORS.length]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    this.sparkleOffsets = positions;
    const geo = new THREE.BufferGeometry();
    this.sparklePositions = new Float32Array(positions.length);
    geo.setAttribute('position', new THREE.BufferAttribute(this.sparklePositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.sparkles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: cfg.SIZE,
        map: this.glowTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.sparkles.frustumCulled = false;
    this.scene.add(this.sparkles);
    this.updateSparkles(0, 0);
  }

  updateSparkles(dt, elapsed) {
    const cfg = VISUALS.SPARKLES;
    const half = cfg.BOX * 0.5;
    const p = this.player.position;
    const off = this.sparkleOffsets;
    const out = this.sparklePositions;
    for (let i = 0; i < cfg.COUNT; i++) {
      off[i * 3 + 1] += cfg.RISE_SPEED * dt;
      if (off[i * 3 + 1] > half) off[i * 3 + 1] -= half;
      // Wrap each sparkle into a box centered on the player so the air always shimmers nearby
      const wx = ((((off[i * 3] - p.x) % cfg.BOX) + cfg.BOX * 1.5) % cfg.BOX) - half;
      const wz = ((((off[i * 3 + 2] - p.z) % cfg.BOX) + cfg.BOX * 1.5) % cfg.BOX) - half;
      out[i * 3] = p.x + wx + Math.sin(elapsed * 0.8 + i) * 0.6;
      out[i * 3 + 1] = Math.max(0.6, p.y - 4) + off[i * 3 + 1];
      out[i * 3 + 2] = p.z + wz;
    }
    this.sparkles.geometry.attributes.position.needsUpdate = true;
  }

  update(dt, elapsed, cameraPosition) {
    if (cameraPosition) this.skyGroup.position.copy(cameraPosition);
    this.updateClouds(dt);
    this.updateSparkles(dt, elapsed);
    if (this.starMaterial) this.starMaterial.opacity = 0.7 + Math.sin(elapsed * 1.7) * 0.15;
  }
}
