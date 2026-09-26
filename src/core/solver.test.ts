import { describe, expect, it } from 'vitest';
import { demoGoal, demoLevel, demoSolution } from '../levels/demo';
import { fraction } from './fraction';
import { checkGoal, type Goal } from './goal';
import type { GearSystem } from './model';
import { propagate } from './propagate';
import { solve } from './solver';

describe('solve', () => {
  // The output axle `b` needs the 10-tooth gear, but a 6-tooth gear sits there first.
  const blocked: GearSystem = {
    axles: [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 10, y: 0 },
      { id: 'far', x: 50, y: 0 },
      { id: 'spare', x: 80, y: 0 },
    ],
    gears: [
      { id: 'motor', axleId: 'a', teeth: 10, layer: 0 },
      { id: 'small', axleId: 'b', teeth: 6, layer: 0 },
      { id: 'big', axleId: 'far', teeth: 10, layer: 0 },
    ],
    driver: { axleId: 'a', velocity: fraction(1) },
  };
  const goal: Goal = { axleId: 'b', velocity: fraction(-1) };

  it('solves the demo in one move', () => {
    const solution = solve(demoLevel, demoGoal);
    expect(solution?.moves).toEqual([{ gearId: 'compound-small', axleId: 'compound', layer: 1 }]);
  });

  it('needs no moves when the start is already solved', () => {
    expect(solve(demoSolution, demoGoal)?.moves).toEqual([]);
  });

  it('returns a layout that really meets the goal', () => {
    const solution = solve(demoLevel, demoGoal);
    expect(solution && checkGoal(propagate(solution.system), demoGoal).kind).toBe('solved');
  });

  it('clears an axle before using it', () => {
    const moves = solve(blocked, goal)?.moves;
    expect(moves).toHaveLength(2);
    expect(moves?.[0]?.gearId).toBe('small');
    expect(moves?.[1]).toEqual({ gearId: 'big', axleId: 'b', layer: 0 });
  });

  it('places a gear from the tray', () => {
    const inTray: GearSystem = {
      ...blocked,
      gears: blocked.gears.map((g) => (g.id === 'small' ? { ...g, axleId: null } : g)),
    };
    expect(solve(inTray, goal)?.moves).toEqual([{ gearId: 'big', axleId: 'b', layer: 0 }]);
  });

  it('lifts a gear to the free layer to clear the way', () => {
    const noSpare: GearSystem = {
      ...blocked,
      axles: blocked.axles.filter((a) => a.id !== 'spare'),
    };
    expect(solve(noSpare, goal)?.moves).toEqual([
      { gearId: 'small', axleId: 'b', layer: 1 },
      { gearId: 'big', axleId: 'b', layer: 0 },
    ]);
  });

  it('can clear the way by putting a gear in the tray', () => {
    // Every other spot for `small` is taken: the second layers of `b` and `far` hold caps.
    const crowded: GearSystem = {
      ...blocked,
      axles: blocked.axles.filter((a) => a.id !== 'spare'),
      gears: [
        ...blocked.gears,
        { id: 'cap-b', axleId: 'b', teeth: 6, layer: 1 },
        { id: 'cap-far', axleId: 'far', teeth: 6, layer: 1 },
      ],
    };
    expect(solve(crowded, goal)?.moves).toEqual([
      { gearId: 'small', axleId: null, layer: 0 },
      { gearId: 'big', axleId: 'b', layer: 0 },
    ]);
  });

  it('gives up on an impossible goal', () => {
    expect(solve(demoLevel, { axleId: 'output', velocity: fraction(7, 3) })).toBeNull();
  });

  it('gives up when the search budget runs out', () => {
    // Solvable in two moves, but not within three explored layouts.
    expect(solve(blocked, goal, { maxStates: 3 })).toBeNull();
  });
});
