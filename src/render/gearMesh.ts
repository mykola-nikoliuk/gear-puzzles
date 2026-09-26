import * as THREE from 'three';
import { gearOutline } from './gearOutline';

export const GEAR_THICKNESS = 1.2;
const LAYER_GAP = 0.4;
const BORE_RADIUS = 0.6;
const BEVEL_THICKNESS = 0.12;

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
    bevelThickness: BEVEL_THICKNESS,
    bevelSize: 0.08,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geometryCache.set(teeth, geometry);
  return geometry;
}

const edgeCache = new Map<number, THREE.BufferGeometry>();

/** The tooth outline traced just above a gear's top face; shared like `gearGeometry`. */
export function gearEdgeGeometry(teeth: number): THREE.BufferGeometry {
  const cached = edgeCache.get(teeth);
  if (cached) return cached;

  const top = GEAR_THICKNESS + BEVEL_THICKNESS + 0.01;
  const points = gearOutline(teeth).map(({ x, y }) => new THREE.Vector3(x, y, top));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  edgeCache.set(teeth, geometry);
  return geometry;
}
