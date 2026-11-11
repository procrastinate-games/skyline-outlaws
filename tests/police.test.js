// Police pursuit: car model, air pursuit, line of sight and fair escape balance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { eventBus } from '../src/core/EventBus.js';
import { gameState } from '../src/core/GameState.js';
import { POLICE } from '../src/core/Constants.js';
import { CityBuilder } from '../src/level/CityBuilder.js';
import { PlayerVehicle } from '../src/gameplay/PlayerVehicle.js';
import { PoliceSystem } from '../src/systems/PoliceSystem.js';
import { buildPoliceCar } from '../src/gameplay/PoliceCarModel.js';

const DT = 1 / 60;
const input = (o = {}) => ({
  throttle: 0,
  brake: 0,
  steer: 0,
  drift: false,
  boost: false,
  pitch: 0,
  flightToggleJustPressed: false,
  ...o,
});

function setup({ emptyMap = false } = {}) {
  eventBus.removeAll();
  gameState.reset();
  gameState.started = true;
  const scene = new THREE.Scene();
  const city = new CityBuilder(scene);
  if (emptyMap) {
    city.buildings = [];
    city.ramps = [];
    city.elevatedDecks = [];
  }
  const player = new PlayerVehicle(scene, city);
  player.position.set(0, 0.6, 250);
  player.heading = -Math.PI / 2;
  const police = new PoliceSystem(scene, player, city);
  police.graceTimer = 999;
  return { city, player, police };
}

/** Wide loop (stays inside the world bounds) at the given controls; returns seconds to escape or null. */
function chase(player, police, { flight = false, boost = false, seconds = 30 }) {
  let t = 0;
  while (t < seconds) {
    player.update(DT, input({ throttle: 1, steer: 0.12, boost, pitch: flight ? (player.position.y < 50 ? 0.3 : 0) : 0 }));
    police.update(DT);
    t += DT;
    if (!gameState.pursuit.active) return t;
  }
  return null;
}

function getUpToSpeed(player, { flight = false } = {}) {
  for (let i = 0; i < 240; i++) player.update(DT, input({ throttle: 1 }));
  if (flight) {
    player.update(DT, input({ throttle: 1, flightToggleJustPressed: true }));
    for (let i = 0; i < 120; i++) player.update(DT, input({ throttle: 1, pitch: 0.6 }));
  }
}

test('police interceptor is a full car model (wheels, light bar, wings, thrusters) — no drone sphere', () => {
  const car = buildPoliceCar();
  assert.equal(car.wheels.length, 4);
  assert.ok(car.leftStrobe && car.rightStrobe, 'roof light bar strobes');
  assert.ok(car.leftWing && car.rightWing, 'retractable wings');
  assert.equal(car.flames.length, 2);
  car.setFlight(1);
  assert.ok(car.leftWing.scale.x > 0.95 && car.flames[0].visible, 'wings deploy and thrusters light in flight');
  car.setFlight(0);
  assert.ok(car.leftWing.scale.x < 0.2 && !car.flames[0].visible, 'wings fold away on the road');

  const { police } = setup();
  police.startPursuit(3);
  assert.ok(police.units.every((u) => u.type === 'cruiser'), 'every unit is a police car');
});

test('buildings block police line of sight', () => {
  const { city } = setup();
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  assert.equal(city.hasLineOfSight(v(-45, 2, 0), v(-5, 2, 0)), false, 'tower in between');
  assert.equal(city.hasLineOfSight(v(0, 2, 100), v(0, 2, -100)), true, 'open boulevard');
  assert.equal(city.hasLineOfSight(v(-45, 80, 0), v(-5, 80, 0)), true, 'above the roof');
});

/** After the player lands, every unit must come down to road level and drive (pursuit kept alive for the check). */
function assertUnitsLand(player, police) {
  for (let i = 0; i < 360; i++) {
    player.update(DT, input({ throttle: 0.4 }));
    gameState.pursuit.escapeProgress = 0; // this test is about landing, not escaping
    police.update(DT);
  }
  assert.ok(gameState.pursuit.active && police.units.length > 0, 'pursuit still running with units to check');
  for (const u of police.units) {
    const ground = police.city.getSurfaceAt(u.mesh.position.x, u.mesh.position.z, 0).height;
    assert.equal(u.mode, 'ground', 'unit switched back to driving');
    assert.ok(u.mesh.position.y - ground < 1, `unit is on the road (${(u.mesh.position.y - ground).toFixed(1)} m up)`);
  }
}

