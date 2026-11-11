export const STORAGE_KEY = 'pg:skyline-outlaws:save';

export const IS_MOBILE =
  typeof navigator !== 'undefined' &&
  (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1));

export const GAME = {
  FOV_BASE: 62,
  FOV_MAX: 82,
  NEAR: 0.2,
  FAR: 1400,
  MAX_DELTA: 0.1,
  MAX_DPR: 2,
  WORLD_BOUNDS: 380,
};

export const COLORS = {
  SKY_TOP: 0x4f86d4,
  SKY_HORIZON: 0xcfd9e2,
  FOG: 0xbecad5,
  AMBIENT_LIGHT: 0xdce6f2,
  HEMI_GROUND: 0x7d7a68,
  SUN_LIGHT: 0xfff1de,
  SUN_RIM_LIGHT: 0xc9d6e6,
  GRASS: 0x6c714e,
  SIDEWALK: 0x7a7e85,
  PLAZA: 0x85888e,
  ROAD_ASPHALT: 0x2e3137,
  ROAD_LINE_WHITE: 0xe6e8ea,
  ROAD_LINE_CYAN: 0x46e0e8,
  ROAD_LINE_AMBER: 0xe2b23a,
  KERB_RED: 0x9da1a8,
  KERB_WHITE: 0xb4b8be,
  ROOF_TRIM: 0xd5dbe2,
  OVERPASS_DECK: 0x8e939b,
  OVERPASS_PILLAR: 0x9ea2a8,
  SKYBRIDGE: 0x7f93ad,
  WINDOW_GLASS: 0xaecbe0,
  WINDOW_WARM: 0xe2d2ad,
  RAMP_SURFACE: 0xd2552f,
  RAMP_GLOW: 0x46e0e8,
  RING_GOLD: 0xffc531,
  RING_CYAN: 0x46e0e8,
  POLICE_RED: 0xff2d55,
  POLICE_BLUE: 0x2fa8ff,
  POLICE_BODY: 0xf2f3f5,
  POLICE_DOORS: 0x1f2f55,
  DRONE_BODY: 0xd5d9df,
  CAR_CHASSIS: 0x24272e,
  CAR_GLASS: 0x1c2533,
  CAR_TIRE: 0x1e2025,
  TAIL_LIGHT: 0xff3d6e,
};

