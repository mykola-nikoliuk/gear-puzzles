import { describe, expect, it } from 'vitest';
import { fraction } from '../core/fraction';
import { demoLevel } from '../levels/demo';
import { MOTOR_SPEEDS, motorVelocity, solveLabel, startsOpen, storedKey, storeKey } from './panel';

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
  const move = { gearId: 'g', axleId: 'a', layer: 0 };

  it('counts the moves', () => {
    expect(solveLabel({ moves: [move], system: demoLevel })).toBe('Solve: 1 move');
    expect(solveLabel({ moves: [move, move], system: demoLevel })).toBe('Solve: 2 moves');
  });

  it('says when there is nothing to do or no way to do it', () => {
    expect(solveLabel({ moves: [], system: demoLevel })).toBe('Solve: already solved');
    expect(solveLabel(null)).toBe('Solve: no solution');
  });
});

describe('startsOpen', () => {
  it('folds the panel on narrow windows and opens it on wide ones', () => {
    expect(startsOpen(984)).toBe(false);
    expect(startsOpen(1440)).toBe(true);
  });
});

describe('the stored key', () => {
  const memory = () => {
    const items = new Map<string, string>();
    return {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
      removeItem: (key: string) => void items.delete(key),
    };
  };

  it('comes back on the next visit', () => {
    const storage = memory();
    storeKey(storage, 'sk-test');
    expect(storedKey(storage)).toBe('sk-test');
  });

  it('is forgotten when cleared', () => {
    const storage = memory();
    storeKey(storage, 'sk-test');
    storeKey(storage, '');
    expect(storedKey(storage)).toBe('');
  });

  it('survives storage that throws or is missing', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => storeKey(blocked, 'sk-test')).not.toThrow();
    expect(storedKey(blocked)).toBe('');
    expect(storedKey(undefined)).toBe('');
  });
});
