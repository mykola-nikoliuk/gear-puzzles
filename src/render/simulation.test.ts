import { describe, expect, it } from 'vitest';
import { demoSolution } from '../levels/demo';
import { Simulation } from './simulation';

const withoutGear = (id: string) => ({
  ...demoSolution,
  gears: demoSolution.gears.filter((gear) => gear.id !== id),
});

describe('Simulation', () => {
  it('runs the given system', () => {
    const simulation = new Simulation(demoSolution);
    expect(simulation.state.kind).toBe('running');
    expect(simulation.anglesAt(2).get('motor-gear')).toBeCloseTo(Math.PI);
  });

  it('keeps the motor turning smoothly across a layout change', () => {
    const simulation = new Simulation(demoSolution);
    const before = simulation.anglesAt(3).get('motor-gear');
    simulation.setSystem(withoutGear('compound-big'), 3);
    expect(simulation.anglesAt(3).get('motor-gear')).toBeCloseTo(before ?? NaN);
    expect(simulation.anglesAt(5).get('motor-gear')).toBeCloseTo((before ?? NaN) + Math.PI);
  });

  it('stops gears that lose their connection to the motor', () => {
    const simulation = new Simulation(demoSolution);
    simulation.setSystem(withoutGear('compound-big'), 1);
    const output = simulation.anglesAt(1).get('output-gear');
    expect(simulation.anglesAt(4).get('output-gear')).toBe(output);
  });

  it('drops removed gears from the angles', () => {
    const simulation = new Simulation(demoSolution);
    simulation.setSystem(withoutGear('idler-gear'), 1);
    expect(simulation.anglesAt(2).has('idler-gear')).toBe(false);
  });
});
