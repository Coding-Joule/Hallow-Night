import { OBJECT_DEFS, type PropSpec } from './objectTypes';
import {
  isObjectType,
  LEVEL_SCHEMA_VERSION,
  type LevelData,
  type LevelObject,
  type Point,
  type PropertyValue,
} from './schema';
import { isWorldId } from './worlds';

/**
 * Level validation + normalisation.
 *
 * `parseLevel` is what every loader uses (built-in levels, editor playtests,
 * imported files). It is tolerant: missing optional data is filled with
 * defaults (reported as warnings), while structural problems are errors.
 *
 * `strict: true` (used by the built-in level creator) also turns missing
 * properties and out-of-bounds objects into errors.
 */

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: IssueSeverity;
  message: string;
  objectId?: string;
}

export interface ParseResult {
  level: LevelData | null;
  issues: ValidationIssue[];
  ok: boolean;
}

export class LevelValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: ValidationIssue[],
  ) {
    super(message);
    this.name = 'LevelValidationError';
  }
}

export const LEVEL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BOUNDS_MARGIN = 256;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isPoint(v: unknown): v is Point {
  return isRecord(v) && isFiniteNumber(v.x) && isFiniteNumber(v.y);
}

function checkProp(spec: PropSpec, value: unknown): string | null {
  switch (spec.kind) {
    case 'number':
      if (!isFiniteNumber(value)) return 'must be a number';
      if (spec.min !== undefined && value < spec.min) return `must be ≥ ${spec.min}`;
      if (spec.max !== undefined && value > spec.max) return `must be ≤ ${spec.max}`;
      return null;
    case 'select':
      if (typeof value !== 'string' || !spec.options.includes(value))
        return `must be one of: ${spec.options.join(', ')}`;
      return null;
    case 'boolean':
      return typeof value === 'boolean' ? null : 'must be true or false';
    case 'string':
      return typeof value === 'string' ? null : 'must be text';
    case 'targets':
      return Array.isArray(value) && value.every((t) => typeof t === 'string')
        ? null
        : 'must be a list of object IDs';
    case 'points':
      return Array.isArray(value) && value.length >= 2 && value.every(isPoint)
        ? null
        : 'must be a list of at least two {x, y} points';
  }
}

function cloneDefault(v: PropSpec['default']): PropertyValue {
  return Array.isArray(v) ? (JSON.parse(JSON.stringify(v)) as PropertyValue) : (v as PropertyValue);
}

