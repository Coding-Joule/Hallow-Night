import { STORAGE_KEYS } from '../game/config/storageKeys';
import type { LevelData } from '../game/levels/schema';
import { cloneLevel, createEmptyLevel, levelToJSON, slugify } from '../game/levels/serialize';
import { parseLevel } from '../game/levels/validate';
import { readJSON, writeJSON } from '../game/systems/Storage';
import { confirmModal, copyText, downloadText, h, modal, pickFile, toast } from '../ui/dom';
import { EditorShell } from './EditorShell';
import { newUserLevelId, userLevels } from './storage/userLevels';

/**
 * Public level editor (/editor/). Levels live ONLY in this browser's
 * localStorage ("hallow-night-user-levels"); nothing is sent anywhere.
 */
export class PublicEditorApp {
  private shell: EditorShell;
  private nameInput: HTMLInputElement;
  private saveBtn: HTMLButtonElement;
  private undoBtn: HTMLButtonElement;
  private redoBtn: HTMLButtonElement;
  private savedId: string | null = null;

  constructor(root: HTMLElement) {
    const initial = this.initialLevel();
    this.shell = new EditorShell(root, initial.level, { mode: 'public', showLevelSettings: true });
    this.savedId = initial.saved ? initial.level.id : null;
    const s = this.shell.state;

    this.nameInput = h('input', { type: 'text', class: 'ed-name', value: initial.level.name, title: 'Level name' });
    this.nameInput.addEventListener('change', () => s.mutate((l) => (l.name = this.nameInput.value.trim() || 'Untitled Level')));
    this.saveBtn = h('button', { class: 'btn primary', onclick: () => this.save(), title: 'Save to this browser (Ctrl+S)' }, 'Save');
    this.undoBtn = h('button', { class: 'btn', onclick: () => s.undo(), title: 'Undo (Ctrl+Z)' }, '↶ Undo');
    this.redoBtn = h('button', { class: 'btn', onclick: () => s.redo(), title: 'Redo (Ctrl+Shift+Z)' }, '↷ Redo');
    const exportMenu = this.menu('Export ▾', [
      ['Download JSON', () => this.exportFile()],
      ['Copy JSON to clipboard', () => this.copyJSON()],
      ['Import JSON file…', () => this.importFile()],
      ['Paste JSON…', () => this.pasteJSON()],
    ]);
    this.shell.top.append(
      h('a', { class: 'btn ed-back', href: '../', title: 'Back to the game' }, '← Game'),
      h('div', { class: 'ed-brand' }, 'LEVEL EDITOR'),
      h('button', { class: 'btn', onclick: () => this.openManager() }, 'My Levels'),
      this.nameInput,
      this.saveBtn,
      h('button', { class: 'btn primary', onclick: () => this.shell.startPlaytest(), title: 'Play this level in the real game engine' }, '▶ Playtest'),
      this.undoBtn,
      this.redoBtn,
      exportMenu,
      h('span', { class: 'ed-note', title: 'Your levels never leave this browser.' }, 'Saved in this browser only'),
    );
    this.shell.onSaveShortcut = () => this.save();
    s.on(() => this.refresh());
    this.refresh();
    window.addEventListener('beforeunload', (e) => {
      if (s.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  private initialLevel(): { level: LevelData; saved: boolean } {
    const session = readJSON<{ lastId?: string }>(STORAGE_KEYS.editorSession, {});
    const last = session.lastId ? userLevels.get(session.lastId) : undefined;
    if (last) return { level: last.level, saved: true };
    const first = userLevels.list()[0];
    if (first) return { level: first.level, saved: true };
    return { level: this.freshLevel('My First Level'), saved: false };
  }

  private freshLevel(name: string): LevelData {
    const lvl = createEmptyLevel({ id: newUserLevelId(), name });
    lvl.objects.push(
      { id: 'platform-1', type: 'platform', x: 704, y: 608, width: 192, height: 32, properties: { style: 'auto' } },
      { id: 'decoration-1', type: 'decoration', x: 224, y: 624, width: 24, height: 112, properties: { kind: 'lamp', layer: 'back', flip: false } },
    );
    return lvl;
  }

  private refresh(): void {
    const s = this.shell.state;
    if (document.activeElement !== this.nameInput) this.nameInput.value = s.level.name;
    this.saveBtn.textContent = s.dirty || !this.savedId ? 'Save •' : 'Saved';
    this.undoBtn.disabled = !s.history.canUndo;
    this.redoBtn.disabled = !s.history.canRedo;
    document.title = `${s.dirty ? '• ' : ''}${s.level.name} — Hallow Night Editor`;
  }

  private menu(label: string, items: [string, () => void][]): HTMLElement {
    const list = h(
      'div',
      { class: 'menu-pop' },
      items.map(([t, fn]) =>
        h(
          'button',
          {
            class: 'menu-pop-item',
            onclick: () => {
              wrap.classList.remove('open');
              fn();
            },
          },
          t,
        ),
      ),
    );
    const wrap = h('div', { class: 'menu-wrap' }, h('button', { class: 'btn', onclick: () => wrap.classList.toggle('open') }, label), list);
    document.addEventListener('mousedown', (e) => {
      if (!wrap.contains(e.target as Node)) wrap.classList.remove('open');
    });
    return wrap;
  }

  save(): void {
    const s = this.shell.state;
    if (userLevels.save(s.level)) {
      this.savedId = s.level.id;
      s.dirty = false;
      writeJSON(STORAGE_KEYS.editorSession, { lastId: s.level.id });
      toast('Level saved in this browser.');
      s.emit('selection');
    } else toast('Could not save — browser storage may be full or disabled.', 'error');
  }

  private guardUnsaved(then: () => void): void {
    if (!this.shell.state.dirty) return then();
    confirmModal('Unsaved changes', 'Discard the unsaved changes to the current level?', 'Discard', then);
  }

  private open(level: LevelData, saved: boolean): void {
    this.shell.state.load(level);
    this.savedId = saved ? level.id : null;
    if (saved) writeJSON(STORAGE_KEYS.editorSession, { lastId: level.id });
    this.shell.canvas.fitLevel();
    this.refresh();
  }

  private openManager(): void {
    const body = h('div', { class: 'lm' });
    const close = modal('My Levels', body, [{ label: 'Close' }]);
    const render = () => {
      const levels = userLevels.list();
      body.replaceChildren(
        h(
          'div',
          { class: 'lm-actions' },
          h(
            'button',
            {
              class: 'btn primary',
              onclick: () =>
                this.guardUnsaved(() => {
                  close();
                  const lvl = this.freshLevel('Untitled Level');
                  this.open(lvl, false);
                  this.save();
                }),
            },
            '+ New level',
          ),
          h('button', { class: 'btn', onclick: () => (close(), this.importFile()) }, 'Import JSON…'),
        ),
        levels.length === 0
          ? h('p', { class: 'insp-help' }, 'No saved levels yet. Levels are stored only in this browser.')
          : h(
              'div',
              { class: 'lm-list' },
              levels.map((entry) =>
                h(
                  'div',
                  { class: `lm-row ${entry.level.id === this.shell.state.level.id ? 'current' : ''}` },
                  h(
                    'div',
                    { class: 'lm-info' },
                    h('div', { class: 'lm-name' }, entry.level.name),
                    h('div', { class: 'lm-meta' }, `${entry.level.objects.length} objects · ${new Date(entry.updatedAt).toLocaleString()}`),
                  ),
                  h('button', { class: 'btn small', onclick: () => this.guardUnsaved(() => (close(), this.open(entry.level, true))) }, 'Open'),
                  h(
                    'button',
                    {
                      class: 'btn small',
                      onclick: () => {
                        const name = prompt('New name', entry.level.name);
                        if (!name) return;
                        const lvl = { ...entry.level, name: name.trim() || entry.level.name };
                        userLevels.save(lvl);
                        if (lvl.id === this.shell.state.level.id) this.shell.state.mutate((l) => (l.name = lvl.name));
                        render();
                      },
                    },
                    'Rename',
                  ),
                  h(
                    'button',
                    {
                      class: 'btn small',
                      onclick: () => {
                        const copy = cloneLevel(entry.level);
                        copy.id = newUserLevelId();
                        copy.name = `${entry.level.name} (copy)`;
                        userLevels.save(copy);
                        render();
                      },
                    },
                    'Duplicate',
                  ),
                  h(
                    'button',
                    {
                      class: 'btn small danger',
                      onclick: () =>
                        confirmModal('Delete level?', `“${entry.level.name}” will be removed from this browser.`, 'Delete', () => {
                          userLevels.remove(entry.level.id);
                          if (entry.level.id === this.savedId) this.savedId = null;
                          render();
                        }),
                    },
                    'Delete',
                  ),
                ),
              ),
            ),
      );
    };
    render();
  }

  private exportFile(): void {
    const lvl = this.shell.state.level;
    downloadText(`${slugify(lvl.name)}.json`, levelToJSON(lvl));
  }

  private async copyJSON(): Promise<void> {
    const ok = await copyText(levelToJSON(this.shell.state.level));
    toast(ok ? 'Level JSON copied to clipboard.' : 'Clipboard not available.', ok ? 'info' : 'error');
  }

  private importText(text: string, source: string): void {
    const res = parseLevel(text);
    if (!res.level) {
      modal(
        'Import failed',
        h('div', {}, h('p', {}, `${source} is not a valid level:`), h('ul', { class: 'issue-list' }, res.issues.filter((i) => i.severity === 'error').map((i) => h('li', {}, i.message)))),
        [{ label: 'OK', primary: true }],
      );
      return;
    }
    const lvl = res.level;
    // imported levels become new, independent browser levels
    lvl.id = newUserLevelId();
    this.guardUnsaved(() => {
      this.open(lvl, false);
      this.save();
      const warnings = res.issues.filter((i) => i.severity === 'warning');
      toast(`Imported “${lvl.name}”${warnings.length ? ` (${warnings.length} warnings)` : ''}.`);
    });
  }

  private async importFile(): Promise<void> {
    const f = await pickFile();
    if (f) this.importText(f.text, f.name);
  }

  private pasteJSON(): void {
    const ta = h('textarea', { class: 'paste-area', rows: 14, placeholder: 'Paste level JSON here…' });
    modal('Paste JSON', ta, [{ label: 'Cancel' }, { label: 'Import', primary: true, onClick: () => this.importText(ta.value, 'Pasted JSON') }]);
    setTimeout(() => ta.focus(), 50);
  }
}
