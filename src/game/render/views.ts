import Phaser from 'phaser';
import type { Entity } from '../sim/Entity';
import { Bat, Ghost, PumpkinTortoise, Raven, Shadow } from '../sim/entities/enemies';
import { Chaser, FallingHazard, MovingHazard, Pendulum, Sludge, Spikes } from '../sim/entities/hazards';
import {
  Button,
  Checkpoint,
  Gate,
  KeyItem,
  Lever,
  LockedDoor,
  PressurePlate,
  Relic,
  Sign,
  Spring,
  TimedSwitch,
} from '../sim/entities/interactive';
import { CrumblingPlatform, Elevator, FallingPlatform, MovingPlatform, PathPlatform, TimedPlatform } from '../sim/entities/platforms';
import { BreakableWall, Conveyor, HiddenWall, Slope, StaticSolid } from '../sim/entities/terrain';
import type { World } from '../sim/World';
import { WORLD_TERRAIN, type TerrainStyle } from './art/terrain';
import { SPRITE_SCALE } from './textures';

export const DEPTH = {
  sky: 0,
  bg: 2,
  fogBack: 5,
  decoBack: 10,
  glow: 12,
  behind: 15,
  terrain: 20,
  objects: 25,
  hazards: 28,
  enemies: 30,
  player: 40,
  decoFront: 45,
  particles: 50,
  chaser: 52,
  overlay: 60,
};

export interface EntityView {
  update(world: World, time: number): void;
}

export interface ViewContext {
  scene: Phaser.Scene;
  worldId: string;
  addGlow(x: number, y: number, radius: number, color: number, alpha?: number): Phaser.GameObjects.Image;
}

/** A TileSprite whose texture is authored at ART_SCALE. */
export function tiled(scene: Phaser.Scene, x: number, y: number, w: number, h: number, key: string): Phaser.GameObjects.TileSprite {
  const ts = scene.add.tileSprite(x, y, w, h, key).setOrigin(0, 0);
  ts.setTileScale(SPRITE_SCALE, SPRITE_SCALE);
  return ts;
}

export function sprite(scene: Phaser.Scene, x: number, y: number, key: string): Phaser.GameObjects.Image {
  return scene.add.image(x, y, key).setScale(SPRITE_SCALE);
}

export function resolveStyle(worldId: string, style: unknown, kind: 'ground' | 'platform'): TerrainStyle {
  if (typeof style === 'string' && style !== 'auto') return style as TerrainStyle;
  const w = WORLD_TERRAIN[worldId] ?? WORLD_TERRAIN['old-town'];
  return kind === 'ground' ? w.ground : w.platform;
}

export function worldTint(worldId: string): number {
  return (WORLD_TERRAIN[worldId] ?? WORLD_TERRAIN['old-town']).tint;
}

/** Terrain block: tiled fill + top edge. */
export function drawBlock(
  ctx: ViewContext,
  x: number,
  y: number,
  w: number,
  h: number,
  style: TerrainStyle,
  depth: number,
): Phaser.GameObjects.Container {
  const { scene } = ctx;
  const c = scene.add.container(x, y).setDepth(depth);
  const fill = tiled(scene, 0, 0, w, h, `terrain-${style}`);
  fill.setTilePosition(x * 2, y * 2); // align pattern to world grid
  fill.setTint(worldTint(ctx.worldId));
  c.add(fill);
  if (h >= 12) {
    const top = tiled(scene, 0, 0, w, Math.min(10, h), `top-${style}`);
    top.setTilePosition(x * 2, 0);
    top.setTint(worldTint(ctx.worldId));
    c.add(top);
  }
  const edge = scene.add.graphics();
  edge.lineStyle(1, 0x000000, 0.45);
  edge.strokeRect(0.5, 0.5, w - 1, h - 1);
  c.add(edge);
  return c;
}

// ───────────────────────────── static terrain

