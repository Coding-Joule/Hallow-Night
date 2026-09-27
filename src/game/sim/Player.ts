import * as C from '../config/physics';
import type { LevelAbilities } from '../levels/schema';
import type { Entity } from './Entity';
import { BreakableWall, Slope } from './entities/terrain';
import { overlaps, type InputState, type Rect } from './types';
import type { World } from './World';

export type PlayerAnim = 'idle' | 'run' | 'jump' | 'fall' | 'wall' | 'dash' | 'crouch' | 'dead';

function approach(value: number, target: number, amount: number): number {
  if (value < target) return Math.min(target, value + amount);
  return Math.max(target, value - amount);
}

/**
 * The lantern-bearer. Pure simulation: position is the top-left of the
 * collision box; rendering reads the public fields.
 */
export class Player implements Rect {
  x = 0;
  y = 0;
  w = C.PLAYER_WIDTH;
  h = C.PLAYER_HEIGHT;
  vx = 0;
  vy = 0;
  facing = 1;

  grounded = false;
  groundEntity: Entity | null = null;
  groundSlope: Slope | null = null;
  private coyote = 0;
  private jumpBuffer = 0;
  private jumping = false;
  private launched = false; // spring launch: ignore jump-cut

  wallDir = 0;
  private lastWallDir = 0;
  private wallCoyote = 0;
  wallSliding = false;
  private controlLock = 0;

  doubleJumpAvailable = true;
  dashAvailable = true;
  dashTime = 0;
  private dashDir = 1;
  private dashCooldown = 0;

  crouching = false;
  private dropTimer = 0;

  dead = false;
  anim: PlayerAnim = 'idle';
  /** seconds since last landing / takeoff, for squash & stretch */
  landImpact = 0;
  prevBottom = 0;

  constructor(public abilities: LevelAbilities) {}

  placeAt(footX: number, footY: number): void {
    this.h = C.PLAYER_HEIGHT;
    this.x = footX - this.w / 2;
    this.y = footY - this.h;
    this.vx = this.vy = 0;
    this.grounded = false;
    this.groundEntity = null;
    this.groundSlope = null;
    this.dead = false;
    this.dashTime = 0;
    this.dashCooldown = 0;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.jumping = false;
    this.launched = false;
    this.wallDir = 0;
    this.wallCoyote = 0;
    this.controlLock = 0;
    this.crouching = false;
    this.dashAvailable = true;
    this.doubleJumpAvailable = true;
    this.prevBottom = this.y + this.h;
  }

  get centerX(): number {
    return this.x + this.w / 2;
  }
  get bottom(): number {
    return this.y + this.h;
  }

  /** Spring / external upward launch. */
  launch(power: number): void {
    this.vy = -power;
    this.grounded = false;
    this.groundEntity = null;
    this.groundSlope = null;
    this.jumping = false;
    this.launched = true;
    this.dashAvailable = true;
    this.doubleJumpAvailable = true;
    this.dashTime = 0;
    this.coyote = 0;
  }

  bounce(held: boolean): void {
    this.vy = -(held ? C.STOMP_BOUNCE_HELD : C.STOMP_BOUNCE);
    this.jumping = false;
    this.launched = held;
    this.dashAvailable = true;
    this.doubleJumpAvailable = true;
    this.dashTime = 0;
  }

