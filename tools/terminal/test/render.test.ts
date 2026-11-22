import assert from 'node:assert/strict';
import test from 'node:test';
import {
  outputContainsSecret,
  renderSnapshotHuman,
  sanitizeTerminalText,
  toPublicStorySnapshot,
} from '../src/render.js';
import { makeStorySnapshot, fixtureIds } from './fixtures.js';

test('sanitizeTerminalText strips ANSI control sequences', () => {
  const raw = 'Before \u001b[31mred\u001b[0m after';
  assert.equal(sanitizeTerminalText(raw), 'Before red after');
});

test('toPublicStorySnapshot rejects private top-level fields', () => {
  const snapshot = makeStorySnapshot();
  assert.throws(() =>
    toPublicStorySnapshot({
      ...snapshot,
      privateModelContext: 'secret',
    }),
  );
});

test('renderSnapshotHuman does not echo bearer tokens', () => {
  const snapshot = makeStorySnapshot({
    paragraphs: ['Safe paragraph.'],
  });
  const rendered = renderSnapshotHuman(snapshot, {
    path: [],
    successorPaths: [],
  });
  assert.equal(outputContainsSecret(rendered, fixtureIds.token), false);
});
