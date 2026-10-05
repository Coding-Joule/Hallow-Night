import type { WorldId } from '../../levels/worlds';
import { rng, svg } from './svg';

/**
 * Procedural (but deterministic) parallax silhouettes for each world.
 * Each layer is 960 px wide and tiles horizontally.
 */

export interface BgLayer {
  key: string;
  svg: string;
  width: number;
  height: number;
  /** horizontal parallax factor (0 = fixed, 1 = moves with the world) */
  factor: number;
  /** vertical parallax factor */
  factorY: number;
  /** distance of the layer's bottom edge from the bottom of the screen */
  bottom: number;
  alpha?: number;
}

export interface BgTheme {
  skyTop: number;
  skyBottom: number;
  moon: { x: number; y: number; r: number; color: string; glow: number } | null;
  stars: boolean;
  fogColor: number;
  layers: BgLayer[];
  /** vignette/darkness strength 0..1 */
  darkness: number;
}

const W = 960;

/** Place shapes so the layer tiles seamlessly. */
function wrap(x: number, width: number, draw: (x: number) => string): string {
  let out = draw(x);
  if (x + width > W) out += draw(x - W);
  if (x < 0) out += draw(x + W);
  return out;
}

function houses(seed: number, h: number, color: string, windowColor: string, minH: number, maxH: number, windowChance: number): string {
  const r = rng(seed);
  let body = '';
  let x = 0;
  while (x < W) {
    const bw = 60 + r() * 90;
    const bh = minH + r() * (maxH - minH);
    const roof = 20 + r() * 40;
    const base = h;
    body += wrap(x, bw, (xx) => {
      let s = `<path d="M${xx} ${base} V${base - bh} L${xx + bw / 2} ${base - bh - roof} L${xx + bw} ${base - bh} V${base} Z" fill="${color}"/>`;
      if (r() > 0.4) s += `<rect x="${xx + bw * 0.7}" y="${base - bh - roof * 0.9}" width="10" height="${roof * 0.7}" fill="${color}"/>`;
      for (let wy = base - bh + 14; wy < base - 20; wy += 34) {
        for (let wx = xx + 12; wx < xx + bw - 18; wx += 26) {
          if (r() < windowChance) s += `<rect x="${wx}" y="${wy}" width="9" height="13" fill="${windowColor}"/>`;
        }
      }
      return s;
    });
    x += bw + r() * 30;
  }
  return body;
}

function trees(seed: number, h: number, color: string, count: number, minH: number, maxH: number): string {
  const r = rng(seed);
  let body = '';
  for (let i = 0; i < count; i++) {
    const x = r() * W;
    const th = minH + r() * (maxH - minH);
    const tw = 6 + r() * 8;
    body += wrap(x - 60, 120, (xx) => {
      const cx = xx + 60;
      let s = `<path d="M${cx - tw} ${h} Q${cx - tw * 0.4} ${h - th * 0.5} ${cx - 2} ${h - th} L${cx + 2} ${h - th} Q${cx + tw * 0.4} ${h - th * 0.5} ${cx + tw} ${h} Z" fill="${color}"/>`;
      for (let b = 0; b < 4; b++) {
        const by = h - th * (0.45 + b * 0.13);
        const dir = b % 2 === 0 ? 1 : -1;
        const len = 20 + r() * 40;
        s += `<path d="M${cx} ${by} Q${cx + dir * len * 0.5} ${by - 10} ${cx + dir * len} ${by - 20 - r() * 20}" stroke="${color}" stroke-width="${3 + r() * 2}" fill="none" stroke-linecap="round"/>`;
      }
      return s;
    });
  }
  return body;
}

function hills(seed: number, h: number, color: string, amp: number, base: number): string {
  const r = rng(seed);
  const pts: number[] = [];
  const n = 8;
  for (let i = 0; i < n; i++) pts.push(base - r() * amp);
  let d = `M0 ${h} L0 ${pts[0]}`;
  for (let i = 1; i <= n; i++) {
    const x = (i / n) * W;
    const y = pts[i % n];
    const px = ((i - 0.5) / n) * W;
    d += ` Q${px} ${Math.min(pts[i - 1], y) - amp * 0.3} ${x} ${y}`;
  }
  d += ` L${W} ${h} Z`;
  return `<path d="${d}" fill="${color}"/>`;
}

