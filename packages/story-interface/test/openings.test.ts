import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { openingPreviewSchema } from '../src/openings';

const preview = {
  id: randomUUID(),
  sourceRevision: 1,
  isCurrent: true,
  mode: 'scripted' as const,
  state: 'succeeded' as const,
};

test('a successful preview presents scene and choices without option intentions', () => {
  const parsed = openingPreviewSchema.parse({
    ...preview,
    candidate: {
      content: {
        version: 1,
        title: 'A fork in the path',
        paragraphs: ['The path splits.'],
      },
      interaction: {
        kind: 'choice.v1',
        prompt: 'What do you attempt?',
        options: [
          { id: 'follow-water', label: 'Walk toward the water' },
          { id: 'take-quiet-path', label: 'Take the quieter path' },
        ],
      },
    },
  });
  assert.equal(parsed.candidate?.interaction.options.length, 2);
  assert.equal(
    openingPreviewSchema.safeParse({
      ...preview,
      candidate: {
        content: parsed.candidate!.content,
        interaction: {
          ...parsed.candidate!.interaction,
          options: [
            {
              id: 'follow-water',
              label: 'Walk toward the water',
              intention: 'Follow the sound of water.',
            },
          ],
        },
      },
    }).success,
    false,
  );
});
