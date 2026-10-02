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

// ───────────────────────────── bosses (canvas 96×84, feet at the bottom, facing right)

function crown(cx: number, top: number, w: number, color = '#e8c25a'): string {
  const l = cx - w / 2;
  return `<path d="M${l} ${top + 12} L${l} ${top + 2} L${l + w * 0.25} ${top + 8} L${cx} ${top} L${l + w * 0.75} ${top + 8} L${l + w} ${top + 2} L${l + w} ${top + 12} Z" fill="${color}" stroke="#8a6a20" stroke-width="1"/>
    <circle cx="${cx}" cy="${top + 7}" r="2" fill="#d9473a"/><circle cx="${l + w * 0.2}" cy="${top + 9}" r="1.3" fill="#5ab0e0"/><circle cx="${l + w * 0.8}" cy="${top + 9}" r="1.3" fill="#5ab0e0"/>`;
}

function bossPumpkinKing(f: number): string {
  const sq = f ? 2 : 0;
  return svg(96, 84, `
    <rect x="30" y="72" width="10" height="12" rx="4" fill="#3f5a2a"/><rect x="56" y="72" width="10" height="12" rx="4" fill="#3f5a2a"/>
    <ellipse cx="48" cy="${52 + sq}" rx="40" ry="${28 - sq}" fill="#e0782c"/>
    <path d="M34 ${27 + sq} Q24 52 34 ${78 - sq} M48 ${25 + sq} V${79 - sq} M62 ${27 + sq} Q72 52 62 ${78 - sq}" stroke="#b8561c" stroke-width="2.5" fill="none"/>
    <path d="M16 46 Q22 30 40 28" stroke="#f4a860" stroke-width="2.5" fill="none" opacity="0.7" stroke-linecap="round"/>
    <path d="M30 ${44 + sq} L40 ${38 + sq} L42 ${50 + sq} Z M58 ${44 + sq} L68 ${38 + sq} L70 ${50 + sq} Z" fill="#ffd25a"/>
    <path d="M28 ${60 + sq} L36 ${66 + sq} L42 ${60 + sq} L48 ${67 + sq} L54 ${60 + sq} L60 ${66 + sq} L68 ${60 + sq} Q48 ${76 + sq} 28 ${60 + sq} Z" fill="#ffd25a"/>
    <path d="M46 ${26 + sq} Q44 ${18 + sq} 50 ${15 + sq}" stroke="#4d6b2c" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${crown(48, 4 + sq, 34)}`);
}

function bossGraveGolem(f: number): string {
  const arm = f ? -4 : 2;
  return svg(96, 84, `
    <rect x="28" y="72" width="14" height="12" rx="3" fill="#5d626e"/><rect x="54" y="72" width="14" height="12" rx="3" fill="#5d626e"/>
    <path d="M20 76 V30 Q20 8 48 8 Q76 8 76 30 V76 Z" fill="#8b909c"/>
    <path d="M24 30 Q26 14 48 12" stroke="#b4b9c4" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M30 12 Q40 4 52 10 Q62 4 68 14 Q56 12 48 16 Q38 12 30 12 Z" fill="#5f8a4a"/>
    <path d="M58 44 L64 52 L60 58 L66 66" stroke="#565b66" stroke-width="2" fill="none"/>
    <rect x="32" y="32" width="11" height="7" rx="2" fill="#5ee0e8"/><rect x="54" y="32" width="11" height="7" rx="2" fill="#5ee0e8"/>
    <path d="M36 54 H62" stroke="#3b3f48" stroke-width="3" stroke-linecap="round"/>
    <rect x="4" y="${44 + arm}" width="18" height="18" rx="5" fill="#767b87"/><rect x="74" y="${44 - arm}" width="18" height="18" rx="5" fill="#767b87"/>`);
}

function bossBatQueen(f: number): string {
  const wing = f ? 'M48 44 Q20 18 2 30 Q12 36 10 46 Q20 42 24 52 Q32 46 40 54 Z' : 'M48 44 Q22 50 2 62 Q14 62 14 70 Q24 62 30 70 Q34 60 42 60 Z';
  const wing2 = f ? 'M48 44 Q76 18 94 30 Q84 36 86 46 Q76 42 72 52 Q64 46 56 54 Z' : 'M48 44 Q74 50 94 62 Q82 62 82 70 Q72 62 66 70 Q62 60 54 60 Z';
  return svg(96, 84, `
    <path d="${wing}" fill="#4a2f6e"/><path d="${wing2}" fill="#4a2f6e"/>
    <ellipse cx="48" cy="50" rx="20" ry="22" fill="#5d3c88"/>
    <path d="M32 34 L30 18 L40 30 Z M64 34 L66 18 L56 30 Z" fill="#5d3c88"/>
    <ellipse cx="48" cy="56" rx="11" ry="12" fill="#7a5aa6"/>
    <circle cx="41" cy="44" r="4" fill="#ff5a5a"/><circle cx="55" cy="44" r="4" fill="#ff5a5a"/>
    <circle cx="42" cy="43" r="1.2" fill="#fff"/><circle cx="56" cy="43" r="1.2" fill="#fff"/>
    <path d="M43 54 L45 59 L47 54 M49 54 L51 59 L53 54" fill="#fff"/>
    ${crown(48, 20, 22, '#d9d2f0')}`);
}

