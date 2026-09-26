import { describe, expect, it } from 'vitest';
import { fraction } from '../core/fraction';
import { demoLevel } from '../levels/demo';
import { MOTOR_SPEEDS, motorVelocity, solveLabel } from './panel';

describe('motorVelocity', () => {
  it('parses every offered speed', () => {
    expect(MOTOR_SPEEDS.map((speed) => motorVelocity(speed, false))).toEqual([
      fraction(1, 8),
      fraction(1, 4),
      fraction(1, 2),
      fraction(1),
    ]);
  });

  it('turns clockwise when reversed', () => {
    expect(motorVelocity('1/2', true)).toEqual(fraction(-1, 2));
  });
});

describe('solveLabel', () => {
  const move = { gearId: 'g', axleId: 'a' };

  it('counts the moves', () => {
    expect(solveLabel({ moves: [move], system: demoLevel })).toBe('Solve: 1 move');
    expect(solveLabel({ moves: [move, move], system: demoLevel })).toBe('Solve: 2 moves');
  });

  it('says when there is nothing to do or no way to do it', () => {
    expect(solveLabel({ moves: [], system: demoLevel })).toBe('Solve: already solved');
    expect(solveLabel(null)).toBe('Solve: no solution');
  });
});
