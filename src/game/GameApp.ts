import Phaser from 'phaser';
import { Hud } from '../ui/Hud';
import { enableArrowNav, h } from '../ui/dom';
import { ABILITY_INFO, completeScreen, levelSelectScreen, pauseScreen, settingsScreen, titleScreen } from '../ui/screens';
import { createPhaserGame } from './createGame';
import { getBuiltinLevels, loadBuiltinLevels, type BuiltinLevelEntry } from './levels/registry';
import { getWorld } from './levels/worlds';
import type { CompletionInfo, GameHost, HudState } from './scenes/GameHost';
import type { GameScene } from './scenes/GameScene';
import { Audio } from './systems/AudioSystem';
import { devUnlockAll, getRecord, isUnlocked, loadProgress, recordCompletion, resetProgress, saveProgress, type ProgressData } from './systems/SaveSystem';

/**
 * Main game page controller: owns the Phaser game and swaps HTML screens
 * (title, level select, settings, HUD, pause, results).
 */
export class GameApp {
  private game: Phaser.Game;
  private frame: HTMLElement;
  private screen: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private hud: Hud | null = null;
  private progress: ProgressData = loadProgress();
  private readonly unlockAll = devUnlockAll();
  private current: BuiltinLevelEntry | null = null;
  private lastWorld: string | undefined;

  constructor(root: HTMLElement) {
    const gameRoot = h('div', { id: 'game-root' });
    this.frame = h('div', { class: 'ui-frame' });
    const uiRoot = h('div', { id: 'ui-root' }, this.frame);
    root.append(gameRoot, uiRoot);
    this.game = createPhaserGame(gameRoot);
    enableArrowNav(this.frame);
    this.game.events.once('boot-complete', () => this.onBoot());
  }

  private async onBoot(): Promise<void> {
    const { problems } = await loadBuiltinLevels();
    if (problems.length) console.warn('Some built-in levels failed to load', problems);
    if (getBuiltinLevels().length === 0) {
      this.setScreen(
        h(
          'div',
          { class: 'screen card-screen' },
          h('div', { class: 'screen-panel' }, h('h2', { class: 'screen-title' }, 'No levels found'), h('pre', { class: 'error-box' }, problems.map((p) => `${p.path}: ${p.message}`).join('\n'))),
        ),
      );
      return;
    }
    const q = new URLSearchParams(location.search);
    const direct = q.get('level');
    const entry = direct ? getBuiltinLevels().find((e) => e.level.id === direct || String(e.level.number) === direct) : undefined;
    if (entry) this.playLevel(entry);
    else this.showTitle();
  }

  // ───────────────────────── screens

  private setScreen(el: HTMLElement | null): void {
    this.screen?.remove();
    this.screen = el;
    if (el) {
      this.frame.append(el);
      requestAnimationFrame(() => (el.querySelector('button, a.menu-btn') as HTMLElement | null)?.focus());
    }
  }

  private setOverlay(el: HTMLElement | null): void {
    this.overlay?.remove();
    this.overlay = el;
    if (el) {
      this.frame.append(el);
      requestAnimationFrame(() => (el.querySelector('button') as HTMLElement | null)?.focus());
    }
  }

  private startMenuBackdrop(world = 'old-town'): void {
    const sm = this.game.scene;
    if (sm.isActive('Game')) sm.stop('Game');
    this.clearHud();
    if (!sm.isActive('Menu')) sm.start('Menu', { world });
    Audio.startMusic('old-town');
  }

  private clearHud(): void {
    this.hud?.el.remove();
    this.hud = null;
    this.setOverlay(null);
  }

  showTitle(): void {
    this.startMenuBackdrop();
    const levels = getBuiltinLevels();
    const next = this.nextLevel();
    const started = levels.some((e) => getRecord(this.progress, e.level.id).completed);
    this.setScreen(
      titleScreen({
        playLabel: started ? 'Continue' : 'Play',
        play: () => next && this.playLevel(next),
        levelSelect: () => this.showLevelSelect(),
        settings: () => this.showSettings(() => this.showTitle()),
      }),
    );
  }

