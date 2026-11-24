import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { createDatabase } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { user } from '@offscreen/identity-persistence/auth';
import {
  storytellerAttempt,
  storytellerDispatchReview,
  storytellerFunding,
  storytellerOperation,
  storytellerRun,
  storytellerSavedRepairAudit,
} from '@offscreen/db/storyteller-schema';
import { usdToMicrousd } from '@offscreen/storyteller/providers/openrouter';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import {
  describeStorytellerRequestPurpose,
  diagnoseStorytellerResult,
  prepareStorytellerTask,
  storytellerTaskResourcesSchema,
} from '@offscreen/storyteller/tasks';
import { previewSavedRepair } from '../../../packages/story-engine/dist/storyteller/saved-repair-plan.js';
import {
  applySavedRepair,
  SavedRepairApplyError,
} from '../../../packages/story-engine/dist/storyteller/saved-repair-apply.js';

const requireFromDatabasePackage = createRequire(
  new URL('../../../packages/db/package.json', import.meta.url),
);
const { Client } = requireFromDatabasePackage('pg');

const DATABASE_URL =
  'postgresql://offscreen:local-development-only@localhost:5432/offscreen_hk01_repair_test';
const ADMIN_URL =
  'postgresql://offscreen:local-development-only@localhost:5432/postgres';

const EVIDENCE_COST_USD = '0.0012';
const EXPECTED_CHARGE = usdToMicrousd(EVIDENCE_COST_USD);

function uniqueRequestSha256() {
  return createHash('sha256').update(randomBytes(32)).digest('hex');
}

