import { describe, expect, it } from 'vitest';
import { encodeLoop, loopFrames } from './loopGif';

describe('loopFrames', () => {
  it('spreads the frames over one loop without repeating the first', () => {
    expect(loopFrames(4, 1)).toEqual({ times: [0, 1, 2, 3], delay: 1000 });
  });

  it('rounds the frame count so the loop stays exact', () => {
    const { times, delay } = loopFrames(1, 30.4);
    expect(times).toHaveLength(30);
    expect(delay * times.length).toBeCloseTo(1000);
  });
});

describe('encodeLoop', () => {
  const frame = (shade: number) => ({
    data: new Uint8ClampedArray(4 * 4).fill(shade),
    width: 2,
    height: 2,
  });

  it('writes a GIF that repeats forever', () => {
    const text = new TextDecoder().decode(encodeLoop([frame(0), frame(255)], 40));
    expect(text.startsWith('GIF89a')).toBe(true);
    expect(text).toContain('NETSCAPE2.0');
  });

  it('refuses an empty loop', () => {
    expect(() => encodeLoop([], 40)).toThrow();
  });
});
