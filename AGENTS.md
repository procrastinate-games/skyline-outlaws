# Games to Procrastinate To

## Game creation workflow

- Use [PlayableIntelligence/game-creator](https://github.com/PlayableIntelligence/game-creator) for game creation and iteration. Read [docs/game-creator.md](docs/game-creator.md) first for loading instructions and the platform integration rules.
- Default to its `make-game` skill for projects of any complexity; use `viral-game` for a one-session game when that matches the user’s request. Load the relevant engine, design, assets, audio and QA skills as needed. Follow the selected workflow’s planning, state documents, architecture and gameplay verification.
- During scaffolding or agents-bootstrap, merge the skill’s game-specific instructions into this file while retaining the platform rules and the link to docs/game-creator.md. Keep CLAUDE.md and GEMINI.md as pointers to AGENTS.md.

## Skyline Outlaws: Jet Chase — Project overview

- **Title & Slug**: `Skyline Outlaws: Jet Chase` (`skyline-outlaws`)
- **Stack**: JavaScript (ES Modules), Three.js (`^0.180.0`, WebGLRenderer), Vite (`base: './'`, output `dist/`), procedural Web Audio API, `localStorage` (`pg:skyline-outlaws:save`).
- **Source-of-truth docs**:
  - [`docs/gameplan.md`](docs/gameplan.md) — Gameplay loop, Drive/Flight rules, stunts, police pursuit, P0/P1 scope.
  - [`docs/tech.md`](docs/tech.md) — Stack, directory structure, and conventions.
  - [`docs/architectural-decisions/0001-engine-and-stack.md`](docs/architectural-decisions/0001-engine-and-stack.md) — Engine and custom arcade vehicle/flight solver ADR.
  - [`docs/milestones/0001-mvp-flying-car-chase.md`](docs/milestones/0001-mvp-flying-car-chase.md) — Active milestone and acceptance criteria.
  - [`docs/STATE.md`](docs/STATE.md) & [`docs/backlog.md`](docs/backlog.md) — Session state and deferred P2 items.
- **Architecture**:
  - `src/core/` — `Constants.js`, `EventBus.js`, `GameState.js`, `Game.js`.
  - `src/gameplay/` — `PlayerVehicle.js` (stylized futuristic car + retractable wings + thrusters + arcade Drive/Flight physics).
  - `src/level/` — `CityBuilder.js` (3D cyber-sunset city, roads, bridges, skyscrapers, mega-ramps, rooftop helipads, sky rings).
  - `src/systems/` — `InputSystem.js` (keyboard + touch), `CameraSystem.js` (speed-reactive 3rd-person chase camera), `StuntSystem.js` (stunts & combos), `PoliceSystem.js` (heat 1–3 cruisers & drones), `ParticleSystem.js` (thrusters, drift sparks, ring bursts).
  - `src/audio/` — `AudioManager.js`, `AudioBridge.js`, `music.js`, `sfx.js` (procedural Web Audio engine/jet synth, drift screech, siren, stunt chimes, synthwave BGM).
  - `src/ui/` — `HUD.js` (English main menu, speedometer, Drive/Flight indicator, stunt popups, pursuit gauge, garage/upgrades, blitz challenges, pause/busted overlays).
- **Commands**: `npm run dev`, `npm test`, `npm run build`, `npx --yes github:procrastinate-games/game-publisher#v1` (game.json check).

## Platform publishing contract

- The deployed game must be a static browser build: client code only, no required backend or external runtime services. This contract supports both small games and substantial browser games.
- Repository name = game slug. Publishing URL: `https://pg-<slug>.register-c02.workers.dev/`.
- Support iframe embedding and relative asset URLs; never navigate the parent window. For new games, default to keyboard and touch controls and layouts from 360 px through landscape. Mobile support is required unless the owner explicitly approves a device exception in the gameplan; complexity alone is not an exception. Preserve an existing explicit exception when maintaining a game. Set supportedDevices in public/game.json to the devices actually supported, and describe the real controls; desktop-only games must be labelled on the portal.
- Store new saves in localStorage under `pg:<slug>:`. Preserve all existing save keys and formats when maintaining a game; never reset or migrate player data without explicit instructions.
- No trackers, advertising, or unlicensed third-party assets.
- Keep `npm test` and `npm run build` passing. Existing game-specific checks must also pass.
- When playable, fill every field in `public/game.json` with English catalog text, set slug to the repository name, add `public/cover.webp` (960×600), and set status to `published`. `draft` skips deployment; `hidden` deploys without a catalog card.
- Do not change `.github/workflows/`, `wrangler.jsonc`, or the Worker name while making a game. Never add tokens or secrets to code.
- Push to `main` to publish. Check GitHub Actions for the URL and outcome; the portal refreshes automatically after deployment.
- Done means: a fresh start works, the intended gameplay loop and feedback/progression work, controls are explained, and the browser console has no unhandled errors. Test win/loss/restart where the design includes them; sandbox, idle and other open-ended games need their own acceptance criteria.
- Commit author and committer: `kifrip <25287470+kifrip@users.noreply.github.com>`.

- Read `docs/platform-project-notes.md` when present for game-specific architecture and checks.

## Verification effort

- Keep the selected skill’s required gameplay/runtime checks and existing game tests. Use focused local checks for the change and reuse successful results for unchanged code. Do not repeat full suites just because a development phase ended or an instruction file changed; CI already runs the release checks. Repeat or broaden checks when a change or failure warrants it. Capture screenshots for visual checks and report concise results; inspect detailed logs on failures.

- New games default to `supportedDevices: ["desktop", "mobile"]` in public/game.json. Use `["desktop"]` only for an explicit owner-approved desktop-only exception. Verify touch input and layout for games that declare mobile support.
