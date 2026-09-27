import { GAME_TITLE } from '../game/config/game';
import type { BuiltinLevelEntry } from '../game/levels/registry';
import { WORLDS, type WorldInfo } from '../game/levels/worlds';
import { Audio } from '../game/systems/AudioSystem';
import { formatTime, getRecord, isUnlocked, type CompletionResult, type ProgressData } from '../game/systems/SaveSystem';
import { loadSettings, updateSettings, type GameSettings } from '../game/systems/Settings';
import { confirmModal, h } from './dom';

const LOCK_SVG =
  '<svg viewBox="0 0 16 16" class="lock-icon"><path d="M4 7V5a4 4 0 0 1 8 0v2" stroke="#9d97a8" stroke-width="1.6" fill="none"/><rect x="3" y="7" width="10" height="8" rx="1" fill="#9d97a8"/></svg>';

function menuButton(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
  return h(
    'button',
    {
      class: `menu-btn ${cls}`,
      onclick: () => {
        Audio.playSfx('uiConfirm');
        onClick();
      },
      onmouseenter: () => Audio.playSfx('ui'),
    },
    label,
  );
}

// ─────────────────────────────────────────── title

export interface TitleActions {
  play(): void;
  levelSelect(): void;
  settings(): void;
  playLabel: string;
}

export function titleScreen(a: TitleActions): HTMLElement {
  return h(
    'div',
    { class: 'screen' },
    h('h1', { class: 'title-logo' }, GAME_TITLE),
    h('div', { class: 'title-sub' }, 'A lantern against the dark'),
    h(
      'div',
      { class: 'menu-list' },
      menuButton(a.playLabel, a.play),
      menuButton('Level Select', a.levelSelect),
      h('a', { class: 'menu-btn', href: './editor/', onmouseenter: () => Audio.playSfx('ui') }, 'Level Editor'),
      menuButton('Settings', a.settings),
    ),
    h('div', { class: 'title-footer' }, 'Arrow keys / WASD to move · Space to jump · Esc to pause'),
  );
}

// ─────────────────────────────────────────── level select

export interface LevelSelectOptions {
  levels: BuiltinLevelEntry[];
  progress: ProgressData;
  unlockAll: boolean;
  initialWorld?: string;
  onPlay(entry: BuiltinLevelEntry): void;
  onBack(): void;
}

export function levelSelectScreen(o: LevelSelectOptions): HTMLElement {
  const ids = o.levels.map((l) => l.level.id);
  const unlocked = (e: BuiltinLevelEntry) => isUnlocked(o.progress, ids, e.index, o.unlockAll);
  const completedCount = o.levels.filter((e) => getRecord(o.progress, e.level.id).completed).length;
  const relicTotal = o.levels.reduce((n, e) => n + e.level.objects.filter((x) => x.type === 'relic').length, 0);
  const relicFound = o.levels.reduce((n, e) => n + getRecord(o.progress, e.level.id).relics.length, 0);

  const worlds = WORLDS.map((w) => ({ w, levels: o.levels.filter((e) => e.level.world === w.id) })).filter((g) => g.levels.length > 0);
  // default: world of the first not-completed unlocked level
  const firstOpen = o.levels.find((e) => unlocked(e) && !getRecord(o.progress, e.level.id).completed) ?? o.levels[0];
  let current = worlds.find((g) => g.w.id === o.initialWorld) ?? worlds.find((g) => g.w.id === firstOpen?.level.world) ?? worlds[0];

  const levelsPane = h('div', { class: 'ls-levels' });
  const tabs = h('div', { class: 'ls-worlds' });

  const renderWorld = (g: { w: WorldInfo; levels: BuiltinLevelEntry[] }) => {
    current = g;
    for (const t of Array.from(tabs.children)) t.classList.toggle('active', (t as HTMLElement).dataset.world === g.w.id);
    levelsPane.replaceChildren(
      h('h2', { class: 'ls-world-name', style: `color:${g.w.accent}` }, g.w.name),
      h('p', { class: 'ls-world-sub' }, g.w.subtitle),
      h(
        'div',
        { class: 'ls-grid' },
        g.levels.map((e) => {
          const rec = getRecord(o.progress, e.level.id);
          const open = unlocked(e);
          const relics = e.level.objects.filter((x) => x.type === 'relic').length;
          const card = h(
            'button',
            {
              class: `lvl-card ${open ? '' : 'locked'}`,
              disabled: false,
              onclick: () => {
                if (!open) return;
                Audio.playSfx('uiConfirm');
                o.onPlay(e);
              },
              onmouseenter: () => open && Audio.playSfx('ui'),
            },
            h('div', { class: 'num' }, String(e.level.number ?? e.index + 1)),
            h('div', { class: 'name' }, open ? e.level.name : '???'),
            h('div', { class: 'meta' }, rec.bestTime !== null ? `Best ${formatTime(rec.bestTime)}` : open ? 'Not completed' : 'Locked'),
            h(
              'div',
              { class: 'badges' },
              rec.completed ? h('span', { class: 'badge done' }, 'CLEAR') : null,
              relics > 0 && rec.relics.length > 0 ? h('span', { class: 'badge relic' }, `◆ ${rec.relics.length}/${relics}`) : null,
            ),
          );
          if (!open) card.insertAdjacentHTML('beforeend', LOCK_SVG);
          return card;
        }),
      ),
    );
  };

  for (const g of worlds) {
    const anyOpen = g.levels.some(unlocked);
    const done = g.levels.filter((e) => getRecord(o.progress, e.level.id).completed).length;
    const tab = h(
      'button',
      {
        class: `ls-world-tab ${anyOpen ? '' : 'locked'}`,
        'data-world': g.w.id,
        onclick: () => {
          Audio.playSfx('ui');
          renderWorld(g);
        },
      },
      h('span', { class: 'n' }, `WORLD ${g.w.index} · ${done}/${g.levels.length}`),
      h('span', { class: 't' }, g.w.name),
    );
    tabs.append(tab);
  }
  renderWorld(current);

  return h(
    'div',
    { class: 'screen card-screen' },
    h(
      'div',
      { class: 'ls-wrap' },
      h(
        'div',
        { class: 'ls-header' },
        h('h2', { class: 'screen-title' }, 'Level Select'),
        h('div', { class: 'ls-stats' }, `${completedCount}/${o.levels.length} cleared · ◆ ${relicFound}/${relicTotal} relics`),
      ),
      h('div', { class: 'ls-body' }, tabs, levelsPane),
      h(
        'div',
        { class: 'ls-footer' },
        menuButton('Back', o.onBack, 'small'),
        h('span', { class: 'hint' }, o.unlockAll ? 'Developer mode: all levels unlocked' : 'Complete a level to unlock the next'),
      ),
    ),
  );
}