  update(dt: number, input: InputState, world: World): void {
    if (this.dead) return;
    this.prevBottom = this.y + this.h;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const ab = this.abilities;

    // timers
    this.jumpBuffer = input.jumpPressed ? C.JUMP_BUFFER_TIME : Math.max(0, this.jumpBuffer - dt);
    this.controlLock = Math.max(0, this.controlLock - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);
    this.landImpact = Math.max(0, this.landImpact - dt);
    if (this.grounded) {
      this.coyote = C.COYOTE_TIME;
      if (this.dashTime <= 0) this.dashAvailable = true;
      this.doubleJumpAvailable = true;
    } else {
      this.coyote = Math.max(0, this.coyote - dt);
    }

    // crouch (hitbox shrinks from the top)
    const wantCrouch = this.grounded && input.down && this.dashTime <= 0;
    this.setCrouch(wantCrouch, world);

    // drop through one-way platforms: DOWN + JUMP
    if (this.grounded && input.down && this.jumpBuffer > 0 && this.groundEntity?.oneWay) {
      this.dropTimer = 0.22;
      this.jumpBuffer = 0;
      this.grounded = false;
      this.groundEntity = null;
      this.y += 2;
      this.setCrouch(false, world);
    }

    // dash
    if (input.dashPressed && ab.dash && this.dashAvailable && this.dashCooldown <= 0 && this.dashTime <= 0) {
      this.dashTime = C.DASH_DURATION;
      this.dashDir = dir !== 0 ? dir : this.facing;
      this.facing = this.dashDir;
      this.dashAvailable = false;
      this.jumping = false;
      this.launched = false;
      this.setCrouch(false, world);
      world.emit('dash', this.centerX, this.y + this.h / 2, String(this.dashDir));
    }

    this.wallSliding = false;
    if (this.dashTime > 0) {
      this.vx = this.dashDir * C.DASH_SPEED;
      this.vy = 0;
      this.dashTime -= dt;
      if (this.dashTime <= 0) {
        this.vx = this.dashDir * C.PLAYER_SPEED;
        this.dashCooldown = C.DASH_COOLDOWN;
      }
    } else {
      // horizontal
      const maxSpeed = this.crouching ? C.PLAYER_SPEED * 0.35 : C.PLAYER_SPEED;
      let accel = this.grounded ? C.PLAYER_ACCELERATION : C.PLAYER_AIR_ACCELERATION;
      if (this.controlLock > 0) accel *= 0.25;
      if (dir !== 0) {
        if (Math.sign(this.vx) === dir && Math.abs(this.vx) > maxSpeed) {
          // keep extra momentum (after dash/wall jump) but bleed it off
          this.vx = approach(this.vx, dir * maxSpeed, (this.grounded ? C.PLAYER_DRAG : C.PLAYER_AIR_DRAG) * dt);
        } else {
          this.vx = approach(this.vx, dir * maxSpeed, accel * dt);
        }
        this.facing = dir;
      } else {
        this.vx = approach(this.vx, 0, (this.grounded ? C.PLAYER_DRAG : C.PLAYER_AIR_DRAG) * dt);
      }

      // gravity
      const g = C.GRAVITY * (this.vy > 0 ? C.FALL_GRAVITY_MULTIPLIER : 1);
      this.vy = Math.min(C.MAX_FALL_SPEED, this.vy + g * dt);

      // wall slide
      if (ab.wallJump && !this.grounded && this.wallDir !== 0 && dir === this.wallDir && this.vy > 0) {
        this.vy = Math.min(this.vy, C.WALL_SLIDE_SPEED);
        this.wallSliding = true;
      }

      // jumping
      if (this.jumpBuffer > 0) {
        if (this.grounded || this.coyote > 0) {
          this.vy = -C.JUMP_VELOCITY;
          this.afterJump();
          world.emit('jump', this.centerX, this.bottom);
        } else if (ab.wallJump && (this.wallDir !== 0 || this.wallCoyote > 0)) {
          const wd = this.wallDir !== 0 ? this.wallDir : this.lastWallDir;
          this.vx = -wd * C.WALL_JUMP_X;
          this.vy = -C.WALL_JUMP_Y;
          this.facing = -wd;
          this.controlLock = C.WALL_JUMP_CONTROL_LOCK;
          this.wallCoyote = 0;
          this.doubleJumpAvailable = true;
          this.afterJump();
          world.emit('wallJump', wd > 0 ? this.x + this.w : this.x, this.y + this.h / 2, String(wd));
        } else if (ab.doubleJump && this.doubleJumpAvailable) {
          this.vy = -C.DOUBLE_JUMP_VELOCITY;
          this.doubleJumpAvailable = false;
          this.afterJump();
          world.emit('doubleJump', this.centerX, this.bottom);
        }
      }
      // variable jump height
      if (this.jumping && !input.jump && this.vy < 0 && !this.launched) {
        this.vy *= C.JUMP_CUT_MULTIPLIER;
        this.jumping = false;
      }
      if (this.vy >= 0) {
        this.jumping = false;
        this.launched = false;
      }
    }

    // conveyor surface speed
    const surface = this.grounded && this.groundEntity ? this.groundEntity.surfaceVx : 0;

    const wasGrounded = this.grounded;
    this.moveX((this.vx + surface) * dt, world, wasGrounded);
    this.moveY(this.vy * dt, world, wasGrounded);

    // wall probe
    this.wallDir = 0;
    if (!this.grounded) {
      if (this.solidOverlap({ x: this.x + 1, y: this.y + 2, w: this.w, h: this.h - 6 }, world)) this.wallDir = 1;
      else if (this.solidOverlap({ x: this.x - 1, y: this.y + 2, w: this.w, h: this.h - 6 }, world)) this.wallDir = -1;
    }
    if (this.wallDir !== 0) {
      this.lastWallDir = this.wallDir;
      this.wallCoyote = C.WALL_COYOTE_TIME;
    } else {
      this.wallCoyote = Math.max(0, this.wallCoyote - dt);
    }

    this.updateAnim(dir);
  }

