# Games to Procrastinate To

<!-- platform:bootstrap:start — preserve this loader; common policy is remote, not copied here. -->
## Load current platform rules at session start

1. Resolve `procrastinate-games/game-template` branch `main` to a commit SHA using GitHub tools/API or `gh api repos/procrastinate-games/game-template/commits/main --jq .sha`.
2. Fetch and read `PLATFORM.md` at that exact SHA before planning or editing. Source: `https://github.com/procrastinate-games/game-template/blob/main/PLATFORM.md` (raw/API access is fine). Read the central `VERSIONING.md` for game releases, `GAME-CREATOR.md` for game workflow, and `LOCALIZATION.md` for new games or localization/text work, all at the same SHA.
3. Reuse those fetched documents for this session; do not repeatedly fetch them or copy their full text into this repo. Record the policy SHA in the session handoff when one is written. Refresh at the start of the next session.
4. Central documents define shared platform policy; local sections and `docs/platform-project-notes.md` define this game's architecture and explicit owner-approved exceptions. Keep existing saves, origins, stack and exceptions. Local copies of old platform guides are historical references, not the current common policy. Explicit user instructions take precedence.
5. If remote access fails, say so and use a previously verified cached revision if available, identifying its SHA. Without a verified copy, continue independent inspection but do not guess new platform requirements or claim current-policy compliance; resolve access before policy-dependent publishing.

Keep this loader and the project-specific sections when regenerating agent instructions. `CLAUDE.md` and `GEMINI.md` should point here. A Markdown loader instructs compliant agents; GitHub does not automatically sync template descendants or enforce that every tool fetches policy.
<!-- platform:bootstrap:end -->

## Skyline Outlaws: Jet Chase — Project overview

- **Title & Slug**: `Skyline Outlaws: Jet Chase` (`skyline-outlaws`)
- **Stack**: JavaScript (ES Modules), Three.js (`^0.180.0`, WebGLRenderer), Vite (`base: './'`, output `dist/`), procedural Web Audio API, `localStorage` (`pg:skyline-outlaws:save`).
- **Source-of-truth docs**:
  - [`docs/gameplan.md`](docs/gameplan.md) — Gameplay loop, Drive/Flight rules, stunts, police pursuit, P0/P1 scope.
  - [`docs/tech.md`](docs/tech.md) — Stack, directory structure, and conventions.
  - [`docs/architectural-decisions/0001-engine-and-stack.md`](docs/architectural-decisions/0001-engine-and-stack.md) — Engine and custom arcade vehicle/flight solver ADR.
  - [`docs/milestones/0001-mvp-flying-car-chase.md`](docs/milestones/0001-mvp-flying-car-chase.md) — Active milestone and acceptance criteria.
  - [`docs/vehicle-feel.md`](docs/vehicle-feel.md) — Handling model, tuning presets, debug panel (`?tune`), parameter sensitivity.
  - [`docs/STATE.md`](docs/STATE.md) & [`docs/backlog.md`](docs/backlog.md) — Session state and deferred P2 items.
- **Architecture**:
  - `src/core/` — `Constants.js`, `EventBus.js`, `GameState.js`, `Game.js`.
  - `src/gameplay/` — `PoliceCarModel.js` (black-and-white interceptor with light bar, wings & thrusters), `PlayerVehicle.js` (stylized futuristic car + retractable wings + thrusters + arcade Drive/Flight physics).
  - `src/level/` — `CityBuilder.js` (3D cyber-sunset city, roads, bridges, skyscrapers, mega-ramps, rooftop helipads, sky rings).
  - `src/systems/` — `InputSystem.js` (keyboard + touch), `CameraSystem.js` (speed-reactive 3rd-person chase camera), `StuntSystem.js` (stunts & combos), `PoliceSystem.js` (heat 1–3 interceptors that drive and fly, line-of-sight search, escape balance), `ParticleSystem.js` (thrusters, cyan light trails, drift sparks, ring bursts), `AtmosphereSystem.js` (daylight sky dome, sun, drifting clouds, ambient dust; visual-only).
  - `src/audio/` — `AudioManager.js`, `AudioBridge.js`, `music.js`, `sfx.js` (procedural Web Audio engine/jet synth, drift screech, siren, stunt chimes, synthwave BGM).
  - `src/ui/` — `HUD.js` (English main menu, speedometer, Drive/Flight indicator, stunt popups, pursuit gauge, garage/upgrades, blitz challenges, pause/busted overlays).
- **Commands**: `npm run dev`, `npm test`, `npm run build`, `npx --yes github:procrastinate-games/game-publisher#v1` (game.json check).

## Release versioning

For the next player-facing update, follow the current central `VERSIONING.md`: inspect existing version/release history, update the semantic version and a 1–3 bullet CHANGELOG entry, and tie the successful release to its deployed commit. This Markdown-only adoption does not change or claim a new game version.
