import { describe, expect, it } from 'vitest';
import manifest from '../src/game/levels/manifest.json';
import { loadBuiltinLevels } from '../src/game/levels/registry';
import { manifestEntry } from '../src/game/levels/serialize';
import { parseLevel } from '../src/game/levels/validate';
import { WORLDS } from '../src/game/levels/worlds';
import { FIXED_STEP } from '../src/game/config/physics';
import { overlaps } from '../src/game/sim/types';
import { World } from '../src/game/sim/World';

const { levels, problems } = loadBuiltinLevels();

describe('built-in levels', () => {
  it('every manifest entry loads', () => {
    expect(problems).toEqual([]);
    expect(levels.length).toBe((manifest as { levels: string[] }).levels.length);
  });

  it('there are 35 levels, 5 per world, numbered 1..35', () => {
    expect(levels).toHaveLength(35);
    levels.forEach((e, i) => {
      expect(e.level.number).toBe(i + 1);
      expect(e.level.world).toBe(WORLDS[Math.floor(i / 5)].id);
      expect(e.level.order).toBe((i % 5) + 1);
    });
  });

  it('ids are unique and files follow the naming convention', () => {
    expect(new Set(levels.map((e) => e.level.id)).size).toBe(levels.length);
    for (const e of levels) expect(manifestEntry(e.level)).toBe(e.path);
  });

  it('every level passes strict validation', () => {
    for (const e of levels) {
      const r = parseLevel(JSON.parse(JSON.stringify(e.level)), { strict: true });
      expect(r.issues.filter((i) => i.severity === 'error'), e.path).toEqual([]);
    }
  });

  it('spawn and goal are not inside solid terrain', () => {
    for (const { level } of levels) {
      const w = new World(level);
      const p = w.player;
      for (const s of w.solids) expect(overlaps(p, s) && s.solid && !s.oneWay, `${level.id} spawn inside ${s.id}`).toBe(false);
      for (const s of w.solids) expect(s.solid && !s.oneWay && overlaps(w.goalRect, { x: s.x + 1, y: s.y + 1, w: s.w - 2, h: s.h - 2 }), `${level.id} goal inside ${s.id}`).toBe(false);
    }
  });

  it('the player lands safely at spawn and the simulation runs', () => {
    for (const { level } of levels) {
      const w = new World(level);
      for (let i = 0; i < 240; i++) w.step(FIXED_STEP);
      expect(w.player.dead, `${level.id} player died standing at spawn`).toBe(false);
      expect(w.player.grounded, `${level.id} player not grounded at spawn`).toBe(true);
    }
  });

  it('abilities unlock progressively', () => {
    for (const e of levels) {
      const n = e.level.number!;
      expect(e.level.abilities.wallJump, e.path).toBe(n >= 11);
      expect(e.level.abilities.dash, e.path).toBe(n >= 21);
      expect(e.level.abilities.doubleJump, e.path).toBe(n >= 26);
    }
  });
});
