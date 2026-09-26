import { describe, expect, it } from 'vitest';
import { fraction } from '../core/fraction';
import { formatVelocity, goalText, statusText } from './hud';

describe('formatVelocity', () => {
  it('shows counter-clockwise speeds with ↺', () => {
    expect(formatVelocity(fraction(1, 16))).toBe('1/16 turn/s ↺');
  });

  it('shows clockwise speeds with ↻ and no minus sign', () => {
    expect(formatVelocity(fraction(-3, 8))).toBe('3/8 turn/s ↻');
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
