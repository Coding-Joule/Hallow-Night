import type { ObjectType, PropertyValue } from './schema';

/**
 * Registry describing every object type: its editor category, default size,
 * and the properties it accepts. The editor inspector, the validator and the
 * loader all read from this single table, so adding a property here makes it
 * editable and validated everywhere.
 */

export type ObjectCategory =
  | 'terrain'
  | 'platforms'
  | 'hazards'
  | 'switches'
  | 'enemies'
  | 'items'
  | 'scenery';

export const CATEGORY_ORDER: ObjectCategory[] = [
  'terrain',
  'platforms',
  'hazards',
  'switches',
  'enemies',
  'items',
  'scenery',
];

interface PropBase {
  key: string;
  label: string;
  help?: string;
}

export type PropSpec =
  | (PropBase & { kind: 'number'; default: number; min?: number; max?: number; step?: number })
  | (PropBase & { kind: 'select'; default: string; options: string[] })
  | (PropBase & { kind: 'boolean'; default: boolean })
  | (PropBase & { kind: 'string'; default: string; multiline?: boolean })
  | (PropBase & { kind: 'targets'; default: string[] })
  | (PropBase & { kind: 'points'; default: { x: number; y: number }[] });

export interface ObjectTypeDef {
  type: ObjectType;
  label: string;
  category: ObjectCategory;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  /** Which dimensions the editor may resize. */
  resize: 'both' | 'x' | 'y' | 'none';
  minWidth?: number;
  minHeight?: number;
  props: PropSpec[];
  /** Colour used for the editor rendering. */
  editorColor: string;
  /** Can send signals to other objects (has a `targets` prop). */
  signalSource?: boolean;
  /** Reacts to signals from switches. */
  signalTarget?: boolean;
}

const STYLE_TERRAIN = ['auto', 'earth', 'stone', 'brick', 'wood', 'bone', 'iron'];
const AXIS = ['horizontal', 'vertical'];
const DIR_LR = ['right', 'left'];

const triggered = {
  key: 'triggered',
  label: 'Needs signal',
  kind: 'boolean',
  default: false,
  help: 'Only moves while a switch targeting it is active.',
} as const;

export const DECORATION_KINDS = [
  'pumpkin',
  'jackOLantern',
  'lamp',
  'fence',
  'gravestone',
  'cross',
  'deadTree',
  'window',
  'crate',
  'barrel',
  'coffin',
  'candles',
  'candelabra',
  'bell',
  'chain',
  'cobweb',
  'banner',
  'gear',
  'statue',
  'bones',
  'portrait',
  'bookshelf',
  'clockFace',
  'torch',
  'pillar',
  'bush',
] as const;

export const KEY_COLORS = ['gold', 'silver', 'bone'];

