import { describe, expect, it } from 'vitest';
import { fraction } from './fraction';
import type { Axle, Gear, GearSystem } from './model';
import { propagate } from './propagate';

const axle = (id: string, x: number, y = 0): Axle => ({ id, x, y });
const gear = (id: string, axleId: string, teeth: number, layer = 0): Gear => ({
  id,
  axleId,
  teeth,
  layer,
});

function system(axles: Axle[], gears: Gear[], driverId = 'a'): GearSystem {
  return { axles, gears, driver: { axleId: driverId, velocity: fraction(1) } };
}

function velocities(result: ReturnType<typeof propagate>) {
  if (result.kind !== 'running') throw new Error(`Expected running, got ${result.kind}`);
  return Object.fromEntries(result.velocities);
}

describe('propagate', () => {
  it('spins only the driver when nothing is meshed', () => {
    const result = propagate(system([axle('a', 0), axle('b', 50)], [gear('g1', 'a', 8)]));
    expect(velocities(result)).toEqual({ a: fraction(1) });
  });

  it('reverses direction and scales speed by the tooth ratio', () => {
    // 8 teeth drive 12 teeth: 8/12 = 2/3 of the speed, opposite direction.
    const result = propagate(
      system([axle('a', 0), axle('b', 10)], [gear('g1', 'a', 8), gear('g2', 'b', 12)]),
    );
    expect(velocities(result).b).toEqual(fraction(-2, 3));
  });

  it('keeps the input direction through an idler and cancels its ratio', () => {
    const result = propagate(
      system(
        [axle('a', 0), axle('b', 10), axle('c', 25)],
        [gear('g1', 'a', 8), gear('g2', 'b', 12), gear('g3', 'c', 18)],
      ),
    );
    expect(velocities(result).c).toEqual(fraction(4, 9));
  });

  it('multiplies ratios through a compound gear on a shared axle', () => {
    // Layer 0: 8 → 16 (−1/2). Layer 1 on the same axle: 8 → 16 (−1/2). Total 1/4.
    const result = propagate(
      system(
        [axle('a', 0), axle('b', 12), axle('c', 24)],
        [
          gear('g1', 'a', 8, 0),
          gear('g2', 'b', 16, 0),
          gear('g3', 'b', 8, 1),
          gear('g4', 'c', 16, 1),
        ],
      ),
    );
    expect(velocities(result)).toEqual({
      a: fraction(1),
      b: fraction(-1, 2),
      c: fraction(1, 4),
    });
  });

  it('leaves unconnected axles idle', () => {
    const result = propagate(
      system(
        [axle('a', 0), axle('b', 10), axle('c', 100)],
        [gear('g1', 'a', 8), gear('g2', 'b', 12), gear('g3', 'c', 8)],
      ),
    );
    expect(velocities(result)).not.toHaveProperty('c');
  });

  it('jams a triangle of three meshed gears', () => {
    // Three equal gears touching pairwise: an odd loop cannot agree on direction.
    const h = Math.sqrt(3) * 5;
    const result = propagate(
      system(
        [axle('a', 0), axle('b', 10), axle('c', 5, h)],
        [gear('g1', 'a', 10), gear('g2', 'b', 10), gear('g3', 'c', 10)],
      ),
    );
    expect(result.kind).toBe('jammed');
  });

  it('runs a square of four meshed gears', () => {
    const result = propagate(
      system(
        [axle('a', 0, 0), axle('b', 10, 0), axle('c', 10, 10), axle('d', 0, 10)],
        [gear('g1', 'a', 10), gear('g2', 'b', 10), gear('g3', 'c', 10), gear('g4', 'd', 10)],
      ),
    );
    expect(velocities(result).c).toEqual(fraction(1));
  });

  it('throws when the driver axle does not exist', () => {
    expect(() => propagate(system([axle('a', 0)], [], 'missing'))).toThrow(/unknown axle/);
  });
});
