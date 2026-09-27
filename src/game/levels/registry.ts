import manifest from './manifest.json';
import type { LevelData } from './schema';
import { parseLevel } from './validate';
import { WORLDS, type WorldId } from './worlds';

/**
 * Built-in level registry.
 *
 * Every JSON file under src/game/levels/<world>/ is bundled by Vite, but only
 * the files listed in manifest.json (in that order) are part of the game.
 * To add a level: drop the JSON into the right folder and add its path to
 * manifest.json.
 */

const files = import.meta.glob<unknown>('./*/*.json', { eager: true, import: 'default' });

export interface BuiltinLevelEntry {
  path: string; // manifest path, e.g. "old-town/01-halloween-street.json"
  index: number; // 0-based position in the campaign
  level: LevelData;
}

export interface RegistryProblem {
  path: string;
  message: string;
}

let cache: { levels: BuiltinLevelEntry[]; problems: RegistryProblem[] } | null = null;

export function loadBuiltinLevels(): { levels: BuiltinLevelEntry[]; problems: RegistryProblem[] } {
  if (cache) return cache;
  const levels: BuiltinLevelEntry[] = [];
  const problems: RegistryProblem[] = [];
  const paths = (manifest as { levels: string[] }).levels;
  for (const path of paths) {
    const data = files[`./${path}`];
    if (data === undefined) {
      problems.push({ path, message: 'File listed in manifest.json was not found.' });
      continue;
    }
    const res = parseLevel(data);
    if (!res.level) {
      problems.push({
        path,
        message: res.issues
          .filter((i) => i.severity === 'error')
          .map((i) => i.message)
          .join('; '),
      });
      continue;
    }
    levels.push({ path, index: levels.length, level: res.level });
  }
  for (const p of problems) console.error(`[levels] ${p.path}: ${p.message}`);
  cache = { levels, problems };
  return cache;
}

export function getBuiltinLevels(): BuiltinLevelEntry[] {
  return loadBuiltinLevels().levels;
}

export function getBuiltinLevel(id: string): BuiltinLevelEntry | undefined {
  return getBuiltinLevels().find((e) => e.level.id === id);
}

export function levelsByWorld(): { world: (typeof WORLDS)[number]; levels: BuiltinLevelEntry[] }[] {
  const all = getBuiltinLevels();
  const known = WORLDS.map((world) => ({
    world,
    levels: all.filter((e) => e.level.world === world.id),
  }));
  return known.filter((g) => g.levels.length > 0);
}

export function worldOf(id: string): WorldId | undefined {
  return getBuiltinLevel(id)?.level.world;
}
