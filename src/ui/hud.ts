import { negate, toString } from '../core/fraction';
import type { Goal, GoalStatus } from '../core/goal';
import type { Velocity } from '../core/model';

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

/** A small overlay with the goal and the live status; returns a function to update the status. */
export function createHud(parent: HTMLElement, goal: Goal): (status: GoalStatus) => void {
  const hud = document.createElement('div');
  hud.className = 'hud';
  const goalLine = document.createElement('div');
  goalLine.textContent = goalText(goal);
  const statusLine = document.createElement('div');
  statusLine.className = 'hud-status';
  hud.append(goalLine, statusLine);
  parent.append(hud);

  return (status) => {
    const text = statusText(status);
    if (statusLine.textContent === text) return;
    statusLine.textContent = text;
    statusLine.dataset.kind = status.kind;
  };
}
