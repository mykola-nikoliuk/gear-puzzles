import { describe, expect, it } from 'vitest';
import { checkGoal } from '../core/goal';
import { propagate } from '../core/propagate';
import { levelOptions, numberedLevel } from './progression';

describe('levelOptions', () => {
  it('starts with a short train and few extras', () => {
    expect(levelOptions(1)).toEqual({
      axles: 2,
      compoundChance: expect.closeTo(0.3) as number,
      spareAxles: 1,
      decoys: 1,
      keep: 0,
    });
  });

  it('grows harder level by level, up to a cap', () => {
    const early = levelOptions(2);
    const late = levelOptions(9);
    expect(late.axles).toBeGreaterThan(early.axles);
    expect(late.decoys).toBeGreaterThan(early.decoys);
    expect(levelOptions(100)).toEqual(levelOptions(200));
  });
});

describe('numberedLevel', () => {
  it('gives the same level for the same number', () => {
    expect(numberedLevel(3)).toEqual(numberedLevel(3));
  });

  it('gives a different level for the next number', () => {
    expect(numberedLevel(4).level).not.toEqual(numberedLevel(3).level);
  });

  it('keeps the first levels solvable by their known answer', () => {
    for (let number = 1; number <= 12; number++) {
      const { solution, goal } = numberedLevel(number);
      expect(checkGoal(propagate(solution), goal).kind).toBe('solved');
    }
  });
});
