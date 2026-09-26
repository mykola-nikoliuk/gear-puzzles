import { describe, expect, it } from 'vitest';
import { arcPosition, easeInOut, followFactor } from './motion';

describe('easeInOut', () => {
  it('runs from 0 to 1 and clamps outside', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(-1)).toBe(0);
    expect(easeInOut(2)).toBe(1);
  });
});

describe('arcPosition', () => {
  const from = { x: 0, y: 0, z: 0 };
  const to = { x: 10, y: 4, z: 2 };

  it('starts and ends at the given points', () => {
    expect(arcPosition(from, to, 0, 3)).toEqual(from);
    expect(arcPosition(from, to, 1, 3)).toEqual(to);
  });

  it('lifts the gear halfway through', () => {
    const middle = arcPosition(from, to, 0.5, 3);
    expect(middle.x).toBe(5);
    expect(middle.z).toBe(1 + 3);
  });
});

describe('followFactor', () => {
  it('does nothing without time and closes in on the target with it', () => {
    expect(followFactor(10, 0)).toBe(0);
    expect(followFactor(10, 0.1)).toBeGreaterThan(0.5);
    expect(followFactor(10, 10)).toBeCloseTo(1);
  });
});
