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

  it('full jump reaches ~4 tiles', () => {
    const w = new World(makeLevel([floor]));
    run(w, 0.2, {});
    let minY = Infinity;
    run(w, 1, (t) => {
      minY = Math.min(minY, w.player.bottom);
      return { jump: true, jumpPressed: t === 0 };
    });
    const height = 800 - minY;
    expect(height).toBeGreaterThan(125);
    expect(height).toBeLessThan(150);
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

describe('pumpkin tortoise', () => {
  it('stomp hides it in its shell; walking into the shell kicks it fast and it knocks out other creatures', async () => {
    const { PumpkinTortoise } = await import('../src/game/sim/entities/enemies');
    const w = new World(
      makeLevel([
        floor,
        { id: 't1', type: 'pumpkinTortoise', x: 400, y: 778, width: 28, height: 22, properties: { speed: 1, direction: 'right' } },
        { id: 't2', type: 'pumpkinTortoise', x: 1200, y: 778, width: 28, height: 22, properties: { speed: 1 } },
      ]),
    );
    const t1 = w.entities.find((e) => e.id === 't1') as InstanceType<typeof PumpkinTortoise>;
    const t2 = w.entities.find((e) => e.id === 't2') as InstanceType<typeof PumpkinTortoise>;
    run(w, 0.2, {});
    w.player.placeAt(t1.x + t1.w / 2, 700);
    run(w, 0.3, {});
    expect(t1.state).toBe('shell');
    expect(t1.dead).toBe(false);
    // step back to the left, wait, then walk into the shell
    w.player.placeAt(t1.x - 60, 800);
    run(w, 0.5, {});
    const startX = t1.x;
    run(w, 0.9, (_t) => (t1.state === 'shell' ? { right: true } : {}));
    expect(t1.state).toBe('slide');
    expect(t1.x - startX).toBeGreaterThan(150);
    run(w, 2, {});
    expect(t2.dead).toBe(true);
    expect(w.deaths).toBe(0);
  });
});

describe('bosses', () => {
  for (const kind of ['pumpkinKing', 'graveGolem', 'batQueen', 'midnightKing']) {
    it(`${kind}: the exit is locked until it has been stomped enough times`, async () => {
      const { Boss } = await import('../src/game/sim/entities/enemies');
      const w = new World(
        makeLevel([floor, { id: 'b', type: 'boss', x: 600, y: 560, width: 80, height: 72, properties: { kind, hp: 3, speed: 0.3, range: 32, dive: 160 } }], {
          goal: { x: 300, y: 800 },
          spawn: { x: 100, y: 800 },
        }),
      );
      const b = w.entities.find((e) => e.id === 'b') as InstanceType<typeof Boss>;
      run(w, 1, {});
      expect(w.goalLocked).toBe(true);
      for (let i = 0; i < 3; i++) {
        for (let k = 0; k < 400 && b.action === 'air'; k++) run(w, FIXED_STEP, {});
        // drop the player onto its head
        w.player.placeAt(b.x + b.w / 2, b.y - 40);
        w.player.vy = 300;
        run(w, 0.1, {});
        // step well away while it flashes
        w.player.placeAt(2400, 800);
        run(w, 1.4, {});
      }
      expect(b.dead).toBe(true);
      expect(w.goalLocked).toBe(false);
      expect(w.deaths).toBe(0);
    });
  }
});

describe('mechanics after the placement exam', () => {
  it('ice: you slide much further after letting go', () => {
    const slide = (type: string) => {
      const w = new World(makeLevel([{ id: 'g', type, x: 0, y: 800, width: 4000, height: 200, properties: type === 'ground' ? {} : {} }]));
      run(w, 0.2, {});
      run(w, 1, { right: true });
      const x0 = w.player.x;
      run(w, 1.5, {});
      return w.player.x - x0;
    };
    expect(slide('ice')).toBeGreaterThan(slide('ground') * 4);
  });

  it('an updraft carries you up', () => {
    const w = new World(makeLevel([floor, { id: 'w', type: 'wind', x: 60, y: 300, width: 96, height: 500, properties: { direction: 'up', strength: 1 } }]));
    run(w, 1.2, {});
    expect(w.player.bottom).toBeLessThan(500);
  });

  it('a balloon bounces you high and pops', () => {
    const w = new World(makeLevel([floor, { id: 'b', type: 'balloon', x: 400, y: 700, width: 32, height: 40, properties: {} }]));
    w.player.placeAt(416, 640);
    let minY = Infinity;
    for (let i = 0; i < 120; i++) {
      run(w, FIXED_STEP, {});
      minY = Math.min(minY, w.player.bottom);
    }
    expect(minY).toBeLessThan(500);
  });

  it('a portal sends you to its partner', () => {
    const w = new World(
      makeLevel([
        floor,
        { id: 'p1', type: 'portal', x: 200, y: 736, width: 40, height: 64, properties: { target: 'p2' } },
        { id: 'p2', type: 'portal', x: 3000, y: 736, width: 40, height: 64, properties: { target: 'p1' } },
      ]),
    );
    run(w, 1.2, { right: true });
    expect(w.player.x).toBeGreaterThan(2900);
  });

  it('a lily pad sinks while you stand on it', () => {
    const w = new World(makeLevel([{ id: 'pad', type: 'sinkingPlatform', x: 60, y: 600, width: 96, height: 16, properties: { speed: 45, distance: 96 } }], { spawn: { x: 100, y: 600 } }));
    run(w, 1, {});
    expect(w.player.bottom).toBeGreaterThan(630);
    expect(w.deaths).toBe(0);
  });

  it('flame jets and cannonballs hurt', () => {
    const fire = new World(makeLevel([floor, { id: 'f', type: 'flameJet', x: 90, y: 784, width: 32, height: 16, properties: { onTime: 5, offTime: 1, offset: 0, height: 128 } }]));
    run(fire, 0.5, {});
    expect(fire.deaths).toBeGreaterThan(0);
    const boom = new World(makeLevel([floor, { id: 'c', type: 'cannon', x: 600, y: 760, width: 48, height: 40, properties: { direction: 'left', interval: 0.6, speed: 400 } }]));
    run(boom, 3, {});
    expect(boom.deaths).toBeGreaterThan(0);
  });
});
