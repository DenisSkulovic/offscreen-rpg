import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  applyLibraryBatch,
  createEmptyLibraryIndex,
  documentManifestSchema,
  getLibraryTrieValue,
  hashCanonicalJson,
} from '../dist/index.js';

const PLACEHOLDER_HASH = 'a'.repeat(64);
const EMPTY_LIBRARY_ROOT_HASH =
  '8792cd06cfde5d250352b6acf9a0f67203dfc23ed8a28e04e19bffc5b5b050c3';
const V1_EMPTY_MANIFEST_HASH =
  '2ebec75b6902c51c722c5794633077efa93c5d91f3264ef4e709264601d26d72';

function benchDocumentId(index) {
  const digest = createHash('sha256')
    .update(`wr02-v2-bench/document-id/${index}`)
    .digest();
  const bytes = Uint8Array.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function benchPath(index) {
  return `corpus/bench-${String(index).padStart(5, '0')}.md`;
}

function makeEntry(documentId, path, revision = 1) {
  return {
    documentId,
    revision,
    path,
    objectHash: PLACEHOLDER_HASH,
    kind: 'lore',
    authority: 'source',
    visibility: 'player-known',
  };
}

function countNewNodes(before, after) {
  const prior = new Set(before.keys());
  let added = 0;
  for (const hash of after.keys()) {
    if (!prior.has(hash)) added += 1;
  }
  return added;
}

function canonicalBytesForNewNodes(before, after) {
  const prior = new Set(before.keys());
  let bytes = 0;
  for (const [hash, node] of after.entries()) {
    if (!prior.has(hash)) {
      bytes += Buffer.byteLength(hashCanonicalJson(node), 'utf8');
    }
  }
  return bytes;
}

test('library v2 bench: 10k insert, 1k replace, scene-37 fork pin, bounded last edit', () => {
  const insertBatch = Array.from({ length: 10_000 }, (_, index) => {
    const documentId = benchDocumentId(index);
    const path = benchPath(index);
    return { op: 'create', entry: makeEntry(documentId, path) };
  });

  let library = createEmptyLibraryIndex();
  const insertStart = performance.now();
  library = applyLibraryBatch(library, insertBatch);
  const insertMs = performance.now() - insertStart;

  if (insertMs > 90_000) {
    assert.fail(
      `10k insert exceeded 90s after Map fix: ${Math.round(insertMs)}ms counterexample`,
    );
  }

  const firstThousand = insertBatch.slice(0, 1_000).map((operation, index) => ({
    documentId: operation.entry.documentId,
    path: operation.entry.path,
    baseRevision: operation.entry.revision,
    index,
  }));

  let scene37 = null;
  const replaceStart = performance.now();
  for (let index = 0; index < 37; index += 1) {
    const target = firstThousand[index];
    library = applyLibraryBatch(library, [
      {
        op: 'replace',
        entry: makeEntry(target.documentId, target.path, target.baseRevision + 1),
      },
    ]);
    if (index === 36) {
      scene37 = {
        rootHash: library.rootHash,
        pathsRootHash: library.root.pathsRootHash,
        idsRootHash: library.root.idsRootHash,
      };
    }
  }
  library = applyLibraryBatch(
    library,
    firstThousand.slice(37).map((target) => ({
      op: 'replace',
      entry: makeEntry(target.documentId, target.path, target.baseRevision + 1),
    })),
  );
  const replaceMs = performance.now() - replaceStart;

  assert.ok(scene37);
  const rootHashAfter1k = library.rootHash;
  assert.notEqual(scene37.rootHash, rootHashAfter1k);

  assert.ok(library.store.has(scene37.pathsRootHash));
  assert.ok(library.store.has(scene37.idsRootHash));
  assert.equal(
    scene37.rootHash,
    hashCanonicalJson({
      format: 'offscreen.library-root.v2',
      pathsRootHash: scene37.pathsRootHash,
      idsRootHash: scene37.idsRootHash,
    }),
  );

  const probe = getLibraryTrieValue(
    library.store,
    scene37.pathsRootHash,
    firstThousand[0].path,
  );
  assert.equal(probe.revision, 2);

  const lastTarget = firstThousand[999];
  const storeBeforeLast = library.store;
  const priorHashes = new Set(storeBeforeLast.keys());
  library = applyLibraryBatch(library, [
    {
      op: 'replace',
      entry: makeEntry(lastTarget.documentId, lastTarget.path, 3),
    },
  ]);
  const newNodeCount = countNewNodes(storeBeforeLast, library.store);
  const newNodeBytes = canonicalBytesForNewNodes(storeBeforeLast, library.store);

  assert.ok(
    newNodeCount < 400,
    `last single-path replace wrote ${newNodeCount} new nodes (expected < 400)`,
  );

  const receipt = {
    storeNodeCount: library.store.size,
    lastEditNewNodeCount: newNodeCount,
    lastEditNewNodeBytes: newNodeBytes,
    insert10kMs: Math.round(insertMs),
    replace1kMs: Math.round(replaceMs),
    scene37RootHash: scene37.rootHash,
    finalRootHash: library.rootHash,
  };
  console.log(JSON.stringify({ wr02LibraryV2Bench: receipt }));

  assert.equal(createEmptyLibraryIndex().rootHash, EMPTY_LIBRARY_ROOT_HASH);
  const v1Fixture = documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId: '00000000-0000-4000-8000-000000000001',
    revision: 1,
    previousRootHash: null,
    authorOperationId: '00000000-0000-4000-8000-000000000002',
    entries: [],
  });
  assert.equal(hashCanonicalJson(v1Fixture), V1_EMPTY_MANIFEST_HASH);
});