// Natural hazy-daylight art direction (visual-only values; never read by gameplay)
export const VISUALS = {
  TONE_MAPPING: 'Neutral',
  TONE_MAPPING_EXPOSURE: 0.95,
  ENV_INTENSITY: 0.7,
  FOG_NEAR: 150,
  FOG_FAR: 1050,
  HEMI_INTENSITY: 1.0,
  SUN_INTENSITY: 2.1,
  SUN_LIGHT_POSITION: [-150, 280, 190],
  RIM_INTENSITY: 0.5,
  SCENERY_SEED: 1337,
  GROUND_SIZE: 1900,
  BUILDING_PALETTE: [0x6d7f96, 0x8a96a8, 0x5f6f86, 0x7c8ba0, 0x9aa5b4, 0x6b7a8c, 0x56677d, 0x8392a6],
  TWIN_TOWER_COLOR: 0x6f9cc0,
  BUILDING_METALNESS: 0.35,
  BUILDING_ROUGHNESS: 0.3,
  SIDEWALK_WIDTH: 5,
  KERB_LENGTH: 3.2,
  SKY: {
    RADIUS: 1250,
    TOP: 0x2f63b8,
    UPPER: 0x76a3da,
    HORIZON: 0xbecad5,
    BELOW: 0xb9c2c8,
    GLOW: 0xfff4dc,
    SUN_CORE: 0xffffff,
    SUN_DIRECTION: [-0.35, 0.42, -0.84],
    SUN_DISC_COS: 0.9975,
    STAR_COUNT: 0,
    STAR_MIN_ELEVATION: 0.38,
    STAR_SIZE: 2.4,
  },
  CLOUDS: {
    COUNT: 30,
    PUFFS_PER_CLOUD: 6,
    MIN_Y: 150,
    MAX_Y: 250,
    SPREAD: 650,
    DRIFT_SPEED: 4,
    SIZE_MIN: 20,
    SIZE_MAX: 42,
    COLOR: 0xffffff,
    EMISSIVE: 0xe4ebf3,
  },
  SPARKLES: {
    COUNT: 40,
    BOX: 80,
    RISE_SPEED: 1.0,
    SIZE: 0.3,
    COLORS: [0xffffff, 0xdff6ff],
  },
  MOUNTAINS: {
    COUNT: 34,
    MIN_RADIUS: 600,
    MAX_RADIUS: 820,
    MIN_HEIGHT: 80,
    MAX_HEIGHT: 210,
    COLORS: [0x7d8794, 0x8b94a0, 0x6f7a86, 0x98a0a8, 0x857e74],
  },
  TREES: {
    COUNT: 300,
    AREA: 420,
    CLEARANCE: 6,
    COLORS: [0xd9772f, 0xc94a3a, 0xe0a63a, 0xb8862f, 0x8a8f3a, 0xd65f3a, 0xe8b84a],
    TRUNK_COLOR: 0x5e4636,
  },
  ROCKS: {
    COUNT: 90,
    MIN_RADIUS: 300,
    MAX_RADIUS: 540,
    COLORS: [0x8d8f8a, 0x7a7c78, 0xa09a8c, 0x6e706c],
  },
  UNDERGLOW_OPACITY: 0.65,
  TAIL_TRAIL_MIN_SPEED: 26,
  TAIL_TRAIL_LIFE: 0.5,
  PARTICLE_OPACITY: 0.72,
  BURST_PARTICLE_SCALE: 0.75,
  EXHAUST_LIFE: 0.22,
  EXHAUST_SCALE: 0.55,
  EXHAUST_STRETCH: 4.5,
  EXHAUST_FLATTEN: 0.6,
  DRIFT_SPARK_SCALE: 0.55,
  DUST_COLOR: 0x8a8f99,
  LANDING_DUST_PER_IMPACT: 0.8,
  LANDING_DUST_MAX: 18,
  TYRE_SMOKE_MIN_SLIP: 0.09,
  TYRE_SMOKE_MIN_SPEED: 20,
  TYRE_SCREECH_MIN_SLIP: 0.07,
  TYRE_SCREECH_MAX_VOLUME: 0.03,
  TAIL_TRAIL_SCALE: 0.9,
  TAIL_TRAIL_STRETCH: 8.5,
  TAIL_TRAIL_FLATTEN: 0.35,
  POLICE_HALO_OPACITY: 0.5,
  POLICE_HALO_RADIUS: 0.42,
};

export const VEHICLES = {
  apex: {
    id: 'apex',
    name: 'Apex Vector',
    tagline: 'Balanced experimental jet-coupe with crisp drift stability.',
    cost: 0,
    maxDriveSpeed: 72,
    maxFlightSpeed: 88,
    acceleration: 44,
    brakeForce: 58,
    turnRate: 2.35,
    driftTurnMultiplier: 1.45,
    flightClimbRate: 34,
    flightBankRate: 2.4,
    boostMultiplier: 1.42,
    primaryColor: 0x00e5ff,
    secondaryColor: 0x111625,
    thrusterColor: 0x00f5d4,
  },
  valkyrie: {
    id: 'valkyrie',
    name: 'Valkyrie GT',
    tagline: 'Hyper-agile stunt chassis built for tight skyscraper weaving.',
    cost: 600,
    maxDriveSpeed: 76,
    maxFlightSpeed: 92,
    acceleration: 50,
    brakeForce: 64,
    turnRate: 2.75,
    driftTurnMultiplier: 1.6,
    flightClimbRate: 40,
    flightBankRate: 2.8,
    boostMultiplier: 1.46,
    primaryColor: 0xff007f,
    secondaryColor: 0x17132a,
    thrusterColor: 0xffbe0b,
  },
  interceptor: {
    id: 'interceptor',
    name: 'Outlaw Phantom',
    tagline: 'Twin-turbine hypercar with blistering top speed and armor.',
    cost: 1200,
    maxDriveSpeed: 84,
    maxFlightSpeed: 102,
    acceleration: 54,
    brakeForce: 62,
    turnRate: 2.25,
    driftTurnMultiplier: 1.4,
    flightClimbRate: 38,
    flightBankRate: 2.35,
    boostMultiplier: 1.52,
    primaryColor: 0xff6b00,
    secondaryColor: 0x10141f,
    thrusterColor: 0x00f2fe,
  },
};

