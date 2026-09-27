import { loadSettings } from '../game/systems/Settings';
import { h } from './dom';

/** Buttons currently held on the on-screen pad (read by InputSystem). */
export const touchState = { left: false, right: false, down: false, jump: false, dash: false };
type Btn = keyof typeof touchState;

export function isTouchDevice(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  } catch {
    return false;
  }
}

export function touchControlsWanted(): boolean {
  const mode = loadSettings().onScreenControls;
  return mode === 'on' || (mode === 'auto' && isTouchDevice());
}

/**
 * On-screen control pad: ◀ ▶ ▼ on the left, Jump (and Dash when the level
 * has it) on the right. Supports multi-touch; sliding a finger from one
 * button to a neighbour switches buttons.
 */
export class TouchControls {
  readonly el: HTMLElement;
  private buttons: { el: HTMLElement; btn: Btn }[] = [];
  private active = new Map<number, Btn>();

  constructor(opts: { dash: boolean }) {
    const make = (btn: Btn, label: string, cls: string) => {
      const el = h('div', { class: `tc-btn ${cls}`, 'aria-label': btn }, label);
      this.buttons.push({ el, btn });
      return el;
    };
    this.el = h(
      'div',
      { class: 'touch-controls' },
      h('div', { class: 'tc-group tc-left' }, make('left', '◀', 'tc-dir'), make('down', '▼', 'tc-dir'), make('right', '▶', 'tc-dir')),
      h('div', { class: 'tc-group tc-right' }, opts.dash ? make('dash', 'DASH', 'tc-action tc-dash') : null, make('jump', 'JUMP', 'tc-action tc-jump')),
    );
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const) {
      this.el.addEventListener(t, (e) => this.onPointer(e as PointerEvent), { passive: false });
    }
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
    this.reset();
  }

  private hit(x: number, y: number): Btn | null {
    for (const b of this.buttons) {
      const r = b.el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return b.btn;
    }
    return null;
  }

  private onPointer(e: PointerEvent): void {
    e.preventDefault();
    if (e.type === 'pointerup' || e.type === 'pointercancel') this.active.delete(e.pointerId);
    else if (e.type === 'pointerdown' || this.active.has(e.pointerId)) {
      const b = this.hit(e.clientX, e.clientY);
      if (b) this.active.set(e.pointerId, b);
      else if (e.type === 'pointermove') this.active.delete(e.pointerId);
      // let the finger slide onto neighbouring buttons
      if (e.type === 'pointerdown') {
        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* not captured */
        }
      }
    }
    this.sync();
  }

  private sync(): void {
    const held = new Set(this.active.values());
    for (const k of Object.keys(touchState) as Btn[]) touchState[k] = held.has(k);
    for (const b of this.buttons) b.el.classList.toggle('held', held.has(b.btn));
  }

  reset(): void {
    this.active.clear();
    this.sync();
  }

  destroy(): void {
    this.reset();
    this.el.remove();
  }
}
