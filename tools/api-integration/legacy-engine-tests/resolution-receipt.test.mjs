import assert from 'node:assert/strict';
import test from 'node:test';
import {
  publicReceiptRecovery,
  publicReceiptState,
  resolutionRequestDigest,
} from '../../../packages/story-engine/dist/stories/resolution-receipt.js';

test('receipt state maps generation lifecycle without inventing failure', () => {
  assert.equal(publicReceiptState('pending'), 'admitted');
  assert.equal(publicReceiptState('running'), 'processing');
  assert.equal(publicReceiptState('succeeded'), 'settled');
  assert.equal(publicReceiptState('failed'), 'failed');
  assert.equal(publicReceiptState('uncertain'), 'uncertain');
});

test('uncertain receipts require operator; confirmed-budget failures stay retryable', () => {
  assert.equal(publicReceiptRecovery('uncertain', null), 'operator');
  assert.equal(publicReceiptRecovery('failed', 'usage_uncertain'), 'operator');
  assert.equal(publicReceiptRecovery('failed', 'budget_unavailable'), 'retry');
  assert.equal(publicReceiptRecovery('failed', 'provider_disabled'), 'retry');
  assert.equal(publicReceiptRecovery('failed', 'context_too_large'), 'none');
  assert.equal(publicReceiptRecovery('succeeded', null), null);
  assert.equal(publicReceiptRecovery('running', null), null);
});

test('request digest is SHA-256 of canonical validated expectedRevision+submission', () => {
  const digest = resolutionRequestDigest({
    expectedRevision: 1,
    submission: {
      interactionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      answer: { kind: 'choice.v1', optionId: 'inspect' },
    },
  });
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(
    resolutionRequestDigest({
      expectedRevision: 1,
      submission: {
        answer: { optionId: 'inspect', kind: 'choice.v1' },
        interactionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      },
    }),
    digest,
  );
  assert.notEqual(
    resolutionRequestDigest({
      expectedRevision: 2,
      submission: {
        interactionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        answer: { kind: 'choice.v1', optionId: 'inspect' },
      },
    }),
    digest,
  );
});
