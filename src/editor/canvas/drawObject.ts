import { OBJECT_DEFS } from '../../game/levels/objectTypes';
import type { LevelObject, Point } from '../../game/levels/schema';
import { WORLD_TERRAIN } from '../../game/render/art/terrain';
import type { EditorArt } from './EditorArt';

/** Draws one level object in world coordinates (ctx already transformed). */

function styleOf(o: LevelObject, world: string, kind: 'ground' | 'platform'): string {
  const s = o.properties.style;
  if (typeof s === 'string' && s !== 'auto') return s;
  const w = WORLD_TERRAIN[world] ?? WORLD_TERRAIN['old-town'];
  return kind === 'ground' ? w.ground : w.platform;
}

function fillPattern(ctx: CanvasRenderingContext2D, art: EditorArt, key: string, x: number, y: number, w: number, h: number, fallback: string) {
  const p = art.pattern(ctx, key);
  if (p) {
    // textures are authored at 2×; scale pattern back to world units
    p.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, x, y]));
    ctx.fillStyle = p;
  } else ctx.fillStyle = fallback;
  ctx.fillRect(x, y, w, h);
}

function image(ctx: CanvasRenderingContext2D, art: EditorArt, key: string, x: number, y: number, w: number, h: number, flip = false) {
  const img = art.img(key);
  if (!img) return false;
  if (flip) {
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
  } else ctx.drawImage(img, x, y, w, h);
  return true;
}

/** image anchored bottom-centre at native (half) size */
function sprite(ctx: CanvasRenderingContext2D, art: EditorArt, key: string, cx: number, bottom: number, flip = false) {
  const img = art.img(key);
  if (!img) return;
  const w = img.naturalWidth / 2;
  const h = img.naturalHeight / 2;
  image(ctx, art, key, cx - w / 2, bottom - h, w, h, flip);
}

function dashed(ctx: CanvasRenderingContext2D, color: string, zoom: number, draw: () => void) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([6 / zoom, 4 / zoom]);
  ctx.beginPath();
  draw();
  ctx.stroke();
  ctx.restore();
}

const n = (v: unknown, d: number) => (typeof v === 'number' ? v : d);