function graves(seed: number, h: number, color: string): string {
  const r = rng(seed);
  let s = '';
  for (let x = 10; x < W; x += 30 + r() * 50) {
    const gh = 16 + r() * 22;
    if (r() > 0.5) s += `<path d="M${x} ${h} V${h - gh + 8} Q${x} ${h - gh} ${x + 10} ${h - gh} Q${x + 20} ${h - gh} ${x + 20} ${h - gh + 8} V${h} Z" fill="${color}"/>`;
    else s += `<rect x="${x + 7}" y="${h - gh - 8}" width="5" height="${gh + 8}" fill="${color}"/><rect x="${x}" y="${h - gh}" width="19" height="5" fill="${color}"/>`;
  }
  return s;
}

function castle(seed: number, h: number, color: string, windowColor: string): string {
  const r = rng(seed);
  let s = `<rect x="0" y="${h - 60}" width="${W}" height="60" fill="${color}"/>`;
  for (let x = 0; x < W; x += 24) s += `<rect x="${x}" y="${h - 72}" width="14" height="14" fill="${color}"/>`;
  for (let i = 0; i < 5; i++) {
    const x = 60 + i * 190 + r() * 40;
    const th = 140 + r() * 120;
    const tw = 40 + r() * 30;
    s += `<rect x="${x}" y="${h - th}" width="${tw}" height="${th}" fill="${color}"/>`;
    s += `<path d="M${x - 8} ${h - th} L${x + tw / 2} ${h - th - 60 - r() * 40} L${x + tw + 8} ${h - th} Z" fill="${color}"/>`;
    for (let wy = h - th + 20; wy < h - 60; wy += 40) if (r() > 0.4) s += `<rect x="${x + tw / 2 - 4}" y="${wy}" width="8" height="14" rx="4" fill="${windowColor}"/>`;
  }
  return s;
}

function arches(seed: number, h: number, color: string, glow: string): string {
  const r = rng(seed);
  let s = `<rect x="0" y="0" width="${W}" height="${h}" fill="${color}"/>`;
  for (let x = 0; x < W; x += 160) {
    const ah = h * (0.55 + r() * 0.15);
    s += `<path d="M${x + 30} ${h} V${h - ah + 50} Q${x + 30} ${h - ah} ${x + 80} ${h - ah} Q${x + 130} ${h - ah} ${x + 130} ${h - ah + 50} V${h} Z" fill="${glow}"/>`;
  }
  return s;
}

function gears(seed: number, h: number, color: string): string {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < 6; i++) {
    const cx = r() * W;
    const cy = h * (0.3 + r() * 0.6);
    const rad = 40 + r() * 70;
    s += wrap(cx - rad - 12, rad * 2 + 24, (xx) => {
      const x = xx + rad + 12;
      let g = `<circle cx="${x}" cy="${cy}" r="${rad}" fill="${color}"/>`;
      const teeth = Math.round(rad / 6);
      for (let t = 0; t < teeth; t++)
        g += `<rect x="${x - 6}" y="${cy - rad - 12}" width="12" height="16" fill="${color}" transform="rotate(${(t * 360) / teeth} ${x} ${cy})"/>`;
      return g;
    });
  }
  s += `<rect x="0" y="${h * 0.2}" width="${W}" height="10" fill="${color}"/><rect x="0" y="${h * 0.75}" width="${W}" height="14" fill="${color}"/>`;
  return s;
}

function interiorWall(seed: number, h: number, wall: string, trim: string, windowGlow: string): string {
  const r = rng(seed);
  let s = `<rect width="${W}" height="${h}" fill="${wall}"/>`;
  for (let x = 0; x < W; x += 24) s += `<rect x="${x}" y="0" width="2" height="${h}" fill="${trim}" opacity="0.35"/>`;
  for (let x = 80; x < W; x += 240) {
    const wy = h * 0.2;
    s += `<path d="M${x} ${wy + 180} V${wy + 50} Q${x} ${wy} ${x + 50} ${wy} Q${x + 100} ${wy} ${x + 100} ${wy + 50} V${wy + 180} Z" fill="${windowGlow}"/>`;
    s += `<path d="M${x + 50} ${wy} V${wy + 180} M${x} ${wy + 90} H${x + 100}" stroke="${trim}" stroke-width="5"/>`;
    if (r() > 0.3) s += `<rect x="${x + 150}" y="${h * 0.3}" width="40" height="54" fill="${trim}" opacity="0.8"/>`;
  }
  s += `<rect y="${h - 40}" width="${W}" height="40" fill="${trim}"/>`;
  return s;
}

