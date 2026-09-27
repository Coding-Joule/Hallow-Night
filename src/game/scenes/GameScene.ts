import Phaser from 'phaser';
import { FIXED_STEP } from '../config/physics';
import { RESPAWN_DELAY } from '../config/game';
import type { LevelData } from '../levels/schema';
import { LevelRenderer } from '../render/LevelRenderer';
import { WorldText } from '../render/WorldText';
import { World } from '../sim/World';
import type { WorldEvent } from '../sim/types';
import { Audio, type SfxName } from '../systems/AudioSystem';
import { InputSystem } from '../systems/InputSystem';
import { loadSettings } from '../systems/Settings';
import type { GameHost } from './GameHost';
import { configureCamera } from '../render/camera';

export interface GameSceneData {
  level: LevelData;
  host: GameHost;
}

const EVENT_SFX: Partial<Record<WorldEvent['type'], SfxName>> = {
  jump: 'jump',
  doubleJump: 'doubleJump',
  wallJump: 'wallJump',
  land: 'land',
  dash: 'dash',
  death: 'death',
  checkpoint: 'checkpoint',
  key: 'key',
  relic: 'relic',
  switch: 'switch',
  stomp: 'stomp',
  spring: 'spring',
  break: 'break',
  door: 'door',
  gate: 'gate',
  crumble: 'crumble',
  goal: 'goal',
  shadow: 'shadow',
};

/**
 * Plays any LevelData — built-in levels, user levels and editor playtests
 * all go through this exact scene and the same World simulation.
 */
export class GameScene extends Phaser.Scene {
  private world!: World;
  private levelView!: LevelRenderer;
  private worldText!: WorldText;
  private inputSys!: InputSystem;
  private host!: GameHost;
  private level!: LevelData;
  private accumulator = 0;
  private respawnTimer = 0;
  private finishTimer = -1;
  private hudTimer = 0;
  private paused = false;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    this.level = data.level;
    this.host = data.host;
    this.accumulator = 0;
    this.respawnTimer = 0;
    this.finishTimer = -1;
    this.paused = false;
  }

  preload(): void {
    this.world = new World(this.level);
    LevelRenderer.preload(this, this.world);
  }

  create(): void {
    configureCamera(this.cameras.main);
    const settings = () => loadSettings();
    this.levelView = new LevelRenderer(this, this.world, {
      screenshake: () => settings().screenshake,
      reducedMotion: () => settings().reducedMotion,
    });
    this.worldText = new WorldText(this, this.world, this.host.tutorials ?? null);
    this.inputSys = new InputSystem(this);
    this.cameras.main.fadeIn(350, 7, 6, 13);
    Audio.startMusic(this.level.music);
    this.emitHud();
    this.host.onReady?.();
    if (import.meta.env.DEV) (window as unknown as { __hallow: unknown }).__hallow = { world: this.world, scene: this };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.removeAllKeys(true);
    });
  }

  /** Called by the host UI. */
  setPaused(p: boolean): void {
    this.paused = p;
    if (!p) this.inputSys.resetEdges();
  }

  restartLevel(): void {
    this.scene.restart({ level: this.level, host: this.host });
  }

  get simulation(): World {
    return this.world;
  }

  update(_time: number, deltaMs: number): void {
    if (this.paused) return;
    const dt = Math.min(0.05, deltaMs / 1000);
    const input = this.inputSys.read();
    if (input.pausePressed) {
      this.host.onPauseRequest();
      return;
    }
    if (input.restartPressed && !this.world.finished) {
      if (!this.world.player.dead) this.world.kill('restart');
    }

    this.accumulator += dt;
    let first = true;
    while (this.accumulator >= FIXED_STEP) {
      this.world.step(FIXED_STEP, {
        ...input,
        jumpPressed: first && input.jumpPressed,
        dashPressed: first && input.dashPressed,
      });
      first = false;
      this.accumulator -= FIXED_STEP;
    }

    for (const e of this.world.drainEvents()) this.handleEvent(e);

    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.world.respawn();
        this.levelView.snapCamera();
        this.cameras.main.fadeIn(220, 7, 6, 13);
      }
    }
    if (this.finishTimer >= 0) {
      this.finishTimer -= dt;
      if (this.finishTimer < 0) {
        this.host.onComplete({
          time: this.world.elapsed,
          deaths: this.world.deaths,
          relics: [...this.world.relicsFound],
          relicTotal: this.world.relicTotal,
        });
        this.paused = true;
      }
    }

    this.levelView.update(dt, this.world.time);
    this.worldText.update(dt);
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 1 / 20;
      this.emitHud();
    }
  }

  private emitHud(): void {
    const w = this.world;
    this.host.onHud({
      time: w.elapsed,
      deaths: w.deaths,
      keys: [...w.keys],
      relicsFound: w.relicsFound.size,
      relicTotal: w.relicTotal,
      sign: w.activeSign?.text ?? null,
      abilities: w.level.abilities,
    });
  }

  private handleEvent(e: WorldEvent): void {
    const sfx = EVENT_SFX[e.type];
    if (sfx) Audio.playSfx(sfx);
    const fx = this.levelView.effects;
    switch (e.type) {
      case 'land':
        fx.dustAt(e.x, e.y, 5);
        break;
      case 'jump':
        fx.dustAt(e.x, e.y, 4);
        break;
      case 'doubleJump':
        fx.soulsAt(e.x, e.y, 10);
        break;
      case 'wallJump':
        fx.dustAt(e.x, e.y, 6);
        break;
      case 'dash':
        fx.dustAt(e.x, e.y + 10, 6);
        break;
      case 'death':
        fx.soulsAt(e.x, e.y, 30);
        fx.shake(180, 0.006);
        this.respawnTimer = RESPAWN_DELAY;
        this.time.delayedCall(RESPAWN_DELAY * 450, () => this.cameras.main.fadeOut(180, 7, 6, 13));
        break;
      case 'checkpoint':
        fx.sparksAt(e.x, e.y, 20);
        break;
      case 'key':
      case 'relic':
        fx.sparksAt(e.x, e.y, 18);
        break;
      case 'stomp':
        fx.debrisAt(e.x, e.y, 10);
        fx.shake(80, 0.003);
        break;
      case 'break':
        fx.debrisAt(e.x, e.y, 22);
        fx.shake(120, 0.005);
        break;
      case 'goal':
        fx.soulsAt(e.x, e.y - 30, 40);
        fx.flash(0x3a2a5a, 300);
        this.finishTimer = 1.0;
        break;
      case 'door':
      case 'gate':
        fx.shake(100, 0.002);
        break;
      default:
        break;
    }
    this.host.onWorldEvent?.(e);
  }
}
