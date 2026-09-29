import type { LevelObject, Point } from '../../levels/schema';
import { Entity } from '../Entity';
import { bool, num, PingPong, str } from '../motion';
import { overlaps } from '../types';
import type { World } from '../World';

export class MovingPlatform extends Entity {
  private motion: PingPong;
  private readonly horizontal: boolean;
  private readonly sign: number;
  private readonly triggered: boolean;
  private active = false;

  constructor(obj: LevelObject) {
    super(obj);
    this.solid = true;
    const p = obj.properties;
    const distance = num(p.distance, 192);
    this.horizontal = str(p.axis, 'horizontal') === 'horizontal';
    this.sign = distance < 0 ? -1 : 1;
    this.triggered = bool(p.triggered);
    this.motion = new PingPong(Math.abs(distance), num(p.speed, 80), num(p.wait, 0.4), num(p.startOffset, 0));
    this.place();
    this.dx = this.dy = 0;
  }

  private place(): void {
    const off = this.motion.pos * this.sign;
    if (this.horizontal) this.moveTo(this.obj.x + off, this.obj.y);
    else this.moveTo(this.obj.x, this.obj.y + off);
  }

  update(dt: number): void {
    if (this.triggered && !this.active) return;
    this.motion.step(dt);
    this.place();
  }

  onSignal(active: boolean): void {
    this.active = active;
  }

  reset(): void {
    if (this.triggered) return; // keeps its position, like the switch state
  }
}

export class PathPlatform extends Entity {
  private readonly path: Point[];
  private readonly cum: number[];
  private readonly total: number;
  private s = 0;
  private dir = 1;
  private waitTimer = 0;
  private readonly speed: number;
  private readonly wait: number;
  private readonly loop: boolean;
  private readonly triggered: boolean;
  private active = false;