  private nextLevel(): BuiltinLevelEntry | undefined {
    const levels = getBuiltinLevels();
    const ids = levels.map((e) => e.level.id);
    return (
      levels.find((e) => isUnlocked(this.progress, ids, e.index, this.unlockAll) && !getRecord(this.progress, e.level.id).completed) ??
      levels[0]
    );
  }

  showLevelSelect(): void {
    this.startMenuBackdrop();
    this.setScreen(
      levelSelectScreen({
        levels: getBuiltinLevels(),
        progress: this.progress,
        unlockAll: this.unlockAll,
        initialWorld: this.lastWorld,
        onPlay: (e) => this.playLevel(e),
        onBack: () => this.showTitle(),
      }),
    );
  }

  private showSettings(back: () => void, inGame = false): void {
    const el = settingsScreen(back, inGame ? undefined : () => {
      this.progress = resetProgress();
      this.showTitle();
    });
    if (inGame) this.setOverlay(el);
    else this.setScreen(el);
  }

  // ───────────────────────── gameplay

  private get scene(): GameScene {
    return this.game.scene.getScene('Game') as GameScene;
  }

  playLevel(entry: BuiltinLevelEntry): void {
    this.current = entry;
    this.lastWorld = entry.level.world;
    this.setScreen(null);
    this.clearHud();
    const sm = this.game.scene;
    if (sm.isActive('Menu')) sm.stop('Menu');
    const lvl = entry.level;
    const world = getWorld(lvl.world);
    const label = `${world.index}-${lvl.order}`;
    this.hud = new Hud(lvl.name, label, () => this.pause());
    this.frame.append(this.hud.el);

    const host: GameHost = {
      onHud: (s: HudState) => this.hud?.update(s),
      onPauseRequest: () => this.pause(),
      onComplete: (info) => this.complete(entry, info),
      onReady: () => this.introBanner(entry),
    };
    if (sm.isActive('Game') || sm.isPaused('Game')) sm.stop('Game');
    sm.start('Game', { level: lvl, host });
  }

  private introBanner(entry: BuiltinLevelEntry): void {
    const lvl = entry.level;
    const world = getWorld(lvl.world);
    const newAbility = (Object.keys(ABILITY_INFO) as (keyof typeof lvl.abilities)[]).find(
      (k) => lvl.abilities[k] && !this.progress.seenAbilities.includes(k),
    );
    this.hud?.banner(`${world.name} · ${world.index}-${lvl.order}`, lvl.name);
    if (newAbility) {
      this.progress.seenAbilities.push(newAbility);
      saveProgress(this.progress);
      const [name, text] = ABILITY_INFO[newAbility];
      setTimeout(() => this.hud?.banner('New ability', name, text, 5200), 3300);
    }
  }

  private pause(): void {
    if (!this.current || this.overlay) return;
    this.scene.setPaused(true);
    this.setOverlay(
      pauseScreen({
        resume: () => this.resume(),
        restart: () => this.current && this.playLevel(this.current),
        settings: () => this.showSettings(() => this.pauseMenuAgain(), true),
        levelSelect: () => this.showLevelSelect(),
        menu: () => this.showTitle(),
      }),
    );
    const onEsc = (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && this.overlay) {
        window.removeEventListener('keydown', onEsc);
        this.resume();
      }
    };
    setTimeout(() => window.addEventListener('keydown', onEsc), 50);
  }

  private pauseMenuAgain(): void {
    this.setOverlay(null);
    this.pause();
  }

  private resume(): void {
    this.setOverlay(null);
    this.scene.setPaused(false);
  }

  private complete(entry: BuiltinLevelEntry, info: CompletionInfo): void {
    const result = recordCompletion(this.progress, entry.level.id, info.time, info.relics, info.deaths);
    const levels = getBuiltinLevels();
    const next = levels[entry.index + 1];
    const world = getWorld(entry.level.world);
    this.setOverlay(
      completeScreen(
        {
          levelLabel: `${world.index}-${entry.level.order} · ${entry.level.name}`,
          result,
          time: info.time,
          deaths: info.deaths,
          relics: info.relics.length,
          relicTotal: info.relicTotal,
          hasNext: !!next,
        },
        {
          retry: () => this.playLevel(entry),
          next: next ? () => this.playLevel(next) : undefined,
          levelSelect: () => this.showLevelSelect(),
        },
      ),
    );
  }
}
