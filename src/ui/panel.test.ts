import { describe, expect, it } from 'vitest';
import { fraction } from '../core/fraction';
import { MOTOR_SPEEDS, motorVelocity } from './panel';

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
