import { fraction, gcd, toNumber, type Fraction } from '../core/fraction';
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
      propagation.kind === 'running' && gear.axleId !== null
        ? propagation.velocities.get(gear.axleId)
        : undefined;
    const turns = velocity ? toNumber(velocity) * seconds : 0;
    angles.set(gear.id, start + turns * 2 * Math.PI);
  }
  return angles;
}

/**
 * Seconds after which the whole train looks the same again, for a seamless loop.
 * A gear with n teeth looks the same after 1/n of a turn, so the loop is the shortest time
 * in which every turning gear advances a whole number of teeth; `null` when nothing turns.
 */
export function loopPeriod(system: GearSystem, propagation: Propagation): Fraction | null {
  if (propagation.kind !== 'running') return null;
  // Teeth passing per second, as num/den; the loop is lcm(dens) / gcd(nums).
  let nums = 0;
  let dens = 1;
  for (const gear of system.gears) {
    const velocity = gear.axleId === null ? undefined : propagation.velocities.get(gear.axleId);
    if (!velocity || velocity.num === 0) continue;
    const rate = fraction(Math.abs(velocity.num) * gear.teeth, velocity.den);
    nums = gcd(nums, rate.num);
    dens = (dens * rate.den) / gcd(dens, rate.den);
  }
  return nums === 0 ? null : fraction(dens, nums);
}
