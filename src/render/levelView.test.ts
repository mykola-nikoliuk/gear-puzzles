import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { moveGear } from '../core/placement';
import { demoSolution } from '../levels/demo';
import { GEAR_THICKNESS, layerElevation } from './gearMesh';
import { LevelView, layerColor, levelBounds } from './levelView';

describe('levelBounds', () => {
  it('covers the tips of every gear and the room around empty axles', () => {
    // Output: 20 teeth, tip 10.75 around (27, 12). Spare axles at (-16, -4) and (0, -10), margin 3.
    expect(levelBounds(demoSolution)).toEqual({ minX: -19, maxX: 37.75, minY: -13, maxY: 22.75 });
  });
});

describe('LevelView', () => {
  const view = new LevelView(demoSolution);

  it('creates the tray shelf, a pin per axle and a mesh per gear', () => {
    expect(view.root.children).toHaveLength(
      1 + demoSolution.axles.length + demoSolution.gears.length,
    );
  });

  it('rests gears from the tray on the shelf below the board', () => {
    const fresh = new LevelView(demoSolution);
    fresh.placeGears(moveGear(demoSolution, 'compound-small', null));
    const position = fresh.gearMesh('compound-small')?.position;
    expect(position?.z).toBe(0);
    expect(position?.y).toBeLessThan(levelBounds(demoSolution).minY);
    expect(fresh.bounds.minY).toBeLessThan(position?.y ?? 0);
  });

  it('makes room on the board for the gears of a given layout', () => {
    const start = moveGear(demoSolution, 'output-gear', null);
    const tight = new LevelView(start);
    const roomy = new LevelView(start, demoSolution);
    expect(roomy.bounds.maxY).toBeGreaterThan(tight.bounds.maxY);
    expect(roomy.bounds.maxY).toBe(levelBounds(demoSolution).maxY);
  });

  it('places gears on their axle and layer', () => {
    const mesh = view.gearMesh('compound-small');
    expect(mesh?.position.toArray()).toEqual([18, 0, layerElevation(1)]);
  });

  it('colours gears by the layer they sit on, but not the motor gear', () => {
    const fresh = new LevelView(demoSolution);
    const color = (id: string) => `#${fresh.gearMesh(id)?.material.color.getHexString()}`;
    expect(color('compound-small')).toBe(layerColor(1));
    fresh.placeGears(moveGear(demoSolution, 'compound-small', 'spare-west', 0));
    expect(color('compound-small')).toBe(layerColor(0));
    expect(color('motor-gear')).not.toBe(layerColor(0));
  });

  it('makes pins tall enough for every layer', () => {
    expect(view.pinTop).toBeGreaterThan(layerElevation(1) + GEAR_THICKNESS);
  });

  it('keeps the motor pin short, with no room for a second gear', () => {
    const top = (axleId: string) => {
      const geometry = view.pinMesh(axleId)?.geometry;
      geometry?.computeBoundingBox();
      return geometry?.boundingBox?.max.z ?? 0;
    };
    expect(top('motor')).toBeGreaterThan(GEAR_THICKNESS);
    expect(top('motor')).toBeLessThan(layerElevation(1));
    expect(top('idler')).toBeCloseTo(view.pinTop);
  });

  it('shares geometry between gears with the same tooth count', () => {
    const other = new LevelView(demoSolution);
    expect(other.gearMesh('motor-gear')?.geometry).toBe(view.gearMesh('motor-gear')?.geometry);
  });

  it('rotates gears around their axle', () => {
    view.setAngles(new Map([['output-gear', 1.5]]));
    expect(view.gearMesh('output-gear')?.rotation.z).toBe(1.5);
    expect(view.gearMesh('motor-gear')?.rotation.z).toBe(0);
  });

  it('finds the gear under a ray', () => {
    const down = new THREE.Raycaster(new THREE.Vector3(2, 0, 50), new THREE.Vector3(0, 0, -1));
    expect(view.gearAt(down)).toBe('motor-gear');
    down.set(new THREE.Vector3(-16, 10, 50), new THREE.Vector3(0, 0, -1));
    expect(view.gearAt(down)).toBeUndefined();
  });

  it('lifts a dragged gear and puts it back on its axle', () => {
    const fresh = new LevelView(demoSolution);
    fresh.hoverGear('idler-gear', 3, 4, 0);
    expect(fresh.gearMesh('idler-gear')?.position.z).toBeGreaterThan(0);

    fresh.placeGears(moveGear(demoSolution, 'idler-gear', 'spare-south'));
    expect(fresh.gearMesh('idler-gear')?.position.toArray()).toEqual([0, -10, 0]);
  });

  it('highlights and clears a gear', () => {
    view.highlight('idler-gear', 'invalid');
    expect(view.gearMesh('idler-gear')?.material.emissive.getHexString()).not.toBe('000000');
    view.highlight('idler-gear', null);
    expect(view.gearMesh('idler-gear')?.material.emissive.getHexString()).toBe('000000');
  });

  it('marks the goal axle with a ring', () => {
    const fresh = new LevelView(demoSolution);
    const ring = fresh.markGoal('output');
    expect(ring.position.x).toBe(27);
    expect(ring.position.y).toBe(12);
    expect(ring.position.z).toBeGreaterThan(layerElevation(1) + GEAR_THICKNESS);
    expect(fresh.root.children).toContain(ring);
    expect(() => fresh.markGoal('nope')).toThrow(/unknown axle/);
  });

  it('scales gear thickness without moving layers', () => {
    const fresh = new LevelView(demoSolution);
    fresh.setThickness(0.5);
    expect(fresh.gearMesh('compound-small')?.scale.z).toBe(0.5);
    expect(fresh.gearMesh('compound-small')?.position.z).toBe(layerElevation(1));
  });
});
