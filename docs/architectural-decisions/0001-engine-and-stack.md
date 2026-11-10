# ADR 0001: Engine, Custom Arcade Vehicle-Flight Solver, and Stack

## Status

accepted

## Date

2026-11-10

## Context

We are building **Skyline Outlaws: Jet Chase**, a 3D browser game centered on an experimental sports car that drives, drifts, jumps off ramps, transforms into a jet-powered flying car, performs stunts, and evades police pursuits. The game must follow the `PlayableIntelligence/game-creator` Three.js architecture (`EventBus`, `GameState`, `Constants`, `Game` orchestrator, `render_game_to_text`, `advanceTime`) and the `procrastinate-games/game-template` publishing contract (self-contained Vite static build in `dist/`, `pg:skyline-outlaws:` `localStorage` keys, `supportedDevices: ["desktop", "mobile"]`, and fast headless Chromium verification).

## Decision

We will use **Three.js (`^0.180.0`)** with **Vite** and a **custom arcade vehicle + flight physics solver** combined with spatial city/ramp/rooftop collision volumes, procedural 3D stylized meshes (`InstancedMesh` for repeated city windows/lights/props), and procedural **Web Audio API** sound synthesis.

## Consequences

### Positive

- **Tuned "Fun-First" Feel**: Driving (drift angle, speed-sensitive steering, auto-upright, ramp launches) and Flight (wing deployment, pitch/bank with gentle auto-leveling, smooth landing transitions) can be tuned directly in `Constants.js` without fighting rigid-body physics instabilities or wheel-constraint flipping.
- **Instant Boot & Deterministic Tests**: The entire driving, flying, stunt, and police pursuit loop can be stepped deterministically in Node unit tests (`npm test`) as well as in headless Chromium (`smoke.mjs` and `render_game_to_text()`).
- **Zero External Asset Failure**: All car meshes, city buildings, ramps, sky rings, and audio are procedurally generated in code.

### Negative

- Custom collision handling requires explicit AABB/ramp heightfield queries for roads, bridges, ramps, and building rooftops rather than arbitrary triangle mesh collisions.

## Alternatives considered

- **Full rigid-body physics engine (Rapier3D / Cannon-es)**: Rejected because raycast vehicles frequently flip or snag on ramp seams and complicate seamless Drive ↔ Flight transformation and deterministic Node unit tests.
- **2D Phaser top-down**: Rejected because the specification requires a 3D city with verticality, skyscraper weaving, ramps, rooftops, and a 3rd-person chase camera.

## Related

- Enables Milestone 01 (`docs/milestones/0001-mvp-flying-car-chase.md`).
