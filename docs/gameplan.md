# Skyline Outlaws: Jet Chase

## Pitch

An arcade 3D driving and flying-car playground where you tear through a neon-lit metropolis in an experimental jet-powered supercar — drifting corners, launching off mega-ramps, transforming mid-air to thread between skyscrapers, chaining stunts, and outrunning police interceptors.

## Core gameplay loop

**Explore → Stunt → Trigger Chase → Evade (Road or Sky) → Cash In Score & Combo → Beat High Score / Upgrade.**

1. **Drive & Boost**: Accelerate immediately on an open boulevard facing a signature stunt ramp. Carve corners with responsive arcade drift (`Shift` / `Space` / touch Drift button) and afterburner nitro (`E` / `B` / touch Boost button).
2. **Launch & Transform**: Hit ramps or press the Flight toggle (`F` / `Tab` / touch Flight Mode button) to deploy folding aero-wings and ignite twin vector-thrust jet engines.
3. **Aerial Playground**: Climb, dive, bank between twin towers, thread glowing sky-rings, and stick clean landings on elevated highways or skyscraper helipads.
4. **Police Pursuit & Escape**: High speed, reckless stunts, or entering pursuit zones alerts the Metro Interceptor unit. Sirens flash, interceptors converge — on the road or, when the player takes off, with their own wings in the air, and a pursuit heat gauge activates. Break line-of-sight by vaulting over buildings, weaving through skybridges, or outrunning cruisers until the cooldown timer completes for an `ESCAPED!` bonus.
5. **Combo & Upgrades**: Chain drifts, air time, sky-rings, near-misses, rooftop landings, and police escapes within the combo window to multiply points. Spend earned credits in the Quick Garage on vehicle unlocks, performance upgrades, and thruster trail colors, or jump into optional 60-second Blitz Challenges.

## Game rules

- **Dual-Mode Transformation**:
  - **Drive Mode**: Arcade rear-wheel suspension feel with high grip at low speed, controlled powerslide drift when holding Drift while steering, automatic upright stabilization (never gets stuck upside-down), and nitro boost.
  - **Flight Mode**: Activated anytime (on ground above 40 km/h or instantly mid-air) via `F` / `Tab` / UI Flight toggle. Wings extend, wheels tuck inward with glowing thrusters, and controls smoothly govern pitch (`W`/`S` or `Up`/`Down` / virtual stick Y) and roll+yaw bank (`A`/`D` or `Left`/`Right` / virtual stick X). Auto-leveling gently assists roll and pitch when input is released so flying feels effortless. Touching down smoothly on a road or flat rooftop can either skim into Drive Mode or re-ascend.
- **Stunt & Combo System**:
  - `BIG AIR!` — Airborne jump off a ramp or drop (> 1.0 s air time).
  - `NICE DRIFT!` — Sustained powerslide (> 0.8 s at speed).
  - `SKY RING!` — Fly or jump through an illuminated aerial ring (+250 pts, restores boost).
  - `CLOSE CALL!` — High-speed pass within close proximity of a building tower, traffic pylon, or police cruiser (+150 pts).
  - `ROOFTOP TOUCHDOWN!` / `PERFECT LANDING!` — Clean landing on a skyscraper rooftop pad or road (+200 pts).
  - `ESCAPED!` — Evade an active police pursuit (+500 pts × Heat Level).
  - **Combo Multiplier**: Performing another stunt within 4.5 seconds increments the combo multiplier (`x1` → `x2` → ... → `x10`). Hard head-on crashes bank/reset the active combo and deal hull damage during pursuits.
- **Police Chase**:
  - Triggered automatically after accumulating stunt heat, speeding past patrol units, or pressing the `Pursuit Challenge` trigger.
  - Heat Levels 1–3 spawn 2–4 interceptors whose top speed is 90–100% of the player's (82–94% in the air). They only track the player while they can see them (range + line of sight); out of sight they search the last known position.
  - If police box in or ram the player until Integrity reaches 0% ("BUSTED"), the current unbanked combo is lost and the run can be instantly restarted (`R` or Restart button) with zero friction.
  - Staying outside pursuit capture range until the Escape bar fills banks a massive `ESCAPED!` bonus and repairs vehicle integrity.

## Win / lose conditions

- **Open-World Arcade + High-Score Chasing**: The primary mode is an open playground where the goal is to set a new personal best score, complete optional 60-second challenges (`Ring Rush`, `Most Wanted Escape`, `Rooftop Hop`), and unlock all 3 vehicles + upgrades.
- **Fail Condition (Busted / Wrecked)**: Taking 100% hull damage from police rams during an active pursuit triggers the `BUSTED!` overlay with run statistics (Score, Best Score, Stunts Landed, Credits Earned) and an instant `Play Again` / `Restart` button.

## Art style

- **3D Stylized Cyber-Sunset Metropolis**:
  - Crisp low-poly geometric architecture with glowing neon window grids, cyan/magenta/amber rim lighting, elevated highway overpasses, twin glass skyscrapers with a sky-bridge, industrial docks, and a central stunt plaza.
  - Custom multi-part 3D sports cars (sculpted low-slung wedge chassis, cabin canopy, glowing LED headlight strips, full-width tail light bar, rotating alloy wheels, animated retractable aero-wings, and twin rear jet nozzles with dynamic flame cones).
  - Dynamic speed lines, tire drift marks/sparks, thruster trails, and police red/blue strobe lights.

## Audio direction

- **Procedural Web Audio API Synthesizer (Zero external assets)**:
  - Dynamic RPM-synced engine synth (deep growl sawtooth/triangle blend in Drive Mode; high-tech turbine whine + afterburner roar in Flight Mode).
  - Tire screech noise filter during drifts, whoosh on boost/transformation, ascending chime on Sky Rings and Stunt notifications, pulsing dual-tone police siren during pursuits, impact thud on collisions, and synthwave arcade BGM loop with mute toggle (`M` or HUD button).

## Player goals

- **First 60 seconds**: Accelerate down Neon Boulevard, hit the central Mega Ramp right in front of spawn, transform into Flight Mode mid-air, fly through the first glowing Sky Ring between the Twin Towers, trigger the first stunt combo, and outrun the first police interceptor.
- **Medium term**: Master seamless Drive ↔ Flight transitions, chain `x5+` combos across rooftops and bridges, complete the 3 Blitz Challenges, and upgrade top speed / jet thrust / boost capacity.

## Anti-goals

- Not a punishing simulation racer or complex flight simulator (no stall physics or complicated throttle management).
- No fuel locks that prevent the player from flying freely in P0.
- No forced cutscenes, unskippable tutorials, or intrusive ads.

## References

- *Tesla Roadster Chase* (Roblox) — Accessible drive-to-fly transformation, instant fun, police chase sandbox energy.
- *Burnout Paradise* — Arcade drift feel, ramps everywhere, stunt notifications, aggressive pursuit energy.

## Open questions

- None — desktop keyboard and mobile touch controls (`supportedDevices: ["desktop", "mobile"]`) are both supported out of the box per platform rules and P1.8.
