import { ElmaObject, Gravity, Level, ObjectType, Polygon, Position } from 'elmajs';
import { describe, expect, it, vi } from 'vitest';
import { isAirAt, parseLev, verticalSolidRayDistances } from './elma';
import { collideCircle, createSim, getPhysicsWorld, stepSim, TUNING, TUNING_ELMA } from './physics';
import type { ElmaLevel, Input } from './types';

const idle: Input = { gas: false, brake: false, leanBack: false, leanForward: false, turnAround: false };
function object(type: ObjectType, x: number, y: number, gravity = Gravity.None): ElmaObject {
  const value = new ElmaObject(); value.type = type; value.position = new Position(x, y); value.gravity = gravity; return value;
}
function polygon(grass: boolean, points: Array<[number, number]>): Polygon {
  const value = new Polygon(); value.grass = grass; value.vertices = points.map(([x, y]) => new Position(x, y)); return value;
}
function yDownLevel(): Level {
  const level = new Level();
  level.polygons = [polygon(false, [[0, -2], [10, -2], [10, 8], [0, 8]])];
  level.objects = [object(ObjectType.Start, 2, 7.2), object(ObjectType.Exit, 8, 7.3)];
  return level;
}
function fixture(): Uint8Array {
  const level = yDownLevel(); level.name = 'Fixture';
  level.polygons.push(polygon(true, [[1, 7.7], [3, 7.7], [3, 7.8], [1, 7.8]]));
  level.objects.push(object(ObjectType.Apple, 4, 7.2, Gravity.Left), object(ObjectType.Killer, 5, 7.2), object(ObjectType.Exit, 6, 7.2));
  return level.toBuffer();
}

