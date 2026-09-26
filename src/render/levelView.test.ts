import { describe, expect, it } from 'vitest';
import { demoLevel } from '../levels/demo';
import { layerElevation } from './gearMesh';
import { LevelView, levelBounds } from './levelView';

describe('levelBounds', () => {
  it('covers the tips of every gear', () => {
    // Motor gear: 12 teeth, tip radius 7 around (0, 0). Output gear: 20 teeth, tip 11 around (27, 12).
    expect(levelBounds(demoLevel)).toEqual({ minX: -11, maxX: 38, minY: -13, maxY: 23 });
  });
});

describe('LevelView', () => {
  const view = new LevelView(demoLevel);

  it('creates a pin per axle and a mesh per gear', () => {
    expect(view.root.children).toHaveLength(demoLevel.axles.length + demoLevel.gears.length);
  });

  it('places gears on their axle and layer', () => {
    const mesh = view.gearMesh('compound-small');
    expect(mesh?.position.toArray()).toEqual([18, 0, layerElevation(1)]);
  });

  it('shares geometry between gears with the same tooth count', () => {
    const other = new LevelView(demoLevel);
    expect(other.gearMesh('motor-gear')?.geometry).toBe(view.gearMesh('motor-gear')?.geometry);
  });

  it('rotates gears around their axle', () => {
    view.setAngles(new Map([['output-gear', 1.5]]));
    expect(view.gearMesh('output-gear')?.rotation.z).toBe(1.5);
    expect(view.gearMesh('motor-gear')?.rotation.z).toBe(0);
  });
});
