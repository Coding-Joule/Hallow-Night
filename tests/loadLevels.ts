import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildRegistry } from '../src/game/levels/registry';

/** Load the built-in levels from disk exactly as the game does over HTTP. */
export const LEVELS_DIR = resolve(__dirname, '../levels');
export const manifest = JSON.parse(readFileSync(`${LEVELS_DIR}/manifest.json`, 'utf8')) as { levels: string[] };
const files: Record<string, unknown> = {};
for (const p of manifest.levels) files[p] = JSON.parse(readFileSync(`${LEVELS_DIR}/${p}`, 'utf8'));
export const registry = buildRegistry(manifest, files);
