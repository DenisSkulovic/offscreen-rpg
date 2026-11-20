import assert from 'node:assert/strict';
import test from 'node:test';
import { publicResolutionReason } from '../dist/stories/reads.js';

test('publicResolutionReason collapses structured publication failure codes', () => {
  assert.equal(
    publicResolutionReason('publication_blocked:invalid', 'succeeded'),
    'publication_blocked',
  );
  assert.equal(
    publicResolutionReason(
      'publication_blocked:conflict:document_root',
      null,
    ),
    'publication_blocked',
  );
  assert.equal(
    publicResolutionReason('publication_blocked', null),
    'publication_blocked',
  );
});

test('publicResolutionReason leaves generation failure codes unchanged', () => {
  assert.equal(publicResolutionReason(null, 'invalid_output'), 'invalid_output');
  assert.equal(
    publicResolutionReason(null, 'publication_blocked:invalid'),
    'publication_blocked:invalid',
  );
});