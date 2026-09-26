import { tipRadius, type GearSystem } from '../core/model';
import type { Bounds } from './levelView';

/** Space between the board and the tray, and between gears on the tray. */
const GAP = 2;

export interface TrayLayout {
  /** Where each movable gear rests while it is in the tray. */
  readonly slots: ReadonlyMap<string, { readonly x: number; readonly y: number }>;
  readonly bounds: Bounds;
}

/**
 * A shelf under the board with a fixed slot for every gear that can move,
 * so the layout never shifts as gears come and go.
 */
export function trayLayout(system: GearSystem, board: Bounds): TrayLayout {
  const movable = system.gears.filter((gear) => gear.axleId !== system.driver.axleId);
  const tallest = Math.max(0, ...movable.map((gear) => tipRadius(gear.teeth)));
  const y = board.minY - GAP - tallest;

  const slots = new Map<string, { x: number; y: number }>();
  let x = board.minX;
  for (const gear of movable) {
    const r = tipRadius(gear.teeth);
    slots.set(gear.id, { x: x + r, y });
    x += 2 * r + GAP;
  }

  return {
    slots,
    bounds: { minX: board.minX, maxX: x - GAP, minY: y - tallest, maxY: y + tallest },
  };
}

export function mergeBounds(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    maxX: Math.max(a.maxX, b.maxX),
    minY: Math.min(a.minY, b.minY),
    maxY: Math.max(a.maxY, b.maxY),
  };
}
