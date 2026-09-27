import type { LevelObject } from '../../levels/schema';
import { Entity } from '../Entity';
import { bool, num, PingPong, str } from '../motion';
import { circleOverlapsRect, overlaps, type Rect } from '../types';
import type { World } from '../World';

export class Spikes extends Entity {
  private readonly hurtBox: Rect;
  constructor(obj: LevelObject) {
    super(obj);
    this.hazard = true;
    const d = str(obj.properties.direction, 'up');
    const { x, y, width: w, height: h } = obj;
    // Forgiving hitboxes: only the pointy half hurts.
    if (d === 'up') this.hurtBox = { x: x + 3, y: y + h * 0.45, w: w - 6, h: h * 0.55 };
    else if (d === 'down') this.hurtBox = { x: x + 3, y, w: w - 6, h: h * 0.55 };
    else if (d === 'left') this.hurtBox = { x: x + w * 0.45, y: y + 3, w: w * 0.55, h: h - 6 };
    else this.hurtBox = { x, y: y + 3, w: w * 0.55, h: h - 6 };
  }
  hurts(p: Rect): boolean {
    return overlaps(p, this.hurtBox);
  }
}

export class Sludge extends Entity {
  constructor(obj: LevelObject) {
    super(obj);
    this.hazard = true;
  }
  update(dt: number): void {
    this.anim += dt;
  }
  hurts(p: Rect): boolean {
    return overlaps(p, { x: this.x, y: this.y + 8, w: this.w, h: this.h - 8 });
  }
}

export class Pendulum extends Entity {
  angle = 0;
  bladeX = 0;
  bladeY = 0;
  readonly length: number;
  readonly radius = 20;
  private readonly amp: number;
  private readonly period: number;
  private readonly phase: number;
  constructor(obj: LevelObject) {
    super(obj);
    this.hazard = true;
    const p = obj.properties;
    this.length = num(p.length, 160);
    this.amp = (num(p.angle, 55) * Math.PI) / 180;
    this.period = Math.max(0.2, num(p.period, 2.4));
    this.phase = num(p.phase, 0);
    this.compute(0);
  }
  get pivotX(): number {
    return this.x + this.w / 2;
  }
  get pivotY(): number {
    return this.y + this.h / 2;
  }
  private compute(time: number): void {
    this.angle = this.amp * Math.sin(2 * Math.PI * (time / this.period + this.phase));
    this.bladeX = this.pivotX + Math.sin(this.angle) * this.length;
    this.bladeY = this.pivotY + Math.cos(this.angle) * this.length;
  }
  update(_dt: number, world: World): void {
    this.compute(world.time);
  }
  hurts(p: Rect): boolean {
    return circleOverlapsRect(this.bladeX, this.bladeY, this.radius, p);
  }
}

export class FallingHazard extends Entity {
  state: 'hanging' | 'shaking' | 'falling' | 'gone' = 'hanging';
  private timer = 0;
  private vy = 0;
  constructor(obj: LevelObject) {
    super(obj);
    this.hazard = true;
  }
  update(dt: number, world: World): void {
    const p = world.player;
    if (this.state === 'hanging') {
      const cx = this.x + this.w / 2;
      const tw = num(this.props.triggerWidth, 72);
      const pcx = p.x + p.w / 2;
      if (!p.dead && Math.abs(pcx - cx) < tw / 2 + p.w / 2 && p.y > this.y) {
        this.state = 'shaking';
        this.timer = num(this.props.fallDelay, 0.25);
      }
    } else if (this.state === 'shaking') {
      this.timer -= dt;
      this.anim = this.timer;
      if (this.timer <= 0) {
        this.state = 'falling';
        this.vy = 0;
        world.emit('fall', this.x + this.w / 2, this.y);
      }
    } else if (this.state === 'falling') {
      this.vy = Math.min(1000, this.vy + 2200 * dt);
      this.moveTo(this.x, this.y + this.vy * dt);
      const probe = { x: this.x + 4, y: this.y + this.h - 4, w: this.w - 8, h: 4 };
      if (world.solidAt(probe, this) || this.y > world.level.height + 100) {
        this.state = 'gone';
        this.timer = num(this.props.respawn, 2.5);
        world.emit('break', this.x + this.w / 2, this.y + this.h, 'rubble');
      }
    } else if (this.state === 'gone') {
      this.timer -= dt;
      if (this.timer <= 0) this.reset();
    }
  }
  reset(): void {
    this.state = 'hanging';
    this.x = this.obj.x;
    this.y = this.obj.y;
    this.vy = 0;
  }
  hurts(p: Rect): boolean {
    if (this.state === 'gone') return false;
    return overlaps(p, { x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 6 });
  }
}

