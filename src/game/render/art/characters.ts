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

/** Cute chibi skeleton (and a little knight version). Canvas 30×40, feet at the bottom. */
function skeleton(frame: number, armored: boolean): string {
  const bone = '#efe6cf';
  const shade = '#cfc3a4';
  const dark = '#2a2230';
  const step = frame === 0 ? 1.5 : -1.5;
  const legs = `<rect x="${10 + step}" y="33" width="4" height="7" rx="2" fill="${shade}"/>
    <rect x="${16 - step}" y="33" width="4" height="7" rx="2" fill="${bone}"/>`;
  const body = `<ellipse cx="15" cy="29" rx="6" ry="5.5" fill="${bone}"/>
    <path d="M11 27.5 H19 M11.5 30.5 H18.5" stroke="${shade}" stroke-width="1.3" stroke-linecap="round"/>`;
  const arms = frame === 0
    ? `<path d="M9.5 27 Q6 29 6.5 32" stroke="${bone}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M20.5 27 Q24 26 24.5 23" stroke="${bone}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    : `<path d="M9.5 27 Q6 26 5.5 23" stroke="${bone}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M20.5 27 Q24 29 23.5 32" stroke="${bone}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  const head = `<circle cx="15" cy="13" r="11" fill="${bone}"/>
    <ellipse cx="15" cy="21.5" rx="5.5" ry="2.6" fill="${bone}"/>
    <ellipse cx="11" cy="13.5" rx="3.1" ry="3.6" fill="${dark}"/>
    <ellipse cx="19" cy="13.5" rx="3.1" ry="3.6" fill="${dark}"/>
    <circle cx="12" cy="12.2" r="1.1" fill="#fff"/>
    <circle cx="20" cy="12.2" r="1.1" fill="#fff"/>
    <ellipse cx="7.5" cy="17.5" rx="1.8" ry="1.1" fill="#f0a6a0" opacity="0.55"/>
    <ellipse cx="22.5" cy="17.5" rx="1.8" ry="1.1" fill="#f0a6a0" opacity="0.55"/>
    <path d="M12.5 19 Q15 21 17.5 19" stroke="${dark}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
  let helmet = '';
  if (armored) {
    helmet = `<path d="M3.5 12 Q3.5 1 15 1 Q26.5 1 26.5 12 L26.5 13 Q20 9.5 15 9.5 Q10 9.5 3.5 13 Z" fill="#8c95ad"/>
      <path d="M5 8 Q15 3 25 8" stroke="#b8c0d4" stroke-width="1.2" fill="none"/>
      <rect x="13.5" y="1" width="3" height="9" rx="1.2" fill="#6f7891"/>
      <path d="M15 1 Q13 -4 17 -6 Q21 -4 18 0 Z" fill="#e8913a"/>
      <path d="M9.5 25 Q15 22.5 20.5 25 L20 32 Q15 34 10 32 Z" fill="#8c95ad"/>
      <circle cx="15" cy="28" r="1.4" fill="#e8c86a"/>`;
  }
  return svg(30, 46, `<g transform="translate(0 6)">${legs}${arms}${body}${head}${helmet}</g>`);
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
