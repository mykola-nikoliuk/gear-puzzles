import { tipRadius, type GearSystem } from '../core/model';
import type { Bounds } from './levelView';

/** Space between the board and the tray, and between gears on the tray. */
const GAP = 2;

export interface TrayLayout {
  /** Where each movable gear rests while it is in the tray. */
  readonly slots: ReadonlyMap<string, { readonly x: number; readonly y: number }>;
  readonly bounds: Bounds;
}

/** Rows the tray needs: one for up to 5 gears, two for up to 10, three beyond. */
export function trayRows(gears: number): number {
  return gears <= 5 ? 1 : gears <= 10 ? 2 : 3;
}

/**
 * A shelf under the board with a fixed slot for every gear that can move,
 * so the layout never shifts as gears come and go. Gears share out evenly over `trayRows`
 * rows, each row centred on `centerX`, the middle of the board unless given.
 */
export function trayLayout(
  system: GearSystem,
  board: Bounds,
  centerX = (board.minX + board.maxX) / 2,
): TrayLayout {
  const movable = system.gears.filter((gear) => gear.axleId !== system.driver.axleId);
  const perRow = Math.ceil(movable.length / trayRows(movable.length));
  const rows = Array.from({ length: Math.ceil(movable.length / perRow) }, (_, i) =>
    movable.slice(i * perRow, (i + 1) * perRow),
  );

  const slots = new Map<string, { x: number; y: number }>();
  let top = board.minY - GAP;
  let bounds: Bounds | null = null;
  for (const row of rows) {
    const tallest = Math.max(...row.map((gear) => tipRadius(gear.teeth)));
    const y = top - tallest;
    const width =
      row.reduce((sum, gear) => sum + 2 * tipRadius(gear.teeth), 0) + GAP * (row.length - 1);
    const minX = centerX - width / 2;

    let x = minX;
    for (const gear of row) {
      const r = tipRadius(gear.teeth);
      slots.set(gear.id, { x: x + r, y });
      x += 2 * r + GAP;
    }
    const rowBounds = { minX, maxX: minX + width, minY: y - tallest, maxY: y + tallest };
    bounds = bounds ? mergeBounds(bounds, rowBounds) : rowBounds;
    top = y - tallest - GAP;
  }

  // An empty tray still gets a flat spot under the board, so the shelf has somewhere to be.
  const y = board.minY - GAP;
  return { slots, bounds: bounds ?? { minX: centerX, maxX: centerX, minY: y, maxY: y } };
}

export function mergeBounds(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    maxX: Math.max(a.maxX, b.maxX),
    minY: Math.min(a.minY, b.minY),
    maxY: Math.max(a.maxY, b.maxY),
  };
}
