import {
  findMeshes,
  isPlaced,
  LAYERS,
  meshes,
  tipRadius,
  type Axle,
  type Gear,
  type GearSystem,
} from './model';

export type PlacementError =
  /** The motor axle is part of the level: its gears cannot move and nothing can join them. */
  | 'driver'
  | 'unknown-gear'
  | 'unknown-axle'
  /** Axles only have `LAYERS` layers. */
  | 'no-layer'
  /** Another gear already sits on this axle and layer. */
  | 'occupied'
  /** Teeth would overlap with a gear they do not mesh with. */
  | 'collides';

/**
 * Why `gearId` cannot move to `layer` of `axleId` (`null` for the tray), or `null` if it can.
 * The layer defaults to the one the gear is on now.
 */
export function placementError(
  system: GearSystem,
  gearId: string,
  axleId: string | null,
  layer?: number,
): PlacementError | null {
  const gear = system.gears.find(({ id }) => id === gearId);
  if (!gear) return 'unknown-gear';
  if (gear.axleId === system.driver.axleId || axleId === system.driver.axleId) return 'driver';
  if (axleId === null) return null;

  const axles = new Map(system.axles.map((axle) => [axle.id, axle]));
  const target = axles.get(axleId);
  if (!target) return 'unknown-axle';
  const onLayer = layer ?? gear.layer;
  if (!Number.isInteger(onLayer) || onLayer < 0 || onLayer >= LAYERS) return 'no-layer';

  const neighbours = system.gears.filter(
    (other) => other.id !== gear.id && other.layer === onLayer,
  );
  if (neighbours.some((other) => other.axleId === axleId)) return 'occupied';

  const moved: Gear = { ...gear, axleId, layer: onLayer };
  for (const other of neighbours.filter(isPlaced)) {
    const otherAxle = axles.get(other.axleId);
    if (!otherAxle || meshes(moved, other, target, otherAxle)) continue;
    const distance = Math.hypot(target.x - otherAxle.x, target.y - otherAxle.y);
    if (distance < tipRadius(gear.teeth) + tipRadius(other.teeth)) return 'collides';
  }
  return null;
}

/**
 * A copy of the system with the gear moved (to the tray for `null`), on `layer` if given;
 * throws if not allowed.
 */
export function moveGear(
  system: GearSystem,
  gearId: string,
  axleId: string | null,
  layer?: number,
): GearSystem {
  const error = placementError(system, gearId, axleId, layer);
  if (error) throw new Error(`Cannot move ${gearId} to ${axleId ?? 'the tray'}: ${error}`);
  return {
    ...system,
    gears: system.gears.map((gear) =>
      gear.id === gearId ? { ...gear, axleId, layer: layer ?? gear.layer } : gear,
    ),
  };
}

/**
 * The layer a gear dropped on `axleId` should take: the lowest free one where it meshes
 * with a neighbour, else the lowest free one; `null` if no layer is allowed.
 */
export function bestLayer(system: GearSystem, gearId: string, axleId: string): number | null {
  const allowed = Array.from({ length: LAYERS }, (_, layer) => layer).filter(
    (layer) => placementError(system, gearId, axleId, layer) === null,
  );
  const engages = (layer: number) =>
    findMeshes(moveGear(system, gearId, axleId, layer)).some((pair) =>
      pair.some(({ id }) => id === gearId),
    );
  return allowed.find(engages) ?? allowed[0] ?? null;
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
