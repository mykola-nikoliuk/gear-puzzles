import { checkGoal, type Goal } from './goal';
import type { GearSystem } from './model';
import { moveGear, placementError } from './placement';
import { propagate } from './propagate';

export interface Move {
  readonly gearId: string;
  /** `null` puts the gear back in the tray. */
  readonly axleId: string | null;
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

/** Layouts that differ only in gear order are the same state. */
function layoutKey(system: GearSystem): string {
  return system.gears.map((gear) => `${gear.id}@${gear.axleId}`).join('|');
}

const isSolved = (system: GearSystem, goal: Goal) =>
  checkGoal(propagate(system), goal).kind === 'solved';

/**
 * Breadth-first search over layouts, one gear move at a time (onto an axle or into the
 * tray), so the first solution found uses the fewest moves. Returns `null` if no layout
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
        for (const axleId of [...system.axles.map(({ id }) => id), null]) {
          if (placementError(system, gearId, axleId) !== null) continue;

          const moved = moveGear(system, gearId, axleId);
          const key = layoutKey(moved);
          if (visited.has(key)) continue;
          visited.add(key);

          const candidate = { moves: [...moves, { gearId, axleId }], system: moved };
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
