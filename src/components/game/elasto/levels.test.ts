import { describe, expect, it } from 'vitest';
import { LEVELS } from './levels';
import { createSim, stepSim, TUNING } from './physics';
import { SOLUTIONS, type ReplaySegment } from './solutions';
import type { Input, Vec } from './types';

const idle: Input = { gas: false, brake: false, leanBack: false, leanForward: false, turnAround: false };

function inside(point: Vec, polygon: Vec[]): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}

const PERTURBATIONS = [
  (index: number) => index % 2 === 0 ? 0.06 : -0.06,
  (index: number) => index % 2 === 0 ? -0.06 : 0.06,
  () => 0.06,
  () => -0.06,
  (_index: number, segment: ReplaySegment) => (
    segment.leanBack || segment.leanForward || segment.brake || segment.turnAround ? 0.1 : 0
  ),
] as const;

function playReplay(
  levelIndex: number,
  segments: ReplaySegment[],
  perturb: (index: number, segment: ReplaySegment) => number = () => 0,
) {
  const sim = createSim(LEVELS[levelIndex]);
  for (let segmentIndex = 0; segmentIndex < segments.length && sim.status === 'playing'; segmentIndex += 1) {
    const segment = segments[segmentIndex];
    const duration = Math.max(0.15, segment.t + perturb(segmentIndex, segment));
    const steps = Math.round(duration / TUNING.DT);
    for (let step = 0; step < steps && sim.status === 'playing'; step += 1) {
      stepSim(sim, {
        gas: segment.gas ?? false,
        brake: segment.brake ?? false,
        leanBack: segment.leanBack ?? false,
        leanForward: segment.leanForward ?? false,
        turnAround: Boolean(segment.turnAround && step === 0),
      }, TUNING.DT);
    }
  }
  return sim;
}

function runNaivePolicy(levelIndex: number, correctAngle: boolean) {
  const sim = createSim(LEVELS[levelIndex]);
  for (let i = 0; i < 60 / TUNING.DT && sim.status === 'playing'; i += 1) {
    const angle = Math.atan2(Math.sin(sim.bike.a), Math.cos(sim.bike.a));
    stepSim(sim, {
      ...idle,
      gas: true,
      leanBack: correctAngle && angle > 0.16,
      leanForward: correctAngle && angle < -0.16,
    }, TUNING.DT);
  }
  return sim;
}

describe('Elasto Bike levels', () => {
  it('has ten valid authored levels', () => {
    expect(LEVELS).toHaveLength(10);
    for (const level of LEVELS) {
      const objects = [level.start, ...level.apples, ...level.killers, level.flower];
      for (const object of objects) {
        expect(inside(object, level.polygons[0]), `${level.name}: object outside room`).toBe(true);
        for (const island of level.polygons.slice(1)) {
          expect(inside(object, island), `${level.name}: object inside island`).toBe(false);
        }
      }
    }
  });

  it('has no vertical ground step taller than 0.3m', () => {
    for (const level of LEVELS) {
      const roomPolygon = level.polygons[0];
      const groundEdges = roomPolygon.slice(2);
      for (let i = 0; i < groundEdges.length - 1; i += 1) {
        const a = groundEdges[i];
        const b = groundEdges[i + 1];
        if (Math.abs(a.x - b.x) < 1e-9) {
          expect(Math.abs(a.y - b.y), level.name).toBeLessThanOrEqual(0.3);
        }
      }
    }
  });

  it.each(LEVELS.map((level, index) => [index + 1, level] as const))(
    'level %i settles without crashing',
    (_number, level) => {
      const sim = createSim(level);
      for (let i = 0; i < 3 / TUNING.DT; i += 1) stepSim(sim, idle, TUNING.DT);
      expect(sim.status).toBe('playing');
    },
  );

  it.each(LEVELS.slice(0, 5).map((level, index) => [index + 1, level] as const))(
    'scripted bot finishes level %i',
    (_number, level) => {
      const sim = createSim(level);
      for (let i = 0; i < 60 / TUNING.DT && sim.status === 'playing'; i += 1) {
        const normalizedAngle = Math.atan2(Math.sin(sim.bike.a), Math.cos(sim.bike.a));
        stepSim(sim, {
          ...idle,
          gas: true,
          leanBack: normalizedAngle > 0.16,
          leanForward: normalizedAngle < -0.16,
        }, TUNING.DT);
      }
      expect(sim.status).toBe('finished');
    },
  );

  it.each(LEVELS.slice(3).map((level, offset) => [offset + 4, level] as const))(
    'gas-only does not finish level %i',
    (number, level) => {
      const sim = runNaivePolicy(number - 1, false);
      expect(sim.status === 'finished' && sim.collected.every(Boolean), level.name).toBe(false);
    },
  );

  it.each(LEVELS.slice(5).map((level, offset) => [offset + 6, level] as const))(
    'angle-correcting bot does not finish level %i',
    (number, level) => {
      const sim = runNaivePolicy(number - 1, true);
      expect(sim.status === 'finished' && sim.collected.every(Boolean), level.name).toBe(false);
    },
  );

  it.each(LEVELS.map((level, index) => [index + 1, level] as const))(
    'replay finishes level %i with every apple',
    (number, level) => {
      const replay = SOLUTIONS[number - 1];
      expect(replay.length, level.name).toBeLessThanOrEqual(16);
      for (const segment of replay) expect(segment.t, level.name).toBeGreaterThanOrEqual(0.15);
      if (number >= 4) {
        expect(replay.length, level.name).toBeGreaterThanOrEqual(3);
        expect(replay.some((segment) => (
          segment.brake || segment.leanBack || segment.leanForward || segment.turnAround
        )), level.name).toBe(true);
      }
      const sim = playReplay(number - 1, replay);
      expect(sim.status, level.name).toBe('finished');
      expect(sim.collected.every(Boolean), level.name).toBe(true);
    },
  );

  it.each(LEVELS.map((level, index) => [index + 1, level] as const))(
    'replay for level %i tolerates human timing variation',
    (number, level) => {
      const successes = PERTURBATIONS.filter((pattern) => {
        const sim = playReplay(number - 1, SOLUTIONS[number - 1], pattern);
        return sim.status === 'finished' && sim.collected.every(Boolean);
      }).length;
      expect(successes, level.name).toBeGreaterThanOrEqual(3);
    },
  );
});
