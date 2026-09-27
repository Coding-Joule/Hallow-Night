import Phaser from 'phaser';
import type { Player } from '../sim/Player';
import { SPRITE_SCALE } from './textures';
import { DEPTH } from './views';

export class PlayerView {
  private img: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private trailTimer = 0;
  private runClock = 0;

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private reducedMotion: () => boolean,
  ) {
    this.img = scene.add.image(0, 0, 'player-idle0').setOrigin(0.5, 1).setScale(SPRITE_SCALE).setDepth(DEPTH.player);
    this.glow = scene.add
      .image(0, 0, 'glow')
      .setDepth(DEPTH.glow + 1)
      .setTint(0xf2a64a)
      .setAlpha(0.45)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(150 / 64);
  }

  get lanternX(): number {
    return this.img.x + this.player.facing * 9;
  }

  update(dt: number, time: number): void {
    const p = this.player;
    const x = p.x + p.w / 2;
    const y = p.y + p.h;
    this.img.setPosition(x, y + 0.5);
    this.img.setFlipX(p.facing < 0);
    this.img.setVisible(!p.dead);
    this.glow.setVisible(!p.dead);

    let key = 'player-idle0';
    switch (p.anim) {
      case 'idle':
        key = Math.floor(time * 1.6) % 2 === 0 ? 'player-idle0' : 'player-idle1';
        break;
      case 'run':
        this.runClock += dt * (Math.abs(p.vx) / 250) * 11;
        key = `player-run${Math.floor(this.runClock) % 4}`;
        break;
      case 'jump':
      case 'fall':
      case 'wall':
      case 'dash':
      case 'crouch':
        key = `player-${p.anim}`;
        break;
      default:
        break;
    }
    this.img.setTexture(key);

    // squash & stretch
    let sx = 1;
    let sy = 1;
    if (!this.reducedMotion()) {
      if (p.landImpact > 0) {
        const k = p.landImpact / 0.12;
        sx = 1 + 0.18 * k;
        sy = 1 - 0.16 * k;
      } else if (!p.grounded && p.vy < -300) {
        sx = 0.92;
        sy = 1.08;
      }
    }
    this.img.setScale(SPRITE_SCALE * sx, SPRITE_SCALE * sy);

    const flicker = 1 + Math.sin(time * 13) * 0.03 + Math.sin(time * 5.3) * 0.03;
    this.glow.setPosition(x + p.facing * 9, y - (p.crouching ? 10 : 16));
    this.glow.setScale((150 / 64) * flicker);

    // dash afterimages
    if (p.dashTime > 0 && !this.reducedMotion()) {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.025;
        const ghost = this.scene.add
          .image(x, y, key)
          .setOrigin(0.5, 1)
          .setScale(SPRITE_SCALE)
          .setFlipX(p.facing < 0)
          .setTint(0xc9b8ff)
          .setAlpha(0.5)
          .setDepth(DEPTH.player - 1);
        this.scene.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
      }
    }
  }
}
