import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Buffer } from 'buffer';
import { Level as LevFile } from 'elmajs';
import { describe, expect, it, vi } from 'vitest';
import { parseLev } from './elma';
import { bodyPoint, createSim, getPhysicsWorld, stepSim, TUNING, tuningForLevel } from './physics';
import type { BikeState, Input, SimState, Vec } from './types';

const levelDirectory = process.env.ELMA_LEVEL_DIR;
const realLevelFiles = levelDirectory
  ? readdirSync(levelDirectory).filter((file) => file.toLowerCase().endsWith('.lev')).sort().map((file) => join(levelDirectory, file))
  : [];
const realDescribe = levelDirectory ? describe : describe.skip;
const idle: Input = { gas: false, brake: false, leanBack: false, leanForward: false, turnAround: false };

function finiteSimulation(sim: SimState): boolean {
  const { bike } = sim;
  return [sim.time, bike.p.x, bike.p.y, bike.a, bike.v.x, bike.v.y, bike.w,
    bike.rear.p.x, bike.rear.p.y, bike.rear.v.x, bike.rear.v.y, bike.rear.s, bike.rear.q,
    bike.front.p.x, bike.front.p.y, bike.front.v.x, bike.front.v.y, bike.front.s, bike.front.q,
  ].every(Number.isFinite);
}

function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function wheelTravel(bike: BikeState, level: ReturnType<typeof parseLev>): number {
  const tuning = tuningForLevel(level);
  const rearAnchor = bodyPoint(bike, { x: tuning.rearAnchorX * bike.dir, y: tuning.anchorY });
  const frontAnchor = bodyPoint(bike, { x: tuning.frontAnchorX * bike.dir, y: tuning.anchorY });
  return Math.max(distance(bike.rear.p, rearAnchor), distance(bike.front.p, frontAnchor));
}

const largestFile = realLevelFiles.reduce<{ path: string; edges: number } | null>((largest, path) => {
  const parsed = LevFile.from(Buffer.from(readFileSync(path)));
  const edges = parsed.polygons.filter((polygon) => !polygon.grass).reduce((sum, polygon) => sum + polygon.vertices.length, 0);
  return !largest || edges > largest.edges ? { path, edges } : largest;
}, null)?.path;

realDescribe('real Elasto Mania level smoke tests', () => {
  if (realLevelFiles.length === 0) {
    it.skip('set ELMA_LEVEL_DIR to run community level smoke tests', () => undefined);
    return;
  }

  let gasOnlySurvivors = 0;
  for (const path of realLevelFiles) {
    it(`loads and rides ${basename(path)}`, () => {
      const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const level = parseLev(readFileSync(path));
      expect(warning, `${basename(path)} triggered the y-axis sanity warning`).not.toHaveBeenCalled();
      warning.mockRestore();

      expect(Number.isFinite(level.start.x) && Number.isFinite(level.start.y)).toBe(true);
      expect(level.exits.length).toBeGreaterThan(0);
      expect(Array.isArray(level.apples)).toBe(true);
      const edges = getPhysicsWorld(level).edges.length;

      const idleSim = createSim(level);
      const initialBodyY = idleSim.bike.p.y;
      let minimumFirstSecondY = initialBodyY;
      for (let step = 0; step < 3 / TUNING.DT; step += 1) {
        stepSim(idleSim, idle, TUNING.DT);
        if (idleSim.time <= 1) minimumFirstSecondY = Math.min(minimumFirstSecondY, idleSim.bike.p.y);
      }
      const firstSecondRise = initialBodyY - minimumFirstSecondY;
      expect(finiteSimulation(idleSim)).toBe(true);
      expect(idleSim.status).toBe('playing');
      expect(firstSecondRise).toBeLessThan(0.15);

      const gasOnlySim = createSim(level);
      for (let step = 0; step < 3 / TUNING.DT; step += 1) {
        stepSim(gasOnlySim, { ...idle, gas: true }, TUNING.DT);
        expect(finiteSimulation(gasOnlySim)).toBe(true);
      }
      const gasOnlySafe = gasOnlySim.status !== 'crashing' && gasOnlySim.status !== 'crashed';
      if (gasOnlySafe) gasOnlySurvivors += 1;

      const rideSim = createSim(level);
      const rideStart = { ...rideSim.bike.p };
      let maximumWheelTravel = 0;
      let nextVoltAt = 0;
      for (let step = 0; step < 10 / TUNING.DT; step += 1) {
        const angle = Math.atan2(Math.sin(rideSim.bike.a), Math.cos(rideSim.bike.a));
        const canVolt = rideSim.time >= nextVoltAt;
        const voltBack = canVolt && angle > 0.16;
        const voltForward = canVolt && angle < -0.16;
        if (voltBack || voltForward) nextVoltAt = rideSim.time + 0.3;
        stepSim(rideSim, { ...idle, gas: true, voltBack, voltForward }, TUNING.DT);
        maximumWheelTravel = Math.max(maximumWheelTravel, wheelTravel(rideSim.bike, level));
        expect(finiteSimulation(rideSim)).toBe(true);
      }
      expect(maximumWheelTravel).toBeLessThanOrEqual(0.3);
      const driven = distance(rideStart, rideSim.bike.p);

      const performanceSim = createSim(level);
      const started = performance.now();
      for (let step = 0; step < 600; step += 1) stepSim(performanceSim, idle, TUNING.DT);
      const elapsed = performance.now() - started;
      if (path === largestFile) expect(elapsed).toBeLessThan(300);

      console.info(`[real-elma] ${basename(path)} | ${level.name} | edges=${edges} | idle=${idleSim.status} | rise_1s=${firstSecondRise.toFixed(3)}m | gas_3s=${gasOnlySafe ? 'safe' : gasOnlySim.status} | driven=${driven.toFixed(2)}m | 600_steps=${elapsed.toFixed(2)}ms`);
    });
  }

  it('keeps gas-only safe for at least five real-level starts', () => {
    expect(gasOnlySurvivors).toBeGreaterThanOrEqual(Math.min(5, realLevelFiles.length));
  });
});
