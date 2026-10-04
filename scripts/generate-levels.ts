/**
 * Builds the whole built-in campaign: 7 worlds × 12 levels (11 stages and a
 * boss arena per world). Every level is assembled from hand-tuned pieces
 * ("segments") and then checked with the reachability bot, which runs the
 * real player physics: the exit and the relic must be reachable and there
 * must be no spot you can fall into but never leave. A level that fails is
 * rebuilt from the next seed.
 *
 *   npx tsx scripts/generate-levels.ts            # all levels
 *   npx tsx scripts/generate-levels.ts 2 5        # only world 2, level 5 (for tuning)
 *
 * Output: levels/<world>/NN-name.json and levels/manifest.json.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DECORATION_SIZES, defaultProperties } from '../src/game/levels/objectTypes';
import type { LevelAbilities, LevelData, LevelObject, ObjectType, PropertyValue } from '../src/game/levels/schema';
import { levelToJSON, manifestEntry } from '../src/game/levels/serialize';
import { parseLevel } from '../src/game/levels/validate';
import { WORLDS, type WorldId } from '../src/game/levels/worlds';
import { reach } from './reachability';

const T = 32;
const H = 40; // level height in tiles
const LEVELS_PER_WORLD = 12;
const root = resolve(import.meta.dirname, '..');

// ───────────────────────────── names & themes

const NAMES: Record<WorldId, string[]> = {
  'old-town': ['Pumpkin Lane', 'Lamplight Row', 'Candy Corner', 'Rooftop Romp', 'Spring Street', 'Market Square', 'Cobblestone Climb', 'Weathervane Way', 'Lantern Bridge', 'Old Mill Run', 'Town Hall Hustle', 'The Pumpkin King'],
  graveyard: ['Mossy Graves', 'Tombstone Trail', 'Crumbling Crypts', 'Bell Rope Bounce', 'Willow Hollow', 'Foggy Rows', 'Mausoleum Steps', 'Bonefield', "Gravekeeper's Gate", 'Lantern Vigil', 'Midnight Mound', 'The Grave Golem'],
  'dead-woods': ['Twisted Path', 'Hollow Log Hop', "Raven's Rest", 'Bramble Bounce', 'Owl Wood', 'Thornback Ridge', 'Witchlight Glade', 'Root Tunnel', 'Spider Silk Span', 'Moonlit Clearing', 'Batwing Gorge', 'The Bat Queen'],
  'haunted-manor': ['Grand Foyer', 'Portrait Hall', 'Ballroom Bounce', 'Library Ladders', 'Dusty Pantry', 'Secret Stairs', 'Candle Corridor', 'Music Room', 'Nursery of Whispers', 'Rooftop Gables', 'Master Bedroom', 'Lady Gloom'],
  catacombs: ['Bone Stairs', 'Ossuary Run', 'Slime Pools', 'Rattling Halls', 'Torchlit Tunnels', 'Sunken Shrine', 'Chain Bridge', 'Crypt Crossing', 'Drip Caverns', 'Sludge Falls', 'Deep Vault', 'The Slime King'],
  clocktower: ['Tick Tock Stairs', 'Cogwheel Climb', 'Pendulum Hall', 'Spring Loaded', 'Belt Drive', 'Chime Chamber', 'Gear Garden', 'Clockface Ledge', 'Escapement', 'Minute Hand Run', 'The Last Second', 'The Clockwork Owl'],
  'black-castle': ['Drawbridge Dash', 'Ramparts', 'Shadow Moat', 'Iron Halls', 'Throne Approach', 'Dungeon Break', 'Banner Walk', 'Spire Bounce', 'Dark Chapel', 'Crown Tower', 'Midnight Stair', 'The Midnight King'],
  'frozen-hollow': ['Snowdrift Start', 'Icicle Alley', 'Frostbite Hop', 'Pine Needle Peaks', 'Shiver Bridge', 'Snowman Square', 'Glacier Gap', 'Blizzard Bounce', 'Frozen Falls', 'Polar Plunge', 'Hailstone Heights', 'The Frost King'],
  'candy-carnival': ['Ticket Booth', 'Cotton Candy Clouds', 'Gumdrop Gardens', 'Lollipop Lane', 'Taffy Twister', 'Funhouse Floors', 'Caramel Canyon', 'Ferris Wheel Climb', 'Sprinkle Slopes', 'Licorice Loop', 'Big Top Bounce', 'The Gumdrop Golem'],
  'witch-swamp': ['Muddy Welcome', 'Cauldron Crossing', 'Toadstool Steps', 'Bog Lantern Path', 'Firefly Thicket', 'Hag Hut Hollow', 'Sinking Stones', 'Newt Nook', 'Mossy Mire', 'Brew Bubbles', "Witch's Doorstep", 'The Bog King'],
  'ghost-harbor': ['Foggy Pier', 'Barnacle Boardwalk', 'Lighthouse Leap', 'Crow\'s Nest Climb', 'Anchor Drop', 'Shipwreck Shallows', 'Plank Run', 'Rope Ladder Rally', 'Sunken Deck', 'Cannonball Cove', 'Phantom Fleet', 'The Storm Bat'],
  'lava-crypt': ['Warm Welcome', 'Ember Steps', 'Magma Moat', 'Smoldering Halls', 'Cinder Bridge', 'Furnace Floor', 'Ash Falls', 'Scorch Tunnel', 'Molten Maze', 'Fire Fang Pass', 'Inferno Gate', 'The Magma Golem'],
  'sky-ruins': ['Cloud Gate', 'Floating Steps', 'Windy Walkway', 'Broken Bridge', 'Sky Lantern Field', 'Feather Fall', 'Storm Pillars', 'Thunder Ledge', 'Rainbow Ruins', 'Gale Gauntlet', 'Starlight Stair', 'The Storm Owl'],
  'toy-factory': ['Assembly Line', 'Building Blocks', 'Jack-in-the-Box Jump', 'Marble Run', 'Wind-up Walk', 'Spring Coil Corner', 'Puppet Theater', 'Conveyor Chaos', 'Toy Soldier March', 'Spinning Tops', 'Gift Wrap Gallery', 'The Wind-up King'],
  'mirror-manor': ['Looking Glass Lobby', 'Silver Stairs', 'Reflection Hall', 'Crystal Corridor', 'Shattered Salon', 'Gilded Gallery', 'Twin Towers', 'Chandelier Climb', 'Echo Chamber', 'Prism Passage', 'Hall of a Hundred Doors', 'The Mirror Lady'],
  'moon-garden': ['Silver Gate', 'Moonflower Meadow', 'Hedge Maze Hop', 'Fountain Steps', 'Lunar Lilies', 'Moth Wing Walk', 'Crescent Bridge', 'Night Bloom Bounce', 'Stardust Terrace', 'Orchard of Owls', 'The Glass Greenhouse', 'The Moth Queen'],
  'nightmare-realm': ['First Nightmare', 'Upside-Down Hall', 'Shadow Stairs', 'Falling Dreams', 'Endless Corridor', 'Teeth Gate', 'Whisper Woods', 'Spiral Abyss', 'Clock of Dread', 'The Last Lantern', 'Nightmare Spire', 'The Nightmare King'],
};

const BOSSES: Record<WorldId, { kind: string; hp: number; speed: number; flyer: boolean; title: string; tint?: string }> = {
  'old-town': { kind: 'pumpkinKing', hp: 3, speed: 0.9, flyer: false, title: 'the Pumpkin King' },
  graveyard: { kind: 'graveGolem', hp: 3, speed: 0.9, flyer: false, title: 'the Grave Golem' },
  'dead-woods': { kind: 'batQueen', hp: 4, speed: 1, flyer: true, title: 'the Bat Queen' },
  'haunted-manor': { kind: 'gloomGhost', hp: 4, speed: 1, flyer: true, title: 'Lady Gloom' },
  catacombs: { kind: 'slimeKing', hp: 4, speed: 1.1, flyer: false, title: 'the Slime King' },
  clocktower: { kind: 'clockOwl', hp: 4, speed: 1.2, flyer: true, title: 'the Clockwork Owl' },
  'black-castle': { kind: 'midnightKing', hp: 6, speed: 1.1, flyer: true, title: 'the Midnight King' },
  'frozen-hollow': { kind: 'pumpkinKing', hp: 5, speed: 1.3, flyer: false, title: 'the Frost King', tint: '#a8dcff' },
  'candy-carnival': { kind: 'graveGolem', hp: 5, speed: 1.3, flyer: false, title: 'the Gumdrop Golem', tint: '#ff9ad6' },
  'witch-swamp': { kind: 'slimeKing', hp: 5, speed: 1.35, flyer: false, title: 'the Bog King', tint: '#9fc86a' },
  'ghost-harbor': { kind: 'batQueen', hp: 5, speed: 1.35, flyer: true, title: 'the Storm Bat', tint: '#9ad8e8' },
  'lava-crypt': { kind: 'graveGolem', hp: 6, speed: 1.45, flyer: false, title: 'the Magma Golem', tint: '#ff8a5a' },
  'sky-ruins': { kind: 'clockOwl', hp: 6, speed: 1.45, flyer: true, title: 'the Storm Owl', tint: '#c8c0ff' },
  'toy-factory': { kind: 'pumpkinKing', hp: 6, speed: 1.55, flyer: false, title: 'the Wind-up King', tint: '#ffd36a' },
  'mirror-manor': { kind: 'gloomGhost', hp: 7, speed: 1.55, flyer: true, title: 'the Mirror Lady', tint: '#b8fff4' },
  'moon-garden': { kind: 'batQueen', hp: 7, speed: 1.65, flyer: true, title: 'the Moth Queen', tint: '#f0f0ff' },
  'nightmare-realm': { kind: 'midnightKing', hp: 9, speed: 1.6, flyer: true, title: 'the Nightmare King', tint: '#e070ff' },
};

const DECOR: Record<WorldId, string[]> = {
  'old-town': ['pumpkin', 'jackOLantern', 'lamp', 'fence', 'crate', 'barrel', 'bush'],
  graveyard: ['gravestone', 'cross', 'deadTree', 'jackOLantern', 'fence', 'bush', 'gravestone'],
  'dead-woods': ['deadTree', 'bush', 'jackOLantern', 'bones', 'deadTree', 'pumpkin'],
  'haunted-manor': ['candelabra', 'statue', 'bookshelf', 'crate', 'barrel', 'candles'],
  catacombs: ['bones', 'coffin', 'candles', 'torch', 'pillar', 'bones'],
  clocktower: ['gear', 'bell', 'crate', 'barrel', 'candles', 'torch'],
  'black-castle': ['statue', 'torch', 'pillar', 'candelabra', 'banner', 'jackOLantern'],
  'frozen-hollow': ['deadTree', 'bush', 'pumpkin', 'jackOLantern', 'fence', 'lamp'],
  'candy-carnival': ['jackOLantern', 'lamp', 'banner', 'crate', 'barrel', 'pumpkin'],
  'witch-swamp': ['deadTree', 'bush', 'bones', 'candles', 'jackOLantern', 'deadTree'],
  'ghost-harbor': ['barrel', 'crate', 'lamp', 'chain', 'barrel', 'bell'],
  'lava-crypt': ['torch', 'pillar', 'bones', 'coffin', 'statue', 'torch'],
  'sky-ruins': ['pillar', 'statue', 'bell', 'banner', 'pillar', 'torch'],
  'toy-factory': ['gear', 'crate', 'barrel', 'clockFace', 'bell', 'jackOLantern'],
  'mirror-manor': ['candelabra', 'portrait', 'bookshelf', 'statue', 'candles', 'banner'],
  'moon-garden': ['bush', 'statue', 'lamp', 'fence', 'pumpkin', 'bush'],
  'nightmare-realm': ['deadTree', 'statue', 'candelabra', 'bones', 'torch', 'jackOLantern'],
};

/** One sign at the start of each world's first stage. */
const WORLD_SIGNS: Record<WorldId, string> = {
  'old-town': 'Run, jump and bounce! Springs launch you sky-high.',
  graveyard: 'Careful: old stones crumble and spikes hide in the pits.',
  'dead-woods': 'You can WALL JUMP now: slide down a wall and press Jump.',
  'haunted-manor': 'Press buttons to open gates. Purple platforms come and go.',
  catacombs: 'You can DASH now! Smash cracked walls and fly over wide pits.',
  clocktower: 'You can DOUBLE JUMP now! Jump again in mid-air.',
  'black-castle': 'The last world of the exam. Everything you have learned, all at once!',
  'frozen-hollow': 'You passed the placement exam! Now it gets REAL. Careful: ICE is slippery!',
  'candy-carnival': 'Step right up! Land on BALLOONS to bounce over the gaps.',
  'witch-swamp': 'LILY PADS sink while you stand on them. Keep hopping!',
  'ghost-harbor': 'CANNONS fire along the decks. Jump the cannonballs!',
  'lava-crypt': 'FLAME JETS sputter, then blast. Cross while they are quiet.',
  'sky-ruins': 'Ride the UPDRAFTS and let the WIND carry you over the gaps.',
  'toy-factory': 'The toys are awake, and everything moves.',
  'mirror-manor': 'Step into a PORTAL to come out somewhere else.',
  'moon-garden': 'So quiet. So pretty. So dangerous.',
  'nightmare-realm': 'The final realm: ice, wind, fire, portals… everything at once.',
};

