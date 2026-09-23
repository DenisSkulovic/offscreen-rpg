import assert from 'node:assert/strict';
import test from 'node:test';
import { memoryRoundGeneratedTokenCeilings } from '../dist/storyteller/memory-provider-runtime.js';

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
