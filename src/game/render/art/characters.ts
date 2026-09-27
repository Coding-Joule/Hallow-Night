import { PAL } from './palette';
import { svg, type SvgTexture } from './svg';

/**
 * The lantern-bearer (player) and all enemies. Sprites face RIGHT; the
 * renderer mirrors them. Player canvas: 32×40, feet at (16, 40).
 */

interface PlayerPose {
  legs: [number, number, number, number]; // back leg x, back leg lift, front leg x, front leg lift
  bodyDrop: number; // shifts upper body down (breathing, crouch)
  lean: number; // skew of the cloak in px (run lean)
  scarf: 'back' | 'up' | 'down' | 'flow';
  crouch?: boolean;
  wall?: boolean;
}

function player(p: PlayerPose): string {
  const d = p.bodyDrop;
  const l = p.lean;
  const [bx, bl, fx, fl] = p.legs;
  const legs = `
    <rect x="${bx}" y="${33 - bl}" width="4" height="${7}" rx="1.5" fill="#15121d"/>
    <rect x="${fx}" y="${33 - fl}" width="4" height="${7}" rx="1.5" fill="#1d1928"/>`;
  const cloak = `<path d="M${10 + l} ${17 + d} Q16 ${14 + d} ${22 + l} ${17 + d} L${26 + l * 0.3} ${35} Q16 ${37} ${6 + l * 0.3} ${35} Z" fill="${PAL.cloak}"/>
    <path d="M${16 + l} ${17 + d} L${24 + l * 0.3} ${35} Q20 ${36} ${17} ${36} Z" fill="${PAL.cloakLight}" opacity="0.5"/>`;
  const hood = `<path d="M${9 + l} ${14 + d} Q${9 + l} ${4 + d} ${16 + l} ${4 + d} Q${24 + l} ${4 + d} ${24 + l} ${14 + d} Q${24 + l} ${19 + d} ${16 + l} ${19 + d} Q${9 + l} ${19 + d} ${9 + l} ${14 + d} Z" fill="${PAL.cloak}"/>
    <path d="M${12 + l} ${6 + d} Q${16 + l} ${3.5 + d} ${21 + l} ${6.5 + d}" stroke="${PAL.cloakLight}" stroke-width="1.2" fill="none" opacity="0.8"/>
    <ellipse cx="${18.5 + l}" cy="${12.5 + d}" rx="4.6" ry="4.2" fill="#0e0b15"/>
    <circle cx="${17.3 + l}" cy="${12.3 + d}" r="0.9" fill="#f3b760"/>
    <circle cx="${20.6 + l}" cy="${12.3 + d}" r="0.9" fill="#f3b760"/>`;
  let scarfTail = '';
  const sy = 17.5 + d;
  if (p.scarf === 'back') scarfTail = `<path d="M${11 + l} ${sy} Q${6 + l} ${sy + 1} ${4 + l} ${sy + 5} L${7 + l} ${sy + 5} Q${8 + l} ${sy + 2} ${12 + l} ${sy + 2} Z" fill="${PAL.scarf}"/>`;
  if (p.scarf === 'flow') scarfTail = `<path d="M${11 + l} ${sy} Q${5 + l} ${sy - 1} ${1 + l} ${sy + 1} L${3 + l} ${sy + 3} Q${7 + l} ${sy + 2} ${12 + l} ${sy + 2} Z" fill="${PAL.scarf}"/>`;
  if (p.scarf === 'up') scarfTail = `<path d="M${11 + l} ${sy} Q${7 + l} ${sy - 4} ${6 + l} ${sy - 9} L${9 + l} ${sy - 8} Q${10 + l} ${sy - 3} ${13 + l} ${sy + 1} Z" fill="${PAL.scarf}"/>`;
  if (p.scarf === 'down') scarfTail = `<path d="M${11 + l} ${sy} Q${9 + l} ${sy + 5} ${9 + l} ${sy + 9} L${12 + l} ${sy + 8} Q${12 + l} ${sy + 4} ${13 + l} ${sy + 2} Z" fill="${PAL.scarf}"/>`;
  const scarf = `<path d="M${10 + l} ${sy - 1} Q16 ${sy + 2.5} ${23 + l} ${sy - 1} L${23 + l} ${sy + 1.5} Q16 ${sy + 4.5} ${10 + l} ${sy + 1.5} Z" fill="${PAL.scarf}"/>${scarfTail}`;
  const lx = p.wall ? 22 : 25 + l * 0.5;
  const ly = p.wall ? 20 + d : 24 + d;
  const lantern = `<path d="M${lx - 2} ${ly - 3} Q${lx} ${ly - 7} ${lx + 2} ${ly - 3}" stroke="#2a2530" stroke-width="1" fill="none"/>
    <rect x="${lx - 2.5}" y="${ly - 3}" width="5" height="6" rx="1" fill="#2a2530"/>
    <rect x="${lx - 1.6}" y="${ly - 2}" width="3.2" height="4" fill="#f5b04f"/>
    <rect x="${lx - 0.6}" y="${ly - 1.4}" width="1.2" height="2.6" fill="#fff0c8"/>`;
  return svg(32, 40, `${legs}${cloak}${scarf}${hood}${lantern}`);
}

