import { equals, toString } from '../core/fraction';
import { checkGoal } from '../core/goal';
import { moveGear, placementError } from '../core/placement';
import { propagate } from '../core/propagate';
import { bottomUp, movesTo, solve } from '../core/solver';
import { chainFromPlan, levelFromChain, type GeneratedLevel } from './generate';
import { parseFraction, type LevelSpec } from './spec';

/** Search budget for the shortest solution; past it the level still has its checked one. */
const SOLVER_STATES = 100_000;
/** A level solved in fewer moves is not a puzzle. */
export const MIN_MOVES = 2;

export interface AuthoredLevel extends GeneratedLevel {
  readonly spec: LevelSpec;
  /** Moves in the built-in solution, each one checked as a legal move. */
  readonly solutionMoves: number;
  /** The fewest moves the solver found, `null` if it gave up before finding any. */
  readonly minMoves: number | null;
}

export type BuildResult =
  | { readonly ok: true; readonly level: AuthoredLevel }
  | { readonly ok: false; readonly errors: readonly string[] };

const fail = (...errors: string[]): BuildResult => ({ ok: false, errors });

/**
 * Lays a spec out on the board and proves it is a fair puzzle: the stated goal matches the
 * built train, the start is not already solved, the solution replays move by legal move,
 * and the solver finds no shortcut that makes it trivial.
 */
export function buildLevel(spec: LevelSpec, seed: number): BuildResult {
  const chain = chainFromPlan(spec, seed);
  if (!chain) {
    return fail(
      'These gears do not fit on the board: every layout tried had gears overlapping. ' +
        'Use smaller gears, especially stacked ("then") gears next to big neighbours.',
    );
  }

  const stated = parseFraction(spec.goal);
  if (!stated || !equals(stated, chain.goal.velocity)) {
    return fail(
      `"goal" says ${spec.goal}, but the built train turns the output at ` +
        `${toString(chain.goal.velocity)}.`,
    );
  }

  const built = levelFromChain(chain, seed, { spareAxles: spec.spareAxles, decoys: spec.decoys });
  const { level, solution, goal } = built;
  if (checkGoal(propagate(level), goal).kind === 'solved') {
    return fail('The level is solved before the player moves anything.');
  }

  let board = level;
  const moves = bottomUp(level, movesTo(level, solution));
  for (const move of moves) {
    const error = placementError(board, move.gearId, move.axleId, move.layer);
    if (error !== null) return fail(`The solution needs an illegal move (${error}).`);
    board = moveGear(board, move.gearId, move.axleId, move.layer);
  }
  if (checkGoal(propagate(board), goal).kind !== 'solved') {
    return fail('The built solution does not reach the goal.');
  }

  const shortest = solve(level, goal, { maxStates: SOLVER_STATES });
  const minMoves = shortest ? shortest.moves.length : null;
  if (minMoves !== null && minMoves < MIN_MOVES) {
    return fail(
      `The solver finishes this level in ${minMoves} move, so it is not a puzzle. ` +
        'Add an axle to the train or change the goal.',
    );
  }

  return {
    ok: true,
    level: { ...built, spec, solutionMoves: moves.length, minMoves },
  };
}
