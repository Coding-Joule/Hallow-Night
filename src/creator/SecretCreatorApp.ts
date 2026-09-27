import { STORAGE_KEYS } from '../game/config/storageKeys';
import { getBuiltinLevels } from '../game/levels/registry';
import type { LevelData } from '../game/levels/schema';
import { createEmptyLevel, levelToJSON, manifestEntry, MANIFEST_PATH, officialFilename, officialPath } from '../game/levels/serialize';
import { parseLevel, type ValidationIssue } from '../game/levels/validate';
import { WORLDS, type WorldId } from '../game/levels/worlds';
import { readJSON, writeJSON } from '../game/systems/Storage';
import { EditorShell } from '../editor/EditorShell';
import { creatorDrafts } from '../editor/storage/userLevels';
import { confirmModal, copyText, downloadText, h, modal, pickFile, toast } from '../ui/dom';

/**
 * BUILT-IN LEVEL CREATOR (/secret-creations/).
 * Same editor engine and schema as the public editor, but its output is an
 * official level JSON file that you add to the repository by hand.
 * Drafts are kept in this browser for convenience.
 */
export class SecretCreatorApp {
  private shell: EditorShell;
  private fields = new Map<string, HTMLInputElement | HTMLSelectElement>();
  private issuesPanel: HTMLElement;
  private saveTimer = 0;

  constructor(root: HTMLElement) {
    const initial = this.initialLevel();
    this.shell = new EditorShell(root, initial, { mode: 'creator', showLevelSettings: false });
    const s = this.shell.state;
    this.issuesPanel = h('div', { class: 'cr-issues', style: 'display:none' });

    const actions = h(
      'div',
      { class: 'cr-actions' },
      h('button', { class: 'btn', onclick: () => this.newLevel() }, 'NEW LEVEL'),
      h('button', { class: 'btn', onclick: () => this.openFile() }, 'OPEN JSON'),
      h('button', { class: 'btn', onclick: () => this.importPaste() }, 'IMPORT JSON'),
      h('button', { class: 'btn', onclick: () => this.editBuiltin() }, 'EDIT BUILT-IN'),
      h('button', { class: 'btn', onclick: () => this.openDrafts() }, 'DRAFTS'),
      h('span', { class: 'st-sep' }),
      h('button', { class: 'btn', onclick: () => s.undo(), title: 'Ctrl+Z' }, '↶'),
      h('button', { class: 'btn', onclick: () => s.redo(), title: 'Ctrl+Shift+Z' }, '↷'),
      h('button', { class: 'btn primary', onclick: () => this.shell.startPlaytest() }, '▶ PLAYTEST'),
      h('button', { class: 'btn', onclick: () => this.validate(true) }, '✓ VALIDATE LEVEL'),
      h('button', { class: 'btn primary cr-export', onclick: () => this.exportOfficial() }, 'EXPORT OFFICIAL JSON'),
      h('button', { class: 'btn', onclick: () => this.copyJSON() }, 'COPY JSON'),
    );

    this.shell.top.append(
      h(
        'div',
        { class: 'cr-banner' },
        h('div', { class: 'cr-title' }, 'BUILT-IN LEVEL CREATOR'),
        h('div', { class: 'cr-warning' }, '⚠ Levels exported here are intended for the game’s built-in level library.'),
      ),
      actions,
      this.metaFields(),
      this.issuesPanel,
    );
    this.shell.onSaveShortcut = () => {
      this.saveDraft();
      toast('Draft saved in this browser.');
    };
    s.on((r) => {
      if (r === 'level' || r === 'load') {
        this.syncFields();
        clearTimeout(this.saveTimer);
        this.saveTimer = window.setTimeout(() => this.saveDraft(), 600);
      }
    });
    this.syncFields();
  }

  private initialLevel(): LevelData {
    const session = readJSON<{ lastId?: string }>(STORAGE_KEYS.creatorSession, {});
    const draft = session.lastId ? creatorDrafts.get(session.lastId) : undefined;
    if (draft) return draft.level;
    return this.blankOfficial();
  }

