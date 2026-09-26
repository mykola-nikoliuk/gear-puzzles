import { rootRadius, tipRadius } from '../core/model';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Angular layout of one tooth as fractions of its pitch step, centred on the tooth axis. */
const ROOT_HALF_WIDTH = 0.3;
const TIP_HALF_WIDTH = 0.15;

/** Angle between neighbouring teeth, in radians. */
export function toothStep(teeth: number): number {
  return (2 * Math.PI) / teeth;
}

/**
 * Closed counter-clockwise outline of a gear with trapezoidal teeth.
 * Tooth 0 points along +x, so a gear's rotation angle is also the angle of its first tooth.
 */
export function gearOutline(teeth: number): Point[] {
  if (!Number.isInteger(teeth) || teeth < 3) {
    throw new Error(`A gear needs at least 3 whole teeth, got ${teeth}`);
  }

  const step = toothStep(teeth);
  const root = rootRadius(teeth);
  const tip = tipRadius(teeth);
  const at = (radius: number, angle: number): Point => ({
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
  });

  const points: Point[] = [];
  for (let i = 0; i < teeth; i++) {
    const axis = i * step;
    points.push(
      at(root, axis - ROOT_HALF_WIDTH * step),
      at(tip, axis - TIP_HALF_WIDTH * step),
      at(tip, axis + TIP_HALF_WIDTH * step),
      at(root, axis + ROOT_HALF_WIDTH * step),
    );
  }
  return points;
}
