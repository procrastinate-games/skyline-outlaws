// Reproducible vehicle game-feel scenarios (FINAL-vehicle-game-feel-prompt.md "Testing").
// Each scenario runs against every tuning preset so no preset can regress into spin-outs or pendulums.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { eventBus } from '../src/core/EventBus.js';
import { gameState } from '../src/core/GameState.js';
import { PHYSICS, VEHICLE_TUNING } from '../src/core/Constants.js';
import { applyPreset, tuning } from '../src/core/Tuning.js';
import { CityBuilder } from '../src/level/CityBuilder.js';
import { PlayerVehicle } from '../src/gameplay/PlayerVehicle.js';

const DT = 1 / 60;
const city = new CityBuilder(new THREE.Scene());
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

// Open straight: East-West cross street z=140, driving east (+X) from x=-300 (600 m with no ramps)
const START = { x: -300, z: 140, heading: -Math.PI / 2 };

function freshCar({ x = START.x, z = START.z, heading = START.heading, y = 0.6 } = {}) {
  eventBus.removeAll();
  gameState.reset();
  gameState.started = true;
  const car = new PlayerVehicle(new THREE.Scene(), city);
  car.position.set(x, y, z);
  car.heading = heading;
  return car;
}

function drive(car, seconds, inp, dt = DT, each) {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) {
    car.update(dt, inp);
    each?.(car, (i + 1) * dt);
  }
}

