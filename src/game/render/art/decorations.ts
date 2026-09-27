import { DECORATION_SIZES } from '../../levels/objectTypes';
import { svg, type SvgTexture } from './svg';

/** Decorations that emit light get a glow sprite: [offsetX, offsetY (0..1 of size), radius, colour]. */
export const DECORATION_LIGHTS: Record<string, [number, number, number, number]> = {
  jackOLantern: [0.5, 0.55, 60, 0xe8913a],
  lamp: [0.5, 0.12, 110, 0xe8c86a],
  window: [0.5, 0.5, 70, 0xe8913a],
  candles: [0.5, 0.2, 60, 0xe8c86a],
  candelabra: [0.5, 0.15, 80, 0xe8c86a],
  torch: [0.5, 0.15, 90, 0xe8913a],
};

const D: Record<string, (w: number, h: number) => string> = {
  pumpkin: (w, h) =>
    svg(w, h, `<ellipse cx="16" cy="17" rx="15" ry="11" fill="#b8601f"/><ellipse cx="16" cy="17" rx="7" ry="11" fill="#c9702a"/><path d="M9 7 Q16 5 23 7" stroke="#7a3d14" stroke-width="1" fill="none"/><path d="M15 7 Q14 2 18 1" stroke="#4a5e38" stroke-width="2.5" fill="none"/>`),
  jackOLantern: (w, h) =>
    svg(w, h, `<ellipse cx="16" cy="17" rx="15" ry="11" fill="#b8601f"/><ellipse cx="16" cy="17" rx="7" ry="11" fill="#c9702a"/><path d="M15 7 Q14 2 18 1" stroke="#4a5e38" stroke-width="2.5" fill="none"/><path d="M8 14 L12 12 L12 16 Z M24 14 L20 12 L20 16 Z" fill="#ffd27a"/><path d="M9 20 Q16 25 23 20 L21 21 L19 20 L17 22 L15 20 L13 22 L11 20 Z" fill="#ffd27a"/>`),
  lamp: (w, h) =>
    svg(w, h, `<rect x="10.5" y="14" width="3" height="${h - 14}" fill="#1f1e26"/><rect x="7" y="${h - 6}" width="10" height="6" fill="#26252e"/><path d="M4 6 L20 6 L18 16 L6 16 Z" fill="#1f1e26"/><path d="M6 7 L18 7 L16.5 15 L7.5 15 Z" fill="#f2c96a"/><path d="M3 6 L12 0 L21 6 Z" fill="#2a2932"/>`),
  fence: (w, h) => {
    let bars = '';
    for (let x = 4; x < w; x += 12) bars += `<rect x="${x}" y="8" width="3" height="${h - 8}" fill="#1c1b22"/><path d="M${x - 1.5} 9 L${x + 1.5} 0 L${x + 4.5} 9 Z" fill="#1c1b22"/>`;
    return svg(w, h, `${bars}<rect x="0" y="14" width="${w}" height="3" fill="#1c1b22"/><rect x="0" y="${h - 10}" width="${w}" height="3" fill="#1c1b22"/>`);
  },
  gravestone: (w, h) =>
    svg(w, h, `<path d="M3 ${h} L3 14 Q3 2 16 2 Q29 2 29 14 L29 ${h} Z" fill="#4b5160"/><path d="M3 ${h} L3 14 Q3 2 16 2 L16 ${h} Z" fill="#555c6c"/><path d="M11 16 H21 M16 11 V24" stroke="#343945" stroke-width="2"/><path d="M0 ${h - 3} H32" stroke="#2a3a26" stroke-width="3"/>`),
  cross: (w, h) =>
    svg(w, h, `<rect x="11" y="2" width="6" height="${h - 2}" fill="#4b5160"/><rect x="3" y="12" width="22" height="6" fill="#4b5160"/><rect x="11" y="2" width="3" height="${h - 2}" fill="#555c6c"/>`),
  deadTree: (w, h) =>
    svg(w, h, `<path d="M58 ${h} Q60 150 56 120 Q50 90 30 70 Q20 60 8 58 Q24 58 36 66 Q48 72 56 90 Q58 70 50 44 Q46 30 36 22 Q48 28 56 44 Q62 60 64 80 Q68 56 80 40 Q90 28 104 22 Q92 34 84 46 Q74 62 70 100 Q80 86 98 80 Q112 76 122 80 Q104 84 92 94 Q76 108 72 140 Q70 170 74 ${h} Z" fill="#17141d"/>`),
  window: (w, h) =>
    svg(w, h, `<rect x="0" y="0" width="${w}" height="${h}" fill="#1e1a22"/><rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="#e0893a"/><rect x="4" y="4" width="${w - 8}" height="${(h - 8) / 2}" fill="#eda04e"/><path d="M${w / 2} 4 V${h - 4} M4 ${h / 2} H${w - 4}" stroke="#1e1a22" stroke-width="3"/>`),
  crate: (w, h) =>
    svg(w, h, `<rect width="32" height="32" fill="#4a3426"/><rect x="2" y="2" width="28" height="28" fill="none" stroke="#6b4c36" stroke-width="3"/><path d="M3 3 L29 29" stroke="#6b4c36" stroke-width="3"/>`),
  barrel: (w, h) =>
    svg(w, h, `<path d="M4 2 Q0 18 4 34 L24 34 Q28 18 24 2 Z" fill="#553b2a"/><rect x="1.5" y="8" width="25" height="3" fill="#3a3d48"/><rect x="1.5" y="25" width="25" height="3" fill="#3a3d48"/><path d="M14 2 V34" stroke="#3a281e"/>`),
  coffin: (w, h) =>
    svg(w, h, `<path d="M10 0 L26 0 L34 16 L28 72 L8 72 L2 16 Z" fill="#3a2822"/><path d="M10 0 L26 0 L34 16 L28 72 L18 72 L18 0 Z" fill="#442f27"/><path d="M18 18 V40 M12 26 H24" stroke="#8c7a5a" stroke-width="2"/>`),
  candles: (w, h) =>
    svg(w, h, `<rect x="4" y="10" width="6" height="14" fill="#d8d0b8"/><rect x="13" y="6" width="6" height="18" fill="#cfc6ab"/><rect x="22" y="12" width="6" height="12" fill="#d8d0b8"/><path d="M7 10 Q5 6 7 3 Q9 6 7 10 Z M16 6 Q14 2 16 0 Q18 2 16 6 Z M25 12 Q23 8 25 5 Q27 8 25 12 Z" fill="#f5c05a"/>`),
  candelabra: (w, h) =>
    svg(w, h, `<rect x="14.5" y="14" width="3" height="${h - 18}" fill="#8c7a4a"/><rect x="8" y="${h - 5}" width="16" height="5" fill="#8c7a4a"/><path d="M4 16 Q4 24 16 24 Q28 24 28 16" stroke="#8c7a4a" stroke-width="2.5" fill="none"/><rect x="2" y="8" width="4" height="8" fill="#d8d0b8"/><rect x="14" y="6" width="4" height="8" fill="#d8d0b8"/><rect x="26" y="8" width="4" height="8" fill="#d8d0b8"/><path d="M4 8 Q2 4 4 1 Q6 4 4 8 Z M16 6 Q14 2 16 -1 Q18 2 16 6 Z M28 8 Q26 4 28 1 Q30 4 28 8 Z" fill="#f5c05a"/>`),
  bell: (w, h) =>
    svg(w, h, `<rect x="21" y="0" width="6" height="8" fill="#5a4a2a"/><path d="M10 38 Q10 8 24 8 Q38 8 38 38 L44 44 L4 44 Z" fill="#9a7a3a"/><path d="M24 8 Q38 8 38 38 L44 44 L24 44 Z" fill="#7d6230"/><circle cx="24" cy="46" r="3" fill="#5a4a2a"/>`),
  chain: (w, h) => {
    let links = '';
    for (let y = 0; y < h; y += 10) links += `<ellipse cx="6" cy="${y + 5}" rx="${y % 20 === 0 ? 4 : 1.8}" ry="5" fill="none" stroke="#555a66" stroke-width="2"/>`;
    return svg(w, h, links);
  },
  cobweb: (w, h) =>
    svg(w, h, `<g stroke="#b9b8c8" stroke-width="0.8" fill="none" opacity="0.55"><path d="M0 0 L48 48 M0 0 L48 20 M0 0 L20 48 M0 0 L48 0 M0 0 L0 48"/><path d="M0 12 Q8 10 12 0 M0 24 Q16 20 24 0 M0 36 Q24 30 36 0 M0 48 Q30 40 48 0"/></g>`),
  banner: (w, h) =>
    svg(w, h, `<rect x="0" y="0" width="40" height="4" fill="#3a3d48"/><path d="M4 4 L36 4 L36 96 L20 84 L4 96 Z" fill="#5a1e24"/><path d="M4 4 L36 4 L36 10 L4 10 Z" fill="#7a2a30"/><circle cx="20" cy="40" r="8" fill="none" stroke="#b8903a" stroke-width="2"/><path d="M20 30 L20 50 M10 40 H30" stroke="#b8903a" stroke-width="1.5"/>`),
  gear: (w, h) => {
    let teeth = '';
    for (let i = 0; i < 12; i++) teeth += `<rect x="44" y="0" width="8" height="14" fill="#5c4d2e" transform="rotate(${i * 30} 48 48)"/>`;
    return svg(w, h, `${teeth}<circle cx="48" cy="48" r="38" fill="#5c4d2e"/><circle cx="48" cy="48" r="28" fill="#4a3e25"/><circle cx="48" cy="48" r="10" fill="#2e2718"/><path d="M48 20 V76 M20 48 H76" stroke="#5c4d2e" stroke-width="7"/>`);
  },
  statue: (w, h) =>
    svg(w, h, `<rect x="4" y="80" width="40" height="16" fill="#3a3f4c"/><path d="M14 80 L12 40 Q12 30 24 28 Q36 30 36 40 L34 80 Z" fill="#555c6c"/><circle cx="24" cy="20" r="9" fill="#555c6c"/><path d="M12 40 Q2 30 6 18 Q10 34 16 36 Z M36 40 Q46 30 42 18 Q38 34 32 36 Z" fill="#4b5160"/>`),
  bones: (w, h) =>
    svg(w, h, `<path d="M2 12 L28 8" stroke="#bfb7a0" stroke-width="3"/><circle cx="2" cy="12" r="2.5" fill="#bfb7a0"/><circle cx="28" cy="8" r="2.5" fill="#bfb7a0"/><ellipse cx="34" cy="11" rx="5" ry="4.5" fill="#d8d0b8"/><circle cx="33" cy="10" r="1.2" fill="#2d2a26"/><circle cx="36" cy="10" r="1.2" fill="#2d2a26"/>`),
  portrait: (w, h) =>
    svg(w, h, `<rect width="48" height="64" fill="#6b5226"/><rect x="5" y="5" width="38" height="54" fill="#1e1a26"/><ellipse cx="24" cy="26" rx="8" ry="10" fill="#3a3346"/><path d="M10 59 Q12 40 24 38 Q36 40 38 59 Z" fill="#2c2636"/><circle cx="21" cy="25" r="1" fill="#c9b8ff"/><circle cx="27" cy="25" r="1" fill="#c9b8ff"/>`),
  bookshelf: (w, h) => {
    let books = '';
    const colors = ['#4a2a30', '#2a3a4a', '#3a4a2a', '#5a4a2a', '#3a2a4a'];
    for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) books += `<rect x="${6 + i * 8}" y="${8 + row * 30 + (i % 3)}" width="6" height="${22 - (i % 3)}" fill="${colors[(i + row) % 5]}"/>`;
    return svg(w, h, `<rect width="64" height="96" fill="#3a281e"/>${books}<rect x="2" y="30" width="60" height="3" fill="#4a3426"/><rect x="2" y="60" width="60" height="3" fill="#4a3426"/><rect x="2" y="90" width="60" height="4" fill="#4a3426"/>`);
  },
  clockFace: (w, h) => {
    let ticks = '';
    for (let i = 0; i < 12; i++) ticks += `<rect x="62" y="10" width="4" height="12" fill="#2e2718" transform="rotate(${i * 30} 64 64)"/>`;
    return svg(w, h, `<circle cx="64" cy="64" r="62" fill="#5c4d2e"/><circle cx="64" cy="64" r="54" fill="#d8ccaa"/>${ticks}<path d="M64 64 L64 24" stroke="#1e1a14" stroke-width="5"/><path d="M64 64 L90 64" stroke="#1e1a14" stroke-width="4"/><circle cx="64" cy="64" r="5" fill="#1e1a14"/>`);
  },
  torch: (w, h) =>
    svg(w, h, `<rect x="6" y="12" width="4" height="${h - 12}" fill="#4a3426"/><path d="M4 12 L12 12 L10 16 L6 16 Z" fill="#3a3d48"/><path d="M8 12 Q2 6 7 0 Q8 5 11 3 Q14 8 8 12 Z" fill="#f09a3a"/><path d="M8 11 Q5 7 8 4 Q10 8 8 11 Z" fill="#ffe08a"/>`),
  pillar: (w, h) =>
    svg(w, h, `<rect x="0" y="0" width="48" height="12" fill="#4b5160"/><rect x="0" y="${h - 12}" width="48" height="12" fill="#4b5160"/><rect x="6" y="12" width="36" height="${h - 24}" fill="#3a3f4c"/><path d="M14 12 V${h - 12} M24 12 V${h - 12} M34 12 V${h - 12}" stroke="#2e323d" stroke-width="2"/>`),
  bush: (w, h) =>
    svg(w, h, `<path d="M0 32 Q4 14 16 16 Q20 4 32 8 Q44 2 50 14 Q62 14 64 32 Z" fill="#1c2218"/><path d="M8 32 Q14 22 22 24 Q30 16 40 22 Q50 20 56 32 Z" fill="#232b1e"/>`),
};

export function decorationTextures(): SvgTexture[] {
  return Object.entries(D).map(([kind, fn]) => {
    const [w, h] = DECORATION_SIZES[kind] ?? [32, 32];
    return { key: `deco-${kind}`, svg: fn(w, h) };
  });
}
