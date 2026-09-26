import { describe, expect, it } from 'vitest';
import { checkGoal } from '../core/goal';
import { findMeshes } from '../core/model';
import { placementError } from '../core/placement';
import { propagate } from '../core/propagate';
import { generateChain } from './generate';

const seeds = Array.from({ length: 200 }, (_, i) => i + 1);

describe('generateChain', () => {
  it('gives the same train for the same seed', () => {
    expect(generateChain(7)).toEqual(generateChain(7));
  });

  it('gives different trains for different seeds', () => {
    expect(generateChain(1)).not.toEqual(generateChain(2));
  });

  it('builds as many axles as asked, plus the motor', () => {
    expect(generateChain(3, { axles: 5 }).solution.axles).toHaveLength(6);
  });

  it('meets its own goal on the output axle', () => {
    for (const seed of seeds) {
      const { solution, goal } = generateChain(seed);
      expect(goal.axleId).not.toBe(solution.driver.axleId);
      expect(checkGoal(propagate(solution), goal).kind).toBe('solved');
    }
  });

  it('only uses moves the player could make', () => {
    for (const seed of seeds) {
      const { solution } = generateChain(seed);
      for (const gear of solution.gears) {
        if (gear.axleId === solution.driver.axleId) continue;
        expect(placementError(solution, gear.id, gear.axleId, gear.layer)).toBeNull();
      }
    }
  });

  it('keeps every pin out from under the gears', () => {
    for (const seed of seeds) {
      const { solution } = generateChain(seed);
      const axles = new Map(solution.axles.map((axle) => [axle.id, axle]));
      for (const gear of solution.gears) {
        const home = gear.axleId === null ? undefined : axles.get(gear.axleId);
        for (const axle of solution.axles) {
          if (!home || axle === home || axle.id === solution.driver.axleId) continue;
          expect(Math.hypot(axle.x - home.x, axle.y - home.y)).toBeGreaterThan(gear.teeth / 2);
        }
      }
    }
  });

  it('adds compound gears when asked', () => {
    const { solution } = generateChain(11, { axles: 4, compoundChance: 1 });
    expect(solution.gears.length).toBeGreaterThan(solution.axles.length);
    expect(findMeshes(solution).length).toBeGreaterThanOrEqual(4);
  });

  it('never stacks on the motor axle', () => {
    for (const seed of seeds) {
      const { solution } = generateChain(seed, { compoundChance: 1 });
      const onMotor = solution.gears.filter((gear) => gear.axleId === solution.driver.axleId);
      expect(onMotor).toHaveLength(1);
    }
  });
});
