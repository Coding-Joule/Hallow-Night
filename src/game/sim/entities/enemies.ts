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

/**
 * Pumpkin tortoise: crawls like a walker. Stomp it and it hides in its
 * pumpkin shell; kick the shell (walk into it or stomp it again) and it
 * slides away fast, bouncing off walls and knocking out other creatures.
 * A sliding shell hurts the player too — stomp it to stop it.
 */
export class PumpkinTortoise extends Enemy {
  state: 'walk' | 'shell' | 'slide' = 'walk';
  /** Time spent in the current state. */
  stateTime = 0;
  private vy = 0;
  private readonly speed: number;
  private readonly shellSpeed: number;
  static readonly HIDE_TIME = 6;
  constructor(obj: LevelObject) {
    super(obj);
    this.stompable = true;
    this.speed = num(obj.properties.speed, 45);
    this.shellSpeed = num(obj.properties.shellSpeed, 420);
    this.facing = str(obj.properties.direction, 'left') === 'right' ? 1 : -1;
  }
  private setState(s: PumpkinTortoise['state']): void {
    this.state = s;
    this.stateTime = 0;
  }
  private kick(dir: number, world: World): void {
    this.facing = dir;
    this.setState('slide');
    world.emit('kick', this.x + this.w / 2, this.y + this.h / 2);
  }
  protected think(dt: number, world: World): void {
    this.stateTime += dt;
    // gravity
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
    if (this.y > world.level.height + 64) {
      this.dead = true;
      this.deadTimer = 10; // fell out of the level: gone, no tumble animation
      return;
    }
    if (this.state === 'shell') {
      if (this.stateTime > PumpkinTortoise.HIDE_TIME) this.setState('walk');
      return;
    }
    if (this.state === 'slide') {
      const nx = this.x + this.facing * this.shellSpeed * dt;
      const probe: Rect = { x: nx, y: this.y, w: this.w, h: this.h - 2 };
      if (world.solidAt(probe, this) || nx < 0 || nx + this.w > world.level.width) {
        this.facing = -this.facing;
        world.emit('kick', this.facing < 0 ? this.x + this.w : this.x, this.y + this.h / 2);
      } else this.x = nx;
      // knock out whatever it hits
      for (const o of world.enemies) {
        if (o === this || o.dead || o.type === 'shadow') continue;
        if (overlaps(this, o)) {
          if (o instanceof PumpkinTortoise) o.dead = true;
          else o.onStomp(world);
          world.emit('stomp', o.x + o.w / 2, o.y);
        }
      }
      return;
    }
    if (!grounded) return;
    const nx = this.x + this.facing * this.speed * dt;
    const probe: Rect = { x: nx, y: this.y, w: this.w, h: this.h - 2 };
    const blocked = world.solidAt(probe, this) || nx < 0 || nx + this.w > world.level.width;
    const footX = this.facing > 0 ? nx + this.w + 1 : nx - 1;
    const hasFloor = world.solidAt({ x: footX - 1, y: this.y + this.h, w: 2, h: 6 }, this, true);
    if (blocked || !hasFloor) this.facing = -this.facing;
    else this.x = nx;
  }
  onStomp(world: World): void {
    if (this.state === 'shell') {
      const p = world.player;
      this.kick(p.x + p.w / 2 < this.x + this.w / 2 ? 1 : -1, world);
    } else this.setState('shell');
  }
  onBump(world: World): boolean {
    if (this.dead) return false;
    if (this.state === 'shell') {
      // brief grace right after hiding so a bounce doesn't instantly kick it
      if (this.stateTime < 0.15) return true;
      const p = world.player;
      this.kick(p.x + p.w / 2 < this.x + this.w / 2 ? 1 : -1, world);
      return true;
    }
    // a freshly kicked shell can't hurt the kicker
    return this.state === 'slide' && this.stateTime < 0.25;
  }
  hurts(p: Rect): boolean {
    if (this.dead || this.state === 'shell') return false;
    return overlaps(p, { x: this.x + 3, y: this.y + 4, w: this.w - 6, h: this.h - 5 });
  }
  reset(): void {
    super.reset();
    this.vy = 0;
    this.setState('walk');
    this.facing = str(this.props.direction, 'left') === 'right' ? 1 : -1;
  }
}