  private afterJump(): void {
    this.jumping = true;
    this.launched = false;
    this.grounded = false;
    this.groundEntity = null;
    this.groundSlope = null;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.setCrouchRaw(false);
  }

  private setCrouchRaw(c: boolean): void {
    if (c === this.crouching) return;
    const bottom = this.y + this.h;
    this.crouching = c;
    this.h = c ? C.PLAYER_CROUCH_HEIGHT : C.PLAYER_HEIGHT;
    this.y = bottom - this.h;
  }

  private setCrouch(c: boolean, world: World): void {
    if (c === this.crouching) return;
    if (!c) {
      // only stand up if there is room
      const standRect = { x: this.x, y: this.y + this.h - C.PLAYER_HEIGHT, w: this.w, h: C.PLAYER_HEIGHT };
      if (this.solidOverlap(standRect, world)) return;
    }
    this.setCrouchRaw(c);
  }

  private updateAnim(dir: number): void {
    if (this.dashTime > 0) this.anim = 'dash';
    else if (this.crouching) this.anim = 'crouch';
    else if (this.grounded) this.anim = dir !== 0 || Math.abs(this.vx) > 30 ? 'run' : 'idle';
    else if (this.wallSliding) this.anim = 'wall';
    else this.anim = this.vy < 0 ? 'jump' : 'fall';
  }

  /** Is the rect overlapping any blocking (non one-way) solid? */
  solidOverlap(r: Rect, world: World): Entity | null {
    for (const e of world.solids) {
      if (!e.solid || e.oneWay) continue;
      if (overlaps(r, e)) return e;
    }
    return null;
  }

  private moveX(amount: number, world: World, wasGrounded: boolean): void {
    if (amount === 0) {
      this.snapToSlope();
      return;
    }
    this.x += amount;
    for (const e of world.solids) {
      if (!e.solid || e.oneWay || !overlaps(this, e)) continue;
      // dash breaks cracked walls
      if (this.dashTime > 0 && e instanceof BreakableWall) {
        e.shatter(world);
        continue;
      }
      // step up small ledges when walking
      if (wasGrounded && e.y >= this.y + this.h - C.STEP_UP_HEIGHT) {
        const up = { x: this.x, y: e.y - this.h, w: this.w, h: this.h };
        if (!this.solidOverlap(up, world)) {
          this.y = e.y - this.h;
          continue;
        }
      }
      if (amount > 0) this.x = e.x - this.w;
      else this.x = e.x + e.w;
      if (this.dashTime <= 0) this.vx = 0;
    }
    // level side bounds
    if (this.x < 0) {
      this.x = 0;
      this.vx = Math.max(0, this.vx);
    } else if (this.x + this.w > world.level.width) {
      this.x = world.level.width - this.w;
      this.vx = Math.min(0, this.vx);
    }
    this.snapToSlope();
  }