describe('Elasto Mania level parsing', () => {
  it('parses objects, gravity, multiple exits, metadata, grass, and the y-axis conversion', () => {
    const level = parseLev(fixture());
    expect(level.name).toBe('Fixture');
    expect(level.start).toEqual({ x: 2, y: 7.2 });
    expect(level.apples).toEqual([{ p: { x: 4, y: 7.2 }, gravity: 'left', animation: 1 }]);
    expect(level.killers).toEqual([{ x: 5, y: 7.2 }]);
    expect(level.exits).toEqual([{ x: 8, y: 7.3 }, { x: 6, y: 7.2 }]);
    expect(level.polygons.at(-1)?.grass).toBe(true);
  });

  it('returns a friendly error for a non-level file', () => {
    expect(() => parseLev(new Uint8Array([1, 2, 3]))).toThrow("This doesn't look like an Elasto Mania level file");
  });

  it('rejects missing required objects, unsafe coordinates, and excessive geometry', () => {
    const missingExit = yDownLevel(); missingExit.objects = missingExit.objects.filter((item) => item.type !== ObjectType.Exit);
    expect(() => parseLev(missingExit.toBuffer())).toThrow("This doesn't look like an Elasto Mania level file");
    const missingStart = yDownLevel(); missingStart.objects = missingStart.objects.filter((item) => item.type !== ObjectType.Start);
    expect(() => parseLev(missingStart.toBuffer())).toThrow("This doesn't look like an Elasto Mania level file");
    const farAway = yDownLevel(); farAway.objects[0].position = new Position(10_001, 0);
    expect(() => parseLev(farAway.toBuffer())).toThrow("This doesn't look like an Elasto Mania level file");
    const nonFinite = yDownLevel(); nonFinite.polygons[0].vertices[0] = new Position(Number.NaN, 0);
    expect(() => parseLev(nonFinite.toBuffer())).toThrow("This doesn't look like an Elasto Mania level file");
    const excessive = yDownLevel();
    excessive.polygons[0].vertices = Array.from({ length: 20_001 }, (_, index) => new Position(index % 100, Math.floor(index / 100)));
    expect(() => parseLev(excessive.toBuffer())).toThrow("This doesn't look like an Elasto Mania level file");
  });

  it('uses even-odd nesting and excludes decorative grass from collision', () => {
    const level: ElmaLevel = {
      name: 'Nesting', start: { x: 2, y: 2 }, apples: [], killers: [], exits: [{ x: 3, y: 2 }], lgr: '', ground: '', sky: '',
      polygons: [
        { grass: false, vertices: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }] },
        { grass: false, vertices: [{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 15 }, { x: 5, y: 15 }] },
        { grass: false, vertices: [{ x: 8, y: 8 }, { x: 12, y: 8 }, { x: 12, y: 12 }, { x: 8, y: 12 }] },
        { grass: true, vertices: [{ x: 1, y: 1 }, { x: 19, y: 1 }, { x: 19, y: 1.1 }, { x: 1, y: 1.1 }] },
      ],
    };
    expect(isAirAt(level, { x: 2, y: 2 })).toBe(true);
    expect(isAirAt(level, { x: 6, y: 6 })).toBe(false);
    expect(isAirAt(level, { x: 10, y: 10 })).toBe(true);
    expect(getPhysicsWorld(level).edges).toHaveLength(12);
    expect(getPhysicsWorld(level).grassPolygons).toHaveLength(1);
  });

  it('changes world gravity when a gravity apple is collected', () => {
    const level = parseLev(fixture());
    level.apples[0].p = { ...level.start };
    const sim = createSim(level); stepSim(sim, idle, TUNING.DT);
    expect(sim.collected[0]).toBe(true);
    expect(sim.gravity).toEqual({ x: -10, y: 0 });
  });

  it('finishes a synthetic level after collecting its apple', () => {
    const level = yDownLevel(); level.objects.splice(1, 0, object(ObjectType.Apple, 4, 7.2));
    const sim = createSim(parseLev(level.toBuffer()));
    for (let i = 0; i < 10 / TUNING.DT && sim.status === 'playing'; i += 1) stepSim(sim, { ...idle, gas: true }, TUNING.DT);
    expect(sim.status).toBe('finished');
    expect(sim.collected).toEqual([true]);
  });

  it('uses the spatial grid for a 3000-edge level', () => {
    const vertices = Array.from({ length: 3000 }, (_, index) => {
      const angle = index / 3000 * Math.PI * 2; return { x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 };
    });
    const level: ElmaLevel = { name: 'Large', start: { x: 0, y: 0 }, polygons: [{ grass: false, vertices }], apples: [], killers: [], exits: [{ x: 1, y: 0 }], lgr: '', ground: '', sky: '' };
    const sim = createSim(level); const started = performance.now();
    for (let i = 0; i < 600; i += 1) stepSim(sim, idle, TUNING.DT);
    expect(performance.now() - started).toBeLessThan(1200);
  });

  it('indexes a 10000 metre diagonal edge without filling its bounding box', () => {
    const level: ElmaLevel = {
      name: 'Long diagonal', start: { x: 1, y: 1 }, apples: [], killers: [], exits: [{ x: 2, y: 2 }], lgr: '', ground: '', sky: '',
      polygons: [{ grass: false, vertices: [{ x: 0, y: 0 }, { x: 10_000, y: 10_000 }, { x: 10_000, y: 9_999 }] }],
    };
    const started = performance.now();
    const world = getPhysicsWorld(level);
    const elapsed = performance.now() - started;
    expect(world.grid.size).toBeLessThan(10_010);
    expect(elapsed).toBeLessThan(50);
  });

  it('does not tunnel through a 0.1 metre wall at 20 m/s', () => {
    const level: ElmaLevel = { name: 'Thin wall', start: { x: 2, y: 0 }, apples: [], killers: [], exits: [{ x: 18, y: 0 }], lgr: '', ground: '', sky: '', polygons: [
      { grass: false, vertices: [{ x: 0, y: -10 }, { x: 20, y: -10 }, { x: 20, y: 10 }, { x: 0, y: 10 }] },
      { grass: false, vertices: [{ x: 5, y: -10 }, { x: 5.1, y: -10 }, { x: 5.1, y: 10 }, { x: 5, y: 10 }] },
    ] };
    const sim = createSim(level);
    sim.bike.v.x = 20; sim.bike.rear.v.x = 20; sim.bike.front.v.x = 20;
    for (let i = 0; i < 0.5 / TUNING.DT; i += 1) stepSim(sim, idle, TUNING.DT);
    expect(sim.bike.front.p.x).toBeLessThan(5.11);
    expect(sim.bike.rear.p.x).toBeLessThan(5.11);
  });

  it('lets a wheel catch on one sharp vertex instead of falling through it', () => {
    const level: ElmaLevel = { name: 'Sharp', start: { x: 4.77, y: -0.23 }, apples: [], killers: [], exits: [{ x: 18, y: 0 }], lgr: '', ground: '', sky: '', polygons: [
      { grass: false, vertices: [{ x: 0, y: -10 }, { x: 20, y: -10 }, { x: 20, y: 10 }, { x: 0, y: 10 }] },
      { grass: false, vertices: [{ x: 5, y: 0 }, { x: 7, y: 5 }, { x: 3, y: 5 }] },
    ] };
    const sim = createSim(level); let caught = false;
    for (let i = 0; i < 1 / TUNING.DT; i += 1) { stepSim(sim, idle, TUNING.DT); caught ||= sim.bike.rear.onGround; }
    expect(caught).toBe(true);
    expect(sim.bike.rear.p.y).toBeLessThan(4.5);
  });

  it('uses a radial normal at an exposed polygon vertex', () => {
    const level: ElmaLevel = { name: 'Corner', start: { x: 1, y: 1 }, apples: [], killers: [], exits: [{ x: 2, y: 1 }], lgr: '', ground: '', sky: '', polygons: [
      { grass: false, vertices: [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 }] },
      { grass: false, vertices: [{ x: 5, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 1 }, { x: 5, y: 1 }] },
    ] };
    const p = { x: 4.75, y: -0.25 };
    const result = collideCircle(p, { x: 0, y: 0 }, 0.4, getPhysicsWorld(level), TUNING_ELMA);
    expect(result.hit).toBe(true);
    expect(result.normal.x).toBeCloseTo(-Math.SQRT1_2, 5);
    expect(result.normal.y).toBeCloseTo(-Math.SQRT1_2, 5);
    expect(Math.hypot(p.x - 5, p.y)).toBeCloseTo(0.4, 5);
  });

  it.each([0.01, 0.02].flatMap((thickness) => [false, true].flatMap((reversed) =>
    [0, 1, 2, 3].flatMap((startVertex) => [5, 20].map((speed) => ({ thickness, reversed, startVertex, speed }))))))(
    'does not cross a $thickness m wall at $speed m/s (reversed=$reversed, start=$startVertex)',
    ({ thickness, reversed, startVertex, speed }) => {
      const base: Array<[number, number]> = [[5, -5], [5 + thickness, -5], [5 + thickness, 5], [5, 5]];
      const wound = reversed ? [...base].reverse() : base;
      const rotated = [...wound.slice(startVertex), ...wound.slice(0, startVertex)];
      const level: ElmaLevel = { name: 'Very thin wall', start: { x: 1, y: 0 }, apples: [], killers: [], exits: [{ x: 9, y: 0 }], lgr: '', ground: '', sky: '', polygons: [
        { grass: false, vertices: [{ x: 0, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: 0, y: 10 }] },
        { grass: false, vertices: rotated.map(([x, y]) => ({ x, y })) },
      ] };
      const p = { x: 4.5, y: 0 };
      const v = { x: speed, y: 0 };
      for (let step = 0; step < 0.2 / TUNING.DT; step += 1) {
        p.x += v.x * TUNING.DT;
        p.y += v.y * TUNING.DT;
        for (let iteration = 0; iteration < 3; iteration += 1) collideCircle(p, v, 0.4, getPhysicsWorld(level), TUNING_ELMA);
      }
      expect(p.x).toBeLessThanOrEqual(4.600001);
    },
  );

  it('warns, rather than failing, when a level appears vertically flipped', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const level = new Level();
    parseLev(level.toBuffer());
    expect(warning).toHaveBeenCalled(); warning.mockRestore();
  });

  it('compares exact vertical edge rays for the axis sanity check', () => {
    const level = parseLev(fixture());
    expect(verticalSolidRayDistances(level)).toEqual({ down: 0.7999999999999998, up: 9.2 });
  });
});
