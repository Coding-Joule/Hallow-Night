import type { LevelObject } from '../../levels/schema';
import { SPRING_DEFAULT_POWER } from '../../config/physics';
import { Entity } from '../Entity';
import { bool, num, str } from '../motion';
import { overlaps } from '../types';
import type { World } from '../World';

/** Base for switches that drive other objects through the signal system. */
abstract class SignalSource extends Entity {
  on = false;
  constructor(obj: LevelObject) {
    super(obj);
    this.touchable = true;
  }
  get targets(): string[] {
    return Array.isArray(this.props.targets) ? (this.props.targets as string[]) : [];
  }
  protected setOn(on: boolean, world: World): void {
    if (on === this.on) return;
    this.on = on;
    world.setSource(this.id, this.targets, on);
    world.emit('switch', this.x + this.w / 2, this.y + this.h / 2, on ? 'on' : 'off');
  }
}

export class PressurePlate extends SignalSource {
  private pressedThisStep = false;
  onTouch(): void {
    this.pressedThisStep = true;
  }
  update(_dt: number, world: World): void {
    this.setOn(this.pressedThisStep, world);
    this.pressedThisStep = false;
  }
  reset(world: World): void {
    this.setOn(false, world);
  }
}

export class Lever extends SignalSource {
  init(world: World): void {
    if (bool(this.props.startOn)) this.setOn(true, world);
  }
  onTouch(world: World, entered: boolean): void {
    if (entered) this.setOn(!this.on, world);
  }
}

export class Button extends SignalSource {
  onTouch(world: World): void {
    const p = world.player;
    // must be pressed from above (stood on / landed on)
    if (p.y + p.h <= this.y + this.h + 2) this.setOn(true, world);
  }
}

export class TimedSwitch extends SignalSource {
  remaining = 0;
  onTouch(world: World, entered: boolean): void {
    if (!entered) return;
    this.remaining = num(this.props.duration, 4);
    this.setOn(true, world);
  }
  update(dt: number, world: World): void {
    if (this.remaining > 0) {
      this.remaining -= dt;
      this.anim = this.remaining / num(this.props.duration, 4);
      if (this.remaining <= 0) this.setOn(false, world);
    }
  }
  reset(world: World): void {
    this.remaining = 0;
    this.anim = 0;
    this.setOn(false, world);
  }
}

export class Gate extends Entity {
  /** 0 = closed, 1 = fully open */
  openness: number;
  private wantOpen: boolean;
  private readonly initiallyOpen: boolean;
  private readonly direction: string;
  private readonly speed: number;
  constructor(obj: LevelObject) {
    super(obj);
    this.initiallyOpen = bool(obj.properties.initiallyOpen);
    this.direction = str(obj.properties.openDirection, 'up');
    this.speed = num(obj.properties.speed, 260);
    this.wantOpen = this.initiallyOpen;
    this.openness = this.wantOpen ? 1 : 0;
    this.solid = this.openness < 0.98;
    this.place();
    this.dx = this.dy = 0;
  }
  private get travel(): number {
    return this.direction === 'up' || this.direction === 'down' ? this.obj.height : this.obj.width;
  }
  private place(): void {
    const d = this.openness * this.travel;
    const { x, y } = this.obj;
    if (this.direction === 'up') this.moveTo(x, y - d);
    else if (this.direction === 'down') this.moveTo(x, y + d);
    else if (this.direction === 'left') this.moveTo(x - d, y);
    else this.moveTo(x + d, y);
  }
  onSignal(active: boolean, world: World): void {
    const want = active ? !this.initiallyOpen : this.initiallyOpen;
    if (want !== this.wantOpen) world.emit('gate', this.obj.x + this.w / 2, this.obj.y + this.h / 2);
    this.wantOpen = want;
  }
  update(dt: number, world: World): void {
    const target = this.wantOpen ? 1 : 0;
    if (this.openness === target) return;
    const step = (this.speed * dt) / this.travel;
    const prev = this.openness;
    this.openness = target > prev ? Math.min(1, prev + step) : Math.max(0, prev - step);
    this.place();
    // a closing gate shoves the player out of its way (never crushes, and
    // standing underneath cannot hold it open); only if both sides are
    // blocked does it wait
    const p = world.player;
    if (this.openness < prev && overlaps(this, p) && !p.dead) {
      const leftX = this.x - p.w - 0.01;
      const rightX = this.x + this.w + 0.01;
      const preferRight = p.x + p.w / 2 >= this.x + this.w / 2;
      const fits = (x: number) => !world.solidAt({ x, y: p.y, w: p.w, h: p.h }, this);
      const order = preferRight ? [rightX, leftX] : [leftX, rightX];
      const target = order.find(fits);
      if (target !== undefined) {
        p.x = target;
        p.vx = 0;
      } else {
        this.dx = this.dy = 0;
        this.openness = prev;
        this.place();
        this.dx = this.dy = 0;
      }
    }
    this.solid = this.openness < 0.98;
  }
}