export function playerTextures(): SvgTexture[] {
  const poses: Record<string, PlayerPose> = {
    idle0: { legs: [11, 0, 17, 0], bodyDrop: 0, lean: 0, scarf: 'back' },
    idle1: { legs: [11, 0, 17, 0], bodyDrop: 0.8, lean: 0, scarf: 'down' },
    run0: { legs: [8, 1, 19, 0], bodyDrop: 0, lean: 1.5, scarf: 'flow' },
    run1: { legs: [11, 2, 16, 0], bodyDrop: 1, lean: 1.5, scarf: 'back' },
    run2: { legs: [18, 0, 9, 1], bodyDrop: 0, lean: 1.5, scarf: 'flow' },
    run3: { legs: [14, 0, 12, 2], bodyDrop: 1, lean: 1.5, scarf: 'back' },
    jump: { legs: [10, 3, 18, 1], bodyDrop: 0, lean: 0.5, scarf: 'down' },
    fall: { legs: [10, 0, 18, 2], bodyDrop: 0, lean: 0, scarf: 'up' },
    wall: { legs: [15, 2, 19, 0], bodyDrop: 0, lean: 1, scarf: 'up', wall: true },
    dash: { legs: [7, 2, 20, 2], bodyDrop: 1, lean: 3, scarf: 'flow' },
    crouch: { legs: [9, 0, 19, 0], bodyDrop: 9, lean: 0.5, scarf: 'back', crouch: true },
  };
  return Object.entries(poses).map(([k, pose]) => ({ key: `player-${k}`, svg: player(pose) }));
}

// ───────────────────────────── enemies

function skeleton(frame: number, armored: boolean): string {
  const w = armored ? 28 : 24;
  const cx = w / 2;
  const legA = frame === 0 ? [cx - 5, cx + 2] : [cx - 3, cx];
  const bone = PAL.bone;
  const legs = `<rect x="${legA[0]}" y="30" width="3" height="${armored ? 14 : 12}" fill="${bone}"/><rect x="${legA[1]}" y="30" width="3" height="${armored ? 14 : 12}" fill="${PAL.boneDark}"/>`;
  const ribs = `<rect x="${cx - 1}" y="14" width="2" height="17" fill="${bone}"/>
    <path d="M${cx - 6} 17 H${cx + 6} M${cx - 6} 21 H${cx + 6} M${cx - 5} 25 H${cx + 5}" stroke="${bone}" stroke-width="1.6"/>
    <rect x="${cx - 6}" y="29" width="12" height="3" rx="1" fill="${PAL.boneDark}"/>`;
  const arm = frame === 0
    ? `<path d="M${cx + 5} 16 L${cx + 9} 23 L${cx + 10} 28" stroke="${bone}" stroke-width="2" fill="none"/>`
    : `<path d="M${cx + 5} 16 L${cx + 8} 24 L${cx + 11} 26" stroke="${bone}" stroke-width="2" fill="none"/>`;
  const armBack = `<path d="M${cx - 5} 16 L${cx - 8} 23 L${cx - 7} 28" stroke="${PAL.boneDark}" stroke-width="2" fill="none"/>`;
  const skull = `<path d="M${cx - 6} 8 Q${cx - 6} 1 ${cx} 1 Q${cx + 7} 1 ${cx + 7} 8 L${cx + 6} 12 L${cx - 4} 12 Z" fill="${bone}"/>
    <rect x="${cx - 2}" y="11" width="7" height="3" fill="${PAL.boneDark}"/>
    <ellipse cx="${cx + 3.5}" cy="7" rx="1.8" ry="2" fill="#140f18"/>
    <ellipse cx="${cx - 1}" cy="7" rx="1.6" ry="2" fill="#140f18"/>`;
  let armor = '';
  if (armored) {
    armor = `<path d="M${cx - 7} 7 Q${cx - 7} -1 ${cx} -1 Q${cx + 8} -1 ${cx + 8} 7 L${cx + 8} 9 L${cx - 7} 9 Z" fill="${PAL.iron}"/>
      <path d="M${cx} -1 L${cx + 1} -6 L${cx + 2} -1 Z" fill="${PAL.ironLight}"/>
      <rect x="${cx - 7}" y="6" width="15" height="2" fill="${PAL.ironLight}"/>
      <circle cx="${cx + 3.5}" cy="7.5" r="1" fill="#e0523f"/>
      <path d="M${cx - 8} 14 H${cx + 8} L${cx + 7} 29 H${cx - 7} Z" fill="${PAL.iron}"/>
      <path d="M${cx - 8} 14 H${cx + 8}" stroke="${PAL.ironLight}" stroke-width="1.5"/>
      <path d="M${cx - 4} 18 L${cx} 16 L${cx + 4} 18 M${cx - 4} 23 L${cx} 21 L${cx + 4} 23" stroke="${PAL.ironLight}" stroke-width="1" fill="none"/>
      <path d="M${cx + 8} 15 l4 -3 l-1 5 Z M${cx - 8} 15 l-4 -3 l1 5 Z" fill="${PAL.ironLight}"/>
      <rect x="${cx + 8}" y="17" width="6" height="12" rx="1" fill="#383b46" stroke="${PAL.ironLight}" stroke-width="1"/>`;
  }
  const h = armored ? 44 : 42;
  const yShift = armored ? 6 : 0;
  return svg(w + (armored ? 6 : 0), h + yShift, `<g transform="translate(0 ${yShift})">${legs}${armBack}${ribs}${arm}${skull}${armor}</g>`);
}

