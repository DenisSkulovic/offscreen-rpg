import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  applyLibraryBatch,
  assertLibraryIndexConsistent,
  createEmptyLibraryIndex,
  getLibraryTrieValue,
  hashCanonicalJson,
  setLibraryTrieValue,
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

function makeCreateBatch(count) {
  return Array.from({ length: count }, (_, index) => {
    const path = `corpus/entry-${index}.md`;
    return {
      op: 'create',
      entry: makeEntry(randomUUID(), path),
    };
  });
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

test('100 creates yield identical root hashes regardless of batch order', () => {
  const orderedBatch = makeCreateBatch(100);

  const ordered = applyLibraryBatch(createEmptyLibraryIndex(), orderedBatch);
  const shuffled = applyLibraryBatch(createEmptyLibraryIndex(), shuffle([...orderedBatch]));
  const reshuffled = applyLibraryBatch(
    createEmptyLibraryIndex(),
    shuffle([...orderedBatch]),
  );

  assert.equal(ordered.rootHash, shuffled.rootHash);
  assert.equal(ordered.rootHash, reshuffled.rootHash);
  assertLibraryIndexConsistent(ordered);
});

test('rename updates path and ID leaf while original library stays immutable', () => {
  const documentId = randomUUID();
  const oldPath = 'corpus/original.md';
  const newPath = 'corpus/renamed.md';
  const original = createEmptyLibraryIndex();
  const originalRootHash = original.rootHash;
  const created = applyLibraryBatch(original, [
    { op: 'create', entry: makeEntry(documentId, oldPath) },
  ]);
  const renamed = applyLibraryBatch(created, [
    { op: 'rename', documentId, path: newPath },
  ]);

  assert.equal(original.rootHash, originalRootHash);
  assert.equal(
    getLibraryTrieValue(renamed.store, renamed.root.pathsRootHash, oldPath),
    null,
  );
  const pathLeaf = getLibraryTrieValue(
    renamed.store,
    renamed.root.pathsRootHash,
    newPath,
  );
  assert.equal(pathLeaf.documentId, documentId);
  assert.equal(pathLeaf.path, newPath);
  const idLeaf = getLibraryTrieValue(
    renamed.store,
    renamed.root.idsRootHash,
    documentId.toLowerCase(),
  );
  assert.equal(idLeaf.documentId, documentId);
  assert.equal(idLeaf.path, newPath);
});

test('create duplicate path is rejected', () => {
  const path = 'corpus/dup.md';
  const first = applyLibraryBatch(createEmptyLibraryIndex(), [
    { op: 'create', entry: makeEntry(randomUUID(), path) },
  ]);
  assert.throws(
    () =>
      applyLibraryBatch(first, [
        { op: 'create', entry: makeEntry(randomUUID(), path) },
      ]),
    /already exists/,
  );
});

test('rename onto an occupied path is rejected', () => {
  const blockedPath = 'corpus/blocked.md';
  const movingId = randomUUID();
  let library = applyLibraryBatch(createEmptyLibraryIndex(), [
    { op: 'create', entry: makeEntry(randomUUID(), blockedPath) },
    { op: 'create', entry: makeEntry(movingId, 'corpus/moving.md') },
  ]);
  assert.throws(
    () =>
      applyLibraryBatch(library, [
        { op: 'rename', documentId: movingId, path: blockedPath },
      ]),
    /already exists/,
  );
});

test('assertLibraryIndexConsistent rejects ID leaf pointing at absent path', () => {
  const documentId = randomUUID();
  const path = 'corpus/consistency.md';
  const library = applyLibraryBatch(createEmptyLibraryIndex(), [
    { op: 'create', entry: makeEntry(documentId, path) },
  ]);
  const ghostPath = 'corpus/ghost.md';
  const idKey = documentId.toLowerCase();
  const corruptedId = setLibraryTrieValue(
    library.store,
    library.root.idsRootHash,
    idKey,
    { documentId, path: ghostPath },
  );
  const corruptRoot = {
    format: 'offscreen.library-root.v2',
    pathsRootHash: library.root.pathsRootHash,
    idsRootHash: corruptedId.rootHash,
  };
  assert.throws(
    () =>
      assertLibraryIndexConsistent({
        store: corruptedId.store,
        root: corruptRoot,
        rootHash: hashCanonicalJson(corruptRoot),
      }),
    /absent path/,
  );
});