import { describe, expect, it } from 'vitest';
import { fraction } from './fraction';
import { findMeshes, meshes, pitchRadius, type Axle, type Gear, type GearSystem } from './model';

const axle = (id: string, x: number, y = 0): Axle => ({ id, x, y });
const gear = (id: string, axleId: string, teeth: number, layer = 0): Gear => ({
  id,
  axleId,
  teeth,
  layer,
});

describe('pitchRadius', () => {
  it('is half the tooth count', () => {
    expect(pitchRadius(12)).toBe(6);
  });
});

describe('meshes', () => {
  const a = axle('a', 0);
  const b = axle('b', 10);

  it('meshes when pitch circles touch', () => {
    expect(meshes(gear('g1', 'a', 8), gear('g2', 'b', 12), a, b)).toBe(true);
  });

  it('meshes on a diagonal', () => {
    const diagonal = axle('d', 6, 8);
    expect(meshes(gear('g1', 'a', 8), gear('g2', 'd', 12), a, diagonal)).toBe(true);
  });

  it('meshes with a little backlash', () => {
    expect(meshes(gear('g1', 'a', 8), gear('g2', 'b', 11), a, b)).toBe(true);
  });

  it('does not mesh when pushed closer than the pitch circles', () => {
    expect(meshes(gear('g1', 'a', 8), gear('g2', 'b', 13), a, b)).toBe(false);
  });

  it('does not mesh when too far apart', () => {
    expect(meshes(gear('g1', 'a', 8), gear('g2', 'b', 10), a, b)).toBe(false);
  });

  it('does not mesh across layers', () => {
    expect(meshes(gear('g1', 'a', 8, 0), gear('g2', 'b', 12, 1), a, b)).toBe(false);
  });

  it('does not mesh gears on the same axle', () => {
    expect(meshes(gear('g1', 'a', 8), gear('g2', 'a', 12), a, a)).toBe(false);
  });
});

describe('findMeshes', () => {
  const system = (gears: Gear[]): GearSystem => ({
    axles: [axle('a', 0), axle('b', 10), axle('c', 20)],
    gears,
    driver: { axleId: 'a', velocity: fraction(1) },
  });

  it('finds every meshing pair once', () => {
    const g1 = gear('g1', 'a', 8);
    const g2 = gear('g2', 'b', 12);
    const g3 = gear('g3', 'c', 8);
    expect(findMeshes(system([g1, g2, g3]))).toEqual([
      [g1, g2],
      [g2, g3],
    ]);
  });

  it('leaves gears in the tray out', () => {
    const g1 = gear('g1', 'a', 8);
    const tray: Gear = { id: 'g2', axleId: null, teeth: 12, layer: 0 };
    expect(findMeshes(system([g1, tray]))).toEqual([]);
  });

  it('throws on a gear with an unknown axle', () => {
    expect(() => findMeshes(system([gear('g1', 'a', 8), gear('g2', 'missing', 8)]))).toThrow(
      /unknown axle/,
    );
  });
});
