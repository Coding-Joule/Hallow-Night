import { DEATH_FALL_MARGIN } from '../config/game';
import type { LevelData, Point } from '../levels/schema';
import type { Entity } from './Entity';
import { createEntity } from './entities/factory';
import { Checkpoint, Lever, Sign } from './entities/interactive';
import { Slope } from './entities/terrain';
import { Player } from './Player';
import { EMPTY_INPUT, overlaps, type InputState, type Rect, type WorldEvent, type WorldEventType } from './types';

export const GOAL_WIDTH = 44;
export const GOAL_HEIGHT = 68;

/**
 * The complete, renderer-independent game simulation for one level.
 * GameScene feeds it input and draws its state; tests can run it headless.
 */
export class World {
  readonly level: LevelData;
  readonly player: Player;
  readonly entities: Entity[] = [];
  /** Entities that may block movement (solids, one-ways, moving platforms...). */
  readonly solids: Entity[] = [];
  readonly slopes: Slope[] = [];
  private readonly touchables: Entity[] = [];
  private readonly hazards: Entity[] = [];
  private readonly enemies: Entity[] = [];
  private readonly byId = new Map<string, Entity>();

  time = 0;
  /** Level timer (stops at the goal). */
  elapsed = 0;
  deaths = 0;
  finished = false;
  respawnPoint: Point;
  respawnIsSpawn = true;
  activeCheckpoint: Checkpoint | null = null;
  readonly keys = new Set<string>();
  readonly relicsFound = new Set<string>();
  activeSign: Sign | null = null;

  /** Active signal sources per target id. */
  private readonly signals = new Map<string, Set<string>>();
  private events: WorldEvent[] = [];

  constructor(level: LevelData) {
    this.level = level;
    this.player = new Player({ ...level.abilities });
    for (const obj of level.objects) {
      const e = createEntity(obj);
      if (!e) continue;
      this.entities.push(e);
      this.byId.set(e.id, e);
      if (e instanceof Slope) this.slopes.push(e);
      else if (
        e.solid ||
        ['movingPlatform', 'pathPlatform', 'fallingPlatform', 'crumblingPlatform', 'timedPlatform', 'elevator', 'gate', 'lockedDoor', 'breakableWall', 'conveyor'].includes(e.type)
      )
        this.solids.push(e);
      if (e.touchable) this.touchables.push(e);
      if (e.hazard) this.hazards.push(e);
      if (e.enemy) this.enemies.push(e);
    }
    this.respawnPoint = { ...level.spawn };
    this.player.placeAt(level.spawn.x, level.spawn.y);
    for (const e of this.entities) if (e instanceof Lever) e.init(this);
    for (const e of this.entities) e.dx = e.dy = 0;
  }

  get goalRect(): Rect {
    const g = this.level.goal;
    return { x: g.x - GOAL_WIDTH / 2, y: g.y - GOAL_HEIGHT, w: GOAL_WIDTH, h: GOAL_HEIGHT };
  }

  get relicTotal(): number {
    return this.level.objects.filter((o) => o.type === 'relic').length;
  }

  getEntity(id: string): Entity | undefined {
    return this.byId.get(id);
  }

  emit(type: WorldEventType, x: number, y: number, data?: string): void {
    this.events.push({ type, x, y, data });
  }

  /** Returns and clears the events produced since the last call. */
  drainEvents(): WorldEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  // ───────────────────────── signals
  setSource(sourceId: string, targets: string[], active: boolean): void {
    for (const t of targets) {
      let set = this.signals.get(t);
      if (!set) {
        set = new Set();
        this.signals.set(t, set);
      }
      const before = set.size > 0;
      if (active) set.add(sourceId);
      else set.delete(sourceId);
      const after = set.size > 0;
      if (before !== after) this.byId.get(t)?.onSignal(after, this);
    }
  }

  isSignalled(id: string): boolean {
    return (this.signals.get(id)?.size ?? 0) > 0;
  }

  // ───────────────────────── queries used by entities
  /** Any blocking solid overlapping the rect? `withOneWay` includes one-way tops. */
  solidAt(r: Rect, exclude?: Entity, withOneWay = false): boolean {
    for (const e of this.solids) {
      if (e === exclude || !e.solid) continue;
      if (e.oneWay && !withOneWay) continue;
      if (overlaps(r, e)) return true;
    }
    if (withOneWay) {
      for (const s of this.slopes) {
        const sy = s.surfaceAt(r.x + r.w / 2);
        if (sy !== null && r.y + r.h >= sy && r.y <= sy + 4) return true;
      }
    }
    return false;
  }

