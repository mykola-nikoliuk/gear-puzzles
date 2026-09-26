/**
 * Exact rational number. Gear ratios are products of tooth-count fractions,
 * so floats would drift after a few meshes — fractions stay exact.
 * Always normalized: reduced, and the denominator is positive.
 */
export interface Fraction {
  readonly num: number;
  readonly den: number;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

export function fraction(num: number, den = 1): Fraction {
  if (!Number.isInteger(num) || !Number.isInteger(den)) {
    throw new Error(`Fraction parts must be integers, got ${num}/${den}`);
  }
  if (den === 0) throw new Error('Fraction denominator must not be zero');
  if (num === 0) return { num: 0, den: 1 };

  const divisor = gcd(num, den) * Math.sign(den);
  return { num: num / divisor, den: den / divisor };
}

export function multiply(a: Fraction, b: Fraction): Fraction {
  return fraction(a.num * b.num, a.den * b.den);
}

export function divide(a: Fraction, b: Fraction): Fraction {
  if (b.num === 0) throw new Error('Cannot divide by zero');
  return fraction(a.num * b.den, a.den * b.num);
}

export function negate(a: Fraction): Fraction {
  return fraction(-a.num, a.den);
}

export function equals(a: Fraction, b: Fraction): boolean {
  return a.num === b.num && a.den === b.den;
}

export function toNumber(a: Fraction): number {
  return a.num / a.den;
}

export function toString(a: Fraction): string {
  return a.den === 1 ? `${a.num}` : `${a.num}/${a.den}`;
}
