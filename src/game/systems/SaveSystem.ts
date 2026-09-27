import { STORAGE_KEYS } from '../config/storageKeys';
import { readJSON, writeJSON } from './Storage';

export interface LevelRecord {
  completed: boolean;
  bestTime: number | null; // seconds
  relics: string[]; // relic object ids found
  deaths: number;
}

export interface ProgressData {
  version: 1;
  levels: Record<string, LevelRecord>;
  /** Abilities whose "new ability" banner has been shown. */
  seenAbilities: string[];
}

function emptyProgress(): ProgressData {
  return { version: 1, levels: {}, seenAbilities: [] };
}

export function loadProgress(): ProgressData {
  const data = readJSON<Partial<ProgressData>>(STORAGE_KEYS.progress, {});
  const p = emptyProgress();
  if (data && typeof data === 'object' && data.levels && typeof data.levels === 'object') {
    for (const [id, rec] of Object.entries(data.levels)) {
      if (!rec || typeof rec !== 'object') continue;
      p.levels[id] = {
        completed: rec.completed === true,
        bestTime: typeof rec.bestTime === 'number' ? rec.bestTime : null,
        relics: Array.isArray(rec.relics) ? rec.relics.filter((r): r is string => typeof r === 'string') : [],
        deaths: typeof rec.deaths === 'number' ? rec.deaths : 0,
      };
    }
  }
  if (Array.isArray(data?.seenAbilities)) p.seenAbilities = data.seenAbilities.filter((s) => typeof s === 'string');
  return p;
}

export function saveProgress(p: ProgressData): void {
  writeJSON(STORAGE_KEYS.progress, p);
}

export function getRecord(p: ProgressData, levelId: string): LevelRecord {
  return p.levels[levelId] ?? { completed: false, bestTime: null, relics: [], deaths: 0 };
}

export interface CompletionResult {
  time: number;
  best: number;
  newBest: boolean;
  previousBest: number | null;
}

/** Record a finished run. Returns the best-time comparison. */
export function recordCompletion(p: ProgressData, levelId: string, time: number, relics: string[], deaths: number): CompletionResult {
  const rec = getRecord(p, levelId);
  const previousBest = rec.bestTime;
  const newBest = previousBest === null || time < previousBest;
  p.levels[levelId] = {
    completed: true,
    bestTime: newBest ? time : previousBest,
    relics: Array.from(new Set([...rec.relics, ...relics])),
    deaths: rec.deaths + deaths,
  };
  saveProgress(p);
  return { time, best: newBest ? time : previousBest!, newBest, previousBest };
}

export function devUnlockAll(): boolean {
  try {
    const q = new URLSearchParams(globalThis.location?.search ?? '');
    return q.has('unlock') || q.get('dev') === '1';
  } catch {
    return false;
  }
}

/** Level i is unlocked when it is the first level or the previous one is completed. */
export function isUnlocked(p: ProgressData, orderedIds: string[], index: number, unlockAll = false): boolean {
  if (unlockAll || index === 0) return true;
  const prev = orderedIds[index - 1];
  return !!p.levels[prev]?.completed || !!p.levels[orderedIds[index]]?.completed;
}

export function resetProgress(): ProgressData {
  const p = emptyProgress();
  saveProgress(p);
  return p;
}

export function formatTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '--:--.---';
  const ms = Math.floor((seconds * 1000) % 1000);
  const s = Math.floor(seconds) % 60;
  const m = Math.floor(seconds / 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}
