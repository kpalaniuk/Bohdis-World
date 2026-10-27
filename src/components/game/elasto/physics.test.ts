import { describe, expect, it } from 'vitest';
import { createSim, stepSim, TUNING } from './physics';
import type { Input, Level, SimState } from './types';

const idle: Input = { gas: false, brake: false, leanBack: false, leanForward: false, turnAround: false };
const flatLevel = (startY = 7.2): Level => ({
  name: 'Test Flat',
  start: { x: 20, y: startY },
  polygons: [[{ x: 0, y: -10 }, { x: 200, y: -10 }, { x: 200, y: 8 }, { x: 0, y: 8 }]],
  apples: [], killers: [], flower: { x: 1, y: 7.3 },
});

function run(sim: SimState, seconds: number, input: Input): void {
  for (let i = 0; i < seconds / TUNING.DT; i += 1) stepSim(sim, input, TUNING.DT);
}

describe('rigid-body bike simulation', () => {
  it('moves at least 8m under gas on flat ground without crashing', () => {
    const sim = createSim(flatLevel());
    const start = sim.bike.p.x;
    run(sim, 3, { ...idle, gas: true });
    expect(sim.bike.p.x - start).toBeGreaterThan(8);
    expect(sim.status).toBe('playing');
  });

  it('lifts the front wheel under gas and lean back from a standstill', () => {
    const sim = createSim(flatLevel());
    let lifted = false;
    for (let i = 0; i < 1.5 / TUNING.DT && sim.status === 'playing'; i += 1) {
      stepSim(sim, { ...idle, gas: true, leanBack: true }, TUNING.DT);
      if (sim.bike.rear.onGround && !sim.bike.front.onGround) lifted = true;
    }
    expect(lifted).toBe(true);
  });

  it('leans into a wheelie on the ground and settles after release', () => {
    const sim = createSim(flatLevel());
    run(sim, 1, { ...idle, leanBack: true });
    expect(sim.bike.a).toBeLessThan(-0.25);
    run(sim, 2, idle);
    expect(sim.status).toBe('playing');
    expect(sim.bike.rear.onGround).toBe(true);
    expect(sim.bike.front.onGround).toBe(true);
  });

  it('has a kid-friendly flat-ground top speed', () => {
    const sim = createSim(flatLevel());
    run(sim, 6, { ...idle, gas: true });
    expect(sim.bike.v.x).toBeGreaterThanOrEqual(9);
    expect(sim.bike.v.x).toBeLessThanOrEqual(12);
    expect(sim.status).toBe('playing');
  });

  it('settles upright for five seconds without input', () => {
    const sim = createSim(flatLevel());
    run(sim, 5, idle);
    expect(sim.status).toBe('playing');
    expect(Math.abs(sim.bike.a)).toBeLessThan(0.3);
  });

  it('crashes when dropped upside down above flat ground', () => {
    const sim = createSim(flatLevel(5.8));
    sim.bike.a = Math.PI;
    run(sim, 2, idle);
    expect(['crashing', 'crashed']).toContain(sim.status);
  });

  it('can rotate through a full backflip in the air', () => {
    const sim = createSim(flatLevel(-1));
    const startAngle = sim.bike.a;
    run(sim, 2, { ...idle, leanBack: true });
    expect(Math.abs(sim.bike.a - startAngle)).toBeGreaterThan(Math.PI * 2);
  });

  it('turns around and drives left', () => {
    const sim = createSim(flatLevel());
    stepSim(sim, { ...idle, turnAround: true }, TUNING.DT);
    const start = sim.bike.p.x;
    run(sim, 3, { ...idle, gas: true });
    expect(sim.bike.p.x - start).toBeLessThan(-5);
  });

  it('is bit-identical for the same input script', () => {
    const a = createSim(flatLevel());
    const b = createSim(flatLevel());
    for (let i = 0; i < 600; i += 1) {
      const input = {
        ...idle,
        gas: i < 420,
        brake: i >= 500,
        leanBack: i >= 180 && i < 260,
        leanForward: i >= 360 && i < 410,
        turnAround: i === 300,
      };
      stepSim(a, input, TUNING.DT);
      stepSim(b, input, TUNING.DT);
    }
    expect(a).toEqual(b);
  });
});