  private blankOfficial(): LevelData {
    const count = getBuiltinLevels().length;
    const num = count + 1;
    const world: WorldId = WORLDS[Math.min(WORLDS.length - 1, Math.floor(count / 5))].id;
    const lvl = createEmptyLevel({ id: `${world}-${String(num).padStart(2, '0')}`, name: 'New Level', world });
    lvl.number = num;
    lvl.order = (count % 5) + 1;
    return lvl;
  }

  // ───────────────────────── metadata fields
  private metaFields(): HTMLElement {
    const s = this.shell.state;
    const text = (key: string, label: string, apply: (l: LevelData, v: string) => void, width = '9em') => {
      const i = h('input', { type: 'text', style: `width:${width}` });
      i.addEventListener('change', () => s.mutate((l) => apply(l, i.value.trim())));
      this.fields.set(key, i);
      return h('label', { class: 'cr-field' }, h('span', {}, label), i);
    };
    const num = (key: string, label: string, apply: (l: LevelData, v: number) => void, width = '6em') => {
      const i = h('input', { type: 'number', style: `width:${width}` });
      i.addEventListener('change', () => {
        const v = Number(i.value);
        if (Number.isFinite(v)) s.mutate((l) => apply(l, Math.round(v)));
      });
      this.fields.set(key, i);
      return h('label', { class: 'cr-field' }, h('span', {}, label), i);
    };
    const worldSelect = (key: string, label: string, apply: (l: LevelData, v: WorldId) => void) => {
      const sel = h('select', {}, WORLDS.map((w) => h('option', { value: w.id }, `${w.index}. ${w.name}`)));
      sel.addEventListener('change', () => s.mutate((l) => apply(l, sel.value as WorldId)));
      this.fields.set(key, sel);
      return h('label', { class: 'cr-field' }, h('span', {}, label), sel);
    };
    const check = (key: 'wallJump' | 'dash' | 'doubleJump', label: string) => {
      const c = h('input', { type: 'checkbox' });
      c.addEventListener('change', () => s.mutate((l) => (l.abilities[key] = c.checked)));
      this.fields.set(`ab-${key}`, c);
      return h('label', { class: 'cr-check' }, c, ' ', label);
    };
    return h(
      'div',
      { class: 'cr-meta' },
      text('id', 'Level ID', (l, v) => (l.id = v)),
      text('name', 'Level Name', (l, v) => (l.name = v || l.name), '12em'),
      worldSelect('world', 'World', (l, v) => {
        l.world = v;
      }),
      num('order', 'World Order', (l, v) => (l.order = v), '4.5em'),
      num('number', 'Global #', (l, v) => (l.number = v), '4.5em'),
      num('width', 'Width', (l, v) => (l.width = Math.max(320, v))),
      num('height', 'Height', (l, v) => (l.height = Math.max(320, v))),
      worldSelect('background', 'Background', (l, v) => (l.background = v)),
      worldSelect('music', 'Music', (l, v) => (l.music = v)),
      h('div', { class: 'cr-field' }, h('span', {}, 'Abilities'), h('div', { class: 'cr-checks' }, check('wallJump', 'Wall'), check('dash', 'Dash'), check('doubleJump', 'Double'))),
      num('sx', 'Start X', (l, v) => (l.spawn = { ...l.spawn, x: v })),
      num('sy', 'Start Y', (l, v) => (l.spawn = { ...l.spawn, y: v })),
      num('gx', 'Goal X', (l, v) => (l.goal = { ...l.goal, x: v })),
      num('gy', 'Goal Y', (l, v) => (l.goal = { ...l.goal, y: v })),
    );
  }

  private syncFields(): void {
    const l = this.shell.state.level;
    const set = (k: string, v: string | number | boolean | undefined) => {
      const f = this.fields.get(k);
      if (!f || document.activeElement === f) return;
      if (f instanceof HTMLInputElement && f.type === 'checkbox') f.checked = !!v;
      else f.value = v === undefined ? '' : String(v);
    };
    set('id', l.id);
    set('name', l.name);
    set('world', l.world);
    set('order', l.order);
    set('number', l.number);
    set('width', l.width);
    set('height', l.height);
    set('background', l.background);
    set('music', l.music);
    set('ab-wallJump', l.abilities.wallJump);
    set('ab-dash', l.abilities.dash);
    set('ab-doubleJump', l.abilities.doubleJump);
    set('sx', l.spawn.x);
    set('sy', l.spawn.y);
    set('gx', l.goal.x);
    set('gy', l.goal.y);
    document.title = `${l.name} — Built-in Level Creator`;
  }