export class LockedDoor extends Entity {
  opened = false;
  openAnim = 0;
  constructor(obj: LevelObject) {
    super(obj);
    this.solid = true;
    this.touchable = true;
  }
  get color(): string {
    return str(this.props.color, 'gold');
  }
  onTouch(world: World): void {
    if (this.opened || !world.keys.has(this.color)) return;
    this.opened = true;
    this.solid = false;
    world.emit('door', this.x + this.w / 2, this.y + this.h / 2, this.color);
  }
  update(dt: number): void {
    if (this.opened) this.openAnim = Math.min(1, this.openAnim + dt * 2.5);
  }
}

export class KeyItem extends Entity {
  collected = false;
  constructor(obj: LevelObject) {
    super(obj);
    this.touchable = true;
  }
  get color(): string {
    return str(this.props.color, 'gold');
  }
  update(dt: number): void {
    this.anim += dt;
  }
  onTouch(world: World): void {
    if (this.collected) return;
    this.collected = true;
    this.touchable = false;
    world.keys.add(this.color);
    world.emit('key', this.x + this.w / 2, this.y + this.h / 2, this.color);
  }
}

export class Relic extends Entity {
  collected = false;
  constructor(obj: LevelObject) {
    super(obj);
    this.touchable = true;
  }
  update(dt: number): void {
    this.anim += dt;
  }
  onTouch(world: World): void {
    if (this.collected) return;
    this.collected = true;
    this.touchable = false;
    world.relicsFound.add(this.id);
    world.emit('relic', this.x + this.w / 2, this.y + this.h / 2);
  }
}

export class Checkpoint extends Entity {
  lit = false;
  constructor(obj: LevelObject) {
    super(obj);
    this.touchable = true;
  }
  update(dt: number): void {
    this.anim += dt;
  }
  onTouch(world: World): void {
    if (this.lit) return;
    this.lit = true;
    world.setCheckpoint(this);
  }
}

export class Spring extends Entity {
  constructor(obj: LevelObject) {
    super(obj);
    this.touchable = true;
  }
  update(dt: number): void {
    this.anim = Math.max(0, this.anim - dt * 4);
  }
  onTouch(world: World): void {
    const p = world.player;
    if (p.vy < -80) return; // already rising fast
    if (p.y + p.h > this.y + this.h + 2) return; // hit from the side/below
    p.launch(num(this.props.power, SPRING_DEFAULT_POWER));
    this.anim = 1;
    world.emit('spring', this.x + this.w / 2, this.y);
  }
}

export class Sign extends Entity {
  constructor(obj: LevelObject) {
    super(obj);
    this.touchable = true;
    this.touchMargin = 30;
  }
  get text(): string {
    return str(this.props.text, '');
  }
  onTouch(world: World): void {
    world.activeSign = this;
  }
}
