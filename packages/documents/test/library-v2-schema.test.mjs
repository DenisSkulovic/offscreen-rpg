import assert from 'node:assert/strict';
import test from 'node:test';
import { libraryNodeV2Schema, libraryRootV2Schema } from '../dist/index.js';

const HASH = 'a'.repeat(64);

test('library root v2 accepts paths and ids root hashes', () => {
  const root = libraryRootV2Schema.parse({
    format: 'offscreen.library-root.v2',
    pathsRootHash: HASH,
    idsRootHash: HASH,
  });
  assert.equal(root.pathsRootHash, HASH);
});

test('library node v2 accepts null value and strictly ascending children', () => {
  const node = libraryNodeV2Schema.parse({
    format: 'offscreen.library-node.v2',
    value: null,
    children: [
      { nibble: '0', hash: HASH },
      { nibble: '9', hash: HASH },
      { nibble: 'a', hash: HASH },
      { nibble: 'f', hash: HASH },
    ],
  });
  assert.equal(node.children.length, 4);
});

test('library node v2 accepts a non-null object value', () => {
  const node = libraryNodeV2Schema.parse({
    format: 'offscreen.library-node.v2',
    value: { documentId: '00000000-0000-4000-8000-000000000001', path: 'lore/note.md' },
    children: [],
  });
  assert.equal(node.value.documentId, '00000000-0000-4000-8000-000000000001');
});

test('rejects invalid nibble character', () => {
  assert.throws(() =>
    libraryNodeV2Schema.parse({
      format: 'offscreen.library-node.v2',
      value: null,
      children: [{ nibble: 'g', hash: HASH }],
    }),
  );
});

test('rejects uppercase nibble', () => {
  assert.throws(() =>
    libraryNodeV2Schema.parse({
      format: 'offscreen.library-node.v2',
      value: null,
      children: [{ nibble: 'A', hash: HASH }],
    }),
  );
});

test('rejects duplicate nibbles', () => {
  assert.throws(() =>
    libraryNodeV2Schema.parse({
      format: 'offscreen.library-node.v2',
      value: null,
      children: [
        { nibble: 'a', hash: HASH },
        { nibble: 'a', hash: HASH },
      ],
    }),
  );
});

test('rejects unsorted nibbles', () => {
  assert.throws(() =>
    libraryNodeV2Schema.parse({
      format: 'offscreen.library-node.v2',
      value: null,
      children: [
        { nibble: 'b', hash: HASH },
        { nibble: 'a', hash: HASH },
      ],
    }),
  );
});

test('rejects node whose canonical JSON exceeds 1 MiB', () => {
  assert.throws(() =>
    libraryNodeV2Schema.parse({
      format: 'offscreen.library-node.v2',
      value: { padding: 'x'.repeat(1024 * 1024) },
      children: [],
    }),
  );
});