// ───────────────────────────── random

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────────────────────── builder

class Builder {
  objs: LevelObject[] = [];
  private counters = new Map<string, number>();
  /** next free column */
  x = 0;
  /** row of the current ground top */
  gy = 30;
  rnd: () => number;
  /** columns where the floor is plain and safe (for enemies, checkpoints...) */
  flats: { c0: number; c1: number; gy: number }[] = [];
  constructor(
    readonly world: WorldId,
    readonly wi: number,
    readonly li: number,
    readonly d: number,
    readonly abilities: LevelAbilities,
    seed: number,
  ) {
    this.rnd = mulberry(seed);
  }
  r(a: number, b: number): number {
    return a + this.rnd() * (b - a);
  }
  ri(a: number, b: number): number {
    return Math.floor(this.r(a, b + 1));
  }
  chance(p: number): boolean {
    return this.rnd() < p;
  }
  pick<X>(xs: X[]): X {
    return xs[Math.floor(this.rnd() * xs.length)];
  }
  add(type: ObjectType, x: number, y: number, w: number, h: number, properties: Record<string, PropertyValue> = {}): LevelObject {
    const base = type.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    let n = this.counters.get(base) ?? 0;
    do n++;
    while (this.objs.some((o) => o.id === `${base}-${n}`));
    this.counters.set(base, n);
    const o: LevelObject = {
      id: `${base}-${n}`,
      type,
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(w),
      height: Math.round(h),
      properties: { ...defaultProperties(type), ...properties },
    };
    this.objs.push(o);
    return o;
  }
  /** Ground column block from `row` down to the bottom of the level. */
  ground(c0: number, len: number, row: number, style = 'auto'): LevelObject {
    return this.add('ground', c0 * T, row * T, len * T, (H - row) * T, { style });
  }
  clampRow(row: number): number {
    return Math.max(12, Math.min(H - 4, row));
  }
  deco(c0: number, c1: number, gy: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const kind = this.pick(DECOR[this.world]);
      const [w, h] = DECORATION_SIZES[kind] ?? [32, 32];
      if ((c1 - c0) * T < w + 16) continue;
      const x = this.r(c0 * T + 4, c1 * T - w - 4);
      this.add('decoration', x, gy * T - h, w, h, { kind, layer: 'back', flip: this.chance(0.5) });
    }
  }
}

