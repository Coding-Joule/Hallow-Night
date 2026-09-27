import type { LevelData, LevelObject } from '../game/levels/schema';
import { parseLevel } from '../game/levels/validate';
import { h, modal } from '../ui/dom';
import { EditorCanvas } from './canvas/EditorCanvas';
import { EditorState, GOAL_ID, SPAWN_ID } from './EditorState';
import { Inspector } from './panels/Inspector';
import { Palette } from './panels/Palette';
import { Playtest } from './Playtest';

/**
 * Layout + behaviour shared by the public editor and the built-in creator:
 * palette | canvas | inspector, a status bar, shortcuts and playtesting.
 */
export class EditorShell {
  readonly state: EditorState;
  readonly canvas: EditorCanvas;
  readonly root: HTMLElement;
  readonly top: HTMLElement;
  private statusPos: HTMLElement;
  private statusZoom: HTMLElement;
  private statusSel: HTMLElement;
  private clipboard: LevelObject[] = [];
  private playtest: Playtest | null = null;
  onSaveShortcut: () => void = () => undefined;

  constructor(host: HTMLElement, level: LevelData, opts: { mode: 'public' | 'creator'; showLevelSettings: boolean }) {
    this.state = new EditorState(level);
    this.top = h('header', { class: 'ed-top' });
    const canvasWrap = h('div', { class: 'ed-canvas-wrap' });
    this.root = h('div', { class: `ed-app mode-${opts.mode}` }, this.top);
    const main = h('div', { class: 'ed-main' });
    this.root.append(main);
    host.append(this.root);
    this.canvas = new EditorCanvas(this.state, canvasWrap);
    const palette = new Palette(this.state, this.canvas);
    const inspector = new Inspector(this.state, { showLevelSettings: opts.showLevelSettings });
    main.append(palette.el, canvasWrap, inspector.el);

    // status bar
    const s = this.state;
    this.statusPos = h('span', { class: 'st-pos' });
    this.statusZoom = h('span', { class: 'st-zoom' });
    this.statusSel = h('span', { class: 'st-sel' });
    const gridToggle = h('input', { type: 'checkbox', checked: s.showGrid });
    gridToggle.addEventListener('change', () => {
      s.showGrid = gridToggle.checked;
      s.emit('view');
    });
    const snapToggle = h('input', { type: 'checkbox', checked: s.snap });
    snapToggle.addEventListener('change', () => {
      s.snap = snapToggle.checked;
      s.emit('view');
    });
    const gridSize = h('select', {}, [8, 16, 32, 64].map((g) => h('option', { value: String(g), selected: g === s.grid }, `${g}px`)));
    gridSize.addEventListener('change', () => {
      s.grid = Number(gridSize.value);
      s.emit('view');
    });
    const status = h(
      'footer',
      { class: 'ed-status' },
      h('button', { class: 'btn small', title: 'Zoom out (-)', onclick: () => this.canvas.zoomAt(1 / 1.25) }, '−'),
      this.statusZoom,
      h('button', { class: 'btn small', title: 'Zoom in (+)', onclick: () => this.canvas.zoomAt(1.25) }, '+'),
      h('button', { class: 'btn small', title: 'Fit level (F)', onclick: () => this.canvas.fitLevel() }, 'Fit'),
      h('span', { class: 'st-sep' }),
      h('label', { class: 'st-check' }, gridToggle, ' Grid'),
      gridSize,
      h('label', { class: 'st-check' }, snapToggle, ' Snap'),
      h('span', { class: 'st-sep' }),
      this.statusSel,
      h('span', { class: 'st-grow' }),
      this.statusPos,
    );
    this.root.append(status);
    s.on(() => this.updateStatus());
    this.updateStatus();
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  private updateStatus(): void {
    const s = this.state;
    this.statusZoom.textContent = `${Math.round(s.zoom * 100)}%`;
    this.statusPos.textContent = `x ${s.cursor.x}  y ${s.cursor.y}  ·  tile ${Math.floor(s.cursor.x / 32)}, ${Math.floor(s.cursor.y / 32)}`;
    const n = s.selection.size;
    this.statusSel.textContent = s.pickingTargetFor
      ? 'Click a target object…'
      : s.placing
        ? `Placing: ${s.placing} (Esc to cancel)`
        : n
          ? `${n} selected`
          : 'Nothing selected';
  }

  private onKey(e: KeyboardEvent): void {
    if (this.playtest) return;
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (document.querySelector('.modal-backdrop')) return;
    const s = this.state;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) s.redo();
      else s.undo();
    } else if (mod && key === 'y') {
      e.preventDefault();
      s.redo();
    } else if (mod && key === 'd') {
      e.preventDefault();
      s.duplicateSelection();
    } else if (mod && key === 'c') {
      this.clipboard = JSON.parse(JSON.stringify(s.selectedObjects()));
    } else if (mod && key === 'x') {
      this.clipboard = JSON.parse(JSON.stringify(s.selectedObjects()));
      s.deleteSelection();
    } else if (mod && key === 'v') {
      if (this.clipboard.length) {
        const minX = Math.min(...this.clipboard.map((o) => o.x));
        const minY = Math.min(...this.clipboard.map((o) => o.y));
        s.pasteObjects(this.clipboard, s.cursor.x - minX, s.cursor.y - minY);
      }
    } else if (mod && key === 's') {
      e.preventDefault();
      this.onSaveShortcut();
    } else if (mod && key === 'a') {
      e.preventDefault();
      s.select(s.level.objects.map((o) => o.id));
    } else if (key === 'delete' || key === 'backspace') {
      e.preventDefault();
      s.deleteSelection();
    } else if (key === 'escape') {
      if (s.placing || s.pickingTargetFor) {
        s.placing = null;
        s.pickingTargetFor = null;
        s.emit('tool');
      } else s.clearSelection();
    } else if (key === 'g' && !mod) {
      s.showGrid = !s.showGrid;
      s.emit('view');
    } else if ((key === '+' || key === '=') && !mod) {
      this.canvas.zoomAt(1.25);
    } else if (key === '-' && !mod) {
      this.canvas.zoomAt(1 / 1.25);
    } else if (key === 'f' && !mod) {
      this.canvas.fitLevel();
    } else if (key.startsWith('arrow') && s.selection.size) {
      e.preventDefault();
      const step = e.shiftKey ? 1 : s.grid;
      const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
      const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
      s.mutate((l) => {
        for (const id of s.selection) {
          if (id === SPAWN_ID) l.spawn = { x: l.spawn.x + dx, y: l.spawn.y + dy };
          else if (id === GOAL_ID) l.goal = { x: l.goal.x + dx, y: l.goal.y + dy };
          else {
            const o = l.objects.find((x) => x.id === id);
            if (o) {
              o.x += dx;
              o.y += dy;
            }
          }
        }
      });
    }
  }

  /** Validate (tolerantly) and launch the real game engine on the current level. */
  startPlaytest(): void {
    const res = parseLevel(JSON.parse(this.state.snapshot()));
    if (!res.level) {
      const errors = res.issues.filter((i) => i.severity === 'error');
      modal('Cannot playtest yet', h('ul', { class: 'issue-list' }, errors.map((e) => h('li', {}, e.message))), [{ label: 'OK', primary: true }]);
      return;
    }
    this.playtest = new Playtest(res.level, () => {
      this.playtest = null;
      this.canvas.el.focus();
    });
  }
}
