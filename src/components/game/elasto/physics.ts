import { HEAD_RADIUS, OBJECT_RADIUS } from './elma';
import type { BikeState, ElmaApple, Input, PlayableLevel, SimState, Vec, WheelState } from './types';
import { isElmaLevel } from './types';

export const TUNING = {
  DT: 1 / 240, gravity: 10, bodyMass: 1, bodyInertia: 0.4, wheelMass: 0.6, wheelInertia: 0.048,
  wheelRadius: 0.4, headRadius: 0.24, bodyRadius: 0.38, killerRadius: OBJECT_RADIUS, pickupRadius: 0.5,
  rearAnchorX: -0.62, frontAnchorX: 0.62, anchorY: 0.38, headX: 0.1, headY: -0.85,
  suspensionSpring: 900, suspensionDamping: 48, suspensionMaxForce: 600, maxSuspensionTravel: 0.22,
  suspensionWheelCorrection: 0.65, suspensionBodyCorrection: 0.35, restitution: 0.04, groundFriction: 1.45,
  rollingFriction: 0.015, driveTorque: 16, groundedDriveReaction: 0.25, driveResponse: 1.8,
  driveRampTime: 0,
  maxWheelSpin: 27, brakeTorque: 30, idleBrakeTorque: 0, leanTorque: 5.6, groundedLeanMultiplier: 3.2,
  singleWheelLeanMultiplier: 2.6, airDriveTorque: 1.25, maxAngularVelocity: 9, linearDrag: 0.08,
  angularDrag: 0.09, wheelSpinDrag: 0.025, collisionIterations: 3, groundNormalFloor: 0.2,
  crashDelay: 1.5, gridCellSize: 2, maxSubstepTravel: 0.08,
  timeScale: 1, voltAngularImpulse: 0, voltCooldown: 0.25,
  maxRealLinearSpeed: Number.POSITIVE_INFINITY,
} as const;

/** Loaded .lev levels use Elma's internal clock and replay-measured bike geometry. */
export const TUNING_ELMA = {
  ...TUNING,
  rearAnchorX: -0.85,
  frontAnchorX: 0.85,
  anchorY: 0.55,
  headX: 0,
  headY: -0.44,
  headRadius: HEAD_RADIUS,
  bodyMass: 2,
  suspensionSpring: 90,
  suspensionDamping: 2,
  suspensionMaxForce: 60,
  maxSuspensionTravel: 0.3,
  suspensionWheelCorrection: 0.65,
  suspensionBodyCorrection: 0.35,
  driveTorque: 60,
  driveResponse: 0.5,
  driveRampTime: 8,
  maxWheelSpin: 120,
  brakeTorque: 60,
  idleBrakeTorque: 0,
  rollingFriction: 3,
  angularDrag: 5,
  groundedDriveReaction: 0,
  airDriveTorque: 0.3,
  maxAngularVelocity: 13.5,
  timeScale: 0.4375,
  voltAngularImpulse: 20,
  voltCooldown: 0.25,
  maxRealLinearSpeed: 10.2,
} as const;

export type TuningProfile = { [Key in keyof typeof TUNING]: number };
export function tuningForLevel(level: PlayableLevel): TuningProfile {
  return isElmaLevel(level) ? TUNING_ELMA : TUNING;
}