// ───────────────────────────── segments
// Each segment starts right after the previous ground (column b.x, height b.gy)
// and must end with a stretch of ground at its new b.gy that ends at b.x.

type Seg = (b: Builder) => void;

function flat(b: Builder, len: number, opts: { enemies?: boolean } = {}): void {
  const c0 = b.x;
  b.ground(c0, len, b.gy);
  b.flats.push({ c0, c1: c0 + len, gy: b.gy });
  b.deco(c0, c0 + len, b.gy, Math.floor(len / 6));
  b.x += len;
  if (opts.enemies && len >= 8) {
    if (b.d > 1.15 && len >= 16) {
      // after the exam: two different things to deal with on one stretch
      const mid = c0 + Math.floor(len / 2);
      placeThreat(b, c0 + 2, mid - 1, b.gy);
      placeThreat(b, mid + 1, c0 + len - 2, b.gy);
    } else placeThreat(b, c0 + 2, c0 + len - 2, b.gy);
  }
}

/** Something to deal with on a flat stretch, chosen from what this world has. */
function placeThreat(b: Builder, c0: number, c1: number, gy: number): void {
  const w = b.wi;
  const opts: [number, () => void][] = [
    [
      3,
      () => {
        const n = b.ri(1, Math.min(4, 1 + Math.floor((c1 - c0) / 5)));
        for (let i = 0; i < n; i++) {
          const x = (c0 + 1 + ((c1 - c0 - 2) * (i + 0.5)) / n) * T;
          b.add('pumpkinTortoise', x, gy * T - 22, 28, 22, { speed: 45 + Math.round(b.d * 30), direction: b.chance(0.5) ? 'left' : 'right', shellSpeed: 460 });
        }
      },
    ],
  ];
  if (w >= 1) opts.push([2, () => b.add('ghost', ((c0 + c1) / 2) * T - 15, gy * T - 32 - 46, 30, 32, { mode: 'drift', speed: 50 + b.d * 30 })]);
  if (w >= 2)
    opts.push([
      2,
      () => {
        const span = Math.min(8, c1 - c0 - 2) * T;
        b.add('bat', c0 * T + 16, gy * T - 18 - 56, 28, 18, { axis: 'horizontal', distance: span, speed: 90 + b.d * 60, startOffset: b.r(0, 1) });
      },
    ]);
  if (w >= 2 && c1 - c0 >= 10)
    opts.push([1, () => b.add('raven', (c1 + 6) * T, gy * T - 26, 34, 20, { range: (c1 - c0 + 4) * T, speed: 200 + b.d * 80, direction: 'left', pause: 1.2 })]);
  if (w >= 2)
    opts.push([
      2,
      () => {
        const n = b.ri(1, 2);
        for (let i = 0; i < n; i++) {
          const cx = c0 + 2 + ((c1 - c0 - 4) * (i + 0.5)) / n;
          b.add('movingHazard', cx * T, gy * T - 160, 32, 32, { axis: 'vertical', distance: 128, speed: 120 + b.d * 60, wait: 0.5, startOffset: b.r(0, 1) });
        }
      },
    ]);
  if (w >= 4)
    opts.push([
      2,
      () => {
        const L = 160;
        b.add('pendulum', ((c0 + c1) / 2) * T - 16, gy * T - 20 - L - 16, 32, 32, { length: L, angle: 60, period: 2.6 - b.d * 0.6, phase: b.r(0, 1) });
      },
    ]);
  if (w >= 1)
    opts.push([
      1,
      () => {
        for (let c = c0 + 2; c < c1 - 1; c += b.ri(3, 5)) b.add('fallingHazard', c * T, gy * T - 7 * T, 32, 40, { triggerWidth: 72, fallDelay: 0.3, respawn: 2.5 });
      },
    ]);
  if (w >= 6) opts.push([2, () => b.add('shadow', ((c0 + c1) / 2) * T, gy * T - 40, 28, 40, { triggerRange: 180, speed: 140, duration: 2, cooldown: 2.5 })]);
  const total = opts.reduce((s, o) => s + o[0], 0);
  let k = b.rnd() * total;
  for (const [wt, fn] of opts) {
    if ((k -= wt) <= 0) return fn();
  }
}

