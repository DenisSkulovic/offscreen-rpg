import assert from 'node:assert/strict';
import test from 'node:test';
import {
  memoryRoundGeneratedTokenCeilings,
} from '../../../packages/story-engine/dist/storyteller/memory-provider-runtime.js';
import {
  MemoryProviderRoundError,
  attemptChargeTruth,
  classifyMemoryProviderRoundError,
  memoryExplorationRoundCapability,
} from '../../../packages/story-engine/dist/storyteller/loop-lifecycle.js';

test('reserves most generated tokens for the schema-bound final round', () => {
  assert.deepEqual(
    memoryRoundGeneratedTokenCeilings({
      maxGeneratedTokens: 2_048,
      maxModelRounds: 2,
      maxRepairRounds: 0,
    }),
    { decision: 256, final: 1_792 },
  );
});

test('an admitted repair shares publishable capacity without exceeding the envelope', () => {
  const ceilings = memoryRoundGeneratedTokenCeilings({
    maxGeneratedTokens: 2_048,
    maxModelRounds: 3,
    maxRepairRounds: 1,
  });
  assert.deepEqual(ceilings, { decision: 256, final: 896 });
  assert.ok(ceilings.decision + ceilings.final * 2 <= 2_048);
});

test('final-answer reserve survives after decision rounds; exhaustion is explicit', () => {
  assert.equal(
    memoryExplorationRoundCapability({
      maxModelRounds: 3,
      finalAnswerReserveRounds: 1,
      round: 1,
    }),
    'decision',
  );
  assert.equal(
    memoryExplorationRoundCapability({
      maxModelRounds: 3,
      finalAnswerReserveRounds: 1,
      round: 2,
    }),
    'decision',
  );
  assert.equal(
    memoryExplorationRoundCapability({
      maxModelRounds: 3,
      finalAnswerReserveRounds: 1,
      round: 3,
    }),
    'final',
  );
  assert.equal(
    memoryExplorationRoundCapability({
      maxModelRounds: 3,
      finalAnswerReserveRounds: 1,
      round: 4,
    }),
    'exhausted',
  );
});

test('memory round errors keep uncertain distinct from failed/held', () => {
  assert.deepEqual(
    classifyMemoryProviderRoundError(
      new MemoryProviderRoundError('provider-uncertain'),
    ),
    { state: 'uncertain', code: 'provider-uncertain' },
  );
  assert.deepEqual(
    classifyMemoryProviderRoundError(
      new MemoryProviderRoundError('usage-uncertain'),
    ),
    { state: 'uncertain', code: 'usage-uncertain' },
  );
  assert.deepEqual(
    classifyMemoryProviderRoundError(
      new MemoryProviderRoundError('invalid-output'),
    ),
    { state: 'failed', code: 'invalid-output' },
  );
  assert.deepEqual(
    classifyMemoryProviderRoundError(
      new MemoryProviderRoundError('review-held'),
    ),
    { state: 'held', code: 'review-held' },
  );
  assert.equal(classifyMemoryProviderRoundError(new Error('other')), null);
});

test('confirmed-unsent may retry; uncertain never auto-replays', () => {
  assert.deepEqual(attemptChargeTruth('unsent'), {
    mayAutoRetrySameIntention: true,
    reservationHeld: false,
    providerChargeKnownZero: true,
  });
  assert.deepEqual(attemptChargeTruth('uncertain'), {
    mayAutoRetrySameIntention: false,
    reservationHeld: true,
    providerChargeKnownZero: false,
  });
  assert.notEqual(
    attemptChargeTruth('unsent').mayAutoRetrySameIntention,
    attemptChargeTruth('uncertain').mayAutoRetrySameIntention,
  );
});
