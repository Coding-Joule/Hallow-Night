import { PAL } from './palette';
import { svg, type SvgTexture } from './svg';

const KEY_FILL: Record<string, [string, string]> = {
  gold: ['#e3b44f', '#9c7428'],
  silver: ['#c9ced9', '#7d8494'],
  bone: ['#e2dac2', '#9d9580'],
};

function checkpoint(lit: boolean): string {
  const glass = lit ? '#f7b24e' : '#2b2a33';
  const flame = lit ? `<path d="M16 12 Q13 16 16 20 Q19 16 16 12 Z" fill="#fff0c0"/>` : '';
  return svg(
    32,
    64,
    `<rect x="14" y="20" width="4" height="42" fill="#24232b"/>
     <rect x="10" y="60" width="12" height="4" rx="1" fill="#2e2d36"/>
     <path d="M9 8 L23 8 L21 24 L11 24 Z" fill="#1d1c24" stroke="#4b4a57" stroke-width="1.2"/>
     <path d="M11 10 L21 10 L19.6 22 L12.4 22 Z" fill="${glass}"/>
     ${flame}
     <path d="M8 8 L16 2 L24 8 Z" fill="#33323d"/>
     <rect x="15" y="0" width="2" height="3" fill="#4b4a57"/>`,
  );
}

function goalDoor(): string {
  return svg(
    64,
    88,
    `<path d="M4 88 L4 34 Q4 4 32 4 Q60 4 60 34 L60 88 Z" fill="#2f3341"/>
     <path d="M4 88 L4 34 Q4 4 32 4 Q60 4 60 34 L60 88" fill="none" stroke="#5a6277" stroke-width="3"/>
     <path d="M12 88 L12 36 Q12 13 32 13 Q52 13 52 36 L52 88 Z" fill="url(#portal)"/>
     <circle cx="32" cy="34" r="9" fill="#f1ead2" opacity="0.85"/>
     <circle cx="35" cy="31" r="8" fill="#2b2548" opacity="0.9"/>
     <path d="M26 4 L32 0 L38 4 Z" fill="#5a6277"/>
     <rect x="0" y="84" width="64" height="4" fill="#454b5d"/>`,
    `<linearGradient id="portal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b4a8c"/><stop offset="0.6" stop-color="#2d2450"/><stop offset="1" stop-color="#e8913a" stop-opacity="0.8"/></linearGradient>`,
  );
}

function key(color: string): string {
  const [a, b] = KEY_FILL[color];
  return svg(
    24,
    24,
    `<circle cx="7" cy="12" r="5.5" fill="none" stroke="${a}" stroke-width="3"/>
     <rect x="12" y="10.5" width="11" height="3" fill="${a}"/>
     <rect x="18" y="13" width="2.5" height="5" fill="${b}"/>
     <rect x="21.5" y="13" width="2" height="3.5" fill="${b}"/>
     <circle cx="7" cy="12" r="2" fill="${b}"/>`,
  );
}

function relic(): string {
  return svg(
    20,
    20,
    `<path d="M10 1 L18 10 L10 19 L2 10 Z" fill="#a9d4f5" stroke="#e6f4ff" stroke-width="1"/>
     <path d="M10 5 A5 5 0 1 0 13.5 13.5 A4 4 0 1 1 10 5 Z" fill="#f1ead2"/>`,
  );
}

function lever(on: boolean): string {
  const angle = on ? 35 : -35;
  return svg(
    24,
    32,
    `<g transform="rotate(${angle} 12 26)"><rect x="11" y="6" width="2.5" height="20" fill="#6b6f80"/><circle cx="12.2" cy="6" r="3.4" fill="${on ? '#e8913a' : '#a3362e'}"/></g>
     <path d="M3 32 L5 24 L19 24 L21 32 Z" fill="#2e2d36" stroke="#4b4a57" stroke-width="1"/>`,
  );
}

function button(down: boolean): string {
  return svg(
    32,
    12,
    `<rect x="7" y="${down ? 8 : 4}" width="18" height="${down ? 3 : 7}" rx="1.5" fill="${down ? '#8c6a2a' : '#e8913a'}"/>
     <rect x="2" y="9" width="28" height="3" rx="1" fill="#33323d"/>`,
  );
}

function plate(down: boolean): string {
  return svg(
    48,
    10,
    `<rect x="0" y="6" width="48" height="4" fill="#2a2932"/>
     <rect x="3" y="${down ? 5 : 2}" width="42" height="${down ? 2 : 5}" rx="1" fill="${down ? '#8c6a2a' : '#b98a3c'}"/>
     <path d="M8 ${down ? 5.5 : 4} H40" stroke="#e8c86a" stroke-width="0.8" opacity="0.6"/>`,
  );
}

