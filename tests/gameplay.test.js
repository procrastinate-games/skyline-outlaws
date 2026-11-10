import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { eventBus, Events } from '../src/core/EventBus.js';
import { gameState } from '../src/core/GameState.js';
import { STORAGE_KEY, POLICE } from '../src/core/Constants.js';
import { CityBuilder } from '../src/level/CityBuilder.js';
import { PlayerVehicle } from '../src/gameplay/PlayerVehicle.js';
import { StuntSystem } from '../src/systems/StuntSystem.js';
import { PoliceSystem } from '../src/systems/PoliceSystem.js';

test('vehicle drives, boosts, and transforms into flight mode', () => {
  eventBus.removeAll();
  gameState.reset();
  gameState.started = true;

  const scene = new THREE.Scene();
  const city = new CityBuilder(scene);
  const player = new PlayerVehicle(scene, city);

  assert.equal(player.mode, 'DRIVE');
  const startZ = player.position.z;

  // Accelerate and boost forward on the road
  for (let i = 0; i < 40; i++) {
    player.update(0.05, {
      throttle: 1,
      brake: 0,
      steer: 0,
      drift: false,
      boost: true,
      pitch: 0,
      flightToggleJustPressed: false,
    });
  }

  assert.ok(player.speed > 25, `Expected speed > 25, got ${player.speed}`);
  assert.ok(player.position.z < startZ - 15, 'Vehicle should advance down Neon Boulevard');

  // Transform into Flight Mode and climb
  player.update(0.05, {
    throttle: 1,
    brake: 0,
    steer: 0,
    drift: false,
    boost: true,
    pitch: 1,
    flightToggleJustPressed: true,
  });
  assert.equal(player.mode, 'FLIGHT');

  for (let i = 0; i < 40; i++) {
    player.update(0.05, {
      throttle: 1,
      brake: 0,
      steer: 0.2,
      drift: false,
      boost: true,
      pitch: 0.8,
      flightToggleJustPressed: false,
    });
  }

  assert.ok(player.position.y > 10, `Expected altitude > 10 in flight mode, got ${player.position.y}`);
  assert.ok(player.wingDeploy > 0.8, `Expected wings deployed, got ${player.wingDeploy}`);
});

test('stunt system awards points and chains combo multipliers', () => {
  eventBus.removeAll();
  gameState.reset();
  gameState.started = true;

  const scene = new THREE.Scene();
  const city = new CityBuilder(scene);
  const player = new PlayerVehicle(scene, city);
  const stunts = new StuntSystem(player, city);

  const emittedStunts = [];
  eventBus.on(Events.STUNT_PERFORMED, (data) => emittedStunts.push(data));

  // 1. Sustained drift -> NICE DRIFT!
  player.speed = 42;
  player.isGrounded = true;
  player.isDrifting = true;
  for (let i = 0; i < 25; i++) {
    stunts.update(0.05);
  }
  player.isDrifting = false;
  stunts.update(0.05);

  assert.ok(emittedStunts.some((s) => s.label.includes('DRIFT')), 'Should award NICE DRIFT!');
  assert.ok(gameState.score > 0);
  assert.ok(gameState.combo >= 1);

  // 2. Fly through a Sky Ring -> SKY RING! + combo multiplier increase
  const ring = city.skyRings[0];
  player.position.copy(ring.position);
  stunts.update(0.05);

  assert.ok(emittedStunts.some((s) => s.label.includes('RING')), 'Should award SKY RING!');
  assert.ok(gameState.combo >= 2, `Expected combo >= 2, got ${gameState.combo}`);
});

test('police chase transitions from pursuit to escaped or busted', () => {
  eventBus.removeAll();
  gameState.reset();
  gameState.started = true;

  const scene = new THREE.Scene();
  const city = new CityBuilder(scene);
  const player = new PlayerVehicle(scene, city);
  const stunts = new StuntSystem(player, city);
  const police = new PoliceSystem(scene, player, city);

  police.startPursuit(1);
  assert.equal(gameState.pursuit.active, true);
  assert.equal(gameState.pursuit.heat, 1);
  assert.ok(police.units.length >= 2, 'Should spawn police cruisers');

  // Move player high and far away so escape progress completes
  player.mode = 'FLIGHT';
  player.position.set(220, 85, -220);
  player.speed = 65;

  for (let i = 0; i < 200; i++) {
    police.update(0.1);
    stunts.update(0.1);
    if (!gameState.pursuit.active) break;
  }

  assert.equal(gameState.pursuit.active, false, 'Player should escape police when far out of range');
  assert.ok(gameState.escapes >= 1, 'Escape counter should increment');

  // Start another pursuit and verify police maintain standoff distance and fill captureProgress bar
  player.mode = 'DRIVE';
  player.position.set(0, 0.6, 80);
  player.speed = 0;
  police.startPursuit(2);

  let bustedEventFired = false;
  eventBus.on(Events.PLAYER_BUSTED, () => {
    bustedEventFired = true;
  });

  // Step 2.5 seconds: police close in to standoff distance, capture bar partially fills (not instant bust)
  for (let i = 0; i < 25; i++) {
    police.update(0.1);
  }

  for (const unit of police.units) {
    const horizDist = Math.hypot(
      unit.mesh.position.x - player.position.x,
      unit.mesh.position.z - player.position.z
    );
    assert.ok(
      horizDist >= POLICE.MIN_PLAYER_DISTANCE - 0.5,
      `Police unit should keep standoff distance >= ${POLICE.MIN_PLAYER_DISTANCE}, got ${horizDist}`
    );
  }
  assert.equal(gameState.busted, false, 'Should not bust player in the first 2.5 seconds');
  assert.ok(
    gameState.pursuit.captureProgress > 0.15 && gameState.pursuit.captureProgress < 0.9,
    `Expected captureProgress to be filling gradually, got ${gameState.pursuit.captureProgress}`
  );

  // Continue stationary until captureProgress reaches 100% -> BUSTED
  for (let i = 0; i < 60; i++) {
    police.update(0.1);
    if (gameState.busted) break;
  }

  assert.equal(gameState.pursuit.captureProgress, 1);
  assert.equal(gameState.busted, true);
  assert.equal(bustedEventFired, true);
});

test('state reset, upgrades, and localStorage persistence', () => {
  eventBus.removeAll();
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };

  gameState.loadSave();
  gameState.credits = 2000;
  const upgraded = gameState.upgradeStat('topSpeed');
  assert.equal(upgraded, true);
  assert.equal(gameState.upgrades.topSpeed, 1);

  const unlocked = gameState.selectVehicle('valkyrie');
  assert.equal(unlocked, true);
  assert.equal(gameState.selectedVehicle, 'valkyrie');

  gameState.addScore(1500);
  gameState.save();

  assert.ok(store.has(STORAGE_KEY), `Save must use ${STORAGE_KEY}`);

  // Test 3 consecutive resets preserve persistent data while wiping run state
  for (let i = 0; i < 3; i++) {
    gameState.score = 999;
    gameState.combo = 5;
    gameState.busted = true;
    gameState.reset();
    assert.equal(gameState.score, 0);
    assert.equal(gameState.combo, 1);
    assert.equal(gameState.busted, false);
    assert.equal(gameState.bestScore, 1500);
    assert.equal(gameState.upgrades.topSpeed, 1);
  }
});
