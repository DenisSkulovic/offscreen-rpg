import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  createLiveEvaluationManifest,
  preflightLiveEvaluation,
} from '../dist/developer-tools/live-evaluation.js';

const now = '2026-09-20T15:00:00.000Z';
const generationId = randomUUID();
const packetSha256 = 'a'.repeat(64);
const manifest = {
  version: 'live-evaluation.v1',
  id: randomUUID(),
  gate: 'single-structured-response',
  case: { id: 'seyda-neen-opening', version: '1' },
  packet: {
    generationId,
    sha256: packetSha256,
    serializedBytes: 4350,
    inputTokenUpperBound: 4350,
    inputBoundMethod: 'utf8-byte-upper-bound',
  },
  route: {
    provider: 'openrouter',
    endpointProvider: 'Test Provider',
    route: 'openrouter:test/model',
    model: 'test/model',
    priceVersion: 'verified-test-price',
    outputProtocol: 'native-json-schema',
    inputMicrousdPerMillion: '1000',
    outputMicrousdPerMillion: '2000',
    supportsStructuredOutput: true,
    reasoning: 'disabled',
    verifiedAt: '2026-09-20T14:55:00.000Z',
    validUntil: '2026-09-20T15:05:00.000Z',
  },
  recipe: {
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
  },
  reservationMicrousd: '10',
  createdAt: now,
};
const ready = {
  manifest,
  now,
  review: { generationId, packetSha256, state: 'awaiting-review' },
  funding: {
    availableMicrousd: '1000000',
    verifiedAt: '2026-09-20T14:59:00.000Z',
    validUntil: '2026-09-20T15:01:00.000Z',
    accountingReady: true,
  },
  traceReady: true,
};

test('accepts one bounded held Gate-1 packet', () => {
  assert.deepEqual(preflightLiveEvaluation(ready), {
    eligible: true,
    manifest,
  });
});

test('builds the manifest and derives the conservative reservation', () => {
  const created = createLiveEvaluationManifest({
    id: manifest.id,
    createdAt: now,
    case: manifest.case,
    review: {
      generationId,
      packetSha256,
      state: 'awaiting-review',
      serializedBytes: 4350,
    },
    route: manifest.route,
    recipe: manifest.recipe,
  });
  assert.equal(created.packet.inputTokenUpperBound, 4350);
  assert.equal(created.reservationMicrousd, '7');
});

test('reports independent optional-call, identity, funding and trace failures', () => {
  const result = preflightLiveEvaluation({
    ...ready,
    manifest: {
      ...manifest,
      recipe: { ...manifest.recipe, judgeCalls: 2 },
      reservationMicrousd: '10001',
    },
    review: { ...ready.review, packetSha256: 'b'.repeat(64) },
    funding: {
      availableMicrousd: '1',
      verifiedAt: '2026-09-20T14:00:00.000Z',
      validUntil: '2026-09-20T14:01:00.000Z',
      accountingReady: false,
    },
    traceReady: false,
  });
  assert.equal(result.eligible, false);
  assert.deepEqual(result.failures, [
    'packet_identity_mismatch',
    'gate_recipe_too_rich',
    'reservation_mismatch',
    'funding_snapshot_stale',
    'funding_insufficient',
    'accounting_not_ready',
    'trace_not_ready',
  ]);
});
