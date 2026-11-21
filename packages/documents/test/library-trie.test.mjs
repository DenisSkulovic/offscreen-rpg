import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmptyLibraryTrie,
  deleteLibraryTrieKey,
  emptyLibraryRootHash,
  getLibraryTrieValue,
  setLibraryTrieValue,
} from '../dist/index.js';

function makeKeys(count) {
  return Array.from({ length: count }, (_, index) => `corpus/entry-${index}.md`);
}

function insertAll(store, rootHash, keys, valueForKey) {
  let nextStore = store;
  let nextRoot = rootHash;
  for (const key of keys) {
    const result = setLibraryTrieValue(nextStore, nextRoot, key, valueForKey(key));
    nextStore = result.store;
    nextRoot = result.rootHash;
  }
  return { store: nextStore, rootHash: nextRoot };
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

test('empty trie root hash is deterministic and includes the empty node', () => {
  const first = createEmptyLibraryTrie();
  const second = createEmptyLibraryTrie();
  assert.equal(first.rootHash, second.rootHash);
  assert.equal(first.rootHash, emptyLibraryRootHash);
  assert.ok(first.store.has(emptyLibraryRootHash));
});

test('100 distinct keys produce identical roots regardless of insertion order', () => {
  const keys = makeKeys(100);
  const valueForKey = (key) => ({ path: key, revision: 1 });
  const ordered = insertAll(
    ...Object.values(createEmptyLibraryTrie()),
    keys,
    valueForKey,
  );
  const reversed = insertAll(
    ...Object.values(createEmptyLibraryTrie()),
    [...keys].reverse(),
    valueForKey,
  );
  const shuffled = insertAll(
    ...Object.values(createEmptyLibraryTrie()),
    shuffle(keys),
    valueForKey,
  );
  assert.equal(ordered.rootHash, reversed.rootHash);
  assert.equal(ordered.rootHash, shuffled.rootHash);
});

test('deleting one key yields the same root after different insertion orders', () => {
  const keys = makeKeys(100);
  const remove = 'corpus/entry-42.md';
  const valueForKey = (key) => ({ path: key, revision: 1 });
  const ordered = insertAll(
    ...Object.values(createEmptyLibraryTrie()),
    keys,
    valueForKey,
  );
  const shuffled = insertAll(
    ...Object.values(createEmptyLibraryTrie()),
    shuffle(keys),
    valueForKey,
  );
  const afterOrdered = deleteLibraryTrieKey(ordered.store, ordered.rootHash, remove);
  const afterShuffled = deleteLibraryTrieKey(shuffled.store, shuffled.rootHash, remove);
  assert.equal(afterOrdered.rootHash, afterShuffled.rootHash);
  assert.equal(
    getLibraryTrieValue(afterOrdered.store, afterOrdered.rootHash, remove),
    null,
  );
});

test('untouched sibling subtree hash is preserved when an earlier branch diverges', () => {
  let { store, rootHash } = createEmptyLibraryTrie();
  ({ store, rootHash } = setLibraryTrieValue(store, rootHash, 'x/one.md', { n: 1 }));
  ({ store, rootHash } = setLibraryTrieValue(store, rootHash, 'y/two.md', { n: 2 }));
  const rootNode = store.get(rootHash);
  const shared = rootNode.children.find((child) => child.nibble === '7');
  assert.ok(shared);
  const branchNode = store.get(shared.hash);
  const yChildBefore = branchNode.children.find((child) => child.nibble === '9');
  assert.ok(yChildBefore);
  const ySubtreeHashBefore = yChildBefore.hash;

  ({ store, rootHash } = setLibraryTrieValue(store, rootHash, 'x/three.md', { n: 3 }));
  const rootAfter = store.get(rootHash);
  const sharedAfter = rootAfter.children.find((child) => child.nibble === '7');
  const branchAfter = store.get(sharedAfter.hash);
  const yChildAfter = branchAfter.children.find((child) => child.nibble === '9');
  assert.equal(yChildAfter.hash, ySubtreeHashBefore);
});

test('get returns null when a child edge is missing', () => {
  const { store, rootHash } = createEmptyLibraryTrie();
  assert.equal(getLibraryTrieValue(store, rootHash, 'missing/path.md'), null);
});

test('set rejects non-NFC keys', () => {
  const { store, rootHash } = createEmptyLibraryTrie();
  const denfc = 'e\u0301.md';
  assert.notEqual(denfc.normalize('NFC'), denfc);
  assert.throws(
    () => setLibraryTrieValue(store, rootHash, denfc, { revision: 1 }),
    /NFC-normalized/,
  );
});

test('get throws when a child hash is absent from the store', () => {
  const empty = createEmptyLibraryTrie();
  const corrupt = {
    format: 'offscreen.library-node.v2',
    value: null,
    children: [{ nibble: '6', hash: 'b'.repeat(64) }],
  };
  const badHash = 'c'.repeat(64);
  const badStore = new Map([
    [emptyLibraryRootHash, empty.store.get(emptyLibraryRootHash)],
    [badHash, corrupt],
  ]);
  assert.throws(
    () => getLibraryTrieValue(badStore, badHash, 'a.md'),
    /Missing library node/,
  );
});

test('delete throws when the key is not present', () => {
  const { store, rootHash } = createEmptyLibraryTrie();
  assert.throws(
    () => deleteLibraryTrieKey(store, rootHash, 'absent.md'),
    /not found/,
  );
});