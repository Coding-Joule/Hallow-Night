import { parseLevel } from '../src/game/levels/validate';
import type { LevelData } from '../src/game/levels/schema';

export function makeLevel(objects: unknown[], extra: Record<string, unknown> = {}): LevelData {
  const res = parseLevel({
    version: 1,
    id: 'test-level',
    name: 'Test',
    world: 'old-town',
    order: 1,
    width: 4000,
    height: 1200,
    spawn: { x: 100, y: 800 },
    goal: { x: 3900, y: 800 },
    background: 'old-town',
    music: 'old-town',
    abilities: { wallJump: false, dash: false, doubleJump: false },
    objects,
    ...extra,
  });
  if (!res.level) throw new Error(res.issues.map((i) => i.message).join('\n'));
  return res.level;
}
