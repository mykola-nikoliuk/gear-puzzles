import type { GearSystem } from '../core/model';
import { propagate, type Propagation } from '../core/propagate';
import { anglesAt } from './animate';
import { initialAngles } from './phase';

/**
 * A running gear system whose layout can change on the fly. On every change the
 * clock is rebased: gears keep their current angles and new meshes snap into phase.
 */
export class Simulation {
  private current: GearSystem;
  private propagation: Propagation;
  private startAngles: Map<string, number>;
  private startTime: number;

  constructor(system: GearSystem, seconds = 0) {
    this.current = system;
    this.propagation = propagate(system);
    this.startAngles = initialAngles(system);
    this.startTime = seconds;
  }

  get system(): GearSystem {
    return this.current;
  }

  get state(): Propagation {
    return this.propagation;
  }

  anglesAt(seconds: number): Map<string, number> {
    return anglesAt(this.current, this.propagation, this.startAngles, seconds - this.startTime);
  }

  setSystem(system: GearSystem, seconds: number): void {
    const angles = this.anglesAt(seconds);
    this.current = system;
    this.propagation = propagate(system);
    this.startAngles = initialAngles(system, angles);
    this.startTime = seconds;
  }
}
