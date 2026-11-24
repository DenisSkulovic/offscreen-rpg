import assert from 'node:assert/strict';
import test from 'node:test';
import { allNodesMatchDigest } from './kind-image-match.mjs';

const DIGEST_A = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const DIGEST_B = 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

test('allNodesMatchDigest requires every node to match', () => {
  assert.equal(allNodesMatchDigest(DIGEST_A, [DIGEST_A, DIGEST_A]), true);
  assert.equal(allNodesMatchDigest(DIGEST_A, [DIGEST_A, DIGEST_B]), false);
  assert.equal(allNodesMatchDigest(DIGEST_A, [DIGEST_A]), true);
  assert.equal(allNodesMatchDigest(DIGEST_A, []), false);
  assert.equal(allNodesMatchDigest('sha256:bad', [DIGEST_A]), false);
  assert.equal(allNodesMatchDigest(DIGEST_A, ['sha256:bad']), false);
});