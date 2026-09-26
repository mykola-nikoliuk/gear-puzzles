import { describe, expect, it } from 'vitest';
import { fraction } from '../core/fraction';
import { propagate } from '../core/propagate';
import { demoSolution } from '../levels/demo';
import { anglesAt, loopPeriod } from './animate';

const start = new Map(demoSolution.gears.map((gear) => [gear.id, 0.5]));

describe('anglesAt', () => {
  const running = propagate(demoSolution);

  it('starts every gear at its starting angle', () => {
    expect(anglesAt(demoSolution, running, start, 0)).toEqual(start);
  });

  it('turns the driver by its velocity in turns per second', () => {
    // The demo motor makes a quarter turn per second.
    expect(anglesAt(demoSolution, running, start, 2).get('motor-gear')).toBeCloseTo(0.5 + Math.PI);
  });

  it('turns both halves of a compound gear together', () => {
    const angles = anglesAt(demoSolution, running, start, 3);
    expect(angles.get('compound-big')).toBeCloseTo(angles.get('compound-small') ?? NaN);
  });

  it('turns a meshed gear the other way', () => {
    const angles = anglesAt(demoSolution, running, start, 1);
    expect(angles.get('idler-gear') ?? NaN).toBeLessThan(0.5);
  });

  it('holds everything still when jammed', () => {
    const jammed = { kind: 'jammed', axleId: 'motor' } as const;
    expect(anglesAt(demoSolution, jammed, start, 5)).toEqual(start);
  });

  it('holds idle axles still', () => {
    const idle = { kind: 'running', velocities: new Map([['motor', fraction(1)]]) } as const;
    expect(anglesAt(demoSolution, idle, start, 5).get('output-gear')).toBe(0.5);
  });
});

describe('loopPeriod', () => {
  it('lasts until every gear has moved a whole number of teeth', () => {
    // Motor side: 12 teeth at 1/4 turn/s pass 3 teeth a second; the output side 5/4.
    expect(loopPeriod(demoSolution, propagate(demoSolution))).toEqual(fraction(4));
  });

  it('brings every gear back to a matching angle', () => {
    const running = propagate(demoSolution);
    const period = loopPeriod(demoSolution, running);
    const angles = anglesAt(demoSolution, running, start, period ? period.num / period.den : NaN);
    for (const gear of demoSolution.gears) {
      const teeth = ((angles.get(gear.id) ?? NaN) - 0.5) / ((2 * Math.PI) / gear.teeth);
      expect(teeth).toBeCloseTo(Math.round(teeth));
    }
  });

  it('is null when nothing turns', () => {
    expect(loopPeriod(demoSolution, { kind: 'jammed', axleId: 'motor' })).toBeNull();
  });
});
