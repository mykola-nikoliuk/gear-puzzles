import { generateLevel, type GeneratedLevel, type LevelOptions } from './generate';

/** Seeds for numbered levels are spread apart, so neighbouring levels look nothing alike. */
const SEED_STEP = 7919;
/** Seeds to try in turn if a level's own seed has no train that fits. */
const SEED_TRIES = 5;

/**
 * The options for level `number` (1 and up): longer trains, more compound gears and more
 * gears to sort through as the levels go on.
 */
export function levelOptions(number: number): Required<LevelOptions> {
  return {
    axles: Math.min(2 + Math.floor((number - 1) / 2), 6),
    compoundChance: Math.min(0.2 + 0.1 * number, 0.6),
    spareAxles: Math.min(1 + Math.floor(number / 3), 4),
    decoys: Math.min(1 + Math.floor(number / 2), 5),
    keep: 0,
  };
}

/** Level `number`, the same every time. */
export function numberedLevel(number: number): GeneratedLevel {
  const options = levelOptions(number);
  let lastError: unknown;
  for (let attempt = 0; attempt < SEED_TRIES; attempt++) {
    try {
      return generateLevel(number * SEED_STEP + attempt, options);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
