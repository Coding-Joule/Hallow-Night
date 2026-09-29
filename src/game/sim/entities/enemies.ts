import type { LevelObject } from '../../levels/schema';
import { GRAVITY } from '../../config/physics';
import { Entity } from '../Entity';
import { num, PingPong, str } from '../motion';
import { overlaps, type Rect } from '../types';
import type { World } from '../World';

abstract class Enemy extends Entity {
  facing = 1;
  deadTimer = 0;
  constructor(obj: LevelObject) {
    super(obj);
    this.enemy = true;
  }
  hurts(p: Rect): boolean {
    if (this.dead) return false;
    return overlaps(p, { x: this.x + 3, y: this.y + 3, w: this.w - 6, h: this.h - 4 });
  }
  update(dt: number, world: World): void {
    this.anim += dt;
    if (this.dead) {
      this.deadTimer += dt;
      return;
    }
    this.think(dt, world);
  }
  protected abstract think(dt: number, world: World): void;
  reset(): void {
    this.dead = false;
    this.deadTimer = 0;
    this.x = this.obj.x;
    this.y = this.obj.y;
  }
}

/** Skeletons: walk, turn at walls and ledges. */
export class Walker extends Enemy {
  private vy = 0;
  private readonly speed: number;
  constructor(obj: LevelObject, stompable: boolean) {
    super(obj);
    this.stompable = stompable;
    this.speed = num(obj.properties.speed, 60);
    this.facing = str(obj.properties.direction, 'left') === 'right' ? 1 : -1;
  }
  protected think(dt: number, world: World): void {
    // vertical
    this.vy = Math.min(800, this.vy + GRAVITY * dt);
    const prevBottom = this.y + this.h;
    this.y += this.vy * dt;
    let grounded = false;
    const ground = world.groundUnder(this, prevBottom);
    if (ground !== null) {
      this.y = ground - this.h;
      this.vy = 0;
      grounded = true;
    }
    if (!grounded) return;
    // horizontal
    const nx = this.x + this.facing * this.speed * dt;
    const probe: Rect = { x: nx, y: this.y, w: this.w, h: this.h - 2 };
    const blocked = world.solidAt(probe, this) || nx < 0 || nx + this.w > world.level.width;
    const footX = this.facing > 0 ? nx + this.w + 1 : nx - 1;
    const hasFloor = world.solidAt({ x: footX - 1, y: this.y + this.h, w: 2, h: 6 }, this, true);
    if (blocked || !hasFloor) this.facing = -this.facing;
    else this.x = nx;
  }
  reset(): void {
    super.reset();
    this.vy = 0;
    this.facing = str(this.props.direction, 'left') === 'right' ? 1 : -1;
  }
}

export class Ghost extends Enemy {
  private vx = 0;
  private vy = 0;
  constructor(obj: LevelObject) {
    super(obj);
    this.stompable = false;
  }
  protected think(dt: number, world: World): void {
    if (str(this.props.mode, 'drift') !== 'chase') {
      // calm drift: sway gently side to side around home, never follow the player
      const speed = num(this.props.speed, 55);
      const sway = 64;
      const t = this.anim * (speed / sway);
      const nx = this.obj.x + Math.sin(t) * sway;
      this.facing = Math.cos(t) >= 0 ? 1 : -1;
      this.x = nx;
      this.y = this.obj.y + Math.sin(this.anim * 1.7) * 10;
      return;
    }
    const p = world.player;
    const range = num(this.props.range, 260);
    const leash = num(this.props.leash, 360);
    const speed = num(this.props.speed, 55);
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;
    const homeX = this.obj.x + this.w / 2;
    const homeY = this.obj.y + this.h / 2;
    const toPlayer = Math.hypot(px - cx, py - cy);
    const playerFromHome = Math.hypot(px - homeX, py - homeY);
    let tx = homeX;
    let ty = homeY + Math.sin(this.anim * 2) * 6;
    let s = speed * 0.6;
    if (!p.dead && toPlayer < range && playerFromHome < leash) {
      tx = px;
      ty = py;
      s = speed;
    }
    const dx = tx - cx;
    const dy = ty - cy;
    const d = Math.hypot(dx, dy) || 1;
    const wantVx = d > 2 ? (dx / d) * s : 0;
    const wantVy = d > 2 ? (dy / d) * s : 0;
    this.vx += (wantVx - this.vx) * Math.min(1, dt * 3);
    this.vy += (wantVy - this.vy) * Math.min(1, dt * 3);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (Math.abs(this.vx) > 4) this.facing = this.vx > 0 ? 1 : -1;
  }
  hurts(p: Rect): boolean {
    return !this.dead && overlaps(p, { x: this.x + 5, y: this.y + 5, w: this.w - 10, h: this.h - 10 });
  }
  reset(): void {
    super.reset();
    this.vx = this.vy = 0;
  }
}

