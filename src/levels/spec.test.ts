import { describe, expect, it } from 'vitest';
import { fraction } from '../core/fraction';
import { outputVelocity, parseFraction, parseSpec } from './spec';

const valid = {
  title: 'Slow it down',
  lesson: 'Two small-to-big meshes in a row multiply the slowdown.',
  motorTeeth: 12,
  axles: [{ teeth: 24, then: 12 }, { teeth: 24 }],
  goal: '1/16',
  spareAxles: 2,
  decoys: [8, 20],
  hints: ['A stacked gear turns with its axle.'],
};

const errorsOf = (input: unknown) => {
  const result = parseSpec(input);
  return result.ok ? [] : result.errors;
};

describe('parseFraction', () => {
  it('reads fractions and whole numbers', () => {
    expect(parseFraction('3/8')).toEqual(fraction(3, 8));
    expect(parseFraction(' -2 / 4 ')).toEqual(fraction(-1, 2));
    expect(parseFraction('2')).toEqual(fraction(2));
  });

  it('rejects anything else', () => {
    expect(parseFraction('0.5')).toBeNull();
    expect(parseFraction('1/0')).toBeNull();
    expect(parseFraction('a/b')).toBeNull();
  });
});

describe('outputVelocity', () => {
  it('flips direction on every mesh', () => {
    expect(outputVelocity({ motorTeeth: 12, axles: [{ teeth: 12 }] })).toEqual(fraction(-1, 4));
    expect(outputVelocity({ motorTeeth: 12, axles: [{ teeth: 12 }, { teeth: 12 }] })).toEqual(
      fraction(1, 4),
    );
  });

  it('drives the next axle from the stacked gear', () => {
    expect(outputVelocity(valid)).toEqual(fraction(1, 16));
  });

  it('lets an idler change direction but not speed', () => {
    const plan = { motorTeeth: 10, axles: [{ teeth: 24 }, { teeth: 20 }] };
    expect(outputVelocity(plan)).toEqual(fraction(1, 8));
  });
});

describe('parseSpec', () => {
  it('accepts a valid spec', () => {
    expect(parseSpec(valid)).toEqual({ ok: true, spec: valid });
  });

  it('normalises the goal', () => {
    const result = parseSpec({ ...valid, goal: '2/32' });
    expect(result.ok && result.spec.goal).toBe('1/16');
  });

  it('catches a goal that does not match the gears', () => {
    const [error] = errorsOf({ ...valid, goal: '1/8' });
    expect(error).toContain('says 1/8, but this train turns the output at 1/16');
  });

  it('catches a goal with the wrong direction', () => {
    expect(errorsOf({ ...valid, goal: '-1/16' })).toHaveLength(1);
  });

  it('rejects gear sizes the game does not have', () => {
    expect(errorsOf({ ...valid, motorTeeth: 24 })[0]).toContain('"motorTeeth" must be one of');
    expect(errorsOf({ ...valid, axles: [{ teeth: 9 }] })[0]).toContain('axles[0].teeth');
    expect(errorsOf({ ...valid, decoys: [30] })[0]).toContain('decoys[0]');
  });

  it('rejects a stacked gear on the output axle', () => {
    const axles = [{ teeth: 24, then: 12 }];
    expect(errorsOf({ ...valid, axles })[0]).toContain('output axle');
  });

  it('enforces the limits', () => {
    expect(errorsOf({ ...valid, axles: [] })).toHaveLength(1);
    expect(errorsOf({ ...valid, spareAxles: 9 })).toHaveLength(1);
    expect(errorsOf({ ...valid, decoys: [8, 8, 8, 8, 8] })).toHaveLength(1);
    expect(errorsOf({ ...valid, title: 'x'.repeat(61) })).toHaveLength(1);
  });

  it('reports every problem at once', () => {
    expect(errorsOf({ ...valid, title: '', motorTeeth: 7, goal: 'fast' })).toHaveLength(3);
  });

  it('rejects input that is not an object', () => {
    expect(errorsOf([valid])).toEqual(['The level must be a JSON object.']);
    expect(errorsOf(null)).toHaveLength(1);
  });
});