function landing(b: Builder, row: number, len = b.ri(4, 7)): void {
  b.gy = b.clampRow(row);
  flat(b, len);
}

const segGap: Seg = (b) => {
  const w = b.ri(2, Math.min(6, 3 + Math.round(b.d * 4)));
  b.x += w;
  landing(b, b.gy + b.ri(-2, 2));
};

const segStep: Seg = (b) => {
  const up = b.chance(0.6);
  const dy = up ? -b.ri(1, 3) : b.ri(1, 4);
  landing(b, b.gy + dy, b.ri(5, 9));
};

const segSpikePit: Seg = (b) => {
  const w = b.ri(3, 4 + Math.round(b.d * 4));
  const deep = b.gy + 2;
  if (b.wi >= 4 && b.chance(0.5)) {
    b.ground(b.x, w, deep + 1);
    b.add('sludge', b.x * T, (deep - 0.5) * T, w * T, 1.5 * T);
  } else {
    b.ground(b.x, w, deep);
    b.add('spikes', b.x * T, deep * T - 16, w * T, 16, { direction: 'up' });
  }
  b.x += w;
  landing(b, b.gy + b.ri(-1, 1));
};

const segIslands: Seg = (b) => {
  const n = b.ri(2, 3 + Math.round(b.d * 2));
  for (let i = 0; i < n; i++) {
    b.x += b.ri(2, Math.min(5, 3 + Math.round(b.d * 3)));
    const row = b.clampRow(b.gy + b.ri(-2, 2));
    b.gy = row;
    const len = b.ri(2, 3);
    b.ground(b.x, len, row);
    b.x += len;
  }
  b.x += b.ri(2, 4);
  landing(b, b.gy + b.ri(-1, 1));
};

const segOneWayClimb: Seg = (b) => {
  // a pit with one-way ledges climbing up to higher ground
  const n = b.ri(2, 4);
  let row = b.gy;
  for (let i = 0; i < n; i++) {
    b.x += b.ri(1, 2);
    row -= b.ri(2, 3);
    row = b.clampRow(row);
    const len = b.ri(3, 4);
    b.add('oneWay', b.x * T, row * T, len * T, 16, { style: b.wi >= 5 ? 'iron' : b.wi >= 4 ? 'stone' : 'wood' });
    b.x += len;
  }
  b.x += b.ri(1, 2);
  landing(b, row - b.ri(1, 2));
};

const segMovingBridge: Seg = (b) => {
  const w = b.ri(9, 14);
  const pw = 3;
  if (b.chance(0.35)) {
    // ride it up instead
    const rise = b.ri(4, 7);
    b.add('movingPlatform', b.x * T + 8, b.gy * T, pw * T, 24, { axis: 'vertical', distance: -rise * T, speed: 80 + b.d * 40, wait: 0.6, startOffset: 0, triggered: false });
    b.x += pw + 1;
    landing(b, b.gy - rise);
    return;
  }
  b.add('movingPlatform', b.x * T + 16, b.gy * T, pw * T, 24, { axis: 'horizontal', distance: (w - pw - 1) * T, speed: 90 + b.d * 50, wait: 0.5, startOffset: 0, triggered: false });
  b.x += w;
  landing(b, b.gy + b.ri(-1, 1));
};

const segSpringWall: Seg = (b) => {
  // a spring in front of a tall wall: boing!
  b.ground(b.x, 4, b.gy);
  b.add('spring', (b.x + 1) * T, b.gy * T - 16, 32, 16, { power: 1200 });
  b.x += 4;
  landing(b, b.gy - b.ri(6, 9), b.ri(5, 8));
};

const segSpringPit: Seg = (b) => {
  // springs on little posts across a pit
  const n = b.ri(2, 3);
  for (let i = 0; i < n; i++) {
    b.x += b.ri(3, 4);
    const row = b.clampRow(b.gy + b.ri(1, 3));
    b.ground(b.x, 2, row);
    b.add('spring', b.x * T + 16, row * T - 16, 32, 16, { power: 1050 + b.ri(0, 3) * 50 });
    b.x += 2;
  }
  b.x += b.ri(3, 4);
  landing(b, b.gy - b.ri(0, 3));
};

