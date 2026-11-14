import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateStorytellerRetryGate } from '../dist/storyteller/loop-lifecycle.js';

const baseFailed = {
  priorRetryRecorded: false,
  generationState: 'failed',
  publicationState: null,
  executionMode: 'provider',
  attemptState: 'unsent',
  failureCode: 'provider_unavailable',
  recipeVersion: 'single-turn.v1',
  hasRepairCandidate: false,
  hasRepairDiagnostic: false,
  operationState: 'open',
  dispatchedRounds: 1,
  maxModelRounds: 1,
};

test('retry gate matrix: unsent/repair/blocked allowed; uncertain and exhausted denied', () => {
  assert.deepEqual(evaluateStorytellerRetryGate(baseFailed), {
    allowed: true,
    reason: 'confirmed-unsent',
  });

  assert.deepEqual(
    evaluateStorytellerRetryGate({
      ...baseFailed,
      attemptState: 'settled',
      failureCode: 'invalid_output',
      recipeVersion: 'repairable-turn.v1',
      hasRepairCandidate: true,
      hasRepairDiagnostic: true,
      dispatchedRounds: 1,
      maxModelRounds: 2,
    }),
    { allowed: true, reason: 'captured-repair' },
  );

  assert.deepEqual(
    evaluateStorytellerRetryGate({
      ...baseFailed,
      generationState: 'succeeded',
      publicationState: 'blocked',
      attemptState: null,
    }),
    { allowed: true, reason: 'publication-blocked' },
  );

  assert.deepEqual(
    evaluateStorytellerRetryGate({
      ...baseFailed,
      generationState: 'uncertain',
      attemptState: 'uncertain',
      failureCode: null,
    }),
    { allowed: false, reason: 'uncertain-requires-operator' },
  );

  assert.deepEqual(
    evaluateStorytellerRetryGate({
      ...baseFailed,
      attemptState: 'uncertain',
      failureCode: 'provider_unavailable',
    }),
    { allowed: false, reason: 'uncertain-requires-operator' },
  );

  assert.deepEqual(
    evaluateStorytellerRetryGate({
      ...baseFailed,
      attemptState: 'settled',
      failureCode: 'invalid_output',
      recipeVersion: 'repairable-turn.v1',
      hasRepairCandidate: true,
      hasRepairDiagnostic: true,
      dispatchedRounds: 2,
      maxModelRounds: 2,
    }),
    { allowed: false, reason: 'round-budget-exhausted' },
  );

  assert.deepEqual(
    evaluateStorytellerRetryGate({
      ...baseFailed,
      attemptState: 'settled',
      failureCode: 'invalid_output',
      recipeVersion: 'single-turn.v1',
    }),
    { allowed: false, reason: 'settled-without-repair' },
  );

  assert.deepEqual(
    evaluateStorytellerRetryGate({
      ...baseFailed,
      priorRetryRecorded: true,
    }),
    { allowed: false, reason: 'idempotent-retry-already-recorded' },
  );

  assert.deepEqual(
    evaluateStorytellerRetryGate({
      ...baseFailed,
      pendingConsequenceSettled: false,
    }),
    { allowed: false, reason: 'pending-consequence-not-settled' },
  );

  assert.deepEqual(
    evaluateStorytellerRetryGate({
      ...baseFailed,
      generationState: 'running',
    }),
    { allowed: false, reason: 'not-retryable-state' },
  );
});
