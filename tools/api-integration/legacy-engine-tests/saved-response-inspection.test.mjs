import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import {
  describeStorytellerRequestPurpose,
  diagnoseStorytellerResult,
  prepareStorytellerTask,
  storytellerTaskResourcesSchema,
} from '@offscreen/storyteller/tasks';
import {
  inspectSavedInvalidRepairResponse,
  SavedRepairInspectionRefusal,
} from '../../../packages/story-engine/dist/storyteller/saved-response-inspection.js';

const REQUEST_SHA256 =
  '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';

const providerExecution = {
  mode: 'provider',
  accountId: randomUUID(),
  runId: randomUUID(),
  dispatchReview: { mode: 'hold' },
  policy: {
    version: 'saved-repair-inspection-test',
    route: 'test:repair-inspection',
    model: 'test/model',
    provider: 'Test',
    priceVersion: 'invented-test',
    inputMicrousdPerMillion: '500000',
    outputMicrousdPerMillion: '2000000',
    maxInputTokens: 100000,
    maxOutputTokens: 2000,
    timeoutMs: 1000,
  },
};

function providerResources(route) {
  const source = [{ source: 'test', value: 100000 }];
  return {
    version: 'storyteller-resources.v2',
    recipe: {
      version: 'repairable-turn.v1',
      maxModelRounds: 2,
      maxReads: 0,
      tools: 'disabled',
      automaticEscalation: false,
      maxRepairRounds: 1,
    },
    envelope: {
      maxSerializedRequestBytes: 48000,
      maxInputTokens: 100000,
      maxGeneratedTokens: 2000,
      maxReasoningTokens: 0,
      maxMicrousd: '54',
      deadlineMs: 1000,
    },
    authority: {
      kind: 'effective-usage-policy',
      policy: {
        schemaVersion: 1,
        platform: { id: 'test', revision: 1 },
        profile: { id: 'test', revision: 1 },
        route,
        fundingMode: 'prepaid',
        recovery: 'explicit-resume',
        limits: {
          maxInputTokensPerRequest: 100000,
          maxSerializedBytesPerRequest: 48000,
          maxGeneratedTokensPerRequest: 2000,
          maxReasoningTokensPerRequest: 0,
          maxInputTokensPerOperation: 100000,
          maxGeneratedTokensPerOperation: 2000,
          maxModelRoundsPerOperation: 2,
          maxReadsPerOperation: 0,
          maxRetainedReadBytes: 0,
          maxMicrousdPerOperation: '54',
          maxInFlightDispatches: 1,
          maxBackgroundJobsPerWindow: 0,
        },
        limitSources: {
          maxInputTokensPerRequest: source,
          maxSerializedBytesPerRequest: source,
          maxGeneratedTokensPerRequest: source,
          maxReasoningTokensPerRequest: [{ source: 'test', value: 0 }],
          maxInputTokensPerOperation: source,
          maxGeneratedTokensPerOperation: source,
          maxModelRoundsPerOperation: source,
          maxReadsPerOperation: [{ source: 'test', value: 0 }],
          maxRetainedReadBytes: [{ source: 'test', value: 0 }],
          maxMicrousdPerOperation: source,
          maxInFlightDispatches: source,
          maxBackgroundJobsPerWindow: [{ source: 'test', value: 0 }],
        },
        windows: [],
        restrictions: [],
      },
    },
  };
}

function opening() {
  return prepareStorytellerTask({
    task: 'opening',
    source: { draftId: randomUUID(), draftRevision: 1 },
    profile: storytellerCatalogue.resolve({
      id: 'absurd-action-comedy',
      revision: 1,
    }),
    execution: { mode: 'scripted', version: 'offline-rehearsal.v1' },
    context: {
      premise: {
        title: '',
        premise: 'A traveler wakes beside an unfamiliar companion.',
        storytellingDirection: '',
      },
      current: null,
      selected: null,
      items: [],
      notes: [],
      evidence: [],
    },
  });
}

function consequence() {
  const base = opening();
  const passage = {
    id: randomUUID(),
    sequence: 2,
    content: {
      version: 1,
      title: 'After the attempt',
      paragraphs: ['The committed result is now visible.'],
    },
    response: null,
  };
  return prepareStorytellerTask({
    task: 'consequence',
    source: {
      storyId: randomUUID(),
      narrativeRevision: 2,
      passageId: passage.id,
    },
    profile: base.profile,
    execution: base.execution,
    context: {
      ...base.context,
      current: passage,
      evidence: [passage],
      selected: {
        id: 'inspect',
        label: 'Inspect the clue',
        intention: 'Inspect the clue carefully.',
      },
      resolution: {
        character: {
          name: 'A strange observer',
          scores: {
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 12,
            wisdom: 12,
            charisma: 10,
          },
          applicableAbilities: [
            'strength',
            'dexterity',
            'constitution',
            'intelligence',
            'wisdom',
            'charisma',
          ],
          skills: [
            { id: 'persuasion', label: 'Persuasion' },
            { id: 'perception', label: 'Perception' },
          ],
          proficientSkills: ['persuasion', 'perception'],
          proficiencyBonus: 2,
          hp: 5,
          maxHp: 5,
          facts: [
            { id: 'gary-alert', value: true },
            { id: 'under-cover', value: false },
            { id: 'gary-reassurance-tried', value: false },
            { id: 'location', value: 'pineapple' },
          ],
          quantities: [],
        },
        storyFacts: [],
        gameSecond: 0,
        offer: {
          id: randomUUID(),
          nodes: [
            {
              id: 'inspect',
              parent: null,
              label: 'Inspect',
              description: 'Inspect what changed.',
              action: {
                kind: 'attempt',
                timing: { kind: 'finite', fictionalSeconds: 5 },
              },
            },
          ],
        },
        receipts: [],
      },
    },
  });
}

