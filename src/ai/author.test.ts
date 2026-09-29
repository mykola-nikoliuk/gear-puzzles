import { describe, expect, it } from 'vitest';
import { authorLevel, type Complete, type Turn } from './author';

const good = {
  title: 'Slow it down',
  lesson: 'Two small-to-big meshes in a row multiply the slowdown.',
  motorTeeth: 12,
  axles: [{ teeth: 24, then: 12 }, { teeth: 24 }],
  goal: '1/16',
  spareAxles: 2,
  decoys: [8],
  hints: [],
};

/** A fake model that answers from a script and remembers what it was sent. */
function scripted(...replies: string[]) {
  const seen: (readonly Turn[])[] = [];
  const complete: Complete = (turns) => {
    seen.push([...turns]);
    return Promise.resolve(replies[seen.length - 1] ?? '');
  };
  return { complete, seen };
}

describe('authorLevel', () => {
  it('keeps a level that passes every check', async () => {
    const { complete } = scripted(JSON.stringify(good));
    const result = await authorLevel('two compound steps', complete);
    expect(result.ok).toBe(true);
    expect(result.attempts).toEqual([{ reply: JSON.stringify(good), errors: [] }]);
  });

  it('sends a wrong goal back to the model and keeps the fix', async () => {
    const wrong = JSON.stringify({ ...good, goal: '1/8' });
    const { complete, seen } = scripted(wrong, JSON.stringify(good));
    const result = await authorLevel('two compound steps', complete);

    expect(result.ok).toBe(true);
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]?.errors[0]).toContain('says 1/8');
    const retry = seen[1] ?? [];
    expect(retry.map(({ role }) => role)).toEqual(['user', 'assistant', 'user']);
    expect(retry[1]?.content).toBe(wrong);
    expect(retry[2]?.content).toContain('says 1/8');
  });

  it('reports a reply that is not JSON', async () => {
    const { complete } = scripted('Sure! Here is a level:', JSON.stringify(good));
    const result = await authorLevel('anything', complete);
    expect(result.attempts[0]?.errors).toEqual(['The reply is not valid JSON.']);
  });

  it('gives up after the last attempt', async () => {
    const bad = JSON.stringify({ ...good, motorTeeth: 7 });
    const { complete, seen } = scripted(bad, bad);
    const result = await authorLevel('anything', complete, { maxAttempts: 2 });
    expect(result.ok).toBe(false);
    expect(seen).toHaveLength(2);
  });

  it('puts the brief in the first message', async () => {
    const { complete, seen } = scripted(JSON.stringify(good));
    await authorLevel('teach idler gears', complete);
    expect(seen[0]?.[0]?.content).toContain('teach idler gears');
  });
});
