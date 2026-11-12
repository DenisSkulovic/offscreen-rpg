import assert from 'node:assert/strict';
import test from 'node:test';
import {
  publicReceiptState,
  resolutionRequestDigest,
} from '../dist/stories/resolution-receipt.js';

test('receipt state maps generation lifecycle without inventing failure', () => {
  assert.equal(publicReceiptState('pending'), 'admitted');
  assert.equal(publicReceiptState('running'), 'processing');
  assert.equal(publicReceiptState('succeeded'), 'settled');
  assert.equal(publicReceiptState('failed'), 'failed');
  assert.equal(publicReceiptState('uncertain'), 'uncertain');
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
