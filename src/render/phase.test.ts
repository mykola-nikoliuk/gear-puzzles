import { describe, expect, it } from 'vitest';
import { fraction } from '../core/fraction';
import type { Axle, Gear, GearSystem } from '../core/model';
import { toothStep } from './gearOutline';
import { initialAngles, meshedAngle } from './phase';

/** Where `direction` falls within a gear's tooth cycle: 0 is a tooth centre, 0.5 a gap centre. */
function toothPhase(angle: number, teeth: number, direction: number): number {
  const cycles = (direction - angle) / toothStep(teeth);
  return ((cycles % 1) + 1) % 1;
}

describe('meshedAngle', () => {
  it('puts a gap of B where a tooth of A points at it', () => {
    const angleB = meshedAngle(0, 8, 12, 0);
    expect(toothPhase(0, 8, 0)).toBeCloseTo(0);
    expect(toothPhase(angleB, 12, Math.PI)).toBeCloseTo(0.5);
  });

  it('keeps the teeth interlocked while the pair turns at the gear ratio', () => {
    const contact = 0.7;
    const angleB = meshedAngle(0, 8, 12, contact);
    for (const turn of [0.1, 0.35, 1.2]) {
      const rotatedA = turn;
      const rotatedB = angleB - (turn * 8) / 12;
      expect(meshedAngle(rotatedA, 8, 12, contact)).toBeCloseTo(rotatedB);
    }
  });
});

describe('initialAngles', () => {
  const axles: Axle[] = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 10, y: 0 },
    { id: 'c', x: 40, y: 0 },
  ];
  const gears: Gear[] = [
    { id: 'g1', axleId: 'a', teeth: 8, layer: 0 },
    { id: 'g2', axleId: 'b', teeth: 12, layer: 0 },
    { id: 'g3', axleId: 'c', teeth: 10, layer: 0 },
  ];
  const system: GearSystem = { axles, gears, driver: { axleId: 'a', velocity: fraction(1) } };

  it('gives every gear an angle', () => {
    expect([...initialAngles(system).keys()]).toEqual(['g1', 'g2', 'g3']);
  });

  it('aligns meshed gears and starts loose gears at zero', () => {
    const angles = initialAngles(system);
    expect(toothPhase(angles.get('g2') ?? NaN, 12, Math.PI)).toBeCloseTo(0.5);
    expect(angles.get('g3')).toBe(0);
  });
});