function bossGloomGhost(f: number): string {
  const w = f ? 3 : 0;
  return svg(96, 84, `
    <path d="M12 44 Q12 6 48 6 Q84 6 84 44 L84 ${74 + w} Q76 ${82 - w} 68 ${74 + w} Q60 ${82 - w} 52 ${74 + w} Q44 ${82 - w} 36 ${74 + w} Q28 ${82 - w} 20 ${74 + w} Q14 ${80 - w} 12 ${74 + w} Z" fill="#dcd6f2" opacity="0.95"/>
    <path d="M20 40 Q22 16 44 12" stroke="#fff" stroke-width="3" fill="none" opacity="0.7" stroke-linecap="round"/>
    <ellipse cx="36" cy="36" rx="7" ry="9" fill="#2a2244"/><ellipse cx="60" cy="36" rx="7" ry="9" fill="#2a2244"/>
    <circle cx="38" cy="33" r="2" fill="#b9a8ff"/><circle cx="62" cy="33" r="2" fill="#b9a8ff"/>
    <ellipse cx="48" cy="${56 + w}" rx="8" ry="${7 + w}" fill="#2a2244"/>
    <ellipse cx="26" cy="48" rx="5" ry="3" fill="#f2a6c8" opacity="0.6"/><ellipse cx="70" cy="48" rx="5" ry="3" fill="#f2a6c8" opacity="0.6"/>
    ${crown(48, 0, 26, '#c9b8ff')}`);
}

function bossSlimeKing(f: number): string {
  const sq = f ? 4 : 0;
  return svg(96, 84, `
    <path d="M6 84 Q4 ${40 + sq} 48 ${22 + sq} Q92 ${40 + sq} 90 84 Z" fill="#6cc44e"/>
    <path d="M14 84 Q14 ${52 + sq} 30 ${40 + sq}" stroke="#a6ec7a" stroke-width="4" fill="none" opacity="0.7" stroke-linecap="round"/>
    <ellipse cx="34" cy="${30 + sq}" rx="7" ry="4" fill="#d6ffbe" opacity="0.6"/>
    <circle cx="38" cy="${52 + sq}" r="7" fill="#fff"/><circle cx="60" cy="${52 + sq}" r="7" fill="#fff"/>
    <circle cx="40" cy="${53 + sq}" r="3.5" fill="#1d2a18"/><circle cx="62" cy="${53 + sq}" r="3.5" fill="#1d2a18"/>
    <path d="M40 ${68 + sq / 2} Q50 ${74 + sq / 2} 60 ${68 + sq / 2}" stroke="#2e5a20" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M72 70 Q74 78 72 84 M22 66 Q20 76 22 84" stroke="#4fa034" stroke-width="3" fill="none"/>
    ${crown(48, 10 + sq, 28)}`);
}

function bossClockOwl(f: number): string {
  const wy = f ? -8 : 0;
  return svg(96, 84, `
    <path d="M18 40 Q2 ${52 + wy} 8 ${70 + wy} Q18 60 24 66 Z" fill="#6e4a2e"/><path d="M78 40 Q94 ${52 + wy} 88 ${70 + wy} Q78 60 72 66 Z" fill="#6e4a2e"/>
    <ellipse cx="48" cy="50" rx="30" ry="32" fill="#8a5f3a"/>
    <path d="M22 26 L18 6 L34 20 Z M74 26 L78 6 L62 20 Z" fill="#8a5f3a"/>
    <circle cx="48" cy="60" r="16" fill="#efe4c8" stroke="#c9a96a" stroke-width="2.5"/>
    <path d="M48 60 V49 M48 60 L56 63" stroke="#3b2b1c" stroke-width="2" stroke-linecap="round"/>
    <path d="M48 46 V48 M62 60 H60 M48 74 V72 M34 60 H36" stroke="#3b2b1c" stroke-width="1.5"/>
    <circle cx="36" cy="34" r="10" fill="#f4d35e"/><circle cx="60" cy="34" r="10" fill="#f4d35e"/>
    <circle cx="38" cy="35" r="4.5" fill="#1d160f"/><circle cx="62" cy="35" r="4.5" fill="#1d160f"/>
    <path d="M45 42 L48 48 L51 42 Z" fill="#e0902c"/>
    <path d="M38 80 V84 M58 80 V84" stroke="#e0902c" stroke-width="4" stroke-linecap="round"/>`);
}

function bossMidnightKing(f: number): string {
  const c = f ? 3 : 0;
  return svg(96, 84, `
    <path d="M20 84 Q16 50 28 36 L68 36 Q80 50 ${76 + c} 84 Q62 ${78 - c} 48 84 Q34 ${78 + c} 20 84 Z" fill="#2b1b45"/>
    <path d="M30 40 Q26 60 30 80" stroke="#4a3270" stroke-width="3" fill="none"/>
    <ellipse cx="48" cy="34" rx="20" ry="18" fill="#1a1028"/>
    <path d="M28 34 Q30 14 48 14 Q66 14 68 34 Z" fill="#2b1b45"/>
    <ellipse cx="40" cy="36" rx="4.5" ry="3" fill="#ff6a3a"/><ellipse cx="56" cy="36" rx="4.5" ry="3" fill="#ff6a3a"/>
    <path d="M42 46 Q48 50 54 46" stroke="#ff6a3a" stroke-width="1.5" fill="none" opacity="0.8"/>
    <circle cx="48" cy="62" r="5" fill="#e8c25a"/><circle cx="46.5" cy="61" r="4" fill="#2b1b45"/>
    ${crown(48, 2, 32)}`);
}

export function bossTextures(): SvgTexture[] {
  const all: Record<string, (f: number) => string> = {
    pumpkinKing: bossPumpkinKing,
    graveGolem: bossGraveGolem,
    batQueen: bossBatQueen,
    gloomGhost: bossGloomGhost,
    slimeKing: bossSlimeKing,
    clockOwl: bossClockOwl,
    midnightKing: bossMidnightKing,
  };
  return Object.entries(all).flatMap(([k, fn]) => [0, 1].map((f) => ({ key: `boss-${k}-${f}`, svg: fn(f) })));
}
