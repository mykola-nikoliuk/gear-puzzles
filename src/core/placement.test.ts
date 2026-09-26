import { describe, expect, it } from 'vitest';
import { fraction } from './fraction';
import type { GearSystem } from './model';
import { bestLayer, moveGear, nearestAxle, placementError } from './placement';

const system: GearSystem = {
  axles: [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 10, y: 0 },
    { id: 'c', x: 30, y: 0 },
    { id: 'near-b', x: 12, y: 0 },
    { id: 'above-a', x: 0, y: 10 },
  ],
  gears: [
    { id: 'motor', axleId: 'a', teeth: 8, layer: 0 },
    { id: 'big', axleId: 'b', teeth: 12, layer: 0 },
    { id: 'loose', axleId: 'c', teeth: 10, layer: 0 },
    { id: 'upper', axleId: 'above-a', teeth: 6, layer: 1 },
  ],
  driver: { axleId: 'a', velocity: fraction(1) },
};

describe('placementError', () => {
  it('allows a move that meshes cleanly, ignoring gears on other layers', () => {
    // `big` meshes with the motor there; `upper` shares the axle but sits one layer higher.
    expect(placementError(system, 'big', 'above-a')).toBeNull();
  });

  it('refuses an axle taken on the same layer', () => {
    expect(placementError(system, 'loose', 'b')).toBe('occupied');
  });

  it('refuses overlapping teeth', () => {
    expect(placementError(system, 'loose', 'near-b')).toBe('collides');
  });

  it('keeps the motor gear in place', () => {
    expect(placementError(system, 'motor', 'c')).toBe('driver');
  });

  it('keeps other gears off the motor axle, even on a free layer', () => {
    expect(placementError(system, 'upper', 'a')).toBe('driver');
  });

  it('lets any gear but the motor go to the tray', () => {
    expect(placementError(system, 'big', null)).toBeNull();
    expect(placementError(system, 'motor', null)).toBe('driver');
  });

  it('frees an axle once its gear goes to the tray', () => {
    expect(placementError(system, 'big', 'c')).toBe('occupied');
    const cleared = moveGear(system, 'loose', null);
    expect(placementError(cleared, 'big', 'c')).toBeNull();
  });

  it('lets a gear change layer, even on a taken axle', () => {
    expect(placementError(system, 'loose', 'b', 1)).toBeNull();
    expect(placementError(system, 'big', 'above-a', 1)).toBe('occupied');
  });

  it('refuses layers the axles do not have', () => {
    expect(placementError(system, 'loose', 'c', 2)).toBe('no-layer');
    expect(placementError(system, 'loose', 'c', -1)).toBe('no-layer');
  });

  it('reports unknown ids', () => {
    expect(placementError(system, 'nope', 'c')).toBe('unknown-gear');
    expect(placementError(system, 'loose', 'nope')).toBe('unknown-axle');
  });
});

describe('moveGear', () => {
  it('returns a new system with the gear on its new axle', () => {
    const moved = moveGear(system, 'big', 'above-a');
    expect(moved.gears.find(({ id }) => id === 'big')?.axleId).toBe('above-a');
    expect(system.gears.find(({ id }) => id === 'big')?.axleId).toBe('b');
  });

  it('puts the gear on the given layer', () => {
    const moved = moveGear(system, 'loose', 'b', 1);
    expect(moved.gears.find(({ id }) => id === 'loose')).toMatchObject({ axleId: 'b', layer: 1 });
  });

  it('throws on a forbidden move', () => {
    expect(() => moveGear(system, 'loose', 'b')).toThrow(/occupied/);
  });
});

describe('bestLayer', () => {
  it('takes the lowest free layer', () => {
    expect(bestLayer(system, 'loose', 'c')).toBe(0);
  });

  it('goes up a layer when the one below is taken', () => {
    expect(bestLayer(system, 'loose', 'b')).toBe(1);
  });

  it('skips a free layer to mesh with a neighbour above', () => {
    // `upper` has 6 teeth at (0, 10); a 4-tooth gear 5 above it meshes on layer 1 only.
    const withSpur: GearSystem = {
      ...system,
      axles: [...system.axles, { id: 'over-upper', x: 0, y: 15 }],
      gears: [...system.gears, { id: 'spur', axleId: null, teeth: 4, layer: 0 }],
    };
    expect(placementError(withSpur, 'spur', 'over-upper', 0)).toBeNull();
    expect(bestLayer(withSpur, 'spur', 'over-upper')).toBe(1);
  });

  it('has nothing to offer where every layer is refused', () => {
    expect(bestLayer(system, 'loose', 'a')).toBeNull();
  });
});

describe('nearestAxle', () => {
  it('picks the closest axle in range', () => {
    expect(nearestAxle(system, 11.5, 0.5, 3)?.id).toBe('near-b');
  });

  it('finds nothing out of range', () => {
    expect(nearestAxle(system, 20, 20, 3)).toBeUndefined();
  });
});
