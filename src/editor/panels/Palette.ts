import { ALL_OBJECT_DEFS, CATEGORY_ORDER, type ObjectCategory } from '../../game/levels/objectTypes';
import type { ObjectType } from '../../game/levels/schema';
import { h } from '../../ui/dom';
import type { EditorCanvas } from '../canvas/EditorCanvas';
import type { EditorState } from '../EditorState';

const CATEGORY_LABEL: Record<ObjectCategory, string> = {
  terrain: 'Terrain',
  platforms: 'Platforms',
  hazards: 'Hazards',
  switches: 'Switches & Doors',
  enemies: 'Enemies',
  items: 'Items',
  scenery: 'Scenery',
};

/** Left panel: click an item to arm placement, or drag it onto the canvas. */
export class Palette {
  readonly el: HTMLElement;
  private buttons = new Map<ObjectType, HTMLElement>();
  private dragGhost: HTMLElement | null = null;

  constructor(
    private state: EditorState,
    private canvas: EditorCanvas,
  ) {
    const filter = h('input', { type: 'text', placeholder: 'Filter objects…', class: 'pal-filter' });
    const list = h('div', { class: 'pal-list' });
    for (const cat of CATEGORY_ORDER) {
      const defs = ALL_OBJECT_DEFS.filter((d) => d.category === cat && !d.hidden);
      const group = h('div', { class: 'pal-group' }, h('div', { class: 'pal-cat' }, CATEGORY_LABEL[cat]));
      for (const d of defs) {
        const btn = h(
          'button',
          { class: 'pal-item', title: d.description, 'data-type': d.type },
          h('span', { class: 'pal-swatch', style: `background:${d.editorColor}` }),
          d.label,
        );
        btn.addEventListener('pointerdown', (e) => this.startDrag(e, d.type));
        this.buttons.set(d.type, btn);
        group.append(btn);
      }
      list.append(group);
    }
    filter.addEventListener('input', () => {
      const q = filter.value.toLowerCase();
      for (const [type, btn] of this.buttons) {
        const d = ALL_OBJECT_DEFS.find((x) => x.type === type)!;
        btn.style.display = !q || d.label.toLowerCase().includes(q) || type.toLowerCase().includes(q) ? '' : 'none';
      }
    });
    this.el = h('div', { class: 'ed-palette' }, h('div', { class: 'panel-title' }, 'Objects'), filter, list, h('div', { class: 'pal-hint' }, 'Click to place (Shift = keep placing), or drag onto the level.'));
    state.on((r) => {
      if (r === 'tool' || r === 'load') this.refresh();
    });
  }

  private refresh(): void {
    for (const [type, btn] of this.buttons) btn.classList.toggle('active', this.state.placing === type);
  }

  private startDrag(e: PointerEvent, type: ObjectType): void {
    if (e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    let dragging = false;
    const move = (ev: PointerEvent) => {
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
        dragging = true;
        this.dragGhost = h('div', { class: 'pal-ghost' }, ALL_OBJECT_DEFS.find((d) => d.type === type)!.label);
        document.body.append(this.dragGhost);
      }
      if (dragging && this.dragGhost) {
        this.dragGhost.style.left = `${ev.clientX + 10}px`;
        this.dragGhost.style.top = `${ev.clientY + 10}px`;
      }
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      this.dragGhost?.remove();
      this.dragGhost = null;
      if (dragging) {
        const w = this.canvas.clientToWorld(ev.clientX, ev.clientY);
        if (w) this.canvas.placeAt(type, w);
      } else {
        this.state.placing = this.state.placing === type ? null : type;
        this.state.pickingTargetFor = null;
        this.state.emit('tool');
        this.canvas.el.focus();
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
}
