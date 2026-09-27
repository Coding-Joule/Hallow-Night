import { STORAGE_KEYS } from '../config/storageKeys';
import { readJSON, writeJSON } from './Storage';

export interface GameSettings {
  masterVolume: number; // 0..1
  musicVolume: number;
  sfxVolume: number;
  screenshake: boolean;
  reducedMotion: boolean;
  showTimer: boolean;
  /** Render at 2× resolution (sharper). Turn off on slow machines. */
  sharpRendering: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  screenshake: true,
  reducedMotion: false,
  showTimer: true,
  sharpRendering: true,
};

type Listener = (s: GameSettings) => void;
const listeners = new Set<Listener>();
let current: GameSettings | null = null;

function clamp01(v: unknown, d: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d;
}

export function loadSettings(): GameSettings {
  if (current) return current;
  const raw = readJSON<Partial<GameSettings>>(STORAGE_KEYS.settings, {});
  current = {
    masterVolume: clamp01(raw.masterVolume, DEFAULT_SETTINGS.masterVolume),
    musicVolume: clamp01(raw.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: clamp01(raw.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    screenshake: typeof raw.screenshake === 'boolean' ? raw.screenshake : DEFAULT_SETTINGS.screenshake,
    reducedMotion: typeof raw.reducedMotion === 'boolean' ? raw.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
    showTimer: typeof raw.showTimer === 'boolean' ? raw.showTimer : DEFAULT_SETTINGS.showTimer,
    sharpRendering: typeof raw.sharpRendering === 'boolean' ? raw.sharpRendering : DEFAULT_SETTINGS.sharpRendering,
  };
  return current;
}

export function updateSettings(patch: Partial<GameSettings>): GameSettings {
  current = { ...loadSettings(), ...patch };
  writeJSON(STORAGE_KEYS.settings, current);
  for (const l of listeners) l(current);
  return current;
}

export function onSettingsChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
