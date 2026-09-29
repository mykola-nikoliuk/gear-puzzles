import { describe, expect, it } from 'vitest';
import { loadGallery } from './gallery';

const spec = {
  title: 'Slow it down',
  lesson: 'Two small-to-big meshes in a row multiply the slowdown.',
  motorTeeth: 12,
  axles: [{ teeth: 24, then: 12 }, { teeth: 24 }],
  goal: '1/16',
  spareAxles: 1,
  decoys: [8],
  hints: [],
};
const entry = { brief: 'slow down', seed: 1, spec, caught: ['"goal" says 1/8, but …'] };

describe('loadGallery', () => {
  it('rebuilds saved levels with their history', () => {
    const [level, ...rest] = loadGallery({ levels: [entry] });
    expect(rest).toEqual([]);
    expect(level?.spec.title).toBe('Slow it down');
    expect(level?.caught).toEqual(entry.caught);
    expect(level?.level.axles.length).toBeGreaterThan(3);
  });

  it('drops entries that no longer pass the checks', () => {
    const lying = { ...entry, spec: { ...spec, goal: '1/4' } };
    const levels = loadGallery({ levels: [lying, entry, { seed: 'x' }, null] });
    expect(levels).toHaveLength(1);
  });

  it('copes with a file of the wrong shape', () => {
    expect(loadGallery(null)).toEqual([]);
    expect(loadGallery({ levels: 'none' })).toEqual([]);
  });
});