  // ───────────────────────── drafts
  private saveDraft(): void {
    const l = this.shell.state.level;
    if (!l.id) return;
    creatorDrafts.save(l);
    writeJSON(STORAGE_KEYS.creatorSession, { lastId: l.id });
  }

  private load(level: LevelData): void {
    this.shell.state.load(level);
    this.shell.canvas.fitLevel();
    this.issuesPanel.style.display = 'none';
    this.saveDraft();
  }

  private newLevel(): void {
    confirmModal('New level', 'Start a new blank level? The current one stays in your drafts.', 'Create', () => this.load(this.blankOfficial()), false);
  }

  private openDrafts(): void {
    const drafts = creatorDrafts.list();
    const body = h(
      'div',
      { class: 'lm-list' },
      drafts.length === 0
        ? h('p', { class: 'insp-help' }, 'No drafts yet.')
        : drafts.map((d) =>
            h(
              'div',
              { class: 'lm-row' },
              h('div', { class: 'lm-info' }, h('div', { class: 'lm-name' }, `${d.level.name}`), h('div', { class: 'lm-meta' }, `${d.level.id} · ${new Date(d.updatedAt).toLocaleString()}`)),
              h('button', { class: 'btn small', onclick: () => (close(), this.load(d.level)) }, 'Open'),
              h('button', { class: 'btn small danger', onclick: () => (creatorDrafts.remove(d.level.id), close(), this.openDrafts()) }, 'Delete'),
            ),
          ),
    );
    const close = modal('Creator drafts (this browser)', body, [{ label: 'Close' }]);
  }

  private editBuiltin(): void {
    const levels = getBuiltinLevels();
    const body = h(
      'div',
      { class: 'lm-list' },
      levels.map((e) =>
        h(
          'div',
          { class: 'lm-row' },
          h('div', { class: 'lm-info' }, h('div', { class: 'lm-name' }, `${e.level.number ?? e.index + 1}. ${e.level.name}`), h('div', { class: 'lm-meta' }, e.path)),
          h('button', { class: 'btn small', onclick: () => (close(), this.load(JSON.parse(JSON.stringify(e.level)) as LevelData)) }, 'Edit'),
        ),
      ),
    );
    const close = modal('Edit a built-in level', body, [{ label: 'Close' }]);
  }

  private loadText(text: string, source: string): void {
    const res = parseLevel(text);
    if (!res.level) {
      this.showIssues(res.issues, `${source} could not be loaded`);
      return;
    }
    this.load(res.level);
    toast(`Loaded ${source}.`);
  }

  private async openFile(): Promise<void> {
    const f = await pickFile();
    if (f) this.loadText(f.text, f.name);
  }

  private importPaste(): void {
    const ta = h('textarea', { class: 'paste-area', rows: 14, placeholder: 'Paste level JSON here…' });
    modal('Import JSON', ta, [{ label: 'Cancel' }, { label: 'Import', primary: true, onClick: () => this.loadText(ta.value, 'pasted JSON') }]);
    setTimeout(() => ta.focus(), 50);
  }