const segCrumbleBridge: Seg = (b) => {
  const n = b.ri(2, 4);
  const type: ObjectType = b.wi >= 4 && b.chance(0.5) ? 'fallingPlatform' : 'crumblingPlatform';
  for (let i = 0; i < n; i++) {
    b.x += b.ri(1, 3);
    const row = b.clampRow(b.gy + b.ri(-1, 1));
    b.gy = row;
    b.add(type, b.x * T, row * T, 3 * T, 24, type === 'fallingPlatform' ? { delay: 0.45, respawn: 2.5 } : { delay: 0.4, respawn: 2.5 });
    b.x += 3;
  }
  b.x += b.ri(1, 3);
  landing(b, b.gy + b.ri(-1, 1));
};

const segTimedBridge: Seg = (b) => {
  const n = b.ri(2, 3);
  for (let i = 0; i < n; i++) {
    b.x += b.ri(2, 3);
    b.add('timedPlatform', b.x * T, b.gy * T, 3 * T, 24, { onTime: 4, offTime: 1, offset: 0, signalMode: 'none' });
    b.x += 3;
  }
  b.x += b.ri(2, 3);
  landing(b, b.gy);
};

const segChimney: Seg = (b) => {
  // walk under a hanging column, then wall-jump up between it and a cliff
  const rise = b.ri(8, 11);
  const top = b.clampRow(b.gy - rise);
  if (b.gy - top < 7) {
    // no head room up here: go down instead
    landing(b, b.gy + b.ri(4, 6));
    return;
  }
  b.ground(b.x, 2, b.gy); // floor under the column
  b.add('platform', b.x * T, top * T, 2 * T, (b.gy - 3 - top) * T, { style: 'auto' });
  b.ground(b.x + 2, 3, b.gy); // shaft floor
  b.x += 5;
  landing(b, top, b.ri(5, 8));
};

const segDashGap: Seg = (b) => {
  b.x += b.ri(9, 10);
  landing(b, b.gy, b.ri(5, 7));
};

const segBreakable: Seg = (b) => {
  const c0 = b.x;
  b.ground(c0, 8, b.gy);
  b.add('breakableWall', (c0 + 5) * T, (b.gy - 12) * T, T, 12 * T);
  b.x += 8;
  flat(b, 4);
};

const segDoubleJumpStep: Seg = (b) => {
  b.x += b.ri(1, 3);
  landing(b, b.gy - b.ri(5, 6), b.ri(5, 8));
};

const segConveyor: Seg = (b) => {
  const len = b.ri(8, 12);
  const speed = (b.chance(0.7) ? 1 : -1) * (100 + b.ri(0, 4) * 20);
  b.add('conveyor', b.x * T, b.gy * T, len * T, 24, { speed });
  b.add('ground', b.x * T, b.gy * T + 24, len * T, (H - b.gy) * T - 24, { style: 'auto' });
  b.x += len;
  b.x += b.ri(2, 4);
  landing(b, b.gy + b.ri(-1, 1));
};

const segElevator: Seg = (b) => {
  const rise = b.ri(7, 10);
  b.ground(b.x, 2, b.gy);
  b.add('elevator', (b.x + 2) * T, b.gy * T, 3 * T, 24, { direction: 'up', distance: rise * T, speed: 130, mode: 'ride', returnDelay: 1 });
  b.ground(b.x + 2, 3, b.gy + 1); // a step under the lift so it sits flush
  b.x += 5;
  landing(b, b.gy - rise, b.ri(5, 8));
};

const segPathPlatform: Seg = (b) => {
  const w = b.ri(10, 13);
  const dx = (w - 4) * T;
  const up = b.ri(2, 4) * T;
  b.add('pathPlatform', b.x * T + 16, b.gy * T, 3 * T, 24, {
    points: [
      { x: 0, y: 0 },
      { x: dx / 2, y: -up },
      { x: dx, y: 0 },
    ],
    speed: 100 + b.d * 40,
    wait: 0.3,
    loop: 'pingpong',
    triggered: false,
  });
  b.x += w;
  landing(b, b.gy + b.ri(-1, 1));
};

const segGate: Seg = (b) => {
  const c0 = b.x;
  const len = 12;
  b.ground(c0, len, b.gy);
  const gate = b.add('gate', (c0 + 9) * T, (b.gy - 12) * T, T, 12 * T, { initiallyOpen: false, openDirection: 'up', speed: 300 });
  if (b.chance(0.5)) b.add('button', (c0 + 3) * T, b.gy * T - 12, 32, 12, { targets: [gate.id] });
  else b.add('lever', (c0 + 3) * T, b.gy * T - 32, 24, 32, { targets: [gate.id], startOn: false });
  b.x += len;
  flat(b, 4);
};

const segKeyDoor: Seg = (b) => {
  const c0 = b.x;
  const len = 16;
  const color = b.pick(['gold', 'silver', 'bone']);
  b.ground(c0, len, b.gy);
  b.add('oneWay', (c0 + 3) * T, (b.gy - 3) * T, 4 * T, 16, { style: 'wood' });
  b.add('key', (c0 + 5) * T - 12, (b.gy - 3) * T - 30, 24, 24, { color });
  b.add('lockedDoor', (c0 + 12) * T, (b.gy - 12) * T, T, 12 * T, { color });
  b.x += len;
  flat(b, 4);
};

const segThreat: Seg = (b) => flat(b, b.d > 1.15 ? b.ri(16, 22) : b.ri(10, 16), { enemies: true });

// ── mechanics after the placement exam

const FROZEN = 7, CANDY = 8, SWAMP = 9, HARBOR = 10, LAVA = 11, SKY = 12, TOY = 13, MIRROR = 14, MOON = 15, NIGHTMARE = 16;

