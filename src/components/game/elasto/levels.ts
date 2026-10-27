import type { Level, Vec } from './types';

const v = (x: number, y: number): Vec => ({ x, y });

export function room(groundPts: Vec[], ceilingY = -4): Vec[] {
  if (groundPts.length < 2) throw new Error('A room needs at least two ground points');
  const first = groundPts[0];
  const last = groundPts[groundPts.length - 1];
  return [v(first.x, ceilingY), v(last.x, ceilingY), ...[...groundPts].reverse()];
}

export function box(x: number, y: number, width: number, height: number): Vec[] {
  return [v(x, y), v(x + width, y), v(x + width, y + height), v(x, y + height)];
}

export function ramp(x: number, y: number, width: number, height: number, rising = true): Vec[] {
  return rising
    ? [v(x, y), v(x + width, y - height), v(x + width + 0.75, y)]
    : [v(x, y - height), v(x + width, y), v(x - 0.75, y)];
}

export function hill(x: number, width: number, height: number, segments = 8, baseY = 8): Vec[] {
  const points: Vec[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    points.push(v(x + width * t, baseY - Math.sin(Math.PI * t) * height));
  }
  return points;
}

function ground(width: number, features: Vec[] = []): Vec[] {
  return [v(0, 8), ...features, v(width, 8)];
}

export const LEVELS: Level[] = [
  {
    name: 'First Ride', start: v(2, 7.2),
    polygons: [room(ground(86), -4)],
    apples: [v(30, 7.25), v(58, 7.25)], killers: [], flower: v(84, 7.35),
  },
  {
    name: 'Rolling Hills', start: v(2, 7.2),
    polygons: [room(ground(88, [
      ...hill(10, 14, 0.55, 16),
      ...hill(31, 18, 0.75, 20),
      ...hill(57, 15, 0.65, 18),
    ]), -5)],
    apples: [v(17, 6.65), v(40, 6.45), v(64.5, 6.55)], killers: [], flower: v(86, 7.3),
  },
  {
    name: 'Big Jump', start: v(2, 7.2),
    polygons: [room([
      v(0, 8), v(24, 8), v(31, 5.4), v(38, 10.5), v(46, 10.5), v(55, 7.1), v(62, 8), v(86, 8),
    ], -6)],
    apples: [v(24, 7.25), v(54, 6.35)], killers: [], flower: v(84, 7.3),
  },
  {
    name: 'Wheelie Tunnel', start: v(2, 7.2),
    polygons: [room(ground(88, [
      ...hill(54, 10, 2.5, 16),
    ]), -5), box(23, 4.8, 27, 0.85)],
    apples: [v(17, 7.25), v(38, 7.25), v(60, 5.5)], killers: [], flower: v(86, 7.3),
  },
  {
    name: 'Mind the Gap', start: v(2, 7.2),
    polygons: [room(ground(92), -6), ramp(29, 8, 10, 3)],
    apples: [v(39.5, 4.75), v(45, 6.6)], killers: [v(40.5, 7.35)], flower: v(90, 7.3),
  },
  {
    name: 'Half-Pipe', start: v(3, 5.9),
    polygons: [room([
      v(0, 6.7), v(18, 6.7), v(25, 9.2), v(35, 10.4), v(45, 9.2), v(52, 6.7), v(90, 6.7),
    ], -6)],
    apples: [v(15, 5.35), v(35, 9.55), v(50.5, 6.3)], killers: [], flower: v(88, 6),
  },
  {
    name: 'Stairway', start: v(2, 7.2),
    polygons: [room([
      v(0, 8), v(18, 8), v(20, 7), v(25, 7), v(27, 6), v(32, 6), v(34, 5), v(39, 5),
      v(41, 4), v(49, 4), v(53, 5), v(57, 6), v(61, 7), v(65, 8),
      ...hill(70, 14, 1.5, 16), v(94, 8),
    ], -6)],
    apples: [v(0.8, 7.25), v(36.5, 4.25), v(46, 3.25), v(77, 5.9)], killers: [], flower: v(92, 7.3),
  },
  {
    name: 'Turnaround', start: v(35, 7.2),
    polygons: [room(ground(72), -5), box(68, 3, 0.65, 5)],
    apples: [v(6, 7.25), v(64, 7.25)], killers: [], flower: v(2, 7.35),
  },
  {
    name: 'Spike Garden', start: v(2, 7.2),
    polygons: [room([
      v(0, 8), v(31, 8), v(34, 10), v(40, 10), v(44, 8), v(71, 8),
      v(74, 10), v(80, 10), v(84, 8), v(108, 8),
    ], -7), ramp(20, 8, 10, 3), ramp(60, 8, 10, 3)],
    apples: [v(40, 9.25), v(48, 7.25), v(70.5, 4.75), v(88, 7.25)],
    killers: [v(36.5, 9.15), v(76.5, 9.15)], flower: v(106, 7.3),
  },
  {
    name: 'Sunset Finale', start: v(2, 7.2),
    polygons: [room([
      v(0, 8), v(36, 8), v(39, 11), v(48, 11), v(53, 8), v(88, 8),
      v(96, 4.2), v(104, 8), v(116, 8),
    ], -8), ramp(24, 8, 11, 3.4)],
    apples: [v(1, 7.25), v(35.5, 4.35), v(96, 3.7), v(108, 7.25)],
    killers: [v(42, 10.15), v(46, 10.15)], flower: v(114, 7.3),
  },
];