test('police take off after a flying player and land again when the player does', () => {
  const { player, police } = setup({ emptyMap: true });
  getUpToSpeed(player);
  police.startPursuit(2);
  for (let i = 0; i < 60; i++) {
    player.update(DT, input({ throttle: 0.6 }));
    police.update(DT);
  }
  assert.ok(police.units.every((u) => u.mode === 'ground'), 'ground chase while the player drives');

  player.update(DT, input({ throttle: 0.6, flightToggleJustPressed: true }));
  for (let i = 0; i < 240; i++) {
    player.update(DT, input({ throttle: 0.4, pitch: player.position.y < 40 ? 0.5 : 0 }));
    police.update(DT);
  }
  assert.ok(police.units.every((u) => u.mode === 'air'), 'units switch to air pursuit');
  for (const u of police.units) {
    assert.ok(Math.abs(u.mesh.position.y - player.position.y) < 15, `unit flies at the player's altitude (dy=${(u.mesh.position.y - player.position.y).toFixed(1)})`);
    assert.ok(u.model.leftWing.scale.x > 0.8, 'police wings are out');
  }

  for (let i = 0; i < 600 && player.mode === 'FLIGHT'; i++) {
    player.update(DT, input({ pitch: -1 }));
    police.update(DT);
  }
  assert.equal(player.mode, 'DRIVE');
  assertUnitsLand(player, police);
});

test('escape balance: full throttle escapes heat 1, boost escapes heat 3, coasting never escapes', () => {
  {
    const { player, police } = setup({ emptyMap: true });
    getUpToSpeed(player);
    police.startPursuit(1);
    const t = chase(player, police, {});
    assert.ok(t !== null && t < 20, `ground full throttle escapes heat 1 (${t?.toFixed(1)}s)`);
  }
  {
    const { player, police } = setup({ emptyMap: true });
    getUpToSpeed(player, { flight: true });
    police.startPursuit(1);
    const t = chase(player, police, { flight: true });
    assert.ok(t !== null && t < 20, `flight full throttle escapes heat 1 (${t?.toFixed(1)}s)`);
  }
  {
    const { player, police } = setup({ emptyMap: true });
    getUpToSpeed(player, { flight: true });
    police.startPursuit(3);
    const t = chase(player, police, { flight: true, boost: true, seconds: 15 });
    assert.ok(t !== null, 'boosting through the sky escapes even heat 3');
  }
  {
    const { player, police } = setup({ emptyMap: true });
    getUpToSpeed(player);
    police.startPursuit(1);
    let t = 0;
    while (t < 15 && gameState.pursuit.active) {
      player.update(DT, input({ steer: 0.12 })); // coasting, no throttle
      police.update(DT);
      t += DT;
    }
    assert.equal(gameState.escapes, 0, 'coasting along never shakes the police');
  }
});

test('hiding behind a building hides the player and starts the escape', () => {
  const { player, police, city } = setup();
  // Park the player right behind (west of) the west Twin Tower; police on the far (east) side
  player.position.set(-40, 0.6, 0);
  player.speed = 0;
  police.startPursuit(1);
  for (const u of police.units) u.mesh.position.set(-8, 0.55, 0);
  const tower = city.buildings.find((b) => b.x === -25 && b.z === 0);
  assert.ok(tower, 'twin tower exists');
  police.update(DT);
  assert.equal(gameState.pursuit.inSight, false, 'tower blocks the view');
  const before = gameState.pursuit.escapeProgress;
  police.update(0.5);
  assert.ok(gameState.pursuit.escapeProgress > before, 'escape bar fills while hidden');
  assert.ok(POLICE.DETECTION_RADIUS_AIR > POLICE.DETECTION_RADIUS, 'open sky spots the player from further away');
});

test('police that start chasing a flying player land with the player too', () => {
  const { player, police, city } = setup();
  player.position.set(-300, 0.6, 140); // open east-west street
  getUpToSpeed(player, { flight: true });
  police.startPursuit(2);
  assert.ok(police.units.every((u) => u.mode === 'air'), 'units spawn in the air for an airborne player');
  for (let i = 0; i < 120; i++) {
    player.update(DT, input({ throttle: 0.5 }));
    police.update(DT);
  }
  for (let i = 0; i < 600 && player.mode === 'FLIGHT'; i++) {
    player.update(DT, input({ pitch: -1 }));
    police.update(DT);
  }
  assert.equal(player.mode, 'DRIVE');
  assert.ok(city, 'real city');
  assertUnitsLand(player, police);
});
