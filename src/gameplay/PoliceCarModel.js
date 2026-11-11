import * as THREE from 'three';
import { COLORS, VISUALS } from '../core/Constants.js';

/**
 * Metro Police interceptor: same sports-car proportions as the player's jet-coupe, in a classic
 * black-and-white livery with a roof light bar, push bar, POLICE door decals, and the same
 * retractable wings + twin thrusters so units can chase the player into the sky.
 * Geometries and materials are shared between all units (built once, lazily).
 */
let shared = null;

function makeDecalTexture(text) {
  if (typeof document === 'undefined') return null; // node tests: skip canvas decals
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#14254f';
  ctx.font = 'bold 44px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function getShared() {
  if (shared) return shared;
  const tireGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.32, 16);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.34, 10);
  rimGeo.rotateZ(Math.PI / 2);
  const nozzleGeo = new THREE.CylinderGeometry(0.24, 0.3, 0.45, 12);
  nozzleGeo.rotateX(Math.PI / 2);
  const flameGeo = new THREE.ConeGeometry(0.22, 1.5, 12);
  flameGeo.rotateX(Math.PI / 2);
  const decal = makeDecalTexture('POLICE');

  shared = {
    geo: {
      splitter: new THREE.BoxGeometry(2.25, 0.22, 4.7),
      body: new THREE.BoxGeometry(2.1, 0.48, 4.4),
      nose: new THREE.BoxGeometry(1.92, 0.34, 1.35),
      pod: new THREE.BoxGeometry(0.28, 0.42, 2.8),
      door: new THREE.BoxGeometry(0.04, 0.4, 2.0),
      cabin: new THREE.BoxGeometry(1.55, 0.46, 2.05),
      roof: new THREE.BoxGeometry(1.35, 0.06, 1.3),
      barBase: new THREE.BoxGeometry(1.5, 0.1, 0.38),
      strobe: new THREE.BoxGeometry(0.66, 0.16, 0.32),
      pushBar: new THREE.BoxGeometry(1.6, 0.36, 0.14),
      pushPost: new THREE.BoxGeometry(0.1, 0.36, 0.3),
      headlight: new THREE.BoxGeometry(0.55, 0.1, 0.12),
      tailBar: new THREE.BoxGeometry(1.98, 0.14, 0.1),
      spoiler: new THREE.BoxGeometry(2.0, 0.08, 0.36),
      strut: new THREE.BoxGeometry(0.1, 0.3, 0.26),
      wing: new THREE.BoxGeometry(2.3, 0.1, 1.35),
      wingTip: new THREE.BoxGeometry(2.35, 0.12, 0.16),
      halo: new THREE.SphereGeometry(VISUALS.POLICE_HALO_RADIUS, 12, 8),
      tire: tireGeo,
      rim: rimGeo,
      nozzle: nozzleGeo,
      flame: flameGeo,
    },
    mat: {
      black: new THREE.MeshPhysicalMaterial({
        color: COLORS.POLICE_DOORS,
        metalness: 0.35,
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
      }),
      white: new THREE.MeshPhysicalMaterial({ color: COLORS.POLICE_BODY, metalness: 0.15, roughness: 0.32, clearcoat: 1 }),
      decal: new THREE.MeshStandardMaterial({ color: 0xffffff, map: decal, roughness: 0.4 }),
      chassis: new THREE.MeshStandardMaterial({ color: COLORS.CAR_CHASSIS, metalness: 0.4, roughness: 0.5 }),
      glass: new THREE.MeshPhysicalMaterial({ color: COLORS.CAR_GLASS, metalness: 0.1, roughness: 0.05, clearcoat: 1 }),
      tire: new THREE.MeshStandardMaterial({ color: COLORS.CAR_TIRE, roughness: 0.8 }),
      rim: new THREE.MeshStandardMaterial({ color: 0xc9ced8, metalness: 0.8, roughness: 0.25 }),
      headlight: new THREE.MeshBasicMaterial({ color: 0xe0fbfc }),
      tail: new THREE.MeshBasicMaterial({ color: COLORS.TAIL_LIGHT }),
      red: new THREE.MeshBasicMaterial({ color: COLORS.POLICE_RED }),
      blue: new THREE.MeshBasicMaterial({ color: COLORS.POLICE_BLUE }),
      redHalo: new THREE.MeshBasicMaterial({
        color: COLORS.POLICE_RED,
        transparent: true,
        opacity: VISUALS.POLICE_HALO_OPACITY,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      blueHalo: new THREE.MeshBasicMaterial({
        color: COLORS.POLICE_BLUE,
        transparent: true,
        opacity: VISUALS.POLICE_HALO_OPACITY,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      flame: new THREE.MeshBasicMaterial({ color: COLORS.POLICE_BLUE }),
    },
  };
  return shared;
}

export function buildPoliceCar() {
  const { geo, mat } = getShared();
  const group = new THREE.Group();
  const add = (g, m, x, y, z, rx = 0) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    group.add(mesh);
    return mesh;
  };

  // Body: black-and-white interceptor livery on the same wedge silhouette as the player car
  add(geo.splitter, mat.chassis, 0, 0.28, 0);
  add(geo.body, mat.black, 0, 0.56, 0.05);
  add(geo.nose, mat.black, 0, 0.52, -1.75, 0.16);
  add(geo.pod, mat.white, -1.05, 0.55, 0.1);
  add(geo.pod, mat.white, 1.05, 0.55, 0.1);
  add(geo.door, mat.decal, -1.2, 0.56, 0.1).rotation.y = 0;
  const rightDoor = add(geo.door, mat.decal, 1.2, 0.56, 0.1);
  rightDoor.rotation.y = Math.PI; // decal reads correctly on both sides
  add(geo.cabin, mat.glass, 0, 0.95, -0.05);
  add(geo.roof, mat.white, 0, 1.2, -0.05);

  // Roof light bar (red left / blue right) with additive halos
  add(geo.barBase, mat.chassis, 0, 1.27, 0);
  const leftStrobe = add(geo.strobe, mat.red, -0.36, 1.38, 0);
  const rightStrobe = add(geo.strobe, mat.blue, 0.36, 1.38, 0);
  leftStrobe.add(new THREE.Mesh(geo.halo, mat.redHalo));
  rightStrobe.add(new THREE.Mesh(geo.halo, mat.blueHalo));

  // Push bar, lights, spoiler
  add(geo.pushBar, mat.chassis, 0, 0.42, -2.48);
  add(geo.pushPost, mat.chassis, -0.55, 0.42, -2.36);
  add(geo.pushPost, mat.chassis, 0.55, 0.42, -2.36);
  add(geo.headlight, mat.headlight, -0.68, 0.58, -2.35);
  add(geo.headlight, mat.headlight, 0.68, 0.58, -2.35);
  add(geo.tailBar, mat.tail, 0, 0.68, 2.26);
  add(geo.spoiler, mat.black, 0, 1.08, 1.98);
  add(geo.strut, mat.chassis, -0.7, 0.92, 1.95);
  add(geo.strut, mat.chassis, 0.7, 0.92, 1.95);

  // Retractable wings for air pursuit
  const leftWing = new THREE.Group();
  const lw = new THREE.Mesh(geo.wing, mat.black);
  lw.position.set(-1.1, 0, 0);
  const lwt = new THREE.Mesh(geo.wingTip, mat.white);
  lwt.position.set(-1.1, 0, -0.62);
  leftWing.add(lw, lwt);
  leftWing.position.set(-0.2, 0.58, 0.25);
  group.add(leftWing);
  const rightWing = new THREE.Group();
  const rw = new THREE.Mesh(geo.wing, mat.black);
  rw.position.set(1.1, 0, 0);
  const rwt = new THREE.Mesh(geo.wingTip, mat.white);
  rwt.position.set(1.1, 0, -0.62);
  rightWing.add(rw, rwt);
  rightWing.position.set(0.2, 0.58, 0.25);
  group.add(rightWing);

  // Twin jet nozzles + flames (blue police thrust)
  const flames = [];
  for (const x of [-0.52, 0.52]) {
    add(geo.nozzle, mat.chassis, x, 0.48, 2.28);
    const flame = add(geo.flame, mat.flame, x, 0.48, 3.05);
    flames.push(flame);
  }

  // Wheels with silver rims
  const wheels = [];
  for (const [x, z] of [
    [-1.12, -1.38],
    [1.12, -1.38],
    [-1.12, 1.38],
    [1.12, 1.38],
  ]) {
    const wheel = new THREE.Group();
    wheel.add(new THREE.Mesh(geo.tire, mat.tire), new THREE.Mesh(geo.rim, mat.rim));
    wheel.position.set(x, 0.4, z);
    group.add(wheel);
    wheels.push(wheel);
  }

  const model = {
    group,
    leftStrobe,
    rightStrobe,
    wheels,
    leftWing,
    rightWing,
    flames,
    /** 0 = wings folded, wheels down · 1 = wings out, thrusters lit */
    setFlight(deploy) {
      const w = 0.15 + 0.85 * deploy;
      leftWing.scale.x = w;
      rightWing.scale.x = w;
      for (const flame of flames) {
        const f = 0.2 + deploy * 1.1;
        flame.scale.set(0.55 + f * 0.35, 0.55 + f * 0.35, 0.25 + f * 1.15);
        flame.visible = deploy > 0.05;
      }
    },
  };
  model.setFlight(0);
  return model;
}