function staticSolidView(ctx: ViewContext, e: StaticSolid): EntityView | null {
  if (e.type === 'oneWay') {
    const style = typeof e.props.style === 'string' ? e.props.style : 'wood';
    const ts = tiled(ctx.scene, e.x, e.y, e.w, 16, `oneway-${style}`).setDepth(DEPTH.terrain);
    ts.setTint(worldTint(ctx.worldId));
    return null;
  }
  const kind = e.type === 'ground' ? 'ground' : 'platform';
  drawBlock(ctx, e.x, e.y, e.w, e.h, resolveStyle(ctx.worldId, e.props.style, kind), DEPTH.terrain);
  return null;
}

function slopeView(ctx: ViewContext, e: Slope): null {
  const { scene } = ctx;
  const style = resolveStyle(ctx.worldId, e.props.style, 'ground');
  const fill = tiled(scene, e.x, e.y, e.w, e.h, `terrain-${style}`).setDepth(DEPTH.terrain);
  fill.setTint(worldTint(ctx.worldId));
  const shape = scene.make.graphics({}, false);
  shape.fillStyle(0xffffff);
  const pts = e.riseRight
    ? [e.x, e.y + e.h, e.x + e.w, e.y, e.x + e.w, e.y + e.h]
    : [e.x, e.y, e.x + e.w, e.y + e.h, e.x, e.y + e.h];
  shape.fillPoints(
    [0, 1, 2].map((i) => new Phaser.Math.Vector2(pts[i * 2], pts[i * 2 + 1])),
    true,
  );
  fill.setMask(shape.createGeometryMask());
  const edge = scene.add.graphics().setDepth(DEPTH.terrain + 1);
  edge.lineStyle(4, 0x4e5436, 1);
  if (e.riseRight) edge.lineBetween(e.x, e.y + e.h, e.x + e.w, e.y);
  else edge.lineBetween(e.x, e.y, e.x + e.w, e.y + e.h);
  return null;
}

function hiddenWallView(ctx: ViewContext, e: HiddenWall): EntityView {
  const block = drawBlock(ctx, e.x, e.y, e.w, e.h, resolveStyle(ctx.worldId, e.props.style, 'ground'), DEPTH.decoFront);
  return {
    update() {
      block.setAlpha(e.anim === 0 ? 1 : e.anim);
    },
  };
}

function breakableView(ctx: ViewContext, e: BreakableWall): EntityView {
  const ts = tiled(ctx.scene, e.x, e.y, e.w, e.h, 'cracked-tile').setDepth(DEPTH.terrain);
  ts.setTint(worldTint(ctx.worldId));
  return {
    update() {
      ts.setVisible(!e.broken);
    },
  };
}

function conveyorView(ctx: ViewContext, e: Conveyor): EntityView {
  const ts = tiled(ctx.scene, e.x, e.y, e.w, e.h, 'conveyor-tile').setDepth(DEPTH.terrain);
  return {
    update() {
      ts.tilePositionX = -e.anim * 32;
    },
  };
}

// ───────────────────────────── moving platforms

function platformSprite(ctx: ViewContext, e: Entity, key: string): Phaser.GameObjects.TileSprite {
  const ts = tiled(ctx.scene, e.x, e.y, e.w, e.h, key).setDepth(DEPTH.terrain);
  return ts;
}

function movingView(ctx: ViewContext, e: MovingPlatform | PathPlatform): EntityView {
  const ts = platformSprite(ctx, e, 'plat-iron');
  return {
    update() {
      ts.setPosition(e.x, e.y);
    },
  };
}

function fallingView(ctx: ViewContext, e: FallingPlatform): EntityView {
  const ts = platformSprite(ctx, e, 'plat-falling');
  return {
    update(_w, time) {
      const shake = e.state === 'shaking' ? Math.sin(time * 80) * 1.5 : 0;
      ts.setPosition(e.x + shake, e.y);
      ts.setVisible(e.state !== 'gone');
    },
  };
}

