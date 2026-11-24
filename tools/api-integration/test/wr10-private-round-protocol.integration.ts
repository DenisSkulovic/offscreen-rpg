/**
 * WR10 T04: connected provider-free private writer round protocol (GA HTTP + Worker adapter).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { z } from 'zod';
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
import {
  writerRoundPrivateCustodyBodyByteLimit,
  writerRoundPrivateCustodyContractVersion,
  writerRoundPrivateOutcomePath,
  writerRoundPrivatePreparePath,
  writerRoundProviderUsageToWire,
  type WriterRoundPrivatePrepareResponse,
} from '@offscreen/game-authority-protocol/writer-round-private-custody';
import { initializeCampaign } from '@offscreen/story-engine/campaign/settings';
import { createStoryInitialization } from '@offscreen/story-engine/stories/initialization';
import { lockStoryById } from '@offscreen/story-engine/stories/persistence';
import {
  hashWriterMissionSerializedResponse,
  insertWriterMissionParentStep,
  prepareWriterMissionModelStep,
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
  writerRoundDecisionSchema,
  type WriterMissionCapture,
} from '@offscreen/storyteller/tasks';
import type { GameAuthoritySeam } from '../../../apps/game-authority/dist/src/application.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const {
  startGameAuthorityServer,
} = await import(
  pathToFileURL(join(repoRoot, 'apps/game-authority/dist/src/server.js')).href
);
const { createWriterRoundPrivateSeam } = await import(
  pathToFileURL(
    join(repoRoot, 'apps/game-authority/dist/src/writer-round-private-seam.js'),
  ).href
);
const { executePreparedWriterRound } = await import(
  pathToFileURL(
    join(
      repoRoot,
      'apps/worker/dist/src/activities/writer-round-provider-execution.js',
    ),
  ).href
);
const { createWriterRoundPrivateClient } = await import(
  pathToFileURL(
    join(repoRoot, 'apps/worker/dist/src/custody/writer-round-private-client.js'),
  ).href
);

const WR10_MODEL = 'anthropic/claude-3.5-sonnet';
const SAMPLE_PROVIDER_KEY = 'sk-or-fake-provider-secret-WR10TEST';
const storyToken = 'test-story-service-credential-wr10';
const executorToken = 'test-executor-only-credential-wr10';
const controlToken = 'test-control-only-credential-wr10';

const providerPolicy: WriterRoundModelPolicy = {
  model: WR10_MODEL,
  provider: 'Anthropic',
  priceVersion: 'wr10-int.v1',
  inputMicrousdPerMillion: '3000000',
  outputMicrousdPerMillion: '15000000',
  maxInputTokens: 4096,
  maxOutputTokens: 1024,
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
  providerId: 'gen_wr10',
  reportedModel: providerPolicy.model,
  finishReason: 'stop',
};

const outputSchema = z.toJSONSchema(writerRoundDecisionSchema);
const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

function noopSeam(): GameAuthoritySeam {
  return {
    async read() {
      return {};
    },
    async startFromCandidate() {
      throw new Error('unexpected');
    },
    async admitResolution() {
      return {};
    },
    async fork() {
      throw new Error('unexpected');
    },
    async putLaunch() {
      throw new Error('unexpected');
    },
    async getLaunch() {
      throw new Error('unexpected');
    },
  };
}

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
    return { available: false as const, error: message };
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
  await database.db.$client.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, 'WR10', $2, true, now(), now())`,
    [ownerUserId, `${ownerUserId}@example.test`],
  );
  const storyId = randomUUID();
  const initializeStory = createStoryInitialization(database, storage);
  await initializeStory({
    ownerId: ownerUserId,
    storyId,
    initial: {
      source: 'playable.opening.v1',
      premise: {
        title: 'WR10 continuation',
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
  model?: string;
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
    modelSelection: {
      provider: 'openrouter',
      model: input.model ?? WR10_MODEL,
    },
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
    `SELECT ordinal, revision, state, request_cas_hash, attempt_id,
            result_cas_hash, response_object_hash
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
        attempt_id: string | null;
        result_cas_hash: string | null;
        response_object_hash: string | null;
      }
    | undefined;
}

async function latestParentModelStep(
  database: ReturnType<typeof createDatabase>,
  missionId: string,
) {
  const result = await database.db.$client.query(
    `SELECT ordinal, revision, state, request_cas_hash, attempt_id
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
        attempt_id: string | null;
      }
    | undefined;
}

async function attemptChargeRow(
  database: ReturnType<typeof createDatabase>,
  attemptId: string,
) {
  const result = await database.db.$client.query(
    `SELECT state, charged_microusd FROM storyteller_attempt WHERE id = $1`,
    [attemptId],
  );
  return result.rows[0] as
    | { state: string; charged_microusd: string }
    | undefined;
}

async function assertRoundCustodyProof(
  database: ReturnType<typeof createDatabase>,
  missionId: string,
  ordinal: number,
) {
  const step = await parentModelStepAtOrdinal(database, missionId, ordinal);
  assert.ok(step?.attempt_id);
  assert.ok(step.result_cas_hash);
  assert.ok(step.response_object_hash);
  const attempts = await database.db.$client.query(
    `SELECT count(*)::int AS count FROM storyteller_attempt
     WHERE id = $1`,
    [step.attempt_id],
  );
  assert.equal(attempts.rows[0]?.count, 1);
  const attempt = await attemptChargeRow(database, step.attempt_id);
  assert.ok(attempt);
  assert.ok(BigInt(attempt.charged_microusd) > 0n);
  assert.equal(attempt.state, 'settled');
}

function assertResponseHasNoProviderKey(payload: string) {
  assert.equal(payload.includes(SAMPLE_PROVIDER_KEY), false);
  assert.equal(payload.includes('sk-or-'), false);
}

function makeCountingTransport(
  counter: { count: number },
  body: string,
) {
  return (input: {
    capturedWire: { sha256: string };
  }): PreparedWriterRoundTransport => ({
    preflight: () => ({ kind: 'ready', wireSha256: input.capturedWire.sha256 }),
    invoke: async () => {
      counter.count += 1;
      return {
        kind: 'delivered',
        serializedResponse: body,
        usage: realUsage,
        telemetry: realTelemetry,
        exactWireSha256: input.capturedWire.sha256,
      };
    },
  });
}

async function startAuthority(
  database: ReturnType<typeof createDatabase>,
  storage: LocalDocumentStore,
) {
  const writerRounds = createWriterRoundPrivateSeam(database, storage, {
    providerPolicy,
  });
  const server = await startGameAuthorityServer({
    seam: noopSeam(),
    writerRounds,
    token: storyToken,
    executorToken,
    controlToken,
    timeoutMs: 30_000,
  });
  return server;
}

async function seedConnectedMission(
  database: ReturnType<typeof createDatabase>,
  storage: LocalDocumentStore,
  options: {
    ownerUserId: string;
    libraryRootHash: string;
    scenePins: Awaited<ReturnType<typeof seedOpenedStory>>;
    captureOverride?: WriterMissionCapture;
    missionLibraryRootHash?: string;
    model?: string;
  },
) {
  const missionId = randomUUID();
  const generationId = await createWriterGeneration(
    database.db.$client,
    options.ownerUserId,
  );
  const capture =
    options.captureOverride ??
    buildV3Capture({
      generationId,
      ownerId: options.ownerUserId,
      storyId: options.scenePins.storyId,
      libraryRootHash: options.libraryRootHash,
      scenePins: options.scenePins,
      toolsAllowlist: ['library.browse'],
      ...(options.model ? { model: options.model } : {}),
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
      ownerId: options.ownerUserId,
      storyId: options.scenePins.storyId,
      captureSha256: capture.capturedRequestHash,
      libraryRootHash: options.missionLibraryRootHash ?? options.libraryRootHash,
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
  return { missionId, capture };
}

async function callHttp(
  origin: string,
  path: string,
  init: RequestInit & { token?: string } = {},
) {
  const headers = new Headers(init.headers);
  if (init.token !== undefined) {
    headers.set('authorization', `Bearer ${init.token}`);
  }
  return fetch(new URL(path, origin), { ...init, headers });
}

test('WR10 T04: connected tool then final over GA HTTP with worker adapter', async () => {
  const gate = await withDisposable('wr10-connected', async ({ database, storage }) => {
    const ownerUserId = `user_${randomUUID()}`;
    const scenePins = await seedOpenedStory(database, storage, ownerUserId);
    const libraryRootHash = scenePins.baseRootHash;
    const library = buildLibraryFixture(libraryRootHash);
    const { missionId, capture } = await seedConnectedMission(database, storage, {
      ownerUserId,
      libraryRootHash,
      scenePins,
    });
    const contextId = missionId;
    const server = await startAuthority(database, storage);
    const custody = createWriterRoundPrivateClient({
      origin: server.origin,
      executorToken,
      timeoutMs: 15_000,
    });
    const access = { privateDocuments: false };
    try {
      const attempt1 = randomUUID();
      const transport1 = { count: 0 };
      const round1 = await executePreparedWriterRound(
        {
          missionId,
          ordinal: 1,
          contextId,
          attemptId: attempt1,
          expectedRevision: 1,
        },
        {
          custody,
          apiKey: SAMPLE_PROVIDER_KEY,
          outputSchema,
          fetchImpl: fetch,
          prepareTransport: makeCountingTransport(transport1, round1ToolBody()),
        },
      );
      assert.equal(round1.status, 'delivered');
      assert.equal(transport1.count, 1);
      await assertRoundCustodyProof(database, missionId, 1);

      const step1 = await parentModelStepAtOrdinal(database, missionId, 1);
      const stored1 = await readDurableWriterMissionResponse(database, storage, {
        missionId,
        ordinal: 1,
        attemptId: attempt1,
        requestSha256: step1!.request_cas_hash,
      });
      assert.equal(stored1, round1ToolBody());

      const replayTransport = { count: 0 };
      const toolReplay = await runDurableWriterMissionModelRound(database, {
        missionId,
        ordinal: 1,
        attemptId: attempt1,
        expectedRevision: Number(step1!.revision),
        capture,
        access,
        reader: library.reader,
        storage,
        policy: providerPolicy,
        expectedWireSha256: step1!.request_cas_hash,
        transport: {
          preflight: () => ({
            kind: 'ready',
            wireSha256: step1!.request_cas_hash,
          }),
          invoke: async () => {
            replayTransport.count += 1;
            return {
              kind: 'delivered',
              serializedResponse: round1ToolBody(),
              usage: realUsage,
              telemetry: realTelemetry,
              exactWireSha256: step1!.request_cas_hash,
            };
          },
        },
      });
      assert.equal(toolReplay.status, 'tool-round-complete');
      assert.equal(replayTransport.count, 0);

      const step2 = await latestParentModelStep(database, missionId);
      assert.equal(step2?.ordinal, 3);
      assert.equal(step2?.state, 'model-request-prepared');

      const attempt2 = randomUUID();
      const transport2 = { count: 0 };
      const finalBody = round2FinalBody(libraryRootHash, library.firstObjectHash);
      const round2 = await executePreparedWriterRound(
        {
          missionId,
          ordinal: step2!.ordinal,
          contextId,
          attemptId: attempt2,
          expectedRevision: step2!.revision,
        },
        {
          custody,
          apiKey: SAMPLE_PROVIDER_KEY,
          outputSchema,
          fetchImpl: fetch,
          prepareTransport: makeCountingTransport(transport2, finalBody),
        },
      );
      assert.equal(round2.status, 'delivered');
      assert.equal(transport2.count, 1);
      await assertRoundCustodyProof(database, missionId, step2!.ordinal);

      const interpreted = await runDurableWriterMissionModelRound(database, {
        missionId,
        ordinal: step2!.ordinal,
        attemptId: attempt2,
        expectedRevision: (
          await parentModelStepAtOrdinal(database, missionId, step2!.ordinal)
        )!.revision,
        capture,
        access,
        reader: library.reader,
        storage,
        policy: providerPolicy,
        expectedWireSha256: step2!.request_cas_hash,
        transport: {
          preflight: () => ({
            kind: 'ready',
            wireSha256: step2!.request_cas_hash,
          }),
          invoke: async () => {
            transport2.count += 1;
            return {
              kind: 'delivered',
              serializedResponse: finalBody,
              usage: realUsage,
              telemetry: realTelemetry,
              exactWireSha256: step2!.request_cas_hash,
            };
          },
        },
      });
      assert.equal(interpreted.status, 'proposal-ready');
      assert.equal(transport2.count, 1);

      const prepareProbe = await custody.prepare(missionId, 1, {
        contextId,
        attemptId: randomUUID(),
        expectedRevision: Number(step1!.revision),
      });
      assertResponseHasNoProviderKey(JSON.stringify(prepareProbe));
      assert.equal(prepareProbe.status, 'replayed');
    } finally {
      await server.close();
    }
  });
  if (!gate?.available) return;
});

test('WR10 T04 negatives: auth, limits, policy, race, idempotence, uncertain', async () => {
  const gate = await withDisposable('wr10-neg', async ({ database, storage }) => {
    const ownerUserId = `user_${randomUUID()}`;
    const scenePins = await seedOpenedStory(database, storage, ownerUserId);
    const libraryRootHash = scenePins.baseRootHash;
    const library = buildLibraryFixture(libraryRootHash);
    const server = await startAuthority(database, storage);
    const custody = createWriterRoundPrivateClient({
      origin: server.origin,
      executorToken,
      timeoutMs: 15_000,
    });

    try {
      const { missionId: revisionMission } = await seedConnectedMission(
        database,
        storage,
        {
          ownerUserId,
          libraryRootHash,
          scenePins,
        },
      );

      const storyDenied = await callHttp(
        server.origin,
        writerRoundPrivatePreparePath(revisionMission, 1),
        {
          method: 'POST',
          token: storyToken,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            schemaVersion: writerRoundPrivateCustodyContractVersion,
            contextId: revisionMission,
            attemptId: randomUUID(),
            expectedRevision: 1,
          }),
        },
      );
      assert.equal(storyDenied.status, 401);
      assertResponseHasNoProviderKey(await storyDenied.text());

      const oversize = await callHttp(
        server.origin,
        writerRoundPrivatePreparePath(revisionMission, 1),
        {
          method: 'POST',
          token: executorToken,
          headers: { 'content-type': 'application/json' },
          body: 'x'.repeat(writerRoundPrivateCustodyBodyByteLimit + 1),
        },
      );
      assert.equal(oversize.status, 400);

      const { missionId: priceMission } = await seedConnectedMission(database, storage, {
        ownerUserId,
        libraryRootHash,
        scenePins,
        model: 'openai/gpt-4o-mini',
      });
      const priceHeld = await custody.prepare(priceMission, 1, {
        contextId: priceMission,
        attemptId: randomUUID(),
        expectedRevision: 1,
      });
      assert.equal(priceHeld.status, 'held');
      assert.match(
        priceHeld.status === 'held' ? priceHeld.reason : '',
        /model_policy_mismatch/,
      );

      const { missionId: rootMission } = await seedConnectedMission(database, storage, {
        ownerUserId,
        libraryRootHash,
        scenePins,
        missionLibraryRootHash: 'c'.repeat(64),
      });
      const rootHeld = await custody.prepare(rootMission, 1, {
        contextId: rootMission,
        attemptId: randomUUID(),
        expectedRevision: 1,
      });
      assert.equal(rootHeld.status, 'held');
      assert.equal(
        rootHeld.status === 'held' ? rootHeld.reason : '',
        'library_root_mismatch',
      );

      const revisionHeld = await custody.prepare(revisionMission, 1, {
        contextId: revisionMission,
        attemptId: randomUUID(),
        expectedRevision: 99,
      });
      assert.ok(revisionHeld.status === 'held' || revisionHeld.status === 'uncertain');

      const { missionId: raceMission } = await seedConnectedMission(database, storage, {
        ownerUserId,
        libraryRootHash,
        scenePins,
      });
      const attemptRaceA = randomUUID();
      const attemptRaceB = randomUUID();
      const [raceA, raceB] = await Promise.all([
        custody.prepare(raceMission, 1, {
          contextId: raceMission,
          attemptId: attemptRaceA,
          expectedRevision: 1,
        }),
        custody.prepare(raceMission, 1, {
          contextId: raceMission,
          attemptId: attemptRaceB,
          expectedRevision: 1,
        }),
      ]);
      const readyCount = [raceA, raceB].filter((r) => r.status === 'ready').length;
      assert.equal(readyCount, 1);
      const other = raceA.status === 'ready' ? raceB : raceA;
      assert.ok(other.status === 'uncertain' || other.status === 'held');

      const ready =
        raceA.status === 'ready'
          ? (raceA as Extract<WriterRoundPrivatePrepareResponse, { status: 'ready' }>)
          : (raceB as Extract<WriterRoundPrivatePrepareResponse, { status: 'ready' }>);
      assertResponseHasNoProviderKey(JSON.stringify(ready));

      const afterDispatch = await custody.prepare(raceMission, 1, {
        contextId: raceMission,
        attemptId: randomUUID(),
        expectedRevision: (
          await parentModelStepAtOrdinal(database, raceMission, 1)
        )!.revision,
      });
      assert.equal(afterDispatch.status, 'uncertain');

      const { missionId: putMission } = await seedConnectedMission(database, storage, {
        ownerUserId,
        libraryRootHash,
        scenePins,
      });
      const putAttempt = randomUUID();
      const invokeCounter = { count: 0 };
      const delivered = await executePreparedWriterRound(
        {
          missionId: putMission,
          ordinal: 1,
          contextId: putMission,
          attemptId: putAttempt,
          expectedRevision: 1,
        },
        {
          custody,
          apiKey: SAMPLE_PROVIDER_KEY,
          outputSchema,
          fetchImpl: fetch,
          prepareTransport: makeCountingTransport(invokeCounter, round1ToolBody()),
        },
      );
      assert.equal(delivered.status, 'delivered');
      assert.equal(invokeCounter.count, 1);
      const putStep = await parentModelStepAtOrdinal(database, putMission, 1);
      assert.ok(putStep?.attempt_id);

      const outcomeBody = {
        requestSha256: putStep!.request_cas_hash,
        outcome: {
          kind: 'delivered' as const,
          serializedResponse: round1ToolBody(),
          usage: writerRoundProviderUsageToWire(realUsage),
          telemetry: {
            durationMs: realTelemetry.durationMs,
            httpStatus: realTelemetry.httpStatus,
            providerId: realTelemetry.providerId,
            reportedModel: realTelemetry.reportedModel,
            finishReason: realTelemetry.finishReason,
          },
          exactWireSha256: putStep!.request_cas_hash,
        },
      };
      const dup = await custody.submitOutcome(
        putMission,
        1,
        putStep!.attempt_id!,
        outcomeBody,
      );
      assert.equal(dup.status, 'replayed');
      assertResponseHasNoProviderKey(JSON.stringify(dup));

      const mismatched = await callHttp(
        server.origin,
        writerRoundPrivateOutcomePath(putMission, 1, putStep!.attempt_id!),
        {
          method: 'PUT',
          token: executorToken,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            schemaVersion: writerRoundPrivateCustodyContractVersion,
            requestSha256: putStep!.request_cas_hash,
            outcome: {
              kind: 'delivered',
              serializedResponse: round2FinalBody(libraryRootHash, library.firstObjectHash),
              usage: writerRoundProviderUsageToWire(realUsage),
              telemetry: {
                durationMs: 1,
                httpStatus: 200,
                providerId: 'gen_mismatch',
                reportedModel: WR10_MODEL,
                finishReason: 'stop',
              },
              exactWireSha256: putStep!.request_cas_hash,
            },
          }),
        },
      );
      assert.equal(mismatched.status, 409);
      const stepAfterMismatch = await parentModelStepAtOrdinal(database, putMission, 1);
      assert.equal(
        stepAfterMismatch?.result_cas_hash,
        hashWriterMissionSerializedResponse(round1ToolBody()),
      );

      const { missionId: uncertainMission } = await seedConnectedMission(
        database,
        storage,
        {
          ownerUserId,
          libraryRootHash,
          scenePins,
        },
      );
      const uncertainAttempt = randomUUID();
      const uncertainCounter = { count: 0 };
      const uncertainResult = await executePreparedWriterRound(
        {
          missionId: uncertainMission,
          ordinal: 1,
          contextId: uncertainMission,
          attemptId: uncertainAttempt,
          expectedRevision: 1,
        },
        {
          custody,
          apiKey: SAMPLE_PROVIDER_KEY,
          outputSchema,
          fetchImpl: fetch,
          prepareTransport: (input: {
            capturedWire: { sha256: string };
          }): PreparedWriterRoundTransport => ({
            preflight: () => ({
              kind: 'ready',
              wireSha256: input.capturedWire.sha256,
            }),
            invoke: async () => {
              uncertainCounter.count += 1;
              return {
                kind: 'unknown',
                telemetry: {
                  durationMs: null,
                  httpStatus: null,
                  providerId: null,
                  reportedModel: null,
                  finishReason: 'timeout',
                },
                exactWireSha256: input.capturedWire.sha256,
              };
            },
          }),
        },
      );
      assert.equal(uncertainResult.status, 'uncertain');
      assert.equal(uncertainCounter.count, 1);
      const retryPrepare = await custody.prepare(uncertainMission, 1, {
        contextId: uncertainMission,
        attemptId: randomUUID(),
        expectedRevision: (
          await parentModelStepAtOrdinal(database, uncertainMission, 1)
        )!.revision,
      });
      assert.equal(retryPrepare.status, 'uncertain');
      assert.equal(uncertainCounter.count, 1);
    } finally {
      await server.close();
    }
  });
  if (!gate?.available) return;
});