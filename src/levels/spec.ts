import { equals, fraction, multiply, negate, toString, type Fraction } from '../core/fraction';
import { PIN_RADIUS, pitchRadius, tipRadius } from '../core/model';
import { MOTOR_TEETH, MOTOR_VELOCITY, TEETH, type TrainAxle, type TrainPlan } from './generate';

/**
 * A level as an author writes it, by hand or by an LLM: the gear train and what it teaches,
 * with no geometry. The author states the goal speed too, so a wrong sum gets caught.
 */
export interface LevelSpec extends TrainPlan {
  readonly title: string;
  /** What the player should take away, in a sentence or two. */
  readonly lesson: string;
  /** The output axle's speed in turns per second, as the author worked it out: "-1/8". */
  readonly goal: string;
  /** Empty axles off the train, room to try things out. */
  readonly spareAxles: number;
  /** Tooth counts of gears the solution does not need. */
  readonly decoys: readonly number[];
  /** Nudges shown one at a time when the player asks. */
  readonly hints: readonly string[];
}

export type SpecResult =
  | { readonly ok: true; readonly spec: LevelSpec }
  /** Every problem found, each in a sentence an author (or an LLM) can act on. */
  | { readonly ok: false; readonly errors: readonly string[] };

export const SPEC_LIMITS = {
  axles: { min: 1, max: 6 },
  spareAxles: { min: 0, max: 4 },
  decoys: { max: 4 },
  hints: { max: 3 },
  title: { max: 60 },
  lesson: { max: 280 },
} as const;

const FRACTION = /^\s*(-?\d+)\s*(?:\/\s*(\d+)\s*)?$/;

/** "3/8", "-1/16" or "2" as an exact fraction; `null` if it is not one. */
export function parseFraction(text: string): Fraction | null {
  const match = FRACTION.exec(text);
  if (!match) return null;
  const den = Number(match[2] ?? 1);
  return den === 0 ? null : fraction(Number(match[1]), den);
}

/**
 * The output speed of a plan, worked out mesh by mesh: each mesh turns the other way,
 * scaled by driving teeth over driven teeth. Stacked gears turn with their axle.
 */
export function outputVelocity(plan: TrainPlan): Fraction {
  let velocity = MOTOR_VELOCITY;
  let driving = plan.motorTeeth;
  for (const axle of plan.axles) {
    velocity = negate(multiply(velocity, fraction(driving, axle.teeth)));
    driving = axle.then ?? axle.teeth;
  }
  return velocity;
}

/**
 * Compound stages back to back cannot always fit: the second stage's stacked gear shares a
 * layer with the first stage's driven gear, at a distance the meshes between them fix, so
 * no layout can pull them apart. One message per clash.
 */
export function stackClashes(plan: TrainPlan): string[] {
  return plan.axles.flatMap((axle, i) => {
    const previous = plan.axles[i - 1];
    if (axle.then === undefined || previous?.then === undefined) return [];
    const apart = pitchRadius(previous.then) + pitchRadius(axle.teeth);
    const needed = tipRadius(previous.teeth) + tipRadius(axle.then);
    if (apart >= needed) return [];
    return [
      `axles[${i}].then (${axle.then} teeth) hits the ${previous.teeth}-tooth gear on ` +
        `axles[${i - 1}]: they share a layer ${apart} apart but need ${needed}. The distance is ` +
        `half of axles[${i - 1}].then + axles[${i}].teeth, so make those bigger, make ` +
        `axles[${i - 1}].teeth or axles[${i}].then smaller, or put a plain axle between the stages.`,
    ];
  });
}

/**
 * No gear may cover another axle, on either layer. Next to a compound gear the neighbour axle
 * sits only as far out as the stacked gear reaches, so the big gear under it, or a big stacked
 * gear on the neighbour, can land on a pin. One message per clash.
 */
