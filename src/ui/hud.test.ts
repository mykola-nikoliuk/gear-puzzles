import { describe, expect, it } from 'vitest';
import { fraction } from '../core/fraction';
import { moveGear } from '../core/placement';
import { demoSolution } from '../levels/demo';
import { formatVelocity, goalText, offersNext, refusalText, statusText } from './hud';

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
