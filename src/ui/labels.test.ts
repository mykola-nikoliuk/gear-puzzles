import { describe, expect, it } from 'vitest';
import { propagate } from '../core/propagate';
import { demoLevel, demoSolution } from '../levels/demo';
import { axleInfo } from './labels';

describe('axleInfo', () => {
  const running = propagate(demoSolution);

  it('lists the teeth bottom layer first and the live speed', () => {
    // 12 teeth drive 24: half the motor's 1/4 turn/s, the other way round.
    expect(axleInfo(demoSolution, running, 'compound')).toEqual({
      teeth: '24T · 10T',
      speed: '1/8 ↻',
    });
  });

  it('shows the motor speed on the motor axle', () => {
    expect(axleInfo(demoSolution, running, 'motor')).toEqual({ teeth: '12T', speed: '1/4 ↺' });
  });

  it('marks gears the motor does not reach as idle', () => {
    expect(axleInfo(demoLevel, propagate(demoLevel), 'output')?.speed).toBe('idle');
  });

  it('marks everything jammed when the train locks', () => {
    expect(axleInfo(demoSolution, { kind: 'jammed', axleId: 'motor' }, 'motor')?.speed).toBe(
      'jammed',
    );
  });

  it('has nothing to say about an empty axle', () => {
    expect(axleInfo(demoSolution, running, 'spare-south')).toBeNull();
  });
});
