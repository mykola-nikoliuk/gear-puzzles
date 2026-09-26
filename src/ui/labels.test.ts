import { describe, expect, it } from 'vitest';
import { propagate } from '../core/propagate';
import { demoLevel, demoSolution } from '../levels/demo';
import { axleSpeed } from './labels';

describe('axleSpeed', () => {
  const running = propagate(demoSolution);

  it('shows the live speed and direction', () => {
    // 12 teeth drive 24: half the motor's 1/4 turn/s, the other way round.
    expect(axleSpeed(demoSolution, running, 'compound')).toBe('1/8 ↻');
    expect(axleSpeed(demoSolution, running, 'motor')).toBe('1/4 ↺');
  });

  it('marks gears the motor does not reach as idle', () => {
    expect(axleSpeed(demoLevel, propagate(demoLevel), 'output')).toBe('idle');
  });

  it('marks everything jammed when the train locks', () => {
    expect(axleSpeed(demoSolution, { kind: 'jammed', axleId: 'motor' }, 'motor')).toBe('jammed');
  });

  it('has nothing to say about an empty axle', () => {
    expect(axleSpeed(demoSolution, running, 'spare-south')).toBeNull();
  });
});
