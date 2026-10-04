import type { BuiltinLevelEntry } from '../game/levels/registry';
import { EXAM_CHAPTER, WORLDS, type WorldInfo } from '../game/levels/worlds';
import { playerTextures } from '../game/render/art/characters';
import { dataUri } from '../game/render/art/svg';
import { Audio } from '../game/systems/AudioSystem';
import { formatTime, getRecord, isUnlocked, type ProgressData } from '../game/systems/SaveSystem';
import { h } from './dom';

/**
 * The world map: every level is a stop on one long winding road.
 * Drag to pan, scroll / pinch / +− to zoom, click a level to walk there,
 * click it again (or press Enter / Play) to play it. Arrow keys walk the
 * lantern-bearer along the road.
 */

export interface MapOptions {
  levels: BuiltinLevelEntry[];
  progress: ProgressData;
  unlockAll: boolean;
  /** Level the walker starts on (defaults to the next level to play). */
  startLevelId?: string;
  onPlay(entry: BuiltinLevelEntry): void;
  onList(): void;
  onBack(): void;
}

interface Node {
  entry: BuiltinLevelEntry;
  world: WorldInfo;
  x: number;
  y: number;
  boss: boolean;
  open: boolean;
  done: boolean;
  relics: number;
  relicsFound: number;
}

interface Zone {
  world: WorldInfo;
  x: number;
  y: number;
  w: number;
  h: number;
  nodes: Node[];
}

const ZONE_W = 620;
const ZONE_H = 380;
const GAP_X = 120;
const GAP_Y = 150;
const PER_ROW = 4;

const ICONS: Record<string, string[]> = {
  'old-town': ['🎃', '🏠', '🏮'],
  graveyard: ['🪦', '⚰️', '🕯️'],
  'dead-woods': ['🌲', '🦉', '🍂'],
  'haunted-manor': ['🏚️', '👻', '🕯️'],
  catacombs: ['💀', '🦴', '🧪'],
  clocktower: ['🕰️', '⚙️', '🔔'],
  'black-castle': ['🏰', '🦇', '🌕'],
  'frozen-hollow': ['❄️', '⛄', '🌨️'],
  'candy-carnival': ['🍭', '🎡', '🍬'],
  'witch-swamp': ['🧙', '🐸', '🍄'],
  'ghost-harbor': ['⚓', '⛵', '🦜'],
  'lava-crypt': ['🌋', '🔥', '💎'],
  'sky-ruins': ['☁️', '🏛️', '🌈'],
  'toy-factory': ['🧸', '🪀', '🎁'],
  'mirror-manor': ['🪞', '💠', '🕯️'],
  'moon-garden': ['🌙', '🌸', '🦋'],
  'nightmare-realm': ['👁️', '🌀', '🕸️'],
};

