/** Every area of the game, in play order. */
export type WorldId =
  | 'old-town'
  | 'graveyard'
  | 'dead-woods'
  | 'haunted-manor'
  | 'catacombs'
  | 'clocktower'
  | 'black-castle'
  | 'frozen-hollow'
  | 'candy-carnival'
  | 'witch-swamp'
  | 'ghost-harbor'
  | 'lava-crypt'
  | 'sky-ruins'
  | 'toy-factory'
  | 'mirror-manor'
  | 'moon-garden'
  | 'nightmare-realm';

export interface WorldInfo {
  id: WorldId;
  index: number; // 1-based
  name: string;
  subtitle: string;
  /** Accent used by menus for this world. */
  accent: string;
  /** Worlds that share a chapter are drawn as one region on the map. */
  chapter?: string;
}

export const EXAM_CHAPTER = 'The Placement Exam';

export const WORLDS: WorldInfo[] = [
  // The Placement Exam: the first 84 levels
  { id: 'old-town', index: 1, name: 'Old Town', subtitle: 'Lamplit streets on the last night of October', accent: '#e8913a', chapter: EXAM_CHAPTER },
  { id: 'graveyard', index: 2, name: 'Graveyard', subtitle: 'Where the bell still tolls', accent: '#b9b7a3', chapter: EXAM_CHAPTER },
  { id: 'dead-woods', index: 3, name: 'Dead Woods', subtitle: 'Crooked trees and restless wings', accent: '#8aa36b', chapter: EXAM_CHAPTER },
  { id: 'haunted-manor', index: 4, name: 'Haunted Manor', subtitle: 'Locked halls and patient ghosts', accent: '#c77dba', chapter: EXAM_CHAPTER },
  { id: 'catacombs', index: 5, name: 'Catacombs', subtitle: 'Bones, chains and poisoned water', accent: '#79b36a', chapter: EXAM_CHAPTER },
  { id: 'clocktower', index: 6, name: 'Clocktower', subtitle: 'Gears that never stop turning', accent: '#d9b25f', chapter: EXAM_CHAPTER },
  { id: 'black-castle', index: 7, name: 'Black Castle', subtitle: 'The crown waits at midnight', accent: '#d9534f', chapter: EXAM_CHAPTER },
  // After the exam: the real adventure
  { id: 'frozen-hollow', index: 8, name: 'Frozen Hollow', subtitle: 'Snow falls on the pumpkins', accent: '#8fd3f0' },
  { id: 'candy-carnival', index: 9, name: 'Candy Carnival', subtitle: 'Sweet lights, sour rides', accent: '#f08fc8' },
  { id: 'witch-swamp', index: 10, name: 'Witch Swamp', subtitle: 'Bubbling cauldrons in the bog', accent: '#7fc25a' },
  { id: 'ghost-harbor', index: 11, name: 'Ghost Harbor', subtitle: 'Ships that sailed a hundred years ago', accent: '#6fb4c8' },
  { id: 'lava-crypt', index: 12, name: 'Lava Crypt', subtitle: 'The stones are warm to the touch', accent: '#f0703a' },
  { id: 'sky-ruins', index: 13, name: 'Sky Ruins', subtitle: 'Broken towers above the clouds', accent: '#b8b0f0' },
  { id: 'toy-factory', index: 14, name: 'Toy Factory', subtitle: 'Wind-up things that should not move', accent: '#f0c050' },
  { id: 'mirror-manor', index: 15, name: 'Mirror Manor', subtitle: 'Every hallway looks back at you', accent: '#a0e0e0' },
  { id: 'moon-garden', index: 16, name: 'Moon Garden', subtitle: 'Silver flowers that bloom at midnight', accent: '#dcdcf5' },
  { id: 'nightmare-realm', index: 17, name: 'Nightmare Realm', subtitle: 'The last door of Halloween night', accent: '#b04ad0' },
];

export const WORLD_IDS = WORLDS.map((w) => w.id);

export function isWorldId(value: unknown): value is WorldId {
  return typeof value === 'string' && (WORLD_IDS as string[]).includes(value);
}

export function getWorld(id: WorldId): WorldInfo {
  return WORLDS.find((w) => w.id === id) ?? WORLDS[0];
}
