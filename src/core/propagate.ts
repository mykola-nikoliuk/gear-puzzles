import { equals, fraction, multiply, type Fraction } from './fraction';
import { findMeshes, type GearSystem, type Velocity } from './model';

export type Propagation =
  | { readonly kind: 'running'; readonly velocities: ReadonlyMap<string, Velocity> }
  /** Two paths demand different velocities from one axle, so nothing can turn. */
  | { readonly kind: 'jammed'; readonly axleId: string };

interface Link {
  readonly to: string;
  /** Multiplier from this axle's velocity to the neighbour's: −teeth(from) / teeth(to). */
  readonly ratio: Fraction;
}

function buildLinks(system: GearSystem): Map<string, Link[]> {
  const links = new Map<string, Link[]>(system.axles.map((axle) => [axle.id, []]));
  const add = (from: string, link: Link) => links.get(from)?.push(link);

  for (const [a, b] of findMeshes(system)) {
    add(a.axleId, { to: b.axleId, ratio: fraction(-a.teeth, b.teeth) });
    add(b.axleId, { to: a.axleId, ratio: fraction(-b.teeth, a.teeth) });
  }
  return links;
}

/**
 * Spreads the driver's rotation over the meshed gears. Axles that are not
 * connected to the driver stay idle and are absent from the result.
 */
export function propagate(system: GearSystem): Propagation {
  const links = buildLinks(system);
  const { axleId: driverId, velocity: driverVelocity } = system.driver;
  if (!links.has(driverId)) throw new Error(`Driver sits on unknown axle ${driverId}`);

  const velocities = new Map<string, Velocity>([[driverId, driverVelocity]]);
  const queue = [driverId];

  for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
    const velocity = velocities.get(current);
    if (!velocity) continue;

    for (const { to, ratio } of links.get(current) ?? []) {
      const expected = multiply(velocity, ratio);
      const known = velocities.get(to);
      if (!known) {
        velocities.set(to, expected);
        queue.push(to);
      } else if (!equals(known, expected)) {
        return { kind: 'jammed', axleId: to };
      }
    }
  }

  return { kind: 'running', velocities };
}
