import { describe, expect, it } from 'vitest';
import { fraction } from '../core/fraction';
import { checkGoal } from '../core/goal';
import { findMeshes } from '../core/model';
import { moveGear, placementError } from '../core/placement';
import { propagate } from '../core/propagate';
import { movesTo } from '../core/solver';
import { chainFromPlan, generateChain, generateLevel } from './generate';

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

describe('chainFromPlan', () => {
  // 12 → 24 on axle 1, whose stacked 12 drives 24 on axle 2: two 1:2 steps down.
  const plan = { motorTeeth: 12, axles: [{ teeth: 24, then: 12 }, { teeth: 24 }] };

  it('builds the gears the plan asks for', () => {
    const chain = chainFromPlan(plan, 1);
    expect(chain?.solution.gears.map(({ axleId, teeth, layer }) => [axleId, teeth, layer])).toEqual(
      [
        ['motor', 12, 0],
        ['axle-1', 24, 0],
        ['axle-1', 12, 1],
        ['axle-3', 24, 1],
      ],
    );
  });

  it('sets the goal to the output speed', () => {
    expect(chainFromPlan(plan, 1)?.goal).toEqual({ axleId: 'axle-3', velocity: fraction(1, 16) });
  });

  it('meets its own goal with moves the player could make', () => {
    for (const seed of seeds.slice(0, 50)) {
      const chain = chainFromPlan(plan, seed);
      if (!chain) throw new Error(`No layout for seed ${seed}`);
      expect(checkGoal(propagate(chain.solution), chain.goal).kind).toBe('solved');
      for (const gear of chain.solution.gears) {
        if (gear.axleId === chain.solution.driver.axleId) continue;
        expect(placementError(chain.solution, gear.id, gear.axleId, gear.layer)).toBeNull();
      }
    }
  });

  it('lays the same plan out the same way for the same seed', () => {
    expect(chainFromPlan(plan, 3)).toEqual(chainFromPlan(plan, 3));
    expect(chainFromPlan(plan, 3)).not.toEqual(chainFromPlan(plan, 4));
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

  it('gives no hint of the layers in the tray', () => {
    const { level } = generateLevel(11, { axles: 4, compoundChance: 1 });
    const inTray = level.gears.filter(({ axleId }) => axleId === null);
    expect(inTray.every(({ layer }) => layer === 0)).toBe(true);
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

  it('is solved by replaying the moves to its solution', () => {
    for (const seed of seeds) {
      const { level, solution, goal } = generateLevel(seed, { keep: 1 });
      const board = movesTo(level, solution).reduce(
        (layout, { gearId, axleId, layer }) => moveGear(layout, gearId, axleId, layer),
        level,
      );
      expect(checkGoal(propagate(board), goal).kind).toBe('solved');
    }
  });
});
