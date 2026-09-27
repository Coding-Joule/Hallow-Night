import { OBJECT_DEFS, type PropSpec } from '../../game/levels/objectTypes';
import type { LevelObject, Point, PropertyValue } from '../../game/levels/schema';
import { WORLDS, type WorldId } from '../../game/levels/worlds';
import { clear, h, toast } from '../../ui/dom';
import { GOAL_ID, SPAWN_ID, type EditorState } from '../EditorState';

/** Right panel: dynamic settings for the selection (or the level). */
export class Inspector {
  readonly el: HTMLElement;
  private body: HTMLElement;

  constructor(
    private state: EditorState,
    private opts: { showLevelSettings: boolean },
  ) {
    this.body = h('div', { class: 'insp-body' });
    this.el = h('div', { class: 'ed-inspector' }, h('div', { class: 'panel-title' }, 'Settings'), this.body);
    state.on((r) => {
      if (r !== 'view') this.render();
    });
    this.render();
  }

  private field(label: string, input: HTMLElement, help?: string): HTMLElement {
    return h('label', { class: 'insp-field', title: help ?? '' }, h('span', { class: 'insp-label' }, label), input);
  }

  private numberInput(value: number, onCommit: (v: number) => void, step = 1): HTMLInputElement {
    const i = h('input', { type: 'number', value: String(value), step: String(step) });
    i.addEventListener('change', () => {
      const v = Number(i.value);
      if (Number.isFinite(v)) onCommit(v);
    });
    return i;
  }

  render(): void {
    clear(this.body);
    const s = this.state;
    const ids = [...s.selection];
    if (ids.length === 0) return this.renderLevel();
    if (ids.length === 1 && (ids[0] === SPAWN_ID || ids[0] === GOAL_ID)) return this.renderMarker(ids[0]);
    const objs = s.selectedObjects();
    if (objs.length === 1 && ids.length === 1) return this.renderObject(objs[0]);
    this.body.append(
      h('div', { class: 'insp-type' }, `${ids.length} selected`),
      h('p', { class: 'insp-help' }, 'Drag to move together. Arrow keys nudge; Shift + arrows nudge by 1 px.'),
      this.actions(true),
    );
  }

  private renderLevel(): void {
    const s = this.state;
    const l = s.level;
    this.body.append(h('div', { class: 'insp-type' }, 'Level'));
    if (this.opts.showLevelSettings) {
      const name = h('input', { type: 'text', value: l.name });
      name.addEventListener('change', () => s.mutate((lv) => (lv.name = name.value.trim() || 'Untitled Level')));
      const theme = h(
        'select',
        {},
        WORLDS.map((w) => h('option', { value: w.id, selected: w.id === l.background }, w.name)),
      );
      theme.addEventListener('change', () =>
        s.mutate((lv) => {
          lv.background = theme.value as WorldId;
          lv.music = theme.value as WorldId;
          lv.world = theme.value as WorldId;
        }),
      );
      this.body.append(
        this.field('Name', name),
        this.field('Theme', theme, 'Sets the background, music and default terrain look.'),
        this.field('Width', this.numberInput(l.width, (v) => s.mutate((lv) => (lv.width = Math.max(320, Math.round(v)))), 32)),
        this.field('Height', this.numberInput(l.height, (v) => s.mutate((lv) => (lv.height = Math.max(320, Math.round(v)))), 32)),
      );
      const ab = h('div', { class: 'insp-checks' });
      for (const [key, label] of [
        ['wallJump', 'Wall jump'],
        ['dash', 'Dash'],
        ['doubleJump', 'Double jump'],
      ] as const) {
        const c = h('input', { type: 'checkbox', checked: l.abilities[key] });
        c.addEventListener('change', () => s.mutate((lv) => (lv.abilities[key] = c.checked)));
        ab.append(h('label', {}, c, ' ', label));
      }
      this.body.append(h('div', { class: 'insp-sub' }, 'Abilities'), ab);
    }
    this.body.append(
      h('div', { class: 'insp-sub' }, 'Markers'),
      h(
        'div',
        { class: 'insp-row' },
        h('button', { class: 'btn small', onclick: () => s.select([SPAWN_ID]) }, `Start (${l.spawn.x}, ${l.spawn.y})`),
        h('button', { class: 'btn small', onclick: () => s.select([GOAL_ID]) }, `Goal (${l.goal.x}, ${l.goal.y})`),
      ),
      h('div', { class: 'insp-sub' }, 'Stats'),
      h('p', { class: 'insp-help' }, `${l.objects.length} objects · ${l.width}×${l.height}px (${Math.round(l.width / 32)}×${Math.round(l.height / 32)} tiles)`),
      h(
        'p',
        { class: 'insp-help' },
        'Tips: wheel = zoom · right/middle-drag or Space+drag = pan · drag on empty space = box select · Ctrl+D duplicate · Del delete · Ctrl+Z / Ctrl+Shift+Z undo/redo.',
      ),
    );
  }

