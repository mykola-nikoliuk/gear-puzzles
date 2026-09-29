import Anthropic from '@anthropic-ai/sdk';
import type { Complete } from './author';
import { SPEC_SCHEMA, SYSTEM_PROMPT } from './prompt';

export const MODEL = 'claude-opus-5-5';

/**
 * A `Complete` backed by the Claude API. In the browser the key is the player's own and
 * goes straight to Anthropic, never through a server of ours.
 */
export const TIMEOUT_MS = 90_000;

export function claudeComplete(apiKey: string): Complete {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    // One try takes seconds; a request that runs this long is stuck, so give up and say so.
    timeout: TIMEOUT_MS,
    maxRetries: 1,
  });
  return async (turns) => {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // If a safety classifier declines, the API retries on a fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SPEC_SCHEMA } },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: turns.map(({ role, content }) => ({ role, content })),
    });
    if (response.stop_reason === 'refusal') throw new Error('The model declined to write a level.');
    if (response.stop_reason === 'max_tokens') throw new Error('The reply was cut off.');
    return response.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('');
  };
}
