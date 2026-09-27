import { OBJECT_DEFS } from '../../game/levels/objectTypes';
import type { LevelObject, ObjectType, Point } from '../../game/levels/schema';
import { EditorArt } from './EditorArt';
import { drawMarker, drawObject, GOAL_BOX, objectBounds, SPAWN_BOX } from './drawObject';
import { GOAL_ID, SPAWN_ID, type EditorState } from '../EditorState';

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type Drag =
  | { kind: 'pan'; sx: number; sy: number; px: number; py: number }
  | { kind: 'move'; start: Point; before: string; origin: Map<string, Point>; moved: boolean }
  | { kind: 'resize'; handle: Handle; start: Point; before: string; orig: { x: number; y: number; w: number; h: number }; id: string }
  | { kind: 'marquee'; start: Point; now: Point; additive: boolean }
  | { kind: 'point'; id: string; index: number; before: string };

const HANDLE_PX = 8;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

/**
 * The level canvas: renders the level and handles all pointer interaction
 * (select, move, resize, marquee, pan, zoom, place, pick link targets).
 */
export class EditorCanvas {
  readonly el: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private art: EditorArt;
  private drag: Drag | null = null;
  private spaceDown = false;
  private raf = 0;
  private hover: string | null = null;
  /** Called when a palette item is dropped onto the canvas. */
  private dpr = 1;
  private fitted = false;

