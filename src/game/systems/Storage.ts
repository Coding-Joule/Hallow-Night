/**
 * Tiny, safe wrapper around localStorage (falls back to memory when storage
 * is unavailable, e.g. private mode or tests).
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class MemoryStore implements KeyValueStore {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

function detectStore(): KeyValueStore {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__hallow_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch {
    /* storage disabled */
  }
  return new MemoryStore();
}

let store: KeyValueStore = detectStore();

/** Replace the backing store (used by tests). */
export function setStore(s: KeyValueStore): void {
  store = s;
}

export function createMemoryStore(): KeyValueStore {
  return new MemoryStore();
}

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = store.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[storage] could not save', key, e);
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}
