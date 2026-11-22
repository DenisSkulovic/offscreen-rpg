import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { prepareWriterRoundWire } from '@offscreen/storyteller/providers/openrouter';
import {
  compileWriterRoundCapturedRequest,
  writerMissionCaptureV3ContinuationSchema,
  writerRoundDecisionSchema,
} from '@offscreen/storyteller/tasks';
import { SCRIPTED_OFFLINE_LAB_MODEL } from '../src/custody/scripted-offline-lab-writer-round-transport';
import { prepareScriptedOfflineLabWriterRoundTransport } from '../src/custody/scripted-offline-lab-writer-round-transport';

const basePolicy = {
  model: SCRIPTED_OFFLINE_LAB_MODEL,
  provider: 'openrouter',
  priceVersion: 'wr10b.lab.v1',
  inputMicrousdPerMillion: '1000000',
  outputMicrousdPerMillion: '1000000',
  maxInputTokens: 8192,
  maxOutputTokens: 2048,
  maxModelRounds: 4,
  timeoutMs: 30_000,
  maxMicrousd: 250_000n,
};

const rootHash = 'a'.repeat(64);

function buildV3PreparedWire() {
  const capture = writerMissionCaptureV3ContinuationSchema.parse({
    version: 'writer-mission.v3',
    generationId: randomUUID(),
    operationId: randomUUID(),
    ownerId: randomUUID(),
    storyId: randomUUID(),
    sceneScope: {
      kind: 'continuation',
      baseSceneSequence: 1,
      basePassageId: randomUUID(),
      baseCheckpointHash: 'b'.repeat(64),
      baseRootHash: rootHash,
      baseRootRevision: 1,
      baseNarrativeRevision: 1,
      baseCampaignStateRevision: 1,
      controllingIntentOrReceiptId: randomUUID(),
      scenarioKind: 'narrative-only',
    },
    libraryRootHash: rootHash,
    libraryRootRevision: 1,
    profileObjectHash: 'c'.repeat(64),
    skillObjectHashes: [],
    toolsAllowlist: ['library.browse'],
    modelSelection: {
      provider: 'openrouter',
      model: SCRIPTED_OFFLINE_LAB_MODEL,
    },
    budgets: {
      maxModelRounds: 4,
      maxInputTokens: 8192,
      maxGeneratedTokens: 2048,
      maxMicrousd: '250000',
      deadlineMs: 300_000,
    },
    capturedRequestHash: 'd'.repeat(64),
  });
  const request = compileWriterRoundCapturedRequest(capture, []);
  return prepareWriterRoundWire({
    model: basePolicy.model,
    provider: basePolicy.provider,
    messages: request.messages,
    outputSchema: request.outputSchema,
    maxGeneratedTokens: basePolicy.maxOutputTokens,
    maxSerializedRequestBytes: 48_000,
    maxInputTokens: basePolicy.maxInputTokens,
  });
}

test('scripted lab transport delivers valid v3 final decision with exact wire sha and zero usage', async () => {
  const wire = buildV3PreparedWire();
  let fetchCalls = 0;
  const transport = prepareScriptedOfflineLabWriterRoundTransport({
    capturedWire: wire,
    pinnedModelPolicy: basePolicy,
    outputSchema: {},
    apiKey: undefined,
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error('fetch must not be called');
    },
  });
  const preflight = transport.preflight();
  assert.equal(preflight.kind, 'ready');
  if (preflight.kind === 'ready') {
    assert.equal(preflight.wireSha256, wire.sha256);
  }
  const result = await transport.invoke();
  assert.equal(result.kind, 'delivered');
  if (result.kind === 'delivered') {
    assert.equal(result.exactWireSha256, wire.sha256);
    assert.equal(result.usage.totalTokens, 0);
    assert.equal(result.usage.reportedCostMicrousd, 0n);
    const decision = writerRoundDecisionSchema.parse(
      JSON.parse(result.serializedResponse),
    );
    assert.equal(decision.kind, 'final');
    if (decision.kind === 'final' && decision.proposal.version === 3) {
      assert.equal(decision.proposal.scene.authoredIntents.length, 2);
      assert.equal(decision.proposal.sourceEvidence.length, 0);
    }
  }
  assert.equal(fetchCalls, 0);
});

test('scripted lab transport rejects non-scripted model policy', async () => {
  const wire = buildV3PreparedWire();
  const transport = prepareScriptedOfflineLabWriterRoundTransport({
    capturedWire: wire,
    pinnedModelPolicy: { ...basePolicy, model: 'anthropic/claude-3.5-sonnet' },
    outputSchema: {},
    apiKey: undefined,
    fetchImpl: fetch,
  });
  const preflight = transport.preflight();
  assert.equal(preflight.kind, 'rejected');
  const result = await transport.invoke();
  assert.equal(result.kind, 'failed');
  if (result.kind === 'failed') {
    assert.equal(result.failureCode, 'wire_rejected');
    assert.equal(result.sent, false);
  }
});