import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  STORY_VIEW_NOTIFY_CHANNEL,
  storyUpdateHintSchema,
} from '../src/stories';

test('story update hint accepts only the public committed-view envelope', () => {
  const hint = storyUpdateHintSchema.parse({
    eventId: randomUUID(),
    storyId: randomUUID(),
    viewVersion: 3,
    kind: 'committed-view',
  });
  assert.equal(hint.kind, 'committed-view');
  assert.equal(STORY_VIEW_NOTIFY_CHANNEL, 'offscreen_story_view');
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
