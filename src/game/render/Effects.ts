import Phaser from 'phaser';
import { DEPTH } from './views';

/** Particle bursts, flashes and camera shake. */
export class Effects {
  private dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private debris: Phaser.GameObjects.Particles.ParticleEmitter;
  private souls: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private scene: Phaser.Scene,
    private shakeEnabled: () => boolean,
    private reducedMotion: () => boolean,
  ) {
    const base = { emitting: false, blendMode: Phaser.BlendModes.NORMAL };
    this.dust = scene.add
      .particles(0, 0, 'dot', { ...base, lifespan: 380, speed: { min: 20, max: 70 }, angle: { min: 200, max: 340 }, scale: { start: 0.45, end: 0 }, alpha: { start: 0.5, end: 0 }, tint: 0x9a93a8, gravityY: -40 })
      .setDepth(DEPTH.particles);
    this.sparks = scene.add
      .particles(0, 0, 'dot', { ...base, blendMode: Phaser.BlendModes.ADD, lifespan: 600, speed: { min: 40, max: 180 }, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xe8913a, 0xe8c86a, 0xfff0c0], gravityY: 200 })
      .setDepth(DEPTH.particles);
    this.debris = scene.add
      .particles(0, 0, 'dot', { ...base, lifespan: 800, speed: { min: 60, max: 200 }, angle: { min: 200, max: 340 }, scale: { start: 0.7, end: 0.3 }, alpha: { start: 1, end: 0 }, tint: [0x6a6358, 0x524c43, 0x3a352f], gravityY: 900 })
      .setDepth(DEPTH.particles);
    this.souls = scene.add
      .particles(0, 0, 'dot', { ...base, blendMode: Phaser.BlendModes.ADD, lifespan: 900, speed: { min: 30, max: 140 }, scale: { start: 0.6, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xc9b8ff, 0xe8913a], gravityY: -60 })
      .setDepth(DEPTH.particles);
  }

  /** Slow drifting motes (embers / spores / dust) for atmosphere. */
  startAmbient(color: number, worldWidth: number, worldHeight: number): void {
    if (this.reducedMotion()) return;
    this.scene.add
      .particles(0, 0, 'dot', {
        x: { min: 0, max: worldWidth },
        y: { min: 0, max: worldHeight },
        lifespan: 6000,
        speedX: { min: -8, max: 8 },
        speedY: { min: -14, max: -4 },
        scale: { start: 0.25, end: 0 },
        alpha: { start: 0.5, end: 0 },
        tint: color,
        frequency: Math.max(20, 400000 / (worldWidth * worldHeight / 1000)),
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.decoBack);
  }

  dustAt(x: number, y: number, n = 6): void {
    this.dust.explode(n, x, y);
  }
  sparksAt(x: number, y: number, n = 14): void {
    this.sparks.explode(n, x, y);
  }
  debrisAt(x: number, y: number, n = 16): void {
    this.debris.explode(n, x, y);
  }
  soulsAt(x: number, y: number, n = 24): void {
    this.souls.explode(n, x, y);
  }

  shake(duration: number, intensity: number): void {
    if (!this.shakeEnabled() || this.reducedMotion()) return;
    this.scene.cameras.main.shake(duration, intensity);
  }

  flash(color = 0xffffff, duration = 120): void {
    if (this.reducedMotion()) return;
    const c = Phaser.Display.Color.IntegerToRGB(color);
    this.scene.cameras.main.flash(duration, c.r, c.g, c.b);
  }
}