export function pinClashes(plan: TrainPlan): string[] {
  return plan.axles.flatMap((axle, i) => {
    const next = plan.axles[i + 1];
    if (axle.then === undefined || !next) return [];
    const apart = pitchRadius(axle.then) + pitchRadius(next.teeth);
    const covers = (where: string, teeth: number, pin: string) =>
      apart >= tipRadius(teeth) + PIN_RADIUS
        ? []
        : [
            `${where} (${teeth} teeth) covers the pin of ${pin}: the axles are ${apart} apart ` +
              `but need ${tipRadius(teeth) + PIN_RADIUS}. The distance is half of ` +
              `axles[${i}].then + axles[${i + 1}].teeth, so make those bigger or ${where} smaller.`,
          ];
    return [
      ...covers(`axles[${i}].teeth`, axle.teeth, `axles[${i + 1}]`),
      ...(next.then === undefined ? [] : covers(`axles[${i + 1}].then`, next.then, `axles[${i}]`)),
    ];
  });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const listOf = (sizes: readonly number[]) => sizes.join(', ');

/** Checks a spec from untrusted JSON: shape, ranges, and that the stated goal is right. */
export function parseSpec(input: unknown): SpecResult {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['The level must be a JSON object.'] };

  const text = (key: string, max: number): string => {
    const value = input[key];
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`"${key}" must be a non-empty string.`);
      return '';
    }
    if (value.length > max) errors.push(`"${key}" must be at most ${max} characters.`);
    return value.trim();
  };
  const count = (key: string, min: number, max: number): number => {
    const value = input[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
      errors.push(`"${key}" must be a whole number from ${min} to ${max}.`);
      return min;
    }
    return value;
  };
  const teeth = (where: string, value: unknown, sizes: readonly number[]): number => {
    if (typeof value !== 'number' || !sizes.includes(value)) {
      errors.push(`${where} must be one of ${listOf(sizes)} teeth, got ${JSON.stringify(value)}.`);
      return sizes[0] ?? 0;
    }
    return value;
  };

  const title = text('title', SPEC_LIMITS.title.max);
  const lesson = text('lesson', SPEC_LIMITS.lesson.max);
  const motorTeeth = teeth('"motorTeeth"', input.motorTeeth, MOTOR_TEETH);

  const axles: TrainAxle[] = [];
  const rawAxles = input.axles;
  const { min, max } = SPEC_LIMITS.axles;
  if (!Array.isArray(rawAxles) || rawAxles.length < min || rawAxles.length > max) {
    errors.push(`"axles" must be a list of ${min} to ${max} axles.`);
  } else {
    rawAxles.forEach((raw: unknown, i) => {
      const where = `axles[${i}]`;
      if (!isRecord(raw)) {
        errors.push(`${where} must be an object like {"teeth": 16} or {"teeth": 16, "then": 8}.`);
        return;
      }
      const axle: { teeth: number; then?: number } = {
        teeth: teeth(`${where}.teeth`, raw.teeth, TEETH),
      };
      if (raw.then !== undefined) {
        if (i === rawAxles.length - 1) {
          errors.push(`${where} is the output axle, so it cannot have "then": nothing follows it.`);
        } else {
          axle.then = teeth(`${where}.then`, raw.then, TEETH);
        }
      }
      axles.push(axle);
    });
  }

  const spareAxles = count('spareAxles', SPEC_LIMITS.spareAxles.min, SPEC_LIMITS.spareAxles.max);

  const decoys: number[] = [];
  if (!Array.isArray(input.decoys) || input.decoys.length > SPEC_LIMITS.decoys.max) {
    errors.push(`"decoys" must be a list of at most ${SPEC_LIMITS.decoys.max} tooth counts.`);
  } else {
    input.decoys.forEach((raw: unknown, i) => decoys.push(teeth(`decoys[${i}]`, raw, TEETH)));
  }

  const hints: string[] = [];
  if (!Array.isArray(input.hints) || input.hints.length > SPEC_LIMITS.hints.max) {
    errors.push(`"hints" must be a list of at most ${SPEC_LIMITS.hints.max} strings.`);
  } else {
    input.hints.forEach((raw: unknown, i) => {
      if (typeof raw === 'string' && raw.trim() !== '') hints.push(raw.trim());
      else errors.push(`hints[${i}] must be a non-empty string.`);
    });
  }

  // The train checks below are only worth running once its parts are valid.
  const partsValid = errors.length === 0;
  if (partsValid)
    errors.push(...stackClashes({ motorTeeth, axles }), ...pinClashes({ motorTeeth, axles }));

  const goal = typeof input.goal === 'string' ? parseFraction(input.goal) : null;
  if (!goal) {
    errors.push(`"goal" must be the output speed as a fraction string, like "-3/8".`);
  } else if (partsValid) {
    const actual = outputVelocity({ motorTeeth, axles });
    if (!equals(goal, actual)) {
      errors.push(
        `"goal" says ${toString(goal)}, but this train turns the output at ${toString(actual)}. ` +
          `The motor turns at ${toString(MOTOR_VELOCITY)}; each mesh multiplies by ` +
          `-(driving teeth)/(driven teeth). Fix the goal or the gears.`,
      );
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    spec: {
      title,
      lesson,
      motorTeeth,
      axles,
      goal: toString(goal ?? MOTOR_VELOCITY),
      spareAxles,
      decoys,
      hints,
    },
  };
}
