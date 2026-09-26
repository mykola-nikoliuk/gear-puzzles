import { describe, expect, it } from 'vitest';
import { fraction } from './fraction';
import type { GearSystem } from './model';
import { moveGear, nearestAxle, placementError } from './placement';

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

  it('throws on a forbidden move', () => {
    expect(() => moveGear(system, 'loose', 'b')).toThrow(/occupied/);
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
