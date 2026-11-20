import assert from 'node:assert/strict';
import test from 'node:test';
import { StoryError } from '../dist/stories/errors.js';
import { formatPublicationBlockedFailureCode } from '../dist/storyteller/runtime.js';

test('formatPublicationBlockedFailureCode keeps StoryError code and reason', () => {
  assert.equal(
    formatPublicationBlockedFailureCode(new StoryError('invalid')),
    'publication_blocked:invalid',
  );
  assert.equal(
    formatPublicationBlockedFailureCode(
      new StoryError('unavailable', 'document_store'),
    ),
    'publication_blocked:unavailable:document_store',
  );
  assert.equal(
    formatPublicationBlockedFailureCode(new StoryError('conflict', 'document_root')),
    'publication_blocked:conflict:document_root',
  );
});