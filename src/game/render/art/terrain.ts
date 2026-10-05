import { svg, type SvgTexture } from './svg';

export const TERRAIN_STYLES = ['earth', 'stone', 'brick', 'wood', 'bone', 'iron'] as const;
export type TerrainStyle = (typeof TERRAIN_STYLES)[number];

function fill(style: TerrainStyle): string {
  switch (style) {
    case 'earth':
      return svg(32, 32, `<rect width="32" height="32" fill="#2a2430"/><circle cx="7" cy="9" r="2.5" fill="#342d3b"/><circle cx="23" cy="20" r="3" fill="#342d3b"/><circle cx="14" cy="27" r="1.6" fill="#221d27"/><circle cx="27" cy="5" r="1.5" fill="#221d27"/><path d="M3 18 l3 1 M18 8 l3 -1" stroke="#3a3242" stroke-width="1"/>`);
    case 'stone':
      return svg(32, 32, `<rect width="32" height="32" fill="#2f3441"/><rect x="1" y="1" width="18" height="14" rx="1" fill="#383e4d"/><rect x="21" y="1" width="10" height="14" rx="1" fill="#353b49"/><rect x="1" y="17" width="9" height="14" rx="1" fill="#353b49"/><rect x="12" y="17" width="19" height="14" rx="1" fill="#383e4d"/><path d="M4 5 l5 2" stroke="#444b5c" stroke-width="1"/>`);
    case 'brick':
      return svg(32, 32, `<rect width="32" height="32" fill="#231f24"/><rect x="1" y="1" width="14" height="6" fill="#4a2f2c"/><rect x="17" y="1" width="14" height="6" fill="#43302c"/><rect x="-7" y="9" width="14" height="6" fill="#43302c"/><rect x="9" y="9" width="14" height="6" fill="#4d332e"/><rect x="25" y="9" width="14" height="6" fill="#43302c"/><rect x="1" y="17" width="14" height="6" fill="#4d332e"/><rect x="17" y="17" width="14" height="6" fill="#4a2f2c"/><rect x="-7" y="25" width="14" height="6" fill="#4a2f2c"/><rect x="9" y="25" width="14" height="6" fill="#43302c"/><rect x="25" y="25" width="14" height="6" fill="#4d332e"/>`);
    case 'wood':
      return svg(32, 32, `<rect width="32" height="32" fill="#3a281e"/><rect x="0" y="0" width="32" height="7" fill="#4a3426"/><rect x="0" y="8" width="32" height="7" fill="#45301f"/><rect x="0" y="16" width="32" height="7" fill="#4a3426"/><rect x="0" y="24" width="32" height="7" fill="#45301f"/><path d="M10 0 V7 M24 8 V15 M6 16 V23 M20 24 V31" stroke="#2a1c14" stroke-width="1.2"/>`);
    case 'bone':
      return svg(32, 32, `<rect width="32" height="32" fill="#2d2a26"/><ellipse cx="8" cy="8" rx="6" ry="5" fill="#6d665a"/><circle cx="6" cy="7" r="1.3" fill="#2d2a26"/><circle cx="10" cy="7" r="1.3" fill="#2d2a26"/><path d="M16 22 h12 M17 20 v4 M27 20 v4" stroke="#5f594e" stroke-width="2.5"/><path d="M2 26 l10 -4" stroke="#57524a" stroke-width="2.2"/><circle cx="24" cy="8" r="3" fill="#4b463e"/>`);
    case 'iron':
      return svg(32, 32, `<rect width="32" height="32" fill="#30333d"/><rect x="1" y="1" width="30" height="30" fill="#383c48"/><circle cx="4" cy="4" r="1.4" fill="#5c6272"/><circle cx="28" cy="4" r="1.4" fill="#5c6272"/><circle cx="4" cy="28" r="1.4" fill="#5c6272"/><circle cx="28" cy="28" r="1.4" fill="#5c6272"/><path d="M1 16 H31" stroke="#2a2c34" stroke-width="1.5"/>`);
  }
}

