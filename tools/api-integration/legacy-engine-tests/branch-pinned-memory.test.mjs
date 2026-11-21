import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  BranchPinnedMemoryError,
  resolveBranchPinnedEvidence,
} from '../../../packages/story-engine/dist/storyteller/branch-pinned-memory.js';

const rootHash = 'c'.repeat(64);
const objectHash = 'ab'.repeat(32);

function makeManifest(overrides = {}) {
  const storyId = overrides.campaignId ?? randomUUID();
  const documentId = overrides.documentId ?? randomUUID();
  return {
    campaignId: storyId,
    revision: overrides.revision ?? 1,
    entries: [
      {
        documentId,
        revision: 1,
        path: 'characters/king.md',
        objectHash,
        kind: overrides.kind ?? 'character',
        authority: 'canon',
        visibility: overrides.visibility ?? 'player',
      },
    ],
  };
}

function makeStorage(manifest) {
  let readManifestCalls = 0;
  const storage = {
    readManifest: async () => {
      readManifestCalls += 1;
      return manifest;
    },
  };
  return { storage, get readManifestCalls() { return readManifestCalls; } };
}

test('matching owner and manifest returns entry objectHash only', async () => {
  const ownerId = randomUUID();
  const manifest = makeManifest();
  const storyId = manifest.campaignId;
  const documentId = manifest.entries[0].documentId;
  const { storage } = makeStorage(manifest);
  let authorizeCalls = 0;

  const result = await resolveBranchPinnedEvidence({
    storage,
    authorize: async ({ ownerId: oid, storyId: sid }) => {
      authorizeCalls += 1;
      return oid === ownerId && sid === storyId;
    },
    ownerId,
    storyId,
    rootHash,
    rootRevision: 1,
    handles: [documentId],
  });

  assert.equal(authorizeCalls, 1);
  assert.equal(result.partial, false);
  assert.equal(result.evidence.length, 1);
  assert.deepEqual(result.evidence[0], {
    documentId,
    path: 'characters/king.md',
    kind: 'character',
    objectHash,
    revision: 1,
  });
});

test('authorize false leaves readManifest uncalled and throws not-owned', async () => {
  const storyId = randomUUID();
  const manifest = makeManifest({ campaignId: storyId });
  const { storage, readManifestCalls } = makeStorage(manifest);
  let authorizeCalls = 0;

  await assert.rejects(
    () =>
      resolveBranchPinnedEvidence({
        storage,
        authorize: async () => {
          authorizeCalls += 1;
          return false;
        },
        ownerId: randomUUID(),
        storyId,
        rootHash,
        rootRevision: 1,
        handles: [manifest.entries[0].documentId],
      }),
    (error) => {
      assert.ok(error instanceof BranchPinnedMemoryError);
      assert.equal(error.code, 'not-owned');
      assert.equal(error.message, 'not-owned');
      return true;
    },
  );

  assert.equal(authorizeCalls, 1);
  assert.equal(readManifestCalls, 0);
});

test('parent campaignId on manifest with child storyId yields stale-root', async () => {
  const parentStoryId = randomUUID();
  const childStoryId = randomUUID();
  const manifest = makeManifest({ campaignId: parentStoryId });
  const { storage } = makeStorage(manifest);

  await assert.rejects(
    () =>
      resolveBranchPinnedEvidence({
        storage,
        authorize: async () => true,
        ownerId: randomUUID(),
        storyId: childStoryId,
        rootHash,
        rootRevision: 1,
        handles: [manifest.entries[0].documentId],
      }),
    (error) => {
      assert.ok(error instanceof BranchPinnedMemoryError);
      assert.equal(error.code, 'stale-root');
      return true;
    },
  );
});

test('manifest revision mismatch yields stale-root', async () => {
  const manifest = makeManifest({ revision: 2 });
  const storyId = manifest.campaignId;
  const { storage } = makeStorage(manifest);

  await assert.rejects(
    () =>
      resolveBranchPinnedEvidence({
        storage,
        authorize: async () => true,
        ownerId: randomUUID(),
        storyId,
        rootHash,
        rootRevision: 1,
        handles: [manifest.entries[0].documentId],
      }),
    (error) => {
      assert.ok(error instanceof BranchPinnedMemoryError);
      assert.equal(error.code, 'stale-root');
      return true;
    },
  );
});

test('private-possibility handle throws unknown-handle with code-only message', async () => {
  const manifest = makeManifest({ kind: 'private-possibility' });
  const storyId = manifest.campaignId;
  const documentId = manifest.entries[0].documentId;
  const { storage } = makeStorage(manifest);

  await assert.rejects(
    () =>
      resolveBranchPinnedEvidence({
        storage,
        authorize: async () => true,
        ownerId: randomUUID(),
        storyId,
        rootHash,
        rootRevision: 1,
        handles: [documentId],
      }),
    (error) => {
      assert.ok(error instanceof BranchPinnedMemoryError);
      assert.equal(error.code, 'unknown-handle');
      assert.equal(error.message, 'unknown-handle');
      assert.doesNotMatch(error.message, /king\.md/);
      assert.doesNotMatch(error.message, /characters/);
      return true;
    },
  );
});

test('nine handles yields read-limit without calling authorize', async () => {
  const manifest = makeManifest();
  const storyId = manifest.campaignId;
  const { storage } = makeStorage(manifest);
  let authorizeCalls = 0;
  const handles = Array.from({ length: 9 }, () => randomUUID());

  await assert.rejects(
    () =>
      resolveBranchPinnedEvidence({
        storage,
        authorize: async () => {
          authorizeCalls += 1;
          return true;
        },
        ownerId: randomUUID(),
        storyId,
        rootHash,
        rootRevision: 1,
        handles,
      }),
    (error) => {
      assert.ok(error instanceof BranchPinnedMemoryError);
      assert.equal(error.code, 'read-limit');
      return true;
    },
  );

  assert.equal(authorizeCalls, 0);
});