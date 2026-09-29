import { describe, expect, it } from 'vitest';
import { FIXED_STEP } from '../src/game/config/physics';
import { EMPTY_INPUT, type InputState } from '../src/game/sim/types';
import { World } from '../src/game/sim/World';
import { makeLevel } from './helpers';

const floor = { id: 'g', type: 'ground', x: 0, y: 800, width: 4000, height: 200 };

function run(world: World, seconds: number, input: Partial<InputState> | ((t: number) => Partial<InputState>)) {
  const steps = Math.round(seconds / FIXED_STEP);
  for (let i = 0; i < steps; i++) {
    const inp = typeof input === 'function' ? input(i * FIXED_STEP) : input;
    world.step(FIXED_STEP, { ...EMPTY_INPUT, ...inp });
  }
}

describe('player physics', () => {
  it('stands on ground', () => {
    const w = new World(makeLevel([floor]));
    run(w, 0.5, {});
    expect(w.player.grounded).toBe(true);
    expect(w.player.bottom).toBeCloseTo(800, 3);
  });

  it('full jump reaches ~3 tiles', () => {
    const w = new World(makeLevel([floor]));
    run(w, 0.2, {});
    let minY = Infinity;
    run(w, 1, (t) => {
      minY = Math.min(minY, w.player.bottom);
      return { jump: true, jumpPressed: t === 0 };
    });
    const height = 800 - minY;
    expect(height).toBeGreaterThan(95);
    expect(height).toBeLessThan(120);
  });

  it('short hop is lower than a full jump', () => {
    const w = new World(makeLevel([floor]));
    run(w, 0.2, {});
    let minY = Infinity;
    run(w, 1, (t) => {
      minY = Math.min(minY, w.player.bottom);
      return { jump: t < 0.05, jumpPressed: t === 0 };
    });
    expect(800 - minY).toBeLessThan(60);
  });

  it('running jump clears 5 tiles', () => {
    const w = new World(makeLevel([floor]));
    run(w, 0.6, { right: true });
    const x0 = w.player.x;
    let jumped = false;
    run(w, 1, (t) => {
      jumped = jumped || t > 0.05;
      return { right: true, jump: true, jumpPressed: t === 0 };
    });
    // land position after exactly one airtime
    expect(w.player.x - x0).toBeGreaterThan(160);
  });

  it('falls to death through pits', () => {
    const w = new World(makeLevel([{ id: 'g', type: 'ground', x: 0, y: 800, width: 200, height: 200 }]));
    run(w, 3, { right: true });
    expect(w.deaths).toBeGreaterThan(0);
  });

  it('checkpoint changes respawn', () => {
    const w = new World(
      makeLevel([floor, { id: 'cp', type: 'checkpoint', x: 300, y: 736 }, { id: 's', type: 'spikes', x: 600, y: 784, width: 64, height: 16 }]),
    );
    run(w, 3, { right: true });
    expect(w.deaths).toBe(1);
    expect(w.respawnPoint.x).toBe(316);
    w.respawn();
    expect(w.player.centerX).toBeCloseTo(316, 3);
  });

  it('one-way platforms are passable from below', () => {
    const w = new World(makeLevel([floor, { id: 'o', type: 'oneWay', x: 0, y: 720, width: 400, height: 16 }]));
    run(w, 0.3, {});
    expect(w.player.bottom).toBeCloseTo(800, 3);
    run(w, 1.2, (t) => ({ jump: true, jumpPressed: t === 0 }));
    expect(w.player.bottom).toBeCloseTo(720, 3);
    // drop back through with DOWN + JUMP
    run(w, 0.8, (t) => ({ down: true, jump: t < 0.05, jumpPressed: t === 0 }));
    expect(w.player.bottom).toBeCloseTo(800, 3);
  });

  it('rides moving platforms', () => {
    const w = new World(
      makeLevel(
        [
          { id: 'm', type: 'movingPlatform', x: 60, y: 600, width: 128, height: 24, properties: { axis: 'horizontal', distance: 300, speed: 100, wait: 0 } },
        ],
        { spawn: { x: 100, y: 600 } },
      ),
    );
    run(w, 1, {});
    expect(w.player.grounded).toBe(true);
    expect(w.player.centerX).toBeGreaterThan(180);
  });

  it('switch opens gate', () => {
    const w = new World(
      makeLevel([
        floor,
        { id: 'plate', type: 'pressurePlate', x: 200, y: 790, properties: { targets: ['gate'] } },
        { id: 'gate', type: 'gate', x: 600, y: 704, width: 32, height: 96 },
      ]),
    );
    run(w, 1, { right: true });
    expect(w.isSignalled('gate')).toBe(false); // plate left behind
    run(w, 3, { right: true });
    expect(w.player.x).toBeLessThan(600);
  });
});

describe('gates', () => {
  it('a closing gate pushes the player out instead of being held open', () => {
    const w = new World(
      makeLevel([
        { id: 'g', type: 'ground', x: 0, y: 800, width: 4000, height: 200 },
        { id: 'plate', type: 'pressurePlate', x: 100, y: 790, properties: { targets: ['gate'] } },
        { id: 'gate', type: 'gate', x: 400, y: 704, width: 32, height: 96, properties: { speed: 60 } },
      ], { spawn: { x: 124, y: 800 } }),
    );
    for (let i = 0; i < 120; i++) w.step(FIXED_STEP); // stand on the plate: gate opens
    w.player.placeAt(424, 800); // step off, under the gate (mostly on its right half)
    for (let i = 0; i < 600; i++) w.step(FIXED_STEP);
    const gate = w.getEntity('gate') as unknown as { openness: number };
    expect(gate.openness).toBe(0); // fully closed
    expect(w.player.dead).toBe(false);
    expect(w.player.x).toBeGreaterThanOrEqual(432); // shoved out to the right side
  });
});
