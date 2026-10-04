import Phaser from 'phaser';
import { CAMERA_LERP, CAMERA_LOOKAHEAD, CAMERA_VERTICAL_OFFSET, VIEW_HEIGHT, VIEW_WIDTH } from '../config/game';
import type { LevelObject } from '../levels/schema';
import type { World } from '../sim/World';
import { DECORATION_LIGHTS } from './art/decorations';
import { Background } from './Background';
import { Effects } from './Effects';
import { PlayerView } from './PlayerView';
import { queueWorldTextures } from './textures';
import { createView, DEPTH, sprite, worldTint, type EntityView, type ViewContext } from './views';

const AMBIENT_COLORS: Record<string, number> = {
  'old-town': 0xe8913a,
  graveyard: 0xb8c4d8,
  'dead-woods': 0x9ab870,
  'haunted-manor': 0xc9b8ff,
  catacombs: 0x8fd060,
  clocktower: 0xe8c86a,
  'black-castle': 0xd9534f,
  'frozen-hollow': 0x8fd3f0,
  'candy-carnival': 0xf08fc8,
  'witch-swamp': 0x9fd060,
  'ghost-harbor': 0x7fc4d8,
  'lava-crypt': 0xff7a3a,
  'sky-ruins': 0xc8c0ff,
  'toy-factory': 0xf0c050,
  'mirror-manor': 0xa0f0f0,
  'moon-garden': 0xe0e0ff,
  'nightmare-realm': 0xc050e0,
};

export interface RenderOptions {
  screenshake: () => boolean;
  reducedMotion: () => boolean;
}

/** Builds and updates every visual for a World. */
export class LevelRenderer {
  readonly effects: Effects;
  private views: EntityView[] = [];
  private background: Background;
  private playerView: PlayerView;
  private flickers: { img: Phaser.GameObjects.Image; base: number; seed: number }[] = [];
  private camX = 0;
  private camY = 0;
  private look = 0;

  static preload(scene: Phaser.Scene, world: World): void {
    queueWorldTextures(scene.load, world.level.background);
  }

  constructor(
    private scene: Phaser.Scene,
    private world: World,
    opts: RenderOptions,
  ) {
    const level = world.level;
    this.background = new Background(scene, level.background, level.height);
    this.effects = new Effects(scene, opts.screenshake, opts.reducedMotion);

    const ctx: ViewContext = {
      scene,
      worldId: level.background,
      addGlow: (x, y, radius, color, alpha = 0.5) => this.addGlow(x, y, radius, color, alpha),
    };

    for (const obj of level.objects) if (obj.type === 'decoration') this.addDecoration(obj);
    this.addGoal();
    for (const e of world.entities) {
      const v = createView(ctx, e);
      if (v) this.views.push(v);
    }
    this.playerView = new PlayerView(scene, world.player, opts.reducedMotion);

    // darkness vignette
    scene.add.image(0, 0, 'vignette').setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.overlay).setAlpha(0.9);
    this.effects.startAmbient(AMBIENT_COLORS[level.background] ?? 0xe8913a, level.width, level.height);

    const cam = scene.cameras.main;
    cam.setBackgroundColor('#07060d');
    this.snapCamera();
  }

  private addGlow(x: number, y: number, radius: number, color: number, alpha: number): Phaser.GameObjects.Image {
    return this.scene.add
      .image(x, y, 'glow')
      .setScale((radius * 2) / 64)
      .setTint(color)
      .setAlpha(alpha)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.glow);
  }

  private addDecoration(obj: LevelObject): void {
    const kind = String(obj.properties.kind ?? 'pumpkin');
    const front = obj.properties.layer === 'front';
    const img = sprite(this.scene, obj.x, obj.y, `deco-${kind}`).setOrigin(0, 0);
    img.setDisplaySize(obj.width, obj.height);
    img.setFlipX(obj.properties.flip === true);
    img.setDepth(front ? DEPTH.decoFront : DEPTH.decoBack);
    if (front) img.setTint(0x6a6478);
    else img.setTint(worldTint(this.world.level.background));
    const light = DECORATION_LIGHTS[kind];
    if (light) {
      const [ox, oy, r, color] = light;
      const scale = obj.width / (img.width * 0.5);
      const g = this.addGlow(obj.x + obj.width * ox, obj.y + obj.height * oy, r * Math.max(0.6, Math.min(2, scale)), color, 0.5);
      this.flickers.push({ img: g, base: 0.5, seed: obj.x * 0.13 + obj.y });
    }
  }

  private goalImg?: Phaser.GameObjects.Image;

  private addGoal(): void {
    const g = this.world.level.goal;
    this.goalImg = sprite(this.scene, g.x, g.y, 'goal').setOrigin(0.5, 1).setDepth(DEPTH.objects - 1);
    const glow = this.addGlow(g.x, g.y - 40, 90, 0x8f7dd0, 0.45);
    this.flickers.push({ img: glow, base: 0.45, seed: 3 });
  }

  private cameraTarget(): { x: number; y: number } {
    const p = this.world.player;
    const lvl = this.world.level;
    const tx = p.x + p.w / 2 + this.look - VIEW_WIDTH / 2;
    const ty = p.y + p.h / 2 + CAMERA_VERTICAL_OFFSET - VIEW_HEIGHT / 2;
    const maxX = Math.max(0, lvl.width - VIEW_WIDTH);
    const maxY = Math.max(0, lvl.height - VIEW_HEIGHT);
    return {
      x: lvl.width < VIEW_WIDTH ? (lvl.width - VIEW_WIDTH) / 2 : Phaser.Math.Clamp(tx, 0, maxX),
      y: lvl.height < VIEW_HEIGHT ? (lvl.height - VIEW_HEIGHT) / 2 : Phaser.Math.Clamp(ty, 0, maxY),
    };
  }

  snapCamera(): void {
    this.look = this.world.player.facing * CAMERA_LOOKAHEAD * 0.5;
    const t = this.cameraTarget();
    this.camX = t.x;
    this.camY = t.y;
    this.applyCamera();
  }

  private applyCamera(): void {
    const cam = this.scene.cameras.main;
    cam.scrollX = Math.round(this.camX * 2) / 2;
    cam.scrollY = Math.round(this.camY * 2) / 2;
  }

  update(dt: number, time: number): void {
    const p = this.world.player;
    if (!p.dead) {
      const wantLook = Phaser.Math.Clamp(p.vx / 250, -1, 1) * CAMERA_LOOKAHEAD;
      this.look += (wantLook - this.look) * Math.min(1, dt * 1.8);
      const t = this.cameraTarget();
      const k = 1 - Math.exp(-CAMERA_LERP * dt);
      const ky = 1 - Math.exp(-CAMERA_LERP * 0.8 * dt);
      this.camX += (t.x - this.camX) * k;
      this.camY += (t.y - this.camY) * ky;
      this.applyCamera();
    }
    for (const v of this.views) v.update(this.world, time);
    if (this.goalImg) {
      // a boss keeps the exit shut
      const locked = this.world.goalLocked;
      this.goalImg.setAlpha(locked ? 0.35 : 1);
      if (locked) this.goalImg.setTint(0x777777);
      else this.goalImg.clearTint();
    }
    this.playerView.update(dt, time);
    for (const f of this.flickers) f.img.setAlpha(f.base * (0.9 + Math.sin(time * 9 + f.seed) * 0.06 + Math.sin(time * 23 + f.seed) * 0.04));
    this.background.update(this.camX, this.camY, time);
  }
}
