/** Every texture is authored as SVG in world units and rasterised at 2×. */
export const ART_SCALE = 2;

export interface SvgTexture {
  key: string;
  svg: string;
}

export function svg(w: number, h: number, body: string, defs = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${
    defs ? `<defs>${defs}</defs>` : ''
  }${body}</svg>`;
}

export function dataUri(svgText: string): string {
  // Phaser's loader decodes data URIs with atob, so they must be base64
  const bytes = new TextEncoder().encode(svgText);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:image/svg+xml;base64,' + btoa(bin);
}

/** Deterministic PRNG for procedural silhouettes. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}
