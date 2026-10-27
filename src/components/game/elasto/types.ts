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
}

export type SimStatus = 'playing' | 'crashing' | 'crashed' | 'finished';

export interface SimState {
  level: Level;
  bike: BikeState;
  collected: boolean[];
  time: number;
  status: SimStatus;
  crashTime: number;
  finishTime: number | null;
  flowerBlocked: boolean;
  applePickupCount: number;
}
