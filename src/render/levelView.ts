import * as THREE from 'three';
import {
  isPlaced,
  LAYERS,
  PIN_RADIUS,
  pinTopLayer,
  tipRadius,
  type Axle,
  type GearSystem,
} from '../core/model';
import { GEAR_THICKNESS, gearGeometry, layerElevation } from './gearMesh';
import { carryLength, carryPosition, followFactor, type Point3 } from './motion';
import { mergeBounds, trayLayout, type TrayLayout } from './tray';

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
    ...system.gears.filter(isPlaced).flatMap((gear) => {
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

export function layerColor(layer: number): string {
  return LAYER_COLORS[layer % LAYER_COLORS.length] ?? '#ffffff';
}
const HIGHLIGHTS = { valid: '#1f6f3a', invalid: '#7a1c1c' } as const;
const GOAL_COLOR = '#2fd3c0';
/** Gears off the board, carried or in the tray, share one colour; layers colour the rest. */
export const LOOSE_COLOR = '#5f86b3';
/** A carried gear floats this far above the tallest pin. */
const CARRY_CLEARANCE = 1;
/** How fast a gear is carried to its new spot, in board units per second, and the time bounds. */
const CARRY_SPEED = 60;
const CARRY_SECONDS = { min: 0.2, max: 0.6 } as const;
/** How fast a gear's colour follows the layer it is headed for, per second. */
const COLOR_RATE = 8;

export type Highlight = keyof typeof HIGHLIGHTS | null;

type GearMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

function materialFor(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.4 });
}

/** A flat dark plate under the tray slots. */
function trayShelf(bounds: Bounds): THREE.Mesh {
  const padding = 1;
  const width = bounds.maxX - bounds.minX + 2 * padding;
  const height = bounds.maxY - bounds.minY + 2 * padding;
  const shelf = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ color: '#151b21', roughness: 0.95 }),
  );
  shelf.position.set((bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2, -0.05);
  return shelf;
}

/** A pin reaching `cap` above the top of `layer`. */
function pinHeightFor(layer: number, cap = 0.6): number {
  return layerElevation(layer) + GEAR_THICKNESS + cap;
}

/** Three.js objects for a level: one pin per axle and one spinning mesh per gear. */
export class LevelView {
  readonly root = new THREE.Group();
  private readonly gears = new Map<string, GearMesh>();
  private readonly axles: ReadonlyMap<string, Axle>;
  private readonly pins = new Map<string, THREE.Mesh>();
  /** Gears coloured by the layer they sit on; the motor gear keeps its own colour. */
  private readonly layered = new Set<string>();
  /** Gears on their way to a new spot; `start` is filled in on the first frame. */
  private readonly motions = new Map<
    string,
    { from: Point3; to: Point3; seconds: number; start: number | null }
  >();
  private readonly targetColors = new Map<string, THREE.Color>();
  private lastUpdate: number | null = null;
  /** The first placement is instant; later ones animate. */
  private settled = false;
  private readonly pinHeight: number;
  private readonly tray: TrayLayout;
  /** Board and tray together, for framing the camera. */
  readonly bounds: Bounds;

