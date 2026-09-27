/**
 * Optimistic reachability check for level files.
 *
 *   npm run check-reach                       # every level in the manifest
 *   npm run check-reach -- path/to/level.json # specific files
 *
 * It runs the real player physics from the spawn point using a set of
 * scripted jumps / dashes / wall-jumps, on a "frozen" copy of the level
 * (moving platforms become static copies along their path, gates and doors
 * are treated as open, enemies and swinging hazards are ignored).
 * A FAIL almost always means a gap is too wide or a ledge too high.
 * A PASS does not prove a level is fun or fair — always playtest!
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseLevel } from '../src/game/levels/validate';
import { reach } from './reachability';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const files = args.length
  ? args
  : (JSON.parse(readFileSync(`${root}/src/game/levels/manifest.json`, 'utf8')).levels as string[]).map((p) => `${root}/src/game/levels/${p}`);

let failed = 0;
for (const f of files) {
  const res = parseLevel(JSON.parse(readFileSync(f, 'utf8')));
  if (!res.level) {
    console.log(`INVALID ${f}: ${res.issues.filter((i) => i.severity === 'error').map((i) => i.message).join('; ')}`);
    failed++;
    continue;
  }
  const lvl = res.level;
  const t0 = Date.now();
  const r = reach(lvl);
  const relics = lvl.objects.filter((o) => o.type === 'relic').map((o) => o.id).filter((id) => !r.relics.has(id));
  if (!r.goal) failed++;
  console.log(
    `${r.goal ? 'OK  ' : 'FAIL'} ${lvl.id.padEnd(22)} explored ${String(r.states).padStart(4)} footholds, furthest x ${r.maxX}/${Math.round(lvl.width / 32)} tiles` +
      `${relics.length ? `  (relic not reached: ${relics.join(', ')})` : ''}  ${Date.now() - t0}ms`,
  );
}
process.exit(failed ? 1 : 0);