const defs: ObjectTypeDef[] = [
  // ───────────── terrain
  {
    type: 'ground',
    label: 'Ground',
    category: 'terrain',
    description: 'Solid terrain. Use for floors, walls and ceilings.',
    defaultWidth: 256,
    defaultHeight: 96,
    resize: 'both',
    minWidth: 16,
    minHeight: 16,
    editorColor: '#3b3a4a',
    props: [{ key: 'style', label: 'Style', kind: 'select', default: 'auto', options: STYLE_TERRAIN }],
  },
  {
    type: 'platform',
    label: 'Solid Platform',
    category: 'terrain',
    description: 'A solid block or ledge.',
    defaultWidth: 128,
    defaultHeight: 32,
    resize: 'both',
    minWidth: 16,
    minHeight: 16,
    editorColor: '#55536b',
    props: [{ key: 'style', label: 'Style', kind: 'select', default: 'auto', options: STYLE_TERRAIN }],
  },
  {
    type: 'oneWay',
    label: 'One-way Platform',
    category: 'terrain',
    description: 'Can be jumped through from below. Hold DOWN + JUMP to drop through.',
    defaultWidth: 128,
    defaultHeight: 16,
    resize: 'x',
    minWidth: 32,
    editorColor: '#8a6a45',
    props: [{ key: 'style', label: 'Style', kind: 'select', default: 'wood', options: ['wood', 'stone', 'iron'] }],
  },
  {
    type: 'slope',
    label: 'Slope',
    category: 'terrain',
    description: 'A walkable ramp. Place it on top of ground.',
    defaultWidth: 128,
    defaultHeight: 64,
    resize: 'both',
    minWidth: 32,
    minHeight: 16,
    editorColor: '#4a4958',
    props: [
      { key: 'rise', label: 'Rises to', kind: 'select', default: 'right', options: DIR_LR },
      { key: 'style', label: 'Style', kind: 'select', default: 'auto', options: STYLE_TERRAIN },
    ],
  },
  {
    type: 'conveyor',
    label: 'Conveyor',
    category: 'terrain',
    description: 'Solid surface that carries whatever stands on it.',
    defaultWidth: 160,
    defaultHeight: 24,
    resize: 'x',
    minWidth: 48,
    editorColor: '#6b5a3a',
    props: [{ key: 'speed', label: 'Speed (+right)', kind: 'number', default: 90, step: 10 }],
    signalTarget: true,
  },
  // ───────────── platform mechanics
  {
    type: 'movingPlatform',
    label: 'Moving Platform',
    category: 'platforms',
    description: 'Moves back and forth along one axis.',
    defaultWidth: 128,
    defaultHeight: 24,
    resize: 'x',
    minWidth: 32,
    editorColor: '#a07a3c',
    signalTarget: true,
    props: [
      { key: 'axis', label: 'Axis', kind: 'select', default: 'horizontal', options: AXIS },
      { key: 'distance', label: 'Distance', kind: 'number', default: 192, step: 16, help: 'Negative = starts moving left/up.' },
      { key: 'speed', label: 'Speed', kind: 'number', default: 80, min: 1, step: 5 },
      { key: 'wait', label: 'Wait at ends', kind: 'number', default: 0.4, min: 0, step: 0.1 },
      { key: 'startOffset', label: 'Phase (0-1)', kind: 'number', default: 0, min: 0, max: 1, step: 0.05 },
      triggered,
    ],
  },
  {
    type: 'pathPlatform',
    label: 'Path Platform',
    category: 'platforms',
    description: 'Follows a list of points (relative to its start).',
    defaultWidth: 96,
    defaultHeight: 24,
    resize: 'x',
    minWidth: 32,
    editorColor: '#b0843f',
    signalTarget: true,
    props: [
      {
        key: 'points',
        label: 'Path points',
        kind: 'points',
        default: [
          { x: 0, y: 0 },
          { x: 160, y: -96 },
          { x: 320, y: 0 },
        ],
      },
      { key: 'speed', label: 'Speed', kind: 'number', default: 80, min: 1, step: 5 },
      { key: 'wait', label: 'Wait at points', kind: 'number', default: 0.25, min: 0, step: 0.05 },
      { key: 'loop', label: 'Looping', kind: 'select', default: 'pingpong', options: ['pingpong', 'loop'] },
      triggered,
    ],
  },
  {
    type: 'fallingPlatform',
    label: 'Falling Platform',
    category: 'platforms',
    description: 'Shakes, then drops when stood on. Returns later.',
    defaultWidth: 96,
    defaultHeight: 24,
    resize: 'x',
    minWidth: 32,
    editorColor: '#7a5d4a',
    props: [
      { key: 'delay', label: 'Delay', kind: 'number', default: 0.45, min: 0.05, step: 0.05 },
      { key: 'respawn', label: 'Respawn after', kind: 'number', default: 2.5, min: 0.5, step: 0.5 },
    ],
  },
  {
    type: 'crumblingPlatform',
    label: 'Crumbling Platform',
    category: 'platforms',
    description: 'Old masonry. Crumbles shortly after being touched.',
    defaultWidth: 96,
    defaultHeight: 24,
    resize: 'x',
    minWidth: 32,
    editorColor: '#6d6258',
    props: [
      { key: 'delay', label: 'Delay', kind: 'number', default: 0.35, min: 0.05, step: 0.05 },
      { key: 'respawn', label: 'Respawn after', kind: 'number', default: 2.5, min: 0.5, step: 0.5 },
    ],
  },
  {
    type: 'timedPlatform',
    label: 'Phantom Platform',
    category: 'platforms',
    description: 'Fades in and out on a fixed rhythm.',
    defaultWidth: 96,
    defaultHeight: 24,
    resize: 'x',
    minWidth: 32,
    editorColor: '#6c5aa0',
    signalTarget: true,
    props: [
      { key: 'onTime', label: 'Visible (s)', kind: 'number', default: 2, min: 0.2, step: 0.1 },
      { key: 'offTime', label: 'Hidden (s)', kind: 'number', default: 1.5, min: 0.2, step: 0.1 },
      { key: 'offset', label: 'Time offset', kind: 'number', default: 0, min: 0, step: 0.1 },
      { key: 'signalMode', label: 'Signal', kind: 'select', default: 'none', options: ['none', 'showWhenActive', 'hideWhenActive'] },
    ],
  },
  {
    type: 'elevator',
    label: 'Elevator',
    category: 'platforms',
    description: 'Rides while stood on (or while signalled), returns when left.',
    defaultWidth: 96,
    defaultHeight: 24,
    resize: 'x',
    minWidth: 48,
    editorColor: '#9a8b52',
    signalTarget: true,
    props: [
      { key: 'direction', label: 'Direction', kind: 'select', default: 'up', options: ['up', 'down'] },
      { key: 'distance', label: 'Distance', kind: 'number', default: 256, min: 16, step: 16 },
      { key: 'speed', label: 'Speed', kind: 'number', default: 110, min: 1, step: 5 },
      { key: 'mode', label: 'Mode', kind: 'select', default: 'ride', options: ['ride', 'signal'] },
      { key: 'returnDelay', label: 'Return delay', kind: 'number', default: 1, min: 0, step: 0.1 },
    ],
  },
  // ───────────── hazards
  {
    type: 'spikes',
    label: 'Spikes',
    category: 'hazards',
    description: 'Deadly iron spikes. Point them up, down, left or right.',
    defaultWidth: 96,
    defaultHeight: 16,
    resize: 'both',
    minWidth: 16,
    minHeight: 16,
    editorColor: '#c9c3b5',
    props: [{ key: 'direction', label: 'Points', kind: 'select', default: 'up', options: ['up', 'down', 'left', 'right'] }],
  },
  {
    type: 'pendulum',
    label: 'Pendulum Blade',
    category: 'hazards',
    description: 'Swinging blade on a chain. (x,y) is the pivot box.',
    defaultWidth: 32,
    defaultHeight: 32,
    resize: 'none',
    editorColor: '#b8b8c8',
    props: [
      { key: 'length', label: 'Chain length', kind: 'number', default: 160, min: 32, step: 8 },
      { key: 'angle', label: 'Swing angle', kind: 'number', default: 55, min: 5, max: 85, step: 5 },
      { key: 'period', label: 'Period (s)', kind: 'number', default: 2.4, min: 0.5, step: 0.1 },
      { key: 'phase', label: 'Phase (0-1)', kind: 'number', default: 0, min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    type: 'fallingHazard',
    label: 'Falling Masonry',
    category: 'hazards',
    description: 'Hangs from the ceiling and drops when the player passes below.',
    defaultWidth: 32,
    defaultHeight: 40,
    resize: 'x',
    minWidth: 24,
    editorColor: '#9d8f7a',
    props: [
      { key: 'triggerWidth', label: 'Trigger width', kind: 'number', default: 72, min: 0, step: 8 },
      { key: 'fallDelay', label: 'Fall delay', kind: 'number', default: 0.25, min: 0, step: 0.05 },
      { key: 'respawn', label: 'Respawn after', kind: 'number', default: 2.5, min: 0.5, step: 0.5 },
    ],
  },
  {
    type: 'movingHazard',
    label: 'Spiked Iron Ball',
    category: 'hazards',
    description: 'A deadly spiked ball that travels along an axis.',
    defaultWidth: 32,
    defaultHeight: 32,
    resize: 'none',
    editorColor: '#8c8c9c',
    signalTarget: true,
    props: [
      { key: 'axis', label: 'Axis', kind: 'select', default: 'horizontal', options: AXIS },
      { key: 'distance', label: 'Distance', kind: 'number', default: 160, step: 16 },
      { key: 'speed', label: 'Speed', kind: 'number', default: 110, min: 1, step: 5 },
      { key: 'wait', label: 'Wait at ends', kind: 'number', default: 0.2, min: 0, step: 0.1 },
      { key: 'startOffset', label: 'Phase (0-1)', kind: 'number', default: 0, min: 0, max: 1, step: 0.05 },
      triggered,
    ],
  },
  {
    type: 'sludge',
    label: 'Poison Sludge',
    category: 'hazards',
    description: 'Poisonous green water. Touching it is fatal.',
    defaultWidth: 160,
    defaultHeight: 48,
    resize: 'both',
    minWidth: 32,
    minHeight: 16,
    editorColor: '#4f8a3a',
    props: [],
  },
  {
    type: 'chaser',
    label: 'Rising Dark',
    category: 'hazards',
    description: 'A wall of darkness that advances once the player passes its start line. Used for escape sequences.',
    defaultWidth: 128,
    defaultHeight: 640,
    resize: 'both',
    minWidth: 32,
    minHeight: 32,
    editorColor: '#2a1830',
    props: [
      { key: 'direction', label: 'Moves', kind: 'select', default: 'right', options: ['right', 'left', 'up'] },
      { key: 'speed', label: 'Speed', kind: 'number', default: 95, min: 1, step: 5 },
      { key: 'startDistance', label: 'Start after player passes', kind: 'number', default: 200, min: 0, step: 16 },
      { key: 'respawnGap', label: 'Gap after respawn', kind: 'number', default: 360, min: 64, step: 16 },
      { key: 'stopAt', label: 'Stop at (x or y)', kind: 'number', default: 0, step: 16, help: '0 = never stop' },
    ],
  },
  // ───────────── switches & interactive
  {
    type: 'pressurePlate',
    label: 'Pressure Plate',
    category: 'switches',
    description: 'Active while stood on.',
    defaultWidth: 48,
    defaultHeight: 10,
    resize: 'none',
    editorColor: '#c28a3a',
    signalSource: true,
    props: [{ key: 'targets', label: 'Targets', kind: 'targets', default: [] }],
  },
  {
    type: 'lever',
    label: 'Lever',
    category: 'switches',
    description: 'Flips each time the player touches it.',
    defaultWidth: 24,
    defaultHeight: 32,
    resize: 'none',
    editorColor: '#d19a43',
    signalSource: true,
    props: [
      { key: 'targets', label: 'Targets', kind: 'targets', default: [] },
      { key: 'startOn', label: 'Starts on', kind: 'boolean', default: false },
    ],
  },
  {
    type: 'button',
    label: 'Button',
    category: 'switches',
    description: 'Pressed once, stays pressed.',
    defaultWidth: 32,
    defaultHeight: 12,
    resize: 'none',
    editorColor: '#e0a64f',
    signalSource: true,
    props: [{ key: 'targets', label: 'Targets', kind: 'targets', default: [] }],
  },
  {
    type: 'timedSwitch',
    label: 'Timed Switch',
    category: 'switches',
    description: 'Active for a limited time after being touched.',
    defaultWidth: 24,
    defaultHeight: 32,
    resize: 'none',
    editorColor: '#e8b85a',
    signalSource: true,
    props: [
      { key: 'targets', label: 'Targets', kind: 'targets', default: [] },
      { key: 'duration', label: 'Duration (s)', kind: 'number', default: 4, min: 0.5, step: 0.5 },
    ],
  },
  {
    type: 'gate',
    label: 'Iron Gate',
    category: 'switches',
    description: 'Barrier that slides open when signalled.',
    defaultWidth: 32,
    defaultHeight: 96,
    resize: 'both',
    minWidth: 16,
    minHeight: 32,
    editorColor: '#6b6f80',
    signalTarget: true,
    props: [
      { key: 'initiallyOpen', label: 'Initially open', kind: 'boolean', default: false },
      { key: 'openDirection', label: 'Slides', kind: 'select', default: 'up', options: ['up', 'down', 'left', 'right'] },
      { key: 'speed', label: 'Slide speed', kind: 'number', default: 260, min: 10, step: 10 },
    ],
  },
  {
    type: 'lockedDoor',
    label: 'Locked Door',
    category: 'switches',
    description: 'Opens when the player touches it holding a key of the same colour.',
    defaultWidth: 32,
    defaultHeight: 96,
    resize: 'y',
    minHeight: 32,
    editorColor: '#7a5a3a',
    props: [{ key: 'color', label: 'Key colour', kind: 'select', default: 'gold', options: KEY_COLORS }],
  },
  {
    type: 'key',
    label: 'Key',
    category: 'switches',
    description: 'Opens locked doors of the same colour.',
    defaultWidth: 24,
    defaultHeight: 24,
    resize: 'none',
    editorColor: '#f0c75a',
    props: [{ key: 'color', label: 'Colour', kind: 'select', default: 'gold', options: KEY_COLORS }],
  },
  {
    type: 'checkpoint',
    label: 'Checkpoint',
    category: 'switches',
    description: 'A lantern post. Respawn here after lighting it.',
    defaultWidth: 32,
    defaultHeight: 64,
    resize: 'none',
    editorColor: '#f08a2a',
    props: [],
  },
  {
    type: 'breakableWall',
    label: 'Cracked Wall',
    category: 'switches',
    description: 'Breaks when the player dashes into it.',
    defaultWidth: 32,
    defaultHeight: 96,
    resize: 'both',
    minWidth: 16,
    minHeight: 16,
    editorColor: '#7d6e62',
    props: [],
  },
  {
    type: 'hiddenWall',
    label: 'Hidden Wall',
    category: 'switches',
    description: 'Looks solid but can be walked through. Great for secrets.',
    defaultWidth: 64,
    defaultHeight: 64,
    resize: 'both',
    minWidth: 16,
    minHeight: 16,
    editorColor: '#5c4a6e',
    props: [{ key: 'style', label: 'Style', kind: 'select', default: 'auto', options: STYLE_TERRAIN }],
  },
  {
    type: 'spring',
    label: 'Spring',
    category: 'switches',
    description: 'Launches the player upward.',
    defaultWidth: 32,
    defaultHeight: 16,
    resize: 'none',
    editorColor: '#c0703a',
    props: [{ key: 'power', label: 'Power', kind: 'number', default: 1000, min: 200, step: 50 }],
  },
  // ───────────── enemies
  {
    type: 'ghost',
    label: 'Ghost',
    category: 'enemies',
    description: 'Drifts gently side to side (or, in chase mode, follows the player when near). Cannot be stomped.',
    defaultWidth: 30,
    defaultHeight: 32,
    resize: 'none',
    editorColor: '#cfd6e6',
    props: [
      { key: 'mode', label: 'Behaviour', kind: 'select', default: 'drift', options: ['drift', 'chase'], help: 'drift = sways in place; chase = follows the player when near' },
      { key: 'range', label: 'Notice range (chase)', kind: 'number', default: 260, min: 32, step: 16 },
      { key: 'speed', label: 'Speed', kind: 'number', default: 55, min: 1, step: 5 },
      { key: 'leash', label: 'Leash distance (chase)', kind: 'number', default: 360, min: 32, step: 16 },
    ],
  },
  {
    type: 'skeleton',
    label: 'Skeleton',
    category: 'enemies',
    description: 'Walks back and forth, turning at walls and ledges. Can be stomped.',
    defaultWidth: 24,
    defaultHeight: 42,
    resize: 'none',
    editorColor: '#e6dfc8',
    props: [
      { key: 'speed', label: 'Speed', kind: 'number', default: 60, min: 1, step: 5 },
      { key: 'direction', label: 'Faces', kind: 'select', default: 'left', options: DIR_LR },
    ],
  },
  {
    type: 'armoredSkeleton',
    label: 'Armored Skeleton',
    category: 'enemies',
    description: 'A little skeleton knight. Walks like a skeleton; stomp its helmet to defeat it.',
    defaultWidth: 28,
    defaultHeight: 44,
    resize: 'none',
    editorColor: '#a7a9b8',
    props: [
      { key: 'speed', label: 'Speed', kind: 'number', default: 50, min: 1, step: 5 },
      { key: 'direction', label: 'Faces', kind: 'select', default: 'left', options: DIR_LR },
    ],
  },
  {
    type: 'bat',
    label: 'Bat',
    category: 'enemies',
    description: 'Flies a repeating patrol. Can be stomped.',
    defaultWidth: 28,
    defaultHeight: 18,
    resize: 'none',
    editorColor: '#6a5a7a',
    props: [
      { key: 'axis', label: 'Axis', kind: 'select', default: 'horizontal', options: AXIS },
      { key: 'distance', label: 'Distance', kind: 'number', default: 160, step: 16 },
      { key: 'speed', label: 'Speed', kind: 'number', default: 90, min: 1, step: 5 },
      { key: 'startOffset', label: 'Phase (0-1)', kind: 'number', default: 0, min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    type: 'raven',
    label: 'Raven',
    category: 'enemies',
    description: 'Fast horizontal flyer that sweeps across its range. Can be stomped.',
    defaultWidth: 34,
    defaultHeight: 20,
    resize: 'none',
    editorColor: '#35303f',
    props: [
      { key: 'range', label: 'Range', kind: 'number', default: 640, min: 64, step: 32 },
      { key: 'speed', label: 'Speed', kind: 'number', default: 230, min: 1, step: 10 },
      { key: 'direction', label: 'Starts flying', kind: 'select', default: 'left', options: DIR_LR },
      { key: 'pause', label: 'Pause at ends', kind: 'number', default: 0.8, min: 0, step: 0.1 },
    ],
  },
  {
    type: 'shadow',
    label: 'Shadow',
    category: 'enemies',
    description: 'Rises from a dark pool when the player comes close and gives chase briefly.',
    defaultWidth: 28,
    defaultHeight: 40,
    resize: 'none',
    editorColor: '#1c1424',
    props: [
      { key: 'triggerRange', label: 'Trigger range', kind: 'number', default: 200, min: 32, step: 16 },
      { key: 'speed', label: 'Speed', kind: 'number', default: 150, min: 1, step: 10 },
      { key: 'duration', label: 'Chase time (s)', kind: 'number', default: 2.2, min: 0.2, step: 0.1 },
      { key: 'cooldown', label: 'Cooldown (s)', kind: 'number', default: 2.5, min: 0, step: 0.5 },
    ],
  },
  // ───────────── items & scenery
  {
    type: 'relic',
    label: 'Moon Relic',
    category: 'items',
    description: 'Hidden collectible. Each level usually hides one.',
    defaultWidth: 20,
    defaultHeight: 20,
    resize: 'none',
    editorColor: '#bfe3ff',
    props: [],
  },
  {
    type: 'sign',
    label: 'Sign',
    category: 'items',
    description: 'Shows a short hint when the player stands near it.',
    defaultWidth: 32,
    defaultHeight: 32,
    resize: 'none',
    editorColor: '#9a7a52',
    props: [{ key: 'text', label: 'Text', kind: 'string', default: 'Hint text', multiline: true }],
  },
  {
    type: 'decoration',
    label: 'Decoration',
    category: 'scenery',
    description: 'Non-solid scenery.',
    defaultWidth: 32,
    defaultHeight: 32,
    resize: 'both',
    minWidth: 8,
    minHeight: 8,
    editorColor: '#5b4a3a',
    props: [
      { key: 'kind', label: 'Kind', kind: 'select', default: 'pumpkin', options: [...DECORATION_KINDS] },
      { key: 'layer', label: 'Layer', kind: 'select', default: 'back', options: ['back', 'front'] },
      { key: 'flip', label: 'Mirror', kind: 'boolean', default: false },
    ],
  },
];

export const OBJECT_DEFS: Record<ObjectType, ObjectTypeDef> = Object.fromEntries(
  defs.map((d) => [d.type, d]),
) as Record<ObjectType, ObjectTypeDef>;

export const ALL_OBJECT_DEFS = defs;

export function defaultProperties(type: ObjectType): Record<string, PropertyValue> {
  const out: Record<string, PropertyValue> = {};
  for (const p of OBJECT_DEFS[type].props) {
    out[p.key] = Array.isArray(p.default)
      ? (JSON.parse(JSON.stringify(p.default)) as PropertyValue)
      : (p.default as PropertyValue);
  }
  return out;
}

/** Decoration default sizes (editor convenience). */
export const DECORATION_SIZES: Record<string, [number, number]> = {
  pumpkin: [32, 28],
  jackOLantern: [32, 28],
  lamp: [24, 112],
  fence: [128, 48],
  gravestone: [32, 40],
  cross: [28, 48],
  deadTree: [128, 192],
  window: [40, 56],
  crate: [32, 32],
  barrel: [28, 36],
  coffin: [36, 72],
  candles: [32, 24],
  candelabra: [32, 56],
  bell: [48, 48],
  chain: [12, 128],
  cobweb: [48, 48],
  banner: [40, 96],
  gear: [96, 96],
  statue: [48, 96],
  bones: [40, 16],
  portrait: [48, 64],
  bookshelf: [64, 96],
  clockFace: [128, 128],
  torch: [16, 40],
  pillar: [48, 192],
  bush: [64, 32],
};
