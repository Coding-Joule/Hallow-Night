import Phaser from 'phaser';
import { ABILITY_TUTORIALS, GOAL_TUTORIAL, OBJECT_TUTORIALS } from '../levels/tutorials';
import type { LevelData } from '../levels/schema';
import type { World } from '../sim/World';
import { DEPTH } from './views';
import { touchControlsWanted } from '../../ui/TouchControls';

/** Sign texts name keyboard keys; on touch screens name the on-screen buttons instead. */
function forTouch(text: string): string {
  return text
    .replace(/Use ← → \(or A \/ D\) to walk\./g, 'Use ◀ ▶ to walk.')
    .replace(/Press SHIFT \(or X\) to DASH\./g, 'Press DASH to dash.')
    .replace(/SHIFT \(or X\)/g, 'DASH')
    .replace(/Hold ↓/g, 'Hold ▼')
    .replace(/SPACE/g, 'JUMP');
}

/** Hints are skipped when a hand-placed sign already explains that spot. */
const SIGN_RADIUS = 400;

/** What the host remembers about hints already shown (campaign only). */
export interface TutorialMemory {
  seen: (key: string) => boolean;
  markSeen: (key: string) => void;
}

interface Label {
  text: Phaser.GameObjects.Text;
  x: number;
  y: number;
  key: string | null; // tutorial key to mark as seen, null for signs
  shown: boolean;
}

const NEAR = 260;

/**
 * Text painted into the level behind everything the player touches:
 * sign texts and one-time tutorial hints. It never blocks play.
 */
export class WorldText {
  private labels: Label[] = [];

  constructor(
    private scene: Phaser.Scene,
    private world: World,
    tutorials: TutorialMemory | null,
  ) {
    const level = world.level;
    // signs always show their text in the world
    const touch = touchControlsWanted();
    const signs: { x: number; y: number }[] = [];
    for (const o of level.objects) {
      if (o.type !== 'sign' || typeof o.properties.text !== 'string' || !o.properties.text.trim()) continue;
      const text = touch ? forTouch(o.properties.text) : o.properties.text;
      this.add(text, o.x + o.width / 2, o.y - 10, null, 'sign');
      signs.push({ x: o.x + o.width / 2, y: o.y });
    }
    if (!tutorials) return;
    const place = (key: string, text: string, x: number, y: number) => {
      if (tutorials.seen(key)) return;
      if (signs.some((sg) => Math.hypot(sg.x - x, sg.y - y) < SIGN_RADIUS)) return;
      this.add(text, x, y, key, 'hint', tutorials);
    };
    // new abilities: painted right beside the start
    for (const ab of ['wallJump', 'dash', 'doubleJump'] as const) {
      if (level.abilities[ab]) place(`ability:${ab}`, ABILITY_TUTORIALS[ab], level.spawn.x + 40, level.spawn.y - 70);
    }
    // first instance (closest to the start) of each object type not seen yet
    const d = (x: number, y: number) => Math.hypot(x - level.spawn.x, (y - level.spawn.y) * 1.5);
    const firstOf = new Map<string, LevelData['objects'][number]>();
    for (const o of level.objects) {
      if (!OBJECT_TUTORIALS[o.type]) continue;
      const cur = firstOf.get(o.type);
      if (!cur || d(o.x, o.y) < d(cur.x, cur.y)) firstOf.set(o.type, o);
    }
    for (const [type, o] of firstOf) {
      const anchorY = o.type === 'pendulum' ? o.y - 8 : o.type === 'chaser' ? level.spawn.y - 90 : o.y - 14;
      const anchorX = o.type === 'chaser' ? level.spawn.x + 60 : o.x + o.width / 2;
      place(`object:${type}`, OBJECT_TUTORIALS[o.type as keyof typeof OBJECT_TUTORIALS]!, anchorX, anchorY);
    }
    place('goal', GOAL_TUTORIAL, level.goal.x, level.goal.y - 100);
    this.resolveOverlaps();
  }

  private memory: TutorialMemory | null = null;

  private add(text: string, x: number, y: number, key: string | null, kind: 'sign' | 'hint', memory?: TutorialMemory): void {
    if (memory) this.memory = memory;
    const lvl = this.world.level;
    const t = this.scene.add
      .text(0, 0, text, {
        fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
        fontSize: kind === 'sign' ? '13px' : '14px',
        color: kind === 'sign' ? '#e6dcc4' : '#f2c27a',
        align: 'center',
        lineSpacing: 3,
        wordWrap: { width: 250 },
        stroke: '#0b0913',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setResolution(3)
      .setDepth(DEPTH.decoBack + 1)
      .setAlpha(0);
    // keep it inside the level
    const half = t.width / 2 + 8;
    const cx = Phaser.Math.Clamp(x, half, Math.max(half, lvl.width - half));
    const cy = Math.max(t.height + 8, y);
    t.setPosition(cx, cy);
    this.labels.push({ text: t, x: cx, y: cy, key, shown: false });
  }

  /** Nudge labels upward so they never sit on top of each other. */
  private resolveOverlaps(): void {
    const placed: Phaser.Geom.Rectangle[] = [];
    for (const l of this.labels) {
      let b = l.text.getBounds();
      for (let tries = 0; tries < 6 && placed.some((p) => Phaser.Geom.Intersects.RectangleToRectangle(p, b)); tries++) {
        l.y -= b.height + 6;
        l.text.setY(l.y);
        b = l.text.getBounds();
      }
      placed.push(b);
    }
  }

  update(dt: number): void {
    const p = this.world.player;
    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;
    for (const l of this.labels) {
      const dist = Math.hypot(px - l.x, py - (l.y - l.text.height / 2));
      const near = dist < NEAR;
      if (near && !l.shown) {
        l.shown = true;
        if (l.key) this.memory?.markSeen(l.key);
      }
      // hints stay visible once discovered in this run; far away they fade back
      const target = near ? 1 : l.shown || !l.key ? 0.6 : 0.45;
      const a = l.text.alpha + (target - l.text.alpha) * Math.min(1, dt * 4);
      l.text.setAlpha(a);
    }
  }
}
