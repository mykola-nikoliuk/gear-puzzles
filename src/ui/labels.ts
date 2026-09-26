import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { GearSystem } from '../core/model';
import type { Propagation } from '../core/propagate';
import { formatVelocity } from './hud';

export interface AxleInfo {
  /** Tooth counts of the gears on the axle, bottom layer first, e.g. "24T · 10T". */
  readonly teeth: string;
  /** Live speed, "idle" when the motor does not reach it, "jammed" when nothing turns. */
  readonly speed: string;
}

/** What to show next to an axle, or `null` for an empty one. */
export function axleInfo(
  system: GearSystem,
  propagation: Propagation,
  axleId: string,
): AxleInfo | null {
  const gears = system.gears
    .filter((gear) => gear.axleId === axleId)
    .sort((a, b) => a.layer - b.layer);
  if (gears.length === 0) return null;

  const teeth = gears.map((gear) => `${gear.teeth}T`).join(' · ');
  if (propagation.kind === 'jammed') return { teeth, speed: 'jammed' };

  const velocity = propagation.velocities.get(axleId);
  return { teeth, speed: velocity ? formatVelocity(velocity, { unit: false }) : 'idle' };
}

/** Floating HTML labels above the axles; render them with a `CSS2DRenderer`. */
export class AxleLabels {
  readonly root = new THREE.Group();
  private readonly labels = new Map<string, { object: CSS2DObject; text: string }>();

  constructor(system: GearSystem, height: number) {
    for (const axle of system.axles) {
      const element = document.createElement('div');
      element.className = 'axle-label';
      const object = new CSS2DObject(element);
      object.position.set(axle.x, axle.y, height);
      object.center.set(0.5, 1.4);
      this.root.add(object);
      this.labels.set(axle.id, { object, text: '' });
    }
  }

  update(system: GearSystem, propagation: Propagation): void {
    for (const [axleId, label] of this.labels) {
      const info = axleInfo(system, propagation, axleId);
      const text = info ? `${info.teeth}\n${info.speed}` : '';
      if (text === label.text) continue;

      label.text = text;
      label.object.element.textContent = text;
      label.object.visible = info !== null;
    }
  }
}
