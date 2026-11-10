# Tech stack

## Engine / runtime

- **Engine:** Three.js (`^0.180.0`, WebGLRenderer)
- **Language(s):** JavaScript (ES Modules)
- **Target platforms:** Web browser (`desktop` and `mobile`, responsive from 360 px portrait/landscape to desktop widescreen, iframe-safe)

## Libraries / frameworks

| Library | Version | Purpose |
|---------|---------|---------|
| `three` | `^0.180.0` | 3D rendering, custom vehicle/city geometry, instanced city props, lighting, camera, and particles |
| `vite` | `8.3.6` | Local dev server and static production bundler (`base: './'`, output `dist/`) |
| `@playwright/test` | `1.65.0` | Browser E2E checks (the production smoke test runs in the shared game-publisher workflow) |
| `wrangler` | `4.159.0` | Cloudflare Workers static asset deployment in GitHub Actions |

## Tooling

- **Package manager:** `npm` (Node `>=22.12`)
- **Build:** `npm run build` (`vite build` → `dist/`)
- **Testing:** `npm test` (`node --test tests/*.test.js` covering deterministic gameplay simulation tests); `game.json` validation and the production smoke test run in the shared game-publisher workflow
- **Asset / binary storage:** Procedural 3D meshes, materials, and Web Audio synthesis — zero external runtime assets required; static `public/cover.webp` (960×600) for portal catalog.

## Project layout

```text
src/
├── core/
│   ├── Constants.js       # All vehicle stats, physics tuning, city layout, stunt points, colors, storage keys
│   ├── EventBus.js        # Singleton pub/sub event bus (domain:action naming)
│   ├── GameState.js       # Centralized state singleton + reset() + pg:skyline-outlaws: persistence
│   └── Game.js            # Main orchestrator, renderer.setAnimationLoop, resize & lifecycle
├── systems/
│   ├── InputSystem.js     # Unified keyboard + mobile touch controls (virtual stick + action buttons)
│   ├── CameraSystem.js    # Smooth 3rd-person chase camera with speed FOV, drift lag, and flight pitch tracking
│   ├── StuntSystem.js     # Detects Big Air, Drift, Sky Rings, Close Calls, Rooftop Landings, Combos
│   ├── PoliceSystem.js    # Heat level, police cruiser & drone AI, capture vs escape logic
│   └── ParticleSystem.js  # Jet flames, boost trails, drift sparks, ring burst particles
├── gameplay/
│   └── PlayerVehicle.js   # Futuristic sports car 3D model, Drive/Flight transformation & arcade physics
├── level/
│   └── CityBuilder.js     # Compact 3D city: road network, skyscrapers, ramps, bridges, helipads, sky rings
├── audio/
│   ├── AudioManager.js    # Web Audio API context, master gain, mute state, BGM sequencer
│   ├── AudioBridge.js     # EventBus → SFX & engine synth modulation
│   ├── music.js           # Procedural synthwave arcade BGM loop
│   └── sfx.js             # Engine/jet continuous synth, drift screech, siren, stunt chimes, crash SFX
├── ui/
│   └── HUD.js             # English HUD, speedometer, Drive/Flight badge, stunts, pursuit bar, garage/challenges, pause/busted modals
└── main.js                # Entry point + window.render_game_to_text() + window.advanceTime()
```

## Conventions

- **Code naming:** `PascalCase` for classes/components, `camelCase` for methods/variables, `UPPER_SNAKE_CASE` for constants and `Events`.
- **Communication:** Cross-module communication goes through `eventBus` (`src/core/EventBus.js`).
- **Saves:** Stored in `localStorage` under `pg:skyline-outlaws:save`.
- **Delta time:** Always clamped via `Math.min(clock.getDelta(), 0.1)`.

## Out-of-scope dependencies

- No external physics WASM binary required at runtime (custom deterministic arcade vehicle + flight + AABB/ramp surface solver ensures zero WASM load failures, instant boot, and rock-solid driving/flying feel).
- No external trackers, analytics, or monetization SDKs per platform publishing contract.
