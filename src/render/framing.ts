import type { GearSystem } from '../core/model';
import type { Bounds } from './levelView';

export interface Point2 {
  readonly x: number;
  readonly y: number;
}

/** Halfway between the motor and the output: where the eye expects the mechanism to be. */
export function focusPoint(system: GearSystem, outputAxleId: string): Point2 {
  const find = (id: string) => {
    const axle = system.axles.find((candidate) => candidate.id === id);
    if (!axle) throw new Error(`Unknown axle ${id}`);
    return axle;
  };
  const motor = find(system.driver.axleId);
  const output = find(outputAxleId);
  return { x: (motor.x + output.x) / 2, y: (motor.y + output.y) / 2 };
}

/** The half-size a view centred on `center` needs to show all of `bounds`. */
export function halfExtents(bounds: Bounds, center: Point2): { width: number; height: number } {
  return {
    width: Math.max(bounds.maxX - center.x, center.x - bounds.minX),
    height: Math.max(bounds.maxY - center.y, center.y - bounds.minY),
  };
}

/**
 * Where the camera looks: across, at the mechanism, which the tray is centred on;
 * up and down, at the middle of board and tray, so the tray below leaves no empty band above.
 */
export function frameCenter(bounds: Bounds, focus: Point2): Point2 {
  return { x: focus.x, y: (bounds.minY + bounds.maxY) / 2 };
}
