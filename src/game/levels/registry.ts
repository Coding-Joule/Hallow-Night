import type { LevelData } from './schema';
import { parseLevel } from './validate';
import { WORLDS, type WorldId } from './worlds';

/**
 * Built-in level registry.
 *
 * Levels are plain JSON files in the repository's `levels/` folder and are
 * fetched at runtime, so adding or editing a level on GitHub needs no
 * rebuild. Only the files listed in `levels/manifest.json` (in that order)
 * are part of the campaign.
 */

export interface BuiltinLevelEntry {
  path: string; // manifest path, e.g. "old-town/01-halloween-street.json"
  index: number; // 0-based position in the campaign
  level: LevelData;
}

export interface RegistryProblem {
  path: string;
  message: string;
}

export interface Registry {
  levels: BuiltinLevelEntry[];
  problems: RegistryProblem[];
}

let cache: Registry | null = null;

/** Validate a manifest + file contents into a registry (pure; used by tests too). */
export function buildRegistry(manifest: unknown, files: Record<string, unknown>): Registry {
  const levels: BuiltinLevelEntry[] = [];
  const problems: RegistryProblem[] = [];
  const paths = (manifest as { levels?: unknown })?.levels;
  if (!Array.isArray(paths)) return { levels, problems: [{ path: 'manifest.json', message: 'manifest.json must contain a "levels" array.' }] };
  for (const path of paths) {
    if (typeof path !== 'string') continue;
    const data = files[path];
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
  return { levels, problems };
}

/** URL of the site root, declared by each page in <meta name="hallow-root">. */
export function siteRoot(): string {
  const meta = typeof document !== 'undefined' ? document.querySelector('meta[name="hallow-root"]') : null;
  return meta?.getAttribute('content') || './';
}

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

/** Fetch and validate every built-in level (cached after the first call). */
export async function loadBuiltinLevels(): Promise<Registry> {
  if (cache) return cache;
  const base = `${siteRoot()}levels/`;
  let manifest: unknown;
  try {
    manifest = await fetchJSON(`${base}manifest.json`);
  } catch (e) {
    cache = { levels: [], problems: [{ path: 'manifest.json', message: `Could not load: ${(e as Error).message}` }] };
    return cache;
  }
  const paths = Array.isArray((manifest as { levels?: unknown }).levels) ? ((manifest as { levels: unknown[] }).levels.filter((p) => typeof p === 'string') as string[]) : [];
  const files: Record<string, unknown> = {};
  const fetchProblems: RegistryProblem[] = [];
  await Promise.all(
    paths.map(async (p) => {
      try {
        files[p] = await fetchJSON(base + p);
      } catch (e) {
        fetchProblems.push({ path: p, message: `Could not load: ${(e as Error).message}` });
      }
    }),
  );
  const reg = buildRegistry(manifest, files);
  reg.problems = [...fetchProblems, ...reg.problems.filter((pr) => !fetchProblems.some((f) => f.path === pr.path))];
  for (const p of reg.problems) console.error(`[levels] ${p.path}: ${p.message}`);
  cache = reg;
  return cache;
}

/** Levels loaded so far (call `loadBuiltinLevels()` first). */
export function getBuiltinLevels(): BuiltinLevelEntry[] {
  return cache?.levels ?? [];
}

export function getBuiltinLevel(id: string): BuiltinLevelEntry | undefined {
  return getBuiltinLevels().find((e) => e.level.id === id);
}

export function levelsByWorld(): { world: (typeof WORLDS)[number]; levels: BuiltinLevelEntry[] }[] {
  const all = getBuiltinLevels();
  return WORLDS.map((world) => ({ world, levels: all.filter((e) => e.level.world === world.id) })).filter((g) => g.levels.length > 0);
}

export function worldOf(id: string): WorldId | undefined {
  return getBuiltinLevel(id)?.level.world;
}
