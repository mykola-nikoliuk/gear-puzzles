import { toString } from '../core/fraction';
import { MOTOR_TEETH, MOTOR_VELOCITY, TEETH } from '../levels/generate';
import { SPEC_LIMITS } from '../levels/spec';

/** What the author model is told about the game. Stable, so it caches. */
export const SYSTEM_PROMPT = `You design levels for a gear-train puzzle that teaches gear ratios.

The board has a motor axle turning at ${toString(MOTOR_VELOCITY)} turns per second, clockwise
positive. The player places gears from a tray onto axles to make a target axle turn at an exact
speed. Every gear on an axle turns with that axle; meshed gears turn in opposite directions.

A level is a chain of axles after the motor:
- "motorTeeth": the motor gear, one of ${MOTOR_TEETH.join(', ')}.
- "axles": ${SPEC_LIMITS.axles.min} to ${SPEC_LIMITS.axles.max} steps. Each has "teeth", the gear driven by the
  previous axle. An optional "then" is a second gear stacked on the same axle (a compound gear)
  that drives the next axle instead. The last axle is the output and has no "then".
- A gear may never cover another axle, on either layer. Next to a compound gear this bites: the
  neighbour axle sits (then + next teeth)/2 away, which must clear the big gear's radius.
- Gear sizes are ${TEETH.join(', ')} teeth.
- "goal": the output speed as an exact fraction string, e.g. "-3/32". Work it out: each mesh
  multiplies the speed by -(driving teeth)/(driven teeth).
- "spareAxles": 0 to ${SPEC_LIMITS.spareAxles.max} empty axles, room to experiment.
- "decoys": up to ${SPEC_LIMITS.decoys.max} tooth counts of gears the solution does not use.
- "title" (up to ${SPEC_LIMITS.title.max} characters), "lesson" (one or two sentences on the idea the
  level teaches), "hints" (up to ${SPEC_LIMITS.hints.max} short nudges, most gentle first).

Every level is checked by a solver before any player sees it. If a check fails you get the
errors back; fix exactly what they say.`;

/** The JSON schema the reply must follow; the checks on values happen afterwards. */
export const SPEC_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    lesson: { type: 'string' },
    motorTeeth: { type: 'integer' },
    axles: {
      type: 'array',
      items: {
        type: 'object',
        properties: { teeth: { type: 'integer' }, then: { type: 'integer' } },
        required: ['teeth'],
        additionalProperties: false,
      },
    },
    goal: { type: 'string' },
    spareAxles: { type: 'integer' },
    decoys: { type: 'array', items: { type: 'integer' } },
    hints: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'lesson', 'motorTeeth', 'axles', 'goal', 'spareAxles', 'decoys', 'hints'],
  additionalProperties: false,
} as const;

export function briefPrompt(brief: string): string {
  return `Design one level. Brief: ${brief}`;
}

export function retryPrompt(errors: readonly string[]): string {
  return `The level failed its checks:\n${errors.map((error) => `- ${error}`).join('\n')}\nSend the whole corrected level.`;
}
