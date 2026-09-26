import { findMeshes, type Axle, type Gear, type GearSystem } from '../core/model';
import { toothStep } from './gearOutline';

/**
 * Starting angle for gear B so that its gap faces gear A's tooth at the contact point.
 * `contact` is the direction from A's axle to B's axle.
 *
 * The arcs at the contact point move by the same length in opposite directions,
 * so if A sits `f` of a tooth past a tooth centre, B must sit `−f` past a gap centre.
 */
export function meshedAngle(angleA: number, teethA: number, teethB: number, contact: number) {
  const offsetA = (contact - angleA) / toothStep(teethA);
  return contact + Math.PI + (offsetA - 0.5) * toothStep(teethB);
}

/**
 * Starting angles for every gear, spread from gear to gear across meshes.
 * Each connected group starts from its first gear at angle 0.
 */
export function initialAngles(system: GearSystem): Map<string, number> {
  const axles = new Map(system.axles.map((axle) => [axle.id, axle]));
  const neighbours = new Map<string, Gear[]>(system.gears.map((gear) => [gear.id, []]));
  for (const [a, b] of findMeshes(system)) {
    neighbours.get(a.id)?.push(b);
    neighbours.get(b.id)?.push(a);
  }

  const axleOf = (gear: Gear): Axle => {
    const axle = axles.get(gear.axleId);
    if (!axle) throw new Error(`Gear ${gear.id} sits on unknown axle ${gear.axleId}`);
    return axle;
  };
  const direction = (from: Gear, to: Gear): number => {
    const origin = axleOf(from);
    const target = axleOf(to);
    return Math.atan2(target.y - origin.y, target.x - origin.x);
  };

  const angles = new Map<string, number>();
  for (const start of system.gears) {
    if (angles.has(start.id)) continue;
    angles.set(start.id, 0);
    const queue = [start];

    for (let gear = queue.shift(); gear !== undefined; gear = queue.shift()) {
      const angle = angles.get(gear.id) ?? 0;
      for (const next of neighbours.get(gear.id) ?? []) {
        if (angles.has(next.id)) continue;
        angles.set(next.id, meshedAngle(angle, gear.teeth, next.teeth, direction(gear, next)));
        queue.push(next);
      }
    }
  }
  return angles;
}