function crumblingView(ctx: ViewContext, e: CrumblingPlatform): EntityView {
  const ts = platformSprite(ctx, e, 'plat-crumble');
  ts.setTint(worldTint(ctx.worldId));
  return {
    update(_w, time) {
      const shake = e.state === 'cracking' ? Math.sin(time * 90) * (1 + e.anim) : 0;
      ts.setPosition(e.x + shake, e.y);
      ts.setVisible(e.state !== 'broken');
      ts.setAlpha(e.state === 'broken' ? 0 : 1 - e.anim * 0.3);
    },
  };
}

function timedView(ctx: ViewContext, e: TimedPlatform): EntityView {
  const ts = platformSprite(ctx, e, 'plat-phantom');
  const outline = ctx.scene.add.graphics().setDepth(DEPTH.terrain - 1);
  outline.lineStyle(1.5, 0xbfb0ff, 0.7);
  outline.strokeRect(e.x + 0.5, e.y + 0.5, e.w - 1, e.h - 1);
  return {
    update() {
      ts.setAlpha(e.visibility);
    },
  };
}

function elevatorView(ctx: ViewContext, e: Elevator): EntityView {
  const { scene } = ctx;
  const ts = platformSprite(ctx, e, 'plat-elevator');
  const rope = scene.add.graphics().setDepth(DEPTH.behind);
  const up = e.props.direction !== 'down';
  const dist = typeof e.props.distance === 'number' ? e.props.distance : 256;
  const topY = up ? e.obj.y - dist - 40 : e.obj.y - 40;
  return {
    update() {
      ts.setPosition(e.x, e.y);
      rope.clear();
      rope.lineStyle(2, 0x3a3d48, 1);
      rope.lineBetween(e.x + 8, topY, e.x + 8, e.y);
      rope.lineBetween(e.x + e.w - 8, topY, e.x + e.w - 8, e.y);
    },
  };
}

// ───────────────────────────── hazards

function spikesView(ctx: ViewContext, e: Spikes): null {
  const dir = typeof e.props.direction === 'string' ? e.props.direction : 'up';
  tiled(ctx.scene, e.x, e.y, e.w, e.h, `spikes-${dir}`).setDepth(DEPTH.hazards);
  return null;
}

function sludgeView(ctx: ViewContext, e: Sludge): EntityView {
  const { scene } = ctx;
  const body = scene.add.rectangle(e.x, e.y + 8, e.w, e.h - 8, 0x35561f, 0.95).setOrigin(0, 0).setDepth(DEPTH.hazards);
  const surf = tiled(scene, e.x, e.y, e.w, 16, 'sludge-surface').setDepth(DEPTH.hazards + 1);
  for (let x = e.x + 40; x < e.x + e.w; x += 160) ctx.addGlow(x, e.y + 6, 70, 0x6fae3c, 0.35);
  void body;
  return {
    update(_w, time) {
      surf.tilePositionX = time * 30;
    },
  };
}

function pendulumView(ctx: ViewContext, e: Pendulum): EntityView {
  const { scene } = ctx;
  const g = scene.add.graphics().setDepth(DEPTH.hazards);
  const blade = sprite(scene, 0, 0, 'blade').setDepth(DEPTH.hazards + 1).setOrigin(0.5, 0.2);
  const pivot = scene.add.circle(e.pivotX, e.pivotY, 6, 0x3e414c).setDepth(DEPTH.hazards + 2);
  void pivot;
  return {
    update() {
      g.clear();
      g.lineStyle(3, 0x555a66, 1);
      g.lineBetween(e.pivotX, e.pivotY, e.bladeX, e.bladeY);
      blade.setPosition(e.bladeX, e.bladeY - 6);
      blade.setRotation(-e.angle);
    },
  };
}

function movingHazardView(ctx: ViewContext, e: MovingHazard): EntityView {
  const ball = sprite(ctx.scene, e.x + e.w / 2, e.y + e.h / 2, 'iron-ball').setDepth(DEPTH.hazards);
  ball.setDisplaySize(e.w, e.h);
  return {
    update() {
      ball.setPosition(e.x + e.w / 2, e.y + e.h / 2);
      ball.setRotation(e.anim * 3);
    },
  };
}

