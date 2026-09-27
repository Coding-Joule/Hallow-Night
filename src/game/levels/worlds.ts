/** The seven areas of the game, in play order. */
export type WorldId =
  | 'old-town'
  | 'graveyard'
  | 'dead-woods'
  | 'haunted-manor'
  | 'catacombs'
  | 'clocktower'
  | 'black-castle';

export interface WorldInfo {
  id: WorldId;
  index: number; // 1-based
  name: string;
  subtitle: string;
  /** Accent used by menus for this world. */
  accent: string;
}

export const WORLDS: WorldInfo[] = [
  { id: 'old-town', index: 1, name: 'Old Town', subtitle: 'Lamplit streets on the last night of October', accent: '#e8913a' },
  { id: 'graveyard', index: 2, name: 'Graveyard', subtitle: 'Where the bell still tolls', accent: '#b9b7a3' },
  { id: 'dead-woods', index: 3, name: 'Dead Woods', subtitle: 'Crooked trees and restless wings', accent: '#8aa36b' },
  { id: 'haunted-manor', index: 4, name: 'Haunted Manor', subtitle: 'Locked halls and patient ghosts', accent: '#c77dba' },
  { id: 'catacombs', index: 5, name: 'Catacombs', subtitle: 'Bones, chains and poisoned water', accent: '#79b36a' },
  { id: 'clocktower', index: 6, name: 'Clocktower', subtitle: 'Gears that never stop turning', accent: '#d9b25f' },
  { id: 'black-castle', index: 7, name: 'Black Castle', subtitle: 'The crown waits at midnight', accent: '#d9534f' },
];

export const WORLD_IDS = WORLDS.map((w) => w.id);

export function isWorldId(value: unknown): value is WorldId {
  return typeof value === 'string' && (WORLD_IDS as string[]).includes(value);
}

export function getWorld(id: WorldId): WorldInfo {
  return WORLDS.find((w) => w.id === id) ?? WORLDS[0];
}
