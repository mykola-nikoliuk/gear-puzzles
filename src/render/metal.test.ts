import { describe, expect, it } from 'vitest';
import { turnedGrooves, turnedTexture } from './metal';

describe('turnedGrooves', () => {
  const size = 64;
  const grooves = turnedGrooves(8, size);
  const at = (column: number, row: number) => grooves[row * size + column];

  it('fills a square map', () => {
    expect(grooves).toHaveLength(size * size);
  });

  it('runs in rings around the centre', () => {
    expect(at(10, 32)).toBe(at(size - 11, 31));
    expect(at(32, 10)).toBe(at(31, size - 11));
  });

  it('varies from groove to groove', () => {
    expect(new Set(grooves).size).toBeGreaterThan(10);
  });
});

describe('turnedTexture', () => {
  it('spans the gear around its axle', () => {
    const texture = turnedTexture(5);
    expect(texture.repeat.toArray()).toEqual([0.1, 0.1]);
    expect(texture.offset.toArray()).toEqual([0.5, 0.5]);
  });

  it('is shared between gears of one size', () => {
    expect(turnedTexture(5)).toBe(turnedTexture(5));
  });
});
