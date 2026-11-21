import assert from 'node:assert/strict';
import test from 'node:test';
import { hashCanonicalJson } from '@offscreen/documents';
import { libraryToolRequestReplayMatches } from '../dist/storyteller/writer-loop.js';

test('library tool request replay refuses mismatched args', () => {
  const stored = hashCanonicalJson({
    name: 'library.read',
    args: { path: 'lore/scene-001.md' },
  });
  assert.equal(
    libraryToolRequestReplayMatches(stored, 'library.read', {
      path: 'lore/scene-001.md',
    }),
    true,
  );
  assert.equal(
    libraryToolRequestReplayMatches(stored, 'library.read', {
      path: 'lore/scene-002.md',
    }),
    false,
  );
  assert.equal(
    libraryToolRequestReplayMatches(stored, 'library.list', {
      path: 'lore/scene-001.md',
    }),
    false,
  );
});
