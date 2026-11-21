import assert from 'node:assert/strict';
import test from 'node:test';
import { retryStoryteller as retryFromAuthority } from '../../../packages/story-engine/dist/stories/storyteller-retry.js';
import { retryStoryteller as retryFromStoryteller } from '../../../packages/story-engine/dist/storyteller/recovery.js';
import { evaluateStorytellerRetryGate as gateFromAuthority } from '../../../packages/story-engine/dist/stories/storyteller-retry-policy.js';
import { evaluateStorytellerRetryGate as gateFromStoryteller } from '../../../packages/story-engine/dist/storyteller/loop-lifecycle.js';
import { startStorytellerCandidate as startFromAuthority } from '../../../packages/story-engine/dist/stories/storyteller-start-candidate.js';
import { startStorytellerCandidate as startFromStoryteller } from '../../../packages/story-engine/dist/storyteller/start.js';

test('MA05F: authority and storyteller retry entry identities match', () => {
  assert.equal(retryFromAuthority, retryFromStoryteller);
  assert.equal(typeof retryFromAuthority, 'function');

  assert.equal(gateFromAuthority, gateFromStoryteller);
  assert.equal(typeof gateFromAuthority, 'function');

  assert.equal(startFromAuthority, startFromStoryteller);
  assert.equal(typeof startFromAuthority, 'function');
});
