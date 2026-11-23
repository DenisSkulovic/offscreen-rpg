import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  storyLaunchRequestSchema,
  storyLaunchStatusSchema,
} from '../src/story-launch';

const OPERATION_ID = '550e8400-e29b-41d4-a716-446655440000';
const STORY_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const PRESET_ROOT_HASH = '0123456789abcdef'.repeat(4);
const REQUEST_HASH = 'fedcba9876543210'.repeat(4);
const ISO_INSTANT = '2026-11-21T12:00:00.000Z';

function statusBase() {
  return {
    operationId: OPERATION_ID,
    requestHash: REQUEST_HASH,
    createdAt: ISO_INSTANT,
    updatedAt: ISO_INSTANT,
  };
}

test('accepts long original-world prompt launch request', () => {
  const prompt = 'x'.repeat(24000);
  const parsed = storyLaunchRequestSchema.safeParse({
    operationId: OPERATION_ID,
    source: { kind: 'prompt', prompt },
    hints: { worldInvention: 'original' },
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.source.kind, 'prompt');
    assert.equal(
      parsed.data.source.kind === 'prompt'
        ? parsed.data.source.prompt.length
        : 0,
      24000,
    );
    assert.deepEqual(parsed.data.hints, { worldInvention: 'original' });
  }
});

test('accepts pinned preset with optional customPrompt and no character or title', () => {
  const parsed = storyLaunchRequestSchema.safeParse({
    operationId: OPERATION_ID,
    source: {
      kind: 'preset',
      presetId: 'morrowind-open',
      presetRootHash: PRESET_ROOT_HASH,
      customPrompt: 'Begin in Balmora.',
    },
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.source.kind, 'preset');
  }
});

test('story launch request and status reject unsafe and malformed shapes', () => {
  const validPromptRequest = {
    operationId: OPERATION_ID,
    source: { kind: 'prompt' as const, prompt: 'Explore the ashlands.' },
  };

  assert.equal(
    storyLaunchRequestSchema.safeParse({
      source: validPromptRequest.source,
    }).success,
    false,
  );
  assert.equal(
    storyLaunchRequestSchema.safeParse({
      ...validPromptRequest,
      source: { kind: 'prompt', prompt: '   ' },
    }).success,
    false,
  );
  assert.equal(
    storyLaunchRequestSchema.safeParse({
      ...validPromptRequest,
      source: { kind: 'prompt', prompt: 'x'.repeat(24001) },
    }).success,
    false,
  );
  assert.equal(
    storyLaunchRequestSchema.safeParse({
      operationId: OPERATION_ID,
      source: {
        kind: 'preset',
        presetId: 'preset',
        presetRootHash: 'not-hex',
      },
    }).success,
    false,
  );
  assert.equal(
    storyLaunchRequestSchema.safeParse({
      ...validPromptRequest,
      ownerId: STORY_ID,
    }).success,
    false,
  );
  assert.equal(
    storyLaunchRequestSchema.safeParse({
      ...validPromptRequest,
      title: 'Forbidden',
    }).success,
    false,
  );

  const readyBase = {
    ...statusBase(),
    state: 'ready' as const,
    sceneSequence: 1,
  };
  assert.equal(storyLaunchStatusSchema.safeParse(readyBase).success, false);
  assert.equal(
    storyLaunchStatusSchema.safeParse({
      ...statusBase(),
      state: 'ready',
      storyId: STORY_ID,
    }).success,
    false,
  );
  assert.equal(
    storyLaunchStatusSchema.safeParse({
      ...statusBase(),
      state: 'uncertain',
      explanation: 'Upstream outcome unknown.',
      retryAllowed: true,
    }).success,
    false,
  );
  assert.equal(
    storyLaunchStatusSchema.safeParse({
      ...statusBase(),
      state: 'pending',
      sceneSequence: 1,
    }).success,
    false,
  );
});

test('story launch status accepts ready with storyId and sceneSequence', () => {
  const parsed = storyLaunchStatusSchema.safeParse({
    ...statusBase(),
    state: 'ready',
    storyId: STORY_ID,
    sceneSequence: 3,
  });
  assert.equal(parsed.success, true);
});