function top(style: TerrainStyle): string {
  switch (style) {
    case 'earth':
      return svg(32, 10, `<rect y="2" width="32" height="8" fill="#3a3a2c"/><path d="M0 3 L2 0 L4 3 L7 1 L9 3 L12 0 L14 3 L17 1 L20 3 L22 0 L25 3 L28 1 L30 3 L32 1 V4 H0 Z" fill="#4e5436"/><rect y="3" width="32" height="2" fill="#5c6340"/>`);
    case 'stone':
      return svg(32, 10, `<rect width="32" height="7" fill="#505a6c"/><rect width="32" height="2" fill="#6a7488"/><path d="M11 0 V7 M27 0 V7" stroke="#394150" stroke-width="1.2"/><rect y="7" width="32" height="3" fill="#252a35"/>`);
    case 'brick':
      return svg(32, 10, `<rect width="32" height="7" fill="#4b4a52"/><rect width="32" height="2" fill="#63626b"/><path d="M15 0 V7 M31 0 V7" stroke="#34333a" stroke-width="1.2"/><rect y="7" width="32" height="3" fill="#1c191d"/>`);
    case 'wood':
      return svg(32, 10, `<rect width="32" height="6" fill="#6b4c36"/><rect width="32" height="2" fill="#86633f"/><rect y="6" width="32" height="4" fill="#2a1c14"/><circle cx="5" cy="3" r="1" fill="#3a281e"/><circle cx="21" cy="3" r="1" fill="#3a281e"/>`);
    case 'bone':
      return svg(32, 10, `<rect width="32" height="6" fill="#77705f"/><rect width="32" height="2" fill="#a39a82"/><circle cx="6" cy="3" r="2.4" fill="#8e8672"/><circle cx="22" cy="3.5" r="2" fill="#8e8672"/><rect y="6" width="32" height="4" fill="#24211e"/>`);
    case 'iron':
      return svg(32, 10, `<rect width="32" height="6" fill="#5c6272"/><rect width="32" height="2" fill="#7d8496"/><circle cx="8" cy="3.5" r="1.2" fill="#3a3d48"/><circle cx="24" cy="3.5" r="1.2" fill="#3a3d48"/><rect y="6" width="32" height="4" fill="#23252c"/>`);
  }
}

export function terrainTextures(): SvgTexture[] {
  const out: SvgTexture[] = [];
  for (const s of TERRAIN_STYLES) {
    out.push({ key: `terrain-${s}`, svg: fill(s) });
    out.push({ key: `top-${s}`, svg: top(s) });
  }
  out.push({
    key: 'oneway-wood',
    svg: svg(32, 16, `<rect width="32" height="6" fill="#6b4c36"/><rect width="32" height="2" fill="#8a6644"/><path d="M4 6 L10 16 M28 6 L22 16" stroke="#3a281e" stroke-width="2.5"/><circle cx="16" cy="3" r="1" fill="#3a281e"/>`),
  });
  out.push({
    key: 'oneway-stone',
    svg: svg(32, 16, `<rect width="32" height="7" fill="#505a6c"/><rect width="32" height="2" fill="#6a7488"/><path d="M8 7 Q16 16 24 7" fill="#3a4150"/><path d="M15 0 V7" stroke="#394150"/>`),
  });
  out.push({
    key: 'oneway-iron',
    svg: svg(32, 16, `<rect width="32" height="5" fill="#5c6272"/><rect width="32" height="1.5" fill="#7d8496"/><path d="M0 5 L8 14 L16 5 L24 14 L32 5" stroke="#3a3d48" stroke-width="2" fill="none"/>`),
  });
  return out;
}

/** Default terrain style for each world when a block uses style "auto". */
export const WORLD_TERRAIN: Record<string, { ground: TerrainStyle; platform: TerrainStyle; tint: number }> = {
  'old-town': { ground: 'brick', platform: 'stone', tint: 0xffffff },
  graveyard: { ground: 'earth', platform: 'stone', tint: 0xe6ecef },
  'dead-woods': { ground: 'earth', platform: 'wood', tint: 0xdfe8d8 },
  'haunted-manor': { ground: 'wood', platform: 'stone', tint: 0xf0e0ee },
  catacombs: { ground: 'bone', platform: 'stone', tint: 0xdde8d2 },
  clocktower: { ground: 'brick', platform: 'iron', tint: 0xf4e6cc },
  'black-castle': { ground: 'stone', platform: 'iron', tint: 0xd8cfd8 },
  'frozen-hollow': { ground: 'stone', platform: 'wood', tint: 0xcfe8ff },
  'candy-carnival': { ground: 'brick', platform: 'wood', tint: 0xffc8ec },
  'witch-swamp': { ground: 'earth', platform: 'wood', tint: 0xc8e0a8 },
  'ghost-harbor': { ground: 'wood', platform: 'wood', tint: 0xc8e0e8 },
  'lava-crypt': { ground: 'stone', platform: 'iron', tint: 0xffb898 },
  'sky-ruins': { ground: 'stone', platform: 'stone', tint: 0xe0e0ff },
  'toy-factory': { ground: 'brick', platform: 'iron', tint: 0xfff0c8 },
  'mirror-manor': { ground: 'wood', platform: 'stone', tint: 0xc8f4f4 },
  'moon-garden': { ground: 'earth', platform: 'stone', tint: 0xe8e8ff },
  'nightmare-realm': { ground: 'bone', platform: 'iron', tint: 0xe0b8f0 },
  'goblin-market': { ground: 'brick', platform: 'wood', tint: 0xf0e8b0 },
  'starfall-peak': { ground: 'stone', platform: 'stone', tint: 0xc8d8ff },
};