  private renderMarker(id: string): void {
    const s = this.state;
    const isSpawn = id === SPAWN_ID;
    const p = isSpawn ? s.level.spawn : s.level.goal;
    const set = (k: 'x' | 'y', v: number) =>
      s.mutate((lv) => {
        if (isSpawn) lv.spawn = { ...lv.spawn, [k]: Math.round(v) };
        else lv.goal = { ...lv.goal, [k]: Math.round(v) };
      });
    this.body.append(
      h('div', { class: 'insp-type' }, isSpawn ? 'Player start' : 'Exit door'),
      h('p', { class: 'insp-help' }, 'Position is the bottom-centre (the feet / door threshold).'),
      this.field('X', this.numberInput(p.x, (v) => set('x', v))),
      this.field('Y', this.numberInput(p.y, (v) => set('y', v))),
    );
  }

  private renderObject(o: LevelObject): void {
    const s = this.state;
    const def = OBJECT_DEFS[o.type];
    const idInput = h('input', { type: 'text', value: o.id });
    idInput.addEventListener('change', () => {
      const v = idInput.value.trim();
      if (!s.renameObject(o.id, v)) {
        toast(`ID "${v}" is empty or already used.`, 'error');
        idInput.value = o.id;
      }
    });
    this.body.append(
      h('div', { class: 'insp-type' }, h('span', { class: 'pal-swatch', style: `background:${def.editorColor}` }), def.label),
      h('p', { class: 'insp-help' }, def.description),
      this.field('ID', idInput, 'Unique id. Switches target objects by id.'),
      h(
        'div',
        { class: 'insp-grid2' },
        this.field('X', this.numberInput(o.x, (v) => s.mutate(() => (o.x = Math.round(v))))),
        this.field('Y', this.numberInput(o.y, (v) => s.mutate(() => (o.y = Math.round(v))))),
        s.isResizable(o, 'x') ? this.field('Width', this.numberInput(o.width, (v) => s.mutate(() => (o.width = Math.max(def.minWidth ?? 8, Math.round(v)))))) : null,
        s.isResizable(o, 'y') ? this.field('Height', this.numberInput(o.height, (v) => s.mutate(() => (o.height = Math.max(def.minHeight ?? 8, Math.round(v)))))) : null,
      ),
    );
    if (def.props.length) this.body.append(h('div', { class: 'insp-sub' }, 'Properties'));
    for (const spec of def.props) this.body.append(this.propEditor(o, spec));
    if (def.signalTarget) {
      const sources = s.level.objects.filter((x) => Array.isArray(x.properties.targets) && (x.properties.targets as string[]).includes(o.id));
      this.body.append(
        h('div', { class: 'insp-sub' }, 'Controlled by'),
        sources.length
          ? h('div', { class: 'chips' }, sources.map((src) => h('button', { class: 'chip', onclick: () => s.select([src.id]) }, src.id)))
          : h('p', { class: 'insp-help' }, 'No switch targets this object yet. Select a switch and add this id to its targets.'),
      );
    }
    this.body.append(this.actions(false));
  }

  private propEditor(o: LevelObject, spec: PropSpec): HTMLElement {
    const s = this.state;
    const cur = o.properties[spec.key];
    const commit = (v: PropertyValue) => s.mutate(() => (o.properties[spec.key] = v));
    switch (spec.kind) {
      case 'number':
        return this.field(spec.label, this.numberInput(typeof cur === 'number' ? cur : spec.default, (v) => commit(v), spec.step ?? 1), spec.help);
      case 'select': {
        const sel = h('select', {}, spec.options.map((opt) => h('option', { value: opt, selected: opt === cur }, opt)));
        sel.addEventListener('change', () => commit(sel.value));
        return this.field(spec.label, sel, spec.help);
      }
      case 'boolean': {
        const c = h('input', { type: 'checkbox', checked: cur === true });
        c.addEventListener('change', () => commit(c.checked));
        return h('label', { class: 'insp-check', title: spec.help ?? '' }, c, ' ', spec.label);
      }
      case 'string': {
        const t = spec.multiline ? h('textarea', { rows: 3 }) : h('input', { type: 'text' });
        (t as HTMLInputElement).value = typeof cur === 'string' ? cur : spec.default;
        t.addEventListener('change', () => commit((t as HTMLInputElement).value));
        return this.field(spec.label, t, spec.help);
      }
      case 'targets':
        return this.targetsEditor(o, spec.key);
      case 'points':
        return this.pointsEditor(o, spec.key);
    }
  }

