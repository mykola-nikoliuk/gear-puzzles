import * as THREE from 'three';
import { gearOutline } from './gearOutline';

export const GEAR_THICKNESS = 1.2;
const LAYER_GAP = 0.4;
const BORE_RADIUS = 0.6;

/** Height of a layer's bottom face above the board. */
export function layerElevation(layer: number): number {
  return layer * (GEAR_THICKNESS + LAYER_GAP);
}

const geometryCache = new Map<number, THREE.ExtrudeGeometry>();

/** Extruded gear with a bore for the axle; shared between gears with the same tooth count. */
export function gearGeometry(teeth: number): THREE.ExtrudeGeometry {
  const cached = geometryCache.get(teeth);
  if (cached) return cached;

  const outline = gearOutline(teeth).map(({ x, y }) => new THREE.Vector2(x, y));
  const shape = new THREE.Shape(outline);
  shape.holes.push(new THREE.Path().absarc(0, 0, BORE_RADIUS, 0, Math.PI * 2, true));

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: GEAR_THICKNESS,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.08,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geometryCache.set(teeth, geometry);
  return geometry;
}
