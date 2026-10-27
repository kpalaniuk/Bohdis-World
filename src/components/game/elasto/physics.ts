import type { BikeState, Input, Level, SimState, Vec, WheelState } from './types';

export const TUNING = {
  DT: 1 / 240,
  gravity: 10,
  bodyMass: 1,
  bodyInertia: 0.4,
  wheelMass: 0.6,
  wheelInertia: 0.048,
  wheelRadius: 0.4,
  headRadius: 0.24,
  bodyRadius: 0.38,
  killerRadius: 0.4,
  pickupRadius: 0.5,
  rearAnchorX: -0.62,
  frontAnchorX: 0.62,
  anchorY: 0.38,
  headX: 0.1,
  headY: -0.85,
  suspensionSpring: 900,
  suspensionDamping: 48,
  suspensionMaxForce: 600,
  maxSuspensionTravel: 0.22,
  suspensionWheelCorrection: 0.65,
  suspensionBodyCorrection: 0.35,
  restitution: 0.04,
  groundFriction: 1.45,
  rollingFriction: 0.015,
  driveTorque: 16,
  groundedDriveReaction: 0.25,
  driveResponse: 1.8,
  maxWheelSpin: 27,
  brakeTorque: 30,
  leanTorque: 5.6,
  groundedLeanMultiplier: 3.2,
  singleWheelLeanMultiplier: 2.6,
  airDriveTorque: 1.25,
  maxAngularVelocity: 9,
  linearDrag: 0.08,
  angularDrag: 0.09,
  wheelSpinDrag: 0.025,
  collisionIterations: 3,
  groundNormalFloor: 0.2,
  invalidCollisionRange: 2,
  crashDelay: 1.5,
} as const;

const ZERO_INPUT: Input = {
  gas: false,
  brake: false,
  leanBack: false,
  leanForward: false,
  turnAround: false,
};

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Vec, n: number): Vec => ({ x: a.x * n, y: a.y * n });
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
const cross = (a: Vec, b: Vec): number => a.x * b.y - a.y * b.x;
const lengthSq = (a: Vec): number => dot(a, a);

function rotate(v: Vec, a: number): Vec {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function angularVelocityAt(r: Vec, w: number): Vec {
  return { x: -w * r.y, y: w * r.x };
}

function closestPoint(p: Vec, a: Vec, b: Vec): Vec {
  const ab = sub(b, a);
  const denom = lengthSq(ab);
  const t = denom === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / denom));
  return add(a, mul(ab, t));
}

