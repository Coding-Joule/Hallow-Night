import { describe, expect, it } from 'vitest';
import { registry } from './loadLevels';
import { cloneLevel, createEmptyLevel, createObject, levelToJSON, manifestEntry, nextObjectId, officialFilename, officialPath, slugify } from '../src/game/levels/serialize';
import { parseLevel } from '../src/game/levels/validate';

describe('serialization', () => {
  it('round-trips through JSON unchanged', () => {
    for (const { level } of registry.levels) {
      const json = levelToJSON(level);
      const back = parseLevel(json, { strict: true });
      expect(back.ok, level.id).toBe(true);
      expect(levelToJSON(back.level!)).toBe(json);
    }
  });

  it('writes keys in canonical order', () => {
    const json = levelToJSON(createEmptyLevel());
    const keys = Object.keys(JSON.parse(json));
    expect(keys.slice(0, 6)).toEqual(['version', 'id', 'name', 'world', 'order', 'width']);
  });

  it('builds predictable official file names and paths', () => {
    const lvl = { name: "Servants' Passage", number: 18, order: 3, world: 'haunted-manor' as const };
    expect(slugify(lvl.name)).toBe('servants-passage');
    expect(officialFilename(lvl)).toBe('18-servants-passage.json');
    expect(manifestEntry(lvl)).toBe('haunted-manor/18-servants-passage.json');
    expect(officialPath(lvl)).toBe('levels/haunted-manor/18-servants-passage.json');
  });

  it('creates unique object ids', () => {
    const lvl = createEmptyLevel();
    const a = createObject(lvl, 'movingPlatform', 0, 0);
    lvl.objects.push(a);
    expect(a.id).toBe('moving-platform-1');
    expect(nextObjectId(lvl, 'movingPlatform')).toBe('moving-platform-2');
  });

  it('empty levels are valid', () => {
    expect(parseLevel(createEmptyLevel(), { strict: true }).ok).toBe(true);
  });

  it('clones deeply', () => {
    const a = createEmptyLevel();
    const b = cloneLevel(a);
    b.objects[0].x = 999;
    expect(a.objects[0].x).toBe(0);
  });
});
