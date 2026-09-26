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

/** The hand-made demo is level 0, a tutorial; generated levels count from 1. */
export function levelTitle(number: number): string {
  return number === 0 ? 'Tutorial' : `Level ${number}`;
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

/** The way on to the next level opens once the puzzle is solved. */
export function offersNext(status: GoalStatus): boolean {
  return status.kind === 'solved';
}

export interface Hud {
  setTitle(title: string): void;
  setGoal(goal: Goal): void;
  setStatus(status: GoalStatus): void;
  /** A passing note under the status, such as why a drop is refused; `null` hides it. */
  setHint(text: string | null): void;
}

/** A small overlay with the goal, the live status, a hint line and, once solved, a way on. */
export function createHud(parent: HTMLElement, goal: Goal, onNext: () => void): Hud {
  const hud = document.createElement('div');
  hud.className = 'hud';
  const titleLine = document.createElement('div');
  titleLine.className = 'hud-title';
  titleLine.textContent = levelTitle(0);
  const goalLine = document.createElement('div');
  goalLine.textContent = goalText(goal);
  const statusLine = document.createElement('div');
  statusLine.className = 'hud-status';
  const hintLine = document.createElement('div');
  hintLine.className = 'hud-hint';
  hintLine.hidden = true;
  const next = document.createElement('button');
  next.className = 'hud-next';
  next.textContent = 'Next level →';
  next.hidden = true;
  next.addEventListener('click', onNext);
  hud.append(titleLine, goalLine, statusLine, hintLine, next);
  parent.append(hud);

  return {
    setTitle(title) {
      titleLine.textContent = title;
    },
    setGoal(next) {
      goalLine.textContent = goalText(next);
    },
    setStatus(status) {
      const text = statusText(status);
      if (statusLine.textContent === text) return;
      statusLine.textContent = text;
      statusLine.dataset.kind = status.kind;
      next.hidden = !offersNext(status);
    },
    setHint(text) {
      hintLine.textContent = text ?? '';
      hintLine.hidden = text === null;
    },
  };
}