const segIce: Seg = (b) => {
  // a long icy run that ends in a pit: start braking early!
  const len = b.ri(12, 18);
  b.add('ice', b.x * T, b.gy * T, len * T, (H - b.gy) * T);
  b.x += len;
  if (b.chance(0.6)) {
    b.x += b.ri(3, 5);
    landing(b, b.gy + b.ri(-2, 1));
  } else {
    // icy islands
    for (let i = 0; i < b.ri(2, 3); i++) {
      b.x += b.ri(3, 4);
      const row = b.clampRow(b.gy + b.ri(-1, 1));
      b.gy = row;
      b.add('ice', b.x * T, row * T, 3 * T, (H - row) * T);
      b.x += 3;
    }
    b.x += b.ri(3, 4);
    landing(b, b.gy);
  }
};

const segBalloons: Seg = (b) => {
  // a wide pit crossed by bouncing on balloons
  const n = b.ri(2, 3);
  const colors = ['pink', 'orange', 'purple', 'green'];
  for (let i = 0; i < n; i++) {
    b.x += b.ri(4, 5);
    const y = (b.gy + b.ri(0, 2)) * T;
    b.add('balloon', b.x * T, y, 32, 40, { power: 980, respawn: 2.2, color: b.pick(colors) });
    b.x += 1;
  }
  b.x += b.ri(4, 5);
  landing(b, b.gy - b.ri(1, 4));
};

const segLilyPads: Seg = (b) => {
  // a bog of poison with sinking lily pads: keep hopping
  const n = b.ri(3, 4);
  const c0 = b.x;
  let c = c0;
  const pads: number[] = [];
  for (let i = 0; i < n; i++) {
    c += b.ri(2, 3);
    pads.push(c);
    c += 3;
  }
  c += b.ri(2, 3);
  const w = c - c0;
  b.ground(c0, w, b.gy + 4);
  b.add('sludge', c0 * T, (b.gy + 1.5) * T, w * T, 2.5 * T);
  for (const pc of pads) b.add('sinkingPlatform', pc * T, b.gy * T, 3 * T, 16, { speed: 38 + Math.round((b.d - 1) * 20), distance: 96 });
  b.x = c;
  landing(b, b.gy + b.ri(-1, 1));
};

const segCannon: Seg = (b) => {
  const len = b.ri(14, 18);
  const c0 = b.x;
  b.ground(c0, len, b.gy);
  b.add('cannon', (c0 + len - 3) * T, b.gy * T - 40, 48, 40, { direction: 'left', interval: 2.6 - (b.d - 1) * 1.2, speed: 200 + (b.d - 1) * 150, range: (len - 4) * T, startOffset: b.r(0, 1) });
  b.deco(c0, c0 + len - 4, b.gy, 2);
  b.x += len;
  flat(b, 3);
};

const segFlameJets: Seg = (b) => {
  const n = b.ri(2, 4);
  const len = n * 4 + 4;
  const c0 = b.x;
  b.ground(c0, len, b.gy);
  for (let i = 0; i < n; i++) {
    b.add('flameJet', (c0 + 3 + i * 4) * T, b.gy * T - 16, 32, 16, { height: 128, onTime: 1.1, offTime: 1.7 - (b.d - 1) * 0.6, offset: i * 0.45 });
  }
  b.x += len;
  flat(b, 3);
};

const segUpdraft: Seg = (b) => {
  // jump into the column of rising air and float up to a high ledge
  const rise = b.ri(7, 11);
  const top = b.clampRow(b.gy - rise);
  if (b.gy - top < 6) {
    landing(b, b.gy + b.ri(3, 5));
    return;
  }
  const w = b.ri(4, 5);
  b.add('wind', b.x * T, (top - 4) * T, w * T, (H - top + 4) * T, { direction: 'up', strength: 1 });
  b.x += w;
  landing(b, top, b.ri(5, 8));
};

const segTailwind: Seg = (b) => {
  // a strong tailwind over a gap too wide to jump without it
  const w = b.ri(9, 11);
  b.add('wind', (b.x - 6) * T, (b.gy - 10) * T, (w + 9) * T, 10 * T, { direction: 'right', strength: 1.2 });
  b.x += w;
  landing(b, b.gy, b.ri(5, 7));
};

const segPortal: Seg = (b) => {
  // a wall nobody can climb; the portal is the only way through
  const c0 = b.x;
  const color = b.pick(['violet', 'teal', 'amber']);
  b.ground(c0, 6, b.gy);
  b.add('ground', (c0 + 6) * T, 0, 2 * T, H * T, { style: 'auto' });
  const row = b.clampRow(b.gy + b.ri(-3, 3));
  const p1 = b.add('portal', (c0 + 3) * T - 4, b.gy * T - 64, 40, 64, { color });
  b.x = c0 + 8;
  b.gy = row;
  const c1 = b.x;
  flat(b, b.ri(6, 9));
  const p2 = b.add('portal', (c1 + 2) * T - 4, row * T - 64, 40, 64, { color });
  p1.properties.target = p2.id;
  p2.properties.target = p1.id;
};

interface SegDef {
  fn: Seg;
  from: number; // first world index
  w: number; // weight
  boost?: number; // extra weight in the world that introduces it
  ability?: keyof LevelAbilities;
  minD?: number;
  /** only in these worlds (mechanics after the exam) */
  worlds?: number[];
}

