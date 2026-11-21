import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { createDatabase } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { user } from '@offscreen/db/schema';
import {
  storytellerAttempt,
  storytellerDispatchReview,
  storytellerFunding,
  storytellerRun,
} from '@offscreen/db/storyteller-schema';
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
} from '../../../packages/story-engine/dist/storyteller/saved-repair-plan.js';

const requireFromDatabasePackage = createRequire(
  new URL('../../../packages/db/package.json', import.meta.url),
);
const { Client } = requireFromDatabasePackage('pg');

const DATABASE_URL =
  'postgresql://offscreen:local-development-only@localhost:5432/offscreen_hk01_repair_test';
const ADMIN_URL =
  'postgresql://offscreen:local-development-only@localhost:5432/postgres';

function uniqueRequestSha256() {
  return createHash('sha256').update(randomBytes(32)).digest('hex');
}

const providerExecution = {
  mode: 'provider',
  accountId: randomUUID(),
  runId: randomUUID(),
  dispatchReview: { mode: 'hold' },
  policy: {
    version: 'saved-repair-plan-integration',
    route: 'test:repair-plan-integration',
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

function buildRepairableProviderTask() {
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
    execution: providerExecution,
    resources: storytellerTaskResourcesSchema.parse(
      providerResources(providerExecution.policy.route),
    ),
  });
  assert.ok(diagnoseStorytellerResult(task, candidate));
  return { task, candidate };
}

