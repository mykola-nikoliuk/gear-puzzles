import { describe, expect, it } from 'vitest';
import { tipRadius } from '../core/model';
import { demoLevel } from '../levels/demo';
import type { GearSystem } from '../core/model';
import { mergeBounds, trayLayout, trayRows } from './tray';

const board = { minX: 0, maxX: 40, minY: 0, maxY: 20 };

describe('trayLayout', () => {
  const tray = trayLayout(demoLevel, board);

  it('has a slot for every gear but the motor gear', () => {
    expect([...tray.slots.keys()]).toEqual([
      'idler-gear',
      'compound-big',
      'compound-small',
      'output-gear',
    ]);
  });

  it('sits below the board', () => {
    expect(tray.bounds.maxY).toBeLessThan(board.minY);
  });

  it('centres the row under the board', () => {
    const { minX, maxX } = tray.bounds;
    expect((minX + maxX) / 2).toBeCloseTo(20);
  });

  it('centres the row on a given point', () => {
    const { minX, maxX } = trayLayout(demoLevel, board, 5).bounds;
    expect((minX + maxX) / 2).toBeCloseTo(5);
  });

  it('lines gears up without overlap', () => {
    const [first, second] = [...tray.slots.values()];
    const gap = (second?.x ?? 0) - (first?.x ?? 0);
    expect(gap).toBeGreaterThan(tipRadius(8) + tipRadius(24));
  });
});

describe('trayRows', () => {
  it('adds a row past 5 gears and another past 10', () => {
    expect([1, 5, 6, 10, 11, 15].map(trayRows)).toEqual([1, 1, 2, 2, 3, 3]);
  });
});

describe('trayLayout with many gears', () => {
  const crowded = (count: number): GearSystem => ({
    ...demoLevel,
    gears: [
      ...demoLevel.gears.filter((gear) => gear.axleId === demoLevel.driver.axleId),
      ...Array.from({ length: count }, (_, i) => ({
        id: `g${i}`,
        axleId: null,
        teeth: 12,
        layer: 0,
      })),
    ],
  });
  const rowsOf = (count: number) =>
    new Set([...trayLayout(crowded(count), board).slots.values()].map(({ y }) => y)).size;

  it('keeps up to 5 gears on one row', () => {
    expect(rowsOf(5)).toBe(1);
  });

  it('splits 6 to 10 gears over two rows', () => {
    expect(rowsOf(6)).toBe(2);
    expect(rowsOf(10)).toBe(2);
  });

  it('uses three rows beyond 10 gears', () => {
    expect(rowsOf(11)).toBe(3);
  });

  it('stacks rows downward without overlap', () => {
    const ys = [...new Set([...trayLayout(crowded(8), board).slots.values()].map(({ y }) => y))];
    const [first = 0, second = 0] = ys;
    expect(second).toBeLessThan(first - 2 * tipRadius(12));
  });
});

describe('mergeBounds', () => {
  it('covers both boxes', () => {
    expect(mergeBounds(board, { minX: -5, maxX: 10, minY: -8, maxY: 3 })).toEqual({
      minX: -5,
      maxX: 40,
      minY: -8,
      maxY: 20,
    });
  });
});
