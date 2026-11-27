import assert from 'node:assert/strict';
import test from 'node:test';
import { createMissionLedger, resolveOutcome } from '../dist/policy/limits.js';

test('third reservation is refused and a last normal step can succeed', () => {
  const ledger = createMissionLedger(3);
  assert.equal(ledger.reserveTool(), true);
  assert.equal(ledger.reserveTool(), true);
  assert.equal(ledger.reserveTool(), false);
  assert.equal(ledger.toolCalls, 2);
  assert.equal(ledger.limitCode, 'tool-limit');
  const clean = createMissionLedger(2);
  clean.recordStep();
  clean.recordStep();
  assert.deepEqual(
    resolveOutcome(clean, { finishReason: 'stop', text: 'done', hasUnfinishedCalls: false }),
    { status: 'completed', text: 'done', steps: 2, toolCalls: 0 },
  );
});

test('denial dominates later text, limit and failure', () => {
  const ledger = createMissionLedger(3);
  ledger.deny('tool-not-allowed');
  assert.equal(ledger.reserveTool(), false);
  assert.equal(ledger.toolCalls, 0);
  assert.equal(ledger.limitCode, undefined);
  ledger.limit('tool-limit');
  ledger.fail('execution-failed');
  assert.deepEqual(
    resolveOutcome(ledger, { finishReason: 'stop', text: 'looks fine', hasUnfinishedCalls: false }),
    { status: 'denied', code: 'tool-not-allowed', steps: 0, toolCalls: 0 },
  );
});

test('empty, unfinished and nonnormal terminals do not succeed', () => {
  const empty = createMissionLedger(1);
  empty.recordStep();
  assert.equal(
    resolveOutcome(empty, { finishReason: 'stop', text: '  ', hasUnfinishedCalls: false }).status,
    'limit-reached',
  );
  const unfinished = createMissionLedger(1);
  unfinished.recordStep();
  assert.equal(
    resolveOutcome(unfinished, {
      finishReason: 'stop',
      text: 'partial',
      hasUnfinishedCalls: true,
    }).code,
    'step-limit',
  );
  const truncated = createMissionLedger(1);
  truncated.recordStep();
  assert.equal(
    resolveOutcome(truncated, { finishReason: 'length', text: 'cut', hasUnfinishedCalls: false })
      .code,
    'nonterminal-model-output',
  );
});
