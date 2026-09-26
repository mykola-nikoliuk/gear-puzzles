export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Slow start, slow finish. */
export function easeInOut(t: number): number {
  const p = Math.min(1, Math.max(0, t));
  return p * p * (3 - 2 * p);
}

/**
 * Where a gear is `progress` (0 to 1) of the way along its move: it rises, travels and
 * settles, peaking `lift` above the straight path halfway through.
 */
export function arcPosition(from: Point3, to: Point3, progress: number, lift: number): Point3 {
  const p = easeInOut(progress);
  const hop = 4 * p * (1 - p) * lift;
  return {
    x: from.x + (to.x - from.x) * p,
    y: from.y + (to.y - from.y) * p,
    z: from.z + (to.z - from.z) * p + hop,
  };
}

/** How much of the remaining gap to close this frame, for a smooth follow at `rate` per second. */
export function followFactor(rate: number, seconds: number): number {
  return 1 - Math.exp(-rate * Math.max(0, seconds));
}
