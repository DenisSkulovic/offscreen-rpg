import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  calculatedProviderCharge,
  estimatedProviderCharge,
  executionPolicySchema,
  maximumInputMicrousdPerMillion,
  maximumProviderCharge,
  reservationForRequest,
} from '../src/tasks';

const execution = executionPolicySchema.parse({
  mode: 'provider',
  accountId: '00000000-0000-4000-8000-000000000001',
  runId: '00000000-0000-4000-8000-000000000002',
  dispatchReview: { mode: 'hold' },
  policy: {
    version: 'pricing-test.v1',
    route: 'test:provider',
    model: 'test/model',
    provider: 'Offline test',
    priceVersion: 'v1',
    inputMicrousdPerMillion: '2000000',
    cacheReadMicrousdPerMillion: '1000000',
    cacheWriteMicrousdPerMillion: '2500000',
    outputMicrousdPerMillion: '10000000',
    maxInputTokens: 100000,
    maxOutputTokens: 8000,
    timeoutMs: 1000,
  },
});
if (execution.mode !== 'provider') throw new Error('Expected provider fixture');

test('one maximum cache-aware input price underlies admission and reservation', () => {
  assert.equal(maximumInputMicrousdPerMillion(execution.policy), 2500000n);
  assert.equal(maximumProviderCharge(execution), '330000');
  const request = { messages: [], outputSchema: {} };
  const reserved = reservationForRequest(
    request,
    execution.policy,
    48000,
    1000,
    600,
  );
  const estimated = estimatedProviderCharge(execution, 5000, {
    maxInputTokens: 1000,
    maxGeneratedTokens: 600,
  });
  assert.equal(reserved, 8500n);
  assert.equal(estimated.inputTokens, 1000);
  assert.equal(estimated.microusd, reserved);
  assert.equal(estimated.method, 'serialized-byte-upper-bound.v1');
});

test('settled charge uses cache classes once and reports unpriced cache use', () => {
  const usage = {
    reportedCostMicrousd: 7000n,
    promptTokens: 1000,
    completionTokens: 500,
    totalTokens: 1500,
    reasoningTokens: 0,
    cachedTokens: 100,
    cacheWriteTokens: 200,
  };
  assert.equal(calculatedProviderCharge(execution, usage), 7000n);
  const policyWithoutWrite = { ...execution.policy };
  delete policyWithoutWrite.cacheWriteMicrousdPerMillion;
  assert.equal(
    calculatedProviderCharge(
      { ...execution, policy: policyWithoutWrite },
      usage,
    ),
    null,
  );
  assert.equal(
    calculatedProviderCharge(execution, {
      ...usage,
      cachedTokens: 900,
      cacheWriteTokens: 200,
    }),
    null,
  );
});

test('prices are rounded once for the whole operation with integer precision', () => {
  const tiny = {
    ...execution,
    policy: {
      ...execution.policy,
      inputMicrousdPerMillion: '1',
      cacheReadMicrousdPerMillion: '1',
      cacheWriteMicrousdPerMillion: '1',
      outputMicrousdPerMillion: '1',
    },
  };
  assert.equal(
    calculatedProviderCharge(tiny, {
      reportedCostMicrousd: 1n,
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      reasoningTokens: 0,
      cachedTokens: 0,
      cacheWriteTokens: 0,
    }),
    1n,
  );
  assert.equal(maximumInputMicrousdPerMillion(tiny.policy), 1n);
});
