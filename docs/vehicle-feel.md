# Vehicle game feel

Handling follows `FINAL-vehicle-game-feel-prompt.md`: **responsive, fast, forgiving, with enough inertia to feel physical**. The custom arcade solver from ADR 0001 is kept (no physics engine). All feel values live in `VEHICLE_TUNING` in `src/core/Constants.js` and are read live from `src/core/Tuning.js`.

## Model

- **Drive** — the car has a real planar velocity separate from its heading. A smoothed "steering wheel" (`steerRise`/`steerReturn`) drives a target yaw rate that is speed-sensitive (`steerFullSpeed`, `highSpeedSteer`). Yaw rate follows it with `yawResponse` while steering and `yawDamping` on release (first-order, so no pendulum). Lateral velocity is damped by `lateralGrip` (+`slipRecovery` when the wheel is centred) and most of the scrubbed speed returns as forward speed (`cornerRetention`). A slip-angle guard (`maxSlipAngle`) makes spin-outs impossible. Acceleration follows `(1 - v/vmax)^accelCurve`; coasting keeps inertia (`coastDrag`, `rollingDecel`); braking is a constant deceleration.
- **Walls** — the into-wall velocity is removed, friction scales with impact strength, glancing hits swing the nose along the wall over ~0.2 s (`wallAlign`) while the car slides, and heavy hits briefly reduce steering (`crashStunTime`).
- **Body** — pitch/roll are critically damped springs (`autoRight`): small squat/dive and outward lean on the ground, guaranteed wheels-down recovery without overshoot.
- **Falling & air control** — gravity is `fallGravityMult`× stronger while descending (ramps, rooftop drops) and switching jets off mid-air keeps only a quarter of the upward momentum: a 60 m drop takes ~1.4 s. In the air the wheel keeps `airSteer` authority and `airGrip` bends the trajectory toward the nose (full lock moves a 60 m drop's landing spot ~50 m sideways); `airAccel` gives a little throttle/brake authority mid-air.
- **Flight** — take-off keeps the full velocity and adds `takeoffLift`; velocity eases toward the nose (`momentum`), yaw has inertia, the car banks into turns (left turn = left wing down), auto-level waits `autoLevelDelay` before helping, dives descend along the nose at real airspeed (`diveRate`, ~60 m/s, 60 m in ~1.5 s) while climbs stay limited by jet thrust, diving trades altitude for speed, and near the ground very steep dives are softened (`landingMinPitch`).
- **Sky rings** — `Space` (touch DRIFT button) is an **air brake** in Flight Mode: speed eases toward `airBrakeSpeed` at `airBrakeRate` (282 → ~105 km/h in under a second) for precise lines. A mild **ring assist** (`ringAssist`, 0 = off) eases heading/pitch toward a ring that is ahead within `ringAssistRange` and whose centre is within `ringAssistCapture` of the nose line; it never fights a player steering away. Keyboard ring-pass bot (150 ms reaction, 240 approaches with up to 30 m offset): full speed 27% → 33% with assist; cruise 52% → 69%; braking before the ring 96–98%.
- **Camera** — frame-rate-independent spring follow (`posLag`), heading lag that shows the car's side in turns (`yawLag`), pull-back under acceleration (`accelPullback`), speed FOV (`fovBase` → `fovMax`, +`fovBoost`), shake layered on top of the follow so impacts never destabilise it.
- **Frame rate** — physics runs in sub-steps of at most 1/240 s; end positions at 30/60/144 FPS differ by < 0.3 m over a 4 s manoeuvre.

## Debug panel

Press **`** (backquote) in game, or open the page with `?tune`. Presets, live sliders and telemetry (speed, slip angle, yaw rate, acceleration, FPS). Values are saved under `pg:skyline-outlaws:tuning`; **COPY JSON** exports the current set.

| Preset | Turn-in (90% yaw) | Settle after release | Steady slip | 0.7 s lane change | 0→80% |
| --- | --- | --- | --- | --- | --- |
| Responsive | 0.13 s | 0.13 s | 3.8° | 14.6 m | 1.17 s |
| **Reference** (default) | 0.17 s | 0.17 s | 7.4° | 11.4 m | 1.45 s |
| Stable | 0.30 s | 0.35 s | 10.2° | 5.6 m | 1.98 s |

Presets are experimental comparison points, not known values of the Roblox reference.

## What matters most (sensitivity, ±50% around Reference)

| Feel | Strongest parameters |
| --- | --- |
| Turn-in sharpness | `yawResponse` (−92%), `highSpeedSteer` (+69%), `steerRise` (−62%) |
| Snap-back / no pendulum | `yawDamping` (−85% settle time), `steerReturn` (−38%) |
| How much the car slides | `lateralGrip` (−105% slip), `steerRateMult`/`highSpeedSteer` (+99%) |
| High-speed agility (lane change) | `steerRateMult` (+95%), `highSpeedSteer` (+70%), `steerRise` (+35%) |
| Launch | `accelMult` (−132% time to 80%), `accelCurve` (+39%) |
| Flow after wall hits | `wallFriction` (+79% kept speed) |
| Fall speed / air manoeuvrability | `fallGravityMult`, `airSteer`, `airGrip` |
| Threading sky rings | air brake use (`airBrakeSpeed`), then `ringAssist` |

Rule of thumb: tune **yawResponse/yawDamping** for responsiveness vs weight, **lateralGrip** for rails vs slide, **highSpeedSteer** for stability at top speed, then the camera **yawLag**/**fovMax** for the sense of speed.

## Tests

`tests/vehicle-feel.test.js` runs the ten scenarios from the prompt (standing start, hard braking, high-speed lane change, slalom, wheel release mid-corner, 45° wall hit, upside-down recovery, high-speed take-off, sharp air manoeuvres, quick steerable falls, landing) against **every preset**, plus a 30/60/144 FPS consistency check.
