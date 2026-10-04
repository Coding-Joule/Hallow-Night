import type { LevelObject } from '../../levels/schema';
import { Entity } from '../Entity';
import { num, str } from '../motion';
import { overlaps, type Rect } from '../types';
import type { World } from '../World';

/**
 * Mechanics introduced in the worlds after the placement exam:
 * ice, wind, cannons, flame jets, portals, balloons and sinking lily pads.
 */

/** Slippery solid block: you keep sliding when you let go. */
export class IceBlock extends Entity {
  constructor(obj: LevelObject) {
    super(obj);
    this.solid = true;
    this.slippery = true;
  }
}

/** An area of moving air. "up" carries the player upward (an updraft). */
export class Wind extends Entity {
  readonly dir: 'up' | 'down' | 'left' | 'right';
  readonly strength: number;
  constructor(obj: LevelObject) {
    super(obj);
    const d = str(obj.properties.direction, 'up');
    this.dir = d === 'down' || d === 'left' || d === 'right' ? d : 'up';
    this.strength = num(obj.properties.strength, 1);
  }
  update(dt: number): void {
    this.anim += dt;
  }
  /** Push applied to the player while inside: horizontal speed (px/s) and vertical acceleration (px/s²). */
  push(): { vx: number; ay: number } {
    const s = this.strength;
    switch (this.dir) {
      case 'up':
        return { vx: 0, ay: -3400 * s };
      case 'down':
        return { vx: 0, ay: 1400 * s };
      case 'left':
        return { vx: -170 * s, ay: 0 };
      case 'right':
        return { vx: 170 * s, ay: 0 };
    }
  }
}

/** Fires cannonballs along the ground on a fixed rhythm. */
export class Cannon extends Entity {
  readonly balls: { x: number; y: number; alive: boolean }[] = [];
  private timer: number;
  readonly dir: number;
  constructor(obj: LevelObject) {
    super(obj);
    this.hazard = true;
    this.solid = true; // you can stand on the cannon itself
    this.dir = str(obj.properties.direction, 'left') === 'right' ? 1 : -1;
    this.timer = num(obj.properties.startOffset, 0) * num(obj.properties.interval, 2.4);
  }
  update(dt: number, world: World): void {
    this.anim = Math.max(0, this.anim - dt * 3);
    this.timer += dt;
    const interval = Math.max(0.6, num(this.props.interval, 2.4));
    if (this.timer >= interval) {
      this.timer -= interval;
      this.balls.push({ x: this.dir > 0 ? this.x + this.w : this.x - 24, y: this.y + this.h / 2 - 12, alive: true });
      this.anim = 1;
      world.emit('kick', this.dir > 0 ? this.x + this.w : this.x, this.y + this.h / 2);
    }
    const speed = num(this.props.speed, 220);
    const range = num(this.props.range, 640);
    for (const b of this.balls) {
      if (!b.alive) continue;
      b.x += this.dir * speed * dt;
      const travelled = this.dir > 0 ? b.x - (this.x + this.w) : this.x - 24 - b.x;
      if (travelled > range || world.solidAt({ x: b.x + 4, y: b.y + 4, w: 16, h: 16 }, this)) {
        b.alive = false;
        world.emit('break', b.x + 12, b.y + 12);
      }
    }
    for (let i = this.balls.length - 1; i >= 0; i--) if (!this.balls[i].alive) this.balls.splice(i, 1);
  }
  hurts(p: Rect): boolean {
    return this.balls.some((b) => overlaps(p, { x: b.x + 3, y: b.y + 3, w: 18, h: 18 }));
  }
  reset(): void {
    this.balls.length = 0;
    this.timer = num(this.props.startOffset, 0) * num(this.props.interval, 2.4);
  }
}

/** A floor nozzle that blasts a column of fire on a rhythm (it flickers first). */
export class FlameJet extends Entity {
  /** 0 = off, 1 = full flame */
  flame = 0;
  warning = false;
  constructor(obj: LevelObject) {
    super(obj);
    this.hazard = true;
  }
  get flameHeight(): number {
    return num(this.props.height, 128);
  }
  update(_dt: number, world: World): void {
    const on = num(this.props.onTime, 1.2);
    const off = num(this.props.offTime, 1.6);
    const cycle = on + off;
    const t = (((world.time + num(this.props.offset, 0)) % cycle) + cycle) % cycle;
    this.warning = t >= on && t > cycle - 0.45;
    this.flame = t < on ? Math.min(1, t / 0.12) : 0;
  }
  hurts(p: Rect): boolean {
    if (this.flame < 0.6) return false;
    const h = this.flameHeight * this.flame;
    return overlaps(p, { x: this.x + 6, y: this.y - h, w: this.w - 12, h });
  }
}

/** Step in one portal, come out of its partner (`target`). */
export class Portal extends Entity {
  /** false right after someone arrived here, until they step out */
  armed = true;
  constructor(obj: LevelObject) {
    super(obj);
    this.touchable = true;
    this.touchMargin = -6;
  }
  update(dt: number): void {
    this.anim += dt;
    if (!this.touching) this.armed = true;
  }
  onTouch(world: World): void {
    if (!this.armed) return;
    const target = world.getEntity(str(this.props.target, ''));
    if (!(target instanceof Portal) || target === this) return;
    const p = world.player;
    world.emit('spring', this.x + this.w / 2, this.y + this.h / 2);
    p.x = target.x + target.w / 2 - p.w / 2;
    p.y = target.y + target.h - p.h - 2;
    p.grounded = false;
    p.groundEntity = null;
    target.armed = false;
    target.touching = true;
    world.emit('spring', target.x + target.w / 2, target.y + target.h / 2);
  }
  reset(): void {
    this.armed = true;
  }
}

/** Land on a balloon to bounce high. It pops and floats back a moment later. */
export class Balloon extends Entity {
  popped = 0;
  constructor(obj: LevelObject) {
    super(obj);
    this.touchable = true;
    this.touchMargin = 2;
  }
  update(dt: number): void {
    this.anim += dt;
    if (this.popped > 0) this.popped = Math.max(0, this.popped - dt);
  }
  onTouch(world: World): void {
    if (this.popped > 0) return;
    const p = world.player;
    if (p.vy < 0) return; // only when coming down onto it
    p.launch(num(this.props.power, 980));
    this.popped = num(this.props.respawn, 2.5);
    world.emit('spring', this.x + this.w / 2, this.y + this.h / 2);
  }
  reset(): void {
    this.popped = 0;
  }
}

/** A lily pad that sinks slowly while you stand on it and floats back up after. */
export class SinkingPlatform extends Entity {
  private stood = false;
  private depth = 0;
  constructor(obj: LevelObject) {
    super(obj);
    this.solid = true;
    this.oneWay = true;
  }
  onStand(): void {
    this.stood = true;
  }
  update(dt: number): void {
    const max = num(this.props.distance, 96);
    if (this.stood) this.depth = Math.min(max, this.depth + num(this.props.speed, 45) * dt);
    else this.depth = Math.max(0, this.depth - 60 * dt);
    this.stood = false;
    this.anim = this.depth / Math.max(1, max);
    this.moveTo(this.obj.x, this.obj.y + this.depth);
  }
  reset(): void {
    this.depth = 0;
    this.stood = false;
    this.x = this.obj.x;
    this.y = this.obj.y;
  }
}