function fallingHazardView(ctx: ViewContext, e: FallingHazard): EntityView {
  const img = sprite(ctx.scene, e.x, e.y, 'masonry').setOrigin(0, 0).setDepth(DEPTH.hazards);
  img.setDisplaySize(e.w, e.h);
  img.setTint(worldTint(ctx.worldId));
  return {
    update(_w, time) {
      const shake = e.state === 'shaking' ? Math.sin(time * 90) * 1.5 : 0;
      img.setPosition(e.x + shake, e.y);
      img.setVisible(e.state !== 'gone');
    },
  };
}

function chaserView(ctx: ViewContext, e: Chaser): EntityView {
  const g = ctx.scene.add.graphics().setDepth(DEPTH.chaser);
  const dir = typeof e.props.direction === 'string' ? e.props.direction : 'right';
  return {
    update(_w, time) {
      g.clear();
      g.fillStyle(0x08040c, 0.97);
      if (dir === 'up') {
        g.fillRect(e.x, e.y + 14, e.w, e.h + 2000);
        for (let x = e.x; x < e.x + e.w; x += 16) {
          const wave = Math.sin(time * 3 + x * 0.05) * 8 + 8;
          g.fillRect(x, e.y + 14 - wave, 16, wave);
        }
        g.fillStyle(0x5a2a7a, 0.35);
        g.fillRect(e.x, e.y + 4, e.w, 6);
      } else {
        const front = dir === 'right' ? e.x + e.w : e.x;
        // body spans from where the dark started to its (wavy) front
        const x0 = dir === 'right' ? e.obj.x : front + 14;
        const x1 = dir === 'right' ? front - 14 : e.obj.x + e.obj.width;
        g.fillRect(x0, e.y, Math.max(0, x1 - x0), e.h);
        for (let y = e.y; y < e.y + e.h; y += 16) {
          const wave = Math.sin(time * 3 + y * 0.05) * 8 + 10;
          if (dir === 'right') g.fillRect(front - 14, y, wave, 16);
          else g.fillRect(front + 14 - wave, y, wave, 16);
        }
        g.fillStyle(0x5a2a7a, 0.35);
        g.fillRect(dir === 'right' ? front - 4 : front, e.y, 6, e.h);
      }
    },
  };
}

// ───────────────────────────── interactive

function gateView(ctx: ViewContext, e: Gate): EntityView {
  const { scene } = ctx;
  const bars = tiled(scene, e.x, e.y, e.w, e.h, 'gate-tile').setDepth(DEPTH.behind);
  const top = tiled(scene, e.x, e.y + e.h - 12, e.w, 12, 'gate-top').setDepth(DEPTH.behind);
  top.setFlipY(true);
  return {
    update() {
      bars.setPosition(e.x, e.y);
      top.setPosition(e.x, e.y + e.h - 12);
    },
  };
}

function lockedDoorView(ctx: ViewContext, e: LockedDoor): EntityView {
  const door = tiled(ctx.scene, e.x, e.y, e.w, e.h, 'door-tile').setDepth(DEPTH.objects);
  const lock = sprite(ctx.scene, e.x + e.w / 2, e.y + e.h / 2, `lock-${e.color}`).setDepth(DEPTH.objects + 1);
  return {
    update() {
      const a = 1 - e.openAnim;
      door.setAlpha(a);
      lock.setAlpha(a);
      lock.setY(e.y + e.h / 2 - e.openAnim * 20);
      door.setVisible(a > 0);
      lock.setVisible(a > 0);
    },
  };
}

function textureSwap(ctx: ViewContext, e: Entity, onKey: string, offKey: string, isOn: () => boolean): EntityView {
  const img = sprite(ctx.scene, e.x + e.w / 2, e.y + e.h, offKey).setOrigin(0.5, 1).setDepth(DEPTH.objects);
  return {
    update() {
      img.setTexture(isOn() ? onKey : offKey);
    },
  };
}