function fog(color: string): string {
  return svg(
    W,
    200,
    `<rect width="${W}" height="200" fill="url(#f)"/>
     <ellipse cx="200" cy="120" rx="260" ry="40" fill="${color}" opacity="0.25"/>
     <ellipse cx="620" cy="140" rx="300" ry="45" fill="${color}" opacity="0.2"/>
     <ellipse cx="${W}" cy="130" rx="180" ry="36" fill="${color}" opacity="0.22"/>
     <ellipse cx="0" cy="130" rx="180" ry="36" fill="${color}" opacity="0.22"/>`,
    `<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0"/><stop offset="1" stop-color="${color}" stop-opacity="0.45"/></linearGradient>`,
  );
}

function layer(key: string, height: number, body: string, factor: number, factorY: number, bottom: number, alpha = 1): BgLayer {
  return { key, svg: svg(W, height, body), width: W, height, factor, factorY, bottom, alpha };
}

export function backgroundTheme(world: WorldId): BgTheme {
  const extra = EXTRA_THEMES[world];
  if (extra) return extra();
  switch (world) {
    case 'old-town':
      return {
        skyTop: 0x0d0b1c,
        skyBottom: 0x3a2a4e,
        moon: { x: 720, y: 110, r: 46, color: '#f1ead2', glow: 0xf1ead2 },
        stars: true,
        fogColor: 0x6a5a8a,
        darkness: 0.35,
        layers: [
          layer('bg-old-town-far', 320, houses(11, 320, '#1f1a30', '#6b4a3a', 90, 200, 0.12), 0.12, 0.05, 90),
          layer('bg-old-town-mid', 300, houses(23, 300, '#15121f', '#d9853a', 120, 220, 0.22), 0.3, 0.12, 30),
        ],
      };
    case 'graveyard':
      return {
        skyTop: 0x0a0c16,
        skyBottom: 0x2c3040,
        moon: { x: 250, y: 95, r: 54, color: '#e8e6da', glow: 0xd8e0ea },
        stars: true,
        fogColor: 0x8a93a8,
        darkness: 0.4,
        layers: [
          layer('bg-graveyard-far', 280, hills(5, 280, '#1c2030', 90, 200) + `<rect x="600" y="40" width="44" height="150" fill="#1c2030"/><path d="M590 40 L622 -10 L654 40 Z" fill="#1c2030"/><rect x="540" y="110" width="140" height="80" fill="#1c2030"/><rect x="616" y="70" width="12" height="20" fill="#7a6a4a"/>`, 0.1, 0.05, 80),
          layer('bg-graveyard-mid', 200, hills(9, 200, '#12141e', 30, 160) + graves(3, 170, '#12141e') + trees(17, 170, '#12141e', 3, 110, 160), 0.3, 0.12, 20),
        ],
      };
    case 'dead-woods':
      return {
        skyTop: 0x0a0d10,
        skyBottom: 0x26302a,
        moon: { x: 480, y: 80, r: 40, color: '#dfe6c8', glow: 0xc8d8b0 },
        stars: false,
        fogColor: 0x6d7a60,
        darkness: 0.45,
        layers: [
          layer('bg-dead-woods-far', 380, trees(41, 380, '#1a2020', 14, 220, 360), 0.12, 0.06, 60),
          layer('bg-dead-woods-mid', 420, trees(77, 420, '#0f1311', 7, 300, 410), 0.32, 0.14, 0),
        ],
      };
    case 'haunted-manor':
      return {
        skyTop: 0x150c18,
        skyBottom: 0x2a1a2c,
        moon: null,
        stars: false,
        fogColor: 0x5a3a60,
        darkness: 0.45,
        layers: [
          layer('bg-haunted-manor-far', 540, interiorWall(3, 540, '#24162a', '#1a0f1e', '#3c3466'), 0.2, 0.2, 0),
          layer('bg-haunted-manor-mid', 540, `<rect x="0" y="0" width="${W}" height="30" fill="#140b16"/>` + [0, 320, 640].map((x) => `<rect x="${x + 20}" y="0" width="48" height="540" fill="#140b16"/><path d="M${x + 68} 30 Q${x + 110} 200 ${x + 80} 380 L${x + 68} 380 Z" fill="#3a1420"/>`).join(''), 0.45, 0.35, 0),
        ],
      };
    case 'catacombs':
      return {
        skyTop: 0x080a08,
        skyBottom: 0x16201a,
        moon: null,
        stars: false,
        fogColor: 0x4f7a3a,
        darkness: 0.55,
        layers: [
          layer('bg-catacombs-far', 540, arches(8, 540, '#141a15', '#0c100d'), 0.18, 0.18, 0),
          layer('bg-catacombs-mid', 540, [0, 200, 400, 600, 800].map((x) => `<rect x="${x}" y="0" width="36" height="540" fill="#0b0e0b"/>` + [120, 220, 320].map((y) => `<ellipse cx="${x + 100}" cy="${y}" rx="30" ry="18" fill="#0b0e0b"/><circle cx="${x + 92}" cy="${y}" r="3" fill="#2a3a2a"/><circle cx="${x + 108}" cy="${y}" r="3" fill="#2a3a2a"/>`).join('')).join(''), 0.4, 0.35, 0),
        ],
      };
    case 'clocktower':
      return {
        skyTop: 0x0c0a14,
        skyBottom: 0x3a2c30,
        moon: { x: 160, y: 140, r: 70, color: '#f0dca8', glow: 0xf0cc80 },
        stars: true,
        fogColor: 0x7a6060,
        darkness: 0.35,
        layers: [
          layer('bg-clocktower-far', 200, houses(99, 200, '#1a1520', '#a8683a', 40, 110, 0.3), 0.08, 0.02, 0),
          layer('bg-clocktower-mid', 540, gears(4, 540, '#1d1718'), 0.35, 0.3, 0, 0.9),
        ],
      };
    case 'black-castle':
      return {
        skyTop: 0x0a0508,
        skyBottom: 0x3a1418,
        moon: { x: 700, y: 120, r: 80, color: '#e8c8b0', glow: 0xd07060 },
        stars: true,
        fogColor: 0x6a2a30,
        darkness: 0.45,
        layers: [
          layer('bg-black-castle-far', 420, castle(66, 420, '#1a0c10', '#a8402a'), 0.1, 0.05, 40),
          layer('bg-black-castle-mid', 200, `<rect x="0" y="120" width="${W}" height="80" fill="#0e0608"/>` + Array.from({ length: 40 }, (_, i) => `<rect x="${i * 24}" y="104" width="14" height="18" fill="#0e0608"/>`).join(''), 0.3, 0.1, 0),
        ],
      };
  }
  return backgroundTheme('old-town');
}