function hashRand(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function buildLayout(o: MapOptions): { zones: Zone[]; nodes: Node[] } {
  const ids = o.levels.map((e) => e.level.id);
  const zones: Zone[] = [];
  const nodes: Node[] = [];
  const worlds = WORLDS.map((w) => ({ w, levels: o.levels.filter((e) => e.level.world === w.id) })).filter((g) => g.levels.length);
  const examCount = worlds.filter((g) => g.w.chapter === EXAM_CHAPTER).length;
  worlds.forEach((g, zi) => {
    // the exam fills its own rows; the worlds after it start on a fresh row
    const slot = zi < examCount ? zi : Math.ceil(examCount / PER_ROW) * PER_ROW + (zi - examCount);
    const row = Math.floor(slot / PER_ROW);
    const colRaw = slot % PER_ROW;
    const reversed = row % 2 === 1;
    const col = reversed ? PER_ROW - 1 - colRaw : colRaw;
    const zone: Zone = { world: g.w, x: col * (ZONE_W + GAP_X), y: row * (ZONE_H + GAP_Y), w: ZONE_W, h: ZONE_H, nodes: [] };
    const n = g.levels.length;
    g.levels.forEach((e, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const tt = reversed ? 1 - t : t;
      const x = zone.x + 60 + tt * (ZONE_W - 120);
      const y = zone.y + ZONE_H / 2 + Math.sin(t * Math.PI * 2.5 + zi) * ZONE_H * 0.26;
      const rec = getRecord(o.progress, e.level.id);
      const relics = e.level.objects.filter((x) => x.type === 'relic').length;
      const node: Node = {
        entry: e,
        world: g.w,
        x,
        y,
        boss: e.level.objects.some((x) => x.type === 'boss'),
        open: isUnlocked(o.progress, ids, e.index, o.unlockAll),
        done: rec.completed,
        relics,
        relicsFound: rec.relics.length,
      };
      zone.nodes.push(node);
      nodes.push(node);
    });
    zones.push(zone);
  });
  return { zones, nodes };
}

export function mapScreen(o: MapOptions): HTMLElement {
  const { zones, nodes } = buildLayout(o);
  const bounds = {
    x0: Math.min(...zones.map((z) => z.x)) - 160,
    y0: Math.min(...zones.map((z) => z.y)) - 200,
    x1: Math.max(...zones.map((z) => z.x + z.w)) + 160,
    y1: Math.max(...zones.map((z) => z.y + z.h)) + 160,
  };
  const examZones = zones.filter((z) => z.world.chapter === EXAM_CHAPTER);

  // where the walker starts
  const firstOpen = nodes.findIndex((n) => n.open && !n.done);
  let at = Math.max(0, nodes.findIndex((n) => n.entry.level.id === o.startLevelId));
  if (!o.startLevelId || at < 0 || !nodes[at]?.open) at = firstOpen >= 0 ? firstOpen : nodes.length - 1;
  let walker = { x: nodes[at].x, y: nodes[at].y };
  /** queue of node indices still to walk through */
  let route: number[] = [];
  let playWhenArrived = false;

  const canvas = h('canvas', { class: 'map-canvas' });
  const info = h('div', { class: 'map-info' });
  const stats = (() => {
    const done = nodes.filter((n) => n.done).length;
    const rel = nodes.reduce((s, n) => s + n.relicsFound, 0);
    const relT = nodes.reduce((s, n) => s + n.relics, 0);
    return `${done}/${nodes.length} cleared · ◆ ${rel}/${relT}`;
  })();
  const btn = (label: string, title: string, fn: () => void, cls = '') =>
    h(
      'button',
      {
        class: `map-btn ${cls}`,
        title,
        onclick: (ev: Event) => {
          ev.stopPropagation();
          Audio.playSfx('ui');
          fn();
        },
      },
      label,
    );

  // camera (map units → screen: (p - cam) * zoom + center)
  let zoom = 0.8;
  let cam = { x: walker.x, y: walker.y };
  let follow = true;

  const el = h(
    'div',
    { class: 'screen map-screen' },
    canvas,
    h(
      'div',
      { class: 'map-top' },
      btn('‹ Back', 'Back to the title screen', () => o.onBack()),
      h('div', { class: 'map-title' }, h('span', {}, 'World Map'), h('small', {}, stats)),
      h(
        'div',
        { class: 'map-tools' },
        btn('−', 'Zoom out', () => zoomBy(1 / 1.3)),
        btn('+', 'Zoom in', () => zoomBy(1.3)),
        btn('◎', 'Find me', () => {
          follow = true;
        }),
        btn('☰', 'List of levels', () => o.onList()),
      ),
    ),
    info,
  );

  const zoomBy = (f: number, sx?: number, sy?: number) => {
    const r = canvas.getBoundingClientRect();
    const px = sx ?? r.width / 2;
    const py = sy ?? r.height / 2;
    const before = toMap(px, py);
    zoom = Math.max(0.18, Math.min(2.6, zoom * f));
    const after = toMap(px, py);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
  };
  const toMap = (sx: number, sy: number) => {
    const r = canvas.getBoundingClientRect();
    return { x: (sx - r.width / 2) / zoom + cam.x, y: (sy - r.height / 2) / zoom + cam.y };
  };

  // ── selection / walking
  const selected = () => nodes[route.length ? route[route.length - 1] : at];
  const updateInfo = () => {
    const n = selected();
    const lvl = n.entry.level;
    const rec = getRecord(o.progress, lvl.id);
    info.replaceChildren(
      h('div', { class: 'map-info-world', style: `color:${n.world.accent}` }, `${n.world.chapter ? `${n.world.chapter} · ` : ''}World ${n.world.index} · ${n.world.name}`),
      h('div', { class: 'map-info-name' }, `${n.world.index}-${lvl.order}  ${n.open ? lvl.name : '???'}${n.boss ? '  👑' : ''}`),
      h(
        'div',
        { class: 'map-info-meta' },
        !n.open ? 'Locked: clear the level before it' : rec.bestTime !== null ? `Best ${formatTime(rec.bestTime)}` : 'Not cleared yet',
        n.relics ? `  ·  ◆ ${n.relicsFound}/${n.relics}` : '',
      ),
      n.open ? btn('▶ Play', 'Play this level', () => play(), 'play') : '',
    );
  };
  const walkTo = (target: number) => {
    if (!nodes[target]?.open) return;
    const from = route.length ? route[route.length - 1] : at;
    route = [];
    const step = target > from ? 1 : -1;
    for (let i = from + step; step > 0 ? i <= target : i >= target; i += step) route.push(i);
    follow = true;
    updateInfo();
  };
  const play = () => {
    if (route.length) {
      playWhenArrived = true;
      return;
    }
    const n = nodes[at];
    if (!n.open) return;
    Audio.playSfx('uiConfirm');
    cleanup();
    o.onPlay(n.entry);
  };

  // ── input
  const ac = new AbortController();
  const sig = { signal: ac.signal };
  const cleanup = () => ac.abort();
  window.addEventListener(
    'keydown',
    (ev) => {
      if (!el.isConnected) return cleanup();
      const k = ev.key;
      const cur = route.length ? route[route.length - 1] : at;
      if (['ArrowRight', 'ArrowUp', 'd', 'D', 'w', 'W'].includes(k)) {
        if (nodes[cur + 1]?.open) walkTo(cur + 1);
        ev.preventDefault();
      } else if (['ArrowLeft', 'ArrowDown', 'a', 'A', 's', 'S'].includes(k)) {
        if (cur > 0) walkTo(cur - 1);
        ev.preventDefault();
      } else if (k === 'Enter' || k === ' ' || k === 'j' || k === 'J') {
        play();
        ev.preventDefault();
      } else if (k === 'Escape' || k === 'Backspace') {
        cleanup();
        o.onBack();
      } else if (k === '+' || k === '=') zoomBy(1.2);
      else if (k === '-' || k === '_') zoomBy(1 / 1.2);
      else if (k === 'PageDown') {
        // jump to the next world
        const w = nodes[cur].world.index;
        const nx = nodes.findIndex((n) => n.world.index > w && n.open);
        if (nx >= 0) walkTo(nx);
      } else if (k === 'PageUp') {
        const w = nodes[cur].world.index;
        const pv = nodes.findIndex((n) => n.world.index === w - 1);
        if (pv >= 0) walkTo(pv);
      }
    },
    sig,
  );

  const pointers = new Map<number, { x: number; y: number }>();
  let dragDist = 0;
  let pinchStart: { d: number; zoom: number } | null = null;
  canvas.addEventListener(
    'pointerdown',
    (ev) => {
      canvas.setPointerCapture(ev.pointerId);
      pointers.set(ev.pointerId, { x: ev.offsetX, y: ev.offsetY });
      dragDist = 0;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      }
    },
    sig,
  );
  canvas.addEventListener(
    'pointermove',
    (ev) => {
      const p = pointers.get(ev.pointerId);
      if (!p) return;
      const dx = ev.offsetX - p.x;
      const dy = ev.offsetY - p.y;
      p.x = ev.offsetX;
      p.y = ev.offsetY;
      if (pointers.size === 2 && pinchStart) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const target = Math.max(0.18, Math.min(2.6, (pinchStart.zoom * d) / Math.max(1, pinchStart.d)));
        zoomBy(target / zoom, (a.x + b.x) / 2, (a.y + b.y) / 2);
        dragDist += 10;
        return;
      }
      dragDist += Math.abs(dx) + Math.abs(dy);
      if (dragDist > 6) {
        follow = false;
        cam.x -= dx / zoom;
        cam.y -= dy / zoom;
      }
    },
    sig,
  );
  const up = (ev: PointerEvent) => {
    const wasTap = pointers.size === 1 && dragDist <= 6;
    pointers.delete(ev.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (!wasTap) return;
    const m = toMap(ev.offsetX, ev.offsetY);
    let best = -1;
    let bestD = 30 / Math.min(1, zoom);
    nodes.forEach((n, i) => {
      const d = Math.hypot(n.x - m.x, n.y - m.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best < 0) return;
    if (!nodes[best].open) return;
    const cur = route.length ? route[route.length - 1] : at;
    if (best === cur) play();
    else {
      Audio.playSfx('ui');
      walkTo(best);
    }
  };
  canvas.addEventListener('pointerup', up, sig);
  canvas.addEventListener('pointercancel', (ev) => pointers.delete(ev.pointerId), sig);
  canvas.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault();
      zoomBy(Math.exp(-ev.deltaY * 0.0015), ev.offsetX, ev.offsetY);
    },
    { passive: false, signal: ac.signal },
  );

  // ── drawing
  const walkerImg = new Image();
  const poses = playerTextures();
  const idle = poses.find((t) => t.key === 'player-idle0')!;
  const run = [poses.find((t) => t.key === 'player-run0')!, poses.find((t) => t.key === 'player-run2')!];
  const imgs = new Map<string, HTMLImageElement>();
  for (const t of [idle, ...run]) {
    const im = new Image();
    im.src = dataUri(t.svg);
    imgs.set(t.key, im);
  }
  walkerImg.src = dataUri(idle.svg);
  let facing = 1;
  let walking = false;

  const stars = (() => {
    const r = hashRand(7);
    return Array.from({ length: 400 }, () => ({ x: bounds.x0 + r() * (bounds.x1 - bounds.x0), y: bounds.y0 + r() * (bounds.y1 - bounds.y0), s: 0.5 + r() * 1.6, p: r() * 6 }));
  })();
  const decor = zones.map((z, zi) => {
    const r = hashRand(100 + zi);
    const icons = ICONS[z.world.id] ?? ['✨'];
    return Array.from({ length: 9 }, (_, i) => ({ x: z.x + 30 + r() * (z.w - 60), y: z.y + 30 + r() * (z.h - 60), icon: icons[i % icons.length], s: 18 + r() * 14 }));
  });

  let last = performance.now();
  let time = 0;
  const frame = (now: number) => {
    if (!el.isConnected) {
      // not mounted yet, or gone for good
      if (ac.signal.aborted) return;
      if (time > 0) return cleanup();
      requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    // walk
    walking = false;
    if (route.length) {
      const target = nodes[route[0]];
      const dx = target.x - walker.x;
      const dy = target.y - walker.y;
      const d = Math.hypot(dx, dy);
      const speed = 520 + route.length * 90;
      if (Math.abs(dx) > 1) facing = dx > 0 ? 1 : -1;
      if (d <= speed * dt) {
        walker = { x: target.x, y: target.y };
        at = route.shift()!;
        if (!route.length) {
          updateInfo();
          if (playWhenArrived) {
            playWhenArrived = false;
            play();
            return;
          }
        }
      } else {
        walker.x += (dx / d) * speed * dt;
        walker.y += (dy / d) * speed * dt;
        walking = true;
      }
    }
    if (follow) {
      const k = 1 - Math.exp(-dt * 6);
      cam.x += (walker.x - cam.x) * k;
      cam.y += (walker.y - cam.y) * k;
    }
    cam.x = Math.max(bounds.x0, Math.min(bounds.x1, cam.x));
    cam.y = Math.max(bounds.y0, Math.min(bounds.y1, cam.y));

    draw();
    requestAnimationFrame(frame);
  };

  const draw = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    const c = canvas.getContext('2d')!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#0b0918');
    g.addColorStop(1, '#1c1430');
    c.fillStyle = g;
    c.fillRect(0, 0, cw, ch);
    c.save();
    c.translate(cw / 2, ch / 2);
    c.scale(zoom, zoom);
    c.translate(-cam.x, -cam.y);

    // stars
    for (const s of stars) {
      c.globalAlpha = 0.35 + 0.35 * Math.sin(time * 1.5 + s.p);
      c.fillStyle = '#e8e0ff';
      c.fillRect(s.x, s.y, s.s / zoom ** 0.3, s.s / zoom ** 0.3);
    }
    c.globalAlpha = 1;

    // the exam chapter: one big region around its seven worlds
    if (examZones.length) {
      const ex0 = Math.min(...examZones.map((z) => z.x)) - 50;
      const ey0 = Math.min(...examZones.map((z) => z.y)) - 110;
      const ex1 = Math.max(...examZones.map((z) => z.x + z.w)) + 50;
      const ey1 = Math.max(...examZones.map((z) => z.y + z.h)) + 50;
      c.fillStyle = 'rgba(232,145,58,0.06)';
      c.strokeStyle = 'rgba(242,178,90,0.5)';
      c.lineWidth = 4;
      c.setLineDash([18, 12]);
      roundRect(c, ex0, ey0, ex1 - ex0, ey1 - ey0, 60);
      c.fill();
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#f2b25a';
      c.font = 'bold 54px Palatino, Georgia, serif';
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
      c.fillText(`📝 ${EXAM_CHAPTER.toUpperCase()}`, ex0 + 40, ey0 + 70);
      const examDone = nodes.filter((n) => n.world.chapter === EXAM_CHAPTER);
      c.font = '26px Palatino, Georgia, serif';
      c.fillStyle = '#c9b48a';
      c.fillText(`${examDone.filter((n) => n.done).length}/${examDone.length} passed`, ex0 + 44, ey0 + 102);
    }

    // zones
    zones.forEach((z, zi) => {
      const anyOpen = z.nodes.some((n) => n.open);
      c.globalAlpha = anyOpen ? 1 : 0.45;
      const zg = c.createLinearGradient(z.x, z.y, z.x, z.y + z.h);
      zg.addColorStop(0, hexA(z.world.accent, 0.22));
      zg.addColorStop(1, hexA(z.world.accent, 0.07));
      c.fillStyle = zg;
      blob(c, z.x, z.y, z.w, z.h, zi);
      c.fill();
      c.strokeStyle = hexA(z.world.accent, 0.55);
      c.lineWidth = 3;
      c.stroke();
      c.font = '28px serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      for (const d of decor[zi]) {
        c.font = `${d.s}px serif`;
        c.globalAlpha = (anyOpen ? 0.55 : 0.25) + 0.1 * Math.sin(time + d.x);
        c.fillText(d.icon, d.x, d.y);
      }
      c.globalAlpha = anyOpen ? 1 : 0.5;
      c.fillStyle = z.world.accent;
      c.font = 'bold 30px Palatino, Georgia, serif';
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
      c.fillText(`${z.world.index} · ${z.world.name}`, z.x + 26, z.y + 42);
      c.font = 'italic 17px Palatino, Georgia, serif';
      c.fillStyle = '#b8b0c8';
      c.fillText(z.world.subtitle, z.x + 28, z.y + 66);
      c.globalAlpha = 1;
    });

    // road
    c.lineCap = 'round';
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1];
      const b = nodes[i];
      const cleared = a.done;
      c.strokeStyle = cleared ? 'rgba(242,190,100,0.85)' : b.open ? 'rgba(220,210,240,0.5)' : 'rgba(120,110,140,0.35)';
      c.lineWidth = cleared ? 7 : 5;
      c.setLineDash(cleared ? [] : [10, 10]);
      c.beginPath();
      c.moveTo(a.x, a.y);
      const mx = (a.x + b.x) / 2;
      c.quadraticCurveTo(mx, (a.y + b.y) / 2 + (a.world === b.world ? 0 : 60), b.x, b.y);
      c.stroke();
    }
    c.setLineDash([]);

    // stops
    const sel = selected();
    nodes.forEach((n) => {
      const r = n.boss ? 26 : 17;
      if (n === sel) {
        c.beginPath();
        c.arc(n.x, n.y, r + 9 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
        c.strokeStyle = '#fff2c8';
        c.lineWidth = 3;
        c.stroke();
      }
      c.beginPath();
      c.arc(n.x, n.y, r, 0, Math.PI * 2);
      c.fillStyle = !n.open ? '#2a2633' : n.done ? '#e8b04a' : n.world.accent;
      c.fill();
      c.lineWidth = 3;
      c.strokeStyle = !n.open ? '#4a4458' : n.done ? '#fff0c0' : '#1a1424';
      c.stroke();
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      if (n.boss) {
        c.font = '26px serif';
        c.globalAlpha = n.open ? 1 : 0.4;
        c.fillText(n.done ? '👑' : '💀', n.x, n.y + 1);
        c.globalAlpha = 1;
      } else {
        c.font = 'bold 16px Palatino, Georgia, serif';
        c.fillStyle = !n.open ? '#6c6778' : '#1a1424';
        c.fillText(n.open ? String(n.entry.level.order) : '🔒', n.x, n.y + 1);
      }
      if (n.relics && n.relicsFound >= n.relics) {
        c.fillStyle = '#a9d4f5';
        c.beginPath();
        c.moveTo(n.x + r - 2, n.y - r - 8);
        c.lineTo(n.x + r + 5, n.y - r - 1);
        c.lineTo(n.x + r - 2, n.y - r + 6);
        c.lineTo(n.x + r - 9, n.y - r - 1);
        c.closePath();
        c.fill();
      }
      if (zoom > 1.15 && n.open) {
        c.font = '13px Palatino, Georgia, serif';
        c.fillStyle = 'rgba(230,224,210,0.85)';
        c.fillText(n.entry.level.name, n.x, n.y + r + 16);
      }
    });

    // the lantern-bearer
    const key = walking ? run[Math.floor(time * 8) % 2].key : idle.key;
    const im = imgs.get(key);
    if (im?.complete) {
      const bob = walking ? 0 : Math.sin(time * 3) * 1.5;
      c.save();
      c.translate(walker.x, walker.y - 14 + bob);
      c.scale(facing * 1.3, 1.3);
      c.drawImage(im, -16, -40, 32, 40);
      c.restore();
      // lantern glow
      const lg = c.createRadialGradient(walker.x, walker.y - 40, 0, walker.x, walker.y - 40, 70);
      lg.addColorStop(0, 'rgba(255,190,90,0.35)');
      lg.addColorStop(1, 'rgba(255,190,90,0)');
      c.fillStyle = lg;
      c.fillRect(walker.x - 70, walker.y - 110, 140, 140);
    }
    c.restore();
  };

  updateInfo();
  requestAnimationFrame(frame);
  return el;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** A soft, slightly wobbly island shape. */
function blob(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number): void {
  const r = hashRand(seed * 31 + 5);
  const pts = 28;
  const cx = x + w / 2;
  const cy = y + h / 2;
  c.beginPath();
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 0.06;
    // superellipse so it fills the rectangle nicely
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const px = cx + Math.sign(ca) * Math.pow(Math.abs(ca), 0.45) * (w / 2) * k;
    const py = cy + Math.sign(sa) * Math.pow(Math.abs(sa), 0.45) * (h / 2) * k;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
