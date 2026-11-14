import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  dryRunLiveComparison,
  fingerprintFrozenStoryAuthority,
  formatLiveComparisonTrial,
} from '../dist/developer-tools/live-comparison.js';

const now = '2026-11-14T16:00:00.000Z';
const route = {
  provider: 'openrouter',
  endpointProvider: 'Test Provider',
  endpointTag: 'test/default',
  route: 'openrouter:test/model',
  model: 'test/model',
  priceVersion: 'verified-test-price',
  outputProtocol: 'native-json-schema',
  responseTransport: 'buffered-json',
  serviceTier: 'default',
  inputMicrousdPerMillion: '1000',
  cacheReadMicrousdPerMillion: '100',
  cacheWriteMicrousdPerMillion: '1250',
  outputMicrousdPerMillion: '2000',
  supportsStructuredOutput: true,
  reasoning: 'disabled',
  verifiedAt: '2026-11-14T15:55:00.000Z',
  validUntil: '2026-11-14T16:05:00.000Z',
};
const recipe = {
  primaryCalls: 1,
  retrievalReads: 0,
  repairCalls: 0,
  judgeCalls: 0,
  comparisonCalls: 0,
  backgroundCalls: 0,
  maxInFlightCalls: 1,
  maxInputTokens: 8000,
  maxGeneratedTokens: 1024,
  maxReasoningTokens: 0,
  maxMicrousd: '10000',
};

function candidate(overrides = {}) {
  return {
    id: 'baseline',
    label: 'Baseline v17',
    promptVersion: 'storyteller.v17',
    recipe,
    route,
    ...overrides,
  };
}

test('dry-run comparison accepts one promptVersion variable', () => {
  const result = dryRunLiveComparison({
    createdAt: now,
    case: {
      id: 'seyda-neen-opening',
      version: '1',
      storyFingerprint: fingerprintFrozenStoryAuthority({
        storyId: randomUUID(),
        revision: 1,
        rootHash: 'a'.repeat(64),
        rootRevision: 1,
        promptVersion: 'storyteller.v17',
      }),
    },
    variedDimension: 'promptVersion',
    baseline: candidate(),
    candidate: candidate({
      id: 'candidate',
      label: 'Candidate v16',
      promptVersion: 'storyteller.v16',
    }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.trial.mode, 'dry-run');
  assert.equal(result.trial.providerTransport, 'none');
  assert.equal(result.trial.variedDimension, 'promptVersion');
  assert.equal(result.trial.outcomes.length, 2);
  assert.equal(
    result.trial.humanReview.dimensions.profileFaithfulness,
    'unobserved',
  );
  assert.match(formatLiveComparisonTrial(result.trial), /dry-run/);
});

test('dry-run rejects allowPaid and multi-variable diffs', () => {
  const paid = dryRunLiveComparison({
    createdAt: now,
    case: {
      id: 'seyda-neen-opening',
      version: '1',
      storyFingerprint: 'fp',
    },
    variedDimension: 'promptVersion',
    baseline: candidate(),
    candidate: candidate({
      id: 'candidate',
      promptVersion: 'storyteller.v16',
    }),
    allowPaid: true,
  });
  assert.equal(paid.ok, false);
  assert.ok(paid.failures.includes('allow_paid_forbidden'));

  const multi = dryRunLiveComparison({
    createdAt: now,
    case: {
      id: 'seyda-neen-opening',
      version: '1',
      storyFingerprint: 'fp',
    },
    variedDimension: 'promptVersion',
    baseline: candidate(),
    candidate: candidate({
      id: 'candidate',
      promptVersion: 'storyteller.v16',
      recipe: { ...recipe, maxGeneratedTokens: 512 },
    }),
  });
  assert.equal(multi.ok, false);
  assert.ok(multi.failures.includes('not_one_variable'));
});

test('dry-run rejects cash cap below planned reservation ceiling', () => {
  const result = dryRunLiveComparison({
    createdAt: now,
    case: {
      id: 'seyda-neen-opening',
      version: '1',
      storyFingerprint: 'fp',
    },
    variedDimension: 'promptVersion',
    baseline: candidate(),
    candidate: candidate({
      id: 'candidate',
      promptVersion: 'storyteller.v16',
    }),
    hardCashCapMicrousd: '1',
    maxDispatches: 2,
  });
  assert.equal(result.ok, false);
  assert.ok(result.failures.includes('cash_cap_below_reservation'));
});
