import { meshes, tipRadius, type Axle, type Gear, type GearSystem } from './model';

export type PlacementError =
  /** The motor axle is part of the level: its gears cannot move and nothing can join them. */
  | 'driver'
  | 'unknown-gear'
  | 'unknown-axle'
  /** Another gear already sits on this axle and layer. */
  | 'occupied'
  /** Teeth would overlap with a gear they do not mesh with. */
  | 'collides';

/** Why `gearId` cannot move to `axleId`, or `null` if it can. */
export function placementError(
  system: GearSystem,
  gearId: string,
  axleId: string,
): PlacementError | null {
  const gear = system.gears.find(({ id }) => id === gearId);
  if (!gear) return 'unknown-gear';
  if (gear.axleId === system.driver.axleId || axleId === system.driver.axleId) return 'driver';

  const axles = new Map(system.axles.map((axle) => [axle.id, axle]));
  const target = axles.get(axleId);
  if (!target) return 'unknown-axle';

  const neighbours = system.gears.filter(
    (other) => other.id !== gear.id && other.layer === gear.layer,
  );
  if (neighbours.some((other) => other.axleId === axleId)) return 'occupied';

  const moved: Gear = { ...gear, axleId };
  for (const other of neighbours) {
    const otherAxle = axles.get(other.axleId);
    if (!otherAxle || meshes(moved, other, target, otherAxle)) continue;
    const distance = Math.hypot(target.x - otherAxle.x, target.y - otherAxle.y);
    if (distance < tipRadius(gear.teeth) + tipRadius(other.teeth)) return 'collides';
  }
  return null;
}

/** A copy of the system with the gear moved; throws if the move is not allowed. */
export function moveGear(system: GearSystem, gearId: string, axleId: string): GearSystem {
  const error = placementError(system, gearId, axleId);
  if (error) throw new Error(`Cannot move ${gearId} to ${axleId}: ${error}`);
  return {
    ...system,
    gears: system.gears.map((gear) => (gear.id === gearId ? { ...gear, axleId } : gear)),
  };
}

/** The closest axle within `maxDistance` of a point, if any. */
export function nearestAxle(
  system: GearSystem,
  x: number,
  y: number,
  maxDistance: number,
): Axle | undefined {
  let best: Axle | undefined;
  let bestDistance = maxDistance;
  for (const axle of system.axles) {
    const distance = Math.hypot(axle.x - x, axle.y - y);
    if (distance <= bestDistance) {
      best = axle;
      bestDistance = distance;
    }
  }
  return best;
}