function checkpointView(ctx: ViewContext, e: Checkpoint): EntityView {
  const img = sprite(ctx.scene, e.x + e.w / 2, e.y + e.h, 'checkpoint-off').setOrigin(0.5, 1).setDepth(DEPTH.objects);
  const glow = ctx.addGlow(e.x + e.w / 2, e.y + 16, 90, 0xe8913a, 0);
  return {
    update(_w, time) {
      img.setTexture(e.lit ? 'checkpoint-on' : 'checkpoint-off');
      glow.setAlpha(e.lit ? 0.55 + Math.sin(time * 7) * 0.05 : 0);
    },
  };
}

function pickupView(ctx: ViewContext, e: KeyItem | Relic, key: string, glowColor: number): EntityView {
  const img = sprite(ctx.scene, e.x + e.w / 2, e.y + e.h / 2, key).setDepth(DEPTH.objects);
  const glow = ctx.addGlow(e.x + e.w / 2, e.y + e.h / 2, 50, glowColor, 0.5);
  return {
    update() {
      const bob = Math.sin(e.anim * 3) * 3;
      img.setY(e.y + e.h / 2 + bob);
      glow.setY(e.y + e.h / 2 + bob);
      img.setVisible(!e.collected);
      glow.setVisible(!e.collected);
    },
  };
}

function springView(ctx: ViewContext, e: Spring): EntityView {
  const img = sprite(ctx.scene, e.x + e.w / 2, e.y + e.h, 'spring-0').setOrigin(0.5, 1).setDepth(DEPTH.objects);
  return {
    update() {
      img.setTexture(e.anim > 0.5 ? 'spring-1' : 'spring-0');
    },
  };
}

// ───────────────────────────── enemies

function enemyView(ctx: ViewContext, e: Entity & { facing: number; deadTimer: number }, base: string, frameRate: number, alphaFn?: () => number): EntityView {
  const img = sprite(ctx.scene, e.x + e.w / 2, e.y + e.h, `${base}-0`).setOrigin(0.5, 1).setDepth(DEPTH.enemies);
  return {
    update() {
      const frame = Math.floor(e.anim * frameRate) % 2;
      img.setTexture(`${base}-${frame}`);
      img.setFlipX(e.facing < 0);
      if (e.dead) {
        const t = e.deadTimer;
        img.setPosition(e.x + e.w / 2, e.y + e.h + t * t * 900);
        img.setAngle(t * 200);
        img.setAlpha(Math.max(0, 1 - t * 1.5));
      } else {
        img.setPosition(e.x + e.w / 2, e.y + e.h);
        img.setAngle(0);
        img.setAlpha(alphaFn ? alphaFn() : 1);
      }
    },
  };
}

function tortoiseView(ctx: ViewContext, e: PumpkinTortoise): EntityView {
  const img = sprite(ctx.scene, e.x + e.w / 2, e.y + e.h, 'tortoise-0').setOrigin(0.5, 1).setDepth(DEPTH.enemies);
  return {
    update() {
      img.setPosition(e.x + e.w / 2, e.y + e.h);
      img.setAlpha(1);
      img.setFlipX(e.facing < 0);
      if (e.dead) {
        const t = e.deadTimer;
        img.setTexture('tortoise-shell');
        img.setPosition(e.x + e.w / 2, e.y + e.h + t * t * 900);
        img.setAngle(t * 200);
        img.setAlpha(Math.max(0, 1 - t * 1.5));
        return;
      }
      if (e.state === 'walk') {
        img.setTexture(`tortoise-${Math.floor(e.anim * 5) % 2}`);
        img.setAngle(0);
      } else if (e.state === 'slide') {
        img.setTexture(`tortoise-spin-${Math.floor(e.anim * 16) % 2}`);
        img.setAngle(0);
      } else {
        img.setTexture('tortoise-shell');
        // wobble when it's about to pop back out
        const left = PumpkinTortoise.HIDE_TIME - e.stateTime;
        img.setAngle(left < 1.5 ? Math.sin(e.anim * 30) * 8 : 0);
      }
    },
  };
}

