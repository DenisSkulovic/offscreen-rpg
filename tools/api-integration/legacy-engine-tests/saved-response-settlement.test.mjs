import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SavedResponseSettlementRefusal,
  settleUncertainAttemptFromSavedResponse,
} from '../../../packages/story-engine/dist/storyteller/saved-response-settlement.js';

const execution = {
  mode: 'provider',
  accountId: 'account-1',
  runId: 'run-1',
};

const savedResponse = {
  usage: {
    reportedCostMicrousd: 12n,
    promptTokens: 3,
    completionTokens: 4,
    totalTokens: 7,
    reasoningTokens: null,
    cachedTokens: null,
    cacheWriteTokens: null,
  },
  telemetry: {
    durationMs: null,
    httpStatus: 200,
    providerId: 'provider-generation-1',
    reportedModel: 'saved-model',
    finishReason: 'stop',
  },
  generationOutcome: {
    state: 'failed',
    output: null,
    failureCode: 'invalid_output',
    repairCandidate: { scene: 'kept' },
    repairDiagnostic: { code: 'schema' },
  },
  operationOutcome: 'continue',
};

const uncertainAttempt = {
  attemptId: 'attempt-1',
  execution,
  generationState: 'uncertain',
  attemptState: 'uncertain',
  savedResponse,
};

function recordingBudget() {
  const calls = [];
  return {
    calls,
    budget: {
      async settle(input) {
        calls.push(input);
      },
    },
  };
}

test('settles one already-uncertain attempt from the saved response', async () => {
  const { budget, calls } = recordingBudget();
  await settleUncertainAttemptFromSavedResponse(budget, uncertainAttempt);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].id, 'attempt-1');
  assert.equal(calls[0].execution, execution);
  assert.equal(calls[0].usage, savedResponse.usage);
  assert.equal(calls[0].telemetry, savedResponse.telemetry);
  assert.equal(calls[0].generationOutcome, savedResponse.generationOutcome);
  assert.equal(calls[0].operationOutcome, 'continue');
});

test('refuses a generation that is not uncertain', async () => {
  const { budget, calls } = recordingBudget();
  await assert.rejects(
    () =>
      settleUncertainAttemptFromSavedResponse(budget, {
        ...uncertainAttempt,
        generationState: 'failed',
      }),
    (error) => {
      assert.ok(error instanceof SavedResponseSettlementRefusal);
      assert.equal(error.code, 'generation_not_uncertain');
      return true;
    },
  );
  assert.equal(calls.length, 0);
});

test('refuses a missing saved response', async () => {
  const { budget, calls } = recordingBudget();
  for (const saved of [null, undefined, {}]) {
    await assert.rejects(
      () =>
        settleUncertainAttemptFromSavedResponse(budget, {
          ...uncertainAttempt,
          savedResponse: saved,
        }),
      (error) => {
        assert.ok(error instanceof SavedResponseSettlementRefusal);
        assert.equal(error.code, 'missing_saved_response');
        return true;
      },
    );
  }
  assert.equal(calls.length, 0);
});

test('refuses a second settle', async () => {
  const { budget, calls } = recordingBudget();
  await settleUncertainAttemptFromSavedResponse(budget, uncertainAttempt);
  await assert.rejects(
    () =>
      settleUncertainAttemptFromSavedResponse(budget, {
        ...uncertainAttempt,
        attemptState: 'settled',
      }),
    (error) => {
      assert.ok(error instanceof SavedResponseSettlementRefusal);
      assert.equal(error.code, 'already_settled');
      return true;
    },
  );
  assert.equal(calls.length, 1);
});

test('refuses an attempt that is not already uncertain', async () => {
  const { budget, calls } = recordingBudget();
  await assert.rejects(
    () =>
      settleUncertainAttemptFromSavedResponse(budget, {
        ...uncertainAttempt,
        attemptState: 'dispatched',
      }),
    (error) => {
      assert.ok(error instanceof SavedResponseSettlementRefusal);
      assert.equal(error.code, 'attempt_not_uncertain');
      return true;
    },
  );
  assert.equal(calls.length, 0);
});