  private targetsEditor(o: LevelObject, key: string): HTMLElement {
    const s = this.state;
    const targets = (o.properties[key] as string[]) ?? [];
    const candidates = s.level.objects.filter((x) => x.id !== o.id && OBJECT_DEFS[x.type].signalTarget && !targets.includes(x.id));
    const add = h('select', {}, h('option', { value: '' }, '+ add target…'), candidates.map((c) => h('option', { value: c.id }, `${c.id} (${OBJECT_DEFS[c.type].label})`)));
    add.addEventListener('change', () => {
      if (!add.value) return;
      const id = add.value;
      s.mutate(() => (o.properties[key] = [...targets, id]));
    });
    const pick = h(
      'button',
      {
        class: `btn small ${s.pickingTargetFor === o.id ? 'active' : ''}`,
        onclick: () => {
          s.pickingTargetFor = s.pickingTargetFor === o.id ? null : o.id;
          s.placing = null;
          s.emit('tool');
          if (s.pickingTargetFor) toast('Click a gate, platform or other target on the canvas.');
        },
      },
      s.pickingTargetFor === o.id ? 'Click a target…' : '⌖ Pick on canvas',
    );
    return h(
      'div',
      { class: 'insp-field' },
      h('span', { class: 'insp-label' }, 'Targets'),
      h(
        'div',
        { class: 'chips' },
        targets.length
          ? targets.map((t) =>
              h(
                'span',
                { class: `chip ${s.getObject(t) ? '' : 'bad'}` },
                h('button', { class: 'chip-link', onclick: () => s.select([t]) }, t),
                h('button', { class: 'chip-x', title: 'Remove', onclick: () => s.mutate(() => (o.properties[key] = targets.filter((x) => x !== t))) }, '×'),
              ),
            )
          : h('span', { class: 'insp-help' }, 'none'),
      ),
      h('div', { class: 'insp-row' }, pick, add),
    );
  }

  private pointsEditor(o: LevelObject, key: string): HTMLElement {
    const s = this.state;
    const pts = (o.properties[key] as Point[]) ?? [];
    const rows = pts.map((p, i) => {
      const set = (k: 'x' | 'y', v: number) =>
        s.mutate(() => {
          const next = pts.map((q) => ({ ...q }));
          next[i][k] = Math.round(v);
          o.properties[key] = next;
        });
      return h(
        'div',
        { class: 'pt-row' },
        h('span', { class: 'pt-i' }, String(i)),
        this.numberInput(p.x, (v) => set('x', v), 16),
        this.numberInput(p.y, (v) => set('y', v), 16),
        h(
          'button',
          {
            class: 'btn small',
            disabled: pts.length <= 2,
            onclick: () => s.mutate(() => (o.properties[key] = pts.filter((_, j) => j !== i))),
          },
          '×',
        ),
      );
    });
    return h(
      'div',
      { class: 'insp-field' },
      h('span', { class: 'insp-label' }, 'Path points (relative)'),
      ...rows,
      h(
        'button',
        {
          class: 'btn small',
          onclick: () =>
            s.mutate(() => {
              const last = pts[pts.length - 1] ?? { x: 0, y: 0 };
              o.properties[key] = [...pts.map((q) => ({ ...q })), { x: last.x + 96, y: last.y }];
            }),
        },
        '+ point',
      ),
      h('p', { class: 'insp-help' }, 'Drag the orange dots on the canvas, or double-click to append a point.'),
    );
  }

  private actions(multi: boolean): HTMLElement {
    const s = this.state;
    return h(
      'div',
      { class: 'insp-actions' },
      h('button', { class: 'btn small', onclick: () => s.duplicateSelection() }, 'Duplicate'),
      h('button', { class: 'btn small', onclick: () => s.reorderSelection('front'), title: 'Draw above other objects' }, 'To front'),
      h('button', { class: 'btn small', onclick: () => s.reorderSelection('back'), title: 'Draw below other objects' }, 'To back'),
      h('button', { class: 'btn small danger', onclick: () => s.deleteSelection() }, multi ? 'Delete all' : 'Delete'),
    );
  }
}
