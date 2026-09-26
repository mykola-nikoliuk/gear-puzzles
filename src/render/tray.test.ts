import { describe, expect, it } from 'vitest';
import { tipRadius } from '../core/model';
import { demoLevel } from '../levels/demo';
import { mergeBounds, trayLayout } from './tray';

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
