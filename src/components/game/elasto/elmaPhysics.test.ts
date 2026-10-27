import { describe, expect, it } from 'vitest';
import { bodyPoint, createSim, headPosition, stepSim, TUNING, TUNING_ELMA } from './physics';
import type { BikeState, ElmaLevel, Input, Vec } from './types';

const idle: Input = { gas: false, brake: false, leanBack: false, leanForward: false, turnAround: false };
const rectangle = (left: number, top: number, right: number, bottom: number): Vec[] => [
  { x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom },
];
function elmaLevel(start: Vec, floorY = 8): ElmaLevel {
  return {
    name: 'Elma calibration', start, polygons: [{ grass: false, vertices: rectangle(-500, -100, 500, floorY) }],
    apples: [], killers: [], exits: [{ x: 450, y: floorY - 1 }], lgr: 'default', ground: 'ground', sky: 'sky',
  };
}
function run(sim: ReturnType<typeof createSim>, seconds: number, input: Input): void {
  for (let step = 0; step < seconds / TUNING.DT; step += 1) stepSim(sim, input, TUNING.DT);
}
function inverseBodyOffset(bike: BikeState, point: Vec): Vec {
  const dx = point.x - bike.p.x; const dy = point.y - bike.p.y;
  const c = Math.cos(bike.a); const s = Math.sin(bike.a);
  return { x: dx * c + dy * s, y: -dx * s + dy * c };
}
function travelFromAnchor(bike: BikeState, wheel: 'rear' | 'front'): number {
  const x = (wheel === 'rear' ? TUNING_ELMA.rearAnchorX : TUNING_ELMA.frontAnchorX) * bike.dir;
  return Math.hypot(bike[wheel].p.x - bodyPoint(bike, { x, y: TUNING_ELMA.anchorY }).x,
    bike[wheel].p.y - bodyPoint(bike, { x, y: TUNING_ELMA.anchorY }).y);
}