export class Bat extends Enemy {
  private motion: PingPong;
  private readonly horizontal: boolean;
  private readonly sign: number;
  constructor(obj: LevelObject) {
    super(obj);
    this.stompable = true;
    const d = num(obj.properties.distance, 160);
    this.sign = d < 0 ? -1 : 1;
    this.horizontal = str(obj.properties.axis, 'horizontal') === 'horizontal';
    this.motion = new PingPong(Math.abs(d), num(obj.properties.speed, 90), 0.1, num(obj.properties.startOffset, 0));
  }
  protected think(dt: number): void {
    this.motion.step(dt);
    const off = this.motion.pos * this.sign;
    const bob = Math.sin(this.anim * 5) * 5;
    if (this.horizontal) {
      this.x = this.obj.x + off;
      this.y = this.obj.y + bob;
      this.facing = this.motion.dir * this.sign;
    } else {
      this.x = this.obj.x + bob * 0.6;
      this.y = this.obj.y + off;
    }
  }
  reset(): void {
    super.reset();
    this.motion.resetPhase();
  }
}

export class Raven extends Enemy {
  private motion: PingPong;
  private readonly startDir: number;
  constructor(obj: LevelObject) {
    super(obj);
    this.stompable = true;
    this.startDir = str(obj.properties.direction, 'left') === 'right' ? 1 : -1;
    this.motion = new PingPong(num(obj.properties.range, 640), num(obj.properties.speed, 230), num(obj.properties.pause, 0.8));
  }
  protected think(dt: number): void {
    this.motion.step(dt);
    // range extends in the starting direction from the placed position
    this.x = this.obj.x + this.motion.pos * this.startDir;
    this.y = this.obj.y + Math.sin(this.anim * 3) * 3;
    this.facing = this.motion.waitTimer > 0 ? this.facing : this.motion.dir * this.startDir;
  }
  reset(): void {
    super.reset();
    this.motion.resetPhase();
  }
}

export class Shadow extends Enemy {
  state: 'dormant' | 'rising' | 'chasing' | 'sinking' = 'dormant';
  private timer = 0;
  private cooldown = 0;
  /** 0 = hidden in the pool, 1 = fully risen */
  rise = 0;
  constructor(obj: LevelObject) {
    super(obj);
    this.stompable = false;
  }
  protected think(dt: number, world: World): void {
    const p = world.player;
    const homeX = this.obj.x;
    const homeY = this.obj.y;
    switch (this.state) {
      case 'dormant': {
        this.cooldown -= dt;
        const d = Math.hypot(p.x + p.w / 2 - (homeX + this.w / 2), p.y + p.h / 2 - (homeY + this.h / 2));
        if (!p.dead && this.cooldown <= 0 && d < num(this.props.triggerRange, 200)) {
          this.state = 'rising';
          this.timer = 0.45;
          world.emit('shadow', homeX + this.w / 2, homeY + this.h);
        }
        this.rise = Math.max(0, this.rise - dt * 3);
        break;
      }
      case 'rising':
        this.timer -= dt;
        this.rise = Math.min(1, 1 - this.timer / 0.45);
        if (this.timer <= 0) {
          this.state = 'chasing';
          this.timer = num(this.props.duration, 2.2);
        }
        break;
      case 'chasing': {
        this.timer -= dt;
        const speed = num(this.props.speed, 150);
        const dx = p.x + p.w / 2 - (this.x + this.w / 2);
        const dy = p.y + p.h / 2 - (this.y + this.h / 2);
        const d = Math.hypot(dx, dy) || 1;
        this.x += (dx / d) * speed * dt;
        this.y += (dy / d) * speed * dt * 0.8;
        this.facing = dx > 0 ? 1 : -1;
        if (this.timer <= 0 || p.dead) this.state = 'sinking';
        break;
      }
      case 'sinking': {
        const dx = homeX - this.x;
        const dy = homeY - this.y;
        const d = Math.hypot(dx, dy);
        const step = 260 * dt;
        this.rise = Math.max(0.2, this.rise - dt);
        if (d <= step) {
          this.x = homeX;
          this.y = homeY;
          this.state = 'dormant';
          this.cooldown = num(this.props.cooldown, 2.5);
        } else {
          this.x += (dx / d) * step;
          this.y += (dy / d) * step;
        }
        break;
      }
    }
  }
  hurts(p: Rect): boolean {
    if (this.dead || this.state === 'dormant' || this.rise < 0.6) return false;
    return overlaps(p, { x: this.x + 5, y: this.y + 6, w: this.w - 10, h: this.h - 8 });
  }
  reset(): void {
    super.reset();
    this.state = 'dormant';
    this.rise = 0;
    this.cooldown = 0.5;
  }
}
