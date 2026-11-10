# Milestone 01: Skyline Outlaws — Complete P0 + P1 Flying Car Chase Game

## Status

done

## Objective

Deliver the complete, high-polish browser 3D game **Skyline Outlaws: Jet Chase** featuring an original stylized futuristic sports car, responsive arcade driving + drifting + boosting, one-button transformation into jet-powered flight mode, a 3rd-person speed-reactive chase camera, a compact multi-district 3D city designed for ramps/rooftops/sky-rings, stunt & combo scoring, multi-heat police pursuits (cruisers + aerial drones), vehicle selection & upgrades, optional 60-second Blitz Challenges, procedural Web Audio synthesis, and full desktop + mobile controls.

## Scope

- **P0.1 Futuristic Vehicle & Arcade Driving**: Sculpted 3D sports car with headlights, full-width tail light bar, rotating wheels, retractable wings, and twin jet thrusters; smooth acceleration, braking, powerslide drift, boost, ramp launches, and auto-upright stabilization.
- **P0.2 Flight Mode Transformation**: Instant ground/air transformation (`F` / UI toggle) with animated wings, thruster flames, accessible pitch/bank controls, auto-leveling assist, and smooth road/rooftop landings.
- **P0.3 Third-Person Chase Camera**: Smooth position/rotation damping, speed-reactive FOV and camera distance, drift lateral offset, and vertical flight tracking without clipping.
- **P0.4 Compact 3D City**: Multi-block cyber-sunset metropolis with Downtown Skyscrapers, Twin Towers sky-bridge, Harbor Docks, Highway Overpass, 10 Mega Ramps, landable Rooftop Helipads, and 16 glowing Sky Rings.
- **P0.5 Police Chase & P1.5 Heat Levels**: Heat levels 1–3, police interceptor cruisers with red/blue strobe bars + sirens, aerial hunter drones at Heat 2+, line-of-sight escape cooldown timer, `ESCAPED!` bonus, and `BUSTED!` fail state when hull reaches 0%.
- **P0.6 Stunts & P1.4 Combo Multiplier**: Detection and popups for `BIG AIR!`, `NICE DRIFT!`, `SKY RING!`, `CLOSE CALL!`, `PERFECT LANDING!`, `ROOFTOP TOUCHDOWN!`, and `ESCAPED!` with combo multiplier (`x1`–`x10`).
- **P0.7–P0.9 Loop, UI & Procedural Audio**: English Main Menu overlay + instant Play, Speedometer (KM/H), Drive/Flight mode indicator, Score & High Score (`pg:skyline-outlaws:save`), Pursuit Heat/Escape bar, Pause (`P`/`Esc`), Restart (`R`), Controls hint, Mute toggle (`M`), and Web Audio API engine/jet/drift/siren/stunt/BGM synthesis.
- **P1.1–P1.3 & P1.7–P1.8 Upgrades, Vehicles, Challenges & Mobile**: 3 distinct vehicles (`Apex Vector`, `Valkyrie GT`, `Cyber Interceptor`), 4 upgradeable stats (Top Speed, Acceleration, Jet Thrust, Boost Capacity), 3 paint/trail presets, 3 optional 60-second Blitz Challenges (`Ring Rush`, `Most Wanted Escape`, `Rooftop Hop`), and responsive mobile touch UI.

## Out of scope

- P2 features (real-time multiplayer, online leaderboards, story campaign, destructible buildings, in-app purchases/ads).

## Dependencies

- **Depends on:** ADR 0001 (`docs/architectural-decisions/0001-engine-and-stack.md`)
- **Blocks:** none

## Acceptance criteria

- [x] Manifest & platform contract validation passes — test: `tests/manifest.test.js`
- [x] Vehicle accelerates, steers, drifts, boosts, launches off ramps, and transforms between Drive Mode and Flight Mode deterministically — test: `tests/gameplay.test.js::vehicle drives, boosts, and transforms into flight mode`
- [x] Stunt & combo system awards points and increments multiplier for drift, big air, sky rings, rooftop landings, and police escapes — test: `tests/gameplay.test.js::stunt system awards points and chains combo multipliers`
- [x] Police pursuit spawns interceptors, tracks escape progress when out of range, awards `ESCAPED!`, and triggers `BUSTED!` when integrity reaches 0 — test: `tests/gameplay.test.js::police chase transitions from pursuit to escaped or busted`
- [x] Vehicle upgrades, car selection, and high scores persist under `pg:skyline-outlaws:save` and `GameState.reset()` cleanly resets run state 3x in a row — test: `tests/gameplay.test.js::state reset, upgrades, and localStorage persistence`
- [x] Production build (`npm run build`) and headless Chromium smoke test (`node scripts/platform/smoke.mjs`) pass with zero console/page errors and verified 3D canvas + HUD — verified by user playtest

## Exit condition

User launches the game → accelerates down Neon Boulevard, hits the central ramp, transforms into Flight Mode mid-air, flies through Sky Rings between skyscrapers, triggers a stunt combo and police pursuit, evades the police for an `ESCAPED!` reward, and can spend credits on upgrades/cars or restart cleanly.

## Test plan

1. Write deterministic simulation tests in `tests/gameplay.test.js` covering vehicle driving/flying physics, stunts/combos, police pursuit/escape/busted states, upgrades, and save persistence.
2. Run `npm test` and `npm run build`.
3. Run `node scripts/platform/smoke.mjs` and inspect live browser gameplay, `window.render_game_to_text()`, and screenshots across desktop and mobile viewports.

## Notes

- Governing ADR: `docs/architectural-decisions/0001-engine-and-stack.md`.
