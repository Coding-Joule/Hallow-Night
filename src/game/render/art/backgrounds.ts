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
}

export function fogTexture(world: WorldId): { key: string; svg: string } {
  const t = backgroundTheme(world);
  const hex = '#' + t.fogColor.toString(16).padStart(6, '0');
  return { key: `fog-${world}`, svg: fog(hex) };
}
