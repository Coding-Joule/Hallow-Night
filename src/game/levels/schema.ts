import type { WorldId } from './worlds';

/**
 * LEVEL JSON SCHEMA (version 1)
 *
 * Coordinates are in pixels. The origin is the top-left of the level,
 * +x goes right and +y goes DOWN.
 *
 * - Objects: (x, y) is the TOP-LEFT corner, width/height their size.
 * - spawn / goal: (x, y) is the BOTTOM-CENTRE point (the feet of the player,
 *   the threshold of the exit door).
 */
export const LEVEL_SCHEMA_VERSION = 1;

export interface Point {
  x: number;
  y: number;
}

export interface LevelAbilities {
  wallJump: boolean;
  dash: boolean;
  doubleJump: boolean;
}

export type PropertyValue = string | number | boolean | string[] | Point[];

export interface LevelObject {
  /** Unique within the level. Used by switches to target objects. */
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, PropertyValue>;
}

export interface LevelData {
  version: number;
  id: string;
  name: string;
  world: WorldId;
  /** Position within its world (1-12 for built-in levels; 12 is the boss). */
  order: number;
  /** Global level number (1-204 for built-in levels). Optional for user levels. */
  number?: number;
  width: number;
  height: number;
  spawn: Point;
  goal: Point;
  background: WorldId;
  music: WorldId;
  abilities: LevelAbilities;
  objects: LevelObject[];
}

export const OBJECT_TYPES = [
  // terrain
  'ground',
  'platform',
  'oneWay',
  'slope',
  'conveyor',
  // platform mechanics
  'movingPlatform',
  'pathPlatform',
  'fallingPlatform',
  'crumblingPlatform',
  'timedPlatform',
  'elevator',
  // hazards
  'spikes',
  'pendulum',
  'fallingHazard',
  'movingHazard',
  'sludge',
  'chaser',
  // interactive
  'pressurePlate',
  'lever',
  'button',
  'timedSwitch',
  'gate',
  'lockedDoor',
  'key',
  'checkpoint',
  'breakableWall',
  'hiddenWall',
  'spring',
  // enemies
  'ghost',
  'skeleton',
  'armoredSkeleton',
  'pumpkinTortoise',
  'boss',
  'bat',
  'raven',
  'shadow',
  // items & scenery
  'relic',
  'sign',
  'decoration',
] as const;

export type ObjectType = (typeof OBJECT_TYPES)[number];

export function isObjectType(value: unknown): value is ObjectType {
  return typeof value === 'string' && (OBJECT_TYPES as readonly string[]).includes(value);
}
