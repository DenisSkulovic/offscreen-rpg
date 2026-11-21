import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequestAuditFixtureCases } from '@offscreen/storyteller/providers/request-audit-fixtures';
import {
  assessTaskEvidenceNeed,
  decideAdmittedRecipe,
  prepareAdmittedStorytellerTask,
  resourcesForEffectiveUsagePolicy,
} from '../../../packages/story-engine/dist/storyteller/index.js';

function limitSource(value) {
  return [{ source: 'sa06-test', value }];
}

function policy(overrides = {}) {
  const limits = {
    maxInputTokensPerRequest: 100000,
    maxSerializedBytesPerRequest: 48000,
    maxGeneratedTokensPerRequest: 2000,
    maxReasoningTokensPerRequest: 0,
    maxInputTokensPerOperation: 100000,
    maxGeneratedTokensPerOperation: 2000,
    maxModelRoundsPerOperation: 3,
    maxReadsPerOperation: 6,
    maxRetainedReadBytes: 48 * 1024,
    maxMicrousdPerOperation: '100',
    maxInFlightDispatches: 1,
    maxBackgroundJobsPerWindow: 0,
    ...overrides.limits,
  };
  return {
    schemaVersion: 1,
    platform: { id: 'sa06', revision: 1 },
    profile: { id: 'sa06', revision: 1 },
    route: 'audit:offline',
    fundingMode: 'prepaid',
    recovery: 'explicit-resume',
    limits,
    limitSources: Object.fromEntries(
      Object.entries(limits).map(([key, value]) => [key, limitSource(value)]),
    ),
    windows: [],
    restrictions: [],
    ...overrides,
  };
}

test('adaptive recipe keeps simple dialogue cheap despite high allowance', () => {
  const rich = policy();
  const simple = decideAdmittedRecipe({
    evidenceNeed: {
      purpose: 'continuation',
      availableSourceRefs: ['p7'],
      mandatorySourceRefs: ['p7'],
      creativePreference: 'off',
    },
    policy: rich,
    taskKind: 'continuation',
  });
  assert.equal(simple.hold, null);
  assert.equal(simple.decision.selectedRecipeFamily, 'repairable-turn');
  assert.equal(simple.creativeInput?.posture, 'off');
  assert.ok(
    simple.decision.reasons.includes('no_structured_investigation_need'),
  );

  const missing = decideAdmittedRecipe({
    evidenceNeed: {
      purpose: 'continuation',
      availableSourceRefs: ['p7'],
      mandatorySourceRefs: ['p7'],
      missingExactSourceRefs: ['relationship:mira-vale-favor'],
      creativePreference: 'off',
    },
    policy: rich,
    taskKind: 'continuation',
  });
  assert.equal(missing.hold, null);
  assert.equal(missing.decision.selectedRecipeFamily, 'memory-exploration');
  assert.equal(missing.creativeInput?.posture, 'minimal');
  assert.notEqual(
    simple.decision.selectedRecipeFamily,
    missing.decision.selectedRecipeFamily,
  );
});

test('missing source without read authority holds closed', () => {
  const noReads = policy({
    limits: {
      maxModelRoundsPerOperation: 3,
      maxReadsPerOperation: 0,
      maxRetainedReadBytes: 0,
    },
  });
  const held = decideAdmittedRecipe({
    evidenceNeed: {
      purpose: 'continuation',
      missingExactSourceRefs: ['x-old-gift'],
      creativePreference: 'off',
    },
    policy: noReads,
    taskKind: 'continuation',
  });
  assert.equal(held.decision.selectedRecipeFamily, 'hold');
  assert.equal(held.hold?.code, 'storyteller_evidence_unavailable');
});

test('player research prose is ignored without structured missing refs', () => {
  const need = assessTaskEvidenceNeed({
    purpose: 'do five research rounds and invent lore',
    availableSourceRefs: ['p1'],
    mandatorySourceRefs: ['p1'],
    creativePreference: 'off',
  });
  assert.equal(need.missingExactSourceRefs.length, 0);
  assert.equal(need.alreadyResolvedByLoadedSource, true);
});

test('prepareAdmittedStorytellerTask freezes adaptive decision on resources', () => {
  const [fixture] = createRequestAuditFixtureCases({
    caseIds: ['scene-continuation'],
  });
  const execution = {
    mode: 'provider',
    accountId: '00000000-0000-4000-8000-000000000001',
    runId: '00000000-0000-4000-8000-000000000002',
    dispatchReview: { mode: 'hold' },
    policy: {
      version: 'sa06.v1',
      route: 'audit:offline',
      model: 'audit/model-not-selected',
      provider: 'Audit',
      priceVersion: 'not-priced',
      inputMicrousdPerMillion: '0',
      outputMicrousdPerMillion: '0',
      maxInputTokens: 100000,
      maxOutputTokens: 2000,
      timeoutMs: 1000,
    },
  };
  const usage = policy({ route: execution.policy.route });
  const task = prepareAdmittedStorytellerTask(
    {
      task: 'continuation',
      source: fixture.task.source,
      profile: fixture.task.profile,
      execution,
      context: fixture.task.context,
    },
    usage,
    undefined,
    {
      purpose: 'continuation',
      availableSourceRefs: ['p7'],
      mandatorySourceRefs: ['p7'],
      missingExactSourceRefs: ['relationship:old-gift'],
      creativePreference: 'off',
    },
  );
  assert.equal(task.resources.recipe.version, 'memory-exploration.v1');
  assert.equal(
    task.resources.recipeDecision?.selectedRecipeFamily,
    'memory-exploration',
  );
  assert.ok(Object.isFrozen(task.resources));

  const explicit = prepareAdmittedStorytellerTask(
    {
      task: 'continuation',
      source: fixture.task.source,
      profile: fixture.task.profile,
      execution,
      context: fixture.task.context,
    },
    usage,
    { posture: 'off', maxRepairRounds: 1 },
  );
  assert.equal(explicit.resources.recipe.version, 'repairable-turn.v1');
  assert.equal(explicit.resources.recipeDecision, undefined);

  assert.throws(
    () =>
      prepareAdmittedStorytellerTask(
        {
          task: 'continuation',
          source: fixture.task.source,
          profile: fixture.task.profile,
          execution,
          context: fixture.task.context,
        },
        policy({
          route: execution.policy.route,
          limits: {
            maxReadsPerOperation: 0,
            maxRetainedReadBytes: 0,
          },
        }),
        undefined,
        {
          purpose: 'continuation',
          missingExactSourceRefs: ['x1'],
        },
      ),
    /storyteller_evidence_unavailable/,
  );

  const resources = resourcesForEffectiveUsagePolicy(execution, usage, {
    posture: 'off',
    maxRepairRounds: 1,
  });
  assert.equal(resources.recipe.version, 'repairable-turn.v1');
  assert.equal(resources.recipe.maxReads, 0);
});