  /** Top of the ground a falling body (rect) lands on this step, or null. */
  groundUnder(r: Rect, prevBottom: number): number | null {
    let best: number | null = null;
    for (const e of this.solids) {
      if (!e.solid || !overlaps(r, e)) continue;
      if (prevBottom <= e.y + 2 && (best === null || e.y < best)) best = e.y;
    }
    for (const s of this.slopes) {
      const sy = s.surfaceAt(r.x + r.w / 2);
      if (sy !== null && prevBottom <= sy + 6 && r.y + r.h >= sy && (best === null || sy < best)) best = sy;
    }
    return best;
  }

  // ───────────────────────── checkpoints & death
  setCheckpoint(cp: Checkpoint): void {
    if (this.activeCheckpoint && this.activeCheckpoint !== cp) this.activeCheckpoint.lit = true;
    this.activeCheckpoint = cp;
    this.respawnPoint = { x: cp.x + cp.w / 2, y: cp.y + cp.h };
    this.respawnIsSpawn = false;
    this.emit('checkpoint', cp.x + cp.w / 2, cp.y + 10);
  }

  kill(reason = 'hazard'): void {
    if (this.player.dead || this.finished) return;
    this.player.dead = true;
    this.player.anim = 'dead';
    this.deaths++;
    this.emit('death', this.player.centerX, this.player.y + this.player.h / 2, reason);
  }

  respawn(): void {
    const p = this.player;
    p.placeAt(this.respawnPoint.x, this.respawnPoint.y);
    for (const e of this.entities) e.reset(this);
    for (const e of this.entities) e.dx = e.dy = 0;
    this.emit('respawn', p.centerX, p.bottom);
  }

  // ───────────────────────── main step
  step(dt: number, input: InputState = EMPTY_INPUT): void {
    this.time += dt;
    if (!this.finished) this.elapsed += dt;
    const p = this.player;

    for (const e of this.entities) {
      e.dx = 0;
      e.dy = 0;
    }
    for (const e of this.entities) e.update(dt, this);

    if (!p.dead && !this.finished) {
      // ride the platform we stood on last step
      const g = p.groundEntity;
      if (g && g.solid && (g.dx !== 0 || g.dy !== 0)) {
        p.x += g.dx;
        p.y += g.dy;
      }
      this.pushOut();
      if (!p.dead) p.update(dt, input, this);
      if (!p.dead) this.interact();
    } else if (this.finished) {
      // walk into the door
      p.vx = 0;
    }
  }

  /** Kinematic solids push the player; being squeezed between solids kills. */
  private pushOut(): void {
    const p = this.player;
    for (const e of this.solids) {
      if (!e.solid || e.oneWay || (e.dx === 0 && e.dy === 0) || !overlaps(p, e)) continue;
      if (e.dy < 0 && p.y + p.h - e.y <= -e.dy + 2) {
        p.y = e.y - p.h; // lifted
        p.vy = Math.min(p.vy, 0);
        p.groundEntity = e;
        p.grounded = true;
      } else if (e.dy > 0 && e.y + e.h - p.y <= e.dy + 2) p.y = e.y + e.h;
      else if (e.dx > 0) p.x = e.x + e.w;
      else if (e.dx < 0) p.x = e.x - p.w;
    }
    // squeezed?
    const inner = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 };
    for (const e of this.solids) {
      if (e.solid && !e.oneWay && overlaps(inner, e)) {
        this.kill('crush');
        return;
      }
    }
  }

  private interact(): void {
    const p = this.player;
    // falling out of the level
    if (p.y > this.level.height + DEATH_FALL_MARGIN) {
      this.kill('fall');
      return;
    }
    // hurtbox is a bit smaller than the collision box
    const hurt = { x: p.x + 2, y: p.y + 3, w: p.w - 4, h: p.h - 4 };
    for (const h of this.hazards) {
      if (h.hurts(hurt)) {
        this.kill(h.type);
        return;
      }
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.stompable && p.vy > 0 && p.prevBottom <= e.y + 10 && overlaps(p, { x: e.x, y: e.y - 2, w: e.w, h: e.h * 0.6 })) {
        e.onStomp(this);
        p.bounce(true);
        this.emit('stomp', e.x + e.w / 2, e.y);
        continue;
      }
      if (e.hurts(hurt)) {
        this.kill(e.type);
        return;
      }
    }
    // touch triggers
    this.activeSign = null;
    for (const e of this.touchables) {
      const m = e.touchMargin;
      const hit = overlaps(p, { x: e.x - m, y: e.y - m, w: e.w + m * 2, h: e.h + m * 2 });
      if (hit) {
        e.onTouch(this, !e.touching);
        e.touching = true;
      } else e.touching = false;
    }
    // goal
    if (!this.finished && overlaps(p, this.goalRect)) {
      const g = this.goalRect;
      if (p.centerX > g.x + 8 && p.centerX < g.x + g.w - 8) {
        this.finished = true;
        this.emit('goal', this.level.goal.x, this.level.goal.y);
      }
    }
  }
}
