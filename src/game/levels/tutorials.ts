import type { ObjectType } from './schema';

/**
 * One-time hints painted into the level the first time the player meets a
 * new kind of object (or gains a new ability). Edit freely.
 * Wording avoids specific keys so it fits keyboard, gamepad and touch.
 */
export const OBJECT_TUTORIALS: Partial<Record<ObjectType, string>> = {
  oneWay: 'Thin ledges: jump up through them.\nHold Down and press Jump to drop back through.',
  conveyor: 'Conveyor belts drag you along.',
  movingPlatform: 'Iron platforms move. Stand on one to ride it.',
  pathPlatform: 'This platform follows a path. Ride it.',
  fallingPlatform: 'Rotten planks drop soon after you land on them.',
  crumblingPlatform: 'Old slabs crumble under your feet. Keep moving.',
  timedPlatform: 'Phantom stones fade in and out. Watch their rhythm.',
  elevator: 'Stand on the lift to ride it.',
  spikes: 'Spikes are deadly. Jump over them.',
  pendulum: 'Swinging blade. Wait for the gap.',
  fallingHazard: 'Loose masonry falls when you pass underneath.',
  movingHazard: 'Spiked iron ball. Don’t touch it.',
  sludge: 'Poison sludge. Don’t fall in.',
  chaser: 'The darkness is coming. Run!',
  pressurePlate: 'Pressure plates work only while you stand on them.',
  lever: 'Touch a lever to flip it.',
  button: 'Step on the button. It stays pressed.',
  timedSwitch: 'Timed switches only last a few seconds. Hurry!',
  gate: 'Iron gates are opened by switches.',
  lockedDoor: 'Locked door. Find the key of the same colour.',
  key: 'A key! It opens a door of the same colour.',
  checkpoint: 'Touch the lantern post.\nIf you fall, you return here.',
  breakableWall: 'Cracked wall: Dash into it to break it.',
  spring: 'Springs launch you high into the air.',
  ghost: 'Ghosts drift back and forth and can’t be stomped. Slip past them.',
  skeleton: 'Jump on a skeleton’s skull to defeat it.',
  armoredSkeleton: 'Armored skeletons can’t be stomped. Avoid them.',
  bat: 'Bats fly back and forth. Stomp them or dodge.',
  raven: 'Ravens swoop fast. Time your move.',
  shadow: 'Shadows rise from dark pools when you get close.',
};

export const GOAL_TUTORIAL = 'Reach the moon door to finish the level.';

export const ABILITY_TUTORIALS: Record<'wallJump' | 'dash' | 'doubleJump', string> = {
  wallJump: 'NEW ABILITY — WALL JUMP\nHold toward a wall to slide down it, then press Jump to leap off.',
  dash: 'NEW ABILITY — DASH\nPress Dash for a burst of speed across wide gaps.',
  doubleJump: 'NEW ABILITY — DOUBLE JUMP\nPress Jump again in mid-air.',
};