function buildRepairableProviderTask() {
  const base = consequence();
  const candidate = structuredClone(scriptedStorytellerResult(base));
  if (candidate.scene?.version !== 3) {
    throw new Error('Expected consequence scene');
  }
  candidate.scene.next.plans[0].evidence = ['invented-evidence'];
  const task = prepareStorytellerTask({
    ...base,
    execution: providerExecution,
    resources: storytellerTaskResourcesSchema.parse(
      providerResources(providerExecution.policy.route),
    ),
  });
  assert.ok(diagnoseStorytellerResult(task, candidate));
  return { task, candidate };
}

function buildEnvelope(task, candidate, overrides = {}) {
  return {
    id: 'provider-generation-repair-1',
    model: task.execution.policy.model,
    provider: task.execution.policy.provider,
    usage: {
      cost: '0.0012',
      prompt_tokens: 120,
      completion_tokens: 80,
      total_tokens: 200,
      ...overrides.usage,
    },
    choices: [
      {
        finish_reason: 'stop',
        message: {
          content: JSON.stringify(candidate),
        },
      },
    ],
    ...overrides.envelope,
  };
}

function buildEvidenceBytes(task, envelope, wrapperOverrides = {}) {
  const wrapper = {
    raw: JSON.stringify(envelope),
    httpStatus: 200,
    receivedAt: '2026-01-01T00:00:00.000Z',
    providerId: envelope.id,
    requestSha256: REQUEST_SHA256,
    purpose: describeStorytellerRequestPurpose(task),
    ...wrapperOverrides,
  };
  return Buffer.from(`${JSON.stringify(wrapper)}\n`, 'utf8');
}

function baseInput(task, evidenceBytes, overrides = {}) {
  const attemptId = randomUUID();
  return {
    generationId: randomUUID(),
    attemptId,
    generationAttemptId: attemptId,
    task,
    reviewedPacketSha256: REQUEST_SHA256,
    reviewState: 'released',
    evidenceBytes,
    ...overrides,
  };
}

test('accepts one invalid-output repair with derived microusd and stable evidence hash', () => {
  const { task, candidate } = buildRepairableProviderTask();
  const bytes = buildEvidenceBytes(task, buildEnvelope(task, candidate));
  const input = baseInput(task, bytes);
  const first = inspectSavedInvalidRepairResponse(input);
  const second = inspectSavedInvalidRepairResponse(input);
  assert.equal(
    first.evidenceSha256,
    createHash('sha256').update(bytes).digest('hex'),
  );
  assert.equal(first.usage.reportedCostMicrousd, 1200n);
  assert.equal(first.requestSha256, REQUEST_SHA256);
  assert.deepEqual(second, first);
  assert.equal(first.generationOutcome.failureCode, 'invalid_output');
});

test('static: inspector does not reference budget settlement', () => {
  const source = readFileSync(
    fileURLToPath(
      new URL(
        '../../../packages/story-engine/src/storyteller/saved-response-inspection.ts',
        import.meta.url,
      ),
    ),
    'utf8',
  );
  assert.doesNotMatch(source, /createStorytellerBudget/);
  assert.doesNotMatch(source, /budget\.settle/);
});