export type BossKind = 'pumpkinKing' | 'graveGolem' | 'batQueen' | 'gloomGhost' | 'slimeKing' | 'clockOwl' | 'midnightKing';
export const BOSS_KINDS: BossKind[] = ['pumpkinKing', 'graveGolem', 'batQueen', 'gloomGhost', 'slimeKing', 'clockOwl', 'midnightKing'];
type BossMove = 'hopper' | 'charger' | 'flyer';

const BOSS_MOVES: Record<BossKind, BossMove> = {
  pumpkinKing: 'hopper',
  graveGolem: 'charger',
  batQueen: 'flyer',
  gloomGhost: 'flyer',
  slimeKing: 'hopper',
  clockOwl: 'flyer',
  midnightKing: 'hopper', // switches style as it loses health
};

/**
 * End-of-world boss. Stomp it `hp` times; after each hit it flashes (harmless)
 * for a moment and gets a little faster. The exit opens when it is defeated.
 *  - hopper: crouches, then leaps toward the player
 *  - charger: stalks, then rushes across the arena and is dizzy after hitting a wall
 *  - flyer: sweeps above the arena and swoops down at the player now and then
 */
export class Boss extends Enemy {
  readonly kind: BossKind;
  readonly maxHp: number;
  hp: number;
  /** Seconds of flashing invulnerability left after a hit. */
  invuln = 0;
  /** Current action, for the renderer. */
  action: 'idle' | 'crouch' | 'air' | 'charge' | 'dizzy' | 'swoop' = 'idle';
  private timer = 1.2;
  private vx = 0;
  private vy = 0;
  private swoopT = 0;
  constructor(obj: LevelObject) {
    super(obj);
    this.boss = true;
    this.stompable = true;
    const k = str(obj.properties.kind, 'pumpkinKing') as BossKind;
    this.kind = BOSS_KINDS.includes(k) ? k : 'pumpkinKing';
    this.maxHp = Math.max(1, Math.round(num(obj.properties.hp, 3)));
    this.hp = this.maxHp;
  }
  get move(): BossMove {
    if (this.kind !== 'midnightKing') return BOSS_MOVES[this.kind];
    const lost = this.maxHp - this.hp;
    return lost < 2 ? 'hopper' : lost < 4 ? 'charger' : 'flyer';
  }
  /** Gets faster as it gets hurt. */
  private get rage(): number {
    return num(this.props.speed, 1) * (1 + 0.18 * (this.maxHp - this.hp));
  }
  private physics(dt: number, world: World): boolean {
    this.vy = Math.min(900, this.vy + GRAVITY * dt);
    const prevBottom = this.y + this.h;
    this.y += this.vy * dt;
    const ground = world.groundUnder(this, prevBottom);
    let grounded = false;
    if (ground !== null) {
      this.y = ground - this.h;
      this.vy = 0;
      grounded = true;
    }
    if (this.vx !== 0) {
      const nx = this.x + this.vx * dt;
      if (world.solidAt({ x: nx, y: this.y, w: this.w, h: this.h - 4 }, this) || nx < 0 || nx + this.w > world.level.width) {
        this.vx = 0;
        if (this.action === 'charge') {
          this.action = 'dizzy';
          this.timer = 1.6;
          world.emit('break', this.facing > 0 ? this.x + this.w : this.x, this.y + this.h / 2);
        }
      } else this.x = nx;
    }
    return grounded;
  }
  protected think(dt: number, world: World): void {
    this.invuln = Math.max(0, this.invuln - dt);
    this.timer -= dt;
    const p = world.player;
    const toPlayer = p.x + p.w / 2 - (this.x + this.w / 2);
    switch (this.move) {
      case 'hopper': {
        const grounded = this.physics(dt, world);
        if (grounded && this.action === 'air') {
          this.action = 'idle';
          this.vx = 0;
          this.timer = 0.9 / this.rage;
          world.emit('land', this.x + this.w / 2, this.y + this.h);
        }
        if (!grounded) break;
        if (this.action !== 'crouch') {
          this.action = this.timer < 0.35 ? 'crouch' : 'idle';
          this.facing = toPlayer >= 0 ? 1 : -1;
        }
        if (this.timer <= 0) {
          this.action = 'air';
          this.vy = -num(this.props.jump, 720);
          this.vx = Math.max(-330, Math.min(330, toPlayer * 0.9)) * Math.min(1.4, this.rage);
        }
        break;
      }
      case 'charger': {
        const grounded = this.physics(dt, world);
        if (!grounded) break;
        if (this.action === 'dizzy') {
          this.vx = 0;
          if (this.timer <= 0) {
            this.action = 'idle';
            this.timer = 0.8;
          }
        } else if (this.action === 'charge') {
          this.vx = this.facing * 340 * this.rage;
        } else {
          this.facing = toPlayer >= 0 ? 1 : -1;
          this.vx = this.facing * 50;
          this.action = this.timer < 0.5 ? 'crouch' : 'idle';
          if (this.action === 'crouch') this.vx = 0;
          if (this.timer <= 0) {
            this.action = 'charge';
            world.emit('kick', this.x + this.w / 2, this.y + this.h);
          }
        }
        break;
      }
      case 'flyer': {
        const range = num(this.props.range, 320);
        const homeY = this.obj.y;
        const low = homeY + num(this.props.dive, 160);
        if (this.action === 'swoop') {
          this.swoopT += dt * 0.85 * Math.min(1.5, this.rage);
          const s = Math.sin(Math.min(1, this.swoopT) * Math.PI);
          this.y = homeY + (low - homeY) * s;
          this.x += this.facing * 150 * this.rage * dt;
          if (this.swoopT >= 1) {
            this.action = 'idle';
            this.timer = 2.4 / this.rage;
          }
        } else {
          // drift toward the player's side above the arena
          const target = Math.max(this.obj.x - range, Math.min(this.obj.x + range, p.x + p.w / 2 - this.w / 2));
          const d = target - this.x;
          this.x += Math.sign(d) * Math.min(Math.abs(d), 110 * this.rage * dt);
          if (Math.abs(d) > 4) this.facing = d > 0 ? 1 : -1;
          this.y += (homeY + Math.sin(this.anim * 2.2) * 10 - this.y) * Math.min(1, dt * 4);
          this.action = 'idle';
          if (this.timer <= 0) {
            this.action = 'swoop';
            this.swoopT = 0;
            this.facing = toPlayer >= 0 ? 1 : -1;
          }
        }
        this.x = Math.max(this.obj.x - range - 64, Math.min(this.obj.x + range + 64, this.x));
        break;
      }
    }
  }
  onStomp(world: World): void {
    if (this.invuln > 0) return; // still flashing: just bounce off
    this.hp--;
    this.invuln = 1.1;
    world.emit('bossHit', this.x + this.w / 2, this.y);
    if (this.hp <= 0) {
      this.dead = true;
      world.emit('bossDefeated', this.x + this.w / 2, this.y + this.h / 2);
      return;
    }
    // get away from the player a bit
    if (this.move !== 'flyer') {
      this.action = 'air';
      this.vy = -420;
      this.vx = (world.player.x < this.x ? 1 : -1) * 220;
    } else {
      this.action = 'idle';
      this.timer = 1.6;
    }
  }
  hurts(p: Rect): boolean {
    if (this.dead || this.invuln > 0.5) return false;
    return overlaps(p, { x: this.x + 8, y: this.y + 14, w: this.w - 16, h: this.h - 16 });
  }
  reset(): void {
    super.reset();
    this.hp = this.maxHp;
    this.invuln = 0;
    this.action = 'idle';
    this.timer = 1.2;
    this.vx = this.vy = 0;
    this.swoopT = 0;
  }
}
