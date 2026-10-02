import { FIXED_STEP, PLAYER_SPEED } from '../src/game/config/physics';
import type { LevelData, LevelObject } from '../src/game/levels/schema';
import { parseLevel } from '../src/game/levels/validate';
import type { InputState } from '../src/game/sim/types';
import { World } from '../src/game/sim/World';

/**
 * Optimistic reachability check using the REAL player physics on a
 * "frozen" version of the level (moving things become static copies at
 * several positions, gates/doors open, enemies removed).
 */

function num(v: unknown, d: number) {
  return typeof v === 'number' ? v : d;
}

export function freeze(level: LevelData, opts: { openGates: boolean }): LevelData {
  const out: LevelObject[] = [];
  let n = 0;
  const plat = (o: LevelObject, x: number, y: number) =>
    out.push({ id: `${o.id}__${n++}`, type: 'oneWay', x, y, width: o.width, height: 16, properties: { style: 'wood' } });
  for (const o of level.objects) {
    const p = o.properties;
    switch (o.type) {
      case 'movingPlatform': {
        const d = num(p.distance, 192);
        for (const f of [0, 0.25, 0.5, 0.75, 1]) {
          if (p.axis === 'vertical') plat(o, o.x, o.y + d * f);
          else plat(o, o.x + d * f, o.y);
        }
        break;
      }
      case 'pathPlatform': {
        const pts = p.points as { x: number; y: number }[];
        for (let i = 0; i < pts.length; i++) {
          plat(o, o.x + pts[i].x, o.y + pts[i].y);
          if (i > 0) plat(o, o.x + (pts[i].x + pts[i - 1].x) / 2, o.y + (pts[i].y + pts[i - 1].y) / 2);
        }
        break;
      }
      case 'elevator': {
        const d = num(p.distance, 256) * (p.direction === 'down' ? 1 : -1);
        for (const f of [0, 0.33, 0.66, 1]) plat(o, o.x, o.y + d * f);
        break;
      }
      case 'fallingPlatform':
      case 'crumblingPlatform':
      case 'timedPlatform':
        plat(o, o.x, o.y);
        break;
      case 'gate':
        if (!opts.openGates) out.push(o);
        break;
      case 'lockedDoor':
      case 'breakableWall':
        break;
      case 'ghost':
      case 'skeleton':
      case 'armoredSkeleton':
      case 'pumpkinTortoise':
      case 'boss':
      case 'bat':
      case 'raven':
      case 'shadow':
      case 'pendulum':
      case 'movingHazard':
      case 'fallingHazard':
      case 'chaser':
      case 'decoration':
      case 'sign':
        break;
      default:
        out.push(o);
    }
  }
  for (const o of out) if (Array.isArray(o.properties.targets)) o.properties = { ...o.properties, targets: [] };
  return { ...level, objects: out };
}

interface Macro {
  d: number;
  run: boolean;
  hold: number; // -1 walk off, else seconds jump held
  change?: [number, number]; // at time t, new dir multiplier (0 or -1)
  dj?: number;
  dash?: number;
  wall?: 'chimney' | 'same';
  drop?: boolean;
}

