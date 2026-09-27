import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../config/game';
import type { WorldId } from '../levels/worlds';
import { backgroundTheme } from './art/backgrounds';
import { rng } from './art/svg';
import { DEPTH } from './views';

/** Sky, moon, parallax silhouettes and fog. Everything is fixed to the camera. */
export class Background {
  private layers: { ts: Phaser.GameObjects.TileSprite; factor: number; factorY: number; baseY: number }[] = [];
  private fog: Phaser.GameObjects.TileSprite;
  private moon: Phaser.GameObjects.Container | null = null;
  private moonBase = { x: 0, y: 0 };

  constructor(
    scene: Phaser.Scene,
    world: WorldId,
    private levelHeight: number,
  ) {
    const theme = backgroundTheme(world);
    const sky = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.sky);
    sky.fillGradientStyle(theme.skyTop, theme.skyTop, theme.skyBottom, theme.skyBottom, 1);
    sky.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    if (theme.stars) {
      const r = rng(world.length * 97);
      const stars = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.sky);
      for (let i = 0; i < 90; i++) {
        stars.fillStyle(0xffffff, 0.15 + r() * 0.5);
        stars.fillCircle(r() * VIEW_WIDTH, r() * VIEW_HEIGHT * 0.6, r() < 0.1 ? 1.4 : 0.8);
      }
    }
    if (theme.moon) {
      const m = theme.moon;
      const glow = scene.add.image(0, 0, 'glow').setScale((m.r * 5) / 64).setTint(m.glow).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
      const disc = scene.add.circle(0, 0, m.r, Phaser.Display.Color.HexStringToColor(m.color).color);
      const shade = scene.add.circle(m.r * 0.25, -m.r * 0.1, m.r * 0.9, 0x000000, 0.08);
      this.moon = scene.add.container(m.x, m.y, [glow, disc, shade]).setScrollFactor(0).setDepth(DEPTH.sky + 1);
      this.moonBase = { x: m.x, y: m.y };
    }
    for (const l of theme.layers) {
      const y = VIEW_HEIGHT - l.bottom - l.height;
      const ts = scene.add
        .tileSprite(0, y, VIEW_WIDTH, l.height, l.key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH.bg)
        .setAlpha(l.alpha ?? 1);
      this.layers.push({ ts, factor: l.factor, factorY: l.factorY, baseY: y });
    }
    this.fog = scene.add
      .tileSprite(0, VIEW_HEIGHT - 200, VIEW_WIDTH, 200, `fog-${world}`)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.fogBack)
      .setAlpha(0.8);
  }

  update(scrollX: number, scrollY: number, time: number): void {
    // vertical offset: 0 when the camera is at the bottom of the level
    const fromBottom = Math.max(0, this.levelHeight - VIEW_HEIGHT - scrollY);
    for (const l of this.layers) {
      l.ts.tilePositionX = scrollX * l.factor;
      l.ts.y = l.baseY + fromBottom * l.factorY;
    }
    this.fog.tilePositionX = scrollX * 0.5 + time * 8;
    this.fog.y = VIEW_HEIGHT - 200 + fromBottom * 0.5;
    if (this.moon) this.moon.setPosition(this.moonBase.x - scrollX * 0.02, this.moonBase.y + fromBottom * 0.03);
  }
}
