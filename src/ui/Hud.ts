import type { HudState } from '../game/scenes/GameHost';
import { formatTime } from '../game/systems/SaveSystem';
import { loadSettings } from '../game/systems/Settings';
import { h } from './dom';

const KEY_COLORS: Record<string, string> = { gold: '#e3b44f', silver: '#c9ced9', bone: '#e2dac2' };

/** In-game HUD overlay (shared by the main game and editor playtests). */
export class Hud {
  readonly el: HTMLElement;
  private timeEl: HTMLElement;
  private deathsEl: HTMLElement;
  private keysEl: HTMLElement;
  private relicEl: HTMLElement;
  private signEl: HTMLElement;
  private timerChip: HTMLElement;
  private lastSign: string | null = null;
  private lastKeys = '';

  constructor(title: string, subtitle: string, onPause: () => void) {
    this.timeEl = h('span', {}, '00:00.000');
    this.deathsEl = h('span', {}, '0');
    this.keysEl = h('span', { class: 'hud-chip', style: 'display:none' });
    this.relicEl = h('span', { class: 'hud-chip', style: 'display:none' });
    this.timerChip = h('span', { class: 'hud-chip' }, this.timeEl);
    this.signEl = h('div', { class: 'hud-sign', style: 'display:none' });
    this.el = h(
      'div',
      { class: 'hud' },
      h(
        'div',
        { class: 'hud-top' },
        h('div', { class: 'hud-level' }, h('small', {}, subtitle), title),
        h(
          'div',
          { class: 'hud-right' },
          this.keysEl,
          this.relicEl,
          h('span', { class: 'hud-chip', title: 'Deaths' }, h('span', { class: 'dim' }, '✝'), this.deathsEl),
          this.timerChip,
          h('button', { class: 'hud-pause', onclick: onPause, title: 'Pause (Esc)' }, '❚❚'),
        ),
      ),
      this.signEl,
    );
  }

  update(s: HudState): void {
    this.timeEl.textContent = formatTime(s.time);
    this.timerChip.style.display = loadSettings().showTimer ? '' : 'none';
    this.deathsEl.textContent = String(s.deaths);
    const keys = s.keys.join(',');
    if (keys !== this.lastKeys) {
      this.lastKeys = keys;
      this.keysEl.replaceChildren(...s.keys.map((k) => h('span', { class: 'hud-key', title: `${k} key`, style: `background:${KEY_COLORS[k] ?? '#fff'}` })));
      this.keysEl.style.display = s.keys.length ? '' : 'none';
    }
    if (s.relicTotal > 0) {
      this.relicEl.style.display = '';
      this.relicEl.textContent = `◆ ${s.relicsFound}/${s.relicTotal}`;
      this.relicEl.style.color = s.relicsFound > 0 ? '#bfe3ff' : '';
    }
    if (s.sign !== this.lastSign) {
      this.lastSign = s.sign;
      this.signEl.style.display = s.sign ? '' : 'none';
      this.signEl.textContent = s.sign ?? '';
    }
  }

  banner(a: string, b: string, c = '', ms = 3300): void {
    const el = h('div', { class: 'hud-banner' }, h('div', { class: 'a' }, a), h('div', { class: 'b' }, b), c ? h('div', { class: 'c' }, c) : null);
    this.el.append(el);
    setTimeout(() => el.remove(), ms);
  }
}
