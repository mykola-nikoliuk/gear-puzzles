import * as THREE from 'three';
import { tipRadius, type GearSystem } from '../core/model';
import { GEAR_THICKNESS, gearGeometry, layerElevation } from './gearMesh';

export interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/** The area covered by every gear's tips, so the camera can frame the whole level. */
export function levelBounds(system: GearSystem): Bounds {
  const axles = new Map(system.axles.map((axle) => [axle.id, axle]));
  let bounds: Bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };

  for (const gear of system.gears) {
    const axle = axles.get(gear.axleId);
    if (!axle) continue;
    const r = tipRadius(gear.teeth);
    bounds = {
      minX: Math.min(bounds.minX, axle.x - r),
      maxX: Math.max(bounds.maxX, axle.x + r),
      minY: Math.min(bounds.minY, axle.y - r),
      maxY: Math.max(bounds.maxY, axle.y + r),
    };
  }
  return bounds;
}

const LAYER_COLORS = ['#c9a14a', '#9aa7b4', '#b87333'];
const DRIVER_COLOR = '#e0633a';

function materialFor(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.4 });
}

/** Three.js objects for a level: one pin per axle and one spinning mesh per gear. */
export class LevelView {
  readonly root = new THREE.Group();
  private readonly gears = new Map<string, THREE.Mesh>();

  constructor(system: GearSystem) {
    const topLayer = Math.max(0, ...system.gears.map((gear) => gear.layer));
    const pinHeight = layerElevation(topLayer) + GEAR_THICKNESS + 0.6;
    const pinGeometry = new THREE.CylinderGeometry(0.55, 0.55, pinHeight, 24).rotateX(Math.PI / 2);
    const pinMaterial = materialFor('#3a434d');

    const axles = new Map(system.axles.map((axle) => [axle.id, axle]));
    for (const axle of system.axles) {
      const pin = new THREE.Mesh(pinGeometry, pinMaterial);
      pin.position.set(axle.x, axle.y, pinHeight / 2);
      this.root.add(pin);
    }

    for (const gear of system.gears) {
      const axle = axles.get(gear.axleId);
      if (!axle) throw new Error(`Gear ${gear.id} sits on unknown axle ${gear.axleId}`);

      const isDriver = gear.axleId === system.driver.axleId;
      const color = isDriver
        ? DRIVER_COLOR
        : (LAYER_COLORS[gear.layer % LAYER_COLORS.length] ?? '#ffffff');
      const mesh = new THREE.Mesh(gearGeometry(gear.teeth), materialFor(color));
      mesh.position.set(axle.x, axle.y, layerElevation(gear.layer));
      this.root.add(mesh);
      this.gears.set(gear.id, mesh);
    }
  }

  /** Turns each gear to the given angle in radians; gears missing from the map stay put. */
  setAngles(angles: ReadonlyMap<string, number>): void {
    for (const [id, angle] of angles) {
      const mesh = this.gears.get(id);
      if (mesh) mesh.rotation.z = angle;
    }
  }

  gearMesh(id: string): THREE.Mesh | undefined {
    return this.gears.get(id);
  }
}
