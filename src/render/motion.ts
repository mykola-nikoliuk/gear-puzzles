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

/** Length of the path a carried gear takes: up to `carry`, across, then down. */
export function carryLength(from: Point3, to: Point3, carry: number): number {
  const top = Math.max(carry, from.z, to.z);
  return top - from.z + Math.hypot(to.x - from.x, to.y - from.y) + top - to.z;
}

/**
 * Where a gear is `progress` (0 to 1) of the way along a carry: it rises straight up to
 * the `carry` height, travels across and drops straight down onto its spot. A gear already
 * at that height above its spot just falls.
 */
export function carryPosition(from: Point3, to: Point3, carry: number, progress: number): Point3 {
  const top = Math.max(carry, from.z, to.z);
  const rise = top - from.z;
  const across = Math.hypot(to.x - from.x, to.y - from.y);
  const total = carryLength(from, to, carry);
  if (total === 0 || progress >= 1) return to;

  let left = easeInOut(progress) * total;
  if (left <= rise) return { x: from.x, y: from.y, z: from.z + left };
  left -= rise;
  if (left <= across) {
    const t = across === 0 ? 1 : left / across;
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, z: top };
  }
  left -= across;
  return { x: to.x, y: to.y, z: Math.max(to.z, top - left) };
}

/** How much of the remaining gap to close this frame, for a smooth follow at `rate` per second. */
export function followFactor(rate: number, seconds: number): number {
  return 1 - Math.exp(-rate * Math.max(0, seconds));
}
