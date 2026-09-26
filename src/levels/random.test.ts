import { describe, expect, it } from 'vitest';
import { createRandom } from './random';

describe('createRandom', () => {
  const draw = (seed: number) => {
    const random = createRandom(seed);
    return Array.from({ length: 5 }, () => random.next());
  };

  it('repeats itself for the same seed', () => {
    expect(draw(42)).toEqual(draw(42));
  });

  it('differs between seeds', () => {
    expect(draw(1)).not.toEqual(draw(2));
  });

  it('stays in [0, 1)', () => {
    const random = createRandom(7);
    for (let i = 0; i < 1000; i++) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('draws integers from both ends of the range', () => {
    const random = createRandom(3);
    const seen = new Set(Array.from({ length: 200 }, () => random.int(1, 3)));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('picks from the list and refuses an empty one', () => {
    const random = createRandom(5);
    expect(['a', 'b']).toContain(random.pick(['a', 'b']));
    expect(() => random.pick([])).toThrow(/empty/);
  });

  it('keeps chances at the edges', () => {
    const random = createRandom(9);
    expect(random.chance(0)).toBe(false);
    expect(random.chance(1)).toBe(true);
  });
});