function timedSwitch(on: boolean): string {
  const sand = on ? '#f0b85a' : '#6c6358';
  return svg(
    24,
    32,
    `<rect x="4" y="27" width="16" height="5" fill="#2e2d36"/>
     <rect x="5" y="3" width="14" height="2.5" fill="#6b5a3a"/><rect x="5" y="24" width="14" height="2.5" fill="#6b5a3a"/>
     <path d="M7 6 L17 6 L12.8 15 L17 24 L7 24 L11.2 15 Z" fill="#c9d4e0" opacity="0.35" stroke="#9aa3b3" stroke-width="0.8"/>
     <path d="M8.5 7.5 L15.5 7.5 L12 13.5 Z" fill="${sand}"/>
     <path d="M9 23 L15 23 L12 19 Z" fill="${sand}"/>`,
  );
}

function spring(compressed: boolean): string {
  const top = compressed ? 9 : 2;
  const coil = compressed
    ? `<path d="M9 14 L23 12 L9 11 L23 10" stroke="#8a8f9e" stroke-width="1.6" fill="none"/>`
    : `<path d="M9 14 L23 12 L9 10 L23 8 L9 6" stroke="#8a8f9e" stroke-width="1.6" fill="none"/>`;
  return svg(
    32,
    16,
    `<rect x="5" y="13" width="22" height="3" fill="#33323d"/>${coil}
     <rect x="4" y="${top}" width="24" height="4" rx="1" fill="#c0703a"/><rect x="4" y="${top}" width="24" height="1.3" fill="#e0a060"/>`,
  );
}

function sign(): string {
  return svg(
    32,
    32,
    `<rect x="14" y="14" width="4" height="18" fill="#3a281e"/>
     <rect x="3" y="4" width="26" height="14" rx="1" fill="#5a4030" stroke="#3a281e" stroke-width="1.5"/>
     <path d="M7 9 H25 M7 13 H20" stroke="#d8d0b8" stroke-width="1.3" opacity="0.7"/>`,
  );
}

function spikeTile(dir: 'up' | 'down' | 'left' | 'right'): string {
  const rot = { up: 0, right: 90, down: 180, left: 270 }[dir];
  return svg(
    16,
    16,
    `<g transform="rotate(${rot} 8 8)"><path d="M0 16 L4 1 L8 16 Z" fill="#b9b3a3"/><path d="M8 16 L12 1 L16 16 Z" fill="#b9b3a3"/>
     <path d="M4 1 L8 16 L6 16 Z M12 1 L16 16 L14 16 Z" fill="#7d786d"/>
     <rect x="0" y="14.5" width="16" height="1.5" fill="#4b4a57"/></g>`,
  );
}

function ironBall(): string {
  let spikes = '';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x1 = 16 + Math.cos(a) * 10;
    const y1 = 16 + Math.sin(a) * 10;
    const x2 = 16 + Math.cos(a) * 16;
    const y2 = 16 + Math.sin(a) * 16;
    const px = Math.cos(a + Math.PI / 2) * 3;
    const py = Math.sin(a + Math.PI / 2) * 3;
    spikes += `<path d="M${x1 + px} ${y1 + py} L${x2} ${y2} L${x1 - px} ${y1 - py} Z" fill="#9aa0ad"/>`;
  }
  return svg(32, 32, `${spikes}<circle cx="16" cy="16" r="11" fill="#3e414c"/><circle cx="13" cy="13" r="3.5" fill="#6a6f7d"/>`);
}

function blade(): string {
  return svg(
    56,
    32,
    `<path d="M4 6 Q28 34 52 6 Q28 22 4 6 Z" fill="#c9ccd6"/>
     <path d="M4 6 Q28 34 52 6 Q28 26 4 6 Z" fill="#7d8190"/>
     <rect x="25" y="0" width="6" height="14" rx="1.5" fill="#3e414c"/>`,
  );
}

function masonry(): string {
  return svg(
    32,
    40,
    `<path d="M2 0 H30 L28 18 L22 30 L16 40 L10 30 L4 18 Z" fill="#6a6358"/>
     <path d="M2 0 H30 L28 18 L22 30 L16 40 Z" fill="#524c43"/>
     <path d="M8 6 L14 12 M20 4 L18 14 L24 20" stroke="#3a352f" stroke-width="1.2" fill="none"/>`,
  );
}

