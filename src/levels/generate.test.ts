import { describe, expect, it } from 'vitest';
import { checkGoal } from '../core/goal';
import { findMeshes } from '../core/model';
import { moveGear, placementError } from '../core/placement';
import { propagate } from '../core/propagate';
import { generateChain, generateLevel } from './generate';

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

describe('generateLevel', () => {
  const ids = (gears: readonly { id: string }[]) => gears.map(({ id }) => id).sort();

  it('gives the same puzzle for the same seed', () => {
    expect(generateLevel(9)).toEqual(generateLevel(9));
  });

  it('keeps the train the same whatever extras are asked for', () => {
    const plain = generateLevel(5, { spareAxles: 0, decoys: 0 });
    const busy = generateLevel(5, { spareAxles: 3, decoys: 4 });
    expect(busy.goal).toEqual(plain.goal);
    expect(busy.solution.axles.slice(0, plain.solution.axles.length)).toEqual(plain.solution.axles);
  });

  it('adds spare axles and decoys', () => {
    const { level } = generateLevel(4, { axles: 3, spareAxles: 2, decoys: 3 });
    expect(level.axles.filter(({ id }) => id.startsWith('spare-'))).toHaveLength(2);
    expect(level.gears.filter(({ id }) => id.startsWith('decoy-'))).toHaveLength(3);
  });

  it('starts with only the motor gear on the board', () => {
    for (const seed of seeds) {
      const { level, goal } = generateLevel(seed);
      expect(level.gears.filter(({ axleId }) => axleId !== null)).toHaveLength(1);
      expect(checkGoal(propagate(level), goal).kind).toBe('idle');
    }
  });

  it('leaves hints in place when asked', () => {
    const { level } = generateLevel(6, { axles: 4, keep: 2 });
    expect(level.gears.filter(({ axleId }) => axleId !== null)).toHaveLength(3);
  });

  it('can be put back together, one valid move at a time', () => {
    for (const seed of seeds) {
      const { level, solution, goal } = generateLevel(seed);
      expect(ids(level.gears)).toEqual(ids(solution.gears));

      let board = level;
      for (const gear of solution.gears) {
        if (gear.axleId === null || gear.axleId === solution.driver.axleId) continue;
        expect(placementError(board, gear.id, gear.axleId, gear.layer)).toBeNull();
        board = moveGear(board, gear.id, gear.axleId, gear.layer);
      }
      expect(checkGoal(propagate(board), goal).kind).toBe('solved');
    }
  });
});