export interface WorldEdge { a: Vec; b: Vec; airNormal: Vec; index: number }
export interface PhysicsWorld {
  solidPolygons: Vec[][]; grassPolygons: Vec[][]; edges: WorldEdge[]; grid: Map<string, number[]>;
  apples: ElmaApple[]; killers: Vec[]; exits: Vec[];
}
const worlds = new WeakMap<PlayableLevel, PhysicsWorld>();
const ZERO_INPUT: Input = { gas: false, brake: false, leanBack: false, leanForward: false, turnAround: false, voltBack: false, voltForward: false };
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Vec, n: number): Vec => ({ x: a.x * n, y: a.y * n });
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
const cross = (a: Vec, b: Vec): number => a.x * b.y - a.y * b.x;
const lengthSq = (a: Vec): number => dot(a, a);
const gridKey = (x: number, y: number) => `${x},${y}`;
function edgeGridCells(a: Vec, b: Vec, cellSize: number): Array<[number, number]> {
  let x = Math.floor(a.x / cellSize);
  let y = Math.floor(a.y / cellSize);
  const endX = Math.floor(b.x / cellSize);
  const endY = Math.floor(b.y / cellSize);
  const cells: Array<[number, number]> = [[x, y]];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const deltaX = stepX === 0 ? Number.POSITIVE_INFINITY : cellSize / Math.abs(dx);
  const deltaY = stepY === 0 ? Number.POSITIVE_INFINITY : cellSize / Math.abs(dy);
  let nextX = stepX === 0 ? Number.POSITIVE_INFINITY : (((stepX > 0 ? x + 1 : x) * cellSize) - a.x) / dx;
  let nextY = stepY === 0 ? Number.POSITIVE_INFINITY : (((stepY > 0 ? y + 1 : y) * cellSize) - a.y) / dy;

  while (x !== endX || y !== endY) {
    const crossingX = x === endX ? Number.POSITIVE_INFINITY : nextX;
    const crossingY = y === endY ? Number.POSITIVE_INFINITY : nextY;
    if (crossingX < crossingY) {
      x += stepX;
      nextX += deltaX;
    } else if (crossingY < crossingX) {
      y += stepY;
      nextY += deltaY;
    } else {
      x += stepX;
      y += stepY;
      nextX += deltaX;
      nextY += deltaY;
    }
    cells.push([x, y]);
  }
  return cells;
}
function rotate(v: Vec, a: number): Vec { const c = Math.cos(a); const s = Math.sin(a); return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }; }
function pointInPolygon(point: Vec, polygon: Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]; const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function isAir(world: Pick<PhysicsWorld, 'solidPolygons'>, point: Vec): boolean {
  let count = 0;
  for (const polygon of world.solidPolygons) if (pointInPolygon(point, polygon)) count += 1;
  return count % 2 === 1;
}
function makeWorld(level: PlayableLevel): PhysicsWorld {
  const solidPolygons = isElmaLevel(level) ? level.polygons.filter((p) => !p.grass).map((p) => p.vertices) : level.polygons;
  const grassPolygons = isElmaLevel(level) ? level.polygons.filter((p) => p.grass).map((p) => p.vertices) : [];
  const partial = { solidPolygons }; const edges: WorldEdge[] = [];
  for (const polygon of solidPolygons) for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]; const b = polygon[(i + 1) % polygon.length]; const dx = b.x - a.x; const dy = b.y - a.y;
    const length = Math.hypot(dx, dy); if (length < 1e-9) continue;
    const n = { x: -dy / length, y: dx / length }; const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const plusIsAir = isAir(partial, add(midpoint, mul(n, 1e-4)));
    const minusIsAir = isAir(partial, add(midpoint, mul(n, -1e-4)));
    // Coincident envelope/island edges have ground on both sides and are not
    // playable boundaries. Omitting them also avoids long visual seams.
    if (plusIsAir === minusIsAir) continue;
    const airNormal = plusIsAir ? n : mul(n, -1);
    edges.push({ a, b, airNormal, index: edges.length });
  }
  const grid = new Map<string, number[]>();
  for (const edge of edges) {
    for (const [x, y] of edgeGridCells(edge.a, edge.b, TUNING.gridCellSize)) {
      const key = gridKey(x, y); const bucket = grid.get(key) ?? []; bucket.push(edge.index); grid.set(key, bucket);
    }
  }
  return { solidPolygons, grassPolygons, edges, grid,
    apples: isElmaLevel(level) ? level.apples : level.apples.map((p) => ({ p, gravity: 'none', animation: 1 })),
    killers: level.killers, exits: isElmaLevel(level) ? level.exits : [level.flower] };
}
export function getPhysicsWorld(level: PlayableLevel): PhysicsWorld {
  let world = worlds.get(level); if (!world) { world = makeWorld(level); worlds.set(level, world); } return world;
}
export function queryWorldEdges(world: PhysicsWorld, minX: number, minY: number, maxX: number, maxY: number): WorldEdge[] {
  const ids = new Set<number>();
  for (let x = Math.floor(minX / TUNING.gridCellSize); x <= Math.floor(maxX / TUNING.gridCellSize); x += 1)
    for (let y = Math.floor(minY / TUNING.gridCellSize); y <= Math.floor(maxY / TUNING.gridCellSize); y += 1)
      for (const id of world.grid.get(gridKey(x, y)) ?? []) ids.add(id);
  return [...ids].map((id) => world.edges[id]);
}
function closestPoint(p: Vec, a: Vec, b: Vec): Vec {
  const ab = sub(b, a); const denominator = lengthSq(ab);
  const t = denominator === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / denominator)); return add(a, mul(ab, t));
}
function anchorLocal(front: boolean, dir: 1 | -1, tuning: TuningProfile): Vec { return { x: (front ? tuning.frontAnchorX : tuning.rearAnchorX) * dir, y: tuning.anchorY }; }
export function bodyPoint(bike: BikeState, local: Vec): Vec { return add(bike.p, rotate(local, bike.a)); }
export function headPosition(bike: BikeState, tuning: TuningProfile = TUNING): Vec { return bodyPoint(bike, { x: tuning.headX * bike.dir, y: tuning.headY }); }
function makeWheel(p: Vec): WheelState { return { p: { ...p }, v: { x: 0, y: 0 }, s: 0, q: 0, onGround: false, normal: { x: 0, y: -1 } }; }
function hasClearance(world: PhysicsWorld, p: Vec, radius: number): boolean {
  return isAir(world, p) && queryWorldEdges(world, p.x - radius, p.y - radius, p.x + radius, p.y + radius)
    .every((edge) => lengthSq(sub(p, closestPoint(p, edge.a, edge.b))) >= radius ** 2);
}
export function createSim(level: PlayableLevel): SimState {
  const world = getPhysicsWorld(level); const tuning = tuningForLevel(level);
  const spawn = isElmaLevel(level)
    ? { x: level.start.x - tuning.rearAnchorX, y: level.start.y - tuning.anchorY }
    : { ...level.start };
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const head = add(spawn, { x: tuning.headX, y: tuning.headY });
    // Elma start objects are commonly close enough to the floor that the suspension wheels begin compressed.
    // Preserve that intended pose; only lift the rigid frame when the body or head itself intersects terrain.
    if (hasClearance(world, spawn, tuning.bodyRadius) && hasClearance(world, head, tuning.headRadius)) break;
    spawn.y -= 0.1;
  }
  const bike: BikeState = { p: spawn, a: 0, v: { x: 0, y: 0 }, w: 0, dir: 1,
    rear: makeWheel(add(spawn, anchorLocal(false, 1, tuning))), front: makeWheel(add(spawn, anchorLocal(true, 1, tuning))) };
  return { level, bike, collected: world.apples.map(() => false), time: 0, status: 'playing', crashTime: 0,
    finishTime: null, flowerBlocked: false, applePickupCount: 0, gravity: { x: 0, y: tuning.gravity },
    lastVoltBack: Number.NEGATIVE_INFINITY, lastVoltForward: Number.NEGATIVE_INFINITY, gasTime: 0 };
}
function angularVelocityAt(r: Vec, w: number): Vec { return { x: -w * r.y, y: w * r.x }; }
function applyBodyForce(bike: BikeState, force: Vec, point: Vec, dt: number, tuning: TuningProfile): void {
  bike.v.x += force.x / tuning.bodyMass * dt; bike.v.y += force.y / tuning.bodyMass * dt;
  bike.w += cross(sub(point, bike.p), force) / tuning.bodyInertia * dt;
}
function constrainSuspension(bike: BikeState, wheel: WheelState, front: boolean, dt: number, tuning: TuningProfile): void {
  const r = rotate(anchorLocal(front, bike.dir, tuning), bike.a); const anchor = add(bike.p, r); const displacement = sub(anchor, wheel.p);
  const relativeVelocity = sub(add(bike.v, angularVelocityAt(r, bike.w)), wheel.v);
  let force = add(mul(displacement, tuning.suspensionSpring), mul(relativeVelocity, tuning.suspensionDamping)); const magnitude = Math.sqrt(lengthSq(force));
  if (magnitude > tuning.suspensionMaxForce) force = mul(force, tuning.suspensionMaxForce / magnitude);
  wheel.v.x += force.x / tuning.wheelMass * dt; wheel.v.y += force.y / tuning.wheelMass * dt; applyBodyForce(bike, mul(force, -1), anchor, dt, tuning);
  const travel = Math.sqrt(lengthSq(displacement)); if (travel <= tuning.maxSuspensionTravel) return;
  const n = mul(displacement, 1 / travel); const correction = travel - tuning.maxSuspensionTravel;
  wheel.p.x += n.x * correction * tuning.suspensionWheelCorrection; wheel.p.y += n.y * correction * tuning.suspensionWheelCorrection;
  bike.p.x -= n.x * correction * tuning.suspensionBodyCorrection; bike.p.y -= n.y * correction * tuning.suspensionBodyCorrection;
}
function projectSuspensionTravel(bike: BikeState, wheel: WheelState, front: boolean, tuning: TuningProfile): void {
  const anchor = bodyPoint(bike, anchorLocal(front, bike.dir, tuning));
  const displacement = sub(anchor, wheel.p);
  const travel = Math.sqrt(lengthSq(displacement));
  const maximumTravel = tuning.maxSuspensionTravel - 1e-9;
  if (travel <= maximumTravel) return;
  const n = mul(displacement, 1 / travel);
  const correction = travel - maximumTravel;
  wheel.p.x += n.x * correction * tuning.suspensionWheelCorrection;
  wheel.p.y += n.y * correction * tuning.suspensionWheelCorrection;
  bike.p.x -= n.x * correction * tuning.suspensionBodyCorrection;
  bike.p.y -= n.y * correction * tuning.suspensionBodyCorrection;
}
export function collideCircle(p: Vec, v: Vec, radius: number, world: PhysicsWorld, tuning: TuningProfile): { hit: boolean; normal: Vec; impulse: number } {
  type Contact = { normal: Vec; penetration: number; inward: number };
  const contacts: Contact[] = [];
  for (const edge of queryWorldEdges(world, p.x - radius, p.y - radius, p.x + radius, p.y + radius)) {
    const ab = sub(edge.b, edge.a);
    const denominator = lengthSq(ab);
    if (denominator < 1e-12) continue;
    const rawT = dot(sub(p, edge.a), ab) / denominator;
    const t = Math.max(0, Math.min(1, rawT));
    const nearest = add(edge.a, mul(ab, t));
    const delta = sub(p, nearest);
    const distance = Math.sqrt(lengthSq(delta));
    if (distance >= radius) continue;

    if (rawT <= 0 || rawT >= 1) {
      if (distance < 1e-9) continue;
      const vertexNormal = mul(delta, 1 / distance);
      const inward = dot(v, vertexNormal);
      if (!isAir(world, p) && inward >= 0) continue;
      contacts.push({ normal: vertexNormal, penetration: radius - distance, inward });
      continue;
    }

    const signedDistance = dot(delta, edge.airNormal);
    const inward = dot(v, edge.airNormal);
    // A centre that crossed a thin face while moving inward still belongs to
    // that near face. Its far face points with the velocity and is ignored.
    if (signedDistance < 0 && inward >= 0) continue;
    const penetration = radius - signedDistance;
    if (penetration <= 0 || penetration > radius * 2.1) continue;
    contacts.push({ normal: edge.airNormal, penetration, inward });
  }
  if (!contacts.length) return { hit: false, normal: { x: 0, y: -1 }, impulse: 0 };
  contacts.sort((a, b) => b.penetration - a.penetration);
  const contact = contacts[0];
  p.x += contact.normal.x * contact.penetration;
  p.y += contact.normal.y * contact.penetration;
  let impulse = 0;
  if (contact.inward < 0) {
    impulse = -(1 + tuning.restitution) * contact.inward;
    v.x += contact.normal.x * impulse;
    v.y += contact.normal.y * impulse;
  }
  return { hit: true, normal: contact.normal, impulse };
}
function wheelCollision(wheel: WheelState, dt: number, world: PhysicsWorld, gravity: Vec, tuning: TuningProfile): void {
  const result = collideCircle(wheel.p, wheel.v, tuning.wheelRadius, world, tuning); if (!result.hit) return;
  wheel.onGround = true; wheel.normal = result.normal; const tangent = { x: -result.normal.y, y: result.normal.x };
  const slip = dot(wheel.v, tangent) - wheel.s * tuning.wheelRadius;
  const gravityNormal = Math.max(tuning.groundNormalFloor, -dot(result.normal, mul(gravity, 1 / tuning.gravity)));
  const normalForce = tuning.wheelMass * tuning.gravity * gravityNormal + result.impulse / Math.max(dt, 1e-6);
  const desiredImpulse = -slip / (1 / tuning.wheelMass + tuning.wheelRadius ** 2 / tuning.wheelInertia);
  const limit = tuning.groundFriction * normalForce * dt; const impulse = Math.max(-limit, Math.min(limit, desiredImpulse));
  wheel.v.x += tangent.x * impulse / tuning.wheelMass; wheel.v.y += tangent.y * impulse / tuning.wheelMass;
  wheel.s -= impulse * tuning.wheelRadius / tuning.wheelInertia; wheel.s *= Math.max(0, 1 - tuning.rollingFriction * dt);
}
function beginCrash(sim: SimState): void { if (sim.status === 'playing') { sim.status = 'crashing'; sim.crashTime = 0; } }
function overlaps(a: Vec, ar: number, b: Vec, br: number): boolean { return lengthSq(sub(a, b)) <= (ar + br) ** 2; }
function checkHeadCollision(sim: SimState, world: PhysicsWorld, tuning: TuningProfile): void { if (!hasClearance(world, headPosition(sim.bike, tuning), tuning.headRadius)) beginCrash(sim); }
function partTouches(bike: BikeState, object: Vec, radius: number, tuning: TuningProfile): boolean {
  return overlaps(bike.rear.p, tuning.wheelRadius, object, radius) || overlaps(bike.front.p, tuning.wheelRadius, object, radius) ||
    overlaps(headPosition(bike, tuning), tuning.headRadius, object, radius) || overlaps(bike.p, tuning.bodyRadius, object, radius);
}
function legacyPickupTouches(bike: BikeState, object: Vec): boolean {
  return [bike.p, bike.rear.p, bike.front.p].some((part) => lengthSq(sub(part, object)) <= TUNING.pickupRadius ** 2);
}
function handleObjects(sim: SimState, world: PhysicsWorld, tuning: TuningProfile): void {
  const elma = isElmaLevel(sim.level);
  for (let i = 0; i < world.apples.length; i += 1) {
    const touches = elma ? partTouches(sim.bike, world.apples[i].p, OBJECT_RADIUS, tuning) : legacyPickupTouches(sim.bike, world.apples[i].p);
    if (sim.collected[i] || !touches) continue;
    sim.collected[i] = true; sim.applePickupCount += 1; const gravity = world.apples[i].gravity;
    if (gravity === 'up') sim.gravity = { x: 0, y: -tuning.gravity }; if (gravity === 'down') sim.gravity = { x: 0, y: tuning.gravity };
    if (gravity === 'left') sim.gravity = { x: -tuning.gravity, y: 0 }; if (gravity === 'right') sim.gravity = { x: tuning.gravity, y: 0 };
  }
  if (world.killers.some((killer) => partTouches(sim.bike, killer, tuning.killerRadius, tuning))) beginCrash(sim);
  const touchesExit = world.exits.some((exit) => elma ? partTouches(sim.bike, exit, OBJECT_RADIUS, tuning) : legacyPickupTouches(sim.bike, exit));
  if (touchesExit) { if (sim.collected.every(Boolean)) { sim.status = 'finished'; sim.finishTime = sim.time; } else sim.flowerBlocked = true; }
  else sim.flowerBlocked = false;
}
function finiteSim(sim: SimState): boolean { const b = sim.bike; return [b.p.x, b.p.y, b.a, b.v.x, b.v.y, b.w,
  b.rear.p.x, b.rear.p.y, b.rear.v.x, b.rear.v.y, b.rear.s, b.rear.q, b.front.p.x, b.front.p.y,
  b.front.v.x, b.front.v.y, b.front.s, b.front.q, sim.time, sim.gasTime].every(Number.isFinite); }