function gateTile(): string {
  return svg(
    32,
    32,
    `<rect x="3" y="0" width="4" height="32" fill="#4b4f5c"/><rect x="14" y="0" width="4" height="32" fill="#4b4f5c"/><rect x="25" y="0" width="4" height="32" fill="#4b4f5c"/>
     <rect x="3" y="0" width="1.3" height="32" fill="#727889"/><rect x="14" y="0" width="1.3" height="32" fill="#727889"/><rect x="25" y="0" width="1.3" height="32" fill="#727889"/>
     <rect x="0" y="13" width="32" height="4" fill="#3a3d48"/>`,
  );
}

function gateTop(): string {
  return svg(32, 12, `<path d="M3 12 L5 0 L7 12 Z M14 12 L16 0 L18 12 Z M25 12 L27 0 L29 12 Z" fill="#727889"/>`);
}

function doorTile(): string {
  return svg(
    32,
    32,
    `<rect x="0" y="0" width="32" height="32" fill="#4a3426"/>
     <path d="M8 0 V32 M16 0 V32 M24 0 V32" stroke="#35251b" stroke-width="1.5"/>
     <rect x="0" y="12" width="32" height="4" fill="#3a3d48"/><circle cx="4" cy="14" r="1" fill="#727889"/><circle cx="28" cy="14" r="1" fill="#727889"/>`,
  );
}

function lock(color: string): string {
  const [a, b] = KEY_FILL[color];
  return svg(
    20,
    24,
    `<path d="M5 10 V7 Q5 2 10 2 Q15 2 15 7 V10" stroke="${b}" stroke-width="2.5" fill="none"/>
     <rect x="2" y="10" width="16" height="13" rx="2" fill="${a}"/>
     <circle cx="10" cy="15" r="2" fill="#1d1c24"/><rect x="9.2" y="15" width="1.6" height="5" fill="#1d1c24"/>`,
  );
}

function crackedTile(): string {
  return svg(
    32,
    32,
    `<rect width="32" height="32" fill="#5a534b"/>
     <rect x="1" y="1" width="30" height="14" fill="#655e55"/><rect x="1" y="17" width="14" height="14" fill="#61594f"/><rect x="17" y="17" width="14" height="14" fill="#655e55"/>
     <path d="M6 2 L12 10 L9 18 L16 24 L14 31 M22 3 L20 12 L27 20" stroke="#2b2722" stroke-width="1.5" fill="none"/>`,
  );
}

function conveyorTile(): string {
  return svg(
    32,
    24,
    `<rect width="32" height="24" rx="3" fill="#3a3d48"/>
     <rect x="0" y="2" width="32" height="5" fill="#2a2c33"/>
     <path d="M2 2 L8 7 M12 2 L18 7 M22 2 L28 7" stroke="#8a6a3a" stroke-width="2"/>
     <circle cx="8" cy="15" r="5" fill="#4b4f5c" stroke="#727889"/><circle cx="24" cy="15" r="5" fill="#4b4f5c" stroke="#727889"/>`,
  );
}

function sludgeSurface(): string {
  return svg(
    32,
    16,
    `<path d="M0 6 Q8 1 16 6 T32 6 V16 H0 Z" fill="${PAL.sludge}"/>
     <path d="M0 6 Q8 1 16 6 T32 6" stroke="#b5e37a" stroke-width="1.5" fill="none"/>
     <circle cx="9" cy="11" r="1.5" fill="#a5d86a" opacity="0.7"/><circle cx="24" cy="13" r="1" fill="#a5d86a" opacity="0.6"/>`,
  );
}

