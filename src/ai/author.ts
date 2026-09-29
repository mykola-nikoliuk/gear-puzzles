import { buildLevel, type AuthoredLevel } from '../levels/build';
import { parseSpec } from '../levels/spec';
import { briefPrompt, retryPrompt } from './prompt';

export interface Turn {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

/** Sends the conversation so far to a model and returns its reply as text. */
export type Complete = (turns: readonly Turn[]) => Promise<string>;

/** One try by the model and what the checks made of it. */
export interface Attempt {
  readonly reply: string;
  /** Empty when the level passed. */
  readonly errors: readonly string[];
}

export type AuthorResult =
  | { readonly ok: true; readonly level: AuthoredLevel; readonly attempts: readonly Attempt[] }
  | { readonly ok: false; readonly attempts: readonly Attempt[] };

export interface AuthorOptions {
  /** Tries before giving up, the first one included. */
  readonly maxAttempts?: number;
  /** Seed for laying the level out on the board. */
  readonly seed?: number;
}

function check(reply: string, seed: number): { level?: AuthoredLevel; errors: string[] } {
  let json: unknown;
  try {
    json = JSON.parse(reply);
  } catch {
    return { errors: ['The reply is not valid JSON.'] };
  }
  const spec = parseSpec(json);
  if (!spec.ok) return { errors: [...spec.errors] };
  const built = buildLevel(spec.spec, seed);
  return built.ok ? { level: built.level, errors: [] } : { errors: [...built.errors] };
}

/**
 * Asks a model for a level and keeps nothing it cannot prove: each reply is parsed, its goal
 * re-computed and the level built and solved. Failures go back to the model as errors to fix.
 */
export async function authorLevel(
  brief: string,
  complete: Complete,
  { maxAttempts = 3, seed = 1 }: AuthorOptions = {},
): Promise<AuthorResult> {
  const turns: Turn[] = [{ role: 'user', content: briefPrompt(brief) }];
  const attempts: Attempt[] = [];

  for (let i = 0; i < maxAttempts; i++) {
    const reply = await complete(turns);
    const { level, errors } = check(reply, seed);
    attempts.push({ reply, errors });
    if (level) return { ok: true, level, attempts };
    turns.push(
      { role: 'assistant', content: reply },
      { role: 'user', content: retryPrompt(errors) },
    );
  }
  return { ok: false, attempts };
}
