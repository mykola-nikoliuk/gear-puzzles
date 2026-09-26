import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { GearSystem } from '../core/model';
import type { Propagation } from '../core/propagate';
import { formatVelocity } from './hud';

/**
 * The live speed to show above an axle: "idle" when the motor does not reach it,
 * "jammed" when nothing turns, `null` for an empty axle.
 */
export function axleSpeed(
  system: GearSystem,
  propagation: Propagation,
  axleId: string,
): string | null {
  if (!system.gears.some((gear) => gear.axleId === axleId)) return null;
  if (propagation.kind === 'jammed') return 'jammed';

  const velocity = propagation.velocities.get(axleId);
  return velocity ? formatVelocity(velocity, { unit: false }) : 'idle';
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
      const text = axleSpeed(system, propagation, axleId) ?? '';
      if (text === label.text) continue;

      label.text = text;
      label.object.element.textContent = text;
      label.object.visible = text !== '';
    }
  }
}