function macros(ab: LevelData['abilities']): Macro[] {
  const out: Macro[] = [];
  const holds = [-1, 0.1, 0.2, 1];
  const changes: (Macro['change'] | undefined)[] = [undefined, [0.3, 0], [0.3, -1], [0.15, -1]];
  for (const d of [-1, 0, 1]) {
    for (const run of d === 0 ? [false] : [false, true]) {
      for (const hold of holds) {
        for (const change of changes) {
          if (hold < 0 && change) continue;
          out.push({ d, run, hold, change });
        }
        if (ab.doubleJump && hold >= 0) for (const dj of [0.25, 0.4, 0.55]) out.push({ d, run, hold: 1, dj });
        if (ab.dash && d !== 0) for (const dash of [0.05, 0.2, 0.4]) out.push({ d, run, hold: hold < 0 ? -1 : 1, dash });
        if (ab.dash && ab.doubleJump && d !== 0) {
          out.push({ d, run, hold: 1, dj: 0.35, dash: 0.55 });
          out.push({ d, run, hold: 1, dash: 0.3, dj: 0.5 });
        }
        if (ab.wallJump && hold >= 0) {
          out.push({ d, run, hold: 1, wall: 'chimney' });
          out.push({ d, run, hold: 1, wall: 'same' });
          if (ab.dash && d !== 0) out.push({ d, run, hold: 1, wall: 'chimney', dash: 0.25 });
        }
      }
    }
  }
  out.push({ d: 0, run: false, hold: 0.1, drop: true });
  out.push({ d: 1, run: false, hold: 0.1, drop: true });
  out.push({ d: -1, run: false, hold: 0.1, drop: true });
  // dedupe
  const seen = new Set<string>();
  return out.filter((m) => {
    const k = JSON.stringify(m);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export interface ReachResult {
  goal: boolean;
  states: number;
  relics: Set<string>;
  keys: Set<string>;
  checkpoints: Set<string>;
  maxX: number;
  frontier: string;
  /** Footholds you can reach but never leave again: no way to the goal and no way to die (soft-locks). */
  traps: { x: number; y: number }[];
  /** ids of every surface the player could stand on */
  stoodOn: Set<string>;
  /** false if the search hit maxStates (traps are then not checked) */
  complete: boolean;
}

export function reach(levelIn: LevelData, opts: { openGates?: boolean; maxStates?: number } = {}): ReachResult {
  const level = parseLevel(freeze(levelIn, { openGates: opts.openGates ?? true })).level!;
  const world = new World(level);
  const p = world.player;
  const ms = macros(level.abilities);
  const visited = new Set<string>();
  const queue: { x: number; y: number; key: string }[] = [];
  const pos = new Map<string, { x: number; y: number }>();
  const edges = new Map<string, Set<string>>();
  const exits = new Set<string>(); // states from which the goal or a death is one move away
  const relics = new Set<string>();
  const keys = new Set<string>();
  const checkpoints = new Set<string>();
  let goal = false;
  let maxX = 0;
  let lastNear = '';
  const keyOf = () => `${p.groundEntity?.id ?? p.groundSlope?.id ?? '?'}:${Math.round(p.x / 20)}`;

  const push = (): string => {
    const k = keyOf();
    if (visited.has(k)) return k;
    visited.add(k);
    const pt = { x: p.x + p.w / 2, y: p.y + p.h };
    pos.set(k, pt);
    queue.push({ ...pt, key: k });
    return k;
  };

  // settle at spawn
  p.placeAt(level.spawn.x, level.spawn.y);
  for (let i = 0; i < 120 && !p.grounded; i++) world.step(FIXED_STEP);
  if (!p.grounded) return { goal: false, states: 0, relics, keys, checkpoints, maxX, frontier: 'spawn not grounded', traps: [], stoodOn: new Set(), complete: false };
  push();
  const maxStates = opts.maxStates ?? 4000;

  while (queue.length && visited.size < maxStates) {
    const s = queue.shift()!;
    for (const m of ms) {
      p.placeAt(s.x, s.y);
      world.finished = false;
      world.deaths = 0;
      p.dead = false;
      // settle one step to establish grounding
      world.step(FIXED_STEP);
      if (!p.grounded) continue;
      if (m.drop && !p.groundEntity?.oneWay) continue;
      if (m.run) p.vx = m.d * PLAYER_SPEED;
      let t = 0;
      let dir = m.d;
      let left = false;
      let wallDir = 0;
      let prevWallJumps = 0;
      let djDone = false;
      let dashDone = false;
      let jumpHeldUntil = m.hold;
      let lastJumpPress = -1;
      let reachedGoal = false;
      const input: InputState = { left: false, right: false, up: false, down: false, jump: false, jumpPressed: false, dashPressed: false };
      for (let step = 0; step < (m.wall ? 1200 : 300); step++) {
        input.jumpPressed = false;
        input.dashPressed = false;
        input.down = false;
        if (m.drop) {
          input.down = step < 3;
          input.jump = step < 3;
          input.jumpPressed = step === 0;
        } else if (m.hold >= 0) {
          input.jumpPressed = step === 0;
          input.jump = t < jumpHeldUntil;
        }
        if (m.change && t >= m.change[0] && t < m.change[0] + FIXED_STEP) dir = m.d * m.change[1];
        if (m.dj !== undefined && !djDone && t >= m.dj) {
          djDone = true;
          input.jumpPressed = true;
          input.jump = true;
          jumpHeldUntil = t + 1;
        }
        if (m.dash !== undefined && !dashDone && t >= m.dash) {
          dashDone = true;
          input.dashPressed = true;
        }
        if (m.wall && left && p.wallDir !== 0 && t - lastJumpPress > 0.12) {
          wallDir = p.wallDir;
          input.jumpPressed = true;
          input.jump = true;
          jumpHeldUntil = t + 1;
          lastJumpPress = t;
          prevWallJumps++;
          dir = m.wall === 'chimney' ? -wallDir : -wallDir;
        } else if (m.wall && wallDir !== 0 && t - lastJumpPress > (m.wall === 'same' ? 0.14 : 0.05)) {
          // steer: chimney keeps going away (to the far wall); same returns to the wall
          dir = m.wall === 'chimney' ? -wallDir : wallDir;
        }
        if (m.wall && p.wallDir !== 0 && !p.grounded) dir = p.wallDir; // hold into wall to slide
        input.left = dir < 0;
        input.right = dir > 0;
        world.step(FIXED_STEP, input);
        t += FIXED_STEP;
        if (world.finished) {
          goal = true;
          reachedGoal = true;
          world.finished = false;
          break;
        }
        if (p.dead) break;
        for (const r of world.relicsFound) relics.add(r);
        for (const k of world.keys) keys.add(k);
        if (world.activeCheckpoint) checkpoints.add(world.activeCheckpoint.id);
        if (!p.grounded) left = true;
        if (left && p.grounded) break;
        if (!left && step > 90) break; // walked a while without leaving ground
      }
      if (prevWallJumps > 30) continue;
      if (reachedGoal || p.dead) exits.add(s.key);
      else if (p.grounded) {
        maxX = Math.max(maxX, p.x);
        const k = push();
        if (k !== s.key) {
          if (!edges.has(s.key)) edges.set(s.key, new Set());
          edges.get(s.key)!.add(k);
        }
      }
      // reset per-sim world state
      world.relicsFound.clear();
      world.activeCheckpoint = null;
      for (const e of world.entities) e.reset(world);
    }
    lastNear = `${Math.round(s.x / 32)},${Math.round(s.y / 32)}`;
  }
  // states that can still reach an exit (reverse propagation)
  const escapes = new Set(exits);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [from, tos] of edges) {
      if (escapes.has(from)) continue;
      for (const t of tos)
        if (escapes.has(t)) {
          escapes.add(from);
          changed = true;
          break;
        }
    }
  }
  const complete = queue.length === 0; // only meaningful if the search finished
  const traps = complete ? [...visited].filter((k) => !escapes.has(k)).map((k) => pos.get(k)!) : [];
  return { goal, states: visited.size, relics, keys, checkpoints, maxX: Math.round(maxX / 32), frontier: lastNear, traps, complete, stoodOn: new Set([...visited].map((k) => k.split(':')[0].split('__')[0])) };
}
