// Shared tuning for Ember Vault: sizes, speeds, sight and sound.
// One file holds every magic number so a level or a guard never hard-codes one.
export const TILE = 48;
export const VIEW_W = 1280;
export const VIEW_H = 800;

// Player movement, in pixels per second.
export const WALK_SPEED = 165;
export const SNEAK_SPEED = 88;
export const PEBBLE_SPEED = 520;

// Guard sight: how far a cone reaches and how wide it opens, in pixels and radians.
export const GUARD_VIEW_RANGE = 205;
export const GUARD_VIEW_HALF_ANGLE = 0.62;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 148;
export const GUARD_INVESTIGATE_SPEED = 96;

// Suspicion, 0 to 100. It climbs while a guard can see the player and falls
// while the player is out of sight; at 100 the guard raises the alarm.
export const SUSPICION_FULL = 100;
export const SUSPICION_GAIN_PER_SEC = 95;
export const SUSPICION_GAIN_SNEAKING = 42;
export const SUSPICION_GAIN_FAR = 55;
export const SUSPICION_DECAY_PER_SEC = 26;
export const SUSPICION_DECAY_ALARMED = 9;
export const ALARM_HOLD_SEC = 3.0;
export const CATCH_RADIUS = 24;

// Noise: a pebble or a running step is heard this far away.
export const PEBBLE_NOISE_RADIUS = 190;
export const STEP_NOISE_RADIUS = 95;
export const SNEAK_NOISE_RADIUS = 26;

// The player starts with this many pebbles and lives.
export const PEBBLES_START = 5;
export const LIVES_START = 3;

// How long a thrown pebble flies and how long its noise ring stays visible.
export const PEBBLE_FLIGHT_SEC = 0.55;
export const NOISE_RING_SEC = 0.8;

// Fixed-step simulation: the world advances in 1/60 s slices.
export const STEP = 1 / 60;
