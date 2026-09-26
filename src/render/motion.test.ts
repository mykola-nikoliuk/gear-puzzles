import { describe, expect, it } from 'vitest';
import { carryLength, carryPosition, easeInOut, followFactor } from './motion';

describe('easeInOut', () => {
  it('runs from 0 to 1 and clamps outside', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(-1)).toBe(0);
    expect(easeInOut(2)).toBe(1);
  });
});

describe('carryPosition', () => {
  const from = { x: 0, y: 0, z: 0 };
  const to = { x: 10, y: 0, z: 2 };
  const carry = 5;

  it('starts and ends at the given points', () => {
    expect(carryPosition(from, to, carry, 0)).toEqual(from);
    expect(carryPosition(from, to, carry, 1)).toEqual(to);
  });

  it('rises straight up, crosses at the carry height and drops straight down', () => {
    // Path: 5 up, 10 across, 3 down; halfway along the 18 units is 4 units across.
    expect(carryPosition(from, to, carry, 0.5)).toEqual({ x: 4, y: 0, z: 5 });
    const early = carryPosition(from, to, carry, 0.1);
    expect([early.x, early.y]).toEqual([0, 0]);
    const late = carryPosition(from, to, carry, 0.95);
    expect([late.x, late.y]).toEqual([10, 0]);
  });

  it('just falls when released above its spot', () => {
    const above = { x: 10, y: 0, z: 5 };
    const falling = carryPosition(above, to, carry, 0.5);
    expect([falling.x, falling.y]).toEqual([10, 0]);
    expect(falling.z).toBeLessThan(5);
    expect(falling.z).toBeGreaterThan(2);
  });

  it('measures the whole path', () => {
    expect(carryLength(from, to, carry)).toBe(18);
  });
});

describe('followFactor', () => {
  it('does nothing without time and closes in on the target with it', () => {
    expect(followFactor(10, 0)).toBe(0);
    expect(followFactor(10, 0.1)).toBeGreaterThan(0.5);
    expect(followFactor(10, 10)).toBeCloseTo(1);
  });
});