  /**
   * `reach` is a layout whose gears the board must have room for, usually the solution,
   * so the finished train fits in the frame and clear of the tray. The tray row is
   * centred on `trayCenterX`, the middle of the board by default.
   */
  constructor(
    system: GearSystem,
    { reach = system, trayCenterX }: { reach?: GearSystem; trayCenterX?: number } = {},
  ) {
    this.axles = new Map(system.axles.map((axle) => [axle.id, axle]));
    const board = mergeBounds(levelBounds(system), levelBounds(reach));
    this.tray = trayLayout(system, board, trayCenterX);
    this.bounds = mergeBounds(board, this.tray.bounds);
    this.root.add(trayShelf(this.tray.bounds));
    const pinHeight = pinHeightFor(LAYERS - 1);
    this.pinHeight = pinHeight;
    // The motor axle takes no more gears, so its pin stops just above the motor gear.
    // Standing on the board: the base at z = 0.
    const pinGeometry = (height: number) =>
      new THREE.CylinderGeometry(PIN_RADIUS, PIN_RADIUS, height, 24)
        .rotateX(Math.PI / 2)
        .translate(0, 0, height / 2);
    const tall = pinGeometry(pinHeight);
    // A short cap keeps it clearly below the next layer.
    const short = pinGeometry(pinHeightFor(pinTopLayer(system, system.driver.axleId), 0.3));
    const pinMaterial = materialFor('#3a434d');

    for (const axle of system.axles) {
      const geometry = axle.id === system.driver.axleId ? short : tall;
      const pin = new THREE.Mesh(geometry, pinMaterial);
      pin.position.set(axle.x, axle.y, 0);
      this.root.add(pin);
      this.pins.set(axle.id, pin);
    }

    for (const gear of system.gears) {
      const isDriver = gear.axleId === system.driver.axleId;
      const mesh = new THREE.Mesh(gearGeometry(gear.teeth), materialFor(DRIVER_COLOR));
      if (!isDriver) this.layered.add(gear.id);
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

  /**
   * Sends every gear to its axle and layer (or tray slot): after the first call, gears that
   * moved are carried there (up, across, down) and fade to their new colour as `update` runs.
   * Returns how many seconds until the last of them lands.
   */
  placeGears(system: GearSystem): number {
    let landing = 0;
    const axles = new Map(system.axles.map((axle) => [axle.id, axle]));
    for (const gear of system.gears) {
      const mesh = this.gears.get(gear.id);
      if (!mesh) continue;

      let to: Point3 | undefined;
      if (gear.axleId === null) {
        const slot = this.tray.slots.get(gear.id);
        if (slot) to = { x: slot.x, y: slot.y, z: 0 };
      } else {
        const axle = axles.get(gear.axleId);
        if (!axle) throw new Error(`Gear ${gear.id} sits on unknown axle ${gear.axleId}`);
        to = { x: axle.x, y: axle.y, z: layerElevation(gear.layer) };
      }
      if (this.layered.has(gear.id)) {
        this.setTargetColor(gear.id, gear.axleId === null ? LOOSE_COLOR : layerColor(gear.layer));
      }
      if (!to) continue;

      const { x, y, z } = mesh.position;
      if (!this.settled) {
        mesh.position.set(to.x, to.y, to.z);
        const target = this.targetColors.get(gear.id);
        if (target) mesh.material.color.copy(target);
      } else if (x !== to.x || y !== to.y || z !== to.z) {
        const from = { x, y, z };
        const length = carryLength(from, to, this.carryHeight);
        const seconds = Math.min(
          CARRY_SECONDS.max,
          Math.max(CARRY_SECONDS.min, length / CARRY_SPEED),
        );
        this.motions.set(gear.id, { from, to, seconds, start: null });
        landing = Math.max(landing, seconds);
      }
    }
    this.settled = true;
    return landing;
  }

  /** Height of a carried gear's bottom face: clear of every pin. */
  get carryHeight(): number {
    return this.pinHeight + CARRY_CLEARANCE;
  }

  /** Carries a gear over the board at `carryHeight`, in the loose colour. */
  hoverGear(id: string, x: number, y: number): void {
    this.motions.delete(id);
    this.gears.get(id)?.position.set(x, y, this.carryHeight);
    if (this.layered.has(id)) this.setTargetColor(id, LOOSE_COLOR);
  }

  /** Advances carried gears and colour fades; call once a frame with a steadily rising time. */
  update(seconds: number): void {
    const elapsed = this.lastUpdate === null ? 0 : seconds - this.lastUpdate;
    this.lastUpdate = seconds;

    for (const [id, motion] of this.motions) {
      motion.start ??= seconds;
      const progress = (seconds - motion.start) / motion.seconds;
      const { x, y, z } = carryPosition(motion.from, motion.to, this.carryHeight, progress);
      this.gears.get(id)?.position.set(x, y, z);
      if (progress >= 1) this.motions.delete(id);
    }

    const blend = followFactor(COLOR_RATE, elapsed);
    for (const [id, target] of this.targetColors) {
      this.gears.get(id)?.material.color.lerp(target, blend);
    }
  }

  /** Whether any gear is still on its way to its spot. */
  get moving(): boolean {
    return this.motions.size > 0;
  }

  private setTargetColor(id: string, color: string): void {
    const target = this.targetColors.get(id);
    if (target) target.set(color);
    else this.targetColors.set(id, new THREE.Color(color));
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

  pinMesh(axleId: string): THREE.Mesh | undefined {
    return this.pins.get(axleId);
  }

  gearMesh(id: string): GearMesh | undefined {
    return this.gears.get(id);
  }
}