test('refuses wrong request digest', () => {
  const { task, candidate } = buildRepairableProviderTask();
  const bytes = buildEvidenceBytes(task, buildEnvelope(task, candidate), {
    requestSha256:
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  });
  assert.throws(
    () =>
      inspectSavedInvalidRepairResponse(
        baseInput(task, bytes, {
          reviewedPacketSha256:
            'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        }),
      ),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'wrong_request_digest',
  );
});

test('refuses wrong provider route', () => {
  const { task, candidate } = buildRepairableProviderTask();
  const envelope = buildEnvelope(task, candidate, {
    envelope: { provider: 'Other' },
  });
  const bytes = buildEvidenceBytes(task, envelope);
  assert.throws(
    () => inspectSavedInvalidRepairResponse(baseInput(task, bytes)),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'wrong_provider',
  );
});

test('refuses wrong model route', () => {
  const { task, candidate } = buildRepairableProviderTask();
  const envelope = buildEnvelope(task, candidate, {
    envelope: { model: 'other/model' },
  });
  const bytes = buildEvidenceBytes(task, envelope);
  assert.throws(
    () => inspectSavedInvalidRepairResponse(baseInput(task, bytes)),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'wrong_model',
  );
});

test('refuses wrong purpose', () => {
  const { task, candidate } = buildRepairableProviderTask();
  const bytes = buildEvidenceBytes(task, buildEnvelope(task, candidate), {
    purpose: { id: 'opening.narrative' },
  });
  assert.throws(
    () => inspectSavedInvalidRepairResponse(baseInput(task, bytes)),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'wrong_purpose',
  );
});

test('refuses missing response id', () => {
  const { task, candidate } = buildRepairableProviderTask();
  const envelope = buildEnvelope(task, candidate, { envelope: { id: '' } });
  const bytes = buildEvidenceBytes(task, envelope);
  assert.throws(
    () => inspectSavedInvalidRepairResponse(baseInput(task, bytes)),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'missing_response_id',
  );
});

test('refuses provider id mismatch', () => {
  const { task, candidate } = buildRepairableProviderTask();
  const bytes = buildEvidenceBytes(task, buildEnvelope(task, candidate), {
    providerId: 'different-provider-id',
  });
  assert.throws(
    () => inspectSavedInvalidRepairResponse(baseInput(task, bytes)),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'provider_id_mismatch',
  );
});

test('refuses malformed cost', () => {
  const { task, candidate } = buildRepairableProviderTask();
  const envelope = buildEnvelope(task, candidate, {
    usage: { cost: 'not-a-number' },
  });
  const bytes = buildEvidenceBytes(task, envelope);
  assert.throws(
    () => inspectSavedInvalidRepairResponse(baseInput(task, bytes)),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'malformed_cost',
  );
});

test('refuses invalid token count', () => {
  const { task, candidate } = buildRepairableProviderTask();
  const envelope = buildEnvelope(task, candidate, {
    usage: { total_tokens: 199 },
  });
  const bytes = buildEvidenceBytes(task, envelope);
  assert.throws(
    () => inspectSavedInvalidRepairResponse(baseInput(task, bytes)),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'invalid_token_count',
  );
});

test('refuses valid model output', () => {
  const { task } = buildRepairableProviderTask();
  const base = consequence();
  const valid = scriptedStorytellerResult(base);
  const providerTask = prepareStorytellerTask({
    ...base,
    execution: providerExecution,
    resources: storytellerTaskResourcesSchema.parse(
      providerResources(providerExecution.policy.route),
    ),
  });
  const bytes = buildEvidenceBytes(
    providerTask,
    buildEnvelope(providerTask, valid),
  );
  assert.throws(
    () => inspectSavedInvalidRepairResponse(baseInput(providerTask, bytes)),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'valid_output',
  );
});

test('refuses non-repairable recipe', () => {
  const { task, candidate } = buildRepairableProviderTask();
  const singleTurn = storytellerTaskResourcesSchema.parse({
    ...task.resources,
    recipe: {
      version: 'single-turn.v1',
      maxModelRounds: 1,
      maxReads: 0,
      tools: 'disabled',
      automaticEscalation: false,
    },
  });
  const nonRepairable = { ...task, resources: singleTurn };
  const bytes = buildEvidenceBytes(
    nonRepairable,
    buildEnvelope(nonRepairable, candidate),
  );
  assert.throws(
    () => inspectSavedInvalidRepairResponse(baseInput(nonRepairable, bytes)),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'recipe_not_repairable',
  );
});

test('refuses oversized evidence bytes', () => {
  const oversized = Buffer.alloc(600 * 1024 + 1, 0x7b);
  assert.throws(
    () =>
      inspectSavedInvalidRepairResponse(
        baseInput(buildRepairableProviderTask().task, oversized),
      ),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'oversized',
  );
});

test('refuses non-json evidence bytes', () => {
  const bytes = Buffer.from('not json', 'utf8');
  assert.throws(
    () =>
      inspectSavedInvalidRepairResponse(
        baseInput(buildRepairableProviderTask().task, bytes),
      ),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'refused_parse',
  );
});

test('refuses superseded review', () => {
  const { task, candidate } = buildRepairableProviderTask();
  const bytes = buildEvidenceBytes(task, buildEnvelope(task, candidate));
  assert.throws(
    () =>
      inspectSavedInvalidRepairResponse(
        baseInput(task, bytes, { reviewState: 'superseded' }),
      ),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'review_superseded',
  );
});

test('refuses awaiting review', () => {
  const { task, candidate } = buildRepairableProviderTask();
  const bytes = buildEvidenceBytes(task, buildEnvelope(task, candidate));
  assert.throws(
    () =>
      inspectSavedInvalidRepairResponse(
        baseInput(task, bytes, { reviewState: 'awaiting-review' }),
      ),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'review_not_dispatched',
  );
});

test('refuses generation attempt identity mismatch', () => {
  const { task, candidate } = buildRepairableProviderTask();
  const bytes = buildEvidenceBytes(task, buildEnvelope(task, candidate));
  assert.throws(
    () =>
      inspectSavedInvalidRepairResponse(
        baseInput(task, bytes, { generationAttemptId: randomUUID() }),
      ),
    (error) =>
      error instanceof SavedRepairInspectionRefusal &&
      error.code === 'identity_mismatch',
  );
});