import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { hashCanonicalJson } from '@offscreen/documents';
import {
  canonicalStoryLaunchRequestJson,
  type StoryLaunchRequest,
} from '../src/story-launch';

function sha256Hex(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

test('canonicalStoryLaunchRequestJson matches hashCanonicalJson for unsorted keys', () => {
  const request = {
    source: { kind: 'prompt' as const, prompt: 'BAH' },
    operationId: '550e8400-e29b-41d4-a716-446655440000',
    hints: { storytellerProfile: 'absurd-action-comedy' },
  } satisfies StoryLaunchRequest;

  const canonical = canonicalStoryLaunchRequestJson(request);
  assert.equal(sha256Hex(canonical), hashCanonicalJson(request));
  assert.notEqual(
    sha256Hex(canonical),
    sha256Hex(JSON.stringify(request)),
  );
});