function providerExecutionFor(route) {
  return {
  mode: 'provider',
  accountId: randomUUID(),
  runId: randomUUID(),
  dispatchReview: { mode: 'hold' },
  policy: {
    version: 'saved-repair-apply-integration',
    route,
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
}

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
      maxMicrousd: '54000000',
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
          maxMicrousdPerOperation: '54000000',
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

function buildRepairableProviderTask(execution) {
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
  const consequence = prepareStorytellerTask({
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
  const candidate = structuredClone(scriptedStorytellerResult(consequence));
  candidate.scene.next.plans[0].evidence = ['invented-evidence'];
  const task = prepareStorytellerTask({
    ...consequence,
    execution,
    resources: storytellerTaskResourcesSchema.parse(
      providerResources(execution.policy.route),
    ),
  });
  assert.ok(diagnoseStorytellerResult(task, candidate));
  return { task, candidate };
}

function buildEvidenceBytes(task, candidate, requestSha256) {
  const envelope = {
    id: 'provider-generation-repair-apply-1',
    model: task.execution.policy.model,
    provider: task.execution.policy.provider,
    usage: {
      cost: EVIDENCE_COST_USD,
      prompt_tokens: 120,
      completion_tokens: 80,
      total_tokens: 200,
    },
    choices: [
      {
        finish_reason: 'stop',
        message: { content: JSON.stringify(candidate) },
      },
    ],
  };
  const wrapper = {
    raw: JSON.stringify(envelope),
    httpStatus: 200,
    receivedAt: '2026-01-01T00:00:00.000Z',
    providerId: envelope.id,
    requestSha256,
    purpose: describeStorytellerRequestPurpose(task),
  };
  return Buffer.from(`${JSON.stringify(wrapper)}\n`, 'utf8');
}

async function ensureRepairDatabase() {
  const client = new Client({ connectionString: ADMIN_URL });
  await client.connect();
  try {
    const existing = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      ['offscreen_hk01_repair_test'],
    );
    if (existing.rowCount === 0) {
      await client.query('CREATE DATABASE offscreen_hk01_repair_test');
    }
  } finally {
    await client.end();
  }
  const repoRoot = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '../../..',
  );
  const migrate = spawnSync(
    'pnpm',
    ['--filter', '@offscreen/db', 'migrate'],
    {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL },
      encoding: 'utf8',
      shell: false,
    },
  );
  if (migrate.status !== 0) {
    throw new Error(
      `migrate failed: ${migrate.stderr || migrate.stdout || migrate.status}`,
    );
  }
}

async function insertSettleableBundle(database, ids, task, packetSha256, options = {}) {
  const now = new Date();
  const stopped = options.stopped ?? false;
  await database.db.insert(user).values({
    id: ids.ownerId,
    name: 'HK01 Repair Apply',
    email: `${ids.ownerId}@example.test`,
    emailVerified: true,
  });
  await database.db.insert(storytellerFunding).values({
    id: ids.accountId,
    limitMicrousd: 10_000_000n,
    settledMicrousd: 0n,
    reservedMicrousd: 1000n,
    stopped,
    verifiedAt: now,
  });
  await database.db.insert(storytellerRun).values({
    id: ids.runId,
    accountId: ids.accountId,
    limitMicrousd: 10_000_000n,
    reservedMicrousd: 1000n,
    maxAttempts: 4,
    enabled: true,
  });
  await database.db.insert(generation).values({
    id: ids.generationId,
    ownerId: ids.ownerId,
    kind: 'storyteller-task',
    statusRevision: 0,
    input: task,
    state: 'uncertain',
    attemptId: ids.attemptId,
  });
  await database.db.insert(storytellerOperation).values({
    generationId: ids.generationId,
    accountId: ids.accountId,
    runId: ids.runId,
    ownerId: ids.ownerId,
    purpose: 'storyteller-task',
    resources: task.resources,
    state: 'uncertain',
    maxModelRounds: 2,
    reservedRounds: 0,
    dispatchedRounds: 1,
    maxInputTokens: 100000,
    reservedInputTokens: 100,
    consumedInputTokens: 0,
    maxGeneratedTokens: 2000,
    reservedGeneratedTokens: 100,
    consumedGeneratedTokens: 0,
    maxReasoningTokens: 0,
    reservedReasoningTokens: 0,
    consumedReasoningTokens: 0,
    maxMicrousd: 54_000_000n,
    reservedMicrousd: 1000n,
    consumedMicrousd: 0n,
  });
  await database.db.insert(storytellerAttempt).values({
    id: ids.attemptId,
    generationId: ids.generationId,
    accountId: ids.accountId,
    runId: ids.runId,
    ownerId: ids.ownerId,
    purpose: 'storyteller-task',
    storytellerProfileId: task.profile.id,
    storytellerProfileRevision: task.profile.revision,
    taskInputVersion: task.inputVersion,
    promptVersion: task.promptVersion,
    recipeVersion: task.resources.recipe.version,
    resourcePolicyVersion: task.resources.version,
    requestedModel: task.execution.policy.model,
    requestedProvider: task.execution.policy.provider,
    priceVersion: task.execution.policy.priceVersion,
    attribution: { custody: { mode: 'provider' } },
    state: 'uncertain',
    reservedMicrousd: 1000n,
    reservedInputTokens: 100,
    reservedGeneratedTokens: 100,
    reservedReasoningTokens: 0,
    estimatedMicrousd: 1000n,
    estimatedInputTokens: 100,
    estimationMethod: 'provider-custody',
    reconciliation: 'unknown',
    requestBytes: 1200,
    policy: task.execution.policy,
    providerId: null,
    dispatchedAt: now,
  });
  await database.db.insert(storytellerDispatchReview).values({
    attemptId: ids.attemptId,
    generationId: ids.generationId,
    mode: 'hold',
    state: 'released',
    revision: 0,
    packetSha256,
    packet: { body: {} },
    inspection: { sha256: packetSha256 },
    reviewedAt: now,
  });
}

async function readFunding(database, accountId) {
  const [row] = await database.db
    .select()
    .from(storytellerFunding)
    .where(eq(storytellerFunding.id, accountId));
  return row;
}

async function planFixture(database) {
  const route = `test:repair-apply-${randomUUID()}`;
  const execution = providerExecutionFor(route);
  const { task, candidate } = buildRepairableProviderTask(execution);
  const packetSha256 = uniqueRequestSha256();
  const ownerId = `hk01-apply-${randomUUID()}`;
  const ids = {
    ownerId,
    accountId: execution.accountId,
    runId: execution.runId,
    generationId: randomUUID(),
    attemptId: randomUUID(),
  };
  await insertSettleableBundle(database, ids, task, packetSha256, {
    stopped: false,
  });
  const evidenceBytes = buildEvidenceBytes(task, candidate, packetSha256);
  const plan = await previewSavedRepair(database, {
    generationId: ids.generationId,
    attemptId: ids.attemptId,
    evidenceBytes,
  });
  return { ids, task, candidate, packetSha256, evidenceBytes, plan };
}

test('apply charges once and retains invalid-output repair candidate', async () => {
  await ensureRepairDatabase();
  const database = createDatabase({ connectionString: DATABASE_URL }, () => {});
  const { ids, evidenceBytes, plan } = await planFixture(database);
  try {
    const result = await applySavedRepair(database, {
      generationId: ids.generationId,
      attemptId: ids.attemptId,
      evidenceBytes,
      planFingerprint: plan.fingerprint,
      operatorId: 'integration-operator',
      reason: 'hk01 apply proof',
    });
    assert.equal(result.disposition, 'applied');
    const funding = await readFunding(database, ids.accountId);
    assert.equal(funding.settledMicrousd, EXPECTED_CHARGE);
    const [attemptRow] = await database.db
      .select()
      .from(storytellerAttempt)
      .where(eq(storytellerAttempt.id, ids.attemptId));
    assert.equal(attemptRow.state, 'settled');
    assert.equal(attemptRow.chargedMicrousd, EXPECTED_CHARGE);
    const [genRow] = await database.db
      .select()
      .from(generation)
      .where(eq(generation.id, ids.generationId));
    assert.equal(genRow.state, 'failed');
    assert.equal(genRow.failureCode, 'invalid_output');
    assert.ok(genRow.repairCandidate);
    assert.ok(genRow.repairDiagnostic);
    const [auditRow] = await database.db
      .select()
      .from(storytellerSavedRepairAudit)
      .where(eq(storytellerSavedRepairAudit.attemptId, ids.attemptId));
    assert.equal(auditRow.planFingerprint, plan.fingerprint);
  } finally {
    await database.close();
  }
});

test('same fingerprint returns already-applied without extra charge', async () => {
  await ensureRepairDatabase();
  const database = createDatabase({ connectionString: DATABASE_URL }, () => {});
  const { ids, evidenceBytes, plan } = await planFixture(database);
  try {
    await applySavedRepair(database, {
      generationId: ids.generationId,
      attemptId: ids.attemptId,
      evidenceBytes,
      planFingerprint: plan.fingerprint,
      operatorId: 'integration-operator',
      reason: 'hk01 apply proof',
    });
    const replay = await applySavedRepair(database, {
      generationId: ids.generationId,
      attemptId: ids.attemptId,
      evidenceBytes,
      planFingerprint: plan.fingerprint,
      operatorId: 'integration-operator',
      reason: 'hk01 apply proof',
    });
    assert.equal(replay.disposition, 'already-applied');
    const funding = await readFunding(database, ids.accountId);
    assert.equal(funding.settledMicrousd, EXPECTED_CHARGE);
  } finally {
    await database.close();
  }
});

test('wrong plan fingerprint is plan_conflict without balance change', async () => {
  await ensureRepairDatabase();
  const database = createDatabase({ connectionString: DATABASE_URL }, () => {});
  const { ids, evidenceBytes, plan } = await planFixture(database);
  try {
    await assert.rejects(
      () =>
        applySavedRepair(database, {
          generationId: ids.generationId,
          attemptId: ids.attemptId,
          evidenceBytes,
          planFingerprint: createHash('sha256')
            .update(plan.fingerprint)
            .digest('hex'),
          operatorId: 'integration-operator',
          reason: 'hk01 apply proof',
        }),
      (error) => {
        assert.ok(error instanceof SavedRepairApplyError);
        assert.equal(error.code, 'plan_conflict');
        return true;
      },
    );
    const funding = await readFunding(database, ids.accountId);
    assert.equal(funding.settledMicrousd, 0n);
  } finally {
    await database.close();
  }
});

test('audit conflict when settled audit fingerprint differs', async () => {
  await ensureRepairDatabase();
  const database = createDatabase({ connectionString: DATABASE_URL }, () => {});
  const { ids, evidenceBytes, plan } = await planFixture(database);
  try {
    await applySavedRepair(database, {
      generationId: ids.generationId,
      attemptId: ids.attemptId,
      evidenceBytes,
      planFingerprint: plan.fingerprint,
      operatorId: 'integration-operator',
      reason: 'hk01 apply proof',
    });
    await assert.rejects(
      () =>
        applySavedRepair(database, {
          generationId: ids.generationId,
          attemptId: ids.attemptId,
          evidenceBytes,
          planFingerprint: createHash('sha256')
            .update('different-plan')
            .digest('hex'),
          operatorId: 'integration-operator',
          reason: 'hk01 apply proof',
        }),
      (error) => {
        assert.ok(error instanceof SavedRepairApplyError);
        assert.equal(error.code, 'audit_conflict');
        return true;
      },
    );
    const funding = await readFunding(database, ids.accountId);
    assert.equal(funding.settledMicrousd, EXPECTED_CHARGE);
  } finally {
    await database.close();
  }
});

test('parallel apply does not double-charge', async () => {
  await ensureRepairDatabase();
  const database = createDatabase({ connectionString: DATABASE_URL }, () => {});
  const { ids, evidenceBytes, plan } = await planFixture(database);
  try {
    const input = {
      generationId: ids.generationId,
      attemptId: ids.attemptId,
      evidenceBytes,
      planFingerprint: plan.fingerprint,
      operatorId: 'integration-operator',
      reason: 'hk01 apply proof',
    };
    await Promise.allSettled([
      applySavedRepair(database, input),
      applySavedRepair(database, input),
    ]);
    const funding = await readFunding(database, ids.accountId);
    assert.equal(funding.settledMicrousd, EXPECTED_CHARGE);
  } finally {
    await database.close();
  }
});

test('audit insert failure rolls back settlement charge', async () => {
  await ensureRepairDatabase();
  const database = createDatabase({ connectionString: DATABASE_URL }, () => {});
  const { ids, evidenceBytes, plan } = await planFixture(database);
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION hk01_block_saved_repair_audit()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RAISE EXCEPTION 'hk01_audit_insert_blocked';
      END;
      $$;
    `);
    await client.query(`
      CREATE TRIGGER hk01_block_saved_repair_audit
      BEFORE INSERT ON storyteller_saved_repair_audit
      FOR EACH ROW
      EXECUTE FUNCTION hk01_block_saved_repair_audit();
    `);
    await assert.rejects(
      () =>
        applySavedRepair(database, {
          generationId: ids.generationId,
          attemptId: ids.attemptId,
          evidenceBytes,
          planFingerprint: plan.fingerprint,
          operatorId: 'integration-operator',
          reason: 'hk01 apply proof',
        }),
      (error) => {
        const detail = String(error?.cause?.message ?? error.message);
        assert.match(detail, /hk01_audit_insert_blocked/);
        return true;
      },
    );
    const funding = await readFunding(database, ids.accountId);
    assert.equal(funding.settledMicrousd, 0n);
    const [genRow] = await database.db
      .select({ state: generation.state })
      .from(generation)
      .where(eq(generation.id, ids.generationId));
    assert.equal(genRow.state, 'uncertain');
    const [attemptRow] = await database.db
      .select({ state: storytellerAttempt.state })
      .from(storytellerAttempt)
      .where(eq(storytellerAttempt.id, ids.attemptId));
    assert.equal(attemptRow.state, 'uncertain');
  } finally {
    await client.query(
      'DROP TRIGGER IF EXISTS hk01_block_saved_repair_audit ON storyteller_saved_repair_audit',
    );
    await client.query('DROP FUNCTION IF EXISTS hk01_block_saved_repair_audit');
    await client.end();
    await database.close();
  }
});

test('funding.stopped stays true after apply when already stopped', async () => {
  await ensureRepairDatabase();
  const database = createDatabase({ connectionString: DATABASE_URL }, () => {});
  const execution = providerExecutionFor(
    `test:repair-apply-stopped-${randomUUID()}`,
  );
  const { task, candidate } = buildRepairableProviderTask(execution);
  const accountId = execution.accountId;
  const runId = execution.runId;
  const packetSha256 = uniqueRequestSha256();
  const ownerId = `hk01-apply-stopped-${randomUUID()}`;
  const ids = {
    ownerId,
    accountId,
    runId,
    generationId: randomUUID(),
    attemptId: randomUUID(),
  };
  try {
    await insertSettleableBundle(database, ids, task, packetSha256, {
      stopped: true,
    });
    const evidenceBytes = buildEvidenceBytes(task, candidate, packetSha256);
    const plan = await previewSavedRepair(database, {
      generationId: ids.generationId,
      attemptId: ids.attemptId,
      evidenceBytes,
    });
    await applySavedRepair(database, {
      generationId: ids.generationId,
      attemptId: ids.attemptId,
      evidenceBytes,
      planFingerprint: plan.fingerprint,
      operatorId: 'integration-operator',
      reason: 'hk01 apply proof',
    });
    const funding = await readFunding(database, ids.accountId);
    assert.equal(funding.stopped, true);
  } finally {
    await database.close();
  }
});

test('apply module does not import provider transport', async () => {
  const source = await readFile(
    new URL('../../../packages/story-engine/src/storyteller/saved-repair-apply.ts', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /openrouter/);
});