import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import {
  canonicalResolutionRequestJson,
  resolutionOperationReceiptSchema,
} from '../src/stories';

test('canonical resolution request JSON sorts nested keys for stable digests', () => {
  const left = canonicalResolutionRequestJson({
    expectedRevision: 1,
    submission: {
      interactionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      answer: { kind: 'choice.v1', optionId: 'go' },
    },
  });
  const right = canonicalResolutionRequestJson({
    expectedRevision: 1,
    submission: {
      answer: { optionId: 'go', kind: 'choice.v1' },
      interactionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    },
  });
  assert.equal(left, right);
  assert.equal(
    createHash('sha256').update(left, 'utf8').digest('hex').length,
    64,
  );
});

test('resolution receipt schema rejects submission bodies and forged digests shapes', () => {
  const operationId = randomUUID();
  const storyId = randomUUID();
  const valid = {
    operationId,
    storyId,
    state: 'admitted' as const,
    viewVersion: 2,
    resolutionVersion: 0,
    reason: null,
    recovery: null,
    requestDigest: 'a'.repeat(64),
  };
  assert.deepEqual(resolutionOperationReceiptSchema.parse(valid), valid);
  assert.equal(
    resolutionOperationReceiptSchema.safeParse({
      ...valid,
      submission: { secret: true },
    }).success,
    false,
  );
  assert.equal(
    resolutionOperationReceiptSchema.safeParse({
      ...valid,
      requestDigest: 'not-a-digest',
    }).success,
    false,
  );
  assert.equal(
    resolutionOperationReceiptSchema.safeParse({
      ...valid,
      state: 'blocked',
    }).success,
    false,
  );
});
