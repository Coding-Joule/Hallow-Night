import { defaultProperties, OBJECT_DEFS } from './objectTypes';
import { LEVEL_SCHEMA_VERSION, type LevelData, type LevelObject, type ObjectType } from './schema';
import type { WorldId } from './worlds';

/** Level (de)serialisation helpers shared by the game and both editors. */

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'level'
  );
}

export function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

/** Canonical key order so exported files diff nicely in git. */
export function canonicalLevel(level: LevelData): LevelData {
  return {
    version: LEVEL_SCHEMA_VERSION,
    id: level.id,
    name: level.name,
    world: level.world,
    order: level.order,
    ...(level.number !== undefined ? { number: level.number } : {}),
    width: level.width,
    height: level.height,
    spawn: { x: level.spawn.x, y: level.spawn.y },
    goal: { x: level.goal.x, y: level.goal.y },
    background: level.background,
    music: level.music,
    abilities: {
      wallJump: level.abilities.wallJump,
      dash: level.abilities.dash,
      doubleJump: level.abilities.doubleJump,
    },
    objects: level.objects.map((o) => ({
      id: o.id,
      type: o.type,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
      properties: { ...o.properties },
    })),
  };
}

export function levelToJSON(level: LevelData): string {
  return JSON.stringify(canonicalLevel(level), null, 2) + '\n';
}

export function cloneLevel<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** e.g. "18-servants-passage.json" */
export function officialFilename(level: Pick<LevelData, 'name' | 'number' | 'order'>): string {
  return `${pad2(level.number ?? level.order)}-${slugify(level.name)}.json`;
}

/** e.g. "haunted-manor/18-servants-passage.json" (manifest entry) */
export function manifestEntry(level: Pick<LevelData, 'name' | 'number' | 'order' | 'world'>): string {
  return `${level.world}/${officialFilename(level)}`;
}

export const BUILTIN_LEVEL_DIR = 'levels';
export const MANIFEST_PATH = 'levels/manifest.json';

export function officialPath(level: Pick<LevelData, 'name' | 'number' | 'order' | 'world'>): string {
  return `${BUILTIN_LEVEL_DIR}/${manifestEntry(level)}`;
}

export function createEmptyLevel(opts: { id?: string; name?: string; world?: WorldId } = {}): LevelData {
  const world = opts.world ?? 'old-town';
  return {
    version: LEVEL_SCHEMA_VERSION,
    id: opts.id ?? 'my-level',
    name: opts.name ?? 'Untitled Level',
    world,
    order: 1,
    width: 2400,
    height: 900,
    spawn: { x: 128, y: 736 },
    goal: { x: 2240, y: 736 },
    background: world,
    music: world,
    abilities: { wallJump: false, dash: false, doubleJump: false },
    objects: [
      {
        id: 'ground-1',
        type: 'ground',
        x: 0,
        y: 736,
        width: 2400,
        height: 164,
        properties: defaultProperties('ground'),
      },
    ],
  };
}

export function nextObjectId(level: LevelData, type: ObjectType): string {
  const prefix = type.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  for (const o of level.objects) {
    const m = re.exec(o.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  let n = max + 1;
  const ids = new Set(level.objects.map((o) => o.id));
  while (ids.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

export function createObject(level: LevelData, type: ObjectType, x: number, y: number): LevelObject {
  const def = OBJECT_DEFS[type];
  return {
    id: nextObjectId(level, type),
    type,
    x,
    y,
    width: def.defaultWidth,
    height: def.defaultHeight,
    properties: defaultProperties(type),
  };
}