  constructor(obj: LevelObject) {
    super(obj);
    this.solid = true;
    const p = obj.properties;
    const pts = Array.isArray(p.points) && p.points.length >= 2 ? (p.points as Point[]) : [{ x: 0, y: 0 }, { x: 160, y: 0 }];
    this.loop = str(p.loop, 'pingpong') === 'loop';
    this.path = this.loop ? [...pts, pts[0]] : [...pts];
    this.cum = [0];
    for (let i = 1; i < this.path.length; i++) {
      const a = this.path[i - 1];
      const b = this.path[i];
      this.cum.push(this.cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
    }
    this.total = this.cum[this.cum.length - 1] || 1;
    this.speed = num(p.speed, 80);
    this.wait = num(p.wait, 0.25);
    this.triggered = bool(p.triggered);
    this.place();
    this.dx = this.dy = 0;
  }

  private pointAt(s: number): Point {
    for (let i = 1; i < this.cum.length; i++) {
      if (s <= this.cum[i] || i === this.cum.length - 1) {
        const seg = this.cum[i] - this.cum[i - 1] || 1;
        const t = Math.min(1, Math.max(0, (s - this.cum[i - 1]) / seg));
        const a = this.path[i - 1];
        const b = this.path[i];
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
    }
    return this.path[0];
  }

  private place(): void {
    const pt = this.pointAt(this.s);
    this.moveTo(this.obj.x + pt.x, this.obj.y + pt.y);
  }

  update(dt: number): void {
    if (this.triggered && !this.active) return;
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      return;
    }
    const old = this.s;
    let next = old + this.dir * this.speed * dt;
    // stop at the first vertex crossed
    for (let i = 0; i < this.cum.length; i++) {
      const c = this.cum[i];
      const crossed = this.dir > 0 ? old < c && next >= c : old > c && next <= c;
      if (crossed) {
        next = c;
        this.waitTimer = this.wait;
        break;
      }
    }
    this.s = next;
    if (this.s >= this.total) {
      if (this.loop) this.s = 0;
      else this.dir = -1;
    } else if (this.s <= 0 && this.dir < 0) {
      this.dir = 1;
    }
    this.place();
  }

  onSignal(active: boolean): void {
    this.active = active;
  }
}

type FallState = 'idle' | 'shaking' | 'falling' | 'gone';

export class FallingPlatform extends Entity {
  state: FallState = 'idle';
  private timer = 0;
  private vy = 0;
  constructor(obj: LevelObject) {
    super(obj);
    this.solid = true;
  }
  onStand(world: World): void {
    if (this.state === 'idle') {
      this.state = 'shaking';
      this.timer = num(this.props.delay, 0.45);
      world.emit('crumble', this.x + this.w / 2, this.y);
    }
  }
  update(dt: number, world: World): void {
    if (this.state === 'shaking') {
      this.timer -= dt;
      this.anim = this.timer;
      if (this.timer <= 0) {
        this.state = 'falling';
        this.vy = 0;
        world.emit('fall', this.x + this.w / 2, this.y);
      }
    } else if (this.state === 'falling') {
      this.vy = Math.min(900, this.vy + 1600 * dt);
      this.moveTo(this.x, this.y + this.vy * dt);
      if (this.y > world.level.height + 200) {
        this.state = 'gone';
        this.solid = false;
        this.timer = num(this.props.respawn, 2.5);
      }
    } else if (this.state === 'gone') {
      this.timer -= dt;
      if (this.timer <= 0) this.tryRestore(world);
    }
  }
  private tryRestore(world: World): void {
    const home = { x: this.obj.x, y: this.obj.y, w: this.w, h: this.h };
    if (overlaps(home, world.player)) return;
    this.state = 'idle';
    this.solid = true;
    this.x = this.obj.x;
    this.y = this.obj.y;
    this.anim = 0;
  }
  reset(): void {
    this.state = 'idle';
    this.solid = true;
    this.x = this.obj.x;
    this.y = this.obj.y;
    this.anim = 0;
  }
}

export class CrumblingPlatform extends Entity {
  state: 'idle' | 'cracking' | 'broken' = 'idle';
  private timer = 0;
  constructor(obj: LevelObject) {
    super(obj);
    this.solid = true;
  }
  onStand(world: World): void {
    if (this.state === 'idle') {
      this.state = 'cracking';
      this.timer = num(this.props.delay, 0.35);
      world.emit('crumble', this.x + this.w / 2, this.y);
    }
  }
  update(dt: number, world: World): void {
    if (this.state === 'cracking') {
      this.timer -= dt;
      this.anim = 1 - Math.max(0, this.timer) / num(this.props.delay, 0.35);
      if (this.timer <= 0) {
        this.state = 'broken';
        this.solid = false;
        this.timer = num(this.props.respawn, 2.5);
        world.emit('break', this.x + this.w / 2, this.y + this.h / 2, 'crumble');
      }
    } else if (this.state === 'broken') {
      this.timer -= dt;
      if (this.timer <= 0 && !overlaps(this, world.player)) {
        this.state = 'idle';
        this.solid = true;
        this.anim = 0;
      }
    }
  }
  reset(): void {
    this.state = 'idle';
    this.solid = true;
    this.anim = 0;
  }
}

export class TimedPlatform extends Entity {
  private readonly onTime: number;
  private readonly offTime: number;
  private readonly offset: number;
  private readonly mode: string;
  private signal = false;
  /** 0..1 opacity for rendering. */
  visibility = 1;
  warning = false;
  constructor(obj: LevelObject) {
    super(obj);
    const p = obj.properties;
    this.onTime = num(p.onTime, 2);
    this.offTime = num(p.offTime, 1.5);
    this.offset = num(p.offset, 0);
    this.mode = str(p.signalMode, 'none');
    this.solid = true;
  }
  update(_dt: number, world: World): void {
    let want: boolean;
    this.warning = false;
    if (this.mode === 'showWhenActive') want = this.signal;
    else if (this.mode === 'hideWhenActive') want = !this.signal;
    else {
      const cycle = this.onTime + this.offTime;
      const t = (((world.time + this.offset) % cycle) + cycle) % cycle;
      want = t < this.onTime;
      this.warning = want && t > this.onTime - 0.8; // blink before vanishing
    }
    if (want && !this.solid && overlaps(this, world.player)) want = false;
    this.solid = want;
    this.visibility = want ? (this.warning ? 0.5 + 0.5 * Math.abs(Math.sin(world.time * 14)) : 1) : 0.2;
  }
  onSignal(active: boolean): void {
    this.signal = active;
  }
}

export class Elevator extends Entity {
  private pos = 0;
  private readonly distance: number;
  private readonly speed: number;
  private readonly up: boolean;
  private readonly signalMode: boolean;
  private riddenThisStep = false;
  private idleTimer = 0;
  private signal = false;

  constructor(obj: LevelObject) {
    super(obj);
    this.solid = true;
    const p = obj.properties;
    this.distance = num(p.distance, 256);
    this.speed = num(p.speed, 110);
    this.up = str(p.direction, 'up') === 'up';
    this.signalMode = str(p.mode, 'ride') === 'signal';
  }
  onStand(): void {
    this.riddenThisStep = true;
  }
  onSignal(active: boolean): void {
    this.signal = active;
  }
  update(dt: number): void {
    let target: number;
    if (this.signalMode) target = this.signal ? this.distance : 0;
    else {
      if (this.riddenThisStep) {
        this.idleTimer = num(this.props.returnDelay, 1);
        target = this.distance;
      } else {
        this.idleTimer -= dt;
        target = this.idleTimer > 0 ? this.pos : 0; // wait, then return home
      }
    }
    this.riddenThisStep = false;
    const step = this.speed * dt;
    if (Math.abs(target - this.pos) <= step) this.pos = target;
    else this.pos += Math.sign(target - this.pos) * step;
    this.anim = this.pos / this.distance;
    this.moveTo(this.obj.x, this.obj.y + (this.up ? -this.pos : this.pos));
  }
  reset(): void {
    if (this.signalMode) return;
    this.pos = 0;
    this.idleTimer = 0;
    this.x = this.obj.x;
    this.y = this.obj.y;
  }
}