function ghost(frame: number): string {
  const wob = frame === 0 ? 0 : 1.5;
  return svg(
    30,
    34,
    `<path d="M3 16 Q3 2 15 2 Q27 2 27 16 L27 ${29 + wob} Q24 ${32 - wob} 21 ${29 + wob} Q18 ${33 - wob} 15 ${29 + wob} Q12 ${33 - wob} 9 ${29 + wob} Q6 ${32 - wob} 3 ${29 + wob} Z" fill="url(#gg)" />
     <ellipse cx="11" cy="13" rx="2.6" ry="3.6" fill="#1a1a2e"/>
     <ellipse cx="19" cy="13" rx="2.6" ry="3.6" fill="#1a1a2e"/>
     <ellipse cx="15" cy="21" rx="1.8" ry="2.4" fill="#1a1a2e" opacity="0.7"/>`,
    `<linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8eefa" stop-opacity="0.95"/><stop offset="1" stop-color="#9fb1d6" stop-opacity="0.35"/></linearGradient>`,
  );
}

function bat(frame: number): string {
  const wings =
    frame === 0
      ? `<path d="M14 9 L3 2 L5 7 L0 8 L4 11 L2 15 L14 12 Z M14 9 L25 2 L23 7 L28 8 L24 11 L26 15 L14 12 Z" fill="#3a2a4a"/>`
      : `<path d="M14 9 L4 14 L6 10 L1 11 L5 7 L3 4 L14 8 Z M14 9 L24 14 L22 10 L27 11 L23 7 L25 4 L14 8 Z" fill="#3a2a4a"/>`;
  return svg(
    28,
    18,
    `${wings}<ellipse cx="14" cy="10" rx="4" ry="5" fill="#2a1f36"/>
     <path d="M11 6 L11.5 3 L13 5.5 Z M17 6 L16.5 3 L15 5.5 Z" fill="#2a1f36"/>
     <circle cx="12.6" cy="9" r="0.9" fill="#e0523f"/><circle cx="15.4" cy="9" r="0.9" fill="#e0523f"/>`,
  );
}

function raven(frame: number): string {
  const wing =
    frame === 0
      ? `<path d="M14 9 Q10 0 20 1 Q18 6 20 9 Z" fill="#26222e"/>`
      : `<path d="M14 10 Q10 19 21 18 Q18 13 20 10 Z" fill="#26222e"/>`;
  return svg(
    34,
    20,
    `<path d="M2 10 L7 7 L7 12 Z" fill="#1c1922"/>
     <ellipse cx="17" cy="10" rx="10" ry="5" fill="#1c1922"/>
     <circle cx="27" cy="8" r="4" fill="#1c1922"/>
     <path d="M30 7 L34 8.5 L30 10 Z" fill="#6b6150"/>
     <circle cx="28" cy="7" r="0.9" fill="#e8c86a"/>
     ${wing}`,
  );
}

function shadow(): string {
  return svg(
    28,
    40,
    `<path d="M4 40 Q2 28 6 18 Q4 8 10 3 Q14 0 18 3 Q24 8 22 18 Q26 28 24 40 Q20 35 17 40 Q14 34 11 40 Q8 35 4 40 Z" fill="#0c0812" opacity="0.95"/>
     <path d="M9 12 L13 13 L9 14 Z M19 12 L15 13 L19 14 Z" fill="#c9b8ff"/>`,
  );
}

function shadowPool(): string {
  return svg(40, 10, `<ellipse cx="20" cy="5" rx="19" ry="4.5" fill="#0c0812" opacity="0.9"/><ellipse cx="20" cy="4.5" rx="13" ry="2.4" fill="#2a1840" opacity="0.8"/>`);
}

export function enemyTextures(): SvgTexture[] {
  return [
    { key: 'skeleton-0', svg: skeleton(0, false) },
    { key: 'skeleton-1', svg: skeleton(1, false) },
    { key: 'armored-0', svg: skeleton(0, true) },
    { key: 'armored-1', svg: skeleton(1, true) },
    { key: 'ghost-0', svg: ghost(0) },
    { key: 'ghost-1', svg: ghost(1) },
    { key: 'bat-0', svg: bat(0) },
    { key: 'bat-1', svg: bat(1) },
    { key: 'raven-0', svg: raven(0) },
    { key: 'raven-1', svg: raven(1) },
    { key: 'shadow', svg: shadow() },
    { key: 'shadow-pool', svg: shadowPool() },
  ];
}
