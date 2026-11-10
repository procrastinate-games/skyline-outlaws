# Skyline Outlaws: Jet Chase

A 3D arcade driving, flying-car stunt, and police-chase playground built with Three.js, Vite, and procedural Web Audio API synthesis.

## Gameplay Highlights

- **Dual-Mode Futuristic Supercar**: Tear through a cyber-sunset metropolis with arcade powerslide drifting and nitro boost, then press **F** (or tap **Flight Mode**) to unfold aero-wings and ignite twin vector-thrust jet engines.
- **Designed for Aerial Stunts**: Launch off 8 mega-ramps, weave between the Twin Cyber Towers, thread 14 glowing Sky Rings, and touch down on skyscraper rooftop helipads.
- **Multi-Heat Police Pursuits**: Outrun police interceptor cruisers and aerial hunter drones across Heat Levels 1–3. Break line-of-sight by vaulting over buildings to bank massive `ESCAPED!` bonuses.
- **Garage & Blitz Challenges**: Unlock 3 vehicles (`Apex Vector`, `Valkyrie GT`, `Outlaw Phantom`), upgrade 4 performance systems, customize liveries, and compete in 60-second Blitz Challenges.

## Controls

- **Drive Mode**: `W`/`S` or `Up`/`Down` Accelerate/Brake · `A`/`D` or `Left`/`Right` Steer · `Space` Drift · `Shift`/`E` Boost · `F`/`Tab` Transform to Jet Flight
- **Flight Mode**: `W`/`S` or `Up`/`Down` Pitch Climb/Dive · `A`/`D` or `Left`/`Right` Bank Turn · `Shift`/`E` Afterburner Boost · `F`/`Tab` Return to Drive Mode
- **Shortcuts**: `G` Garage · `C` Blitz Challenges · `V` Trigger Police Chase · `P`/`Esc` Pause · `R` Restart · `M` Mute Audio
- **Mobile**: Virtual left thumbstick + on-screen `FLIGHT MODE`, `BOOST`, `DRIFT`, `GAS`, and `BRAKE` touch buttons.

## Development & Verification

```bash
npm install
npm test
npm run build
node scripts/platform/validate.mjs skyline-outlaws
node scripts/platform/smoke.mjs
```
