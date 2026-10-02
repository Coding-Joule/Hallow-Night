import type { LevelObject, ObjectType } from '../levels/schema';
import type { Rect } from './types';
import type { World } from './World';

/**
 * Base class for every level object in the simulation.
 * Rendering never lives here — see src/game/render for the Phaser views.
 */
export abstract class Entity implements Rect {
  readonly id: string;
  readonly type: ObjectType;
  readonly obj: LevelObject;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Movement during the current step (used to carry/push the player). */
  dx = 0;
  dy = 0;

  /** Blocks movement. */
  solid = false;
  /** Only solid from above. */
  oneWay = false;
  /** Horizontal surface speed (conveyors). */
  surfaceVx = 0;
  /** Receives `hurts()` checks against the player. */
  hazard = false;
  /** Enemy flags. */
  enemy = false;
  stompable = false;
  /** A boss: the exit stays locked until every boss is defeated. */
  boss = false;
  dead = false;
  /** Receives touch callbacks while the player overlaps it. */
  touchable = false;
  touching = false;
  /** Extra px around the rect that still counts as touching. */
  touchMargin = 1;
  /** Generic render-facing state (0..1 progress, blink timers...). */
  anim = 0;

  constructor(obj: LevelObject) {
    this.id = obj.id;
    this.type = obj.type;
    this.obj = obj;
    this.x = obj.x;
    this.y = obj.y;
    this.w = obj.width;
    this.h = obj.height;
  }

  get props(): LevelObject['properties'] {
    return this.obj.properties;
  }

  /** Advance one simulation step. Update dx/dy if the entity moves. */
  update(_dt: number, _world: World): void {}

  /** Called when the player respawns. Persistent objects may ignore it. */
  reset(_world: World): void {}

  /** Signal from switches (true = at least one source active). */
  onSignal(_active: boolean, _world: World): void {}

  /** Player overlap test for hazards/enemies. */
  hurts(_player: Rect): boolean {
    return false;
  }

  /** Player is standing on this solid this step. */
  onStand(_world: World): void {}

  /** Player overlaps this entity (touchable only). `entered` on first frame. */
  onTouch(_world: World, _entered: boolean): void {}

  /** Player walked into this enemy (not a stomp). Return true if that is harmless (e.g. kicking a shell). */
  onBump(_world: World): boolean {
    return false;
  }

  /** Player stomped this enemy. */
  onStomp(_world: World): void {
    this.dead = true;
  }

  moveTo(x: number, y: number): void {
    this.dx += x - this.x;
    this.dy += y - this.y;
    this.x = x;
    this.y = y;
  }
}