export class MovingHazard extends Entity {
  private motion: PingPong;
  private readonly horizontal: boolean;
  private readonly sign: number;
  private readonly triggered: boolean;
  private active = false;
  constructor(obj: LevelObject) {
    super(obj);
    this.hazard = true;
    const p = obj.properties;
    const d = num(p.distance, 160);
    this.sign = d < 0 ? -1 : 1;
    this.horizontal = str(p.axis, 'horizontal') === 'horizontal';
    this.triggered = bool(p.triggered);
    this.motion = new PingPong(Math.abs(d), num(p.speed, 110), num(p.wait, 0.2), num(p.startOffset, 0));
    this.place();
  }
  private place(): void {
    const off = this.motion.pos * this.sign;
    if (this.horizontal) this.moveTo(this.obj.x + off, this.obj.y);
    else this.moveTo(this.obj.x, this.obj.y + off);
  }
  update(dt: number): void {
    this.anim += dt;
    if (this.triggered && !this.active) return;
    this.motion.step(dt);
    this.place();
  }
  onSignal(active: boolean): void {
    this.active = active;
  }
  hurts(p: Rect): boolean {
    return circleOverlapsRect(this.x + this.w / 2, this.y + this.h / 2, this.w * 0.42, p);
  }
}

/** Advancing wall of darkness for escape sequences. */
export class Chaser extends Entity {
  running = false;
  private readonly dir: string;
  private readonly speed: number;
  private graceTimer = 0;
  constructor(obj: LevelObject) {
    super(obj);
    this.hazard = true;
    this.dir = str(obj.properties.direction, 'right');
    this.speed = num(obj.properties.speed, 95);
  }
  /** Leading edge coordinate (x for horizontal, y for up). */
  get front(): number {
    if (this.dir === 'right') return this.x + this.w;
    if (this.dir === 'left') return this.x;
    return this.y;
  }
  update(dt: number, world: World): void {
    this.anim += dt;
    const p = world.player;
    const startDist = num(this.props.startDistance, 200);
    if (!this.running) {
      if (p.dead) return;
      // the player must be inside the chaser's lane (cross axis) to trigger it
      const inRow = p.y + p.h > this.obj.y && p.y < this.obj.y + this.obj.height;
      const inColumn = p.x + p.w > this.obj.x && p.x < this.obj.x + this.obj.width;
      if (this.dir === 'right' && inRow && p.x > this.obj.x + this.obj.width + startDist) this.running = true;
      if (this.dir === 'left' && inRow && p.x + p.w < this.obj.x - startDist) this.running = true;
      if (this.dir === 'up' && inColumn && p.y + p.h < this.obj.y - startDist) this.running = true;
      if (!this.running) return;
    }
    if (this.graceTimer > 0) {
      this.graceTimer -= dt;
      return;
    }
    if (p.dead || world.finished) return;
    const stopAt = num(this.props.stopAt, 0);
    const step = this.speed * dt;
    if (this.dir === 'right') {
      if (stopAt && this.front >= stopAt) return;
      this.moveTo(this.x + step, this.y);
    } else if (this.dir === 'left') {
      if (stopAt && this.front <= stopAt) return;
      this.moveTo(this.x - step, this.y);
    } else {
      if (stopAt && this.front <= stopAt) return;
      this.moveTo(this.x, this.y - step);
      this.h += step; // keep filling the space below
    }
  }
  reset(world: World): void {
    const gap = num(this.props.respawnGap, 360);
    const r = world.respawnPoint;
    this.x = this.obj.x;
    this.y = this.obj.y;
    this.w = this.obj.width;
    this.h = this.obj.height;
    const atStart = world.respawnIsSpawn;
    this.running = !atStart && this.running;
    const stopAt = num(this.props.stopAt, 0);
    if (this.running) {
      if (this.dir === 'right') {
        this.x = Math.max(this.obj.x, r.x - gap - this.w);
        if (stopAt) this.x = Math.min(this.x, stopAt - this.w);
      } else if (this.dir === 'left') {
        this.x = Math.min(this.obj.x, r.x + gap);
        if (stopAt) this.x = Math.max(this.x, stopAt);
      } else {
        const top = Math.min(this.obj.y, r.y + gap);
        this.h = this.obj.height + (this.obj.y - top);
        this.y = top;
      }
      this.graceTimer = 0.8;
    }
  }
  hurts(p: Rect): boolean {
    // the dark fills everything between where it started and its front,
    // with a little forgiveness on the leading edge
    const inRow = p.y + p.h > this.y && p.y < this.y + this.h;
    if (this.dir === 'right') return inRow && p.x < this.x + this.w - 10 && p.x + p.w > this.obj.x;
    if (this.dir === 'left') return inRow && p.x + p.w > this.x + 10 && p.x < this.obj.x + this.obj.width;
    return p.y + p.h > this.y + 10 && p.x + p.w > this.x && p.x < this.x + this.w;
  }
}