function glow(): string {
  return svg(
    64,
    64,
    `<circle cx="32" cy="32" r="32" fill="url(#g)"/>`,
    `<radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
  );
}

function dot(): string {
  return svg(8, 8, `<circle cx="4" cy="4" r="4" fill="#fff"/>`);
}

function platTile(kind: 'iron' | 'wood' | 'crumble' | 'phantom' | 'elevator' | 'falling'): string {
  switch (kind) {
    case 'iron':
      return svg(32, 24, `<rect width="32" height="24" fill="#434754"/><rect width="32" height="4" fill="#6b7082"/><rect y="20" width="32" height="4" fill="#2e3039"/><circle cx="6" cy="12" r="1.6" fill="#8a8f9e"/><circle cx="26" cy="12" r="1.6" fill="#8a8f9e"/><path d="M16 4 V20" stroke="#2e3039"/>`);
    case 'wood':
    case 'falling':
      return svg(32, 24, `<rect width="32" height="24" fill="#5a4030"/><rect width="32" height="4" fill="#7a5a40"/><path d="M0 12 H32" stroke="#3a281e" stroke-width="1.5"/><path d="M11 4 V12 M23 12 V24" stroke="#3a281e" stroke-width="1.5"/>${kind === 'falling' ? '<path d="M4 18 L9 15 L12 19" stroke="#2a1c14" fill="none"/>' : ''}<circle cx="4" cy="8" r="1" fill="#2a1c14"/>`);
    case 'crumble':
      return svg(32, 24, `<rect width="32" height="24" fill="#5f5850"/><rect width="32" height="3" fill="#7d756a"/><path d="M0 12 H13 M19 12 H32 M16 3 V12 M8 12 V24 M26 12 V24" stroke="#3b3631" stroke-width="1.5"/><path d="M13 12 L16 16 L19 12" stroke="#2b2722" fill="none"/>`);
    case 'phantom':
      return svg(32, 24, `<rect width="32" height="24" fill="#4c3f78"/><rect width="32" height="3" fill="#8f7dd0"/><path d="M0 12 H32 M16 3 V12 M8 12 V24 M24 12 V24" stroke="#352a5a" stroke-width="1.2"/><circle cx="16" cy="18" r="2" fill="#bfb0ff" opacity="0.6"/>`);
    case 'elevator':
      return svg(32, 24, `<rect width="32" height="24" fill="#5c5236"/><rect width="32" height="4" fill="#9a8b52"/><path d="M0 24 L8 4 M8 24 L16 4 M16 24 L24 4 M24 24 L32 4" stroke="#3f3824" stroke-width="2"/>`);
  }
}

export function objectTextures(): SvgTexture[] {
  const t: SvgTexture[] = [
    { key: 'checkpoint-off', svg: checkpoint(false) },
    { key: 'checkpoint-on', svg: checkpoint(true) },
    { key: 'goal', svg: goalDoor() },
    { key: 'relic', svg: relic() },
    { key: 'lever-off', svg: lever(false) },
    { key: 'lever-on', svg: lever(true) },
    { key: 'button-up', svg: button(false) },
    { key: 'button-down', svg: button(true) },
    { key: 'plate-up', svg: plate(false) },
    { key: 'plate-down', svg: plate(true) },
    { key: 'timer-off', svg: timedSwitch(false) },
    { key: 'timer-on', svg: timedSwitch(true) },
    { key: 'spring-0', svg: spring(false) },
    { key: 'spring-1', svg: spring(true) },
    { key: 'sign', svg: sign() },
    { key: 'iron-ball', svg: ironBall() },
    { key: 'blade', svg: blade() },
    { key: 'masonry', svg: masonry() },
    { key: 'gate-tile', svg: gateTile() },
    { key: 'gate-top', svg: gateTop() },
    { key: 'door-tile', svg: doorTile() },
    { key: 'cracked-tile', svg: crackedTile() },
    { key: 'conveyor-tile', svg: conveyorTile() },
    { key: 'sludge-surface', svg: sludgeSurface() },
    { key: 'glow', svg: glow() },
    { key: 'dot', svg: dot() },
  ];
  for (const c of Object.keys(KEY_FILL)) {
    t.push({ key: `key-${c}`, svg: key(c) });
    t.push({ key: `lock-${c}`, svg: lock(c) });
  }
  for (const d of ['up', 'down', 'left', 'right'] as const) t.push({ key: `spikes-${d}`, svg: spikeTile(d) });
  for (const k of ['iron', 'wood', 'crumble', 'phantom', 'elevator', 'falling'] as const)
    t.push({ key: `plat-${k}`, svg: platTile(k) });
  return t;
}

// ───────────────────────────── mechanics after the placement exam

function iceTile(): string {
  return svg(32, 32, `<rect width="32" height="32" fill="#9fd4ee"/><path d="M0 22 L10 14 L18 20 L32 8 V32 H0 Z" fill="#86c2e2"/><path d="M4 6 L12 2 M18 26 L28 18" stroke="#e8f8ff" stroke-width="2" stroke-linecap="round" opacity="0.8"/><rect width="32" height="2" fill="#e8f8ff" opacity="0.5"/>`);
}

function cannon(): string {
  return svg(48, 40, `<rect x="6" y="30" width="32" height="10" rx="3" fill="#4a3424"/><circle cx="14" cy="34" r="6" fill="#2a1d14" stroke="#7a5a3a" stroke-width="2"/><circle cx="32" cy="34" r="6" fill="#2a1d14" stroke="#7a5a3a" stroke-width="2"/>
    <rect x="4" y="10" width="40" height="18" rx="8" fill="#3c3f4a"/><rect x="38" y="8" width="10" height="22" rx="3" fill="#2c2f38"/><rect x="8" y="12" width="26" height="4" rx="2" fill="#6a6e7c"/><circle cx="8" cy="19" r="4" fill="#2c2f38"/>`);
}

function cannonball(): string {
  return svg(24, 24, `<circle cx="12" cy="12" r="10" fill="#22232a"/><circle cx="8.5" cy="8.5" r="3" fill="#5a5c68"/><path d="M18 7 Q21 4 23 6" stroke="#ff9a3a" stroke-width="2" fill="none"/>`);
}

function nozzle(): string {
  return svg(32, 16, `<rect x="2" y="4" width="28" height="12" rx="2" fill="#3a2a24"/><rect x="8" y="0" width="16" height="6" rx="2" fill="#5a3a2a"/><rect x="11" y="0" width="10" height="3" fill="#1a0e0a"/>`);
}

function flame(frame: number): string {
  const w = frame ? 2 : -2;
  return svg(32, 128, `<path d="M4 128 Q${2 + w} 70 12 ${30 + w * 2} Q16 0 20 ${30 - w * 2} Q${30 - w} 70 28 128 Z" fill="#ff6a1a" opacity="0.9"/>
    <path d="M9 128 Q${8 - w} 84 15 ${54 + w * 2} Q17 30 19 ${54 - w} Q${24 + w} 84 23 128 Z" fill="#ffb23a"/>
    <path d="M13 128 Q12 100 16 82 Q20 100 19 128 Z" fill="#fff0b0"/>`);
}

function portal(color: string, glow: string): string {
  return svg(40, 64, `<ellipse cx="20" cy="32" rx="19" ry="31" fill="${color}" opacity="0.35"/><ellipse cx="20" cy="32" rx="16" ry="28" fill="none" stroke="${glow}" stroke-width="3"/><ellipse cx="20" cy="32" rx="11" ry="21" fill="#140a24" opacity="0.85"/>`);
}

function swirl(glow: string): string {
  return svg(40, 40, `<path d="M20 20 m-12 0 a12 12 0 0 1 12 -12 a8 8 0 0 1 8 8 a5 5 0 0 1 -5 5" stroke="${glow}" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 20 m12 0 a12 12 0 0 1 -12 12 a8 8 0 0 1 -8 -8 a5 5 0 0 1 5 -5" stroke="${glow}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>`);
}

function balloon(color: string, light: string): string {
  return svg(32, 56, `<path d="M16 38 Q12 46 16 50 Q20 54 16 56" stroke="#d8d0c0" stroke-width="1" fill="none"/>
    <path d="M16 2 Q30 2 30 18 Q30 32 16 38 Q2 32 2 18 Q2 2 16 2 Z" fill="${color}"/><path d="M14 38 L18 38 L16 41 Z" fill="${color}"/>
    <ellipse cx="10" cy="12" rx="3.5" ry="6" fill="${light}" opacity="0.7" transform="rotate(-20 10 12)"/>`);
}

function lilyPad(): string {
  return svg(32, 16, `<ellipse cx="16" cy="8" rx="16" ry="7" fill="#4f8a3a"/><ellipse cx="16" cy="6" rx="15" ry="5" fill="#6aa84a"/><path d="M16 6 L22 1" stroke="#3a6a2a" stroke-width="1.5"/><circle cx="9" cy="5" r="2" fill="#f0b8d8"/>`);
}

export function mechanicTextures(): SvgTexture[] {
  return [
    { key: 'ice-tile', svg: iceTile() },
    { key: 'cannon', svg: cannon() },
    { key: 'cannonball', svg: cannonball() },
    { key: 'nozzle', svg: nozzle() },
    { key: 'flame-0', svg: flame(0) },
    { key: 'flame-1', svg: flame(1) },
    { key: 'portal-violet', svg: portal('#7a4ad0', '#c8a8ff') },
    { key: 'portal-teal', svg: portal('#2a9a9a', '#9af0f0') },
    { key: 'portal-amber', svg: portal('#c07a1a', '#ffd88a') },
    { key: 'swirl-violet', svg: swirl('#e0d0ff') },
    { key: 'swirl-teal', svg: swirl('#d0ffff') },
    { key: 'swirl-amber', svg: swirl('#fff0c8') },
    { key: 'balloon-pink', svg: balloon('#ff6aa8', '#ffd0e4') },
    { key: 'balloon-orange', svg: balloon('#ff9a3a', '#ffe0b8') },
    { key: 'balloon-purple', svg: balloon('#9a6aff', '#e0d0ff') },
    { key: 'balloon-green', svg: balloon('#6ad06a', '#d0ffd0') },
    { key: 'lily', svg: lilyPad() },
  ];
}