export const PAINTS = {
  cyber_cyan: {
    id: 'cyber_cyan',
    name: 'Cyber Cyan',
    body: 0x00e5ff,
    accent: 0x00f5d4,
    thruster: 0x00f5d4,
  },
  sunset_pulse: {
    id: 'sunset_pulse',
    name: 'Sunset Pulse',
    body: 0xff007f,
    accent: 0xffbe0b,
    thruster: 0xffbe0b,
  },
  hyper_lime: {
    id: 'hyper_lime',
    name: 'Hyper Lime',
    body: 0x80ff00,
    accent: 0x00f5d4,
    thruster: 0x80ff00,
  },
  crimson_heat: {
    id: 'crimson_heat',
    name: 'Crimson Heat',
    body: 0xff2a55,
    accent: 0xff9e00,
    thruster: 0xff6b00,
  },
};

export const UPGRADE_CONFIG = {
  topSpeed: {
    id: 'topSpeed',
    label: 'Top Speed',
    maxLevel: 5,
    baseCost: 200,
    perLevelBonus: 0.06,
  },
  acceleration: {
    id: 'acceleration',
    label: 'Acceleration',
    maxLevel: 5,
    baseCost: 200,
    perLevelBonus: 0.08,
  },
  jetThrust: {
    id: 'jetThrust',
    label: 'Jet Thrust',
    maxLevel: 5,
    baseCost: 250,
    perLevelBonus: 0.08,
  },
  boostCapacity: {
    id: 'boostCapacity',
    label: 'Boost Core',
    maxLevel: 5,
    baseCost: 200,
    perLevelBonus: 0.12,
  },
};

export const PHYSICS = {
  GRAVITY: 28,
  GROUND_FRICTION: 2.2,
  AIR_DRAG: 0.45,
  LATERAL_GRIP_NORMAL: 8.5,
  LATERAL_GRIP_DRIFT: 2.6,
  MIN_FLIGHT_TAKEOFF_SPEED: 14,
  FLIGHT_MIN_CRUISE_SPEED: 26,
  FLIGHT_AUTO_LEVEL_RATE: 3.2,
  FLIGHT_MAX_PITCH: 0.72,
  FLIGHT_MAX_ROLL: 0.68,
  WING_DEPLOY_SPEED: 4.5,
  BOOST_DRAIN_RATE: 26,
  BOOST_RECHARGE_RATE: 15,
  START_X: 0,
  START_Y: 0.6,
  START_Z: 120,
  // Game-feel solver constants (tunable values live in VEHICLE_TUNING)
  REVERSE_MAX_SPEED: 24,
  ACCEL_CURVE_FLOOR: 0.08,
  OVERSPEED_DECAY: 1.2,
  PARKED_LATERAL_DAMPING: 20,
  HIGH_SPEED_STEER_START: 25,
  ACCEL_SMOOTHING: 8,
  MAX_BODY_PITCH: 0.05,
  MAX_BODY_ROLL: 0.09,
  CRASH_STEER_LOSS: 0.7,
  WALL_HEAD_ON_COS: 0.3,
  WALL_FULL_FRICTION_IMPACT: 20, // normal impact (m/s) at which the full wallFriction loss applies
  WALL_GLANCE_RATE: 14, // 1/s: ~95% of the glance swing happens within 0.2 s // |cos| between nose and wall below this = head-on (bounce, no glance)
  SLIP_MIN_SPEED: 3,
  CRASH_FULL_STUN_IMPACT: 35,
  MAX_CRASH_YAW_RATE: 3,
  COLLISION_EVENT_MIN_IMPACT: 8,
  COLLISION_EVENT_MIN_IMPACT_FLIGHT: 12,
  FLIGHT_CEILING: 165,
  FLIGHT_MIN_SPEED_AFTER_HIT: 12,
  TERMINAL_FALL_SPEED: 75,
  ENGINE_CUT_LIFT_KEEP: 0.25,
};

