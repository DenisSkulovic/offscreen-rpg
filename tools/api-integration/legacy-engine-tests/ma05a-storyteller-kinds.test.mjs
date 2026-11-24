import assert from 'node:assert/strict';
import test from 'node:test';
import { storytellerKind } from '../../../packages/story-engine/dist/storyteller/records.js';
import { storytellerContextCaptureKind } from '../../../packages/story-engine/dist/storyteller/context-capture.js';
import {
  storytellerKind as contractStorytellerKind,
  storytellerContextCaptureKind as contractStorytellerContextCaptureKind,
} from '../../../packages/story-engine/dist/generations/storyteller-kinds.js';

test('neutral storyteller kinds stay compatible with contracts', () => {
  assert.equal(storytellerKind, 'storyteller.profiled.v1');
  assert.equal(storytellerContextCaptureKind, 'storyteller.context-capture.v1');
  assert.equal(storytellerKind, contractStorytellerKind);
  assert.equal(
    storytellerContextCaptureKind,
    contractStorytellerContextCaptureKind,
  );
  assert.notEqual(storytellerKind, storytellerContextCaptureKind);
});
