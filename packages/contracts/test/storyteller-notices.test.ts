import assert from 'node:assert/strict';
import { test } from 'node:test';
import { storytellerContextCaptureKind } from '../src/storyteller-kinds';
import {
  storytellerDistributedTopic,
  storytellerTopic,
} from '../src/storyteller-notices';

test('MA05D T01: frozen storyteller notice topics stay distinct', () => {
  assert.equal(storytellerTopic, 'storyteller.profiled.v1');
  assert.equal(storytellerDistributedTopic, 'storyteller.distributed.v1');
  assert.notEqual(storytellerTopic, storytellerDistributedTopic);
  assert.notEqual(storytellerContextCaptureKind, storytellerTopic);
  assert.notEqual(storytellerContextCaptureKind, storytellerDistributedTopic);
});
