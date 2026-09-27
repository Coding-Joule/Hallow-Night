import Phaser from 'phaser';
import { VIEW_WIDTH } from '../config/game';
import type { WorldId } from '../levels/worlds';
import { Background } from '../render/Background';
import { queueWorldTextures } from '../render/textures';
import { DEPTH } from '../render/views';
import { configureCamera } from '../render/camera';

/** Slowly drifting world backdrop behind the HTML menus. */
export class MenuScene extends Phaser.Scene {
  private bg!: Background;
  private worldId: WorldId = 'old-town';
  private t = 0;

  constructor() {
    super('Menu');
  }

  init(data: { world?: WorldId }): void {
    this.worldId = data.world ?? 'old-town';
  }

  preload(): void {
    queueWorldTextures(this.load, this.worldId);
  }

  create(): void {
    configureCamera(this.cameras.main);
    this.cameras.main.setBackgroundColor('#07060d');
    this.bg = new Background(this, this.worldId, 540);
    this.add.image(0, 0, 'vignette').setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.overlay);
    const embers = this.add.particles(0, 0, 'dot', {
      x: { min: 0, max: VIEW_WIDTH },
      y: 560,
      lifespan: 9000,
      speedY: { min: -40, max: -15 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: [0xe8913a, 0xe8c86a],
      frequency: 180,
      blendMode: Phaser.BlendModes.ADD,
    });
    embers.setScrollFactor(0).setDepth(DEPTH.particles);
    this.cameras.main.fadeIn(600, 7, 6, 13);
  }

  update(_time: number, delta: number): void {
    this.t += delta / 1000;
    this.bg.update(this.t * 30, 0, this.t);
  }
}