function stepOnce(sim: SimState, suppliedInput: Input, dt: number, tuning: TuningProfile): void {
  const input = sim.status === 'playing' ? suppliedInput : ZERO_INPUT; const bike = sim.bike; const world = getPhysicsWorld(sim.level);
  const elma = isElmaLevel(sim.level);
  if (input.turnAround) { bike.dir = bike.dir === 1 ? -1 : 1; const oldRear = bike.rear; bike.rear = bike.front; bike.front = oldRear; }
  if (elma && input.voltBack && sim.time - sim.lastVoltBack >= tuning.voltCooldown) {
    bike.w -= tuning.voltAngularImpulse;
    sim.lastVoltBack = sim.time;
  }
  if (elma && input.voltForward && sim.time - sim.lastVoltForward >= tuning.voltCooldown) {
    bike.w += tuning.voltAngularImpulse;
    sim.lastVoltForward = sim.time;
  }
  const rearWasGrounded = bike.rear.onGround; const frontWasGrounded = bike.front.onGround; const wasGrounded = rearWasGrounded || frontWasGrounded;
  bike.rear.onGround = false; bike.front.onGround = false;
  for (const velocity of [bike.v, bike.rear.v, bike.front.v]) { velocity.x += sim.gravity.x * dt; velocity.y += sim.gravity.y * dt; }
  constrainSuspension(bike, bike.rear, false, dt, tuning); constrainSuspension(bike, bike.front, true, dt, tuning);
  if (input.gas) { const spinError = bike.dir * tuning.maxWheelSpin - bike.rear.s;
    // Elma profile: engine strength follows forward speed (weak from a standstill, full near top speed), so a
    // standing start is gentle like the real replays but re-applying gas while moving gives full power at once.
    const forwardSpeed = Math.abs(bike.v.x * Math.cos(bike.a) + bike.v.y * Math.sin(bike.a)) * tuning.timeScale;
    const ramp = tuning.driveRampTime > 0 ? Math.min(1, Math.max(1 / tuning.driveRampTime, forwardSpeed / tuning.maxRealLinearSpeed)) : 1;
    const maximumTorque = tuning.driveTorque * ramp;
    const torque = Math.max(-maximumTorque, Math.min(maximumTorque, spinError * tuning.driveResponse));
    bike.rear.s += torque / tuning.wheelInertia * dt; const reaction = rearWasGrounded && frontWasGrounded ? torque * tuning.groundedDriveReaction : bike.dir * tuning.airDriveTorque;
    bike.w -= reaction / tuning.bodyInertia * dt; }
  if (input.brake) for (const wheel of [bike.rear, bike.front]) { const change = tuning.brakeTorque / tuning.wheelInertia * dt; wheel.s = Math.abs(wheel.s) <= change ? 0 : wheel.s - Math.sign(wheel.s) * change; }
  if (!input.gas && !input.brake) for (const [wheel, grounded] of [[bike.rear, rearWasGrounded], [bike.front, frontWasGrounded]] as const) {
    if (!grounded) continue;
    const change = tuning.idleBrakeTorque / tuning.wheelInertia * dt;
    wheel.s = Math.abs(wheel.s) <= change ? 0 : wheel.s - Math.sign(wheel.s) * change;
  }
  if (!elma) {
    const lean = Number(input.leanForward) - Number(input.leanBack); const leanMultiplier = rearWasGrounded && frontWasGrounded ? tuning.groundedLeanMultiplier : wasGrounded ? tuning.singleWheelLeanMultiplier : 1;
    bike.w += lean * tuning.leanTorque * leanMultiplier / tuning.bodyInertia * dt;
  }
  const drag = Math.max(0, 1 - tuning.linearDrag * dt);
  bike.v.x *= drag; bike.v.y *= drag; bike.w *= Math.max(0, 1 - tuning.angularDrag * dt); bike.w = Math.max(-tuning.maxAngularVelocity, Math.min(tuning.maxAngularVelocity, bike.w));
  for (const wheel of [bike.rear, bike.front]) { wheel.v.x *= drag; wheel.v.y *= drag; wheel.s *= Math.max(0, 1 - tuning.wheelSpinDrag * dt); }
  bike.p.x += bike.v.x * dt; bike.p.y += bike.v.y * dt; bike.a += bike.w * dt;
  for (const wheel of [bike.rear, bike.front]) { wheel.p.x += wheel.v.x * dt; wheel.p.y += wheel.v.y * dt; wheel.q += wheel.s * dt; }
  for (let i = 0; i < tuning.collisionIterations; i += 1) { wheelCollision(bike.rear, dt, world, sim.gravity, tuning); wheelCollision(bike.front, dt, world, sim.gravity, tuning); constrainSuspension(bike, bike.rear, false, dt, tuning); constrainSuspension(bike, bike.front, true, dt, tuning); }
  if (elma) for (let i = 0; i < 12; i += 1) {
    projectSuspensionTravel(bike, bike.rear, false, tuning);
    projectSuspensionTravel(bike, bike.front, true, tuning);
  }
  const maximumInternalSpeed = tuning.maxRealLinearSpeed / tuning.timeScale;
  const bodySpeed = Math.hypot(bike.v.x, bike.v.y);
  if (bodySpeed > maximumInternalSpeed) {
    bike.v.x *= maximumInternalSpeed / bodySpeed;
    bike.v.y *= maximumInternalSpeed / bodySpeed;
  }
  if (sim.status === 'playing') {
    checkHeadCollision(sim, world, tuning);
    handleObjects(sim, world, tuning);
  }
}
export function stepSim(sim: SimState, suppliedInput: Input = ZERO_INPUT, dt: number): void {
  if (sim.status === 'crashed' || sim.status === 'finished' || dt <= 0) return; if (!finiteSim(sim)) { beginCrash(sim); return; }
  sim.gasTime = suppliedInput.gas && sim.status === 'playing' ? sim.gasTime + dt : 0;
  const tuning = tuningForLevel(sim.level);
  const internalDt = dt * tuning.timeScale;
  const speed = Math.max(Math.hypot(sim.bike.v.x, sim.bike.v.y), Math.hypot(sim.bike.rear.v.x, sim.bike.rear.v.y), Math.hypot(sim.bike.front.v.x, sim.bike.front.v.y));
  const steps = Math.min(8, Math.max(1, Math.ceil(speed * internalDt / tuning.maxSubstepTravel)));
  for (let i = 0; i < steps; i += 1) {
    stepOnce(sim, {
      ...suppliedInput,
      turnAround: suppliedInput.turnAround && i === 0,
      voltBack: suppliedInput.voltBack && i === 0,
      voltForward: suppliedInput.voltForward && i === 0,
    }, internalDt / steps, tuning);
    if ((sim.status as SimState['status']) === 'finished' || (sim.status as SimState['status']) === 'crashed') break;
  }
  sim.time += dt;
  if (sim.status === 'crashing') { sim.crashTime += dt; if (sim.crashTime >= tuning.crashDelay) sim.status = 'crashed'; }
  if (!finiteSim(sim)) beginCrash(sim);
}
