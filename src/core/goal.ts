import { equals, negate } from './fraction';
import type { Velocity } from './model';
import type { Propagation } from './propagate';

/** What the level asks for: the output axle turning at an exact velocity. */
export interface Goal {
  readonly axleId: string;
  readonly velocity: Velocity;
}

export type GoalStatus =
  | { readonly kind: 'solved' }
  | { readonly kind: 'jammed' }
  /** The output axle is not connected to the motor. */
  | { readonly kind: 'idle' }
  /** Right speed, wrong way round. */
  | { readonly kind: 'reversed'; readonly velocity: Velocity }
  | { readonly kind: 'wrong-speed'; readonly velocity: Velocity };

export function checkGoal(propagation: Propagation, goal: Goal): GoalStatus {
  if (propagation.kind === 'jammed') return { kind: 'jammed' };

  const velocity = propagation.velocities.get(goal.axleId);
  if (!velocity) return { kind: 'idle' };
  if (equals(velocity, goal.velocity)) return { kind: 'solved' };
  if (equals(velocity, negate(goal.velocity))) return { kind: 'reversed', velocity };
  return { kind: 'wrong-speed', velocity };
}