export const CAMERA_CONFIG = {
  DRIVE_DISTANCE: 10.5,
  DRIVE_HEIGHT: 3.9,
  FLIGHT_DISTANCE: 12.2,
  FLIGHT_HEIGHT: 4.4,
  BOOST_EXTRA_DISTANCE: 2.2,
  LOOK_AHEAD: 6.5,
  POS_SMOOTHING: 10.0,
  LOOK_SMOOTHING: 12.0,
  MENU_ORBIT_RADIUS: 15,
  MENU_ORBIT_HEIGHT: 5.5,
  MENU_ORBIT_SPEED: 0.22,
  INTRO_DURATION: 1.3,
  INTRO_POS_SMOOTHING: 3.2,
  SPEED_REFERENCE: 75,
  PULLBACK_SMOOTHING: 3,
  MAX_ACCEL_PULLBACK: 2.2,
  MAX_BRAKE_PUSH_IN: 1.2,
  SHAKE_DECAY: 9,
  TRAVEL_LOOK_MIN_SPEED: 5,
  TRAVEL_LOOK_BLEND: 0.5,
  FOV_SMOOTHING: 6,
  LANDING_SHAKE_PER_IMPACT: 0.02,
  LANDING_SHAKE_MIN_IMPACT: 10,
};

// ---------------------------------------------------------------------------
// Vehicle game-feel tuning (live-editable via the debug panel: press ` or open with ?tune)
// Units: speeds m/s, rates 1/s (exponential response), angles rad, accelerations m/s².
// The three presets are experimental comparison points, not known values of any reference game.
// ---------------------------------------------------------------------------
const REFERENCE_TUNING = {
  drive: {
    accelMult: 1.3, // × vehicle acceleration stat
    accelCurve: 0.55, // exponent on (1 - speed/max): <1 = punchy start that tapers near top speed
    brakeDecel: 64, // constant, predictable braking
    coastDrag: 0.32, // exponential drag with throttle released (inertia)
    rollingDecel: 2.5, // constant rolling resistance while coasting
    steerRise: 10, // how fast the virtual steering wheel turns in (units/s)
    steerReturn: 16, // how fast it re-centres on release
    steerRateMult: 1.0, // × vehicle turnRate stat
    steerFullSpeed: 12, // below this speed steering authority fades toward 0
    highSpeedSteer: 0.62, // steering authority at top speed (speed-sensitive steering)
    yawResponse: 13, // angular response while steering
    yawDamping: 22, // angular damping on release (kills pendulum / overshoot)
    lateralGrip: 11, // lateral slip damping (higher = more on rails)
    slipRecovery: 6, // extra grip when steering is released
    driftGrip: 3.0, // lateral grip while holding Drift
    maxSlipAngle: 0.22, // spin-out guard (normal driving)
    driftMaxSlipAngle: 0.55, // spin-out guard (drifting)
    cornerRetention: 0.85, // share of scrubbed lateral speed kept as forward speed
    autoRight: 12, // body auto-stabilisation spring (critically damped, rad/s)
    bodyRoll: 0.0045, // visual lean per m/s² lateral accel
    bodyPitch: 0.0025, // visual squat/dive per m/s² longitudinal accel
    wallRestitution: 0.18,
    wallFriction: 0.9, // tangential speed kept when scraping a wall
    wallAlign: 0.6, // share of the angle to the wall the nose swings through on a glancing hit
    crashSpin: 0.035, // yaw kick per m/s of impact speed
    crashStunTime: 0.45, // max reduced-steering time after a heavy hit
    fallGravityMult: 2.2, // gravity multiplier while falling (rising uses normal gravity)
    airSteer: 0.85, // steering authority while airborne in Drive mode
    airGrip: 3.5, // how fast the trajectory follows the nose in the air
    airAccel: 0.3, // share of throttle/brake authority available in the air
  },
  flight: {
    accel: 2.6, // response toward target airspeed
    yawRateMult: 1.0, // × vehicle flightBankRate stat
    yawResponse: 8,
    yawDamping: 11,
    pitchResponse: 6.5,
    autoLevel: 3,
    autoLevelDelay: 0.2, // seconds after releasing pitch before auto-level helps
    momentum: 6, // how fast velocity aligns with the nose (lower = more drift/inertia)
    diveRate: 1.0, // dives descend at sin(pitch) × airspeed × diveRate (climbs are thrust-limited)
    bankAngle: 0.62,
    takeoffLift: 8, // upward m/s added on take-off (momentum otherwise preserved)
    takeoffPitch: 0.2,
    takeoffAssistTime: 0.5,
    landingMinPitch: -0.45, // flare: steepest dive allowed close to the ground
    landingAssistHeight: 5,
    diveSpeedGain: 14, // diving trades altitude for speed (and climbing the reverse)
  },
  camera: {
    posLag: 9, // follow stiffness (higher = tighter)
    yawLag: 5.5, // heading follow (lower = more of the car's side shows in turns)
    distance: 10.5,
    flightDistance: 12.2,
    height: 3.9,
    flightHeight: 4.4,
    distanceSpeed: 2.2, // extra distance at top speed
    accelPullback: 0.05, // extra distance per m/s² of acceleration
    fovBase: 62,
    fovMax: 80,
    fovBoost: 5,
  },
};

