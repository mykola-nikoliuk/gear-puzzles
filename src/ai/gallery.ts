import { buildLevel, type AuthoredLevel } from '../levels/build';
import { parseSpec, type LevelSpec } from '../levels/spec';

/** A level as the author script saves it: the spec, and how it was checked on the way. */
export interface AuthoredEntry {
  readonly brief: string;
  readonly seed: number;
  readonly spec: LevelSpec;
  /** Errors the checks sent back to the model before it got the level right. */
  readonly caught: readonly string[];
}

export interface GalleryLevel extends AuthoredLevel {
  readonly brief: string;
  readonly caught: readonly string[];
}

/**
 * Rebuilds saved levels, checking each again, so a hand-edited or stale file can never
 * put an unproven level in front of a player. Entries that fail are dropped.
 */
export function loadGallery(data: unknown): GalleryLevel[] {
  const levels =
    typeof data === 'object' && data !== null && 'levels' in data && Array.isArray(data.levels)
      ? (data.levels as unknown[])
      : [];
  return levels.flatMap((raw) => {
    if (typeof raw !== 'object' || raw === null) return [];
    const { brief, seed, spec, caught } = raw as Partial<Record<keyof AuthoredEntry, unknown>>;
    const parsed = parseSpec(spec);
    if (!parsed.ok || typeof seed !== 'number') return [];
    const built = buildLevel(parsed.spec, seed);
    if (!built.ok) return [];
    return [
      {
        ...built.level,
        brief: typeof brief === 'string' ? brief : '',
        caught: Array.isArray(caught) ? caught.filter((e) => typeof e === 'string') : [],
      },
    ];
  });
}
