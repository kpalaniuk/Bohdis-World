export interface ReplaySegment {
  t: number;
  gas?: boolean;
  brake?: boolean;
  leanBack?: boolean;
  leanForward?: boolean;
  turnAround?: boolean;
}

export const SOLUTIONS: ReplaySegment[][] = [
  [{ t: 12, gas: true }],
  [{ t: 14, gas: true }],
  [{ t: 14, gas: true }],
  [
    { t: 5.4, gas: true },
    { t: 0.8, gas: true, leanForward: true },
    { t: 0.6, gas: true, leanBack: true },
    { t: 6, gas: true },
  ],
  [
    { t: 3, gas: true },
    { t: 1, gas: true, leanForward: true },
    { t: 11, gas: true },
  ],
  [
    { t: 3, gas: true },
    { t: 0.4, brake: true },
    { t: 0.2, gas: true, turnAround: true },
    { t: 8, gas: true },
    { t: 0.4, brake: true },
    { t: 0.2, gas: true, turnAround: true },
    { t: 12, gas: true },
  ],
  [
    { t: 0.2, gas: true, turnAround: true },
    { t: 0.86, gas: true },
    { t: 0.2, brake: true, turnAround: true },
    { t: 8.5, gas: true },
    { t: 0.5, brake: true },
    { t: 0.15, leanBack: true },
    { t: 0.15, leanForward: true },
    { t: 5, gas: true },
  ],
  [
    { t: 3.9, gas: true },
    { t: 0.2, gas: true, turnAround: true },
    { t: 11, gas: true },
  ],
  [
    { t: 2, gas: true },
    { t: 1, gas: true, leanForward: true },
    { t: 3, gas: true },
    { t: 1, gas: true, leanForward: true },
    { t: 13, gas: true },
  ],
  [
    { t: 0.2, gas: true, turnAround: true },
    { t: 0.45, gas: true },
    { t: 0.2, brake: true, turnAround: true },
    { t: 2.5, gas: true },
    { t: 0.2, gas: true, leanForward: true },
    { t: 0.2, gas: true, leanBack: true },
    { t: 15, gas: true },
  ],
];