/** Bring the car to a target forward speed on the open straight. */
function reachSpeed(car, target) {
  for (let i = 0; i < 600 && car.speed < target; i++) car.update(DT, input({ throttle: 1 }));
  car.update(DT, input({ throttle: 0.6 }));
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const maxSpeed = () => gameState.getVehicleStats().maxDriveSpeed;
const presets = Object.keys(VEHICLE_TUNING.PRESETS);

for (const preset of presets) {
  const isStable = preset === 'stable';

  test(`[${preset}] 1. acceleration from standstill is quick, smooth and monotonic`, () => {
    applyPreset(preset);
    const car = freshCar();
    const stats = gameState.getVehicleStats();
    const maxStep = stats.acceleration * tuning.drive.accelMult * DT * 1.02;
    let prev = 0;
    let t80 = null;
    drive(car, 4, input({ throttle: 1 }), DT, (c, t) => {
      assert.ok(c.speed >= prev - 1e-6, 'speed must not dip while accelerating');
      assert.ok(c.speed - prev <= maxStep, `no speed jumps (${(c.speed - prev).toFixed(3)} > ${maxStep.toFixed(3)})`);
      if (t80 === null && c.speed >= stats.maxDriveSpeed * 0.8) t80 = t;
      prev = c.speed;
    });
    assert.ok(t80 !== null && t80 < (isStable ? 3.2 : 2.5), `0→80% in ${t80}s`);
  });

  test(`[${preset}] 2. hard braking is predictable`, () => {
    applyPreset(preset);
    const car = freshCar();
    reachSpeed(car, maxSpeed() * 0.95);
    let prev = car.speed;
    let tStop = null;
    drive(car, 3, input({ brake: 1 }), DT, (c, t) => {
      if (tStop !== null) return;
      assert.ok(c.speed <= prev + 1e-6, 'braking never speeds the car up');
      if (c.speed <= 0.5) tStop = t;
      prev = c.speed;
    });
    assert.ok(tStop !== null && tStop < 1.6, `stops from top speed in ${tStop}s`);
  });

  test(`[${preset}] 3. high-speed lane change without losing the car`, () => {
    applyPreset(preset);
    const car = freshCar();
    reachSpeed(car, maxSpeed() * 0.8);
    const z0 = car.position.z;
    let maxSlip = 0;
    const track = (c) => (maxSlip = Math.max(maxSlip, Math.abs(c.slipAngle)));
    drive(car, 0.35, input({ throttle: 0.8, steer: 1 }), DT, track);
    drive(car, 0.35, input({ throttle: 0.8, steer: -1 }), DT, track);
    drive(car, 1.0, input({ throttle: 0.8 }), DT, track);
    assert.ok(Math.abs(car.position.z - z0) > 2.5, `lane offset ${Math.abs(car.position.z - z0).toFixed(2)} m`);
    assert.ok(maxSlip <= tuning.drive.maxSlipAngle + 0.01, `slip ${maxSlip.toFixed(3)} within guard`);
    // A smoothed wheel leaves a small residual angle after symmetric inputs; it must stay small and stop rotating
    assert.ok(Math.abs(wrap(car.heading - START.heading)) < 0.3, 'car ends roughly pointing down the road');
    assert.ok(Math.abs(car.yawRate) < 0.05, 'no residual rotation');
  });

  test(`[${preset}] 4. fast slalom never spins out`, () => {
    applyPreset(preset);
    const car = freshCar();
    reachSpeed(car, maxSpeed() * 0.8);
    const v0 = car.speed;
    let maxSlip = 0;
    let maxHeadingDev = 0;
    let crashed = false;
    eventBus.on('player:collision', () => (crashed = true));
    // Centred weave: half-period first so the car snakes around the street centre line
    const periods = [0.2, ...Array(10).fill(0.4), 0.2];
    periods.forEach((seconds, i) => {
      drive(car, seconds, input({ throttle: 0.8, steer: i % 2 === 0 ? 1 : -1 }), DT, (c) => {
        maxSlip = Math.max(maxSlip, Math.abs(c.slipAngle));
        maxHeadingDev = Math.max(maxHeadingDev, Math.abs(wrap(c.heading - START.heading)));
      });
    });
    assert.ok(!crashed, 'weave stays on the street');
    assert.ok(maxSlip <= tuning.drive.maxSlipAngle + 0.01, `slip ${maxSlip.toFixed(3)}`);
    assert.ok(maxHeadingDev < 1.0, `heading deviation ${maxHeadingDev.toFixed(2)} rad`);
    assert.ok(car.speed > v0 * 0.6, `keeps pace through the slalom (${car.speed.toFixed(1)} of ${v0.toFixed(1)})`);
  });

  test(`[${preset}] 5. releasing the wheel mid-corner settles fast with no pendulum`, () => {
    applyPreset(preset);
    const car = freshCar();
    reachSpeed(car, maxSpeed() * 0.5);
    drive(car, 2, input({ throttle: 0.5, steer: 1 }));
    const sign = Math.sign(car.yawRate);
    let settled = null;
    let overshoot = 0;
    drive(car, 1, input({ throttle: 0.5 }), DT, (c, t) => {
      overshoot = Math.max(overshoot, -sign * c.yawRate);
      if (settled === null && Math.abs(c.yawRate) < 0.1) settled = t;
    });
    assert.ok(settled !== null && settled < (isStable ? 0.45 : 0.3), `settles in ${settled}s`);
    assert.ok(overshoot < 0.05, `no counter-swing (${overshoot.toFixed(3)} rad/s)`);
  });

  test(`[${preset}] 6. wall hit at 45° keeps flow and control returns quickly`, () => {
    applyPreset(preset);
    // Approach the north face of the west Twin Tower (x -35..-15, z -10..10) at 45°
    const car = freshCar({ x: -5, z: 25, heading: Math.PI / 4 });
    car.velocity.set(-Math.sin(car.heading) * maxSpeed(), 0, -Math.cos(car.heading) * maxSpeed());
    car.speed = maxSpeed();
    let hit = false;
    let maxHeadingStep = 0;
    let prevHeading = car.heading;
    eventBus.on('player:collision', () => (hit = true));
    drive(car, 0.6, input({ throttle: 1 }), DT, (c) => {
      maxHeadingStep = Math.max(maxHeadingStep, Math.abs(wrap(c.heading - prevHeading)));
      prevHeading = c.heading;
    });
    assert.ok(maxHeadingStep < 0.15, `no heading snap on impact (${maxHeadingStep.toFixed(3)} rad in one frame)`);
    assert.ok(hit, 'impact registered');
    const b = city.buildings.find((x) => x.x === -25 && x.z === 0);
    const inside = car.position.x > b.minX && car.position.x < b.maxX && car.position.z > b.minZ && car.position.z < b.maxZ;
    assert.ok(!inside, 'never ends up inside the building');
    const speedAfter = Math.hypot(car.velocity.x, car.velocity.z);
    assert.ok(speedAfter > maxSpeed() * 0.25, `keeps ${((speedAfter / maxSpeed()) * 100).toFixed(0)}% speed`);
    drive(car, 0.5, input({ throttle: 1 }));
    const h0 = car.heading;
    drive(car, 0.5, input({ throttle: 1, steer: -1 }));
    assert.ok(Math.abs(wrap(car.heading - h0)) > 0.2, 'steering works again within a second');
  });

  test(`[${preset}] 7. auto-stabilisation recovers from being upside down`, () => {
    applyPreset(preset);
    const car = freshCar();
    car.rollAngle = Math.PI;
    car.pitchAngle = 0.9;
    let rollOvershoot = 0;
    drive(car, 1, input(), DT, (c) => (rollOvershoot = Math.max(rollOvershoot, -c.rollAngle)));
    assert.ok(Math.abs(car.rollAngle) < 0.05 && Math.abs(car.pitchAngle) < 0.06, 'wheels down within 1 s');
    assert.ok(rollOvershoot < 0.1, 'no jerky overshoot');
  });

  test(`[${preset}] 8. high-speed take-off preserves momentum`, () => {
    applyPreset(preset);
    const car = freshCar();
    reachSpeed(car, maxSpeed() * 0.95);
    const dir0 = Math.atan2(car.velocity.x, car.velocity.z);
    const v0 = Math.hypot(car.velocity.x, car.velocity.z);
    car.update(DT, input({ throttle: 1, flightToggleJustPressed: true }));
    assert.equal(car.mode, 'FLIGHT');
    let prevY = car.position.y;
    drive(car, 0.5, input({ throttle: 1 }), DT, (c) => {
      assert.ok(Math.abs(wrap(Math.atan2(c.velocity.x, c.velocity.z) - dir0)) < 0.05, 'direction preserved');
      assert.ok(c.position.y >= prevY - 1e-6 && c.position.y - prevY < 0.5, 'smooth climb, no pop');
      prevY = c.position.y;
    });
    const v1 = Math.hypot(car.velocity.x, car.velocity.z);
    assert.ok(v1 > v0 * 0.95 && v1 < v0 * 1.25, `horizontal speed ${v0.toFixed(1)} → ${v1.toFixed(1)}`);
  });

  test(`[${preset}] 9. sharp air manoeuvres stay smooth and bounded`, () => {
    applyPreset(preset);
    const car = freshCar();
    reachSpeed(car, maxSpeed() * 0.8);
    car.position.y = 120; // above every rooftop so manoeuvres can't end in a rooftop landing
    car.update(DT, input({ throttle: 1, flightToggleJustPressed: true }));
    drive(car, 1, input({ throttle: 1 }));
    const stats = gameState.getVehicleStats();
    const maxYaw = stats.flightBankRate * tuning.flight.yawRateMult;
    let prevHeading = car.heading;
    const check = (c) => {
      for (const v of [c.position.x, c.position.y, c.position.z, c.speed, c.rollAngle, c.pitchAngle]) {
        assert.ok(Number.isFinite(v), 'finite state');
      }
      assert.ok(Math.abs(c.rollAngle) <= tuning.flight.bankAngle + 0.05, `bank ${c.rollAngle.toFixed(2)}`);
      assert.ok(Math.abs(c.pitchAngle) <= PHYSICS.FLIGHT_MAX_PITCH + 0.01, `pitch ${c.pitchAngle.toFixed(2)}`);
      assert.ok(Math.abs(wrap(c.heading - prevHeading)) <= maxYaw * DT * 1.05, 'no heading snaps');
      prevHeading = c.heading;
    };
    drive(car, 1, input({ throttle: 1, steer: 1 }), DT, check);
    drive(car, 1, input({ throttle: 1, steer: -1 }), DT, check);
    drive(car, 0.7, input({ throttle: 1, pitch: 1 }), DT, check);
    drive(car, 0.7, input({ throttle: 1, pitch: -1 }), DT, check);
    // Left turn banks the left wing down (positive roll), right turn the right wing
    drive(car, 0.8, input({ throttle: 1, steer: 1 }));
    assert.ok(car.rollAngle > 0.2, 'left turn banks left');
  });

  test(`[${preset}] 10b. falling is quick and steerable`, () => {
    applyPreset(preset);
    const dropCar = (steer) => {
      const car = freshCar();
      car.velocity.set(50, 0, 0); // moving east along the street
      car.speed = 50;
      car.position.y = 60;
      car.isGrounded = false;
      let t = 0;
      while (!car.isGrounded && t < 5) {
        car.update(DT, input({ throttle: 1, steer }));
        t += DT;
      }
      return { t, car };
    };
    const straight = dropCar(0);
    assert.ok(straight.t < (isStable ? 1.6 : 1.45), `60 m drop takes ${straight.t.toFixed(2)} s`);
    const steered = dropCar(1);
    const sideways = Math.abs(steered.car.position.z - START.z);
    assert.ok(sideways > (isStable ? 4 : 8), `full steer moves the landing spot ${sideways.toFixed(1)} m sideways`);
  });

  test(`[${preset}] 10. landing converts flight into driving without a bounce`, () => {
    applyPreset(preset);
    const car = freshCar();
    reachSpeed(car, maxSpeed() * 0.7);
    car.update(DT, input({ throttle: 1, flightToggleJustPressed: true }));
    drive(car, 1.2, input({ throttle: 1, pitch: 0.6 }));
    let landed = false;
    let vBefore = 0;
    for (let i = 0; i < 600 && !landed; i++) {
      vBefore = Math.hypot(car.velocity.x, car.velocity.z);
      car.update(DT, input({ pitch: -1 }));
      landed = car.mode === 'DRIVE';
    }
    assert.ok(landed, 'dive lands the car');
    assert.ok(car.isGrounded && car.verticalVelocity === 0, 'on the ground');
    assert.ok(Math.hypot(car.velocity.x, car.velocity.z) > vBefore * 0.7, 'keeps momentum on touchdown');
    drive(car, 0.5, input({ throttle: 0.5 }), DT, (c) => assert.ok(c.isGrounded, 'no bounce after landing'));
  });
}

test('air brake sheds flight speed quickly for precise ring lines', () => {
  applyPreset(VEHICLE_TUNING.DEFAULT_PRESET);
  const car = freshCar();
  reachSpeed(car, maxSpeed() * 0.9);
  car.position.y = 120;
  car.update(DT, input({ throttle: 1, flightToggleJustPressed: true }));
  drive(car, 2, input({ throttle: 1 }));
  const fast = car.speed;
  drive(car, 1, input({ throttle: 1, airBrake: true }));
  assert.ok(car.isAirBraking, 'air brake engaged');
  assert.ok(car.speed < fast * 0.5, `air brake: ${fast.toFixed(0)} → ${car.speed.toFixed(0)} m/s in 1 s`);
  drive(car, 1.5, input({ throttle: 1 }));
  assert.ok(car.speed > fast * 0.8, 'releasing the brake gets back up to speed');
});

test('ring assist pulls a slightly-off line through a sky ring, but only when switched on', () => {
  const flyPast = (assist) => {
    applyPreset(VEHICLE_TUNING.DEFAULT_PRESET);
    tuning.flight.ringAssist = assist;
    const car = freshCar();
    for (const r of city.skyRings) r.cooldown = 0;
    const ring = city.skyRings[6]; // West Harbor flight line, open approach from the south
    car.position.set(ring.position.x + 8, ring.position.y + 3, ring.position.z + 60);
    car.heading = 0;
    car.toggleMode('FLIGHT');
    car.takeoffTimer = 0;
    car.speed = 60;
    car.velocity.set(0, 0, -60);
    let closest = Infinity;
    for (let i = 0; i < 90; i++) {
      car.update(DT, input({ throttle: 1 }));
      closest = Math.min(closest, car.position.distanceTo(ring.position));
    }
    return closest;
  };
  const withAssist = flyPast(0.6);
  const without = flyPast(0);
  applyPreset(VEHICLE_TUNING.DEFAULT_PRESET);
  assert.ok(without > city.skyRings[6].radius, `without assist the 8 m-off line misses (${without.toFixed(1)} m)`);
  assert.ok(withAssist < city.skyRings[6].radius, `assist threads the ring (${withAssist.toFixed(1)} m from centre)`);
});

test('handling is frame-rate independent (30 / 60 / 144 FPS)', () => {
  applyPreset(VEHICLE_TUNING.DEFAULT_PRESET);
  const ends = [1 / 30, 1 / 60, 1 / 144].map((dt) => {
    const car = freshCar();
    drive(car, 1.5, input({ throttle: 1 }), dt);
    drive(car, 1.5, input({ throttle: 1, steer: 0.7 }), dt);
    // The toggle frame carries the same controls, so every frame rate sees identical inputs over time
    car.update(dt, input({ throttle: 1, steer: -0.5, pitch: 0.4, flightToggleJustPressed: true }));
    drive(car, 1 - dt, input({ throttle: 1, steer: -0.5, pitch: 0.4 }), dt);
    return car.position.clone();
  });
  const spread = Math.max(ends[0].distanceTo(ends[2]), ends[1].distanceTo(ends[2]));
  assert.ok(spread < 0.3, `end positions differ by ${spread.toFixed(2)} m across frame rates`);
});

test('presets are distinct and the default is Reference', () => {
  applyPreset(VEHICLE_TUNING.DEFAULT_PRESET);
  assert.equal(VEHICLE_TUNING.DEFAULT_PRESET, 'reference');
  const { responsive, reference, stable } = VEHICLE_TUNING.PRESETS;
  assert.ok(responsive.drive.lateralGrip > reference.drive.lateralGrip);
  assert.ok(reference.drive.lateralGrip > stable.drive.lateralGrip);
  assert.ok(responsive.drive.yawDamping > stable.drive.yawDamping);
});
