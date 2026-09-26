import * as THREE from 'three';
import type { Gear, GearSystem } from '../core/model';
import { bestLayer, moveGear, nearestAxle } from '../core/placement';
import { GEAR_THICKNESS, layerElevation } from './gearMesh';
import type { LevelView } from './levelView';
import type { Simulation } from './simulation';

/** How close to an axle a gear must be dropped to snap onto it. */
const SNAP_DISTANCE = 3;

interface Options {
  readonly canvas: HTMLCanvasElement;
  readonly camera: THREE.Camera;
  readonly view: LevelView;
  readonly simulation: Simulation;
  /** Current time in seconds, on the same clock as the animation loop. */
  readonly now: () => number;
}

interface Drag {
  readonly gear: Gear;
  /** The layout before the gear was picked up, to fall back to on an invalid drop. */
  readonly layout: GearSystem;
}

/**
 * Lets the player pick a gear up, carry it over the board and drop it on an axle;
 * dropped anywhere else, it goes back to the tray.
 * While carried, the gear leaves the simulation, so the rest of the train reacts at once.
 * Returns a function that removes the listeners.
 */
export function enableGearDragging({ canvas, camera, view, simulation, now }: Options) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let drag: Drag | null = null;

  const aim = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
  };

  const draggableGearAt = (event: PointerEvent): Gear | undefined => {
    aim(event);
    const id = view.gearAt(raycaster);
    const { gears, driver } = simulation.system;
    return gears.find((gear) => gear.id === id && gear.axleId !== driver.axleId);
  };

  const pointOnLayer = (layer: number): THREE.Vector3 | null => {
    const plane = new THREE.Plane(
      new THREE.Vector3(0, 0, 1),
      -(layerElevation(layer) + GEAR_THICKNESS),
    );
    return raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  };

  /** The axle the gear would snap to from here and the layer it would take, if any is allowed. */
  const target = (point: THREE.Vector3, { gear, layout }: Drag) => {
    const axle = nearestAxle(layout, point.x, point.y, SNAP_DISTANCE);
    return { axle, layer: axle ? bestLayer(layout, gear.id, axle.id) : null };
  };

  const onPointerDown = (event: PointerEvent) => {
    const gear = draggableGearAt(event);
    if (!gear) return;

    const layout = simulation.system;
    drag = { gear, layout };
    simulation.setSystem(
      { ...layout, gears: layout.gears.filter(({ id }) => id !== gear.id) },
      now(),
    );
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
    onPointerMove(event);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag) {
      canvas.style.cursor = draggableGearAt(event) ? 'grab' : '';
      return;
    }

    aim(event);
    const point = pointOnLayer(drag.gear.layer);
    if (!point) return;
    const { axle, layer } = target(point, drag);
    view.hoverGear(drag.gear.id, point.x, point.y, layer ?? drag.gear.layer);
    view.highlight(drag.gear.id, axle ? (layer !== null ? 'valid' : 'invalid') : null);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!drag) return;

    aim(event);
    const point = pointOnLayer(drag.gear.layer);
    const { axle, layer } = point ? target(point, drag) : { axle: undefined, layer: null };
    // Onto a free layer it goes; a forbidden axle sends it back; open space means the tray.
    const layout = !axle
      ? moveGear(drag.layout, drag.gear.id, null)
      : layer !== null
        ? moveGear(drag.layout, drag.gear.id, axle.id, layer)
        : drag.layout;

    simulation.setSystem(layout, now());
    view.placeGears(layout);
    view.highlight(drag.gear.id, null);
    canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = 'grab';
    drag = null;
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
  };
}
