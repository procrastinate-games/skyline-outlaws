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

  // Fly high and fast in a wide sky arc in Jet Flight Mode so player outruns police cruisers & drone
  player.mode = 'FLIGHT';
  player.position.set(0, 75, 120);
  player.speed = 95;

  for (let i = 0; i < 200; i++) {
    player.update(0.1, {
      throttle: 1,
      brake: 0,
      steer: 0.28,
      drift: false,
      boost: true,
      pitch: 0.12,
      flightToggleJustPressed: false,
    });
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
  player.isBoosting = false;
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

const idleFlightInput = {
  throttle: 1,
  brake: 0,
  steer: 0,
  drift: false,
  boost: false,
  pitch: 0,
  flightToggleJustPressed: false,
};

test('idle flight above the skyline cannot farm points or combo', () => {
  eventBus.removeAll();
  gameState.reset();
  gameState.started = true;

  const scene = new THREE.Scene();
  const city = new CityBuilder(scene);
  const player = new PlayerVehicle(scene, city);
  const stunts = new StuntSystem(player, city);

  player.toggleMode('FLIGHT');
  player.position.set(0, 150, 120);
  player.pitchAngle = 0;

  for (let i = 0; i < 300; i++) {
    player.update(0.1, idleFlightInput);
    stunts.update(0.1);
  }

  assert.equal(gameState.score, 0, `AFK flight above the skyline should not score, got ${gameState.score}`);
  assert.equal(gameState.combo, 1);
});

test('skyline canyon run rewards weaving between towers without extending the combo', () => {
  eventBus.removeAll();
  gameState.reset();
  gameState.started = true;

  const scene = new THREE.Scene();
  const city = new CityBuilder(scene);
  const player = new PlayerVehicle(scene, city);
  const stunts = new StuntSystem(player, city);

  player.mode = 'FLIGHT';
  player.speed = 70;
  player.position.set(0, 30, 0);
  player.closestBuildingDist = 10;
  for (let i = 0; i < 30; i++) stunts.update(0.1);

  assert.ok(gameState.score > 0, 'Canyon run should award points');
  assert.equal(gameState.combo, 1, 'Canyon run must not bump the combo multiplier');
});

test('police cruisers chase from behind and drive along their heading', () => {
  eventBus.removeAll();
  gameState.reset();
  gameState.started = true;

  const scene = new THREE.Scene();
  const city = new CityBuilder(scene);
  const player = new PlayerVehicle(scene, city);
  const police = new PoliceSystem(scene, player, city);
  police.graceTimer = 0;

  // Cruise north up Neon Boulevard at a steady speed
  player.position.set(0, 0.6, 300);
  player.heading = 0;
  player.speed = 40;
  police.startPursuit(1);

  const fwd = { x: -Math.sin(player.heading), z: -Math.cos(player.heading) };
  for (const unit of police.units) {
    const along = (unit.mesh.position.x - player.position.x) * fwd.x + (unit.mesh.position.z - player.position.z) * fwd.z;
    assert.ok(along < 0, `Units should spawn behind the player, got along=${along}`);
  }

  for (let i = 0; i < 60; i++) {
    player.position.z -= player.speed * 0.05;
    police.update(0.05);
  }

  const cruisers = police.units.filter((u) => u.type === 'cruiser');
  assert.ok(cruisers.length >= 1);
  for (const unit of cruisers) {
    let diff = unit.mesh.rotation.y - player.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    assert.ok(Math.abs(diff) < 0.5, `Cruiser should face the chase direction, not sideways (diff=${diff})`);
    const dist = Math.hypot(unit.mesh.position.x - player.position.x, unit.mesh.position.z - player.position.z);
    assert.ok(dist < POLICE.DETECTION_RADIUS, `Cruiser should keep up with a cruising player (dist=${dist})`);
  }

  // Boosting well past cruiser top speed opens a gap
  const before = Math.min(...cruisers.map((u) => Math.hypot(u.mesh.position.x - player.position.x, u.mesh.position.z - player.position.z)));
  player.isBoosting = true;
  player.speed = 105;
  for (let i = 0; i < 60; i++) {
    player.position.z -= player.speed * 0.05;
    if (player.position.z < -370) player.position.z = 370;
    police.update(0.05);
  }
  const after = Math.min(...cruisers.map((u) => Math.hypot(u.mesh.position.x - player.position.x, u.mesh.position.z - player.position.z)));
  assert.ok(after > before + 10, `Boosting should open a gap on the cruisers (${before} -> ${after})`);
});

test('restart helpers clear rings, particles and pending flight toggles', async () => {
  eventBus.removeAll();
  gameState.reset();

  const { ParticleSystem } = await import('../src/systems/ParticleSystem.js');
  const { InputSystem } = await import('../src/systems/InputSystem.js');

  const scene = new THREE.Scene();
  const city = new CityBuilder(scene);
  const player = new PlayerVehicle(scene, city);
  const particles = new ParticleSystem(scene, player);
  const input = new InputSystem();

  city.skyRings[0].cooldown = 4;
  city.resetRings();
  assert.equal(city.skyRings[0].cooldown, 0);

  particles.spawnBurst(player.position, 0xffffff, 12);
  assert.ok(particles.particles.some((p) => p.active));
  particles.reset();
  assert.ok(particles.particles.every((p) => !p.active));

  input.triggerFlightToggle();
  input.resetTransient();
  assert.equal(input.getSnapshot('DRIVE').flightToggleJustPressed, false);
});
