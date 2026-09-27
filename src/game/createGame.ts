import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config/game';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';

import { renderScale } from './render/camera';

export function createPhaserGame(parent: HTMLElement): Phaser.Game {
  const RENDER_SCALE = renderScale();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: VIEW_WIDTH * RENDER_SCALE,
    height: VIEW_HEIGHT * RENDER_SCALE,
    backgroundColor: '#07060d',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: { gamepad: true, keyboard: true },
    render: { antialias: true, pixelArt: false, roundPixels: false },
    audio: { noAudio: true }, // audio is handled by AudioSystem (Web Audio)
    scene: [BootScene, MenuScene, GameScene],
    banner: false,
    callbacks: {
      preBoot: (g) => g.registry.set('renderScale', RENDER_SCALE),
    },
  });
  return game;
}
