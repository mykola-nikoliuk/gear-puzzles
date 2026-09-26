import { applyPalette, GIFEncoder, quantize } from 'gifenc';

export interface Frame {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

/**
 * Evenly spaced times across one loop, ending just before it wraps, and the delay
 * between frames in milliseconds; about `fps` frames a second.
 */
export function loopFrames(period: number, fps: number): { times: number[]; delay: number } {
  const count = Math.max(1, Math.round(period * fps));
  const step = period / count;
  return { times: Array.from({ length: count }, (_, i) => i * step), delay: step * 1000 };
}

/** An endlessly repeating GIF; every frame shares the first frame's palette, so colours hold still. */
export function encodeLoop(frames: readonly Frame[], delay: number): Uint8Array<ArrayBuffer> {
  const [first] = frames;
  if (!first) throw new Error('A loop needs at least one frame');
  const palette = quantize(first.data, 256);
  const gif = GIFEncoder();
  frames.forEach(({ data, width, height }, i) => {
    const options = i === 0 ? { palette, delay, repeat: 0 } : { palette, delay };
    gif.writeFrame(applyPalette(data, palette), width, height, options);
  });
  gif.finish();
  return gif.bytes();
}
