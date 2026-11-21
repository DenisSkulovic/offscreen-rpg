import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  applyLibraryBatch,
  createEmptyLibraryIndex,
  pageLibraryPaths,
} from '../dist/index.js';

function loreEntry(index) {
  const path = `lore/scene-${String(index).padStart(3, '0')}.md`;
  return {
    documentId: randomUUID(),
    revision: 1,
    path,
    objectHash: 'a'.repeat(64),
    kind: 'lore',
    authority: 'canon',
    visibility: 'player-known',
  };
}

test('pageLibraryPaths walks a v2 trie in lexicographic order', async () => {
  let library = createEmptyLibraryIndex();
  const operations = Array.from({ length: 40 }, (_, index) => ({
    op: 'create',
    entry: loreEntry(index + 1),
  }));
  library = applyLibraryBatch(library, operations);
  const readNode = async (hash) => {
    const node = library.store.get(hash);
    if (node === undefined) throw new Error(`Missing library node for hash ${hash}`);
    return node;
  };
  const collected = [];
  let after;
  do {
    const page = await pageLibraryPaths(readNode, library.root.pathsRootHash, {
      prefix: 'lore/',
      after,
      pageSize: 7,
    });
    collected.push(...page.entries.map((entry) => entry.path));
    after = page.nextAfter ?? undefined;
  } while (after !== undefined);
  assert.equal(collected.length, 40);
  assert.deepEqual(collected, collected.slice().sort());
  assert.equal(collected[0], 'lore/scene-001.md');
  assert.equal(collected.at(-1), 'lore/scene-040.md');
});