import assert from 'node:assert/strict';
import test from 'node:test';
import { publishStorytellerNotes as fromMemory } from '../../../packages/story-engine/dist/storyteller/memory.js';
import { publishStorytellerNotes as fromContinuityNotes } from '../../../packages/story-engine/dist/stories/continuity-notes.js';

test('publishStorytellerNotes re-export matches continuity-notes', () => {
  assert.equal(typeof fromMemory, 'function');
  assert.equal(typeof fromContinuityNotes, 'function');
  assert.equal(fromMemory, fromContinuityNotes);
});