/** A few extra shapes for the worlds after the placement exam. */
function snowCaps(seed: number, h: number, color: string): string {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < 60; i++) s += `<circle cx="${r() * W}" cy="${r() * h}" r="${1 + r() * 2}" fill="${color}" opacity="${0.3 + r() * 0.5}"/>`;
  return s;
}

function tents(seed: number, h: number, color: string, stripe: string): string {
  const r = rng(seed);
  let s = '';
  let x = 20;
  while (x < W - 60) {
    const w = 90 + r() * 80;
    const th = 90 + r() * 90;
    s += `<path d="M${x} ${h} V${h - th * 0.5} L${x + w / 2} ${h - th} L${x + w} ${h - th * 0.5} V${h} Z" fill="${color}"/>`;
    for (let k = 1; k < 4; k++) s += `<path d="M${x + (w * k) / 4} ${h} V${h - th * 0.5} L${x + w / 2} ${h - th}" stroke="${stripe}" stroke-width="6" opacity="0.5"/>`;
    s += `<path d="M${x + w / 2} ${h - th} V${h - th - 20} L${x + w / 2 + 14} ${h - th - 14} L${x + w / 2} ${h - th - 8}" fill="${stripe}"/>`;
    x += w + 30 + r() * 80;
  }
  return s + `<circle cx="760" cy="${h - 150}" r="120" fill="none" stroke="${color}" stroke-width="8"/>` + Array.from({ length: 12 }, (_, i) => `<path d="M760 ${h - 150} L${760 + Math.cos((i * Math.PI) / 6) * 120} ${h - 150 + Math.sin((i * Math.PI) / 6) * 120}" stroke="${color}" stroke-width="3"/>`).join('');
}