// ─────────────────────────────────────────── settings

export function settingsScreen(onBack: () => void, onResetProgress?: () => void): HTMLElement {
  const s = loadSettings();
  const slider = (key: 'masterVolume' | 'musicVolume' | 'sfxVolume', label: string) => {
    const val = h('span', { class: 'val' }, `${Math.round(s[key] * 100)}`);
    const input = h('input', {
      type: 'range',
      min: 0,
      max: 100,
      value: Math.round(s[key] * 100),
      oninput: (ev: Event) => {
        const v = Number((ev.target as HTMLInputElement).value) / 100;
        val.textContent = String(Math.round(v * 100));
        updateSettings({ [key]: v } as Partial<GameSettings>);
      },
      onchange: () => Audio.playSfx('ui'),
    });
    return [h('label', {}, label), input, val];
  };
  const toggle = (key: 'screenshake' | 'reducedMotion' | 'showTimer' | 'sharpRendering', label: string, note = '') => {
    const input = h('input', {
      type: 'checkbox',
      checked: s[key],
      onchange: (ev: Event) => updateSettings({ [key]: (ev.target as HTMLInputElement).checked } as Partial<GameSettings>),
    });
    return [h('label', {}, label), h('div', {}, input, note ? h('span', { class: 'hint', style: 'margin-left:0.6em' }, note) : null), h('span')];
  };
  const controlsSelect = () => {
    const sel = h(
      'select',
      { class: 'settings-select' },
      (
        [
          ['auto', 'Auto (touch screens)'],
          ['on', 'Always show'],
          ['off', 'Hide'],
        ] as const
      ).map(([v, t]) => h('option', { value: v, selected: s.onScreenControls === v }, t)),
    );
    sel.addEventListener('change', () => updateSettings({ onScreenControls: sel.value as GameSettings['onScreenControls'] }));
    return [h('label', {}, 'On-screen controls'), sel, h('span')];
  };
  return h(
    'div',
    { class: 'screen card-screen' },
    h(
      'div',
      { class: 'screen-panel' },
      h('h2', { class: 'screen-title' }, 'Settings'),
      h(
        'div',
        { class: 'settings-grid' },
        slider('masterVolume', 'Master volume'),
        slider('musicVolume', 'Music volume'),
        slider('sfxVolume', 'Effects volume'),
        toggle('screenshake', 'Screen shake'),
        toggle('reducedMotion', 'Reduced motion'),
        toggle('showTimer', 'Show timer'),
        toggle('sharpRendering', 'Sharp rendering', 'turn off if the game runs slowly (reload to apply)'),
        controlsSelect(),
      ),
      h(
        'div',
        { class: 'controls-table' },
        h('b', {}, 'Move'),
        h('span', {}, h('kbd', {}, '←'), ' ', h('kbd', {}, '→'), '  or  ', h('kbd', {}, 'A'), ' ', h('kbd', {}, 'D')),
        h('b', {}, 'Jump'),
        h('span', {}, h('kbd', {}, 'Space'), ' ', h('kbd', {}, 'Z'), ' ', h('kbd', {}, 'W'), ' ', h('kbd', {}, '↑'), '  (hold for higher)'),
        h('b', {}, 'Dash'),
        h('span', {}, h('kbd', {}, 'Shift'), ' ', h('kbd', {}, 'X'), ' ', h('kbd', {}, 'J')),
        h('b', {}, 'Crouch / drop'),
        h('span', {}, h('kbd', {}, '↓'), ' ', h('kbd', {}, 'S'), '  —  ', h('kbd', {}, '↓'), ' + ', h('kbd', {}, 'Space'), ' drops through thin platforms'),
        h('b', {}, 'Wall jump'),
        h('span', {}, 'Hold toward a wall to slide, then jump'),
        h('b', {}, 'Pause / Restart'),
        h('span', {}, h('kbd', {}, 'Esc'), ' ', h('kbd', {}, 'P'), '  /  ', h('kbd', {}, 'R')),
        h('b', {}, 'Touch'),
        h('span', {}, 'On-screen pad: ◀ ▶ move · ▼ crouch/drop · JUMP · DASH (when unlocked)'),
        h('b', {}, 'Gamepad'),
        h('span', {}, 'Stick/D-pad move · A jump · X/B/RB dash · Start pause'),
      ),
      h(
        'div',
        { class: 'row-actions' },
        menuButton('Back', onBack, 'small'),
        onResetProgress
          ? menuButton(
              'Reset progress',
              () => confirmModal('Reset progress?', 'This erases cleared levels, best times and relics saved in this browser.', 'Reset', onResetProgress),
              'small',
            )
          : null,
      ),
    ),
  );
}