const withOverrides = (base, overrides) => ({
  drive: { ...base.drive, ...overrides.drive },
  flight: { ...base.flight, ...overrides.flight },
  camera: { ...base.camera, ...overrides.camera },
});

export const VEHICLE_TUNING = {
  DEFAULT_PRESET: 'reference',
  STORAGE_KEY: 'pg:skyline-outlaws:tuning',
  MAX_SUBSTEP: 1 / 240, // max physics sub-step for frame-rate independent handling
  PRESETS: {
    responsive: withOverrides(REFERENCE_TUNING, {
      drive: {
        accelMult: 1.45,
        accelCurve: 0.4,
        coastDrag: 0.45,
        steerRise: 14,
        steerReturn: 22,
        yawResponse: 18,
        yawDamping: 30,
        highSpeedSteer: 0.72,
        lateralGrip: 24,
        slipRecovery: 10,
        maxSlipAngle: 0.12,
        bodyRoll: 0.003,
        crashStunTime: 0.3,
        wallAlign: 0.75,
        fallGravityMult: 2.4,
        airSteer: 1.0,
        airGrip: 5,
        airAccel: 0.4,
      },
      flight: { yawResponse: 12, yawDamping: 16, pitchResponse: 8, momentum: 8, autoLevelDelay: 0.15, diveRate: 1.1 },
      camera: { posLag: 14, yawLag: 9, fovMax: 78, accelPullback: 0.03 },
    }),
    reference: withOverrides(REFERENCE_TUNING, {}),
    stable: withOverrides(REFERENCE_TUNING, {
      drive: {
        accelMult: 1.1,
        accelCurve: 0.75,
        coastDrag: 0.24,
        steerRise: 4.5,
        steerReturn: 8,
        yawResponse: 6,
        yawDamping: 10,
        highSpeedSteer: 0.5,
        lateralGrip: 6.5,
        slipRecovery: 3,
        maxSlipAngle: 0.3,
        bodyRoll: 0.006,
        bodyPitch: 0.0035,
        crashStunTime: 0.6,
        wallAlign: 0.5,
        fallGravityMult: 1.8,
        airSteer: 0.6,
        airGrip: 2.2,
        airAccel: 0.2,
      },
      flight: { yawResponse: 4.5, yawDamping: 6, pitchResponse: 4, momentum: 3.5, autoLevelDelay: 0.35, diveRate: 0.85 },
      camera: { posLag: 6.5, yawLag: 4, fovMax: 80, accelPullback: 0.07 },
    }),
  },
  // Debug-panel sliders: [group, key, label, min, max, step]
  SCHEMA: [
    ['drive', 'accelMult', 'Acceleration', 0.5, 2.5, 0.05],
    ['drive', 'accelCurve', 'Accel curve', 0.2, 1.5, 0.05],
    ['drive', 'brakeDecel', 'Braking', 20, 120, 1],
    ['drive', 'coastDrag', 'Coast drag', 0, 2, 0.02],
    ['drive', 'steerRise', 'Steer in', 2, 30, 0.5],
    ['drive', 'steerReturn', 'Steer return', 2, 40, 0.5],
    ['drive', 'steerRateMult', 'Steer rate', 0.5, 1.6, 0.05],
    ['drive', 'highSpeedSteer', 'High-speed steer', 0.3, 1, 0.02],
    ['drive', 'yawResponse', 'Yaw response', 2, 30, 0.5],
    ['drive', 'yawDamping', 'Angular damping', 2, 40, 0.5],
    ['drive', 'lateralGrip', 'Lateral grip', 2, 40, 0.5],
    ['drive', 'slipRecovery', 'Slip recovery', 0, 20, 0.5],
    ['drive', 'driftGrip', 'Drift grip', 0.5, 10, 0.1],
    ['drive', 'maxSlipAngle', 'Max slip', 0.05, 0.6, 0.01],
    ['drive', 'autoRight', 'Auto-stabilise', 4, 30, 0.5],
    ['drive', 'crashStunTime', 'Crash stun', 0, 1.5, 0.05],
    ['drive', 'wallAlign', 'Wall glance', 0, 1, 0.05],
    ['drive', 'fallGravityMult', 'Fall gravity', 1, 3.5, 0.05],
    ['drive', 'airSteer', 'Air steer', 0, 1.2, 0.05],
    ['drive', 'airGrip', 'Air grip', 0, 10, 0.1],
    ['drive', 'airAccel', 'Air throttle', 0, 1, 0.05],
    ['flight', 'accel', 'Flight accel', 0.5, 8, 0.1],
    ['flight', 'yawRateMult', 'Flight steer', 0.5, 1.8, 0.05],
    ['flight', 'yawResponse', 'Flight yaw resp.', 1, 20, 0.5],
    ['flight', 'pitchResponse', 'Pitch response', 1, 15, 0.5],
    ['flight', 'autoLevel', 'Auto-level', 0, 8, 0.1],
    ['flight', 'momentum', 'Flight momentum', 1, 15, 0.5],
    ['flight', 'diveRate', 'Dive speed', 0.4, 1.5, 0.05],
    ['camera', 'posLag', 'Camera follow', 2, 25, 0.5],
    ['camera', 'yawLag', 'Camera yaw lag', 1, 20, 0.5],
    ['camera', 'distance', 'Camera distance', 6, 18, 0.1],
    ['camera', 'accelPullback', 'Accel pull-back', 0, 0.15, 0.005],
    ['camera', 'fovBase', 'FOV base', 50, 80, 1],
    ['camera', 'fovMax', 'FOV max', 60, 100, 1],
  ],
};

