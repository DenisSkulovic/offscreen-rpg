import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { validateWriterRoundCaptureAgainstPolicy } from '../dist/storyteller/writer-round-capture-validation.js';
import { writerMissionCaptureV3ContinuationSchema } from '@offscreen/storyteller/tasks';

const budgetSnapshot = {
  maxModelRounds: 4,
  maxInputTokens: 8000,
  maxGeneratedTokens: 2000,
  maxMicrousd: '250000',
  deadlineMs: 120_000,
};

const providerPolicy = {
  model: 'anthropic/claude-3.5-sonnet',
  provider: 'Anthropic',
  priceVersion: 'wr10.v1',
  inputMicrousdPerMillion: '3000000',
  outputMicrousdPerMillion: '15000000',
  maxInputTokens: 8192,
  maxOutputTokens: 1024,
  maxModelRounds: 4,
  maxMicrousd: 250_000n,
  timeoutMs: 30_000,
};

const labPolicy = {
  ...providerPolicy,
  model: 'scripted-offline',
  provider: 'openrouter',
  priceVersion: 'wr10b.lab.v1',
};

const rootHash = 'b'.repeat(64);

function baseCapture(model) {
  return writerMissionCaptureV3ContinuationSchema.parse({
    version: 'writer-mission.v3',
    generationId: randomUUID(),
    operationId: randomUUID(),
    ownerId: randomUUID(),
    storyId: randomUUID(),
    sceneScope: {
      kind: 'continuation',
      baseSceneSequence: 1,
      basePassageId: randomUUID(),
      baseCheckpointHash: 'a'.repeat(64),
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
    modelSelection: { provider: 'openrouter', model },
    budgets: budgetSnapshot,
    capturedRequestHash: 'd'.repeat(64),
  });
}

test('provider default rejects scripted-offline capture', () => {
  const fault = validateWriterRoundCaptureAgainstPolicy(
    baseCapture('scripted-offline'),
    providerPolicy,
    budgetSnapshot,
    'provider-default',
  );
  assert.equal(fault, 'scripted_offline_model');
});

test('lab mode accepts only scripted-offline', () => {
  assert.equal(
    validateWriterRoundCaptureAgainstPolicy(
      baseCapture('scripted-offline'),
      labPolicy,
      budgetSnapshot,
      'scripted-offline-lab',
    ),
    null,
  );
  assert.equal(
    validateWriterRoundCaptureAgainstPolicy(
      baseCapture('anthropic/claude-3.5-sonnet'),
      labPolicy,
      budgetSnapshot,
      'scripted-offline-lab',
    ),
    'model_policy_mismatch',
  );
});

test('lab mode rejects provider policy pin on capture', () => {
  const capture = {
    ...baseCapture('scripted-offline'),
    providerPolicy: { version: 'wr10b.lab.v1', model: 'scripted-offline' },
  };
  assert.equal(
    validateWriterRoundCaptureAgainstPolicy(
      capture,
      labPolicy,
      budgetSnapshot,
      'scripted-offline-lab',
    ),
    'model_policy_mismatch',
  );
});

const authorizedPolicy = {
  model: 'openai/gpt-4o-mini',
  provider: 'OpenAI',
  priceVersion: 'wr11.bootstrap.v1',
  inputMicrousdPerMillion: '1000000',
  outputMicrousdPerMillion: '1000000',
  maxInputTokens: 8000,
  maxOutputTokens: 2000,
  maxModelRounds: 4,
  maxMicrousd: 250_000n,
  timeoutMs: 30_000,
};

test('provider-authorized mode requires matching model and policy pin', () => {
  const valid = {
    ...baseCapture('openai/gpt-4o-mini'),
    providerPolicy: {
      version: 'wr11.bootstrap.v1',
      model: 'openai/gpt-4o-mini',
    },
  };
  assert.equal(
    validateWriterRoundCaptureAgainstPolicy(
      valid,
      authorizedPolicy,
      budgetSnapshot,
      'provider-authorized',
    ),
    null,
  );
  assert.equal(
    validateWriterRoundCaptureAgainstPolicy(
      baseCapture('other/model'),
      authorizedPolicy,
      budgetSnapshot,
      'provider-authorized',
    ),
    'model_policy_mismatch',
  );
  assert.equal(
    validateWriterRoundCaptureAgainstPolicy(
      {
        ...baseCapture('openai/gpt-4o-mini'),
        providerPolicy: {
          version: 'wrong.version',
          model: 'openai/gpt-4o-mini',
        },
      },
      authorizedPolicy,
      budgetSnapshot,
      'provider-authorized',
    ),
    'model_policy_mismatch',
  );
  assert.equal(
    validateWriterRoundCaptureAgainstPolicy(
      baseCapture('openai/gpt-4o-mini'),
      authorizedPolicy,
      budgetSnapshot,
      'provider-authorized',
    ),
    'model_policy_mismatch',
  );
});