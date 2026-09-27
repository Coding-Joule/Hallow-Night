import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../src/game/config/storageKeys';
import { createEmptyLevel } from '../src/game/levels/serialize';
import { createMemoryStore, readJSON, setStore, writeJSON } from '../src/game/systems/Storage';
import { formatTime, isUnlocked, loadProgress, recordCompletion } from '../src/game/systems/SaveSystem';
import { LevelLibrary } from '../src/editor/storage/userLevels';

beforeEach(() => setStore(createMemoryStore()));

describe('storage utilities', () => {
  it('reads and writes JSON with fallbacks', () => {
    expect(readJSON('missing', { a: 1 })).toEqual({ a: 1 });
    writeJSON('k', { b: 2 });
    expect(readJSON('k', null)).toEqual({ b: 2 });
  });

  it('survives corrupted data', () => {
    const store = createMemoryStore();
    store.setItem(STORAGE_KEYS.progress, '{broken');
    setStore(store);
    expect(loadProgress().levels).toEqual({});
  });

  it('keeps storage keys unique and prefixed', () => {
    const values = Object.values(STORAGE_KEYS);
    expect(new Set(values).size).toBe(values.length);
    for (const v of values) expect(v.startsWith('hallow-night-')).toBe(true);
  });
});

describe('progress', () => {
  it('records completions and best times', () => {
    const p = loadProgress();
    const r1 = recordCompletion(p, 'old-town-01', 50, ['relic-1'], 3);
    expect(r1.newBest).toBe(true);
    const r2 = recordCompletion(p, 'old-town-01', 60, [], 1);
    expect(r2.newBest).toBe(false);
    expect(r2.best).toBe(50);
    const again = loadProgress();
    expect(again.levels['old-town-01']).toMatchObject({ completed: true, bestTime: 50, relics: ['relic-1'], deaths: 4 });
  });

  it('unlocks the next level after completion', () => {
    const p = loadProgress();
    const ids = ['a', 'b', 'c'];
    expect(isUnlocked(p, ids, 0)).toBe(true);
    expect(isUnlocked(p, ids, 1)).toBe(false);
    recordCompletion(p, 'a', 10, [], 0);
    expect(isUnlocked(p, ids, 1)).toBe(true);
    expect(isUnlocked(p, ids, 2)).toBe(false);
    expect(isUnlocked(p, ids, 2, true)).toBe(true);
  });

  it('formats times', () => {
    expect(formatTime(161.382)).toBe('02:41.382');
    expect(formatTime(null)).toBe('--:--.---');
  });
});

describe('browser level library', () => {
  it('saves, lists, renames and removes levels', () => {
    const lib = new LevelLibrary(STORAGE_KEYS.userLevels);
    const lvl = createEmptyLevel({ id: 'user-abc', name: 'One' });
    lib.save(lvl);
    expect(lib.list().map((l) => l.level.name)).toEqual(['One']);
    lib.save({ ...lvl, id: 'user-def', name: 'Two' }, 'user-abc');
    expect(lib.has('user-abc')).toBe(false);
    expect(lib.get('user-def')?.level.name).toBe('Two');
    expect(lib.uniqueId('user-def')).toBe('user-def-2');
    lib.remove('user-def');
    expect(lib.list()).toHaveLength(0);
  });

  it('ignores invalid stored entries', () => {
    writeJSON(STORAGE_KEYS.userLevels, { version: 1, levels: { bad: { level: { nope: true }, updatedAt: 1 } } });
    expect(new LevelLibrary(STORAGE_KEYS.userLevels).list()).toHaveLength(0);
  });

  it('user levels and creator drafts use separate keys', () => {
    expect(STORAGE_KEYS.userLevels).not.toBe(STORAGE_KEYS.creatorDrafts);
  });
});
