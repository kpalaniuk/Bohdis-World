import { Buffer } from 'buffer';
import { Gravity, Level as LevFile, ObjectType } from 'elmajs';
import type { ElmaLevel, GravityDirection, Vec } from './types';

/** Elma file space and Elasto Bike engine space both use +y down. */
// Verified against real community levels (moposite reviewed MOPSI001-007): in .lev files +y points DOWN,
// the same as the engine and the canvas, so no flip is needed.
export const ELMA_Y_SIGN: 1 | -1 = 1;
export const OBJECT_RADIUS = 0.4;
export const HEAD_RADIUS = 0.238;
export const MAX_ELMA_COORDINATE = 10_000;
export const MAX_ELMA_VERTICES = 20_000;

export function fromElmaPoint(point: { x: number; y: number }): Vec {
  return { x: point.x, y: point.y * ELMA_Y_SIGN };
}

const gravityNames: Record<number, GravityDirection> = {
  [Gravity.None]: 'none',
  [Gravity.Up]: 'up',
  [Gravity.Down]: 'down',
  [Gravity.Left]: 'left',
  [Gravity.Right]: 'right',
};

export function isAirAt(level: ElmaLevel, point: Vec): boolean {
  let insideCount = 0;
  for (const polygon of level.polygons) {
    if (polygon.grass || polygon.vertices.length < 3) continue;
    let inside = false;
    for (let i = 0, j = polygon.vertices.length - 1; i < polygon.vertices.length; j = i++) {
      const a = polygon.vertices[i];
      const b = polygon.vertices[j];
      if ((a.y > point.y) !== (b.y > point.y) &&
        point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    if (inside) insideCount += 1;
  }
  return insideCount % 2 === 1;
}

export function verticalSolidRayDistances(level: ElmaLevel): { down: number; up: number } {
  let down = Number.POSITIVE_INFINITY;
  let up = Number.POSITIVE_INFINITY;
  for (const polygon of level.polygons) {
    if (polygon.grass) continue;
    for (let index = 0; index < polygon.vertices.length; index += 1) {
      const a = polygon.vertices[index];
      const b = polygon.vertices[(index + 1) % polygon.vertices.length];
      const dx = b.x - a.x;
      if (Math.abs(dx) < 1e-9) {
        if (Math.abs(level.start.x - a.x) > 1e-9) continue;
        for (const y of [a.y, b.y]) {
          const distance = y - level.start.y;
          if (distance > 1e-9) down = Math.min(down, distance);
          if (distance < -1e-9) up = Math.min(up, -distance);
        }
        continue;
      }
      const edgePosition = (level.start.x - a.x) / dx;
      if (edgePosition < 0 || edgePosition > 1) continue;
      const y = a.y + (b.y - a.y) * edgePosition;
      const distance = y - level.start.y;
      if (distance > 1e-9) down = Math.min(down, distance);
      if (distance < -1e-9) up = Math.min(up, -distance);
    }
  }
  return { down, up };
}

function warnIfAxisLooksWrong(level: ElmaLevel): void {
  const { down, up } = verticalSolidRayDistances(level);
  if (up < down && down > 1.5) {
    console.warn(`Elasto Bike: level "${level.name}" looks vertically flipped; change ELMA_Y_SIGN in elma.ts if community levels confirm it.`);
  }
}

export function parseLev(bytes: Uint8Array): ElmaLevel {
  try {
    const parsed = LevFile.from(Buffer.from(bytes));
    const vertexCount = parsed.polygons.reduce((sum, polygon) => sum + polygon.vertices.length, 0);
    if (vertexCount > MAX_ELMA_VERTICES) throw new Error('too many vertices');
    const validCoordinate = (value: number) => Number.isFinite(value) && Math.abs(value) <= MAX_ELMA_COORDINATE;
    if (parsed.polygons.some((polygon) => polygon.vertices.some((point) => !validCoordinate(point.x) || !validCoordinate(point.y))) ||
      parsed.objects.some((object) => !validCoordinate(object.position.x) || !validCoordinate(object.position.y))) {
      throw new Error('invalid coordinate');
    }
    const polygons = parsed.polygons.map((polygon) => ({
      grass: polygon.grass,
      vertices: polygon.vertices.map(fromElmaPoint),
    }));
    const objects = parsed.objects.map((object) => ({ ...object, p: fromElmaPoint(object.position) }));
    const starts = objects.filter((object) => object.type === ObjectType.Start);
    const exits = objects.filter((object) => object.type === ObjectType.Exit);
    const start = starts[0]?.p;
    if (!start) throw new Error('missing start object');
    if (exits.length === 0) throw new Error('missing exit object');
    const level: ElmaLevel = {
      name: parsed.name || 'Unnamed level',
      polygons,
      apples: objects.filter((object) => object.type === ObjectType.Apple).map((object) => ({
        p: object.p,
        gravity: gravityNames[object.gravity] ?? 'none',
        animation: object.animation,
      })),
      killers: objects.filter((object) => object.type === ObjectType.Killer).map((object) => object.p),
      exits: exits.map((object) => object.p),
      start,
      lgr: parsed.lgr,
      ground: parsed.ground,
      sky: parsed.sky,
    };
    warnIfAxisLooksWrong(level);
    return level;
  } catch {
    throw new Error("This doesn't look like an Elasto Mania level file");
  }
}