  private snapToSlope(): void {
    if (!this.groundSlope || this.vy < 0) return;
    const sy = this.groundSlope.surfaceAt(this.centerX);
    if (sy !== null && Math.abs(this.y + this.h - sy) < 20) this.y = sy - this.h;
  }

  private moveY(amount: number, world: World, wasGrounded: boolean): void {
    const prevBottom = this.y + this.h;
    const prevTop = this.y;
    this.y += amount;
    const prevGround = this.groundEntity;
    this.grounded = false;
    this.groundEntity = null;
    this.groundSlope = null;
    let landedOn: Entity | null = null;

    for (const e of world.solids) {
      if (!e.solid || !overlaps(this, e)) continue;
      if (e.oneWay) {
        if (amount < 0 || this.dropTimer > 0) continue;
        const prevTopOfPlatform = e.y - e.dy;
        if (prevBottom <= prevTopOfPlatform + 1 + Math.max(0, -e.dy)) {
          this.y = e.y - this.h;
          landedOn = e;
        }
        continue;
      }
      if (amount >= 0 && prevBottom <= Math.max(e.y, e.y - e.dy) + 2) {
        this.y = e.y - this.h;
        landedOn = e;
      } else if (amount < 0) {
        // corner correction: slide around ledges when barely clipping them
        const overlapLeft = this.x + this.w - e.x;
        const overlapRight = e.x + e.w - this.x;
        if (overlapLeft <= 6 && !this.solidOverlap({ x: e.x - this.w, y: this.y, w: this.w, h: this.h }, world)) {
          this.x = e.x - this.w;
          continue;
        }
        if (overlapRight <= 6 && !this.solidOverlap({ x: e.x + e.w, y: this.y, w: this.w, h: this.h }, world)) {
          this.x = e.x + e.w;
          continue;
        }
        if (prevTop >= e.y + e.h - Math.abs(amount) - 2) {
          this.y = e.y + e.h;
          this.vy = Math.max(0, this.vy) * 0.2;
          this.jumping = false;
        }
      } else {
        // overlapping from inside/side (e.g. pushed): resolve upward if mostly above
        if (this.y + this.h - e.y < this.h * 0.5) {
          this.y = e.y - this.h;
          landedOn = e;
        }
      }
    }

    // slopes
    if (amount >= 0 && !landedOn) {
      for (const s of world.slopes) {
        const sy = s.surfaceAt(this.centerX);
        if (sy === null) continue;
        const tol = wasGrounded ? C.STEP_UP_HEIGHT + 4 : 2;
        if (prevBottom <= sy + tol && this.y + this.h >= sy) {
          this.y = sy - this.h;
          this.groundSlope = s;
          this.grounded = true;
          this.vy = 0;
        }
      }
    }

    if (landedOn) {
      if (!wasGrounded && this.vy > 250) {
        this.landImpact = 0.12;
        world.emit('land', this.centerX, this.y + this.h, String(Math.round(this.vy)));
      }
      this.vy = 0;
      this.grounded = true;
      this.groundEntity = landedOn;
      if (this.dashTime <= 0) this.dashAvailable = true;
      landedOn.onStand(world);
    } else if (this.grounded && this.groundSlope) {
      if (prevGround === null && !wasGrounded) this.landImpact = 0.1;
    }
  }
}
