import * as THREE from 'three';
import { tipRadius, type Axle, type GearSystem } from '../core/model';
import { GEAR_THICKNESS, gearGeometry, layerElevation } from './gearMesh';

export interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/** Room kept around an empty axle, so a gear dropped there still fits in the frame. */
const AXLE_MARGIN = 3;

/** The area covered by every gear's tips and every axle, so the camera can frame the level. */
export function levelBounds(system: GearSystem): Bounds {
  const axles = new Map(system.axles.map((axle) => [axle.id, axle]));
  const circles = [
    ...system.axles.map((axle) => ({ x: axle.x, y: axle.y, r: AXLE_MARGIN })),
    ...system.gears.flatMap((gear) => {
      const axle = axles.get(gear.axleId);
      return axle ? [{ x: axle.x, y: axle.y, r: tipRadius(gear.teeth) }] : [];
    }),
  ];

  return {
    minX: Math.min(...circles.map(({ x, r }) => x - r)),
    maxX: Math.max(...circles.map(({ x, r }) => x + r)),
    minY: Math.min(...circles.map(({ y, r }) => y - r)),
    maxY: Math.max(...circles.map(({ y, r }) => y + r)),
  };
}

const LAYER_COLORS = ['#c9a14a', '#9aa7b4', '#b87333'];
const DRIVER_COLOR = '#e0633a';
const HIGHLIGHTS = { valid: '#1f6f3a', invalid: '#7a1c1c' } as const;
const GOAL_COLOR = '#2fd3c0';
/** How far a dragged gear floats above its layer. */
const LIFT = 0.8;

export type Highlight = keyof typeof HIGHLIGHTS | null;

type GearMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

function materialFor(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.4 });
}

/** Three.js objects for a level: one pin per axle and one spinning mesh per gear. */
export class LevelView {
  readonly root = new THREE.Group();
  private readonly gears = new Map<string, GearMesh>();
  private readonly axles: ReadonlyMap<string, Axle>;
  private readonly pins = new Map<string, THREE.Mesh>();
  private readonly pinHeight: number;

  constructor(system: GearSystem) {
    this.axles = new Map(system.axles.map((axle) => [axle.id, axle]));
    const topLayer = Math.max(0, ...system.gears.map((gear) => gear.layer));
    const pinHeight = layerElevation(topLayer) + GEAR_THICKNESS + 0.6;
    this.pinHeight = pinHeight;
    const pinGeometry = new THREE.CylinderGeometry(0.55, 0.55, pinHeight, 24).rotateX(Math.PI / 2);
    const pinMaterial = materialFor('#3a434d');

    for (const axle of system.axles) {
      const pin = new THREE.Mesh(pinGeometry, pinMaterial);
      pin.position.set(axle.x, axle.y, pinHeight / 2);
      this.root.add(pin);
      this.pins.set(axle.id, pin);
    }

    for (const gear of system.gears) {
      const isDriver = gear.axleId === system.driver.axleId;
      const color = isDriver
        ? DRIVER_COLOR
        : (LAYER_COLORS[gear.layer % LAYER_COLORS.length] ?? '#ffffff');
      const mesh = new THREE.Mesh(gearGeometry(gear.teeth), materialFor(color));
      this.root.add(mesh);
      this.gears.set(gear.id, mesh);
    }
    this.placeGears(system);
  }

  /** Height of the pin tops, the highest point of the board. */
  get pinTop(): number {
    return this.pinHeight;
  }

  /** Lights up the output axle and floats a ring above its pin, clear of every gear layer. */
  markGoal(axleId: string): THREE.Object3D {
    const axle = this.axles.get(axleId);
    const pin = this.pins.get(axleId);
    if (!axle || !pin) throw new Error(`Goal sits on unknown axle ${axleId}`);

    const glow = new THREE.MeshBasicMaterial({ color: GOAL_COLOR });
    pin.material = glow;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.18, 12, 48), glow);
    ring.position.set(axle.x, axle.y, this.pinHeight + 0.3);
    this.root.add(ring);
    return ring;
  }

  /** Puts every gear back on its axle and layer. */
  placeGears(system: GearSystem): void {
    const axles = new Map(system.axles.map((axle) => [axle.id, axle]));
    for (const gear of system.gears) {
      const axle = axles.get(gear.axleId);
      if (!axle) throw new Error(`Gear ${gear.id} sits on unknown axle ${gear.axleId}`);
      this.gears.get(gear.id)?.position.set(axle.x, axle.y, layerElevation(gear.layer));
    }
  }

  /** Moves a gear freely above its layer while it is being dragged. */
  hoverGear(id: string, x: number, y: number, layer: number): void {
    this.gears.get(id)?.position.set(x, y, layerElevation(layer) + LIFT);
  }

  /** Visual only: stretches every gear along its axle without moving the layers. */
  setThickness(scale: number): void {
    for (const mesh of this.gears.values()) mesh.scale.z = scale;
  }

  highlight(id: string, highlight: Highlight): void {
    this.gears.get(id)?.material.emissive.set(highlight ? HIGHLIGHTS[highlight] : '#000000');
  }

  /** The id of the frontmost gear under the ray, if any. */
  gearAt(raycaster: THREE.Raycaster): string | undefined {
    const [hit] = raycaster.intersectObjects([...this.gears.values()], false);
    if (!hit) return undefined;
    for (const [id, mesh] of this.gears) {
      if (mesh === hit.object) return id;
    }
    return undefined;
  }

  /** Turns each gear to the given angle in radians; gears missing from the map stay put. */
  setAngles(angles: ReadonlyMap<string, number>): void {
    for (const [id, angle] of angles) {
      const mesh = this.gears.get(id);
      if (mesh) mesh.rotation.z = angle;
    }
  }

  gearMesh(id: string): GearMesh | undefined {
    return this.gears.get(id);
  }
}
