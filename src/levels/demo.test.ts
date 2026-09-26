import { describe, expect, it } from 'vitest';
import { checkGoal } from '../core/goal';
import { propagate } from '../core/propagate';
import { demoGoal, demoLevel, demoSolution } from './demo';

describe('demo level', () => {
  it('starts unsolved', () => {
    expect(checkGoal(propagate(demoLevel), demoGoal).kind).toBe('idle');
  });

  it('is solved by its solution', () => {
    expect(checkGoal(propagate(demoSolution), demoGoal).kind).toBe('solved');
  });
});
