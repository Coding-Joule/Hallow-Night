import { STORAGE_KEYS } from '../../game/config/storageKeys';
import type { LevelData } from '../../game/levels/schema';
import { parseLevel } from '../../game/levels/validate';
import { readJSON, writeJSON } from '../../game/systems/Storage';

/**
 * Browser-only level library. Used by the public editor (user levels) and
 * the built-in creator (drafts) with different storage keys.
 * Nothing here ever touches the repository.
 */

export interface StoredLevel {
  level: LevelData;
  updatedAt: number;
}

interface LibraryFile {
  version: 1;
  levels: Record<string, StoredLevel>;
}

export class LevelLibrary {
  constructor(private readonly key: string) {}

  private read(): LibraryFile {
    const raw = readJSON<Partial<LibraryFile>>(this.key, {});
    const out: LibraryFile = { version: 1, levels: {} };
    if (raw && typeof raw.levels === 'object' && raw.levels) {
      for (const [id, entry] of Object.entries(raw.levels)) {
        if (!entry || typeof entry !== 'object') continue;
        const res = parseLevel((entry as StoredLevel).level);
        if (res.level) out.levels[id] = { level: res.level, updatedAt: Number((entry as StoredLevel).updatedAt) || 0 };
      }
    }
    return out;
  }

  private write(f: LibraryFile): boolean {
    return writeJSON(this.key, f);
  }

  list(): StoredLevel[] {
    return Object.values(this.read().levels).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  get(id: string): StoredLevel | undefined {
    return this.read().levels[id];
  }

  has(id: string): boolean {
    return !!this.read().levels[id];
  }

  save(level: LevelData, previousId?: string): boolean {
    const f = this.read();
    if (previousId && previousId !== level.id) delete f.levels[previousId];
    f.levels[level.id] = { level: JSON.parse(JSON.stringify(level)) as LevelData, updatedAt: Date.now() };
    return this.write(f);
  }

  remove(id: string): void {
    const f = this.read();
    delete f.levels[id];
    this.write(f);
  }

  /** A level id not used in this library, based on `base`. */
  uniqueId(base: string): string {
    const f = this.read();
    if (!f.levels[base]) return base;
    let n = 2;
    while (f.levels[`${base}-${n}`]) n++;
    return `${base}-${n}`;
  }
}

export const userLevels = new LevelLibrary(STORAGE_KEYS.userLevels);
export const creatorDrafts = new LevelLibrary(STORAGE_KEYS.creatorDrafts);

export function newUserLevelId(): string {
  return `user-${Date.now().toString(36)}`;
}
