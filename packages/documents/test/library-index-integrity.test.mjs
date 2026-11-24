import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  applyLibraryBatch,
  assertLibraryIndexConsistent,
  createEmptyLibraryIndex,
  emptyLibraryRootHash,
  hashCanonicalJson,
  libraryNodeV2Schema,
  loadLibraryIndex,
} from '../dist/index.js';

const PLACEHOLDER_HASH = 'a'.repeat(64);

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

function readNodeFromStore(store) {
  return async (hash) => {
    const node = store.get(hash);
    if (node === undefined) {
      throw new Error(`Missing library node for hash ${hash}`);
    }
    return node;
  };
}

function cloneStore(store) {
  return new Map([...store.entries()]);
}

function findFirstValueNodeHash(store) {
  for (const [hash, node] of store) {
    if (node.value !== null) {
      return hash;
    }
  }
  return null;
}

test('loadLibraryIndex round-trips createEmptyLibraryIndex', async () => {
  const empty = createEmptyLibraryIndex();
  const loaded = await loadLibraryIndex(
    readNodeFromStore(empty.store),
    empty.root,
  );
  assert.deepEqual(loaded.root, empty.root);
  assert.equal(loaded.rootHash, empty.rootHash);
  assertLibraryIndexConsistent(loaded);
  for (const [hash, node] of empty.store) {
    assert.deepEqual(loaded.store.get(hash), node);
  }
});

test('valid create, rename, and delete stay consistent with unchanged baseline hashes', async () => {
  const baseline = createEmptyLibraryIndex();
  const baselineRootHash = baseline.rootHash;
  const baselineNodeHashes = [...baseline.store.keys()].sort();

  const documentId = randomUUID();
  const created = applyLibraryBatch(baseline, [
    { op: 'create', entry: makeEntry(documentId, 'corpus/alpha.md') },
  ]);
  const createdRootHash = created.rootHash;
  assertLibraryIndexConsistent(created);

  const renamed = applyLibraryBatch(created, [
    { op: 'rename', documentId, path: 'corpus/beta.md' },
  ]);
  assertLibraryIndexConsistent(renamed);

  const deleted = applyLibraryBatch(renamed, [{ op: 'delete', documentId }]);
  assertLibraryIndexConsistent(deleted);

  assert.equal(baseline.rootHash, baselineRootHash);
  assert.deepEqual([...baseline.store.keys()].sort(), baselineNodeHashes);
  assert.notEqual(created.rootHash, baselineRootHash);
  assert.notEqual(renamed.rootHash, createdRootHash);

  const roundTrip = await loadLibraryIndex(
    readNodeFromStore(deleted.store),
    deleted.root,
  );
  assert.equal(roundTrip.rootHash, deleted.rootHash);
  assert.equal(
    hashCanonicalJson(roundTrip.root),
    hashCanonicalJson(deleted.root),
  );
});

test('loadLibraryIndex rejects substituted same-shape node under requested hash', async () => {
  const library = applyLibraryBatch(createEmptyLibraryIndex(), [
    { op: 'create', entry: makeEntry(randomUUID(), 'corpus/substitute.md') },
  ]);
  const valueHash = findFirstValueNodeHash(library.store);
  assert.ok(valueHash);
  const original = libraryNodeV2Schema.parse(library.store.get(valueHash));
  const substituted = libraryNodeV2Schema.parse(structuredClone(original));
  substituted.value = {
    ...substituted.value,
    objectHash: 'b'.repeat(64),
  };
  assert.notEqual(hashCanonicalJson(substituted), valueHash);

  const tampered = cloneStore(library.store);
  tampered.set(valueHash, substituted);

  await assert.rejects(
    () => loadLibraryIndex(readNodeFromStore(tampered), library.root),
    /content hash does not match requested hash/,
  );
});

test('loadLibraryIndex rejects malformed node payload', async () => {
  const library = createEmptyLibraryIndex();
  const tampered = cloneStore(library.store);
  tampered.set(library.root.pathsRootHash, {
    format: 'offscreen.library-node.v2',
    value: null,
    children: 'not-an-array',
  });

  await assert.rejects(
    () => loadLibraryIndex(readNodeFromStore(tampered), library.root),
    /Invalid input|expected array/,
  );
});

test('loadLibraryIndex rejects corrupt root before traversal', async () => {
  const library = createEmptyLibraryIndex();
  await assert.rejects(
    () =>
      loadLibraryIndex(readNodeFromStore(library.store), {
        format: 'offscreen.library-root.v2',
      }),
    /Invalid input|Required/,
  );
});

test('assertLibraryIndexConsistent rejects rootHash mismatch', () => {
  const library = createEmptyLibraryIndex();
  assert.throws(
    () =>
      assertLibraryIndexConsistent({
        ...library,
        rootHash: 'f'.repeat(64),
      }),
    /root hash does not match canonical root/,
  );
});

test('loadLibraryIndex rejects malformed child node', async () => {
  const library = applyLibraryBatch(createEmptyLibraryIndex(), [
    { op: 'create', entry: makeEntry(randomUUID(), 'corpus/child.md') },
  ]);
  const childHash = [...library.store.keys()].find(
    (hash) =>
      hash !== emptyLibraryRootHash &&
      hash !== library.root.pathsRootHash &&
      hash !== library.root.idsRootHash,
  );
  assert.ok(childHash, 'expected trie interior node hash');

  const tampered = cloneStore(library.store);
  tampered.set(childHash, { format: 'tampered-node' });

  await assert.rejects(
    () => loadLibraryIndex(readNodeFromStore(tampered), library.root),
    /Invalid input|Expected/,
  );
});

test('loadLibraryIndex does not silently rehash or auto-repair corrupt nodes', async () => {
  const library = applyLibraryBatch(createEmptyLibraryIndex(), [
    { op: 'create', entry: makeEntry(randomUUID(), 'corpus/no-repair.md') },
  ]);
  const valueHash = findFirstValueNodeHash(library.store);
  assert.ok(valueHash);
  const original = libraryNodeV2Schema.parse(library.store.get(valueHash));
  const substituted = libraryNodeV2Schema.parse(structuredClone(original));
  substituted.value = {
    ...substituted.value,
    revision: original.value.revision + 99,
  };

  const tampered = cloneStore(library.store);
  tampered.set(valueHash, substituted);
  const tamperedSnapshot = structuredClone(
    Object.fromEntries(tampered.entries()),
  );

  await assert.rejects(
    () => loadLibraryIndex(readNodeFromStore(tampered), library.root),
    /content hash does not match requested hash/,
  );

  assert.deepEqual(Object.fromEntries(tampered.entries()), tamperedSnapshot);
  assert.notEqual(hashCanonicalJson(substituted), valueHash);
  assert.equal(
    tampered.get(valueHash).value.revision,
    substituted.value.revision,
  );
});