function shadowView(ctx: ViewContext, e: Shadow): EntityView {
  const pool = sprite(ctx.scene, e.obj.x + e.w / 2, e.obj.y + e.h, 'shadow-pool').setDepth(DEPTH.objects).setOrigin(0.5, 0.6);
  const body = sprite(ctx.scene, e.x + e.w / 2, e.y + e.h, 'shadow').setOrigin(0.5, 1).setDepth(DEPTH.enemies);
  return {
    update(_w, time) {
      pool.setScale(0.5 * (1 + Math.sin(time * 2) * 0.05), 0.5);
      body.setPosition(e.x + e.w / 2, e.y + e.h + (1 - e.rise) * 30);
      body.setAlpha(e.rise);
      body.setScale(0.5, 0.5 * Math.max(0.1, e.rise));
      body.setFlipX(e.facing < 0);
    },
  };
}

/** Factory: build the visual for an entity (null = static, nothing to update). */
export function createView(ctx: ViewContext, e: Entity): EntityView | null {
  if (e instanceof StaticSolid) return staticSolidView(ctx, e);
  if (e instanceof Slope) return slopeView(ctx, e);
  if (e instanceof HiddenWall) return hiddenWallView(ctx, e);
  if (e instanceof BreakableWall) return breakableView(ctx, e);
  if (e instanceof Conveyor) return conveyorView(ctx, e);
  if (e instanceof MovingPlatform || e instanceof PathPlatform) return movingView(ctx, e);
  if (e instanceof FallingPlatform) return fallingView(ctx, e);
  if (e instanceof CrumblingPlatform) return crumblingView(ctx, e);
  if (e instanceof TimedPlatform) return timedView(ctx, e);
  if (e instanceof Elevator) return elevatorView(ctx, e);
  if (e instanceof Spikes) return spikesView(ctx, e);
  if (e instanceof Sludge) return sludgeView(ctx, e);
  if (e instanceof Pendulum) return pendulumView(ctx, e);
  if (e instanceof MovingHazard) return movingHazardView(ctx, e);
  if (e instanceof FallingHazard) return fallingHazardView(ctx, e);
  if (e instanceof Chaser) return chaserView(ctx, e);
  if (e instanceof Gate) return gateView(ctx, e);
  if (e instanceof LockedDoor) return lockedDoorView(ctx, e);
  if (e instanceof PressurePlate) return textureSwap(ctx, e, 'plate-down', 'plate-up', () => e.on);
  if (e instanceof Lever) return textureSwap(ctx, e, 'lever-on', 'lever-off', () => e.on);
  if (e instanceof Button) return textureSwap(ctx, e, 'button-down', 'button-up', () => e.on);
  if (e instanceof TimedSwitch) return textureSwap(ctx, e, 'timer-on', 'timer-off', () => e.on);
  if (e instanceof Checkpoint) return checkpointView(ctx, e);
  if (e instanceof KeyItem) return pickupView(ctx, e, `key-${e.color}`, 0xe8c86a);
  if (e instanceof Relic) return pickupView(ctx, e, 'relic', 0xa9d4f5);
  if (e instanceof Spring) return springView(ctx, e);
  if (e instanceof Sign) {
    sprite(ctx.scene, e.x + e.w / 2, e.y + e.h, 'sign').setOrigin(0.5, 1).setDepth(DEPTH.objects);
    return null;
  }
  if (e instanceof PumpkinTortoise) return tortoiseView(ctx, e);
  if (e instanceof Ghost) return enemyView(ctx, e, 'ghost', 2.5, () => 0.8 + Math.sin(e.anim * 2) * 0.12);
  if (e instanceof Bat) return enemyView(ctx, e, 'bat', 8);
  if (e instanceof Raven) return enemyView(ctx, e, 'raven', 7);
  if (e instanceof Shadow) return shadowView(ctx, e);
  return null;
}
