import { fraction } from '../core/fraction';
import type { Goal } from '../core/goal';
import {
  LAYERS,
  PIN_RADIUS,
  pitchRadius,
  tipRadius,
  type Axle,
  type Gear,
  type GearSystem,
} from '../core/model';
import { moveGear, placementError } from '../core/placement';
import { propagate } from '../core/propagate';
import { createRandom, type Random } from './random';

const MOTOR_TEETH = [10, 12, 14, 16] as const;
const TEETH = [8, 10, 12, 14, 16, 18, 20, 24] as const;
const MOTOR_VELOCITY = fraction(1, 4);
/** Axles closer than this look cramped, even when every gear fits. */
const MIN_AXLE_GAP = 4;
const PLACEMENT_TRIES = 40;
const ATTEMPTS = 50;

export interface ChainOptions {
  /** Axles in the train after the motor; the last one is the output. */
  readonly axles?: number;
  /** How often a gear on the train gets a second gear on the other layer of its axle. */
  readonly compoundChance?: number;
}

export interface GeneratedChain {
  /** The finished train, every gear on its axle. */
  readonly solution: GearSystem;
  readonly goal: Goal;
}

/** Puts a new gear in the tray, ready to be placed with `moveGear`. */
function withGear(system: GearSystem, gear: Gear): GearSystem {
  return { ...system, gears: [...system.gears, { ...gear, axleId: null }] };
}

/** A new pin at (x, y) must keep clear of other axles and of the gears already turning. */
function roomForAxle(system: GearSystem, x: number, y: number): boolean {
  const axles = new Map(system.axles.map((axle) => [axle.id, axle]));
  const nearAxle = system.axles.some((axle) => Math.hypot(axle.x - x, axle.y - y) < MIN_AXLE_GAP);
  const underGear = system.gears.some((gear) => {
    const axle = gear.axleId === null ? undefined : axles.get(gear.axleId);
    return (
      axle !== undefined && Math.hypot(axle.x - x, axle.y - y) < tipRadius(gear.teeth) + PIN_RADIUS
    );
  });
  return !nearAxle && !underGear;
}

/** Tries to mesh a new gear with `from` on a fresh axle at a random angle. */
function extend(
  random: Random,
  system: GearSystem,
  from: { readonly gear: Gear; readonly axle: Axle },
  index: number,
): { system: GearSystem; gear: Gear; axle: Axle } | null {
  const gear: Gear = {
    id: `gear-${index}`,
    axleId: null,
    teeth: random.pick(TEETH),
    layer: from.gear.layer,
  };
  const distance = pitchRadius(from.gear.teeth) + pitchRadius(gear.teeth);

  for (let i = 0; i < PLACEMENT_TRIES; i++) {
    const angle = random.next() * 2 * Math.PI;
    const axle: Axle = {
      id: `axle-${index}`,
      x: from.axle.x + distance * Math.cos(angle),
      y: from.axle.y + distance * Math.sin(angle),
    };
    if (!roomForAxle(system, axle.x, axle.y)) continue;

    const grown = withGear({ ...system, axles: [...system.axles, axle] }, gear);
    if (placementError(grown, gear.id, axle.id, gear.layer) !== null) continue;
    const placed = moveGear(grown, gear.id, axle.id, gear.layer);
    return { system: placed, gear: { ...gear, axleId: axle.id }, axle };
  }
  return null;
}

/** Adds a gear on the other layer of `on`, turning with it: half of a compound gear. */
function compound(
  random: Random,
  system: GearSystem,
  on: { readonly gear: Gear; readonly axle: Axle },
  index: number,
): { system: GearSystem; gear: Gear } | null {
  const layer = (on.gear.layer + 1) % LAYERS;
  const gear: Gear = { id: `gear-${index}`, axleId: null, teeth: random.pick(TEETH), layer };
  const grown = withGear(system, gear);
  if (placementError(grown, gear.id, on.axle.id, layer) !== null) return null;
  return {
    system: moveGear(grown, gear.id, on.axle.id, layer),
    gear: { ...gear, axleId: on.axle.id },
  };
}

