import { describe, expect, it } from 'vitest';
import { Clock } from './clock';

function fakeTime() {
  let time = 0;
  return { source: () => time, advance: (seconds: number) => (time += seconds) };
}

describe('Clock', () => {
  it('follows its source', () => {
    const time = fakeTime();
    const clock = new Clock(time.source);
    time.advance(2);
    expect(clock.now()).toBe(2);
  });

  it('stands still while paused', () => {
    const time = fakeTime();
    const clock = new Clock(time.source);
    time.advance(1);
    clock.paused = true;
    time.advance(5);
    expect(clock.now()).toBe(1);
  });

  it('resumes where it stopped', () => {
    const time = fakeTime();
    const clock = new Clock(time.source);
    time.advance(1);
    clock.paused = true;
    time.advance(5);
    clock.paused = false;
    time.advance(2);
    expect(clock.now()).toBe(3);
  });

  it('ignores repeated pauses', () => {
    const time = fakeTime();
    const clock = new Clock(time.source);
    clock.paused = true;
    time.advance(1);
    clock.paused = true;
    clock.paused = false;
    expect(clock.now()).toBe(0);
  });
});
