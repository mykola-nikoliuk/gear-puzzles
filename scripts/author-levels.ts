/**
 * Asks Claude for a level per brief and writes the ones that pass every check to
 * src/ai/authored.json, with the mistakes the checks caught on the way.
 *
 *   ANTHROPIC_API_KEY in .env, then: yarn author
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { claudeComplete, MODEL } from '../src/ai/anthropic';
import { authorLevel } from '../src/ai/author';
import type { AuthoredEntry } from '../src/ai/gallery';
import { BRIEFS } from '../src/ai/briefs';

const OUT = new URL('../src/ai/authored.json', import.meta.url);

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error('Set ANTHROPIC_API_KEY in .env');
const complete = claudeComplete(apiKey);

const entries: AuthoredEntry[] = [];
for (const [index, brief] of BRIEFS.entries()) {
  const seed = index + 1;
  const result = await authorLevel(brief, complete, { seed });
  const caught = result.attempts.flatMap(({ errors }) => errors);
  if (result.ok) {
    const { spec, minMoves } = result.level;
    entries.push({ brief, seed, spec, caught });
    console.log(`✓ ${spec.title} (${minMoves ?? '?'} moves, ${caught.length} caught)`);
  } else {
    console.log(`✗ ${brief}\n  ${caught.join('\n  ')}`);
  }
}

const json = JSON.stringify({ model: MODEL, levels: entries });
const filepath = fileURLToPath(OUT);
const options = { ...(await resolveConfig(filepath)), filepath };
writeFileSync(OUT, await format(json, options));
console.log(`${entries.length}/${BRIEFS.length} levels written to src/ai/authored.json`);