export function drawObject(ctx: CanvasRenderingContext2D, art: EditorArt, o: LevelObject, world: string, zoom: number, selected: boolean): void {
  const { x, y, width: w, height: h } = o;
  const p = o.properties;
  switch (o.type) {
    case 'ground':
    case 'platform':
    case 'hiddenWall': {
      const st = styleOf(o, world, o.type === 'platform' ? 'platform' : 'ground');
      fillPattern(ctx, art, `terrain-${st}`, x, y, w, h, '#3b3a4a');
      if (h >= 12) fillPattern(ctx, art, `top-${st}`, x, y, w, Math.min(10, h), '#555');
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1 / zoom;
      ctx.strokeRect(x, y, w, h);
      if (o.type === 'hiddenWall') {
        ctx.fillStyle = 'rgba(143,125,208,0.35)';
        ctx.fillRect(x, y, w, h);
        dashed(ctx, '#c9b8ff', zoom, () => ctx.rect(x + 2, y + 2, w - 4, h - 4));
      }
      break;
    }
    case 'oneWay':
      fillPattern(ctx, art, `oneway-${String(p.style ?? 'wood')}`, x, y, w, 16, '#8a6a45');
      break;
    case 'slope': {
      const st = styleOf(o, world, 'ground');
      ctx.save();
      ctx.beginPath();
      if (p.rise === 'left') {
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
      } else {
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h);
      }
      ctx.closePath();
      ctx.clip();
      fillPattern(ctx, art, `terrain-${st}`, x, y, w, h, '#4a4958');
      ctx.restore();
      break;
    }
    case 'conveyor': {
      fillPattern(ctx, art, 'conveyor-tile', x, y, w, h, '#3a3d48');
      ctx.fillStyle = '#e8c86a';
      const dir = n(p.speed, 90) >= 0 ? 1 : -1;
      for (let ax = x + 16; ax < x + w - 8; ax += 32) {
        ctx.beginPath();
        ctx.moveTo(ax - 5 * dir, y + h / 2 - 5);
        ctx.lineTo(ax + 5 * dir, y + h / 2);
        ctx.lineTo(ax - 5 * dir, y + h / 2 + 5);
        ctx.fill();
      }
      break;
    }
    case 'movingPlatform': {
      const d = n(p.distance, 192);
      const horiz = p.axis !== 'vertical';
      const ex = horiz ? x + d : x;
      const ey = horiz ? y : y + d;
      dashed(ctx, 'rgba(232,145,58,0.8)', zoom, () => ctx.rect(ex, ey, w, h));
      dashed(ctx, 'rgba(232,145,58,0.8)', zoom, () => {
        ctx.moveTo(x + w / 2, y + h / 2);
        ctx.lineTo(ex + w / 2, ey + h / 2);
      });
      fillPattern(ctx, art, 'plat-iron', x, y, w, h, '#434754');
      break;
    }
    case 'pathPlatform': {
      const pts = (Array.isArray(p.points) ? p.points : []) as Point[];
      dashed(ctx, 'rgba(232,145,58,0.8)', zoom, () => {
        pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(x + pt.x + w / 2, y + pt.y + h / 2) : ctx.lineTo(x + pt.x + w / 2, y + pt.y + h / 2)));
        if (p.loop === 'loop' && pts.length) ctx.lineTo(x + pts[0].x + w / 2, y + pts[0].y + h / 2);
      });
      for (const pt of pts.slice(1)) dashed(ctx, 'rgba(232,145,58,0.5)', zoom, () => ctx.rect(x + pt.x, y + pt.y, w, h));
      fillPattern(ctx, art, 'plat-iron', x, y, w, h, '#434754');
      break;
    }
    case 'fallingPlatform':
      fillPattern(ctx, art, 'plat-falling', x, y, w, h, '#5a4030');
      break;
    case 'crumblingPlatform':
      fillPattern(ctx, art, 'plat-crumble', x, y, w, h, '#5f5850');
      break;
    case 'timedPlatform':
      ctx.globalAlpha = 0.75;
      fillPattern(ctx, art, 'plat-phantom', x, y, w, h, '#4c3f78');
      ctx.globalAlpha = 1;
      break;
    case 'elevator': {
      const d = n(p.distance, 256) * (p.direction === 'down' ? 1 : -1);
      dashed(ctx, 'rgba(232,200,106,0.8)', zoom, () => ctx.rect(x, y + d, w, h));
      fillPattern(ctx, art, 'plat-elevator', x, y, w, h, '#5c5236');
      break;
    }
    case 'spikes':
      fillPattern(ctx, art, `spikes-${String(p.direction ?? 'up')}`, x, y, w, h, '#b9b3a3');
      break;
    case 'sludge':
      ctx.fillStyle = 'rgba(53,86,31,0.95)';
      ctx.fillRect(x, y + 6, w, h - 6);
      fillPattern(ctx, art, 'sludge-surface', x, y, w, Math.min(16, h), '#6fae3c');
      break;
    case 'pendulum': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const L = n(p.length, 160);
      const a = (n(p.angle, 55) * Math.PI) / 180;
      dashed(ctx, 'rgba(200,200,220,0.5)', zoom, () => ctx.arc(cx, cy, L, Math.PI / 2 - a, Math.PI / 2 + a));
      ctx.strokeStyle = '#555a66';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + L);
      ctx.stroke();
      image(ctx, art, 'blade', cx - 28, cy + L - 12, 56, 32);
      ctx.fillStyle = '#3e414c';
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'fallingHazard': {
      const tw = n(p.triggerWidth, 72);
      dashed(ctx, 'rgba(217,83,79,0.5)', zoom, () => ctx.rect(x + w / 2 - tw / 2, y, tw, 400));
      image(ctx, art, 'masonry', x, y, w, h);
      break;
    }
    case 'movingHazard': {
      const d = n(p.distance, 160);
      const horiz = p.axis !== 'vertical';
      dashed(ctx, 'rgba(217,83,79,0.7)', zoom, () => {
        ctx.moveTo(x + w / 2, y + h / 2);
        ctx.lineTo(x + w / 2 + (horiz ? d : 0), y + h / 2 + (horiz ? 0 : d));
      });
      image(ctx, art, 'iron-ball', x, y, w, h);
      break;
    }
    case 'chaser': {
      ctx.fillStyle = 'rgba(20,8,28,0.75)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#c9b8ff';
      ctx.font = `${Math.max(10, 14)}px sans-serif`;
      const dir = String(p.direction ?? 'right');
      ctx.fillText(`RISING DARK → ${dir}`, x + 6, y + 18);
      break;
    }
    case 'pressurePlate':
      image(ctx, art, 'plate-up', x, y, w, h);
      break;
    case 'lever':
      image(ctx, art, p.startOn ? 'lever-on' : 'lever-off', x, y, w, h);
      break;
    case 'button':
      image(ctx, art, 'button-up', x, y, w, h);
      break;
    case 'timedSwitch':
      image(ctx, art, 'timer-off', x, y, w, h);
      break;
    case 'gate': {
      if (p.initiallyOpen) ctx.globalAlpha = 0.45;
      fillPattern(ctx, art, 'gate-tile', x, y, w, h, '#4b4f5c');
      ctx.globalAlpha = 1;
      break;
    }
    case 'lockedDoor':
      fillPattern(ctx, art, 'door-tile', x, y, w, h, '#4a3426');
      image(ctx, art, `lock-${String(p.color ?? 'gold')}`, x + w / 2 - 10, y + h / 2 - 12, 20, 24);
      break;
    case 'key':
      image(ctx, art, `key-${String(p.color ?? 'gold')}`, x, y, w, h);
      break;
    case 'checkpoint':
      image(ctx, art, 'checkpoint-off', x, y, w, h);
      break;
    case 'breakableWall':
      fillPattern(ctx, art, 'cracked-tile', x, y, w, h, '#5a534b');
      break;
    case 'spring':
      image(ctx, art, 'spring-0', x, y, w, h);
      break;
    case 'ghost':
      if (selected) dashed(ctx, 'rgba(207,214,230,0.4)', zoom, () => ctx.arc(x + w / 2, y + h / 2, n(p.range, 260), 0, Math.PI * 2));
      image(ctx, art, 'ghost-0', x, y, w, h);
      break;
    case 'skeleton':
      sprite(ctx, art, 'skeleton-0', x + w / 2, y + h, p.direction === 'left');
      break;
    case 'armoredSkeleton':
      sprite(ctx, art, 'armored-0', x + w / 2, y + h, p.direction === 'left');
      break;
    case 'bat': {
      const d = n(p.distance, 160);
      const horiz = p.axis !== 'vertical';
      dashed(ctx, 'rgba(160,140,200,0.6)', zoom, () => {
        ctx.moveTo(x + w / 2, y + h / 2);
        ctx.lineTo(x + w / 2 + (horiz ? d : 0), y + h / 2 + (horiz ? 0 : d));
      });
      image(ctx, art, 'bat-0', x, y, w, h);
      break;
    }
    case 'raven': {
      const r = n(p.range, 640) * (p.direction === 'right' ? 1 : -1);
      dashed(ctx, 'rgba(160,140,200,0.6)', zoom, () => {
        ctx.moveTo(x + w / 2, y + h / 2);
        ctx.lineTo(x + w / 2 + r, y + h / 2);
      });
      image(ctx, art, 'raven-0', x, y, w, h, p.direction === 'left');
      break;
    }
    case 'shadow':
      if (selected) dashed(ctx, 'rgba(201,184,255,0.4)', zoom, () => ctx.arc(x + w / 2, y + h / 2, n(p.triggerRange, 200), 0, Math.PI * 2));
      image(ctx, art, 'shadow-pool', x - 6, y + h - 6, 40, 10);
      ctx.globalAlpha = 0.6;
      image(ctx, art, 'shadow', x, y, w, h);
      ctx.globalAlpha = 1;
      break;
    case 'relic':
      image(ctx, art, 'relic', x, y, w, h);
      break;
    case 'sign':
      image(ctx, art, 'sign', x, y, w, h);
      break;
    case 'decoration': {
      const kind = String(p.kind ?? 'pumpkin');
      if (p.layer === 'front') ctx.globalAlpha = 0.7;
      if (!image(ctx, art, `deco-${kind}`, x, y, w, h, p.flip === true)) {
        ctx.fillStyle = OBJECT_DEFS.decoration.editorColor;
        ctx.fillRect(x, y, w, h);
      }
      ctx.globalAlpha = 1;
      break;
    }
  }
}

export function drawMarker(ctx: CanvasRenderingContext2D, art: EditorArt, kind: 'spawn' | 'goal', pt: Point): void {
  if (kind === 'spawn') sprite(ctx, art, 'player-idle0', pt.x, pt.y);
  else sprite(ctx, art, 'goal', pt.x, pt.y);
}

/** Bounding box used for hit testing and selection outlines. */
export function objectBounds(o: LevelObject): { x: number; y: number; w: number; h: number } {
  if (o.type === 'oneWay') return { x: o.x, y: o.y, w: o.width, h: 16 };
  return { x: o.x, y: o.y, w: o.width, h: o.height };
}

export const SPAWN_BOX = { w: 24, h: 40 };
export const GOAL_BOX = { w: 64, h: 88 };
