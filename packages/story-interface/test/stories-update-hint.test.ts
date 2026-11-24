import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { storyUpdateHintSchema } from '../src/stories.js';

test('story update hint accepts only the public committed-view envelope', () => {
  const hint = storyUpdateHintSchema.parse({
    eventId: randomUUID(),
    storyId: randomUUID(),
    viewVersion: 3,
    kind: 'committed-view',
  });
  assert.equal(hint.kind, 'committed-view');
});

test('story update hint rejects narrative or private fields (negative)', () => {
  const result = storyUpdateHintSchema.safeParse({
    eventId: randomUUID(),
    storyId: randomUUID(),
    viewVersion: 3,
    kind: 'committed-view',
    paragraphs: ['secret narration'],
  });
  assert.equal(result.success, false);
});