function pointInPolygon(point: Vec, polygon: Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (((a.y > point.y) !== (b.y > point.y)) &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function nearestEdge(point: Vec, polygon: Vec[]): { point: Vec; distanceSq: number } {
  let best = { point: polygon[0], distanceSq: Number.POSITIVE_INFINITY };
  for (let i = 0; i < polygon.length; i += 1) {
    const candidate = closestPoint(point, polygon[i], polygon[(i + 1) % polygon.length]);
    const distanceSq = lengthSq(sub(point, candidate));
    if (distanceSq < best.distanceSq) best = { point: candidate, distanceSq };
  }
  return best;
}

function anchorLocal(front: boolean, dir: 1 | -1): Vec {
  return {
    x: (front ? TUNING.frontAnchorX : TUNING.rearAnchorX) * dir,
    y: TUNING.anchorY,
  };
}

export function bodyPoint(bike: BikeState, local: Vec): Vec {
  return add(bike.p, rotate(local, bike.a));
}

export function headPosition(bike: BikeState): Vec {
  return bodyPoint(bike, { x: TUNING.headX * bike.dir, y: TUNING.headY });
}

function makeWheel(p: Vec): WheelState {
  return { p: { ...p }, v: { x: 0, y: 0 }, s: 0, q: 0, onGround: false, normal: { x: 0, y: -1 } };
}

export function createSim(level: Level): SimState {
  const bike: BikeState = {
    p: { ...level.start },
    a: 0,
    v: { x: 0, y: 0 },
    w: 0,
    dir: 1,
    rear: makeWheel(add(level.start, anchorLocal(false, 1))),
    front: makeWheel(add(level.start, anchorLocal(true, 1))),
  };
  return {
    level,
    bike,
    collected: level.apples.map(() => false),
    time: 0,
    status: 'playing',
    crashTime: 0,
    finishTime: null,
    flowerBlocked: false,
    applePickupCount: 0,
  };
}

function applyBodyForce(bike: BikeState, force: Vec, point: Vec, dt: number): void {
  bike.v.x += force.x / TUNING.bodyMass * dt;
  bike.v.y += force.y / TUNING.bodyMass * dt;
  bike.w += cross(sub(point, bike.p), force) / TUNING.bodyInertia * dt;
}

function constrainSuspension(bike: BikeState, wheel: WheelState, front: boolean, dt: number): void {
  const r = rotate(anchorLocal(front, bike.dir), bike.a);
  const anchor = add(bike.p, r);
  const anchorVelocity = add(bike.v, angularVelocityAt(r, bike.w));
  const displacement = sub(anchor, wheel.p);
  const relativeVelocity = sub(anchorVelocity, wheel.v);
  let force = add(mul(displacement, TUNING.suspensionSpring), mul(relativeVelocity, TUNING.suspensionDamping));
  const magnitude = Math.sqrt(lengthSq(force));
  if (magnitude > TUNING.suspensionMaxForce) force = mul(force, TUNING.suspensionMaxForce / magnitude);
  wheel.v.x += force.x / TUNING.wheelMass * dt;
  wheel.v.y += force.y / TUNING.wheelMass * dt;
  applyBodyForce(bike, mul(force, -1), anchor, dt);

  const travel = Math.sqrt(lengthSq(displacement));
  if (travel > TUNING.maxSuspensionTravel) {
    const n = mul(displacement, 1 / travel);
    const correction = travel - TUNING.maxSuspensionTravel;
    wheel.p.x += n.x * correction * TUNING.suspensionWheelCorrection;
    wheel.p.y += n.y * correction * TUNING.suspensionWheelCorrection;
    bike.p.x -= n.x * correction * TUNING.suspensionBodyCorrection;
    bike.p.y -= n.y * correction * TUNING.suspensionBodyCorrection;
  }
}

function collideCircle(
  p: Vec,
  v: Vec,
  radius: number,
  polygons: Vec[][],
): { hit: boolean; normal: Vec; impulse: number } {
  let hit = false;
  let normal = { x: 0, y: -1 };
  let totalImpulse = 0;
  for (let polygonIndex = 0; polygonIndex < polygons.length; polygonIndex += 1) {
    const polygon = polygons[polygonIndex];
    const nearest = nearestEdge(p, polygon);
    const distance = Math.sqrt(nearest.distanceSq);
    const validSide = polygonIndex === 0 ? pointInPolygon(p, polygon) : !pointInPolygon(p, polygon);
    if (validSide && distance >= radius) continue;
    if (!validSide && distance > radius * TUNING.invalidCollisionRange) continue;

    let n: Vec;
    if (distance > 1e-9) {
      n = mul(sub(p, nearest.point), 1 / distance);
    } else {
      const edge = sub(polygon[1], polygon[0]);
      n = { x: -edge.y, y: edge.x };
      const nl = Math.sqrt(lengthSq(n)) || 1;
      n = mul(n, 1 / nl);
    }
    if (!validSide) n = mul(n, -1);
    const penetration = validSide ? radius - distance : radius + Math.min(distance, radius);
    p.x += n.x * penetration;
    p.y += n.y * penetration;
    const inward = dot(v, n);
    if (inward < 0) {
      const impulse = -(1 + TUNING.restitution) * inward;
      v.x += n.x * impulse;
      v.y += n.y * impulse;
      totalImpulse += impulse;
    }
    hit = true;
    normal = n;
  }
  return { hit, normal, impulse: totalImpulse };
}

function wheelCollision(wheel: WheelState, dt: number, polygons: Vec[][]): void {
  const result = collideCircle(wheel.p, wheel.v, TUNING.wheelRadius, polygons);
  if (!result.hit) return;
  wheel.onGround = true;
  wheel.normal = result.normal;
  const tangent = { x: -result.normal.y, y: result.normal.x };
  const tangentialVelocity = dot(wheel.v, tangent);
  const slip = tangentialVelocity - wheel.s * TUNING.wheelRadius;
  const normalForce = TUNING.wheelMass * TUNING.gravity * Math.max(TUNING.groundNormalFloor, -result.normal.y) + result.impulse / Math.max(dt, 1e-6);
  const desiredImpulse = -slip / (1 / TUNING.wheelMass + TUNING.wheelRadius ** 2 / TUNING.wheelInertia);
  const limit = TUNING.groundFriction * normalForce * dt;
  const impulse = Math.max(-limit, Math.min(limit, desiredImpulse));
  wheel.v.x += tangent.x * impulse / TUNING.wheelMass;
  wheel.v.y += tangent.y * impulse / TUNING.wheelMass;
  wheel.s -= impulse * TUNING.wheelRadius / TUNING.wheelInertia;
  wheel.s *= Math.max(0, 1 - TUNING.rollingFriction * dt);

}

function beginCrash(sim: SimState): void {
  if (sim.status === 'playing') {
    sim.status = 'crashing';
    sim.crashTime = 0;
  }
}

function overlaps(a: Vec, ar: number, b: Vec, br: number): boolean {
  return lengthSq(sub(a, b)) <= (ar + br) ** 2;
}

function checkHeadCollision(sim: SimState): void {
  const head = headPosition(sim.bike);
  for (let i = 0; i < sim.level.polygons.length; i += 1) {
    const polygon = sim.level.polygons[i];
    const nearest = nearestEdge(head, polygon);
    const validSide = i === 0 ? pointInPolygon(head, polygon) : !pointInPolygon(head, polygon);
    if (!validSide || nearest.distanceSq <= TUNING.headRadius ** 2) {
      beginCrash(sim);
      return;
    }
  }
}

function handleObjects(sim: SimState): void {
  const { bike, level } = sim;
  for (let i = 0; i < level.apples.length; i += 1) {
    if (sim.collected[i]) continue;
    const apple = level.apples[i];
    if ([bike.p, bike.rear.p, bike.front.p].some((p) => lengthSq(sub(p, apple)) <= TUNING.pickupRadius ** 2)) {
      sim.collected[i] = true;
      sim.applePickupCount += 1;
    }
  }

  const head = headPosition(bike);
  for (const killer of level.killers) {
    if (overlaps(bike.rear.p, TUNING.wheelRadius, killer, TUNING.killerRadius) ||
      overlaps(bike.front.p, TUNING.wheelRadius, killer, TUNING.killerRadius) ||
      overlaps(head, TUNING.headRadius, killer, TUNING.killerRadius) ||
      overlaps(bike.p, TUNING.bodyRadius, killer, TUNING.killerRadius)) {
      beginCrash(sim);
      break;
    }
  }

  const touchesFlower = [bike.p, bike.rear.p, bike.front.p]
    .some((p) => lengthSq(sub(p, level.flower)) <= TUNING.pickupRadius ** 2);
  if (touchesFlower) {
    if (sim.collected.every(Boolean)) {
      sim.status = 'finished';
      sim.finishTime = sim.time;
    } else {
      sim.flowerBlocked = true;
    }
  } else {
    sim.flowerBlocked = false;
  }
}

function finiteSim(sim: SimState): boolean {
  const b = sim.bike;
  return [b.p.x, b.p.y, b.a, b.v.x, b.v.y, b.w,
    b.rear.p.x, b.rear.p.y, b.rear.v.x, b.rear.v.y, b.rear.s, b.rear.q,
    b.front.p.x, b.front.p.y, b.front.v.x, b.front.v.y, b.front.s, b.front.q,
    sim.time].every(Number.isFinite);
}

export function stepSim(sim: SimState, suppliedInput: Input = ZERO_INPUT, dt: number): void {
  if (sim.status === 'crashed' || sim.status === 'finished' || dt <= 0) return;
  const input = sim.status === 'playing' ? suppliedInput : ZERO_INPUT;
  const bike = sim.bike;

  if (!finiteSim(sim)) {
    const finite = (value: number) => Number.isFinite(value) ? value : 0;
    bike.p = { x: finite(bike.p.x), y: finite(bike.p.y) };
    bike.v = { x: finite(bike.v.x), y: finite(bike.v.y) };
    bike.a = finite(bike.a);
    bike.w = finite(bike.w);
    for (const wheel of [bike.rear, bike.front]) {
      wheel.p = { x: finite(wheel.p.x), y: finite(wheel.p.y) };
      wheel.v = { x: finite(wheel.v.x), y: finite(wheel.v.y) };
      wheel.s = finite(wheel.s);
      wheel.q = finite(wheel.q);
    }
    sim.time = finite(sim.time);
    beginCrash(sim);
  }

  if (input.turnAround) {
    bike.dir = bike.dir === 1 ? -1 : 1;
    const oldRear = bike.rear;
    bike.rear = bike.front;
    bike.front = oldRear;
  }

  const rearWasGrounded = bike.rear.onGround;
  const frontWasGrounded = bike.front.onGround;
  const wasGrounded = rearWasGrounded || frontWasGrounded;
  bike.rear.onGround = false;
  bike.front.onGround = false;
  bike.v.y += TUNING.gravity * dt;
  bike.rear.v.y += TUNING.gravity * dt;
  bike.front.v.y += TUNING.gravity * dt;

  constrainSuspension(bike, bike.rear, false, dt);
  constrainSuspension(bike, bike.front, true, dt);

  const driveDirection = bike.dir;
  if (input.gas) {
    const spinError = driveDirection * TUNING.maxWheelSpin - bike.rear.s;
    const torque = Math.max(-TUNING.driveTorque, Math.min(TUNING.driveTorque, spinError * TUNING.driveResponse));
    bike.rear.s += torque / TUNING.wheelInertia * dt;
    const reactionTorque = rearWasGrounded && frontWasGrounded
      ? torque * TUNING.groundedDriveReaction
      : driveDirection * TUNING.airDriveTorque;
    bike.w -= reactionTorque / TUNING.bodyInertia * dt;
  }
  if (input.brake) {
    for (const wheel of [bike.rear, bike.front]) {
      const change = TUNING.brakeTorque / TUNING.wheelInertia * dt;
      wheel.s = Math.abs(wheel.s) <= change ? 0 : wheel.s - Math.sign(wheel.s) * change;
    }
  }
  const lean = (input.leanForward ? 1 : 0) - (input.leanBack ? 1 : 0);
  const leanMultiplier = rearWasGrounded && frontWasGrounded
    ? TUNING.groundedLeanMultiplier
    : wasGrounded ? TUNING.singleWheelLeanMultiplier : 1;
  bike.w += lean * TUNING.leanTorque * leanMultiplier / TUNING.bodyInertia * dt;

  const bodyDrag = Math.max(0, 1 - TUNING.linearDrag * dt);
  bike.v.x *= bodyDrag;
  bike.v.y *= bodyDrag;
  bike.w *= Math.max(0, 1 - TUNING.angularDrag * dt);
  bike.w = Math.max(-TUNING.maxAngularVelocity, Math.min(TUNING.maxAngularVelocity, bike.w));
  for (const wheel of [bike.rear, bike.front]) {
    wheel.v.x *= bodyDrag;
    wheel.v.y *= bodyDrag;
    wheel.s *= Math.max(0, 1 - TUNING.wheelSpinDrag * dt);
  }

  bike.p.x += bike.v.x * dt;
  bike.p.y += bike.v.y * dt;
  bike.a += bike.w * dt;
  for (const wheel of [bike.rear, bike.front]) {
    wheel.p.x += wheel.v.x * dt;
    wheel.p.y += wheel.v.y * dt;
    wheel.q += wheel.s * dt;
  }

  for (let iteration = 0; iteration < TUNING.collisionIterations; iteration += 1) {
    wheelCollision(bike.rear, dt, sim.level.polygons);
    wheelCollision(bike.front, dt, sim.level.polygons);
    constrainSuspension(bike, bike.rear, false, dt);
    constrainSuspension(bike, bike.front, true, dt);
  }

  if (sim.status === 'playing') {
    checkHeadCollision(sim);
    handleObjects(sim);
  }
  sim.time += dt;
  if (sim.status === 'crashing') {
    sim.crashTime += dt;
    if (sim.crashTime >= TUNING.crashDelay) sim.status = 'crashed';
  }
  if (!finiteSim(sim)) beginCrash(sim);
}
