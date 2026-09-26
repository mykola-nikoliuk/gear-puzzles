import { describe, expect, it } from 'vitest';
import { divide, equals, fraction, multiply, negate, toNumber, toString } from './fraction';

describe('fraction', () => {
  it('reduces to lowest terms', () => {
    expect(fraction(6, 8)).toEqual({ num: 3, den: 4 });
  });

  it('keeps the sign on the numerator', () => {
    expect(fraction(3, -4)).toEqual({ num: -3, den: 4 });
    expect(fraction(-3, -4)).toEqual({ num: 3, den: 4 });
  });

  it('normalizes zero', () => {
    expect(fraction(0, -5)).toEqual({ num: 0, den: 1 });
  });

  it('defaults the denominator to one', () => {
    expect(fraction(7)).toEqual({ num: 7, den: 1 });
  });

  it('rejects a zero denominator and non-integers', () => {
    expect(() => fraction(1, 0)).toThrow();
    expect(() => fraction(1.5, 2)).toThrow();
  });
});

describe('arithmetic', () => {
  it('multiplies and reduces', () => {
    expect(multiply(fraction(2, 3), fraction(9, 4))).toEqual(fraction(3, 2));
  });

  it('divides', () => {
    expect(divide(fraction(1, 2), fraction(3, 4))).toEqual(fraction(2, 3));
  });

  it('refuses to divide by zero', () => {
    expect(() => divide(fraction(1), fraction(0))).toThrow();
  });

  it('negates', () => {
    expect(negate(fraction(2, 5))).toEqual(fraction(-2, 5));
  });

  it('stays exact over a long chain of ratios', () => {
    let ratio = fraction(1);
    for (let i = 0; i < 10; i++) {
      ratio = multiply(ratio, fraction(3, 7));
      ratio = multiply(ratio, fraction(7, 3));
    }
    expect(equals(ratio, fraction(1))).toBe(true);
  });
});

describe('conversion', () => {
  it('converts to a number', () => {
    expect(toNumber(fraction(3, 4))).toBe(0.75);
  });

  it('formats whole numbers without a denominator', () => {
    expect(toString(fraction(4, 2))).toBe('2');
    expect(toString(fraction(-1, 3))).toBe('-1/3');
  });
});
