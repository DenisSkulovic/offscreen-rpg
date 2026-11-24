import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  storytellerContextCaptureKind,
  storytellerKind,
} from './storyteller-kinds';

type StorytellerKind = typeof storytellerKind;
type StorytellerContextCaptureKind = typeof storytellerContextCaptureKind;

test('MA05A T01: frozen storyteller generation kinds stay distinct', () => {
  const profiled: StorytellerKind = storytellerKind;
  const capture: StorytellerContextCaptureKind = storytellerContextCaptureKind;
  assert.equal(profiled, 'storyteller.profiled.v1');
  assert.equal(capture, 'storyteller.context-capture.v1');
  assert.notEqual(profiled, capture);
});
