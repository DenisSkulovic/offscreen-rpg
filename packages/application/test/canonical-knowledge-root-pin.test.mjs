import assert from 'node:assert/strict';
import test from 'node:test';

import { loadCanonicalKnowledge } from '../dist/storyteller/canonical-knowledge.js';

const PARENT_STORY_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CHILD_STORY_UUID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ROOT_HASH = 'cd'.repeat(32);

function makeStorage() {
  let readDocumentCalled = false;
  const storage = {
    async readManifest() {
      return {
        format: 'offscreen.manifest.v1',
        campaignId: PARENT_STORY_UUID,
        revision: 2,
        previousRootHash: null,
        authorOperationId: null,
        entries: [],
      };
    },
    async readDocument() {
      readDocumentCalled = true;
      throw new Error('readDocument must not be called');
    },
    wasReadDocumentCalled() {
      return readDocumentCalled;
    },
  };
  return storage;
}

const expectedMessage = 'Canonical context root does not match its campaign';

test('parent rootHash with child storyId is refused', async () => {
  const storage = makeStorage();

  await assert.rejects(
    async () =>
      loadCanonicalKnowledge(storage, {
        storyId: CHILD_STORY_UUID,
        rootHash: ROOT_HASH,
        rootRevision: 2,
      }),
    (error) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, expectedMessage);
      return true;
    },
  );
  assert.equal(storage.wasReadDocumentCalled(), false);
});

test('parent rootHash with mismatched rootRevision is refused', async () => {
  const storage = makeStorage();

  await assert.rejects(
    async () =>
      loadCanonicalKnowledge(storage, {
        storyId: PARENT_STORY_UUID,
        rootHash: ROOT_HASH,
        rootRevision: 1,
      }),
    (error) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, expectedMessage);
      return true;
    },
  );
  assert.equal(storage.wasReadDocumentCalled(), false);
});