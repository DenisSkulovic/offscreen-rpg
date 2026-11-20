import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { drizzle } from 'drizzle-orm/node-postgres';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import {
  describeStorytellerRequestPurpose,
  diagnoseStorytellerResult,
  prepareStorytellerTask,
  storytellerTaskResourcesSchema,
} from '@offscreen/storyteller/tasks';
import {
  previewSavedRepair,
  SavedRepairPlanRefusal,
} from '../dist/storyteller/saved-repair-plan.js';

const REQUEST_SHA256 =
  '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';

const providerExecution = {
  mode: 'provider',
  accountId: randomUUID(),
  runId: randomUUID(),
  dispatchReview: { mode: 'hold' },
  policy: {
    version: 'saved-repair-plan-test',
    route: 'test:repair-plan',
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

function consequence() {
  const base = prepareStorytellerTask({
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

function buildEnvelope(task, candidate) {
  return {
    id: 'provider-generation-repair-plan-1',
    model: task.execution.policy.model,
    provider: task.execution.policy.provider,
    usage: {
      cost: '0.0012',
      prompt_tokens: 120,
      completion_tokens: 80,
      total_tokens: 200,
    },
    choices: [
      {
        finish_reason: 'stop',
        message: {
          content: JSON.stringify(candidate),
        },
      },
    ],
  };
}

function buildEvidenceBytes(task, envelope) {
  const wrapper = {
    raw: JSON.stringify(envelope),
    httpStatus: 200,
    receivedAt: '2026-01-01T00:00:00.000Z',
    providerId: envelope.id,
    requestSha256: REQUEST_SHA256,
    purpose: describeStorytellerRequestPurpose(task),
  };
  return Buffer.from(`${JSON.stringify(wrapper)}\n`, 'utf8');
}

function createFakeDatabase(scenario) {
  const queries = [];
  const pool = {
    on() {},
    end: async () => {},
    query: async (queryConfig) => {
      const text =
        typeof queryConfig === 'string' ? queryConfig : queryConfig.text;
      queries.push(text);
      if (
        /\b(insert|update|delete)\b/i.test(text) &&
        !/set transaction read only/i.test(text)
      ) {
        throw new Error(`unexpected mutation: ${text}`);
      }
      if (
        /^(begin|commit|rollback)/i.test(text.trim()) ||
        /set transaction read only/i.test(text)
      ) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes('storyteller_dispatch_review') && text.includes('join')) {
        const rows = (scenario.otherReviews ?? []).map((row) => [
          row.attempt_id,
          row.provider_id,
        ]);
        return {
          rows,
          fields: [{ name: 'attempt_id' }, { name: 'provider_id' }],
          rowCount: rows.length,
        };
      }
      if (text.includes('"generation"')) {
        const row = scenario.generation;
        return {
          rows: row
            ? [[row.id, row.attempt_id, row.state, row.status_revision, row.input]]
            : [],
          fields: [
            { name: 'id' },
            { name: 'attempt_id' },
            { name: 'state' },
            { name: 'status_revision' },
            { name: 'input' },
          ],
          rowCount: row ? 1 : 0,
        };
      }
      if (text.includes('"storyteller_attempt"')) {
        const row = scenario.attempt;
        return {
          rows: row
            ? [
                [
                  row.id,
                  row.generation_id,
                  row.state,
                  row.account_id,
                  row.run_id,
                  row.provider_id,
                ],
              ]
            : [],
          fields: [
            { name: 'id' },
            { name: 'generation_id' },
            { name: 'state' },
            { name: 'account_id' },
            { name: 'run_id' },
            { name: 'provider_id' },
          ],
          rowCount: row ? 1 : 0,
        };
      }
      if (text.includes('"storyteller_dispatch_review"')) {
        const row = scenario.review;
        return {
          rows: row
            ? [
                [
                  row.attempt_id,
                  row.generation_id,
                  row.revision,
                  row.state,
                  row.packet_sha256,
                ],
              ]
            : [],
          fields: [
            { name: 'attempt_id' },
            { name: 'generation_id' },
            { name: 'revision' },
            { name: 'state' },
            { name: 'packet_sha256' },
          ],
          rowCount: row ? 1 : 0,
        };
      }
      return { rows: [], rowCount: 0 };
    },
  };
  return {
    database: {
      db: drizzle(pool),
      checkConnection: async () => {},
      close: async () => {},
    },
    queries,
  };
}

function baseScenario(overrides = {}) {
  const { task, candidate } = buildRepairableProviderTask();
  const generationId = randomUUID();
  const attemptId = randomUUID();
  const accountId = randomUUID();
  const runId = randomUUID();
  return {
    generationId,
    attemptId,
    accountId,
    runId,
    task,
    candidate,
    evidenceBytes: buildEvidenceBytes(task, buildEnvelope(task, candidate)),
    scenario: {
      generation: {
        id: generationId,
        attempt_id: attemptId,
        state: 'uncertain',
        status_revision: 0,
        input: task,
      },
      attempt: {
        id: attemptId,
        generation_id: generationId,
        state: 'uncertain',
        account_id: accountId,
        run_id: runId,
        provider_id: null,
      },
      review: {
        attempt_id: attemptId,
        generation_id: generationId,
        revision: 0,
        state: 'released',
        packet_sha256: REQUEST_SHA256,
      },
      otherReviews: [],
      ...overrides,
    },
  };
}

test('preview builds one redacted plan without mutating SQL', async () => {
  const { task, candidate } = buildRepairableProviderTask();
  const fixture = baseScenario();
  fixture.scenario.generation.input = task;
  const evidenceBytes = buildEvidenceBytes(task, buildEnvelope(task, candidate));
  const { database, queries } = createFakeDatabase(fixture.scenario);
  const plan = await previewSavedRepair(database, {
    generationId: fixture.generationId,
    attemptId: fixture.attemptId,
    evidenceBytes,
  });
  assert.equal(plan.disposition, 'plan');
  assert.equal(plan.generationFailureCode, 'invalid_output');
  assert.equal(plan.reportedCostMicrousd, '1200');
  assert.match(plan.fingerprint, /^[0-9a-f]{64}$/);
  assert.ok(
    queries.every(
      (query) =>
        /set transaction read only/i.test(query) ||
        !/\b(insert|update|delete)\b/i.test(query),
    ),
  );
});

test('refuses missing dispatch review', async () => {
  const fixture = baseScenario({ review: null });
  const { database } = createFakeDatabase(fixture.scenario);
  await assert.rejects(
    () =>
      previewSavedRepair(database, {
        generationId: fixture.generationId,
        attemptId: fixture.attemptId,
        evidenceBytes: buildEvidenceBytes(
          fixture.task,
          buildEnvelope(
            fixture.task,
            structuredClone(scriptedStorytellerResult(consequence())),
          ),
        ),
      }),
    (error) =>
      error instanceof SavedRepairPlanRefusal &&
      error.code === 'review_missing',
  );
});

test('refuses ambiguous second attempt with same packet digest', async () => {
  const { task, candidate } = buildRepairableProviderTask();
  const fixture = baseScenario({
    otherReviews: [
      {
        attempt_id: randomUUID(),
        provider_id: null,
      },
    ],
  });
  const { database } = createFakeDatabase(fixture.scenario);
  await assert.rejects(
    () =>
      previewSavedRepair(database, {
        generationId: fixture.generationId,
        attemptId: fixture.attemptId,
        evidenceBytes: buildEvidenceBytes(task, buildEnvelope(task, candidate)),
      }),
    (error) =>
      error instanceof SavedRepairPlanRefusal &&
      error.code === 'ambiguous_evidence',
  );
});

test('refuses revision mismatch', async () => {
  const { task, candidate } = buildRepairableProviderTask();
  const fixture = baseScenario();
  const { database } = createFakeDatabase(fixture.scenario);
  await assert.rejects(
    () =>
      previewSavedRepair(database, {
        generationId: fixture.generationId,
        attemptId: fixture.attemptId,
        expectedStatusRevision: 99,
        evidenceBytes: buildEvidenceBytes(task, buildEnvelope(task, candidate)),
      }),
    (error) =>
      error instanceof SavedRepairPlanRefusal &&
      error.code === 'revision_mismatch',
  );
});

test('refuses generation that is not uncertain', async () => {
  const { task, candidate } = buildRepairableProviderTask();
  const fixture = baseScenario();
  fixture.scenario.generation.state = 'failed';
  fixture.scenario.generation.failure_code = 'invalid_output';
  const { database } = createFakeDatabase(fixture.scenario);
  await assert.rejects(
    () =>
      previewSavedRepair(database, {
        generationId: fixture.generationId,
        attemptId: fixture.attemptId,
        evidenceBytes: buildEvidenceBytes(task, buildEnvelope(task, candidate)),
      }),
    (error) =>
      error instanceof SavedRepairPlanRefusal &&
      error.code === 'generation_not_uncertain',
  );
});