describe('Elma-calibrated physics profile', () => {
  it('free-falls at 1.8–2.0 m/s² in real time', () => {
    const sim = createSim(elmaLevel({ x: 0, y: -20 }, 80)); const startY = sim.bike.p.y;
    run(sim, 2, idle);
    const acceleration = 2 * (sim.bike.p.y - startY) / 4;
    expect(acceleration).toBeGreaterThanOrEqual(1.8);
    expect(acceleration).toBeLessThanOrEqual(2.0);
    console.info(`[elma-calibration] free_fall=${acceleration.toFixed(3)}m/s²`);
  });

  it('settles at the replay-measured rest geometry', () => {
    const sim = createSim(elmaLevel({ x: 0, y: 7.05 })); run(sim, 2, idle);
    const rear = inverseBodyOffset(sim.bike, sim.bike.rear.p); const front = inverseBodyOffset(sim.bike, sim.bike.front.p);
    expect(rear.x).toBeCloseTo(-0.85, 1); expect(rear.y).toBeCloseTo(0.55, 1);
    expect(front.x).toBeCloseTo(0.85, 1); expect(front.y).toBeCloseTo(0.55, 1);
    const head = inverseBodyOffset(sim.bike, headPosition(sim.bike, TUNING_ELMA));
    expect(head.x).toBeCloseTo(0, 2); expect(head.y).toBeCloseTo(-0.44, 2);
    console.info(`[elma-calibration] rest rear=(${rear.x.toFixed(3)},${rear.y.toFixed(3)}) front=(${front.x.toFixed(3)},${front.y.toFixed(3)}) head=(${head.x.toFixed(3)},${head.y.toFixed(3)})`);
  });

  it('accelerates gently for three seconds without a gas-only flip', () => {
    const sim = createSim(elmaLevel({ x: -40, y: 7.05 }));
    const speeds: number[] = [];
    let maximumPitch = 0;
    for (let step = 0; step < 3 / TUNING.DT; step += 1) {
      stepSim(sim, { ...idle, gas: true }, TUNING.DT);
      maximumPitch = Math.max(maximumPitch, Math.abs(Math.atan2(Math.sin(sim.bike.a), Math.cos(sim.bike.a))));
      if (Math.abs(sim.time - 1) < TUNING.DT / 2 || Math.abs(sim.time - 2) < TUNING.DT / 2 || Math.abs(sim.time - 3) < TUNING.DT / 2) {
        speeds.push(Math.hypot(sim.bike.v.x, sim.bike.v.y) * TUNING_ELMA.timeScale);
      }
    }
    expect(maximumPitch).toBeLessThan(0.5);
    expect(sim.status).toBe('playing');
    expect(speeds[0]).toBeGreaterThanOrEqual(0.3); expect(speeds[0]).toBeLessThanOrEqual(1.2);
    expect(speeds[1]).toBeGreaterThanOrEqual(1.2); expect(speeds[1]).toBeLessThanOrEqual(2.8);
    expect(speeds[2]).toBeGreaterThanOrEqual(2.2); expect(speeds[2]).toBeLessThanOrEqual(4);
    console.info(`[elma-calibration] gas_3s pitch_max=${maximumPitch.toFixed(3)}rad speeds=${speeds.map((speed) => speed.toFixed(3)).join('/')}m/s status=${sim.status}`);
  });

  it('gives strong acceleration immediately when gas is re-applied at speed (no reset after letting go)', () => {
    const realSpeed = (sim: ReturnType<typeof createSim>) => Math.hypot(sim.bike.v.x, sim.bike.v.y) * TUNING_ELMA.timeScale;
    const sim = createSim(elmaLevel({ x: -80, y: 7.05 }));
    let nextVoltAt = 0;
    const ride = (seconds: number, gas: boolean) => {
      for (let step = 0; step < seconds / TUNING.DT; step += 1) {
        const angle = Math.atan2(Math.sin(sim.bike.a), Math.cos(sim.bike.a));
        const canVolt = sim.time >= nextVoltAt;
        const voltBack = canVolt && angle > 0.16;
        const voltForward = canVolt && angle < -0.16;
        if (voltBack || voltForward) nextVoltAt = sim.time + 0.3;
        stepSim(sim, { ...idle, gas, voltBack, voltForward }, TUNING.DT);
      }
    };
    ride(7, true);
    ride(0.5, false);
    const before = realSpeed(sim);
    ride(1, true);
    const gain = realSpeed(sim) - before;
    // From a standstill the first second only reaches 0.3–1.2 m/s; at speed the same second must add clearly more.
    expect(before).toBeGreaterThan(4);
    expect(gain).toBeGreaterThan(0.8);
    expect(sim.status).toBe('playing');
  });

  it('reaches 9.5–10.5 m/s on a long flat-ground run', () => {
    const sim = createSim(elmaLevel({ x: -40, y: 7.05 })); const speeds: number[] = [];
    let nextVoltAt = 0;
    for (let step = 0; step < 20 / TUNING.DT; step += 1) {
      const angle = Math.atan2(Math.sin(sim.bike.a), Math.cos(sim.bike.a));
      const canVolt = sim.time >= nextVoltAt;
      const voltBack = canVolt && angle > 0.16;
      const voltForward = canVolt && angle < -0.16;
      if (voltBack || voltForward) nextVoltAt = sim.time + 0.3;
      stepSim(sim, { ...idle, gas: true, voltBack, voltForward }, TUNING.DT);
      if (sim.time >= 15) speeds.push(Math.hypot(sim.bike.v.x, sim.bike.v.y) * TUNING_ELMA.timeScale);
    }
    speeds.sort((a, b) => a - b);
    const topSpeed = speeds[Math.floor(speeds.length * 0.95)];
    expect(topSpeed).toBeGreaterThanOrEqual(9.5); expect(topSpeed).toBeLessThanOrEqual(10.5);
    console.info(`[elma-calibration] flat_ground_p95=${topSpeed.toFixed(3)}m/s`);
  });

  it('coasts down by 1.0–2.5 m/s² over two seconds', () => {
    const sim = createSim(elmaLevel({ x: 0, y: 7.05 })); run(sim, 2, idle);
    const internalSpeed = 10 / TUNING_ELMA.timeScale;
    sim.bike.v.x = internalSpeed;
    sim.bike.rear.v.x = internalSpeed;
    sim.bike.front.v.x = internalSpeed;
    sim.bike.rear.s = internalSpeed / TUNING_ELMA.wheelRadius;
    sim.bike.front.s = internalSpeed / TUNING_ELMA.wheelRadius;
    run(sim, 2, idle);
    const finalSpeed = Math.abs(sim.bike.v.x) * TUNING_ELMA.timeScale;
    const deceleration = (10 - finalSpeed) / 2;
    expect(deceleration).toBeGreaterThanOrEqual(1);
    expect(deceleration).toBeLessThanOrEqual(2.5);
    console.info(`[elma-calibration] coast_deceleration=${deceleration.toFixed(3)}m/s² final=${finalSpeed.toFixed(3)}m/s`);
  });

  it('uses one volt to lift the front wheel, peak at 4.5–6 rad/s, and land safely', () => {
    const sim = createSim(elmaLevel({ x: 0, y: 7.05 })); run(sim, 1, idle);
    let peak = 0; let lifted = false;
    for (let step = 0; step < 5 / TUNING.DT; step += 1) {
      stepSim(sim, { ...idle, voltBack: step === 0 }, TUNING.DT);
      peak = Math.max(peak, Math.abs(sim.bike.w) * TUNING_ELMA.timeScale);
      lifted ||= sim.bike.rear.onGround && !sim.bike.front.onGround;
    }
    expect(peak).toBeGreaterThanOrEqual(4.5); expect(peak).toBeLessThanOrEqual(6);
    expect(lifted).toBe(true); expect(sim.status).toBe('playing');
    expect(sim.bike.rear.onGround || sim.bike.front.onGround).toBe(true);
    console.info(`[elma-calibration] one_volt_peak=${peak.toFixed(3)}rad/s lifted=${lifted} landed=${sim.status === 'playing'}`);
  });

  it('can hold gas and use a well-timed volt for a wheelie', () => {
    const sim = createSim(elmaLevel({ x: 0, y: 7.05 })); run(sim, 1, idle);
    let lifted = false;
    for (let step = 0; step < 3 / TUNING.DT; step += 1) {
      stepSim(sim, { ...idle, gas: true, voltBack: step === Math.round(0.5 / TUNING.DT) }, TUNING.DT);
      lifted ||= sim.bike.rear.onGround && !sim.bike.front.onGround;
    }
    expect(lifted).toBe(true);
    expect(sim.status).toBe('playing');
    console.info(`[elma-calibration] gas_volt_wheelie=${lifted} status=${sim.status}`);
  });

  it('holding left for two seconds applies only the initial volt', () => {
    const held = createSim(elmaLevel({ x: 0, y: -20 }, 80));
    const single = createSim(elmaLevel({ x: 0, y: -20 }, 80));
    for (let step = 0; step < 2 / TUNING.DT; step += 1) {
      stepSim(held, { ...idle, leanBack: true, voltBack: step === 0 }, TUNING.DT);
      stepSim(single, { ...idle, voltBack: step === 0 }, TUNING.DT);
    }
    expect(held.bike.a).toBe(single.bike.a);
    expect(held.bike.w).toBe(single.bike.w);
    expect(held.lastVoltBack).toBe(0);
    console.info(`[elma-calibration] held_left_volts=1 final_angle=${held.bike.a.toFixed(3)}`);
  });

  it('allows repeated, cooldown-spaced volts to complete a back-flip', () => {
    const sim = createSim(elmaLevel({ x: 0, y: -20 }, 80));
    for (let step = 0; step < 3 / TUNING.DT; step += 1) {
      const voltBack = step % Math.ceil(0.3 / TUNING.DT) === 0;
      stepSim(sim, { ...idle, voltBack }, TUNING.DT);
    }
    expect(Math.abs(sim.bike.a)).toBeGreaterThan(Math.PI * 2);
    console.info(`[elma-calibration] repeated_volt_rotation=${Math.abs(sim.bike.a).toFixed(3)}rad`);
  });

  it('absorbs a three-metre hard landing without crashing or exceeding finite state', () => {
    const sim = createSim(elmaLevel({ x: 0, y: 4.05 })); let maximumTravel = 0;
    for (let step = 0; step < 5 / TUNING.DT; step += 1) {
      stepSim(sim, idle, TUNING.DT);
      maximumTravel = Math.max(maximumTravel, travelFromAnchor(sim.bike, 'rear'), travelFromAnchor(sim.bike, 'front'));
    }
    expect(maximumTravel).toBeGreaterThanOrEqual(0.25);
    expect(sim.status).toBe('playing');
    expect([sim.bike.p.x, sim.bike.p.y, sim.bike.a, sim.bike.v.x, sim.bike.v.y, sim.bike.w]).toSatisfy(
      (values: number[]) => values.every(Number.isFinite),
    );
    console.info(`[elma-calibration] hard_landing_travel=${maximumTravel.toFixed(3)}m status=${sim.status}`);
  });
});