  // ───────────────────────── validation & export
  /** Strict validation + creator-specific checks. */
  private collectIssues(): ValidationIssue[] {
    const l = this.shell.state.level;
    const res = parseLevel(JSON.parse(this.shell.state.snapshot()), { strict: true });
    const issues = [...res.issues];
    const warn = (message: string) => issues.push({ severity: 'warning', message });
    if (l.number === undefined) issues.push({ severity: 'error', message: 'Global level number is required for built-in levels.' });
    if (l.order < 1) issues.push({ severity: 'error', message: 'World order must be 1 or higher.' });
    if (!l.objects.some((o) => o.type === 'ground' || o.type === 'platform')) warn('Level has no ground or platforms.');
    const builtin = getBuiltinLevels().find((e) => e.level.id === l.id);
    if (builtin) warn(`A built-in level with id "${l.id}" already exists (${builtin.path}). Exporting will replace it.`);
    const sameNumber = getBuiltinLevels().find((e) => e.level.number === l.number && e.level.id !== l.id);
    if (sameNumber) warn(`Level number ${l.number} is already used by "${sameNumber.level.name}" (${sameNumber.path}).`);
    const expected = l.id.startsWith(l.world + '-');
    if (!expected) warn(`Tip: built-in ids usually start with the world id ("${l.world}-…").`);
    return issues;
  }

  private showIssues(issues: ValidationIssue[], title: string): void {
    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');
    this.issuesPanel.style.display = '';
    this.issuesPanel.replaceChildren(
      h(
        'div',
        { class: 'cr-issues-head' },
        h('b', { class: errors.length ? 'bad' : 'good' }, errors.length ? `✗ ${title}: ${errors.length} error(s)` : `✓ ${title}`),
        warnings.length ? h('span', { class: 'warn' }, ` · ${warnings.length} warning(s)`) : null,
        h('button', { class: 'btn small', onclick: () => (this.issuesPanel.style.display = 'none') }, 'Hide'),
      ),
      h(
        'ul',
        { class: 'issue-list' },
        [...errors, ...warnings].map((i) =>
          h(
            'li',
            { class: i.severity },
            i.objectId
              ? h('button', { class: 'chip-link', onclick: () => this.focusObject(i.objectId!) }, i.objectId)
              : null,
            ' ',
            i.message,
          ),
        ),
      ),
    );
  }

  private focusObject(id: string): void {
    const o = this.shell.state.getObject(id);
    if (!o) return;
    this.shell.state.select([id]);
    this.shell.canvas.centerOn({ x: o.x + o.width / 2, y: o.y + o.height / 2 }, 0.8);
  }

  private validate(show: boolean): boolean {
    const issues = this.collectIssues();
    const ok = !issues.some((i) => i.severity === 'error');
    if (show) this.showIssues(issues, ok ? 'Level is valid' : 'Validation failed');
    return ok;
  }

  private exportOfficial(): void {
    const l = this.shell.state.level;
    const doExport = () => {
      const filename = officialFilename(l);
      downloadText(filename, levelToJSON(l));
      this.saveDraft();
      this.showInstructions();
    };
    if (this.validate(true)) doExport();
    else confirmModal('Level has errors', 'The level has validation errors and may fail to load in the game. Export anyway?', 'Export anyway', doExport);
  }

  private showInstructions(): void {
    const l = this.shell.state.level;
    const path = officialPath(l);
    const entry = manifestEntry(l);
    const row = (label: string, value: string) =>
      h(
        'div',
        { class: 'cr-copy-row' },
        h('span', { class: 'cr-copy-label' }, label),
        h('code', {}, value),
        h(
          'button',
          {
            class: 'btn small',
            onclick: async () => toast((await copyText(value)) ? 'Copied.' : 'Clipboard not available.'),
          },
          'Copy',
        ),
      );
    modal(
      'Export complete',
      h(
        'div',
        { class: 'cr-instructions' },
        h('p', {}, `Downloaded `, h('b', {}, officialFilename(l)), '.'),
        h('p', {}, '1. Put the file in the repository at:'),
        row('Suggested path', path),
        h('p', {}, '2. If it is a new level, add this line to the "levels" list in ', h('code', {}, MANIFEST_PATH), ' (order = play order):'),
        row('Manifest entry', `"${entry}"`),
        h('p', {}, '3. Commit and push. The level appears in the game automatically.'),
      ),
      [{ label: 'Done', primary: true }],
    );
  }

  private async copyJSON(): Promise<void> {
    const ok = await copyText(levelToJSON(this.shell.state.level));
    toast(ok ? 'Complete level JSON copied to clipboard.' : 'Clipboard not available.', ok ? 'info' : 'error');
  }
}