const SEGMENTS: SegDef[] = [
  { fn: segThreat, from: 0, w: 5 },
  { fn: segGap, from: 0, w: 4 },
  { fn: segStep, from: 0, w: 3 },
  { fn: segIslands, from: 0, w: 3 },
  { fn: segOneWayClimb, from: 0, w: 2 },
  { fn: segMovingBridge, from: 0, w: 2, minD: 0.02 },
  { fn: segSpringWall, from: 0, w: 3 },
  { fn: segSpringPit, from: 0, w: 2, minD: 0.02 },
  { fn: segSpikePit, from: 0, w: 3, boost: 2, minD: 0.04 },
  { fn: segCrumbleBridge, from: 1, w: 2, boost: 3 },
  { fn: segChimney, from: 2, w: 3, boost: 4, ability: 'wallJump' },
  { fn: segTimedBridge, from: 3, w: 2, boost: 2 },
  { fn: segGate, from: 3, w: 2, boost: 2 },
  { fn: segKeyDoor, from: 3, w: 1, boost: 1 },
  { fn: segDashGap, from: 4, w: 2, boost: 3, ability: 'dash' },
  { fn: segBreakable, from: 4, w: 1, boost: 2, ability: 'dash' },
  { fn: segDoubleJumpStep, from: 5, w: 2, boost: 3, ability: 'doubleJump' },
  { fn: segConveyor, from: 5, w: 2, boost: 2 },
  { fn: segElevator, from: 5, w: 1, boost: 2 },
  { fn: segPathPlatform, from: 5, w: 1, boost: 2 },
  { fn: segIce, from: FROZEN, w: 6, worlds: [FROZEN, NIGHTMARE] },
  { fn: segBalloons, from: CANDY, w: 6, worlds: [CANDY, TOY, MOON, NIGHTMARE] },
  { fn: segLilyPads, from: SWAMP, w: 6, worlds: [SWAMP, NIGHTMARE] },
  { fn: segCannon, from: HARBOR, w: 6, worlds: [HARBOR, TOY, NIGHTMARE] },
  { fn: segFlameJets, from: LAVA, w: 6, worlds: [LAVA, NIGHTMARE] },
  { fn: segUpdraft, from: SKY, w: 5, worlds: [SKY, MOON, NIGHTMARE] },
  { fn: segTailwind, from: SKY, w: 3, worlds: [SKY, NIGHTMARE] },
  { fn: segPortal, from: MIRROR, w: 5, worlds: [MIRROR, NIGHTMARE] },
];

function pickSegment(b: Builder): Seg {
  const avail = SEGMENTS.filter((s) => s.from <= b.wi && (!s.worlds || s.worlds.includes(b.wi)) && (!s.ability || b.abilities[s.ability]) && (s.minD ?? 0) <= b.d);
  const weights = avail.map((s) => s.w + (s.from === b.wi ? (s.boost ?? 0) : 0));
  let k = b.rnd() * weights.reduce((a, c) => a + c, 0);
  for (let i = 0; i < avail.length; i++) if ((k -= weights[i]) <= 0) return avail[i].fn;
  return avail[0].fn;
}

// ───────────────────────────── relic

/** Put the relic up high above a flat stretch, with a spring to reach it. */
function placeRelic(b: Builder, variant: number): void {
  const flats = b.flats.filter((f) => f.c1 - f.c0 >= 8 && f.c0 > 12);
  if (!flats.length) return;
  const f = flats[(variant * 7 + Math.floor(flats.length / 2)) % flats.length];
  const c = Math.floor((f.c0 + f.c1) / 2);
  const high = variant % 3 !== 2;
  const row = f.gy - (high ? 8 : 4);
  b.add('oneWay', (c - 1) * T, row * T, 3 * T, 16, { style: 'wood' });
  b.add('relic', c * T + 6, row * T - 26, 20, 20);
  if (high) b.add('spring', (c - 3) * T, f.gy * T - 16, 32, 16, { power: 1200 });
}

// ───────────────────────────── levels

function abilitiesFor(wi: number): LevelAbilities {
  // everything is unlocked after the exam
  return { wallJump: wi >= 2, dash: wi >= 4, doubleJump: wi >= 5 };
}

function finish(b: Builder, name: string, number: number, order: number): LevelData {
  const width = b.x * T;
  const objs = b.objs;
  return {
    version: 1,
    id: `${b.world}-${String(order).padStart(2, '0')}`,
    name,
    world: b.world,
    order,
    number,
    width,
    height: H * T,
    spawn: { x: 3 * T, y: 0 },
    goal: { x: width - 4 * T, y: 0 },
    background: b.world,
    music: b.world,
    abilities: b.abilities,
    objects: objs,
  };
}

function buildStage(wi: number, li: number, seed: number): LevelData {
  const world = WORLDS[wi].id;
  // the placement exam ramps 0 → 1; the worlds after it keep climbing to 1.6
  const d = wi < 7 ? Math.min(1, (wi * 11 + li) / 76) : 1 + (((wi - 7) * 11 + li) / 109) * 0.6;
  const b = new Builder(world, wi, li, d, abilitiesFor(wi), seed);
  b.gy = 30;
  flat(b, 10);
  const spawnRow = b.gy;
  if (li === 0) b.add('sign', 6 * T, spawnRow * T - 32, 32, 32, { text: WORLD_SIGNS[world] });
  const segCount = Math.min(24, 12 + Math.round(d * 10)) + b.ri(0, 3);
  // longer, harder levels after the exam get an extra checkpoint
  const cps = d > 1 ? [1, 2, 3].map((k) => Math.floor((k * segCount) / 4)) : [Math.floor(segCount / 3), Math.floor((2 * segCount) / 3)];
  for (let i = 0; i < segCount; i++) {
    if (cps.includes(i)) {
      const c0 = b.x;
      flat(b, 6);
      b.add('checkpoint', (c0 + 3) * T, b.gy * T - 64, 32, 64);
    }
    // the first stages of the game stay gentle
    if (wi === 0 && li < 2) [segGap, segStep, segSpringWall, segThreat, segIslands][b.ri(0, 4)](b);
    // after the exam every world keeps showing off its own mechanics
    else if (wi >= 7 && i % 3 === 1) b.pick(SEGMENTS.filter((s) => s.worlds?.includes(wi)).map((s) => s.fn))(b);
    else pickSegment(b)(b);
    // a breather between pieces
    if (b.chance(d > 1 ? 0.55 - (d - 1) * 0.5 : 0.5)) flat(b, b.ri(2, 4));
  }
  flat(b, 12);
  const lv = finish(b, NAMES[world][li], wi * LEVELS_PER_WORLD + li + 1, li + 1);
  lv.spawn.y = spawnRow * T;
  lv.goal.y = b.gy * T;
  return lv;
}

