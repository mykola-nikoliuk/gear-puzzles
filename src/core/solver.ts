import { checkGoal, type Goal } from './goal';
import { LAYERS, type GearSystem } from './model';
import { moveGear, placementError } from './placement';
import { propagate } from './propagate';

export interface Move {
  readonly gearId: string;
  /** `null` puts the gear back in the tray. */
  readonly axleId: string | null;
  /** Ignored for the tray. */
  readonly layer: number;
}

export interface Solution {
  /** The shortest sequence of moves, empty if the start is already solved. */
  readonly moves: readonly Move[];
  readonly system: GearSystem;
}

export interface SolveOptions {
  /** Give up after exploring this many layouts. */
  readonly maxStates?: number;
}

/** Layouts that differ only in gear order, or in the layers of tray gears, are the same state. */
function layoutKey(system: GearSystem): string {
  return system.gears
    .map((gear) => (gear.axleId === null ? gear.id : `${gear.id}@${gear.axleId}:${gear.layer}`))
    .join('|');
}

/** Every spot a gear could go: each layer of each axle, and the tray. */
function destinations(system: GearSystem, gearId: string): Move[] {
  const current = system.gears.find(({ id }) => id === gearId)?.layer ?? 0;
  return [
    ...system.axles.flatMap(({ id: axleId }) =>
      Array.from({ length: LAYERS }, (_, layer) => ({ gearId, axleId, layer })),
    ),
    { gearId, axleId: null, layer: current },
  ];
}

const isSolved = (system: GearSystem, goal: Goal) =>
  checkGoal(propagate(system), goal).kind === 'solved';

/**
 * Breadth-first search over layouts, one gear move at a time (onto a layer of an axle or
 * into the tray), so the first solution found uses the fewest moves. Returns `null` if no layout
 * within reach meets the goal.
 */
export function solve(
  start: GearSystem,
  goal: Goal,
  { maxStates = 200_000 }: SolveOptions = {},
): Solution | null {
  if (isSolved(start, goal)) return { moves: [], system: start };

  const movable = start.gears.filter((gear) => gear.axleId !== start.driver.axleId);
  const visited = new Set([layoutKey(start)]);
  let frontier: Solution[] = [{ moves: [], system: start }];

  while (frontier.length > 0) {
    const next: Solution[] = [];
    for (const { moves, system } of frontier) {
      for (const { id: gearId } of movable) {
        for (const move of destinations(system, gearId)) {
          if (placementError(system, gearId, move.axleId, move.layer) !== null) continue;

          const moved = moveGear(system, gearId, move.axleId, move.layer);
          const key = layoutKey(moved);
          if (visited.has(key)) continue;
          visited.add(key);

          const candidate = { moves: [...moves, move], system: moved };
          if (isSolved(moved, goal)) return candidate;
          if (visited.size >= maxStates) return null;
          next.push(candidate);
        }
      }
    }
    frontier = next;
  }
  return null;
}
