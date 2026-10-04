/** Minimal DOM helpers (no framework). */
type Attrs = Record<string, string | number | boolean | EventListener | undefined | null>;
type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

function append(el: HTMLElement, children: (Child | Child[])[]): void {
  for (const c of children) {
    if (Array.isArray(c)) append(el, c);
    else if (c === null || c === undefined || c === false) continue;
    else el.append(c instanceof Node ? c : String(c));
  }
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Up/down (and left/right) arrow keys move focus between buttons in a container. */
export function enableArrowNav(container: HTMLElement, selector = 'button:not([disabled]), a.menu-btn'): () => void {
  const onKey = (ev: KeyboardEvent) => {
    if (!container.isConnected || container.closest('.hidden') || container.querySelector('.map-screen')) return;
    const items = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((e) => e.offsetParent !== null);
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') next = idx < 0 ? 0 : (idx + 1) % items.length;
    if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') next = idx < 0 ? 0 : (idx - 1 + items.length) % items.length;
    if (next >= 0) {
      ev.preventDefault();
      items[next].focus();
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

let toastHost: HTMLElement | null = null;
export function toast(message: string, kind: 'info' | 'error' = 'info', ms = 2600): void {
  if (!toastHost) {
    toastHost = h('div', { class: 'toast-host' });
    document.body.append(toastHost);
  }
  const t = h('div', { class: `toast ${kind === 'error' ? 'error' : ''}` }, message);
  toastHost.append(t);
  setTimeout(() => t.remove(), ms);
}

export interface ModalButton {
  label: string;
  primary?: boolean;
  danger?: boolean;
  onClick?: () => void | boolean; // return false to keep open
}

export function modal(title: string, body: Node | string, buttons: ModalButton[]): () => void {
  const backdrop = h('div', { class: 'modal-backdrop' });
  const close = () => backdrop.remove();
  const box = h(
    'div',
    { class: 'modal', role: 'dialog' },
    h('h2', {}, title),
    typeof body === 'string' ? h('div', {}, body) : body,
    h(
      'div',
      { class: 'actions' },
      buttons.map((b) =>
        h(
          'button',
          {
            class: `btn ${b.primary ? 'primary' : ''} ${b.danger ? 'danger' : ''}`,
            onclick: () => {
              if (b.onClick?.() !== false) close();
            },
          },
          b.label,
        ),
      ),
    ),
  );
  backdrop.append(box);
  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close();
  });
  document.body.append(backdrop);
  (box.querySelector('.btn.primary') as HTMLElement | null)?.focus();
  return close;
}

export function confirmModal(title: string, text: string, confirmLabel: string, onConfirm: () => void, danger = true): void {
  modal(title, text, [
    { label: 'Cancel' },
    { label: confirmLabel, primary: !danger, danger, onClick: onConfirm },
  ]);
}

export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback for non-secure contexts
    const ta = h('textarea', { style: 'position:fixed;opacity:0' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export function pickFile(accept = '.json,application/json'): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept, style: 'display:none' });
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      resolve({ name: f.name, text: await f.text() });
      input.remove();
    });
    document.body.append(input);
    input.click();
  });
}