function masts(seed: number, h: number, color: string, sail: string): string {
  const r = rng(seed);
  let s = '';
  for (let x = 60; x < W; x += 260 + r() * 120) {
    const mh = 200 + r() * 120;
    s += `<path d="M${x - 80} ${h - 40} L${x + 120} ${h - 40} L${x + 90} ${h} L${x - 50} ${h} Z" fill="${color}"/><rect x="${x}" y="${h - 40 - mh}" width="8" height="${mh}" fill="${color}"/>`;
    s += `<path d="M${x + 8} ${h - 30 - mh} Q${x + 80} ${h - mh + 30} ${x + 8} ${h - 90} Z" fill="${sail}" opacity="0.6"/>`;
  }
  return s;
}

function clouds(seed: number, h: number, color: string): string {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < 9; i++) {
    const cx = r() * W;
    const cy = 40 + r() * (h - 80);
    s += wrap(cx - 90, 180, (xx) => `<ellipse cx="${xx + 90}" cy="${cy}" rx="${70 + r() * 40}" ry="${18 + r() * 10}" fill="${color}"/><ellipse cx="${xx + 60}" cy="${cy - 12}" rx="40" ry="18" fill="${color}"/>`);
  }
  return s;
}

function pillars(seed: number, h: number, color: string): string {
  const r = rng(seed);
  let s = '';
  for (let x = 30; x < W; x += 120 + r() * 140) {
    const ph = 120 + r() * (h - 160);
    const broken = r() > 0.5;
    s += `<rect x="${x}" y="${h - ph}" width="34" height="${ph}" fill="${color}"/><rect x="${x - 6}" y="${h - ph}" width="46" height="10" fill="${color}"/>`;
    if (broken) s += `<path d="M${x} ${h - ph} L${x + 10} ${h - ph - 16} L${x + 20} ${h - ph - 4} L${x + 34} ${h - ph - 20} V${h - ph} Z" fill="${color}"/>`;
  }
  return s;
}

function blocks(seed: number, h: number, colors: string[]): string {
  const r = rng(seed);
  let s = '';
  let x = 0;
  while (x < W) {
    const stack = 1 + Math.floor(r() * 4);
    for (let k = 0; k < stack; k++) {
      const c = colors[Math.floor(r() * colors.length)];
      s += `<rect x="${x}" y="${h - (k + 1) * 46}" width="44" height="44" rx="4" fill="${c}"/><circle cx="${x + 12}" cy="${h - (k + 1) * 46 + 4}" r="5" fill="${c}"/><circle cx="${x + 32}" cy="${h - (k + 1) * 46 + 4}" r="5" fill="${c}"/>`;
    }
    x += 50 + r() * 70;
  }
  return s;
}

function flowers(seed: number, h: number, stem: string, petal: string): string {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    const fh = 40 + r() * 160;
    s += wrap(x - 20, 40, (xx) => `<path d="M${xx + 20} ${h} Q${xx + 10 + r() * 20} ${h - fh / 2} ${xx + 20} ${h - fh}" stroke="${stem}" stroke-width="3" fill="none"/><circle cx="${xx + 20}" cy="${h - fh}" r="${7 + r() * 8}" fill="${petal}"/>`);
  }
  return s;
}