function buildBoss(wi: number, seed: number): LevelData {
  const world = WORLDS[wi].id;
  const boss = BOSSES[world];
  const b = new Builder(world, wi, 11, 1, abilitiesFor(wi), seed);
  b.gy = 28;
  flat(b, 14);
  b.add('checkpoint', 10 * T, b.gy * T - 64, 32, 64);
  b.add('sign', 6 * T, b.gy * T - 32, 32, 32, { text: `BOSS: ${boss.title}!\nStomp it ${boss.hp} times to open the exit.` });
  // the arena, a few tiles below the entrance ledge
  const floor = b.gy + 6;
  const a0 = b.x;
  const aw = 36;
  b.ground(a0, aw, floor);
  b.ground(a0 + aw, 3, floor - 16); // right wall
  b.add('oneWay', (a0 + 6) * T, (floor - 4) * T, 5 * T, 16, { style: 'stone' });
  b.add('oneWay', (a0 + aw - 11) * T, (floor - 4) * T, 5 * T, 16, { style: 'stone' });
  b.add('oneWay', (a0 + aw / 2 - 3) * T, (floor - 8) * T, 6 * T, 16, { style: 'stone' });
  b.deco(a0 + 1, a0 + aw - 1, floor, 4);
  const cx = (a0 + aw / 2) * T;
  const homeY = (floor - 9) * T;
  b.add('boss', cx - 40 + (boss.flyer ? 0 : 6 * T), boss.flyer ? homeY : (floor * T) - 72, 80, 72, {
    kind: boss.kind,
    hp: boss.hp,
    tint: boss.tint ?? '',
    speed: boss.speed,
    jump: wi === 4 ? 780 : 720,
    range: (aw / 2 - 5) * T,
    dive: floor * T - 6 - 72 - homeY,
  });
  b.x = a0 + aw + 3;
  const lv = finish(b, NAMES[world][11], wi * LEVELS_PER_WORLD + 12, 12);
  lv.spawn.y = 28 * T;
  lv.goal = { x: (a0 + aw - 3) * T, y: floor * T };
  return lv;
}

// ───────────────────────────── verify & write

function check(level: LevelData): string | null {
  const parsed = parseLevel(JSON.parse(JSON.stringify(level)), { strict: true });
  if (!parsed.level) return parsed.issues.map((i) => i.message).join('; ');
  const r = reach(parsed.level, { maxStates: 40000 });
  if (!r.goal) return `exit not reachable (stuck near ${r.frontier})`;
  if (!r.complete) return 'search incomplete';
  if (r.traps.length) return `trap at ${r.traps.slice(0, 3).map((t) => `${Math.floor(t.x / T)},${Math.floor(t.y / T)}`).join(' ')}`;
  const relic = level.objects.find((o) => o.type === 'relic');
  if (relic && !r.relics.has(relic.id)) return 'relic not reachable';
  for (const k of level.objects.filter((o) => o.type === 'key')) if (!r.keys.has(String(k.properties.color))) return 'key not reachable';
  return null;
}

function generate(wi: number, li: number): LevelData {
  for (let attempt = 0; attempt < 40; attempt++) {
    const seed = 1000 * (wi + 1) + 37 * li + 7919 * attempt;
    const isBoss = li === LEVELS_PER_WORLD - 1;
    const level = isBoss ? buildBoss(wi, seed) : buildStage(wi, li, seed);
    if (!isBoss) {
      // relic: try a few spots before giving up on this layout
      const base = level.objects.length;
      let ok = false;
      for (let v = 0; v < 4 && !ok; v++) {
        level.objects.length = base;
        const b = new Builder(level.world, wi, li, 0, level.abilities, seed + v);
        b.objs = level.objects;
        b.flats = flatsOf(level);
        placeRelic(b, v);
        const err = check(level);
        if (!err) ok = true;
        else if (!err.startsWith('relic')) {
          if (process.env.VERBOSE) console.log(`   ${level.id} attempt ${attempt}: ${err}`);
          break;
        }
      }
      if (ok) return level;
      continue;
    }
    const err = check(level);
    if (!err) return level;
    if (process.env.VERBOSE) console.log(`   ${level.id} attempt ${attempt}: ${err}`);
  }
  throw new Error(`could not build a valid level for world ${wi + 1}, level ${li + 1}`);
}

/** Recover plain flat stretches (for the relic) from a built level's ground pieces. */
function flatsOf(level: LevelData): { c0: number; c1: number; gy: number }[] {
  return level.objects
    .filter((o) => o.type === 'ground' && o.width >= 5 * T && o.y + o.height >= H * T)
    .map((o) => ({ c0: o.x / T, c1: (o.x + o.width) / T, gy: o.y / T }))
    .filter((f) => !level.objects.some((o) => o.type !== 'ground' && o.type !== 'decoration' && o.x < f.c1 * T && o.x + o.width > f.c0 * T && o.y < f.gy * T && o.y + o.height > (f.gy - 10) * T));
}

export { buildBoss, buildStage };

if (process.argv[1]?.endsWith('generate-levels.ts')) main();

function main(): void {
  const [onlyW, onlyL] = process.argv.slice(2).map(Number);
  if (!onlyW) {
    for (const w of WORLDS) rmSync(`${root}/levels/${w.id}`, { recursive: true, force: true });
  }
  const manifest: string[] = [];
  for (let wi = 0; wi < WORLDS.length; wi++) {
    if (onlyW && onlyW !== wi + 1) continue;
    mkdirSync(`${root}/levels/${WORLDS[wi].id}`, { recursive: true });
    for (let li = 0; li < LEVELS_PER_WORLD; li++) {
      if (onlyL && onlyL !== li + 1) continue;
      const t0 = Date.now();
      const level = generate(wi, li);
      const path = manifestEntry(level);
      if (onlyW) for (const f of readdirSync(`${root}/levels/${level.world}`)) if (f.startsWith(path.split('/')[1].slice(0, 3))) rmSync(`${root}/levels/${level.world}/${f}`);
      writeFileSync(`${root}/levels/${path}`, levelToJSON(level));
      manifest.push(path);
      console.log(`${String(level.number).padStart(2)} ${path.padEnd(42)} ${Math.round(level.width / T)} tiles  ${Date.now() - t0}ms`);
    }
  }
  if (!onlyW) writeFileSync(`${root}/levels/manifest.json`, JSON.stringify({ levels: manifest }, null, 2) + '\n');
}
