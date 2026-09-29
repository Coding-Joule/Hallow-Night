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

/** Pumpkin shell (shared by the walking and hiding tortoise). `spin` shifts the ribs for the sliding look. */
function pumpkinShell(cx: number, bottom: number, spin: number): string {
  const top = bottom - 15;
  const ribs = [-7, 0, 7].map((o) => o + spin * 3.5).map((o) => (o > 10.5 ? o - 21 : o)).filter((o) => Math.abs(o) < 8.5);
  return `<path d="M${cx - 12} ${bottom - 5} Q${cx - 12} ${top} ${cx} ${top} Q${cx + 12} ${top} ${cx + 12} ${bottom - 5} Q${cx + 12} ${bottom} ${cx} ${bottom} Q${cx - 12} ${bottom} ${cx - 12} ${bottom - 5} Z" fill="#d9712c"/>
    ${ribs.map((o) => `<path d="M${cx + o} ${top + 1} Q${cx + o * 1.5} ${bottom - 7} ${cx + o} ${bottom - 0.5}" stroke="#b4561f" stroke-width="1.3" fill="none" stroke-linecap="round"/>`).join('')}
    <path d="M${cx - 8} ${top + 4} Q${cx - 5} ${top + 1.5} ${cx - 1} ${top + 1.5}" stroke="#f2a35c" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M${cx - 0.5} ${top + 1} Q${cx - 1} ${top - 3} ${cx + 1.5} ${top - 4}" stroke="#6d7a3a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M${cx + 1} ${top - 2} Q${cx + 5} ${top - 5} ${cx + 5.5} ${top - 1.5}" stroke="#7f9a4a" stroke-width="1" fill="none" stroke-linecap="round"/>`;
}

/** Pumpkin tortoise walking, facing right. Canvas 36×26, feet at the bottom. */
function tortoise(frame: number): string {
  const skin = '#7fa35e';
  const skinDark = '#5f8546';
  const a = frame === 0 ? 1.5 : -1.5;
  const legs = `<rect x="${9 + a}" y="20" width="5" height="6" rx="2.2" fill="${skinDark}"/>
    <rect x="${21 - a}" y="20" width="5" height="6" rx="2.2" fill="${skinDark}"/>
    <rect x="${12 - a}" y="20" width="5" height="6" rx="2.2" fill="${skin}"/>
    <rect x="${24 + a}" y="20" width="5" height="6" rx="2.2" fill="${skin}"/>`;
  const tail = `<path d="M6 19 L2.5 20.5 L6 21.5 Z" fill="${skinDark}"/>`;
  const head = `<path d="M26 15 Q28 12 30 12" stroke="${skin}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="30.5" cy="12" r="4.6" fill="${skin}"/>
    <circle cx="31.6" cy="11" r="1.4" fill="#1d1a24"/>
    <circle cx="32" cy="10.5" r="0.5" fill="#fff"/>
    <path d="M30.5 14.2 Q32.2 15.4 34 14" stroke="#2f3a24" stroke-width="0.8" fill="none" stroke-linecap="round"/>`;
  const rim = `<path d="M6 20 Q17.5 23.5 29 20" stroke="#6b4a2b" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  return svg(36, 26, `${legs}${tail}${head}${pumpkinShell(17.5, 21.5, 0)}${rim}`);
}

/** Tortoise hiding in its shell. Two sleepy eyes peek out while resting; none while spinning. */
function tortoiseShell(spin: number, peek: boolean): string {
  const eyes = peek
    ? `<path d="M22 20 Q25.5 18 29 20 L29 22.5 Q25.5 23.5 22 22.5 Z" fill="#2a1a14"/><circle cx="24.2" cy="21" r="0.8" fill="#f6d27a"/><circle cx="27" cy="21" r="0.8" fill="#f6d27a"/>`
    : '';
  return svg(36, 26, `<ellipse cx="17.5" cy="25" rx="11" ry="1.6" fill="#000" opacity="0.25"/>${pumpkinShell(17.5, 25.5, spin)}${eyes}`);
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
    { key: 'tortoise-0', svg: tortoise(0) },
    { key: 'tortoise-1', svg: tortoise(1) },
    { key: 'tortoise-shell', svg: tortoiseShell(0, true) },
    { key: 'tortoise-spin-0', svg: tortoiseShell(0, false) },
    { key: 'tortoise-spin-1', svg: tortoiseShell(1, false) },
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
