/**
 * WR11 T03: multi-round GA control — plan/finalize continuation.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  applyLibraryBatch,
  canonicalDocumentSchema,
  createEmptyLibraryIndex,
  hashCanonicalJson,
  LocalDocumentStore,
} from '@offscreen/documents';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '@offscreen/lab-support';
import { initializeCampaign } from '@offscreen/story-engine/campaign/settings';
import { createStoryInitialization } from '@offscreen/story-engine/stories/initialization';
import { lockStoryById } from '@offscreen/story-engine/stories/persistence';
import {
  advanceDurableWriterMissionProviderStep,
  insertWriterMissionParentStep,
  prepareWriterMissionModelStep,
} from '@offscreen/story-engine/storyteller';
import { finalizeSettledWriterSceneRound } from '@offscreen/story-engine/storyteller/writer-round-settled-finalization';
import type { PreparedWriterRoundTransport } from '@offscreen/storyteller/providers/writer-round-transport';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import {
  offlineExecution,
  writerMissionCaptureSchema,
  type WriterMissionCapture,
} from '@offscreen/storyteller/tasks';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const { createWriterRoundSeam, writerRoundCapturePolicyModeForBootstrap } =
  await import(
    pathToFileURL(
      join(repoRoot, 'apps/game-authority/dist/src/writer-round-control-seam.js'),
    ).href
  );
const { scriptedOfflineLabWriterRoundPolicy } = await import(
  pathToFileURL(
    join(repoRoot, 'apps/game-authority/dist/src/writer-round-lab-policy.js'),
  ).href
);

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

const budgetSnapshot = {
  maxModelRounds: 6,
  maxInputTokens: 12_288,
  maxGeneratedTokens: 4_096,
  maxMicrousd: '250000',
  deadlineMs: 120_000,
};

const realUsage = {
  reportedCostMicrousd: 500n,
  promptTokens: 40,
  completionTokens: 20,
  totalTokens: 60,
  reasoningTokens: null,
  cachedTokens: null,
  cacheWriteTokens: null,
};

const realTelemetry = {
  durationMs: 5,
  httpStatus: 200,
  providerId: 'gen_wr11',
  reportedModel: 'scripted-offline',
  finishReason: 'stop',
};

const labPolicy = scriptedOfflineLabWriterRoundPolicy;
const capturePolicyMode = writerRoundCapturePolicyModeForBootstrap(
  'scripted-offline-lab',
);

function buildLibraryFixture(rootHash: string) {
  let library = createEmptyLibraryIndex();
  const objects = new Map<
    string,
  { envelope: { documentId: string; revision: number }; body: string }
  >();
  const operations = [];
  for (let index = 1; index <= 3; index += 1) {
    const documentId = randomUUID();
    const path = `lore/scene-${String(index).padStart(3, '0')}.md`;
    const document = canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId,
        schemaVersion: 1,
        revision: 1,
        kind: 'lore' as const,
        authority: 'canon' as const,
        visibility: 'player-known' as const,
        sources: [],
      },
      title: `Scene ${index}`,
      body: `Ledger for ${path}`,
    });
    const objectHash = hashCanonicalJson(document);
    objects.set(objectHash, {
      envelope: document.envelope,
      body: document.body,
    });
    operations.push({
      op: 'create' as const,
      entry: {
        documentId,
        revision: 1,
        path,
        objectHash,
        kind: 'lore' as const,
        authority: 'canon' as const,
        visibility: 'player-known' as const,
      },
    });
  }
  library = applyLibraryBatch(library, operations);
  const nodes = new Map(library.store);
  const roots = new Map([[rootHash, library.root]]);
  const reader = {
    async readManifest() {
      throw new Error('readManifest unsupported');
    },
    async readLibraryRoot(hash: string) {
      const root = roots.get(hash);
      if (!root) throw new Error('foreign root');
      return root;
    },
    async readLibraryNode(hash: string) {
      const node = nodes.get(hash);
      if (!node) throw new Error(`missing node ${hash}`);
      return node;
    },
    async readDocument(hash: string) {
      const value = objects.get(hash);
      if (!value) throw new Error(`missing object ${hash}`);
      return value;
    },
    async readSourcePassage() {
      throw new Error('not used');
    },
  };
  return { reader };
}

function scriptedTransport(
  wireSha256: string,
  body: string,
  calls: { count: number },
): PreparedWriterRoundTransport {
  return {
    preflight: () => ({ kind: 'ready', wireSha256 }),
    invoke: async () => {
      calls.count += 1;
      return {
        kind: 'delivered',
        serializedResponse: body,
        usage: realUsage,
        telemetry: realTelemetry,
        exactWireSha256: wireSha256,
      };
    },
  };
}

async function withDisposable(
  run: (ctx: {
    database: ReturnType<typeof createDatabase>;
    storage: LocalDocumentStore;
  }) => Promise<void>,
) {
  const runId = randomUUID();
  let provisioned;
  try {
    provisioned = await provisionDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
      applyFullMigrations: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? 'unknown');
    console.error(`NOT-RUN: disposable Postgres unavailable (${message})`);
    return;
  }
  const database = createDatabase(
    readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
    () => {},
  );
  const storageRoot = await mkdtemp(join(tmpdir(), 'wr11-t03-cas-'));
  const storage = new LocalDocumentStore(storageRoot);
  try {
    await run({ database, storage });
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

async function seedFundingStack(client: {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
}) {
  const ownerUserId = `user_${randomUUID()}`;
  const generationId = randomUUID();
  const ownerId = randomUUID();
  await client.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, 'WR11', $2, true, now(), now())`,
    [ownerUserId, `${ownerUserId}@example.test`],
  );
  await client.query(
    `INSERT INTO generation (id, owner_id, kind, status_revision, input, state)
     VALUES ($1, $2, 'writer-mission.v1', 0, '{}'::jsonb, 'pending')`,
    [generationId, ownerUserId],
  );
  const accountId = randomUUID();
  await client.query(
    `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
     VALUES ($1, 5000000, false, now())`,
    [accountId],
  );
  const runRowId = randomUUID();
  await client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1, $2, 5000000, 6, true)`,
    [runRowId, accountId],
  );
  await client.query(
    `INSERT INTO storyteller_operation (
       generation_id, account_id, run_id, owner_id, purpose, resources,
       max_model_rounds, max_input_tokens, max_generated_tokens, max_reasoning_tokens, max_microusd
     ) VALUES (
       $1, $2, $3, $4, 'writer-mission', '{}'::jsonb,
       6, 12288, 4096, 0, 250000
     )`,
    [generationId, accountId, runRowId, String(ownerId)],
  );
  return { generationId, ownerUserId };
}

async function seedOpenedStory(
  database: ReturnType<typeof createDatabase>,
  storage: LocalDocumentStore,
  ownerUserId: string,
) {
  const storyId = randomUUID();
  const initializeStory = createStoryInitialization(database, storage);
  await initializeStory({
    ownerId: ownerUserId,
    storyId,
    initial: {
      source: 'playable.opening.v1',
      premise: {
        title: 'WR11 continuation',
        premise: 'A dock near Seyda Neen.',
        storytellingDirection: 'Grounded.',
      },
      storyteller: profile,
      execution: offlineExecution,
      usagePolicy: null,
      items: [],
      content: {
        version: 1,
        title: 'Scene 1',
        paragraphs: ['Mist clings to the pier.'],
      },
      interaction: null,
    },
  });
  await database.db.transaction(async (tx) => {
    await initializeCampaign(tx, storyId, profile, {
      mechanics: false,
      locked: false,
      pace: { kind: 'instant' },
      time: {
        kind: 'elapsed',
        id: 'simulation-game-seconds',
        revision: 1,
        unit: {
          id: 'game-second',
          label: 'game-second',
          pluralLabel: 'game-seconds',
          gameSecondsPerUnit: 1,
        },
        epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
      },
      worldObligations: [],
      worlds: [],
    });
    await lockStoryById(tx, storyId);
  });
  const storyRow = (
    await database.db.$client.query(
      `SELECT revision, document_root_hash, document_root_revision
       FROM story WHERE id = $1`,
      [storyId],
    )
  ).rows[0] as {
    revision: number;
    document_root_hash: string;
    document_root_revision: number;
  };
  const checkpoint = (
    await database.db.$client.query(
      `SELECT checkpoint_hash FROM story_scene_checkpoint
       WHERE story_id = $1 AND scene_sequence = 1`,
      [storyId],
    )
  ).rows[0] as { checkpoint_hash: string };
  const basePassageId = (
    await database.db.$client.query(
      `SELECT id FROM story_passage WHERE story_id = $1 AND sequence = 1`,
      [storyId],
    )
  ).rows[0]?.id as string;
  return {
    storyId,
    baseSceneSequence: 1,
    basePassageId,
    baseCheckpointHash: checkpoint.checkpoint_hash,
    baseRootHash: storyRow.document_root_hash,
    baseRootRevision: storyRow.document_root_revision,
    baseNarrativeRevision: storyRow.revision,
    baseCampaignStateRevision: 1,
  };
}

function buildV3Capture(input: {
  generationId: string;
  ownerId: string;
  storyId: string;
  libraryRootHash: string;
  scenePins: Awaited<ReturnType<typeof seedOpenedStory>>;
  toolsAllowlist: string[];
  maxModelRounds?: number;
}): WriterMissionCapture {
  return writerMissionCaptureSchema.parse({
    version: 'writer-mission.v3',
    generationId: input.generationId,
    operationId: input.generationId,
    ownerId: input.ownerId,
    storyId: input.storyId,
    sceneScope: {
      kind: 'continuation',
      baseSceneSequence: input.scenePins.baseSceneSequence,
      basePassageId: input.scenePins.basePassageId,
      baseCheckpointHash: input.scenePins.baseCheckpointHash,
      baseRootHash: input.scenePins.baseRootHash,
      baseRootRevision: input.scenePins.baseRootRevision,
      baseNarrativeRevision: input.scenePins.baseNarrativeRevision,
      baseCampaignStateRevision: input.scenePins.baseCampaignStateRevision,
      controllingIntentOrReceiptId: randomUUID(),
      scenarioKind: 'narrative-only',
    },
    libraryRootHash: input.libraryRootHash,
    libraryRootRevision: 1,
    profileObjectHash: 'a'.repeat(64),
    skillObjectHashes: [],
    toolsAllowlist: input.toolsAllowlist,
    modelSelection: { provider: 'openrouter', model: 'scripted-offline' },
    budgets: {
      ...budgetSnapshot,
      maxModelRounds: input.maxModelRounds ?? budgetSnapshot.maxModelRounds,
    },
    capturedRequestHash: '9'.repeat(64),
  });
}

async function seedMission(
  database: ReturnType<typeof createDatabase>,
  input: {
    missionId: string;
    generationId: string;
    ownerUserId: string;
    storyId: string;
    libraryRootHash: string;
    capture: WriterMissionCapture;
  },
) {
  await database.db.$client.query(
    `UPDATE generation SET input = $2::jsonb WHERE id = $1`,
    [input.generationId, JSON.stringify({ writerMissionCapture: input.capture })],
  );
  await insertWriterMissionParentStep(
    database,
    {
      missionId: input.missionId,
      generationId: input.generationId,
      operationId: input.generationId,
      ownerId: input.ownerUserId,
      storyId: input.storyId,
      captureSha256: input.capture.capturedRequestHash,
      libraryRootHash: input.libraryRootHash,
      libraryRootRevision: 1,
      budgetSnapshot: input.capture.budgets,
    },
    {
      ordinal: 1,
      requestCasHash: '0'.repeat(64),
      revision: 1,
      state: 'captured',
    },
  );
}

async function latestParentOrdinal(
  database: ReturnType<typeof createDatabase>,
  missionId: string,
) {
  const row = (
    await database.db.$client.query(
      `SELECT ordinal::int AS ordinal
       FROM storyteller_writer_step
       WHERE mission_id = $1 AND context_id = $1 AND tool_call_id IS NULL
       ORDER BY ordinal DESC LIMIT 1`,
      [missionId],
    )
  ).rows[0] as { ordinal: number } | undefined;
  return row?.ordinal;
}

async function parentStepCount(
  database: ReturnType<typeof createDatabase>,
  missionId: string,
) {
  const row = (
    await database.db.$client.query(
      `SELECT count(*)::int AS count
       FROM storyteller_writer_step
       WHERE mission_id = $1 AND context_id = $1 AND tool_call_id IS NULL`,
      [missionId],
    )
  ).rows[0] as { count: number };
  return row.count;
}

function round1ToolBody() {
  return JSON.stringify({
    kind: 'tool-calls',
    calls: [
      {
        id: 't1',
        name: 'library.browse',
        args: { prefix: 'lore/', pageSize: 2 },
      },
    ],
  });
}

function researchDelegateBody() {
  return JSON.stringify({
    kind: 'tool-calls',
    calls: [
      {
        id: 't1',
        name: 'research.delegate',
        args: {
          parentToolCallId: 't1',
          questions: [{ question: 'Who owns the pier?', required: true }],
        },
      },
    ],
  });
}

test('WR11 T03: plan uses latest parent ordinal and maxModelRounds', async () => {
  await withDisposable(async ({ database, storage }) => {
    const stack = await seedFundingStack(database.db.$client);
    const scenePins = await seedOpenedStory(database, storage, stack.ownerUserId);
    const libraryRootHash = scenePins.baseRootHash;
    buildLibraryFixture(libraryRootHash);
    const missionId = randomUUID();
    const capture = buildV3Capture({
      generationId: stack.generationId,
      ownerId: stack.ownerUserId,
      storyId: scenePins.storyId,
      libraryRootHash,
      scenePins,
      toolsAllowlist: ['library.browse'],
    });
    await seedMission(database, {
      missionId,
      generationId: stack.generationId,
      ownerUserId: stack.ownerUserId,
      storyId: scenePins.storyId,
      libraryRootHash,
      capture,
    });
    const seam = createWriterRoundSeam(database, storage, {
      providerPolicy: labPolicy,
      capturePolicyMode,
    });
    const initialPlan = await seam.planRound(missionId);
    assert.ok('ordinal' in initialPlan);
    assert.equal(initialPlan.ordinal, 1);
    assert.equal(initialPlan.maxModelRounds, capture.budgets.maxModelRounds);

    await database.db.$client.query(
      `INSERT INTO storyteller_writer_step (
         mission_id, context_id, ordinal, revision, state, request_cas_hash
       ) VALUES ($1, $1, 7, 1, 'model-request-prepared', $2)`,
      [missionId, 'f'.repeat(64)],
    );
    const highOrdinalPlan = await seam.planRound(missionId);
    assert.deepEqual(highOrdinalPlan, {
      status: 'held',
      reason: 'max_model_rounds',
    });
  });
});

test('WR11 T03: library tool round finalizes needs-next-round idempotently', async () => {
  await withDisposable(async ({ database, storage }) => {
    const stack = await seedFundingStack(database.db.$client);
    const scenePins = await seedOpenedStory(database, storage, stack.ownerUserId);
    const libraryRootHash = scenePins.baseRootHash;
    const missionId = randomUUID();
    const capture = buildV3Capture({
      generationId: stack.generationId,
      ownerId: stack.ownerUserId,
      storyId: scenePins.storyId,
      libraryRootHash,
      scenePins,
      toolsAllowlist: ['library.browse'],
    });
    await seedMission(database, {
      missionId,
      generationId: stack.generationId,
      ownerUserId: stack.ownerUserId,
      storyId: scenePins.storyId,
      libraryRootHash,
      capture,
    });
    const prep = await prepareWriterMissionModelStep(database, storage, {
      missionId,
      ordinal: 1,
      expectedRevision: 1,
      capture,
    });
    const transportCalls = { count: 0 };
    const transport = scriptedTransport(
      prep.wireSha256,
      round1ToolBody(),
      transportCalls,
    );
    const attemptId = randomUUID();
    const delivered = await advanceDurableWriterMissionProviderStep(
      database,
      storage,
      {
        missionId,
        ordinal: 1,
        attemptId,
        expectedRevision: prep.revision,
        providerPolicy: labPolicy,
        expectedWireSha256: prep.wireSha256,
        reservedMicrousd: 25_000n,
      },
      transport,
    );
    assert.equal(delivered.status, 'delivered');

    const seam = createWriterRoundSeam(database, storage, {
      providerPolicy: labPolicy,
      capturePolicyMode,
    });
    const planned = await seam.planRound(missionId);
    assert.ok('ordinal' in planned);
    assert.equal(planned.ordinal, 1);

    const nextRequestHash = 'e'.repeat(64);
    await database.db.$client.query(
      `UPDATE storyteller_writer_step
       SET state = 'tools-applied'
       WHERE mission_id = $1 AND context_id = $1 AND ordinal = 1 AND tool_call_id IS NULL`,
      [missionId],
    );
    await database.db.$client.query(
      `INSERT INTO storyteller_writer_step (
         mission_id, context_id, ordinal, revision, state, request_cas_hash
       ) VALUES ($1, $1, 3, 1, 'model-request-prepared', $2)`,
      [missionId, nextRequestHash],
    );

    const firstFinalize = await finalizeSettledWriterSceneRound(database, storage, {
      missionId,
      policy: labPolicy,
      capturePolicyMode,
    });
    assert.equal(firstFinalize.status, 'needs-next-round');
    const nextOrdinal =
      firstFinalize.status === 'needs-next-round'
        ? firstFinalize.nextOrdinal
        : 0;
    const nextRevision =
      firstFinalize.status === 'needs-next-round'
        ? firstFinalize.nextRevision
        : 0;

    const staleOrdinalFinalize = await finalizeSettledWriterSceneRound(
      database,
      storage,
      {
        missionId,
        ordinal: 99,
        policy: labPolicy,
        capturePolicyMode,
      },
    );
    assert.deepEqual(staleOrdinalFinalize, {
      status: 'held',
      reason: 'revision_conflict',
    });

    const afterToolPlan = await seam.planRound(missionId);
    assert.ok('ordinal' in afterToolPlan);
    assert.equal(afterToolPlan.ordinal, nextOrdinal);
    assert.equal(afterToolPlan.expectedRevision, nextRevision);
    assert.equal(transportCalls.count, 1);

    const secondFinalize = await finalizeSettledWriterSceneRound(database, storage, {
      missionId,
      policy: labPolicy,
      capturePolicyMode,
    });
    assert.deepEqual(secondFinalize, {
      status: 'needs-next-round',
      nextOrdinal,
      nextRevision,
    });
    assert.equal(await parentStepCount(database, missionId), 2);
  });
});

test('WR11 T03: research.delegate holds without preparing next parent step', async () => {
  await withDisposable(async ({ database, storage }) => {
    const stack = await seedFundingStack(database.db.$client);
    const scenePins = await seedOpenedStory(database, storage, stack.ownerUserId);
    const libraryRootHash = scenePins.baseRootHash;
    buildLibraryFixture(libraryRootHash);
    const missionId = randomUUID();
    const capture = buildV3Capture({
      generationId: stack.generationId,
      ownerId: stack.ownerUserId,
      storyId: scenePins.storyId,
      libraryRootHash,
      scenePins,
      toolsAllowlist: ['research.delegate'],
    });
    await seedMission(database, {
      missionId,
      generationId: stack.generationId,
      ownerUserId: stack.ownerUserId,
      storyId: scenePins.storyId,
      libraryRootHash,
      capture,
    });
    const prep = await prepareWriterMissionModelStep(database, storage, {
      missionId,
      ordinal: 1,
      expectedRevision: 1,
      capture,
    });
    const attemptId = randomUUID();
    await advanceDurableWriterMissionProviderStep(
      database,
      storage,
      {
        missionId,
        ordinal: 1,
        attemptId,
        expectedRevision: prep.revision,
        providerPolicy: labPolicy,
        expectedWireSha256: prep.wireSha256,
        reservedMicrousd: 25_000n,
      },
      scriptedTransport(prep.wireSha256, researchDelegateBody(), { count: 0 }),
    );
    const result = await finalizeSettledWriterSceneRound(database, storage, {
      missionId,
      policy: labPolicy,
      capturePolicyMode,
    });
    assert.deepEqual(result, {
      status: 'held',
      reason: 'research_delegate_unsupported',
    });
    assert.equal(await parentStepCount(database, missionId), 1);
    assert.equal(await latestParentOrdinal(database, missionId), 1);
  });
});
