import type { TutorialMemory } from '../render/WorldText';
import type { WorldEvent } from '../sim/types';

export interface HudState {
  time: number;
  deaths: number;
  keys: string[];
  relicsFound: number;
  relicTotal: number;
  sign: string | null;
  abilities: { wallJump: boolean; dash: boolean; doubleJump: boolean };
}

export interface CompletionInfo {
  time: number;
  deaths: number;
  relics: string[];
  relicTotal: number;
}

/**
 * The page that embeds GameScene (main game or editor playtest) implements
 * this to receive HUD updates and flow events.
 */
export interface GameHost {
  onHud(state: HudState): void;
  onPauseRequest(): void;
  onComplete(info: CompletionInfo): void;
  onWorldEvent?(e: WorldEvent): void;
  /** Called once the level is displayed. */
  onReady?(): void;
  /** One-time in-world hints (omit to show only sign texts, e.g. in playtests). */
  tutorials?: TutorialMemory;
}
