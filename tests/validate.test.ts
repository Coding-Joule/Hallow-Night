import { describe, expect, it } from 'vitest';
import { parseLevel } from '../src/game/levels/validate';
import { OBJECT_DEFS, ALL_OBJECT_DEFS, defaultProperties } from '../src/game/levels/objectTypes';
import { OBJECT_TYPES } from '../src/game/levels/schema';

function base(extra: Record<string, unknown> = {}) {
  return {
    version: 1,
    id: 'my-level',
    name: 'My Level',
    world: 'graveyard',
    order: 1,
    width: 2000,
    height: 800,
    spawn: { x: 100, y: 600 },
    goal: { x: 1900, y: 600 },
    background: 'graveyard',
    music: 'graveyard',
    abilities: { wallJump: false, dash: false, doubleJump: false },
    objects: [{ id: 'ground-1', type: 'ground', x: 0, y: 600, width: 2000, height: 200, properties: { style: 'auto' } }],
    ...extra,
  };
}

const errors = (r: ReturnType<typeof parseLevel>) => r.issues.filter((i) => i.severity === 'error').map((i) => i.message);

describe('level validation', () => {
  it('accepts a valid level', () => {
    const r = parseLevel(base());
    expect(r.ok).toBe(true);
    expect(r.level?.objects).toHaveLength(1);
  });

  it('accepts JSON strings and reports bad JSON', () => {
    expect(parseLevel(JSON.stringify(base())).ok).toBe(true);
    const r = parseLevel('{ nope');
    expect(r.ok).toBe(false);
    expect(errors(r)[0]).toMatch(/Not valid JSON/);
  });

  it('requires the schema version', () => {
    const { version: _v, ...rest } = base();
    expect(errors(parseLevel(rest))).toContain('Missing schema "version".');
    expect(errors(parseLevel(base({ version: 99 })))[0]).toMatch(/Unsupported schema version/);
  });

  it('checks the level id format', () => {
    expect(errors(parseLevel(base({ id: 'Bad Id!' })))[0]).toMatch(/lowercase/);
  });

  it('requires spawn and goal inside the level', () => {
    expect(errors(parseLevel(base({ spawn: undefined })))).toContain('Missing or invalid "spawn" {x, y}.');
    expect(errors(parseLevel(base({ goal: { x: 99999, y: 10 } })))).toContain('Goal is outside the level.');
  });

  it('requires positive dimensions', () => {
    expect(errors(parseLevel(base({ width: -5 })))).toContain('Level "width" must be a positive number.');
  });

  it('rejects duplicate object ids and unknown types', () => {
    const r = parseLevel(
      base({
        objects: [
          { id: 'a', type: 'ground', x: 0, y: 0, width: 10, height: 10 },
          { id: 'a', type: 'ground', x: 0, y: 0, width: 10, height: 10 },
          { id: 'b', type: 'dragon', x: 0, y: 0 },
        ],
      }),
    );
    expect(errors(r)).toContain('Duplicate object id "a".');
    expect(errors(r).some((m) => m.includes('unsupported type "dragon"'))).toBe(true);
  });

  it('checks that linked targets exist', () => {
    const r = parseLevel(base({ objects: [{ id: 'lever-1', type: 'lever', x: 10, y: 10, properties: { targets: ['gate-9'] } }] }));
    expect(errors(r)).toContain('"lever-1" targets missing object "gate-9".');
  });

  it('validates property types', () => {
    const r = parseLevel(base({ objects: [{ id: 'm', type: 'movingPlatform', x: 0, y: 0, properties: { axis: 'diagonal', speed: 'fast' } }] }));
    expect(errors(r).some((m) => m.includes('"axis" must be one of'))).toBe(true);
    expect(errors(r).some((m) => m.includes('"speed" must be a number'))).toBe(true);
  });

  it('fills missing properties with defaults (tolerant) but errors in strict mode', () => {
    const lvl = base({ objects: [{ id: 's', type: 'spikes', x: 0, y: 0, width: 32, height: 16 }] });
    const tolerant = parseLevel(lvl);
    expect(tolerant.ok).toBe(true);
    expect(tolerant.level!.objects[0].properties.direction).toBe('up');
    const strict = parseLevel(lvl, { strict: true });
    expect(strict.ok).toBe(false);
    expect(errors(strict)[0]).toMatch(/missing property "direction"/);
  });

  it('warns about objects far outside the bounds (error when strict)', () => {
    const lvl = base({ objects: [{ id: 'far', type: 'relic', x: 90000, y: 10, properties: {} }] });
    expect(parseLevel(lvl).ok).toBe(true);
    expect(parseLevel(lvl, { strict: true }).ok).toBe(false);
  });
});

describe('object schema registry', () => {
  it('has a definition for every object type', () => {
    for (const t of OBJECT_TYPES) expect(OBJECT_DEFS[t]?.type).toBe(t);
    expect(ALL_OBJECT_DEFS).toHaveLength(OBJECT_TYPES.length);
  });

  it('default properties validate for every type', () => {
    const objects = OBJECT_TYPES.map((t, i) => ({
      id: `o${i}`,
      type: t,
      x: 100,
      y: 100,
      width: OBJECT_DEFS[t].defaultWidth,
      height: OBJECT_DEFS[t].defaultHeight,
      properties: defaultProperties(t),
    }));
    const r = parseLevel(base({ objects }), { strict: true });
    expect(errors(r)).toEqual([]);
  });

  it('only switches can target objects', () => {
    for (const d of ALL_OBJECT_DEFS) {
      const hasTargets = d.props.some((p) => p.kind === 'targets');
      expect(hasTargets).toBe(!!d.signalSource);
    }
  });
});
