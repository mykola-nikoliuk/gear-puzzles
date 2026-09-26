import { toNumber } from '../core/fraction';
import type { GearSystem } from '../core/model';
import type { Propagation } from '../core/propagate';

/**
 * Gear angles after `seconds` of running, in radians. Velocities are turns per second.
 * A jammed system and gears on idle axles stay at their starting angles.
 */
export function anglesAt(
  system: GearSystem,
  propagation: Propagation,
  startAngles: ReadonlyMap<string, number>,
  seconds: number,
): Map<string, number> {
  const angles = new Map<string, number>();
  for (const gear of system.gears) {
    const start = startAngles.get(gear.id) ?? 0;
    const velocity =
      propagation.kind === 'running' ? propagation.velocities.get(gear.axleId) : undefined;
    const turns = velocity ? toNumber(velocity) * seconds : 0;
    angles.set(gear.id, start + turns * 2 * Math.PI);
  }
  return angles;
}
