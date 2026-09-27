import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../config/game';
import { queueCoreTextures } from '../render/textures';

/** Loads every generated SVG texture, then hands over to `next`. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    queueCoreTextures(this.load);
  }

  create(): void {
    if (!this.textures.exists('vignette')) {
      const tex = this.textures.createCanvas('vignette', VIEW_WIDTH, VIEW_HEIGHT)!;
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_HEIGHT * 0.35, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH * 0.62);
      g.addColorStop(0, 'rgba(5,3,10,0)');
      g.addColorStop(1, 'rgba(5,3,10,0.75)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      tex.refresh();
    }
    this.game.events.emit('boot-complete');
  }
}
