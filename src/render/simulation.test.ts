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

  describe('a delayed change', () => {
    it('keeps the old layout turning until it takes effect', () => {
      const simulation = new Simulation(withoutGear('compound-small'));
      simulation.setSystem(demoSolution, 1, 0.5);
      const output = simulation.anglesAt(1).get('output-gear');
      expect(simulation.anglesAt(1.4).get('output-gear')).toBe(output);
      expect(simulation.shownAt(1.4).state.kind).toBe('running');
      expect(simulation.shownAt(1.4).system.gears).toHaveLength(4);
    });

    it('starts the new layout once the delay is over', () => {
      const simulation = new Simulation(withoutGear('compound-small'));
      simulation.setSystem(demoSolution, 1, 0.5);
      const landed = simulation.anglesAt(1.5).get('output-gear') ?? NaN;
      // The output turns at 1/16 turn/s, so 2 s later it is π/4 further on.
      expect(simulation.anglesAt(3.5).get('output-gear')).toBeCloseTo(landed + Math.PI / 4);
      expect(simulation.shownAt(3.5).system).toBe(demoSolution);
    });

    it('reports the latest layout straight away', () => {
      const simulation = new Simulation(withoutGear('compound-small'));
      simulation.setSystem(demoSolution, 1, 0.5);
      expect(simulation.system).toBe(demoSolution);
    });

    it('lands at once when another change comes first', () => {
      const simulation = new Simulation(withoutGear('compound-small'));
      simulation.setSystem(demoSolution, 1, 0.5);
      simulation.setSystem(withoutGear('idler-gear'), 1.2);
      expect(simulation.shownAt(1.2).system.gears).toHaveLength(4);
      expect(simulation.anglesAt(1.2).has('compound-small')).toBe(true);
    });
  });
});
