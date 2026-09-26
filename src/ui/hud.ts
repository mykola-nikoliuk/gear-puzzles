import { negate, toString } from '../core/fraction';
import type { Goal, GoalStatus } from '../core/goal';
import { LAYERS, type GearSystem, type Velocity } from '../core/model';
import { placementError } from '../core/placement';

/** "1/16 turn/s ↺" — the arrow shows the direction, counter-clockwise for positive. */
export function formatVelocity(velocity: Velocity, { unit = true } = {}): string {
  if (velocity.num === 0) return 'still';
  const speed = toString(velocity.num > 0 ? velocity : negate(velocity));
  return `${speed}${unit ? ' turn/s' : ''} ${velocity.num > 0 ? '↺' : '↻'}`;
}

export function goalText(goal: Goal): string {
  return `Goal: output at ${formatVelocity(goal.velocity)}`;
}

export function statusText(status: GoalStatus): string {
  switch (status.kind) {
    case 'solved':
      return 'Solved!';
    case 'jammed':
      return 'Jammed: the gears lock each other';
    case 'idle':
      return 'The output is not connected to the motor';
    case 'reversed':
      return 'Right speed, wrong direction';
    case 'wrong-speed':
      return `The output turns at ${formatVelocity(status.velocity)}`;
  }
}

/** Why a gear cannot be dropped on an axle, or `null` if some layer there takes it. */
export function refusalText(system: GearSystem, gearId: string, axleId: string): string | null {
  const errors = Array.from({ length: LAYERS }, (_, layer) =>
    placementError(system, gearId, axleId, layer),
  );
  if (errors.includes(null)) return null;
  if (errors.includes('driver')) return 'The motor axle takes no other gears';
  if (errors.includes('collides')) return 'Its teeth would clash with a neighbour';
  if (errors.includes('pin')) return 'It would run into another pin';
  if (errors.every((error) => error === 'occupied')) return 'Both layers of this axle are taken';
  return 'The gear cannot go here';
}

export interface Hud {
  setGoal(goal: Goal): void;
  setStatus(status: GoalStatus): void;
  /** A passing note under the status, such as why a drop is refused; `null` hides it. */
  setHint(text: string | null): void;
}

/** A small overlay with the goal, the live status and a hint line. */
export function createHud(parent: HTMLElement, goal: Goal): Hud {
  const hud = document.createElement('div');
  hud.className = 'hud';
  const goalLine = document.createElement('div');
  goalLine.textContent = goalText(goal);
  const statusLine = document.createElement('div');
  statusLine.className = 'hud-status';
  const hintLine = document.createElement('div');
  hintLine.className = 'hud-hint';
  hintLine.hidden = true;
  hud.append(goalLine, statusLine, hintLine);
  parent.append(hud);

  return {
    setGoal(next) {
      goalLine.textContent = goalText(next);
    },
    setStatus(status) {
      const text = statusText(status);
      if (statusLine.textContent === text) return;
      statusLine.textContent = text;
      statusLine.dataset.kind = status.kind;
    },
    setHint(text) {
      hintLine.textContent = text ?? '';
      hintLine.hidden = text === null;
    },
  };
}