const EXTRA_THEMES: Partial<Record<WorldId, () => BgTheme>> = {
  'frozen-hollow': () => ({
    skyTop: 0x0b1424,
    skyBottom: 0x3a5a7a,
    moon: { x: 300, y: 100, r: 50, color: '#eef6ff', glow: 0xcfe6ff },
    stars: true,
    fogColor: 0xb8d8f0,
    darkness: 0.25,
    layers: [
      layer('bg-frozen-hollow-far', 300, hills(31, 300, '#2a4058', 80, 210) + snowCaps(2, 300, '#e8f4ff'), 0.1, 0.05, 80),
      layer('bg-frozen-hollow-mid', 380, trees(43, 380, '#1a2a3c', 10, 220, 360) + snowCaps(5, 380, '#ffffff'), 0.3, 0.12, 0),
    ],
  }),
  'candy-carnival': () => ({
    skyTop: 0x1a0c24,
    skyBottom: 0x5a2a5a,
    moon: { x: 160, y: 90, r: 44, color: '#ffe8f4', glow: 0xffb8e0 },
    stars: true,
    fogColor: 0xd890c8,
    darkness: 0.25,
    layers: [
      layer('bg-candy-carnival-far', 320, tents(7, 320, '#3a1a40', '#7a3a70'), 0.12, 0.05, 60),
      layer('bg-candy-carnival-mid', 160, hills(13, 160, '#2a0f2e', 30, 110) + snowCaps(9, 160, '#ff9ad6'), 0.32, 0.12, 0),
    ],
  }),
  'witch-swamp': () => ({
    skyTop: 0x080e08,
    skyBottom: 0x2a3a1c,
    moon: { x: 620, y: 120, r: 36, color: '#e8f0b0', glow: 0xb8d070 },
    stars: false,
    fogColor: 0x6a8a40,
    darkness: 0.5,
    layers: [
      layer('bg-witch-swamp-far', 360, trees(91, 360, '#142012', 12, 180, 340), 0.12, 0.06, 40),
      layer('bg-witch-swamp-mid', 260, hills(19, 260, '#0c140a', 40, 200) + trees(23, 260, '#0c140a', 5, 140, 250) + snowCaps(3, 200, '#c8f070'), 0.32, 0.14, 0),
    ],
  }),
  'ghost-harbor': () => ({
    skyTop: 0x060c14,
    skyBottom: 0x1e3444,
    moon: { x: 780, y: 100, r: 58, color: '#e0f0f4', glow: 0xa8d8e8 },
    stars: true,
    fogColor: 0x7aa8b8,
    darkness: 0.4,
    layers: [
      layer('bg-ghost-harbor-far', 380, masts(17, 380, '#16242e', '#4a7a88'), 0.12, 0.05, 40),
      layer('bg-ghost-harbor-mid', 140, hills(29, 140, '#0a141a', 18, 100), 0.32, 0.1, 0),
    ],
  }),
  'lava-crypt': () => ({
    skyTop: 0x140404,
    skyBottom: 0x5a1a08,
    moon: null,
    stars: false,
    fogColor: 0xe0602a,
    darkness: 0.35,
    layers: [
      layer('bg-lava-crypt-far', 540, arches(12, 540, '#2a0c08', '#ff7a2a'), 0.18, 0.18, 0),
      layer('bg-lava-crypt-mid', 300, pillars(14, 300, '#180604') + snowCaps(21, 300, '#ff9a3a'), 0.4, 0.3, 0),
    ],
  }),
  'sky-ruins': () => ({
    skyTop: 0x141a3a,
    skyBottom: 0x6a6aa8,
    moon: { x: 480, y: 90, r: 62, color: '#fff8e0', glow: 0xfff0c0 },
    stars: true,
    fogColor: 0xc8c8f0,
    darkness: 0.15,
    layers: [
      layer('bg-sky-ruins-far', 540, clouds(3, 540, '#3a3a6a'), 0.08, 0.1, 0, 0.8),
      layer('bg-sky-ruins-mid', 320, pillars(27, 320, '#2a2a4a') + clouds(8, 200, '#4a4a7a'), 0.3, 0.15, 0),
    ],
  }),
  'toy-factory': () => ({
    skyTop: 0x0c0a18,
    skyBottom: 0x3a2a20,
    moon: null,
    stars: false,
    fogColor: 0xd0a060,
    darkness: 0.3,
    layers: [
      layer('bg-toy-factory-far', 540, gears(11, 540, '#2a2020'), 0.15, 0.15, 0, 0.9),
      layer('bg-toy-factory-mid', 230, blocks(5, 230, ['#3a1a2a', '#1a2a3a', '#3a321a', '#1a3a2a']), 0.35, 0.15, 0),
    ],
  }),
  'mirror-manor': () => ({
    skyTop: 0x0c1418,
    skyBottom: 0x1a3036,
    moon: null,
    stars: false,
    fogColor: 0x8ad0d0,
    darkness: 0.35,
    layers: [
      layer('bg-mirror-manor-far', 540, interiorWall(9, 540, '#142a30', '#0c1c20', '#8ae0e0'), 0.2, 0.2, 0),
      layer('bg-mirror-manor-mid', 540, `<rect x="0" y="0" width="${W}" height="30" fill="#0a1418"/>` + [0, 320, 640].map((x) => `<rect x="${x + 20}" y="0" width="48" height="540" fill="#0a1418"/><ellipse cx="${x + 200}" cy="200" rx="50" ry="80" fill="none" stroke="#3a6a70" stroke-width="8"/>`).join(''), 0.45, 0.35, 0),
    ],
  }),
  'moon-garden': () => ({
    skyTop: 0x0a0a1e,
    skyBottom: 0x2a2a4e,
    moon: { x: 640, y: 150, r: 110, color: '#f4f4ff', glow: 0xe0e0ff },
    stars: true,
    fogColor: 0xb0b0e0,
    darkness: 0.2,
    layers: [
      layer('bg-moon-garden-far', 300, hills(37, 300, '#1c1c38', 60, 220) + snowCaps(13, 300, '#e0e0ff'), 0.1, 0.05, 60),
      layer('bg-moon-garden-mid', 260, flowers(15, 260, '#12122a', '#4a4a80'), 0.32, 0.12, 0),
    ],
  }),
  'goblin-market': () => ({
    skyTop: 0x0e0c06,
    skyBottom: 0x3a3418,
    moon: { x: 200, y: 110, r: 48, color: '#f4f0c0', glow: 0xe0d870 },
    stars: true,
    fogColor: 0xb0a850,
    darkness: 0.3,
    layers: [
      layer('bg-goblin-market-far', 320, tents(23, 320, '#2a2610', '#6a6020'), 0.12, 0.05, 50),
      layer('bg-goblin-market-mid', 300, houses(57, 300, '#18160a', '#e0c040', 100, 210, 0.25), 0.3, 0.12, 0),
    ],
  }),
  'starfall-peak': () => ({
    skyTop: 0x040818,
    skyBottom: 0x1a2a5a,
    moon: { x: 760, y: 120, r: 70, color: '#e8f0ff', glow: 0xa0c0ff },
    stars: true,
    fogColor: 0x8098e0,
    darkness: 0.2,
    layers: [
      layer('bg-starfall-peak-far', 360, hills(71, 360, '#141c3a', 120, 260) + snowCaps(31, 360, '#c8d8ff'), 0.1, 0.05, 60),
      layer('bg-starfall-peak-mid', 260, pillars(41, 260, '#0c1228') + snowCaps(33, 200, '#ffffff'), 0.32, 0.12, 0),
    ],
  }),
  'nightmare-realm': () => ({
    skyTop: 0x0a0010,
    skyBottom: 0x30083a,
    moon: { x: 480, y: 130, r: 90, color: '#f0a0ff', glow: 0xc040e0 },
    stars: true,
    fogColor: 0x8a2aa0,
    darkness: 0.5,
    layers: [
      layer('bg-nightmare-realm-far', 420, castle(88, 420, '#1a0622', '#d040ff'), 0.1, 0.05, 40),
      layer('bg-nightmare-realm-mid', 420, trees(66, 420, '#0e0214', 8, 260, 410), 0.32, 0.14, 0),
    ],
  }),
};

export function fogTexture(world: WorldId): { key: string; svg: string } {
  const t = backgroundTheme(world);
  const hex = '#' + t.fogColor.toString(16).padStart(6, '0');
  return { key: `fog-${world}`, svg: fog(hex) };
}