function buildEvidenceBytes(task, candidate, requestSha256) {
  const envelope = {
    id: 'provider-generation-repair-integration-1',
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

async function insertAttemptBundle(database, ids, task, packetSha256) {
  const now = new Date();
  await database.db.insert(user).values({
    id: ids.ownerId,
    name: 'HK01 Repair',
    email: `${ids.ownerId}@example.test`,
    emailVerified: true,
  });
  await database.db.insert(storytellerFunding).values({
    id: ids.accountId,
    limitMicrousd: 1000000n,
    settledMicrousd: 0n,
    reservedMicrousd: 0n,
    stopped: false,
    verifiedAt: now,
  });
  await database.db.insert(storytellerRun).values({
    id: ids.runId,
    accountId: ids.accountId,
    limitMicrousd: 1000000n,
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

async function insertPeerAttempt(database, ids, shared, task, packetSha256) {
  const now = new Date();
  await database.db.insert(generation).values({
    id: ids.generationId,
    ownerId: shared.ownerId,
    kind: 'storyteller-task',
    statusRevision: 0,
    input: task,
    state: 'uncertain',
    attemptId: ids.attemptId,
  });
  await database.db.insert(storytellerAttempt).values({
    id: ids.attemptId,
    generationId: ids.generationId,
    accountId: shared.accountId,
    runId: shared.runId,
    ownerId: shared.ownerId,
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

test('preview on disposable database stays read-only', async () => {
  await ensureRepairDatabase();
  const database = createDatabase({ connectionString: DATABASE_URL }, () => {});
  const { task, candidate } = buildRepairableProviderTask();
  const packetSha256 = uniqueRequestSha256();
  const ownerId = `hk01-repair-${randomUUID()}`;
  const primary = {
    ownerId,
    accountId: providerExecution.accountId,
    runId: providerExecution.runId,
    generationId: randomUUID(),
    attemptId: randomUUID(),
  };
  const secondary = {
    ownerId,
    accountId: providerExecution.accountId,
    runId: providerExecution.runId,
    generationId: randomUUID(),
    attemptId: randomUUID(),
  };
  try {
    await insertAttemptBundle(database, primary, task, packetSha256);
    const evidenceBytes = buildEvidenceBytes(task, candidate, packetSha256);
    const plan = await previewSavedRepair(database, {
      generationId: primary.generationId,
      attemptId: primary.attemptId,
      evidenceBytes,
    });
    assert.equal(plan.disposition, 'plan');

    const beforeAttempt = await database.db
      .select({ state: storytellerAttempt.state })
      .from(storytellerAttempt)
      .where(eq(storytellerAttempt.id, primary.attemptId));
    const beforeGeneration = await database.db
      .select({ state: generation.state })
      .from(generation)
      .where(eq(generation.id, primary.generationId));

    await insertPeerAttempt(database, secondary, primary, task, packetSha256);

    await assert.rejects(
      () =>
        previewSavedRepair(database, {
          generationId: primary.generationId,
          attemptId: primary.attemptId,
          evidenceBytes,
        }),
      (error) =>
        error instanceof SavedRepairPlanRefusal &&
        error.code === 'ambiguous_evidence',
    );

    const afterAttempt = await database.db
      .select({ state: storytellerAttempt.state })
      .from(storytellerAttempt)
      .where(eq(storytellerAttempt.id, primary.attemptId));
    const afterGeneration = await database.db
      .select({ state: generation.state })
      .from(generation)
      .where(eq(generation.id, primary.generationId));

    assert.deepEqual(afterAttempt, beforeAttempt);
    assert.deepEqual(afterGeneration, beforeGeneration);
  } finally {
    await database.close();
  }
});

test('databasePathAllowed accepts story_local pathname only', async () => {
  const script = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '../../../scripts/repo-tools/plan-storyteller-saved-repair.mjs',
  );
  const { databasePathAllowed } = await import(`file://${script}`);
  assert.equal(databasePathAllowed('/offscreen_story_local'), true);
  assert.equal(databasePathAllowed('/offscreen_hk01_repair_test'), true);
  assert.equal(databasePathAllowed('/offscreen_auth_test'), false);
});

function spawnPlanCli(script, extraArgv) {
  return spawnSync(process.execPath, [script, ...extraArgv], {
    encoding: 'utf8',
  });
}

test('plan CLI prints hold on bad database name', async () => {
  const { task, candidate } = buildRepairableProviderTask();
  const evidenceRoot = await mkdtemp(path.join(os.tmpdir(), 'hk01-evidence-'));
  const evidenceFile = path.join(evidenceRoot, 'repair.json');
  await writeFile(
    evidenceFile,
    buildEvidenceBytes(task, candidate, uniqueRequestSha256()),
  );
  const script = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '../../../scripts/repo-tools/plan-storyteller-saved-repair.mjs',
  );
  const result = spawnSync(
    process.execPath,
    [
      script,
      '--plan',
      '--local-disposable',
      '--database-url',
      'postgresql://offscreen:local-development-only@localhost:5432/offscreen_auth_test',
      '--evidence-root',
      evidenceRoot,
      '--evidence',
      'repair.json',
      '--generation',
      randomUUID(),
      '--attempt',
      randomUUID(),
    ],
    { encoding: 'utf8' },
  );
  await rm(evidenceRoot, { recursive: true, force: true });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /database_url_not_allowed/);
});

test('plan CLI prints hold on evidence symlink', async () => {
  const { task, candidate } = buildRepairableProviderTask();
  const evidenceRoot = await mkdtemp(path.join(os.tmpdir(), 'hk01-evidence-'));
  const realFile = path.join(evidenceRoot, 'real.json');
  const linkPath = path.join(evidenceRoot, 'repair.json');
  await writeFile(
    realFile,
    buildEvidenceBytes(task, candidate, uniqueRequestSha256()),
  );
  await symlink(realFile, linkPath);
  const script = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '../../../scripts/repo-tools/plan-storyteller-saved-repair.mjs',
  );
  const result = spawnPlanCli(script, [
    '--plan',
    '--local-disposable',
    '--database-url',
    DATABASE_URL,
    '--evidence-root',
    evidenceRoot,
    '--evidence',
    'repair.json',
    '--generation',
    randomUUID(),
    '--attempt',
    randomUUID(),
  ]);
  await rm(evidenceRoot, { recursive: true, force: true });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /evidence_symlink/);
});

test('plan CLI prints hold on evidence escape', async () => {
  const { task, candidate } = buildRepairableProviderTask();
  const evidenceRoot = await mkdtemp(path.join(os.tmpdir(), 'hk01-evidence-'));
  const outsideRoot = await mkdtemp(path.join(os.tmpdir(), 'hk01-outside-'));
  const outsideFile = path.join(outsideRoot, 'escape.json');
  await writeFile(
    outsideFile,
    buildEvidenceBytes(task, candidate, uniqueRequestSha256()),
  );
  const script = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '../../../scripts/repo-tools/plan-storyteller-saved-repair.mjs',
  );
  const escapedName = path.relative(evidenceRoot, outsideFile);
  const result = spawnPlanCli(script, [
    '--plan',
    '--local-disposable',
    '--database-url',
    DATABASE_URL,
    '--evidence-root',
    evidenceRoot,
    '--evidence',
    escapedName,
    '--generation',
    randomUUID(),
    '--attempt',
    randomUUID(),
  ]);
  await rm(evidenceRoot, { recursive: true, force: true });
  await rm(outsideRoot, { recursive: true, force: true });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /evidence_escape/);
});