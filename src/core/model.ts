import type { Fraction } from './fraction';

/**
 * Angular velocity in turns per tick. The sign is the direction:
 * positive is counter-clockwise, negative is clockwise.
 */
export type Velocity = Fraction;

/** A fixed peg on the board. Every gear sits on an axle; gears on one axle turn together. */
export interface Axle {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/**
 * Gears only mesh with gears on the same layer, so a compound gear is two gears
 * on one axle and different layers.
 */
export interface Gear {
  readonly id: string;
  readonly axleId: string;
  readonly teeth: number;
  readonly layer: number;
}

export interface GearSystem {
  readonly axles: readonly Axle[];
  readonly gears: readonly Gear[];
  /** The axle turned by the motor and its velocity. */
  readonly driver: { readonly axleId: string; readonly velocity: Velocity };
}

/** Module 1: the pitch diameter equals the tooth count, so every gear has the same tooth size. */
export function pitchRadius(teeth: number): number {
  return teeth / 2;
}

/**
 * Standard module-1 proportions (1 above the pitch circle, 1.25 below) scaled to 75%:
 * full-height teeth look too spiky at the sizes used on the board.
 */
const TOOTH_SCALE = 0.75;
const ADDENDUM = 1 * TOOTH_SCALE;
const DEDENDUM = 1.25 * TOOTH_SCALE;

export function tipRadius(teeth: number): number {
  return pitchRadius(teeth) + ADDENDUM;
}

export function rootRadius(teeth: number): number {
  return pitchRadius(teeth) - DEDENDUM;
}

const EPSILON = 1e-9;

/** Two gears mesh when they share a layer and their pitch circles touch. */
export function meshes(a: Gear, b: Gear, axleA: Axle, axleB: Axle): boolean {
  if (a.layer !== b.layer || a.axleId === b.axleId) return false;

  const distance = Math.hypot(axleA.x - axleB.x, axleA.y - axleB.y);
  return Math.abs(distance - pitchRadius(a.teeth) - pitchRadius(b.teeth)) < EPSILON;
}

export type Mesh = readonly [Gear, Gear];

export function findMeshes(system: GearSystem): Mesh[] {
  const axles = new Map(system.axles.map((axle) => [axle.id, axle]));
  const axleOf = (gear: Gear): Axle => {
    const axle = axles.get(gear.axleId);
    if (!axle) throw new Error(`Gear ${gear.id} sits on unknown axle ${gear.axleId}`);
    return axle;
  };

  const result: Mesh[] = [];
  system.gears.forEach((a, i) => {
    for (const b of system.gears.slice(i + 1)) {
      if (meshes(a, b, axleOf(a), axleOf(b))) result.push([a, b]);
    }
  });
  return result;
}