export function parseLevel(input: unknown, options: { strict?: boolean } = {}): ParseResult {
  const strict = !!options.strict;
  const issues: ValidationIssue[] = [];
  const err = (message: string, objectId?: string) => issues.push({ severity: 'error', message, objectId });
  const warn = (message: string, objectId?: string) =>
    issues.push({ severity: strict ? 'error' : 'warning', message, objectId });
  const note = (message: string, objectId?: string) => issues.push({ severity: 'warning', message, objectId });

  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch (e) {
      err(`Not valid JSON: ${(e as Error).message}`);
      return { level: null, issues, ok: false };
    }
  }
  if (!isRecord(input)) {
    err('Level must be a JSON object.');
    return { level: null, issues, ok: false };
  }
  const raw = input;

  // ── header
  if (raw.version === undefined) err('Missing schema "version".');
  else if (raw.version !== LEVEL_SCHEMA_VERSION)
    err(`Unsupported schema version ${String(raw.version)} (expected ${LEVEL_SCHEMA_VERSION}).`);

  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!id) err('Missing level "id".');
  else if (!LEVEL_ID_PATTERN.test(id)) err(`Level id "${id}" must be lowercase letters, digits and dashes.`);

  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name : '';
  if (!name) warn('Missing level "name".');

  const world = isWorldId(raw.world) ? raw.world : null;
  if (!world) err(`Unknown or missing "world" (${String(raw.world)}).`);

  const width = isFiniteNumber(raw.width) ? raw.width : NaN;
  const height = isFiniteNumber(raw.height) ? raw.height : NaN;
  if (!(width > 0)) err('Level "width" must be a positive number.');
  if (!(height > 0)) err('Level "height" must be a positive number.');
  if (width > 40000 || height > 20000) err('Level is unreasonably large (max 40000 × 20000).');

  const order = isFiniteNumber(raw.order) ? raw.order : 0;
  if (!isFiniteNumber(raw.order)) warn('Missing "order" (position within world).');
  const number = isFiniteNumber(raw.number) ? raw.number : undefined;

  if (!isPoint(raw.spawn)) err('Missing or invalid "spawn" {x, y}.');
  if (!isPoint(raw.goal)) err('Missing or invalid "goal" {x, y}.');
  const spawn = isPoint(raw.spawn) ? { x: raw.spawn.x, y: raw.spawn.y } : { x: 0, y: 0 };
  const goal = isPoint(raw.goal) ? { x: raw.goal.x, y: raw.goal.y } : { x: 0, y: 0 };
  if (width > 0 && height > 0) {
    if (spawn.x < 0 || spawn.x > width || spawn.y < 0 || spawn.y > height) err('Spawn is outside the level.');
    if (goal.x < 0 || goal.x > width || goal.y < 0 || goal.y > height) err('Goal is outside the level.');
  }

  const background = isWorldId(raw.background) ? raw.background : world;
  if (raw.background !== undefined && !isWorldId(raw.background)) warn(`Unknown background "${String(raw.background)}".`);
  const music = isWorldId(raw.music) ? raw.music : world;
  if (raw.music !== undefined && !isWorldId(raw.music)) warn(`Unknown music "${String(raw.music)}".`);

  const ab = isRecord(raw.abilities) ? raw.abilities : {};
  if (!isRecord(raw.abilities)) warn('Missing "abilities" block; all extra abilities disabled.');
  const abilities = {
    wallJump: ab.wallJump === true,
    dash: ab.dash === true,
    doubleJump: ab.doubleJump === true,
  };

  // ── objects
  const objects: LevelObject[] = [];
  if (!Array.isArray(raw.objects)) err('"objects" must be an array.');
  const seen = new Set<string>();
  const rawObjects = Array.isArray(raw.objects) ? raw.objects : [];
  rawObjects.forEach((o, index) => {
    const label = isRecord(o) && typeof o.id === 'string' ? o.id : `#${index}`;
    if (!isRecord(o)) {
      err(`Object ${label} is not an object.`);
      return;
    }
    if (typeof o.id !== 'string' || !o.id) {
      err(`Object ${label} has no "id".`);
      return;
    }
    if (seen.has(o.id)) err(`Duplicate object id "${o.id}".`, o.id);
    seen.add(o.id);
    if (!isObjectType(o.type)) {
      err(`Object "${o.id}" has unsupported type "${String(o.type)}".`, o.id);
      return;
    }
    const def = OBJECT_DEFS[o.type];
    if (!isFiniteNumber(o.x) || !isFiniteNumber(o.y)) {
      err(`Object "${o.id}" needs numeric x and y.`, o.id);
      return;
    }
    let w = def.defaultWidth;
    let h = def.defaultHeight;
    if (o.width !== undefined) {
      if (isFiniteNumber(o.width) && o.width > 0) w = o.width;
      else err(`Object "${o.id}" has invalid width.`, o.id);
    }
    if (o.height !== undefined) {
      if (isFiniteNumber(o.height) && o.height > 0) h = o.height;
      else err(`Object "${o.id}" has invalid height.`, o.id);
    }
    const rawProps = isRecord(o.properties) ? o.properties : {};
    if (o.properties !== undefined && !isRecord(o.properties)) err(`Object "${o.id}" properties must be an object.`, o.id);
    const properties: Record<string, PropertyValue> = {};
    for (const spec of def.props) {
      if (rawProps[spec.key] === undefined) {
        if (strict) err(`Object "${o.id}" (${o.type}) is missing property "${spec.key}".`, o.id);
        properties[spec.key] = cloneDefault(spec.default);
        continue;
      }
      const problem = checkProp(spec, rawProps[spec.key]);
      if (problem) {
        err(`Object "${o.id}" property "${spec.key}" ${problem}.`, o.id);
        properties[spec.key] = cloneDefault(spec.default);
      } else {
        properties[spec.key] = rawProps[spec.key] as PropertyValue;
      }
    }
    for (const key of Object.keys(rawProps)) {
      if (!def.props.some((p) => p.key === key)) note(`Object "${o.id}" has unknown property "${key}" (ignored).`, o.id);
    }
    if (width > 0 && height > 0) {
      const out =
        o.x + w < -BOUNDS_MARGIN || o.y + h < -BOUNDS_MARGIN || o.x > width + BOUNDS_MARGIN || o.y > height + BOUNDS_MARGIN;
      if (out) warn(`Object "${o.id}" is far outside the level bounds.`, o.id);
    }
    objects.push({ id: o.id, type: o.type, x: o.x, y: o.y, width: w, height: h, properties });
  });

  // ── links
  const ids = new Set(objects.map((o) => o.id));
  for (const o of objects) {
    const targets = o.properties.targets;
    if (!Array.isArray(targets)) continue;
    for (const t of targets as string[]) {
      if (!ids.has(t)) err(`"${o.id}" targets missing object "${t}".`, o.id);
      else {
        const target = objects.find((x) => x.id === t)!;
        if (!OBJECT_DEFS[target.type].signalTarget)
          warn(`"${o.id}" targets "${t}" (${target.type}) which does not react to switches.`, o.id);
      }
    }
    if (OBJECT_DEFS[o.type].signalSource && (targets as string[]).length === 0)
      note(`Switch "${o.id}" has no targets.`, o.id);
  }

  const hasError = issues.some((i) => i.severity === 'error');
  if (hasError || !world) return { level: null, issues, ok: false };

  const level: LevelData = {
    version: LEVEL_SCHEMA_VERSION,
    id,
    name: name || id,
    world,
    order,
    ...(number !== undefined ? { number } : {}),
    width,
    height,
    spawn,
    goal,
    background: background ?? world,
    music: music ?? world,
    abilities,
    objects,
  };
  return { level, issues, ok: true };
}

/** Parse or throw a LevelValidationError with a readable summary. */
export function loadLevelOrThrow(input: unknown, source = 'level'): LevelData {
  const res = parseLevel(input);
  if (!res.level) {
    const errors = res.issues.filter((i) => i.severity === 'error');
    throw new LevelValidationError(
      `${source} is invalid:\n` + errors.map((e) => ` • ${e.message}`).join('\n'),
      res.issues,
    );
  }
  return res.level;
}
