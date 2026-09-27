import { OBJECT_DEFS } from '../game/levels/objectTypes';
import type { LevelData, LevelObject, ObjectType, Point } from '../game/levels/schema';
import { cloneLevel, createObject } from '../game/levels/serialize';
import { History } from './History';

export const SPAWN_ID = '__spawn';
export const GOAL_ID = '__goal';

type Listener = (reason: ChangeReason) => void;
export type ChangeReason = 'level' | 'selection' | 'view' | 'load' | 'tool';

/**
 * Single source of truth for the editor. UI panels subscribe to changes;
 * every mutation that should be undoable goes through `mutate()`.
 */
export class EditorState {
  level: LevelData;
  selection = new Set<string>();
  history = new History();
  dirty = false;
  /** Palette type armed for placement (null = select tool). */
  placing: ObjectType | null = null;
  /** Waiting for a click on a target object for this source id. */
  pickingTargetFor: string | null = null;
  grid = 32;
  showGrid = true;
  snap = true;
  zoom = 0.5;
  panX = 0;
  panY = 0;
  cursor: Point = { x: 0, y: 0 };
  private listeners = new Set<Listener>();

  constructor(level: LevelData) {
    this.level = cloneLevel(level);
  }

  on(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  emit(reason: ChangeReason): void {
    for (const l of this.listeners) l(reason);
  }

  load(level: LevelData): void {
    this.level = cloneLevel(level);
    this.selection.clear();
    this.history.reset();
    this.dirty = false;
    this.placing = null;
    this.pickingTargetFor = null;
    this.emit('load');
  }

  snapshot(): string {
    return JSON.stringify(this.level);
  }

  /** Apply an undoable change. */
  mutate(fn: (level: LevelData) => void, before?: string): void {
    this.history.push(before ?? this.snapshot());
    fn(this.level);
    this.dirty = true;
    this.pruneSelection();
    this.emit('level');
  }

  /** Commit a change that was already applied live (e.g. dragging) using the pre-drag snapshot. */
  commitLive(before: string): void {
    if (before === this.snapshot()) return;
    this.history.push(before);
    this.dirty = true;
    this.emit('level');
  }

  undo(): void {
    const prev = this.history.undo(this.snapshot());
    if (prev === null) return;
    this.level = JSON.parse(prev) as LevelData;
    this.dirty = true;
    this.pruneSelection();
    this.emit('level');
  }

  redo(): void {
    const next = this.history.redo(this.snapshot());
    if (next === null) return;
    this.level = JSON.parse(next) as LevelData;
    this.dirty = true;
    this.pruneSelection();
    this.emit('level');
  }

  private pruneSelection(): void {
    for (const id of [...this.selection]) {
      if (id !== SPAWN_ID && id !== GOAL_ID && !this.getObject(id)) this.selection.delete(id);
    }
  }

  getObject(id: string): LevelObject | undefined {
    return this.level.objects.find((o) => o.id === id);
  }

  selectedObjects(): LevelObject[] {
    return this.level.objects.filter((o) => this.selection.has(o.id));
  }

  select(ids: string[], additive = false): void {
    if (!additive) this.selection.clear();
    for (const id of ids) this.selection.add(id);
    this.emit('selection');
  }

  toggleSelect(id: string): void {
    if (this.selection.has(id)) this.selection.delete(id);
    else this.selection.add(id);
    this.emit('selection');
  }

  clearSelection(): void {
    if (this.selection.size === 0) return;
    this.selection.clear();
    this.emit('selection');
  }

  snapValue(v: number): number {
    if (!this.snap) return Math.round(v);
    return Math.round(v / this.grid) * this.grid;
  }

  addObject(type: ObjectType, x: number, y: number): LevelObject {
    const obj = createObject(this.level, type, x, y);
    this.mutate((l) => l.objects.push(obj));
    this.select([obj.id]);
    return obj;
  }

  deleteSelection(): void {
    const ids = new Set([...this.selection].filter((id) => id !== SPAWN_ID && id !== GOAL_ID));
    if (ids.size === 0) return;
    this.mutate((l) => {
      l.objects = l.objects.filter((o) => !ids.has(o.id));
      // drop dangling links
      for (const o of l.objects) {
        const t = o.properties.targets;
        if (Array.isArray(t)) o.properties.targets = (t as string[]).filter((x) => !ids.has(x));
      }
    });
    this.selection.clear();
    this.emit('selection');
  }

  duplicateSelection(offset = 32): void {
    const objs = this.selectedObjects();
    if (!objs.length) return;
    const newIds: string[] = [];
    this.mutate((l) => {
      for (const o of objs) {
        const copy = createObject(l, o.type, o.x + offset, o.y + offset);
        copy.width = o.width;
        copy.height = o.height;
        copy.properties = JSON.parse(JSON.stringify(o.properties));
        l.objects.push(copy);
        newIds.push(copy.id);
      }
    });
    this.select(newIds);
  }

  /** Paste objects from a clipboard payload at an offset. */
  pasteObjects(objs: LevelObject[], dx: number, dy: number): void {
    const newIds: string[] = [];
    this.mutate((l) => {
      for (const o of objs) {
        const copy = createObject(l, o.type, this.snapValue(o.x + dx), this.snapValue(o.y + dy));
        copy.width = o.width;
        copy.height = o.height;
        copy.properties = JSON.parse(JSON.stringify(o.properties));
        l.objects.push(copy);
        newIds.push(copy.id);
      }
    });
    this.select(newIds);
  }

  renameObject(oldId: string, newId: string): boolean {
    if (!newId || oldId === newId || this.getObject(newId)) return false;
    this.mutate((l) => {
      const o = l.objects.find((x) => x.id === oldId);
      if (!o) return;
      o.id = newId;
      for (const other of l.objects) {
        const t = other.properties.targets;
        if (Array.isArray(t)) other.properties.targets = (t as string[]).map((x) => (x === oldId ? newId : x));
      }
    });
    this.selection.delete(oldId);
    this.selection.add(newId);
    this.emit('selection');
    return true;
  }

  reorderSelection(where: 'front' | 'back'): void {
    const ids = this.selection;
    this.mutate((l) => {
      const sel = l.objects.filter((o) => ids.has(o.id));
      const rest = l.objects.filter((o) => !ids.has(o.id));
      l.objects = where === 'front' ? [...rest, ...sel] : [...sel, ...rest];
    });
  }

  isResizable(o: LevelObject, axis: 'x' | 'y'): boolean {
    const r = OBJECT_DEFS[o.type].resize;
    return r === 'both' || r === axis;
  }
}
