export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function inset(r: Rect, dx: number, dy: number = dx): Rect {
  return { x: r.x + dx, y: r.y + dy, w: Math.max(0, r.w - dx * 2), h: Math.max(0, r.h - dy * 2) };
}

export function circleOverlapsRect(cx: number, cy: number, radius: number, r: Rect): boolean {
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < radius * radius;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean; // held
  jumpPressed: boolean; // edge this frame
  dashPressed: boolean; // edge this frame
}

export const EMPTY_INPUT: InputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  jumpPressed: false,
  dashPressed: false,
};

export type WorldEventType =
  | 'jump'
  | 'doubleJump'
  | 'wallJump'
  | 'land'
  | 'dash'
  | 'death'
  | 'respawn'
  | 'checkpoint'
  | 'key'
  | 'relic'
  | 'switch'
  | 'stomp'
  | 'kick'
  | 'bossHit'
  | 'bossDefeated'
  | 'spring'
  | 'break'
  | 'door'
  | 'gate'
  | 'crumble'
  | 'fall'
  | 'goal'
  | 'shadow';

export interface WorldEvent {
  type: WorldEventType;
  x: number;
  y: number;
  data?: string;
}
