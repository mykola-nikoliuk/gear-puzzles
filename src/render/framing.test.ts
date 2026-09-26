import { describe, expect, it } from 'vitest';
import { demoGoal, demoSolution } from '../levels/demo';
import { focusPoint, frameCenter, halfExtents } from './framing';

describe('focusPoint', () => {
  it('sits halfway between the motor and the output', () => {
    // Motor at (0, 0), output at (27, 12).
    expect(focusPoint(demoSolution, demoGoal.axleId)).toEqual({ x: 13.5, y: 6 });
  });

  it('throws on an unknown output', () => {
    expect(() => focusPoint(demoSolution, 'nope')).toThrow(/Unknown axle/);
  });
});

describe('halfExtents', () => {
  const bounds = { minX: 0, maxX: 10, minY: -4, maxY: 2 };

  it('is half the size when centred', () => {
    expect(halfExtents(bounds, { x: 5, y: -1 })).toEqual({ width: 5, height: 3 });
  });

  it('reaches the far edge when off centre', () => {
    expect(halfExtents(bounds, { x: 2, y: 0 })).toEqual({ width: 8, height: 4 });
  });
});

describe('frameCenter', () => {
  it('keeps the focus across and centres the bounds up and down', () => {
    const bounds = { minX: 0, maxX: 10, minY: -30, maxY: 10 };
    expect(frameCenter(bounds, { x: 3, y: 5 })).toEqual({ x: 3, y: -10 });
  });
});
