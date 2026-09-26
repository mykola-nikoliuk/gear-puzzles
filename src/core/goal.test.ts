import { describe, expect, it } from 'vitest';
import { fraction } from './fraction';
import { checkGoal, type Goal } from './goal';
import type { Propagation } from './propagate';

const goal: Goal = { axleId: 'out', velocity: fraction(1, 4) };
const running = (velocity?: ReturnType<typeof fraction>): Propagation => ({
  kind: 'running',
  velocities: new Map(velocity ? [['out', velocity]] : []),
});

describe('checkGoal', () => {
  it('is solved at the exact velocity', () => {
    expect(checkGoal(running(fraction(2, 8)), goal)).toEqual({ kind: 'solved' });
  });

  it('spots the right speed in the wrong direction', () => {
    expect(checkGoal(running(fraction(-1, 4)), goal)).toEqual({
      kind: 'reversed',
      velocity: fraction(-1, 4),
    });
  });

  it('reports a wrong speed', () => {
    expect(checkGoal(running(fraction(1, 2)), goal)).toEqual({
      kind: 'wrong-speed',
      velocity: fraction(1, 2),
    });
  });

  it('is idle when the output is not connected', () => {
    expect(checkGoal(running(), goal)).toEqual({ kind: 'idle' });
  });

  it('is jammed when the train is jammed', () => {
    expect(checkGoal({ kind: 'jammed', axleId: 'x' }, goal)).toEqual({ kind: 'jammed' });
  });
});
