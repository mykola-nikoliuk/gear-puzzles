import { describe, expect, it } from 'vitest';
import { fraction } from '../core/fraction';
import { moveGear } from '../core/placement';
import { demoSolution } from '../levels/demo';
import {
  authoredNote,
  writingNote,
  formatVelocity,
  goalText,
  levelTitle,
  offersNext,
  refusalText,
  statusText,
} from './hud';

describe('formatVelocity', () => {
  it('shows counter-clockwise speeds with ↺', () => {
    expect(formatVelocity(fraction(1, 16))).toBe('1/16 turn/s ↺');
  });

  it('shows clockwise speeds with ↻ and no minus sign', () => {
    expect(formatVelocity(fraction(-3, 8))).toBe('3/8 turn/s ↻');
  });

  it('can drop the unit for compact labels', () => {
    expect(formatVelocity(fraction(-1, 8), { unit: false })).toBe('1/8 ↻');
  });

  it('calls zero still', () => {
    expect(formatVelocity(fraction(0))).toBe('still');
  });
});

describe('texts', () => {
  it('describes the goal', () => {
    expect(goalText({ axleId: 'out', velocity: fraction(1, 4) })).toBe(
      'Goal: output at 1/4 turn/s ↺',
    );
  });

  it('describes each status', () => {
    expect(statusText({ kind: 'solved' })).toBe('Solved!');
    expect(statusText({ kind: 'idle' })).toMatch(/not connected/);
    expect(statusText({ kind: 'jammed' })).toMatch(/Jammed/);
    expect(statusText({ kind: 'reversed', velocity: fraction(-1, 4) })).toMatch(/wrong direction/);
    expect(statusText({ kind: 'wrong-speed', velocity: fraction(1, 2) })).toBe(
      'The output turns at 1/2 turn/s ↺',
    );
  });
});

describe('refusalText', () => {
  it('says nothing when some layer takes the gear', () => {
    expect(refusalText(demoSolution, 'idler-gear', 'spare-west')).toBeNull();
  });

  it('explains the motor axle', () => {
    expect(refusalText(demoSolution, 'idler-gear', 'motor')).toMatch(/motor/);
  });

  it('explains clashing teeth', () => {
    expect(refusalText(demoSolution, 'idler-gear', 'output')).toMatch(/clash/);
  });

  it('explains a full axle', () => {
    const idlerOnTop = moveGear(demoSolution, 'output-gear', null);
    const full = moveGear(idlerOnTop, 'compound-small', 'idler', 1);
    expect(refusalText(full, 'output-gear', 'idler')).toMatch(/Both layers/);
  });
});

describe('offersNext', () => {
  it('opens the way on only once solved', () => {
    expect(offersNext({ kind: 'solved' })).toBe(true);
    expect(offersNext({ kind: 'idle' })).toBe(false);
    expect(offersNext({ kind: 'jammed' })).toBe(false);
  });
});

describe('levelTitle', () => {
  it('calls the demo a tutorial and numbers the rest', () => {
    expect(levelTitle(0)).toBe('Tutorial');
    expect(levelTitle(3)).toBe('Level 3');
  });
});

describe('writingNote', () => {
  it('counts the tries', () => {
    expect(writingNote(1, 3, [])).toBe('Claude is writing a level (try 1 of 3)…');
  });

  it('says what the last try got wrong', () => {
    const note = writingNote(2, 3, ['"goal" says 1/8.', 'another']);
    expect(note).toContain('(try 2 of 3)');
    expect(note).toContain('caught 2 mistakes in the last one: "goal" says 1/8.');
  });
});

describe('authoredNote', () => {
  it('says how the level was proven and what was caught', () => {
    expect(authoredNote(3, 2)).toBe(
      'Written by Claude, proven by the solver: solvable in 3 moves. Checks caught 2 mistakes on the way.',
    );
  });

  it('leaves out a clean first try', () => {
    expect(authoredNote(2, 0)).toBe(
      'Written by Claude, proven by the solver: solvable in 2 moves.',
    );
  });

  it('falls back to the replayed solution when the solver gave up', () => {
    expect(authoredNote(null, 1)).toContain('replayed move by move. Checks caught 1 mistake');
  });
});
