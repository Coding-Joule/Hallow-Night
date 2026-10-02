/**
 * Central movement tuning. Every value is in pixels / seconds.
 * Tweak these to change how the lantern-bearer feels; all levels were
 * authored against the defaults below (a tile is 32 px).
 *
 * Reference numbers with the defaults:
 *   - full jump height        ≈ 139 px (4.3 tiles)
 *   - running jump distance   ≈ 248 px (7.7 tiles) at equal height
 *   - double jump reaches     ≈ 241 px of height
 *   - jump + dash covers      ≈ 382 px horizontally
 */
export const PLAYER_SPEED = 330; // max run speed
export const PLAYER_ACCELERATION = 3400; // ground acceleration
export const PLAYER_AIR_ACCELERATION = 2500; // steering while airborne
export const PLAYER_DRAG = 3000; // ground deceleration without input
export const PLAYER_AIR_DRAG = 900; // air deceleration without input

export const GRAVITY = 1900;
export const FALL_GRAVITY_MULTIPLIER = 1.12; // slightly heavier when falling
export const MAX_FALL_SPEED = 820;

export const JUMP_VELOCITY = 720;
export const JUMP_CUT_MULTIPLIER = 0.45; // velocity kept when jump released early
export const COYOTE_TIME = 0.1;
export const JUMP_BUFFER_TIME = 0.12;

export const WALL_SLIDE_SPEED = 110;
export const WALL_JUMP_X = 340;
export const WALL_JUMP_Y = 660;
export const WALL_JUMP_CONTROL_LOCK = 0.13; // seconds of reduced steering after a wall jump
export const WALL_COYOTE_TIME = 0.08;

export const DOUBLE_JUMP_VELOCITY = 620;

export const DASH_SPEED = 780;
export const DASH_DURATION = 0.16;
export const DASH_COOLDOWN = 0.22;

export const STOMP_BOUNCE = 600;
export const STOMP_BOUNCE_HELD = 820;
export const SPRING_DEFAULT_POWER = 1200;

export const STEP_UP_HEIGHT = 12; // small ledges/slopes the player walks over

export const PLAYER_WIDTH = 22;
export const PLAYER_HEIGHT = 30;
export const PLAYER_CROUCH_HEIGHT = 20;

export const FIXED_STEP = 1 / 120; // simulation step