function tryChain(random: Random, axles: number, compoundChance: number): GeneratedChain | null {
  const motor: Axle = { id: 'motor', x: 0, y: 0 };
  let gear: Gear = { id: 'gear-0', axleId: 'motor', teeth: random.pick(MOTOR_TEETH), layer: 0 };
  let system: GearSystem = {
    axles: [motor],
    gears: [gear],
    driver: { axleId: motor.id, velocity: MOTOR_VELOCITY },
  };
  let axle = motor;
  let gears = 1;

  for (let step = 1; step <= axles; step++) {
    if (axle !== motor && random.chance(compoundChance)) {
      const stacked = compound(random, system, { gear, axle }, gears);
      if (stacked) {
        ({ system, gear } = stacked);
        gears++;
      }
    }
    const next = extend(random, system, { gear, axle }, gears);
    if (!next) return null;
    ({ system, gear, axle } = next);
    gears++;
  }

  const propagation = propagate(system);
  if (propagation.kind !== 'running') return null;
  const velocity = propagation.velocities.get(axle.id);
  if (!velocity) return null;
  return { solution: system, goal: { axleId: axle.id, velocity } };
}

/**
 * A random working gear train from the motor to an output axle. The same seed and options
 * always give the same train. Throws if no train fits after many attempts.
 */
export function generateChain(
  seed: number,
  { axles = 3, compoundChance = 0.4 }: ChainOptions = {},
): GeneratedChain {
  const random = createRandom(seed);
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const chain = tryChain(random, axles, compoundChance);
    if (chain) return chain;
  }
  throw new Error(`No gear train with ${axles} axles fits for seed ${seed}`);
}

export interface LevelOptions extends ChainOptions {
  /** Empty axles off the train, room to try things out. */
  readonly spareAxles?: number;
  /** Gears the solution does not need, waiting in the tray. */
  readonly decoys?: number;
  /** Gears of the solution left in place as a hint. */
  readonly keep?: number;
}

export interface GeneratedLevel extends GeneratedChain {
  /** The puzzle as the player gets it: the train taken apart into the tray. */
  readonly level: GearSystem;
}

/** Room around the train where spare axles may land. */
const SPARE_MARGIN = 6;

function shuffle<T>(random: Random, items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = random.int(0, i);
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

function addSpareAxles(random: Random, solution: GearSystem, count: number): Axle[] {
  const xs = solution.axles.map(({ x }) => x);
  const ys = solution.axles.map(({ y }) => y);
  const [minX, maxX] = [Math.min(...xs) - SPARE_MARGIN, Math.max(...xs) + SPARE_MARGIN];
  const [minY, maxY] = [Math.min(...ys) - SPARE_MARGIN, Math.max(...ys) + SPARE_MARGIN];

  let system = solution;
  const spares: Axle[] = [];
  for (let i = 0; spares.length < count && i < count * PLACEMENT_TRIES; i++) {
    const x = minX + random.next() * (maxX - minX);
    const y = minY + random.next() * (maxY - minY);
    if (!roomForAxle(system, x, y)) continue;
    const axle = { id: `spare-${spares.length + 1}`, x, y };
    spares.push(axle);
    system = { ...system, axles: [...system.axles, axle] };
  }
  return spares;
}

/**
 * A puzzle built backwards: a working train, a few spare axles that keep clear of it and
 * decoy gears, then every gear but the motor's (and `keep` hints) goes to a shuffled tray.
 * Solvable by construction; other layouts that meet the goal count too.
 */
export function generateLevel(
  seed: number,
  { spareAxles = 2, decoys = 2, keep = 0, ...chain }: LevelOptions = {},
): GeneratedLevel {
  const { solution, goal } = generateChain(seed, chain);
  // A separate stream, so changing the extras never changes the train itself.
  const random = createRandom(seed ^ 0x9e3779b9);

  const spares = addSpareAxles(random, solution, spareAxles);
  const extras: Gear[] = Array.from({ length: decoys }, (_, i) => ({
    id: `decoy-${i + 1}`,
    axleId: null,
    teeth: random.pick(TEETH),
    layer: 0,
  }));
  const movable = solution.gears.filter((gear) => gear.axleId !== solution.driver.axleId);
  const kept = new Set(
    shuffle(random, movable)
      .slice(0, keep)
      .map(({ id }) => id),
  );

  const gears = solution.gears.map((gear) =>
    gear.axleId === solution.driver.axleId || kept.has(gear.id)
      ? gear
      : // All on layer 0, so the tray's colours give no hint of which gears stack.
        { ...gear, axleId: null, layer: 0 },
  );
  const [motorGear, ...rest] = gears;
  const level: GearSystem = {
    ...solution,
    axles: [...solution.axles, ...spares],
    gears: [...(motorGear ? [motorGear] : []), ...shuffle(random, [...rest, ...extras])],
  };
  return { solution: { ...level, gears: [...solution.gears, ...extras] }, goal, level };
}
