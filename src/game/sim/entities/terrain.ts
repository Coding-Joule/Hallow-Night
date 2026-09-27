import type { LevelObject } from '../../levels/schema';
import { Entity } from '../Entity';
import { num, str } from '../motion';
import { overlaps, type Rect } from '../types';
import type { World } from '../World';

/** ground, platform, oneWay */
export class StaticSolid extends Entity {
  constructor(obj: LevelObject) {
    super(obj);
    this.solid = true;
    this.oneWay = obj.type === 'oneWay';
  }
}

export class Conveyor extends Entity {
  private baseSpeed: number;
  constructor(obj: LevelObject) {
    super(obj);
    this.solid = true;
    this.baseSpeed = num(obj.properties.speed, 90);
    this.surfaceVx = this.baseSpeed;
  }
  update(dt: number): void {
    this.anim += (this.surfaceVx * dt) / 16;
  }
  onSignal(active: boolean): void {
    this.surfaceVx = active ? -this.baseSpeed : this.baseSpeed;
  }
}

/** A walkable ramp. Only its top surface collides (from above). */
export class Slope extends Entity {
  readonly riseRight: boolean;
  constructor(obj: LevelObject) {
    super(obj);
    this.riseRight = str(obj.properties.rise, 'right') === 'right';
  }
  /** Surface y at world x, or null outside the slope. */
  surfaceAt(px: number): number | null {
    if (px < this.x || px > this.x + this.w) return null;
    const t = (px - this.x) / this.w;
    const rise = this.riseRight ? t : 1 - t;
    return this.y + this.h - rise * this.h;
  }
}

/** Looks like terrain, but the player can pass through it. */
export class HiddenWall extends Entity {
  discovered = false;
  constructor(obj: LevelObject) {
    super(obj);
    this.touchable = true;
  }
  update(dt: number): void {
    const target = this.touching ? 0.25 : this.discovered ? 0.55 : 1;
    this.anim += (target - this.anim) * Math.min(1, dt * 8);
  }
  onTouch(world: World, entered: boolean): void {
    if (entered && !this.discovered) {
      this.discovered = true;
      world.emit('switch', this.x + this.w / 2, this.y + this.h / 2, 'secret');
    }
  }
}

/** Solid until the player dashes into it. Stays broken. */
export class BreakableWall extends Entity {
  broken = false;
  constructor(obj: LevelObject) {
    super(obj);
    this.solid = true;
  }
  shatter(world: World): void {
    if (this.broken) return;
    this.broken = true;
    this.solid = false;
    world.emit('break', this.x + this.w / 2, this.y + this.h / 2);
  }
}

export function rectOf(e: Entity): Rect {
  return { x: e.x, y: e.y, w: e.w, h: e.h };
}

export { overlaps };
