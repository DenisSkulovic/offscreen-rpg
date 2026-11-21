/**
 * WR09B T03: durable writer round recovery — library tools, replay, publication.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
import { StoryError } from '@offscreen/story-engine/stories/errors';
import { createStoryInitialization } from '@offscreen/story-engine/stories/initialization';
import { lockStoryById } from '@offscreen/story-engine/stories/persistence';
import {
  advanceDurableWriterMissionProviderStep,
  hashWriterMissionSerializedResponse,
  insertWriterMissionParentStep,
  prepareWriterMissionModelStep,
  publishAcceptedWriterScene,
  readDurableWriterMissionResponse,
  runDurableWriterMissionModelRound,
} from '@offscreen/story-engine/storyteller';
import type {
  PreparedWriterRoundTransport,
  WriterRoundModelPolicy,
} from '@offscreen/storyteller/providers/writer-round-transport';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import {
  offlineExecution,
  writerMissionCaptureSchema,
  type WriterMissionCapture,
} from '@offscreen/storyteller/tasks';

const WR09B_MODEL = 'anthropic/claude-3.5-sonnet';

const providerPolicy: WriterRoundModelPolicy = {
  model: WR09B_MODEL,
  provider: 'Anthropic',
  priceVersion: 'wr09b-int.v1',
  inputMicrousdPerMillion: '3000000',
  outputMicrousdPerMillion: '15000000',
  maxInputTokens: 8192,
  maxOutputTokens: 4096,
  maxModelRounds: 6,
  maxMicrousd: 250_000n,
  timeoutMs: 30_000,
};

const budgetSnapshot = {
  maxModelRounds: 6,
  maxInputTokens: 12_288,
  maxGeneratedTokens: 4_096,
  maxMicrousd: '250000',
  deadlineMs: 120_000,
};

const realUsage = {
  reportedCostMicrousd: 1234n,
  promptTokens: 80,
  completionTokens: 40,
  totalTokens: 120,
  reasoningTokens: null,
  cachedTokens: null,
  cacheWriteTokens: null,
};

const realTelemetry = {
  durationMs: 8,
  httpStatus: 200,
  providerId: 'gen_wr09b',
  reportedModel: providerPolicy.model,
  finishReason: 'stop',
};

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

function buildLibraryFixture(
  rootHash: string,
  options: { includePinnedRoot?: boolean } = {},
) {
  const includePinnedRoot = options.includePinnedRoot ?? true;
  const staleRootHash = 'b'.repeat(64);
  let library = createEmptyLibraryIndex();
  const objects = new Map<
    string,
    {
      envelope: {
        documentId: string;
        revision: number;
        kind: string;
        authority: string;
        visibility: string;
      };
      body: string;
    }
  >();
  const operations = [];
  let firstObjectHash = '';
  for (let index = 1; index <= 4; index += 1) {
    const documentId = randomUUID();
    const path = `lore/scene-${String(index).padStart(3, '0')}.md`;
    const document = canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId,
        schemaVersion: 1,
        revision: 1,
        kind: 'lore',
        authority: 'canon',
        visibility: 'player-known',
        sources: [],
      },
      title: `Scene ${index}`,
      body: `Ledger for ${path}`,
    });
    const objectHash = hashCanonicalJson(document);
    if (index === 1) firstObjectHash = objectHash;
    objects.set(objectHash, {
      envelope: {
        documentId: document.envelope.documentId,
        revision: document.envelope.revision,
        kind: document.envelope.kind,
        authority: document.envelope.authority,
        visibility: document.envelope.visibility,
      },
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
  const roots = new Map([[staleRootHash, library.root]]);
  if (includePinnedRoot) {
    roots.set(rootHash, library.root);
  }
  const reader = {
    async readManifest() {
      throw new Error('readManifest unused');
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
  type RoundReader = Parameters<
    typeof runDurableWriterMissionModelRound
  >[1]['reader'];
  return {
    rootHash,
    reader: reader as RoundReader,
    firstObjectHash,
    staleRootHash,
  };
}

function scriptedTransport(
  wireSha256: string,
  invokeOnce: () => Promise<{
    kind: 'delivered';
    serializedResponse: string;
    usage: typeof realUsage;
    telemetry: typeof realTelemetry;
    exactWireSha256: string;
  }>,
  calls: { count: number },
): PreparedWriterRoundTransport {
  return {
    preflight: () => ({ kind: 'ready', wireSha256 }),
    invoke: async () => {
      calls.count += 1;
      return invokeOnce();
    },
  };
}

function multiBodyTransport(
  wireSha256: string,
  bodies: string[],
  calls: { count: number },
): PreparedWriterRoundTransport {
  return scriptedTransport(
    wireSha256,
    async () => {
      const body =
        bodies[Math.min(calls.count - 1, bodies.length - 1)] ?? bodies.at(-1)!;
      return {
        kind: 'delivered',
        serializedResponse: body,
        usage: realUsage,
        telemetry: realTelemetry,
        exactWireSha256: wireSha256,
      };
    },
    calls,
  );
}

async function withDisposable(
  prefix: string,
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
    console.error(
      `NOT-RUN: disposable Postgres unavailable (${message}). Is Docker/postgres up?`,
    );
    return { available: false as const };
  }
  const database = createDatabase(
    readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
    () => {},
  );
  const storageRoot = await mkdtemp(join(tmpdir(), `${prefix}-cas-`));
  const storage = new LocalDocumentStore(storageRoot);
  try {
    await run({ database, storage });
    return { available: true as const };
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

async function seedFundingStack(
  client: {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  },
  ownerUserId: string,
) {
  const generationId = randomUUID();
  const ownerId = randomUUID();
  await client.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, 'WR09B', $2, true, now(), now())`,
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
  return { generationId, ownerId, accountId, runRowId, ownerUserId };
}

async function createWriterGeneration(
  client: {
    query: (sql: string, params?: unknown[]) => Promise<unknown>;
  },
  ownerUserId: string,
) {
  const generationId = randomUUID();
  const accountId = randomUUID();
  const runRowId = randomUUID();
  await client.query(
    `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
     VALUES ($1, 5000000, false, now())`,
    [accountId],
  );
  await client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1, $2, 5000000, 6, true)`,
    [runRowId, accountId],
  );
  await client.query(
    `INSERT INTO generation (id, owner_id, kind, status_revision, input, state)
     VALUES ($1, $2, 'writer-mission.v1', 0, '{}'::jsonb, 'pending')`,
    [generationId, ownerUserId],
  );
  await client.query(
    `INSERT INTO storyteller_operation (
       generation_id, account_id, run_id, owner_id, purpose, resources,
       max_model_rounds, max_input_tokens, max_generated_tokens, max_reasoning_tokens, max_microusd
     ) VALUES (
       $1, $2, $3, $4, 'writer-mission', '{}'::jsonb,
       6, 12288, 4096, 0, 5000000
     )`,
    [generationId, accountId, runRowId, ownerUserId],
  );
  return generationId;
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
        title: 'WR09B continuation',
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
  const client = database.db.$client;
  const storyRow = (
    await client.query(
      `SELECT revision, document_root_hash, document_root_revision
       FROM story WHERE id = $1`,
      [storyId],
    )
  ).rows[0] as
    | {
        revision: number;
        document_root_hash: string;
        document_root_revision: number;
      }
    | undefined;
  assert.ok(storyRow);
  const checkpoint = (
    await client.query(
      `SELECT checkpoint_hash FROM story_scene_checkpoint
       WHERE story_id = $1 AND scene_sequence = 1`,
      [storyId],
    )
  ).rows[0] as { checkpoint_hash: string } | undefined;
  assert.ok(checkpoint);
  const basePassageId = (
    await client.query(
      `SELECT id FROM story_passage WHERE story_id = $1 AND sequence = 1`,
      [storyId],
    )
  ).rows[0]?.id as string | undefined;
  assert.ok(basePassageId);
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
    modelSelection: { provider: 'openrouter', model: WR09B_MODEL },
    budgets: budgetSnapshot,
    capturedRequestHash: '9'.repeat(64),
  });
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

function round2FinalBody(rootHash: string, objectHash: string) {
  return JSON.stringify({
    kind: 'final',
    proposal: {
      version: 3,
      summary: 'Scene 2 after the tool round.',
      stagedObjectHashes: [],
      sourceEvidence: [
        {
          rootHash,
          objectHash,
          section: 'lore/scene-001',
          assertedAsFact: false,
        },
      ],
      scene: {
        content: {
          version: 1,
          title: 'Scene 2',
          paragraphs: ['The browse returned lore; the pier remembers.'],
        },
        interaction: null,
        authoredIntents: [],
      },
      documentChanges: [],
    },
  });
}

async function parentModelStepAtOrdinal(
  database: ReturnType<typeof createDatabase>,
  missionId: string,
  ordinal: number,
) {
  const result = await database.db.$client.query(
    `SELECT ordinal, revision, state, request_cas_hash
     FROM storyteller_writer_step
     WHERE mission_id = $1 AND context_id = $1 AND ordinal = $2 AND tool_call_id IS NULL
     LIMIT 1`,
    [missionId, ordinal],
  );
  return result.rows[0] as
    | {
        ordinal: number;
        revision: number;
        state: string;
        request_cas_hash: string;
      }
    | undefined;
}

async function latestParentModelStep(
  database: ReturnType<typeof createDatabase>,
  missionId: string,
) {
  const result = await database.db.$client.query(
    `SELECT ordinal, revision, state, request_cas_hash
     FROM storyteller_writer_step
     WHERE mission_id = $1 AND context_id = $1 AND tool_call_id IS NULL
     ORDER BY ordinal DESC
     LIMIT 1`,
    [missionId],
  );
  return result.rows[0] as
    | {
        ordinal: number;
        revision: number;
        state: string;
        request_cas_hash: string;
      }
    | undefined;
}

async function toolReceiptCount(
  database: ReturnType<typeof createDatabase>,
  missionId: string,
) {
  const result = await database.db.$client.query(
    `SELECT count(*)::int AS count FROM storyteller_writer_step
     WHERE mission_id = $1 AND tool_call_id IS NOT NULL`,
    [missionId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function passageCount(
  database: ReturnType<typeof createDatabase>,
  storyId: string,
) {
  const result = await database.db.$client.query(
    `SELECT count(*)::int AS count FROM story_passage WHERE story_id = $1`,
    [storyId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

test('WR09B: offline joined recovery publishes once', async () => {
  const gate = await withDisposable(
    'wr09b-joined',
    async ({ database, storage }) => {
      const ownerUserId = `user_${randomUUID()}`;
      const stack = await seedFundingStack(database.db.$client, ownerUserId);
      const scenePins = await seedOpenedStory(database, storage, ownerUserId);
      const libraryRootHash = scenePins.baseRootHash;
      const library = buildLibraryFixture(libraryRootHash);
      const missionId = randomUUID();
      const capture = buildV3Capture({
        generationId: stack.generationId,
        ownerId: ownerUserId,
        storyId: scenePins.storyId,
        libraryRootHash,
        scenePins,
        toolsAllowlist: ['library.browse'],
      });
      await database.db.$client.query(
        `UPDATE generation SET input = $2::jsonb WHERE id = $1`,
        [stack.generationId, JSON.stringify({ writerMissionCapture: capture })],
      );
      await insertWriterMissionParentStep(
        database,
        {
          missionId,
          generationId: stack.generationId,
          operationId: stack.generationId,
          ownerId: ownerUserId,
          storyId: scenePins.storyId,
          captureSha256: capture.capturedRequestHash,
          libraryRootHash,
          libraryRootRevision: 1,
          budgetSnapshot,
        },
        {
          ordinal: 1,
          requestCasHash: '0'.repeat(64),
          revision: 1,
          state: 'captured',
        },
      );

      const access = { privateDocuments: false };
      const attempt1 = randomUUID();
      const prep1 = await prepareWriterMissionModelStep(database, storage, {
        missionId,
        ordinal: 1,
        expectedRevision: 1,
        capture,
      });
      const transportCalls = { count: 0 };
      const round1Transport = multiBodyTransport(
        prep1.wireSha256,
        [round1ToolBody()],
        transportCalls,
      );

      const delivered = await advanceDurableWriterMissionProviderStep(
        database,
        storage,
        {
          missionId,
          ordinal: 1,
          attemptId: attempt1,
          expectedRevision: prep1.revision,
          providerPolicy,
          expectedWireSha256: prep1.wireSha256,
          reservedMicrousd: 50_000n,
        },
        round1Transport,
      );
      assert.equal(delivered.status, 'delivered');
      assert.equal(transportCalls.count, 1);

      const storedBody = await readDurableWriterMissionResponse(
        database,
        storage,
        {
          missionId,
          ordinal: 1,
          attemptId: attempt1,
          requestSha256: prep1.wireSha256,
        },
      );
      assert.equal(storedBody, round1ToolBody());
      assert.equal(
        hashWriterMissionSerializedResponse(storedBody),
        delivered.resultCasHash,
      );

      const stepSettled = await parentModelStepAtOrdinal(
        database,
        missionId,
        1,
      );
      assert.equal(stepSettled?.state, 'result-settled');

      const round1Resume = await runDurableWriterMissionModelRound(database, {
        missionId,
        ordinal: 1,
        attemptId: attempt1,
        expectedRevision: Number(stepSettled!.revision),
        capture,
        access,
        reader: library.reader,
        storage,
        policy: providerPolicy,
        expectedWireSha256: prep1.wireSha256,
        transport: round1Transport,
      });
      assert.equal(round1Resume.status, 'tool-round-complete');
      assert.equal(transportCalls.count, 1);
      assert.equal(await toolReceiptCount(database, missionId), 1);

      const step2 = await latestParentModelStep(database, missionId);
      assert.equal(step2?.ordinal, 3);
      assert.equal(step2?.state, 'model-request-prepared');

      const round1Parent = await parentModelStepAtOrdinal(
        database,
        missionId,
        1,
      );
      const round1Replay = await runDurableWriterMissionModelRound(database, {
        missionId,
        ordinal: 1,
        attemptId: attempt1,
        expectedRevision: Number(round1Parent!.revision),
        capture,
        access,
        reader: library.reader,
        storage,
        policy: providerPolicy,
        expectedWireSha256: prep1.wireSha256,
        transport: round1Transport,
      });
      assert.equal(round1Replay.status, 'replayed');
      assert.equal(transportCalls.count, 1);
      assert.equal(await toolReceiptCount(database, missionId), 1);

      const attempt2 = randomUUID();
      const prep2 = await prepareWriterMissionModelStep(database, storage, {
        missionId,
        ordinal: step2!.ordinal,
        expectedRevision: step2!.revision,
        capture,
      });
      const round2Transport = multiBodyTransport(
        prep2.wireSha256,
        [round2FinalBody(libraryRootHash, library.firstObjectHash)],
        transportCalls,
      );
      const round2 = await runDurableWriterMissionModelRound(database, {
        missionId,
        ordinal: step2!.ordinal,
        attemptId: attempt2,
        expectedRevision: prep2.revision,
        capture,
        access,
        reader: library.reader,
        storage,
        policy: providerPolicy,
        expectedWireSha256: prep2.wireSha256,
        transport: round2Transport,
      });
      assert.equal(round2.status, 'proposal-ready');
      assert.equal(transportCalls.count, 2);
      assert.equal(round2.proposal?.kind, 'final');

      const proposal =
        round2.proposal?.kind === 'final' ? round2.proposal.proposal : null;
      assert.ok(proposal && proposal.version === 3);

      const firstPublish = await database.db.transaction(async (tx) =>
        publishAcceptedWriterScene(tx, storage, {
          missionId,
          proposal,
        }),
      );
      assert.equal(firstPublish.replayed, false);
      assert.equal(await passageCount(database, scenePins.storyId), 2);

      const duplicatePublish = await database.db.transaction(async (tx) =>
        publishAcceptedWriterScene(tx, storage, {
          missionId,
          proposal,
        }),
      );
      assert.equal(duplicatePublish.replayed, true);
      assert.equal(duplicatePublish.passageId, firstPublish.passageId);
      assert.equal(await passageCount(database, scenePins.storyId), 2);
    },
  );
  if (!gate?.available) return;
});

test('WR09B negatives: stale root, forged source, ungranted tool', async () => {
  const gate = await withDisposable(
    'wr09b-neg-hold',
    async ({ database, storage }) => {
      const ownerUserId = `user_${randomUUID()}`;
      const stack = await seedFundingStack(database.db.$client, ownerUserId);
      const scenePins = await seedOpenedStory(database, storage, ownerUserId);
      const libraryRootHash = scenePins.baseRootHash;
      const library = buildLibraryFixture(libraryRootHash);
      const access = { privateDocuments: false };

      async function seedMission(
        capture: WriterMissionCapture,
        missionId = randomUUID(),
      ) {
        const generationId = await createWriterGeneration(
          database.db.$client,
          ownerUserId,
        );
        await database.db.$client.query(
          `UPDATE generation SET input = $2::jsonb WHERE id = $1`,
          [generationId, JSON.stringify({ writerMissionCapture: capture })],
        );
        await insertWriterMissionParentStep(
          database,
          {
            missionId,
            generationId,
            operationId: generationId,
            ownerId: ownerUserId,
            storyId: scenePins.storyId,
            captureSha256: capture.capturedRequestHash,
            libraryRootHash: capture.libraryRootHash,
            libraryRootRevision: 1,
            budgetSnapshot,
          },
          {
            ordinal: 1,
            requestCasHash: '0'.repeat(64),
            revision: 1,
            state: 'captured',
          },
        );
        return missionId;
      }

      const staleCapture = buildV3Capture({
        generationId: stack.generationId,
        ownerId: ownerUserId,
        storyId: scenePins.storyId,
        libraryRootHash: scenePins.baseRootHash,
        scenePins,
        toolsAllowlist: ['library.browse'],
      });
      const staleReader = buildLibraryFixture(scenePins.baseRootHash, {
        includePinnedRoot: false,
      });
      const staleMission = await seedMission(staleCapture);
      const prepStale = await prepareWriterMissionModelStep(database, storage, {
        missionId: staleMission,
        ordinal: 1,
        expectedRevision: 1,
        capture: staleCapture,
      });
      const staleCalls = { count: 0 };
      const staleDelivered = await runDurableWriterMissionModelRound(database, {
        missionId: staleMission,
        ordinal: 1,
        attemptId: randomUUID(),
        expectedRevision: prepStale.revision,
        capture: staleCapture,
        access,
        reader: staleReader.reader,
        storage,
        policy: providerPolicy,
        expectedWireSha256: prepStale.wireSha256,
        transport: multiBodyTransport(
          prepStale.wireSha256,
          [round1ToolBody()],
          staleCalls,
        ),
      });
      assert.equal(staleDelivered.status, 'held');
      assert.match(
        staleDelivered.reason ?? '',
        /stale-root|tool_execution_failed|foreign root/,
      );
      assert.equal(staleCalls.count, 1);

      const forgedCapture = buildV3Capture({
        generationId: stack.generationId,
        ownerId: ownerUserId,
        storyId: scenePins.storyId,
        libraryRootHash: scenePins.baseRootHash,
        scenePins,
        toolsAllowlist: ['library.browse'],
      });
      const forgedMission = await seedMission(forgedCapture);
      const prepForged = await prepareWriterMissionModelStep(
        database,
        storage,
        {
          missionId: forgedMission,
          ordinal: 1,
          expectedRevision: 1,
          capture: forgedCapture,
        },
      );
      const forgedCalls = { count: 0 };
      const forgedBody = JSON.stringify({
        kind: 'final',
        proposal: {
          version: 3,
          summary: 'Forged continuation probe.',
          stagedObjectHashes: [],
          sourceEvidence: [
            {
              rootHash: 'f'.repeat(64),
              objectHash: library.firstObjectHash,
              section: 'forged',
              assertedAsFact: true,
            },
          ],
          scene: {
            content: {
              version: 1,
              title: 'Forged',
              paragraphs: ['This must not publish.'],
            },
            interaction: null,
            authoredIntents: [],
          },
          documentChanges: [],
        },
      });
      const forgedRound = await runDurableWriterMissionModelRound(database, {
        missionId: forgedMission,
        ordinal: 1,
        attemptId: randomUUID(),
        expectedRevision: prepForged.revision,
        capture: forgedCapture,
        access,
        reader: library.reader,
        storage,
        policy: providerPolicy,
        expectedWireSha256: prepForged.wireSha256,
        transport: multiBodyTransport(
          prepForged.wireSha256,
          [forgedBody],
          forgedCalls,
        ),
      });
      assert.equal(forgedRound.status, 'proposal-ready');
      assert.equal(forgedCalls.count, 1);
      const forgedProposal =
        forgedRound.status === 'proposal-ready' &&
        forgedRound.proposal?.kind === 'final'
          ? forgedRound.proposal.proposal
          : null;
      assert.ok(forgedProposal);
      await assert.rejects(
        database.db.transaction((tx) =>
          publishAcceptedWriterScene(tx, storage, {
            missionId: forgedMission,
            proposal: forgedProposal,
          }),
        ),
        (error: unknown) =>
          error instanceof StoryError &&
          error.code === 'conflict' &&
          error.reason === 'writer_scene_source_forged',
      );
      assert.equal(await passageCount(database, scenePins.storyId), 1);

      const ungrantedCapture = buildV3Capture({
        generationId: stack.generationId,
        ownerId: ownerUserId,
        storyId: scenePins.storyId,
        libraryRootHash,
        scenePins,
        toolsAllowlist: ['library.browse'],
      });
      const ungrantedMission = await seedMission(ungrantedCapture);
      const prepUngranted = await prepareWriterMissionModelStep(
        database,
        storage,
        {
          missionId: ungrantedMission,
          ordinal: 1,
          expectedRevision: 1,
          capture: ungrantedCapture,
        },
      );
      const ungrantedBody = JSON.stringify({
        kind: 'tool-calls',
        calls: [
          {
            id: 't2',
            name: 'workdesk.stage',
            args: {
              expectedStageRevision: 0,
              path: 'private/draft.md',
              body: 'Nope.',
              op: 'create',
            },
          },
        ],
      });
      const ungrantedCalls = { count: 0 };
      const ungranted = await runDurableWriterMissionModelRound(database, {
        missionId: ungrantedMission,
        ordinal: 1,
        attemptId: randomUUID(),
        expectedRevision: prepUngranted.revision,
        capture: ungrantedCapture,
        access,
        reader: library.reader,
        storage,
        policy: providerPolicy,
        expectedWireSha256: prepUngranted.wireSha256,
        transport: multiBodyTransport(
          prepUngranted.wireSha256,
          [ungrantedBody],
          ungrantedCalls,
        ),
      });
      assert.equal(ungranted.status, 'held');
      assert.equal(ungranted.reason, 'ungranted_tool');
      assert.equal(ungrantedCalls.count, 1);
    },
  );
  if (!gate?.available) return;
});

test('WR09B negatives: uncertain transport, sent failure, mismatched tool args', async () => {
  const gate = await withDisposable(
    'wr09b-neg-custody',
    async ({ database, storage }) => {
      const ownerUserId = `user_${randomUUID()}`;
      const stack = await seedFundingStack(database.db.$client, ownerUserId);
      const scenePins = await seedOpenedStory(database, storage, ownerUserId);
      const libraryRootHash = scenePins.baseRootHash;
      const library = buildLibraryFixture(libraryRootHash);
      const access = { privateDocuments: false };

      async function seedCustodyMission(missionId: string) {
        const generationId = await createWriterGeneration(
          database.db.$client,
          ownerUserId,
        );
        const capture = buildV3Capture({
          generationId,
          ownerId: ownerUserId,
          storyId: scenePins.storyId,
          libraryRootHash: scenePins.baseRootHash,
          scenePins,
          toolsAllowlist: ['library.browse'],
        });
        await insertWriterMissionParentStep(
          database,
          {
            missionId,
            generationId,
            operationId: generationId,
            ownerId: ownerUserId,
            storyId: scenePins.storyId,
            captureSha256: capture.capturedRequestHash,
            libraryRootHash: scenePins.baseRootHash,
            libraryRootRevision: 1,
            budgetSnapshot,
          },
          {
            ordinal: 1,
            requestCasHash: '0'.repeat(64),
            revision: 1,
            state: 'captured',
          },
        );
        return capture;
      }

      const mismatchMission = randomUUID();
      const captureMismatch = await seedCustodyMission(mismatchMission);
      const prepMismatch = await prepareWriterMissionModelStep(
        database,
        storage,
        {
          missionId: mismatchMission,
          ordinal: 1,
          expectedRevision: 1,
          capture: captureMismatch,
        },
      );
      const mismatchAttempt = randomUUID();
      const mismatchCalls = { count: 0 };
      const mismatchDelivered = await advanceDurableWriterMissionProviderStep(
        database,
        storage,
        {
          missionId: mismatchMission,
          ordinal: 1,
          attemptId: mismatchAttempt,
          expectedRevision: prepMismatch.revision,
          providerPolicy,
          expectedWireSha256: prepMismatch.wireSha256,
          reservedMicrousd: 50_000n,
        },
        multiBodyTransport(
          prepMismatch.wireSha256,
          [round1ToolBody()],
          mismatchCalls,
        ),
      );
      assert.equal(mismatchDelivered.status, 'delivered');
      assert.equal(mismatchCalls.count, 1);
      const forgedReceipt = await database.db.$client.query(
        `INSERT INTO storyteller_writer_step (
         mission_id, context_id, ordinal, tool_call_id, request_cas_hash, result_cas_hash, revision, state
       ) VALUES ($1, $1, 2, 't1', $2, $3, 1, 'tools-applied')
       RETURNING ordinal`,
        [mismatchMission, 'e'.repeat(64), 'f'.repeat(64)],
      );
      assert.equal(forgedReceipt.rowCount, 1);
      const mismatchParent = await parentModelStepAtOrdinal(
        database,
        mismatchMission,
        1,
      );
      const mismatchResume = await runDurableWriterMissionModelRound(database, {
        missionId: mismatchMission,
        ordinal: 1,
        attemptId: mismatchAttempt,
        expectedRevision: Number(mismatchParent!.revision),
        capture: captureMismatch,
        access,
        reader: library.reader,
        storage,
        policy: providerPolicy,
        expectedWireSha256: prepMismatch.wireSha256,
        transport: multiBodyTransport(
          prepMismatch.wireSha256,
          [round1ToolBody()],
          mismatchCalls,
        ),
      });
      assert.equal(mismatchResume.status, 'held');
      assert.equal(mismatchResume.reason, 'tool_call_replay_mismatch');
      assert.equal(mismatchCalls.count, 1);
      assert.ok((await toolReceiptCount(database, mismatchMission)) >= 1);

      const sentMission = randomUUID();
      const captureSent = await seedCustodyMission(sentMission);
      const prepSent = await prepareWriterMissionModelStep(database, storage, {
        missionId: sentMission,
        ordinal: 1,
        expectedRevision: 1,
        capture: captureSent,
      });
      const sentCalls = { count: 0 };
      const sentTransport: PreparedWriterRoundTransport = {
        preflight: () => ({ kind: 'ready', wireSha256: prepSent.wireSha256 }),
        invoke: async () => {
          sentCalls.count += 1;
          return {
            kind: 'failed',
            failureCode: 'provider_refusal',
            sent: true,
            usage: realUsage,
            telemetry: { ...realTelemetry, httpStatus: 503 },
            exactWireSha256: prepSent.wireSha256,
          };
        },
      };
      const sentRound = await runDurableWriterMissionModelRound(database, {
        missionId: sentMission,
        ordinal: 1,
        attemptId: randomUUID(),
        expectedRevision: prepSent.revision,
        capture: captureSent,
        access,
        reader: library.reader,
        storage,
        policy: providerPolicy,
        expectedWireSha256: prepSent.wireSha256,
        transport: sentTransport,
      });
      assert.equal(sentRound.status, 'held');
      assert.match(sentRound.reason ?? '', /provider_refusal|failed/);
      assert.equal(sentCalls.count, 1);
      const sentStep = await parentModelStepAtOrdinal(database, sentMission, 1);
      assert.equal(sentStep?.state, 'failed');

      const uncertainMission = randomUUID();
      const captureUncertain = await seedCustodyMission(uncertainMission);
      const prepUncertain = await prepareWriterMissionModelStep(
        database,
        storage,
        {
          missionId: uncertainMission,
          ordinal: 1,
          expectedRevision: 1,
          capture: captureUncertain,
        },
      );
      const uncertainCalls = { count: 0 };
      const uncertainTransport: PreparedWriterRoundTransport = {
        preflight: () => ({
          kind: 'ready',
          wireSha256: prepUncertain.wireSha256,
        }),
        invoke: async () => {
          uncertainCalls.count += 1;
          return {
            kind: 'unknown',
            telemetry: realTelemetry,
            exactWireSha256: prepUncertain.wireSha256,
          };
        },
      };
      const uncertain = await runDurableWriterMissionModelRound(database, {
        missionId: uncertainMission,
        ordinal: 1,
        attemptId: randomUUID(),
        expectedRevision: prepUncertain.revision,
        capture: captureUncertain,
        access,
        reader: library.reader,
        storage,
        policy: providerPolicy,
        expectedWireSha256: prepUncertain.wireSha256,
        transport: uncertainTransport,
      });
      assert.equal(uncertain.status, 'uncertain');
      assert.equal(uncertainCalls.count, 1);
      const retryUncertain = await runDurableWriterMissionModelRound(database, {
        missionId: uncertainMission,
        ordinal: 1,
        attemptId: randomUUID(),
        expectedRevision: (await latestParentModelStep(
          database,
          uncertainMission,
        ))!.revision,
        capture: captureUncertain,
        access,
        reader: library.reader,
        storage,
        policy: providerPolicy,
        expectedWireSha256: prepUncertain.wireSha256,
        transport: uncertainTransport,
      });
      assert.equal(retryUncertain.status, 'uncertain');
      assert.equal(uncertainCalls.count, 1);
    },
  );
  if (!gate?.available) return;
});

function persistedWriterRoundPolicy(policy: WriterRoundModelPolicy) {
  return {
    version: 'writer-round.v1',
    route: 'writer-round.v1',
    model: policy.model,
    provider: policy.provider,
    priceVersion: policy.priceVersion,
    outputProtocol: 'native-json-schema',
    responseTransport: 'buffered-json',
    inputMicrousdPerMillion: policy.inputMicrousdPerMillion,
    outputMicrousdPerMillion: policy.outputMicrousdPerMillion,
    maxInputTokens: policy.maxInputTokens,
    maxOutputTokens: policy.maxOutputTokens,
    timeoutMs: policy.timeoutMs,
  };
}

async function fundingReservedMicrousd(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  accountId: string,
) {
  const result = (await client.query(
    `SELECT reserved_microusd FROM storyteller_funding WHERE id = $1`,
    [accountId],
  )) as { rows: Array<{ reserved_microusd: string }> };
  return BigInt(result.rows[0]?.reserved_microusd ?? 0);
}

test('WR09B negatives: attempt policy pin and settled replay guard', async () => {
  const gate = await withDisposable(
    'wr09b-policy-pin',
    async ({ database, storage }) => {
      const ownerUserId = `user_${randomUUID()}`;
      const stack = await seedFundingStack(database.db.$client, ownerUserId);
      const scenePins = await seedOpenedStory(database, storage, ownerUserId);
      const libraryRootHash = scenePins.baseRootHash;
      const library = buildLibraryFixture(libraryRootHash);

      async function seedPreparedMission() {
        const missionId = randomUUID();
        const generationId = await createWriterGeneration(
          database.db.$client,
          ownerUserId,
        );
        const capture = buildV3Capture({
          generationId,
          ownerId: ownerUserId,
          storyId: scenePins.storyId,
          libraryRootHash,
          scenePins,
          toolsAllowlist: ['library.browse'],
        });
        await database.db.$client.query(
          `UPDATE generation SET input = $2::jsonb WHERE id = $1`,
          [generationId, JSON.stringify({ writerMissionCapture: capture })],
        );
        await insertWriterMissionParentStep(
          database,
          {
            missionId,
            generationId,
            operationId: generationId,
            ownerId: ownerUserId,
            storyId: scenePins.storyId,
            captureSha256: capture.capturedRequestHash,
            libraryRootHash,
            libraryRootRevision: 1,
            budgetSnapshot,
          },
          {
            ordinal: 1,
            requestCasHash: '0'.repeat(64),
            revision: 1,
            state: 'captured',
          },
        );
        const prep = await prepareWriterMissionModelStep(database, storage, {
          missionId,
          ordinal: 1,
          expectedRevision: 1,
          capture,
        });
        const opRow = (
          await database.db.$client.query(
            `SELECT account_id, run_id FROM storyteller_operation WHERE generation_id = $1`,
            [generationId],
          )
        ).rows[0] as { account_id: string; run_id: string };
        return {
          missionId,
          capture,
          prep,
          generationId,
          accountId: opRow.account_id,
          runRowId: opRow.run_id,
        };
      }

      async function insertReservedAttempt(
        attemptId: string,
        policy: WriterRoundModelPolicy,
        prep: { wireSha256: string },
        funding: { generationId: string; accountId: string; runRowId: string },
        reservedMicrousd = 50_000n,
      ) {
        await database.db.$client.query(
          `INSERT INTO storyteller_attempt (
            id, generation_id, account_id, run_id, owner_id, story_id, purpose,
            storyteller_profile_id, storyteller_profile_revision, task_input_version,
            prompt_version, recipe_version, resource_policy_version,
            requested_model, requested_provider, price_version, attribution,
            state, reserved_microusd, reserved_input_tokens, reserved_generated_tokens,
            reserved_reasoning_tokens, estimated_microusd, estimated_input_tokens,
            estimation_method, reconciliation, request_bytes, policy
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'writer-mission.v1',
            'writer-mission.v1', 1, 1,
            'writer-mission.v1', 'writer-mission.v1', 'writer-mission.v1',
            $7, $8, $9,
            $10::jsonb,
            'reserved', $11, 256, 256,
            0, $11, 256,
            'writer-mission-custody', 'pending', 128, $12::jsonb
          )`,
          [
            attemptId,
            funding.generationId,
            funding.accountId,
            funding.runRowId,
            ownerUserId,
            scenePins.storyId,
            policy.model,
            policy.provider,
            policy.priceVersion,
            JSON.stringify({
              kind: 'writer-mission.v1',
              missionId: 'unused',
              contextId: 'unused',
              requestCasHash: prep.wireSha256,
            }),
            reservedMicrousd.toString(),
            JSON.stringify(persistedWriterRoundPolicy(policy)),
          ],
        );
      }

      const policyVariants: Array<{
        label: string;
        mutate: (base: WriterRoundModelPolicy) => WriterRoundModelPolicy;
      }> = [
        {
          label: 'model',
          mutate: (base) => ({ ...base, model: `${base.model}-mutated` }),
        },
        {
          label: 'provider',
          mutate: (base) => ({ ...base, provider: `${base.provider}-mutated` }),
        },
        {
          label: 'priceVersion',
          mutate: (base) => ({ ...base, priceVersion: `${base.priceVersion}-x` }),
        },
        {
          label: 'inputMicrousdPerMillion',
          mutate: (base) => ({
            ...base,
            inputMicrousdPerMillion: '2999999',
          }),
        },
        {
          label: 'outputMicrousdPerMillion',
          mutate: (base) => ({
            ...base,
            outputMicrousdPerMillion: '14999999',
          }),
        },
        {
          label: 'maxInputTokens',
          mutate: (base) => ({ ...base, maxInputTokens: base.maxInputTokens - 1 }),
        },
        {
          label: 'maxOutputTokens',
          mutate: (base) => ({
            ...base,
            maxOutputTokens: base.maxOutputTokens - 1,
          }),
        },
        {
          label: 'timeoutMs',
          mutate: (base) => ({ ...base, timeoutMs: base.timeoutMs - 1 }),
        },
      ];

      for (const variant of policyVariants) {
        const seeded = await seedPreparedMission();
        const attemptId = randomUUID();
        await insertReservedAttempt(
          attemptId,
          providerPolicy,
          seeded.prep,
          seeded,
        );
        const reservedBefore = await fundingReservedMicrousd(
          database.db.$client,
          seeded.accountId,
        );
        const calls = { count: 0 };
        const mutated = variant.mutate(providerPolicy);
        const held = await advanceDurableWriterMissionProviderStep(
          database,
          storage,
          {
            missionId: seeded.missionId,
            ordinal: 1,
            attemptId,
            expectedRevision: seeded.prep.revision,
            providerPolicy: mutated,
            expectedWireSha256: seeded.prep.wireSha256,
            reservedMicrousd: 50_000n,
          },
          scriptedTransport(
            seeded.prep.wireSha256,
            async () => {
              calls.count += 1;
              return {
                kind: 'delivered',
                serializedResponse: round1ToolBody(),
                usage: realUsage,
                telemetry: realTelemetry,
                exactWireSha256: seeded.prep.wireSha256,
              };
            },
            calls,
          ),
        );
        assert.equal(
          held.status,
          'held',
          `policy variant ${variant.label} should hold`,
        );
        assert.equal(held.reason, 'budget_unavailable');
        assert.equal(calls.count, 0, `variant ${variant.label} sent transport`);
        const reservedAfter = await fundingReservedMicrousd(
          database.db.$client,
          seeded.accountId,
        );
        assert.equal(reservedAfter, reservedBefore);
      }

      const replaySeed = await seedPreparedMission();
      const replayAttempt = randomUUID();
      const replayCalls = { count: 0 };
      const replayTransport = multiBodyTransport(
        replaySeed.prep.wireSha256,
        [round1ToolBody()],
        replayCalls,
      );
      const delivered = await advanceDurableWriterMissionProviderStep(
        database,
        storage,
        {
          missionId: replaySeed.missionId,
          ordinal: 1,
          attemptId: replayAttempt,
          expectedRevision: replaySeed.prep.revision,
          providerPolicy,
          expectedWireSha256: replaySeed.prep.wireSha256,
          reservedMicrousd: 50_000n,
        },
        replayTransport,
      );
      assert.equal(delivered.status, 'delivered');
      assert.equal(replayCalls.count, 1);
      const stepSettled = await parentModelStepAtOrdinal(
        database,
        replaySeed.missionId,
        1,
      );
      assert.equal(stepSettled?.state, 'result-settled');

      const wrongWire = await advanceDurableWriterMissionProviderStep(
        database,
        storage,
        {
          missionId: replaySeed.missionId,
          ordinal: 1,
          attemptId: replayAttempt,
          expectedRevision: Number(stepSettled!.revision),
          providerPolicy,
          expectedWireSha256: 'c'.repeat(64),
          reservedMicrousd: 50_000n,
        },
        replayTransport,
      );
      assert.equal(wrongWire.status, 'held');
      assert.equal(wrongWire.reason, 'request_cas_mismatch');
      assert.equal(replayCalls.count, 1);

      const wrongPolicy = await advanceDurableWriterMissionProviderStep(
        database,
        storage,
        {
          missionId: replaySeed.missionId,
          ordinal: 1,
          attemptId: replayAttempt,
          expectedRevision: Number(stepSettled!.revision),
          providerPolicy: {
            ...providerPolicy,
            priceVersion: `${providerPolicy.priceVersion}-replay-mut`,
          },
          expectedWireSha256: replaySeed.prep.wireSha256,
          reservedMicrousd: 50_000n,
        },
        replayTransport,
      );
      assert.equal(wrongPolicy.status, 'held');
      assert.equal(wrongPolicy.reason, 'attempt_policy_mismatch');
      assert.equal(replayCalls.count, 1);

      const goodReplay = await advanceDurableWriterMissionProviderStep(
        database,
        storage,
        {
          missionId: replaySeed.missionId,
          ordinal: 1,
          attemptId: replayAttempt,
          expectedRevision: Number(stepSettled!.revision),
          providerPolicy,
          expectedWireSha256: replaySeed.prep.wireSha256,
          reservedMicrousd: 50_000n,
        },
        replayTransport,
      );
      assert.equal(goodReplay.status, 'replayed');
      assert.equal(replayCalls.count, 1);

      const access = { privateDocuments: false };
      const modelReplay = await runDurableWriterMissionModelRound(database, {
        missionId: replaySeed.missionId,
        ordinal: 1,
        attemptId: replayAttempt,
        expectedRevision: Number(stepSettled!.revision),
        capture: replaySeed.capture,
        access,
        reader: library.reader,
        storage,
        policy: providerPolicy,
        expectedWireSha256: replaySeed.prep.wireSha256,
        transport: replayTransport,
      });
      assert.equal(modelReplay.status, 'tool-round-complete');
      assert.equal(replayCalls.count, 1);
    },
  );
  if (!gate?.available) return;
});
