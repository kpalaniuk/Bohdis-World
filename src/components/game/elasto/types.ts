export interface Vec {
  x: number;
  y: number;
}

export interface Level {
  name: string;
  start: Vec;
  polygons: Vec[][];
  apples: Vec[];
  killers: Vec[];
  flower: Vec;
}

export type GravityDirection = 'none' | 'up' | 'down' | 'left' | 'right';

export interface ElmaApple {
  p: Vec;
  gravity: GravityDirection;
  animation: number;
}

export interface ElmaLevel {
  name: string;
  polygons: { grass: boolean; vertices: Vec[] }[];
  apples: ElmaApple[];
  killers: Vec[];
  exits: Vec[];
  start: Vec;
  lgr: string;
  ground: string;
  sky: string;
}

export type PlayableLevel = Level | ElmaLevel;

export interface WheelState {
  p: Vec;
  v: Vec;
  s: number;
  q: number;
  onGround: boolean;
  normal: Vec;
}

export interface BikeState {
  p: Vec;
  a: number;
  v: Vec;
  w: number;
  dir: 1 | -1;
  rear: WheelState;
  front: WheelState;
}

export interface Input {
  gas: boolean;
  brake: boolean;
  leanBack: boolean;
  leanForward: boolean;
  turnAround: boolean;
  /** One-shot Elma rotation inputs. UI code emits these only on a key press/tap. */
  voltBack?: boolean;
  voltForward?: boolean;
}

export type SimStatus = 'playing' | 'crashing' | 'crashed' | 'finished';

export interface SimState {
  level: PlayableLevel;
  bike: BikeState;
  collected: boolean[];
  time: number;
  status: SimStatus;
  crashTime: number;
  finishTime: number | null;
  flowerBlocked: boolean;
  applePickupCount: number;
  gravity: Vec;
  lastVoltBack: number;
  lastVoltForward: number;
  gasTime: number;
}

export function isElmaLevel(level: PlayableLevel): level is ElmaLevel {
  return level.polygons.length === 0 || !Array.isArray(level.polygons[0]);
}
