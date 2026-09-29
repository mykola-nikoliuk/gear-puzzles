import { describe, expect, it } from 'vitest';
import { checkGoal } from '../core/goal';
import { moveGear } from '../core/placement';
import { propagate } from '../core/propagate';
import { buildLevel } from './build';
import type { LevelSpec } from './spec';

const spec: LevelSpec = {
  title: 'Slow it down',
  lesson: 'Two small-to-big meshes in a row multiply the slowdown.',
  motorTeeth: 12,
  axles: [{ teeth: 24, then: 12 }, { teeth: 24 }],
  goal: '1/16',
  spareAxles: 2,
  decoys: [8, 20],
  hints: [],
};

const errorsOf = (result: ReturnType<typeof buildLevel>) => (result.ok ? [] : result.errors);

describe('buildLevel', () => {
  it('builds a level that the solver can finish', () => {
    const result = buildLevel(spec, 1);
    if (!result.ok) throw new Error(result.errors.join('\n'));
    const { level, goal, minMoves, solutionMoves } = result.level;
    expect(solutionMoves).toBe(3);
    expect(minMoves).toBeGreaterThanOrEqual(2);
    expect(minMoves).toBeLessThanOrEqual(solutionMoves);
    expect(checkGoal(propagate(level), goal).kind).toBe('idle');
  });

  it('puts the decoys from the spec in the tray', () => {
    const result = buildLevel(spec, 1);
    const decoys = result.ok
      ? result.level.level.gears.filter(({ id }) => id.startsWith('decoy'))
      : [];
    expect(decoys.map(({ teeth }) => teeth).sort()).toEqual([20, 8]);
  });

  it('keeps the spec with the level', () => {
    const result = buildLevel(spec, 1);
    expect(result.ok && result.level.spec).toBe(spec);
  });

  it('gives the same level for the same seed', () => {
    expect(buildLevel(spec, 5)).toEqual(buildLevel(spec, 5));
  });

  it('can be solved by the moves it reports', () => {
    const result = buildLevel(spec, 2);
    if (!result.ok) throw new Error(result.errors.join('\n'));
    const { level, solution, goal } = result.level;
    const placed = solution.gears.filter(
      (gear) => gear.axleId !== null && gear.axleId !== solution.driver.axleId,
    );
    const board = placed.reduce(
      (layout, gear) => moveGear(layout, gear.id, gear.axleId, gear.layer),
      level,
    );
    expect(checkGoal(propagate(board), goal).kind).toBe('solved');
  });

  it('rejects a goal that does not match the train', () => {
    expect(errorsOf(buildLevel({ ...spec, goal: '1/8' }, 1))[0]).toContain('says 1/8');
  });

  it('rejects a level solved in one move', () => {
    const oneMove = { ...spec, axles: [{ teeth: 12 }], goal: '-1/4', decoys: [] };
    expect(errorsOf(buildLevel(oneMove, 1))[0]).toContain('not a puzzle');
  });
});
