import { describe, expect, it } from 'vitest';
import { pitchRadius } from '../core/model';
import { gearOutline, rootRadius, tipRadius, toothStep } from './gearOutline';

const radius = ({ x, y }: { x: number; y: number }) => Math.hypot(x, y);

describe('gearOutline', () => {
  it('has four points per tooth', () => {
    expect(gearOutline(12)).toHaveLength(48);
  });

  it('keeps every point between the root and tip circles', () => {
    for (const point of gearOutline(10)) {
      expect(radius(point)).toBeGreaterThanOrEqual(rootRadius(10) - 1e-9);
      expect(radius(point)).toBeLessThanOrEqual(tipRadius(10) + 1e-9);
    }
  });

  it('straddles the pitch circle', () => {
    expect(rootRadius(16)).toBeLessThan(pitchRadius(16));
    expect(tipRadius(16)).toBeGreaterThan(pitchRadius(16));
  });

  it('centres the first tooth on the +x axis', () => {
    const [, tipStart, tipEnd] = gearOutline(8);
    expect(tipStart?.y).toBeCloseTo(-(tipEnd?.y ?? 0));
    expect(tipStart?.x).toBeGreaterThan(0);
  });

  it('winds counter-clockwise', () => {
    const points = gearOutline(8);
    const doubledArea = points.reduce((sum, p, i) => {
      const next = points[(i + 1) % points.length] ?? p;
      return sum + p.x * next.y - next.x * p.y;
    }, 0);
    expect(doubledArea).toBeGreaterThan(0);
  });

  it('rejects too few or fractional teeth', () => {
    expect(() => gearOutline(2)).toThrow();
    expect(() => gearOutline(7.5)).toThrow();
  });
});

describe('toothStep', () => {
  it('splits a full turn evenly', () => {
    expect(toothStep(4)).toBeCloseTo(Math.PI / 2);
  });
});
