import type Phaser from 'phaser';
import { createPhaserGame } from '../game/createGame';
import type { LevelData } from '../game/levels/schema';
import type { GameHost } from '../game/scenes/GameHost';
import type { GameScene } from '../game/scenes/GameScene';
import { Audio } from '../game/systems/AudioSystem';
import { formatTime } from '../game/systems/SaveSystem';
import { Hud } from '../ui/Hud';
import { h } from '../ui/dom';

/**
 * Runs a level in the REAL game engine (same GameScene + World as the
 * campaign) inside an overlay. The editor state is untouched; closing the
 * overlay returns straight to it.
 */
export class Playtest {
  private overlay: HTMLElement;
  private game: Phaser.Game;
  private result: HTMLElement | null = null;
  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  };

  constructor(
    private level: LevelData,
    private onClose: () => void,
  ) {
    const gameRoot = h('div', { class: 'pt-game' });
    const frame = h('div', { class: 'ui-frame' });
    const hud = new Hud(level.name, 'PLAYTEST', () => this.close());
    frame.append(hud.el);
    const bar = h(
      'div',
      { class: 'pt-bar' },
      h('span', { class: 'pt-label' }, `Playtesting “${level.name}”`),
      h('button', { class: 'btn small', onclick: () => this.restart() }, 'Restart (R)'),
      h('button', { class: 'btn small primary', onclick: () => this.close() }, '← Back to editor (Esc)'),
    );
    this.overlay = h('div', { class: 'pt-overlay' }, gameRoot, h('div', { class: 'pt-ui' }, frame), bar);
    document.body.append(this.overlay);
    window.addEventListener('keydown', this.onKey, true);
    Audio.unlock();

    const host: GameHost = {
      onHud: (s) => hud.update(s),
      onPauseRequest: () => this.close(),
      onComplete: (info) => this.showResult(frame, info.time, info.deaths),
    };
    this.game = createPhaserGame(gameRoot);
    this.game.events.once('boot-complete', () => {
      this.game.scene.start('Game', { level: this.level, host });
    });
  }

  private get scene(): GameScene {
    return this.game.scene.getScene('Game') as GameScene;
  }

  private restart(): void {
    this.result?.remove();
    this.result = null;
    this.scene?.restartLevel();
  }

  private showResult(frame: HTMLElement, time: number, deaths: number): void {
    this.result = h(
      'div',
      { class: 'screen card-screen' },
      h(
        'div',
        { class: 'screen-panel', style: 'text-align:center;min-width:22em' },
        h('h2', { class: 'result-title' }, 'LEVEL COMPLETE'),
        h('div', { class: 'result-sub' }, `Time ${formatTime(time)} · Deaths ${deaths}`),
        h(
          'div',
          { class: 'result-actions' },
          h('button', { class: 'menu-btn small', onclick: () => this.restart() }, 'Retry'),
          h('button', { class: 'menu-btn small', onclick: () => this.close() }, 'Back to editor'),
        ),
      ),
    );
    frame.append(this.result);
  }

  close(): void {
    window.removeEventListener('keydown', this.onKey, true);
    Audio.stopMusic();
    this.game.destroy(true);
    this.overlay.remove();
    this.onClose();
  }
}