// ─────────────────────────────────────────── pause & complete

export function pauseScreen(a: { resume(): void; restart(): void; settings?(): void; levelSelect?(): void; menu?(): void; exitLabel?: string; exit?(): void }): HTMLElement {
  return h(
    'div',
    { class: 'screen card-screen' },
    h(
      'div',
      { class: 'screen-panel', style: 'min-width:20em;text-align:center' },
      h('h2', { class: 'screen-title' }, 'Paused'),
      h(
        'div',
        { class: 'menu-list' },
        menuButton('Resume', a.resume),
        menuButton('Restart level', a.restart),
        a.settings ? menuButton('Settings', a.settings) : null,
        a.levelSelect ? menuButton('Level select', a.levelSelect) : null,
        a.menu ? menuButton('Main menu', a.menu) : null,
        a.exit ? menuButton(a.exitLabel ?? 'Exit', a.exit) : null,
      ),
    ),
  );
}

export interface CompleteInfo {
  levelLabel: string;
  result: CompletionResult | null;
  time: number;
  deaths: number;
  relics: number;
  relicTotal: number;
  hasNext: boolean;
}

export function completeScreen(info: CompleteInfo, a: { retry(): void; next?(): void; levelSelect?(): void; exit?(): void; exitLabel?: string }): HTMLElement {
  const best = info.result?.best ?? null;
  return h(
    'div',
    { class: 'screen card-screen' },
    h(
      'div',
      { class: 'screen-panel', style: 'min-width:26em' },
      h('h2', { class: 'result-title' }, 'LEVEL COMPLETE'),
      h('div', { class: 'result-sub' }, info.levelLabel),
      h(
        'div',
        { class: 'result-rows' },
        h('span', { class: 'k' }, 'Time'),
        h('span', {}, formatTime(info.time), info.result?.newBest && info.result.previousBest !== null ? h('span', { class: 'new-best' }, 'NEW BEST') : null),
        info.result ? h('span', { class: 'k' }, 'Best') : null,
        info.result ? h('span', {}, formatTime(best)) : null,
        h('span', { class: 'k' }, 'Deaths'),
        h('span', {}, String(info.deaths)),
        info.relicTotal > 0 ? h('span', { class: 'k' }, 'Relics') : null,
        info.relicTotal > 0 ? h('span', { style: info.relics > 0 ? 'color:#bfe3ff' : '' }, `◆ ${info.relics}/${info.relicTotal}`) : null,
      ),
      h(
        'div',
        { class: 'result-actions' },
        menuButton('Retry', a.retry, 'small'),
        info.hasNext && a.next ? menuButton('Next level', a.next, 'small') : null,
        a.levelSelect ? menuButton('Level select', a.levelSelect, 'small') : null,
        a.exit ? menuButton(a.exitLabel ?? 'Exit', a.exit, 'small') : null,
      ),
    ),
  );
}
