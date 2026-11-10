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
  SKY_TOP: 0x090d24,
  SKY_HORIZON: 0x24163d,
  FOG: 0x16122e,
  AMBIENT_LIGHT: 0x8fa8ff,
  HEMI_GROUND: 0x1b1528,
  SUN_LIGHT: 0xffb478,
  ROAD_ASPHALT: 0x1a1d28,
  ROAD_LINE_CYAN: 0x00f2fe,
  ROAD_LINE_AMBER: 0xffb703,
  RAMP_SURFACE: 0xff006e,
  RAMP_GLOW: 0x00f5d4,
  RING_GOLD: 0xffbe0b,
  RING_CYAN: 0x00f5d4,
  POLICE_RED: 0xff1654,
  POLICE_BLUE: 0x00bbf9,
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
};

export const STUNTS = {
  COMBO_WINDOW: 5.0,
  MAX_COMBO: 10,
  MIN_DRIFT_TIME: 0.65,
  MIN_DRIFT_SPEED: 20,
  MIN_AIR_TIME: 0.75,
  MIN_FLIGHT_TIME: 2.5,
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
