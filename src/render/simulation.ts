import type { GearSystem } from '../core/model';
import { propagate, type Propagation } from '../core/propagate';
import { anglesAt } from './animate';
import { initialAngles } from './phase';

/**
 * A running gear system whose layout can change on the fly. On every change the
 * clock is rebased: gears keep their current angles and new meshes snap into phase.
 * A change can wait, say until a dropped gear has landed; until then the old layout keeps turning.
 */
export class Simulation {
  private current: GearSystem;
  private propagation: Propagation;
  private startAngles: Map<string, number>;
  private startTime: number;
  private pending: { system: GearSystem; at: number } | null = null;

  constructor(system: GearSystem, seconds = 0) {
    this.current = system;
    this.propagation = propagate(system);
    this.startAngles = initialAngles(system);
    this.startTime = seconds;
  }

  /** The latest layout, including a change that has not taken effect yet. */
  get system(): GearSystem {
    return this.pending?.system ?? this.current;
  }

  /** How the latest layout turns, including a change that has not taken effect yet. */
  get state(): Propagation {
    return this.pending ? propagate(this.pending.system) : this.propagation;
  }

  /** The layout on screen at `seconds` and how it turns. */
  shownAt(seconds: number): { system: GearSystem; state: Propagation } {
    this.settle(seconds);
    return { system: this.current, state: this.propagation };
  }

  anglesAt(seconds: number): Map<string, number> {
    this.settle(seconds);
    return anglesAt(this.current, this.propagation, this.startAngles, seconds - this.startTime);
  }

  /** Switches to `system` `delay` seconds after `seconds`; a change still waiting happens now. */
  setSystem(system: GearSystem, seconds: number, delay = 0): void {
    if (this.pending) this.apply(this.pending.system, Math.min(seconds, this.pending.at));
    this.pending = null;
    if (delay > 0) this.pending = { system, at: seconds + delay };
    else this.apply(system, seconds);
  }

  private settle(seconds: number): void {
    if (this.pending && seconds >= this.pending.at) {
      const { system, at } = this.pending;
      this.pending = null;
      this.apply(system, at);
    }
  }

  private apply(system: GearSystem, seconds: number): void {
    const angles = anglesAt(
      this.current,
      this.propagation,
      this.startAngles,
      seconds - this.startTime,
    );
    this.current = system;
    this.propagation = propagate(system);
    this.startAngles = initialAngles(system, angles);
    this.startTime = seconds;
  }
}
