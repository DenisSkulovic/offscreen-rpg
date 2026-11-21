import assert from 'node:assert/strict';
import test from 'node:test';
import { publishStorytellerNotes as fromMemory } from '../dist/storyteller/memory.js';
import { publishStorytellerNotes as fromContinuityNotes } from '../dist/stories/continuity-notes.js';

test('publishStorytellerNotes re-export matches continuity-notes', () => {
  assert.equal(typeof fromMemory, 'function');
  assert.equal(typeof fromContinuityNotes, 'function');
  assert.equal(fromMemory, fromContinuityNotes);
});