  constructor(
    private state: EditorState,
    private host: HTMLElement,
  ) {
    this.el = document.createElement('canvas');
    this.el.className = 'ed-canvas';
    this.el.tabIndex = 0;
    host.append(this.el);
    this.ctx = this.el.getContext('2d')!;
    this.art = new EditorArt(() => this.requestDraw());
    new ResizeObserver(() => this.resize()).observe(host);
    this.el.addEventListener('pointerdown', (e) => this.onDown(e));
    this.el.addEventListener('pointermove', (e) => this.onMove(e));
    this.el.addEventListener('pointerup', (e) => this.onUp(e));
    this.el.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
    this.el.addEventListener('dblclick', (e) => this.onDblClick(e));
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && document.activeElement === this.el) {
        this.spaceDown = true;
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.spaceDown = false;
    });
    state.on(() => this.requestDraw());
    this.resize();
  }

  // ───────────────────────── coordinates
  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const r = this.host.getBoundingClientRect();
    this.el.width = Math.max(1, Math.floor(r.width * this.dpr));
    this.el.height = Math.max(1, Math.floor(r.height * this.dpr));
    this.el.style.width = `${r.width}px`;
    this.el.style.height = `${r.height}px`;
    if (!this.fitted && r.width > 50 && r.height > 50) {
      this.fitted = true;
      this.fitLevel();
    }
    this.requestDraw();
  }

  get viewWidth(): number {
    return this.el.width / this.dpr;
  }
  get viewHeight(): number {
    return this.el.height / this.dpr;
  }

  screenToWorld(sx: number, sy: number): Point {
    const s = this.state;
    return { x: (sx - s.panX) / s.zoom, y: (sy - s.panY) / s.zoom };
  }

  private eventPoint(e: MouseEvent): { sx: number; sy: number; w: Point } {
    const r = this.el.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    return { sx, sy, w: this.screenToWorld(sx, sy) };
  }

  /** World point from client coordinates (used for drag & drop from the palette). */
  clientToWorld(cx: number, cy: number): Point | null {
    const r = this.el.getBoundingClientRect();
    if (cx < r.left || cy < r.top || cx > r.right || cy > r.bottom) return null;
    return this.screenToWorld(cx - r.left, cy - r.top);
  }

  zoomAt(factor: number, sx = this.viewWidth / 2, sy = this.viewHeight / 2): void {
    const s = this.state;
    const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s.zoom * factor));
    const wx = (sx - s.panX) / s.zoom;
    const wy = (sy - s.panY) / s.zoom;
    s.zoom = nz;
    s.panX = sx - wx * nz;
    s.panY = sy - wy * nz;
    s.emit('view');
  }

  fitLevel(): void {
    const s = this.state;
    const lw = s.level.width;
    const lh = s.level.height;
    const z = Math.min(this.viewWidth / (lw + 64), this.viewHeight / (lh + 64));
    s.zoom = Math.min(1, Math.max(MIN_ZOOM, z));
    s.panX = (this.viewWidth - lw * s.zoom) / 2;
    s.panY = (this.viewHeight - lh * s.zoom) / 2;
    s.emit('view');
  }

  centerOn(p: Point, zoom = 0.75): void {
    const s = this.state;
    s.zoom = zoom;
    s.panX = this.viewWidth / 2 - p.x * zoom;
    s.panY = this.viewHeight / 2 - p.y * zoom;
    s.emit('view');
  }

  // ───────────────────────── hit testing
  private markerRect(id: string): { x: number; y: number; w: number; h: number } {
    const l = this.state.level;
    if (id === SPAWN_ID) return { x: l.spawn.x - SPAWN_BOX.w / 2, y: l.spawn.y - SPAWN_BOX.h, w: SPAWN_BOX.w, h: SPAWN_BOX.h };
    return { x: l.goal.x - GOAL_BOX.w / 2, y: l.goal.y - GOAL_BOX.h, w: GOAL_BOX.w, h: GOAL_BOX.h };
  }

  private hitTest(p: Point): string | null {
    for (const id of [SPAWN_ID, GOAL_ID]) {
      const r = this.markerRect(id);
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return id;
    }
    const objs = this.state.level.objects;
    // non-decorations first (topmost last drawn), then decorations
    for (const pass of [false, true]) {
      for (let i = objs.length - 1; i >= 0; i--) {
        const o = objs[i];
        if ((o.type === 'decoration') !== pass) continue;
        const b = objectBounds(o);
        const pad = 4 / this.state.zoom;
        if (p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad) return o.id;
      }
    }
    return null;
  }

  private handleAt(p: Point): Handle | null {
    const sel = this.state.selectedObjects();
    if (sel.length !== 1 || this.state.selection.size !== 1) return null;
    const o = sel[0];
    const def = OBJECT_DEFS[o.type];
    if (def.resize === 'none') return null;
    const b = objectBounds(o);
    const r = HANDLE_PX / this.state.zoom;
    const handles = this.handlePositions(b, def.resize);
    for (const [h, hx, hy] of handles) if (Math.abs(p.x - hx) <= r && Math.abs(p.y - hy) <= r) return h;
    return null;
  }

  private handlePositions(b: { x: number; y: number; w: number; h: number }, resize: string): [Handle, number, number][] {
    const all: [Handle, number, number][] = [
      ['nw', b.x, b.y],
      ['n', b.x + b.w / 2, b.y],
      ['ne', b.x + b.w, b.y],
      ['e', b.x + b.w, b.y + b.h / 2],
      ['se', b.x + b.w, b.y + b.h],
      ['s', b.x + b.w / 2, b.y + b.h],
      ['sw', b.x, b.y + b.h],
      ['w', b.x, b.y + b.h / 2],
    ];
    if (resize === 'x') return all.filter(([h]) => h === 'e' || h === 'w');
    if (resize === 'y') return all.filter(([h]) => h === 'n' || h === 's');
    return all;
  }

  private pathPointAt(p: Point): { id: string; index: number } | null {
    const sel = this.state.selectedObjects();
    if (sel.length !== 1 || sel[0].type !== 'pathPlatform') return null;
    const o = sel[0];
    const pts = o.properties.points as Point[];
    const r = 8 / this.state.zoom;
    for (let i = 1; i < pts.length; i++) {
      const cx = o.x + pts[i].x + o.width / 2;
      const cy = o.y + pts[i].y + o.height / 2;
      if (Math.abs(p.x - cx) <= r && Math.abs(p.y - cy) <= r) return { id: o.id, index: i };
    }
    return null;
  }

  // ───────────────────────── pointer handling
  private onDown(e: PointerEvent): void {
    this.el.focus();
    this.el.setPointerCapture(e.pointerId);
    const { sx, sy, w } = this.eventPoint(e);
    const s = this.state;
    if (e.button === 1 || e.button === 2 || this.spaceDown) {
      if (e.button === 2 && s.placing) {
        s.placing = null;
        s.emit('tool');
        return;
      }
      this.drag = { kind: 'pan', sx, sy, px: s.panX, py: s.panY };
      return;
    }
    if (e.button !== 0) return;

    // picking a link target
    if (s.pickingTargetFor) {
      const hit = this.hitTest(w);
      const src = s.getObject(s.pickingTargetFor);
      if (hit && src && hit !== src.id && hit !== SPAWN_ID && hit !== GOAL_ID) {
        const target = s.getObject(hit)!;
        if (OBJECT_DEFS[target.type].signalTarget) {
          s.mutate(() => {
            const t = (src.properties.targets as string[]) ?? [];
            if (!t.includes(hit)) src.properties.targets = [...t, hit];
          });
        }
      }
      s.pickingTargetFor = null;
      s.emit('tool');
      return;
    }

    // placing a new object
    if (s.placing) {
      this.placeAt(s.placing, w);
      if (!e.shiftKey) {
        s.placing = null;
        s.emit('tool');
      }
      return;
    }

    const pt = this.pathPointAt(w);
    if (pt) {
      this.drag = { kind: 'point', id: pt.id, index: pt.index, before: s.snapshot() };
      return;
    }
    const handle = this.handleAt(w);
    if (handle) {
      const o = s.selectedObjects()[0];
      this.drag = { kind: 'resize', handle, start: w, before: s.snapshot(), orig: { x: o.x, y: o.y, w: o.width, h: o.height }, id: o.id };
      return;
    }
    const hit = this.hitTest(w);
    if (hit) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        s.toggleSelect(hit);
        if (!s.selection.has(hit)) return;
      } else if (!s.selection.has(hit)) s.select([hit]);
      const origin = new Map<string, Point>();
      for (const id of s.selection) {
        if (id === SPAWN_ID) origin.set(id, { ...s.level.spawn });
        else if (id === GOAL_ID) origin.set(id, { ...s.level.goal });
        else {
          const o = s.getObject(id);
          if (o) origin.set(id, { x: o.x, y: o.y });
        }
      }
      this.drag = { kind: 'move', start: w, before: s.snapshot(), origin, moved: false };
      return;
    }
    this.drag = { kind: 'marquee', start: w, now: w, additive: e.shiftKey || e.ctrlKey || e.metaKey };
    if (!this.drag.additive) s.clearSelection();
  }

  private onMove(e: PointerEvent): void {
    const { sx, sy, w } = this.eventPoint(e);
    const s = this.state;
    s.cursor = { x: Math.round(w.x), y: Math.round(w.y) };
    const d = this.drag;
    if (!d) {
      const h = this.hitTest(w);
      const cur = s.placing || s.pickingTargetFor ? 'crosshair' : this.handleAt(w) ? 'nwse-resize' : h ? 'move' : this.spaceDown ? 'grab' : 'default';
      this.el.style.cursor = cur;
      if (h !== this.hover) {
        this.hover = h;
        this.requestDraw();
      }
      if (s.placing) this.requestDraw();
      s.emit('view');
      return;
    }
    switch (d.kind) {
      case 'pan':
        s.panX = d.px + (sx - d.sx);
        s.panY = d.py + (sy - d.sy);
        s.emit('view');
        break;
      case 'move': {
        let dx = w.x - d.start.x;
        let dy = w.y - d.start.y;
        if (!d.moved && Math.hypot(dx, dy) * s.zoom < 3) return;
        d.moved = true;
        if (s.snap) {
          dx = Math.round(dx / s.grid) * s.grid;
          dy = Math.round(dy / s.grid) * s.grid;
        } else {
          dx = Math.round(dx);
          dy = Math.round(dy);
        }
        for (const [id, o] of d.origin) {
          if (id === SPAWN_ID) s.level.spawn = { x: o.x + dx, y: o.y + dy };
          else if (id === GOAL_ID) s.level.goal = { x: o.x + dx, y: o.y + dy };
          else {
            const obj = s.getObject(id);
            if (obj) {
              obj.x = o.x + dx;
              obj.y = o.y + dy;
            }
          }
        }
        s.emit('view');
        this.requestDraw();
        break;
      }
      case 'resize':
        this.applyResize(d, w);
        break;
      case 'marquee':
        d.now = w;
        this.requestDraw();
        break;
      case 'point': {
        const o = s.getObject(d.id);
        if (!o) return;
        const pts = (o.properties.points as Point[]).map((p) => ({ ...p }));
        pts[d.index] = { x: s.snapValue(w.x - o.x - o.width / 2), y: s.snapValue(w.y - o.y - o.height / 2) };
        o.properties.points = pts;
        this.requestDraw();
        break;
      }
    }
  }

  private applyResize(d: Extract<Drag, { kind: 'resize' }>, w: Point): void {
    const s = this.state;
    const o = s.getObject(d.id);
    if (!o) return;
    const def = OBJECT_DEFS[o.type];
    const minW = def.minWidth ?? 8;
    const minH = def.minHeight ?? 8;
    let { x, y, w: ww, h } = d.orig;
    const right = x + ww;
    const bottom = y + h;
    const px = s.snapValue(w.x);
    const py = s.snapValue(w.y);
    if (d.handle.includes('e')) ww = Math.max(minW, px - x);
    if (d.handle.includes('s')) h = Math.max(minH, py - y);
    if (d.handle.includes('w')) {
      x = Math.min(px, right - minW);
      ww = right - x;
    }
    if (d.handle.includes('n')) {
      y = Math.min(py, bottom - minH);
      h = bottom - y;
    }
    o.x = x;
    o.y = y;
    o.width = ww;
    o.height = h;
    s.emit('view');
    this.requestDraw();
  }

  private onUp(e: PointerEvent): void {
    const d = this.drag;
    this.drag = null;
    this.el.releasePointerCapture(e.pointerId);
    const s = this.state;
    if (!d) return;
    if (d.kind === 'move' || d.kind === 'resize' || d.kind === 'point') {
      s.commitLive(d.before);
      s.emit('selection');
    } else if (d.kind === 'marquee') {
      const x0 = Math.min(d.start.x, d.now.x);
      const y0 = Math.min(d.start.y, d.now.y);
      const x1 = Math.max(d.start.x, d.now.x);
      const y1 = Math.max(d.start.y, d.now.y);
      if (x1 - x0 < 2 && y1 - y0 < 2) return;
      const ids = s.level.objects
        .filter((o) => {
          const b = objectBounds(o);
          return b.x >= x0 && b.y >= y0 && b.x + b.w <= x1 && b.y + b.h <= y1;
        })
        .map((o) => o.id);
      s.select(ids, d.additive);
    }
    this.requestDraw();
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const { sx, sy } = this.eventPoint(e);
    if (e.ctrlKey || e.metaKey || !e.shiftKey) {
      // mouse wheel / pinch: zoom around the cursor
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      this.zoomAt(factor, sx, sy);
    } else {
      this.state.panX -= e.deltaY || e.deltaX;
      this.state.emit('view');
    }
  }

  private onDblClick(e: MouseEvent): void {
    // double-click on a path platform adds a point
    const { w } = this.eventPoint(e);
    const s = this.state;
    const sel = s.selectedObjects();
    if (sel.length === 1 && sel[0].type === 'pathPlatform') {
      const o = sel[0];
      s.mutate(() => {
        const pts = (o.properties.points as Point[]).map((p) => ({ ...p }));
        pts.push({ x: s.snapValue(w.x - o.x - o.width / 2), y: s.snapValue(w.y - o.y - o.height / 2) });
        o.properties.points = pts;
      });
    }
  }

  placeAt(type: ObjectType, w: Point): LevelObject {
    const s = this.state;
    const def = OBJECT_DEFS[type];
    const x = s.snapValue(w.x - (def.defaultWidth >= s.grid ? 0 : def.defaultWidth / 2));
    const y = s.snapValue(w.y - (def.defaultHeight >= s.grid ? 0 : def.defaultHeight / 2));
    return s.addObject(type, x, y);
  }

  // ───────────────────────── drawing
  requestDraw(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw();
    });
  }

  private draw(): void {
    const ctx = this.ctx;
    const s = this.state;
    const l = s.level;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#0a0910';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    ctx.setTransform(this.dpr * s.zoom, 0, 0, this.dpr * s.zoom, this.dpr * s.panX, this.dpr * s.panY);

    // level area
    const g = ctx.createLinearGradient(0, 0, 0, l.height);
    g.addColorStop(0, '#15112a');
    g.addColorStop(1, '#2a2040');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, l.width, l.height);

    // grid
    if (s.showGrid && s.grid * s.zoom >= 5) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1 / s.zoom;
      ctx.beginPath();
      const x0 = Math.max(0, Math.floor(-s.panX / s.zoom / s.grid) * s.grid);
      const x1 = Math.min(l.width, (this.viewWidth - s.panX) / s.zoom);
      const y0 = Math.max(0, Math.floor(-s.panY / s.zoom / s.grid) * s.grid);
      const y1 = Math.min(l.height, (this.viewHeight - s.panY) / s.zoom);
      for (let x = x0; x <= x1; x += s.grid) {
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
      }
      for (let y = y0; y <= y1; y += s.grid) {
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
      }
      ctx.stroke();
    }

    // objects: decorations (back) first, then the rest in array order, front decorations last
    const objs = l.objects;
    const layers = [
      objs.filter((o) => o.type === 'decoration' && o.properties.layer !== 'front'),
      objs.filter((o) => o.type !== 'decoration'),
      objs.filter((o) => o.type === 'decoration' && o.properties.layer === 'front'),
    ];
    for (const layer of layers) for (const o of layer) drawObject(ctx, this.art, o, l.background, s.zoom, s.selection.has(o.id));
    drawMarker(ctx, this.art, 'goal', l.goal);
    drawMarker(ctx, this.art, 'spawn', l.spawn);

    // links
    ctx.save();
    ctx.lineWidth = 2 / s.zoom;
    for (const o of objs) {
      const t = o.properties.targets;
      if (!Array.isArray(t)) continue;
      for (const id of t as string[]) {
        const target = s.getObject(id);
        if (!target) continue;
        const active = s.selection.has(o.id) || s.selection.has(id);
        ctx.strokeStyle = active ? 'rgba(242,178,90,0.95)' : 'rgba(232,145,58,0.35)';
        ctx.setLineDash([8 / s.zoom, 5 / s.zoom]);
        const ax = o.x + o.width / 2;
        const ay = o.y + o.height / 2;
        const bx = target.x + target.width / 2;
        const by = target.y + target.height / 2;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - 60, bx, by);
        ctx.stroke();
      }
    }
    ctx.restore();

    // level border
    ctx.strokeStyle = 'rgba(232,145,58,0.6)';
    ctx.lineWidth = 2 / s.zoom;
    ctx.setLineDash([]);
    ctx.strokeRect(0, 0, l.width, l.height);

    // hover + selection outlines
    const outline = (b: { x: number; y: number; w: number; h: number }, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 / s.zoom;
      ctx.strokeRect(b.x - 1 / s.zoom, b.y - 1 / s.zoom, b.w + 2 / s.zoom, b.h + 2 / s.zoom);
    };
    if (this.hover && !s.selection.has(this.hover)) {
      const o = s.getObject(this.hover);
      if (o) outline(objectBounds(o), 'rgba(255,255,255,0.35)');
      else if (this.hover === SPAWN_ID || this.hover === GOAL_ID) outline(this.markerRect(this.hover), 'rgba(255,255,255,0.35)');
    }
    for (const id of s.selection) {
      const o = s.getObject(id);
      const b = o ? objectBounds(o) : id === SPAWN_ID || id === GOAL_ID ? this.markerRect(id) : null;
      if (!b) continue;
      outline(b, '#f2b25a');
      if (o && s.selection.size === 1) {
        const def = OBJECT_DEFS[o.type];
        if (def.resize !== 'none') {
          const r = HANDLE_PX / 2 / s.zoom;
          ctx.fillStyle = '#f2b25a';
          for (const [, hx, hy] of this.handlePositions(b, def.resize)) ctx.fillRect(hx - r, hy - r, r * 2, r * 2);
        }
        if (o.type === 'pathPlatform') {
          const pts = o.properties.points as Point[];
          ctx.fillStyle = '#e8913a';
          pts.forEach((p, i) => {
            if (i === 0) return;
            ctx.beginPath();
            ctx.arc(o.x + p.x + o.width / 2, o.y + p.y + o.height / 2, 6 / s.zoom, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }
    }

    // marquee
    if (this.drag?.kind === 'marquee') {
      const d = this.drag;
      ctx.fillStyle = 'rgba(232,145,58,0.08)';
      ctx.strokeStyle = 'rgba(232,145,58,0.8)';
      ctx.lineWidth = 1 / s.zoom;
      const x = Math.min(d.start.x, d.now.x);
      const y = Math.min(d.start.y, d.now.y);
      const w = Math.abs(d.now.x - d.start.x);
      const h = Math.abs(d.now.y - d.start.y);
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    }

    // placement ghost
    if (s.placing) {
      const def = OBJECT_DEFS[s.placing];
      const x = s.snapValue(s.cursor.x - (def.defaultWidth >= s.grid ? 0 : def.defaultWidth / 2));
      const y = s.snapValue(s.cursor.y - (def.defaultHeight >= s.grid ? 0 : def.defaultHeight / 2));
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = def.editorColor;
      ctx.fillRect(x, y, def.defaultWidth, def.defaultHeight);
      ctx.globalAlpha = 1;
    }
  }
}