export const STUNTS = {
  COMBO_WINDOW: 5.0,
  MAX_COMBO: 10,
  MIN_DRIFT_TIME: 0.65,
  MIN_DRIFT_SPEED: 20,
  MIN_AIR_TIME: 0.75,
  MIN_FLIGHT_TIME: 2.5,
  CANYON_MAX_BUILDING_DIST: 22,
  CLOSE_CALL_DIST: 5.8,
  CLOSE_CALL_COOLDOWN: 1.3,
  POINTS: {
    DRIFT: 120,
    BIG_AIR: 180,
    SKY_RING: 250,
    CLOSE_CALL: 150,
    PERFECT_LANDING: 200,
    ROOFTOP_LANDING: 300,
    LONG_FLIGHT: 160,
    ESCAPED: 500,
  },
};

export const POLICE = {
  TRIGGER_SCORE_THRESHOLD: 450,
  DETECTION_RADIUS: 58,
  STANDOFF_DISTANCE: 10.5,
  MIN_PLAYER_DISTANCE: 8.2,
  UNIT_SEPARATION: 5.5,
  CAPTURE_RADIUS: 24,
  CAPTURE_DURATION: 5.5,
  CAPTURE_DECAY_RATE: 0.42,
  RAM_COOLDOWN: 1.5,
  RAM_DAMAGE: 18,
  ESCAPE_DURATION: 6.5,
  CRUISER_BASE_SPEED: 68,
  DRONE_BASE_SPEED: 64,
  MAX_UNITS_PER_HEAT: [0, 2, 3, 4],
  // Car-like pursuit steering
  TURN_RATE: 3.0,
  ACCELERATION: 42,
  ARRIVE_DISTANCE: 4,
  SETTLE_RATE: 2.5,
  CLOSING_GAIN: 1.6,
  MIN_CORNER_SPEED_FACTOR: 0.35,
  CATCHUP_DISTANCE: 12,
  CATCHUP_SPEED_MULT: 1.18,
  BOX_IN_SPEED: 12,
  SPAWN_BEHIND_DISTANCE: 42,
  // forward < 0 is behind the player; `box` slots surround a (nearly) stopped player
  FORMATION: [
    { isDrone: false, chase: { forward: -3, right: -7.5 }, box: { forward: 4, right: -7.5 }, spawnRight: -10 },
    { isDrone: true, chase: { forward: -4, right: 0 }, box: { forward: 0, right: 0 }, spawnRight: 0, heightOffset: 7 },
    { isDrone: false, chase: { forward: -11, right: 2.5 }, box: { forward: -3, right: 7.8 }, spawnRight: 10 },
    { isDrone: true, chase: { forward: -7, right: 6 }, box: { forward: -6, right: -6 }, spawnRight: 14, heightOffset: 9 },
  ],
};

export const CHALLENGES = [
  {
    id: 'ring_rush',
    title: 'Sky Ring Blitz',
    description: 'Fly or jump through 5 glowing Sky Rings before the timer runs out.',
    duration: 60,
    targetType: 'rings',
    targetValue: 5,
    rewardCredits: 600,
  },
  {
    id: 'police_escape',
    title: 'Most Wanted Escape',
    description: 'Trigger a Heat 2 Police Chase and evade the interceptors.',
    duration: 75,
    targetType: 'escapes',
    targetValue: 1,
    forceHeat: 2,
    rewardCredits: 800,
  },
  {
    id: 'stunt_master',
    title: 'Outlaw Stunt Run',
    description: 'Score 3,500 stunt points in a single 60-second blitz.',
    duration: 60,
    targetType: 'score',
    targetValue: 3500,
    rewardCredits: 700,
  },
];
