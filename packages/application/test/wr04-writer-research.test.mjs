import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { outbox } from '@offscreen/db/outbox-schema';
import { storytellerWriterChild, storytellerWriterStep } from '@offscreen/db/storyteller-schema';
import {
  applyLibraryBatch,
  canonicalDocumentSchema,
  createEmptyLibraryIndex,
  hashCanonicalJson,
  LocalDocumentStore,
} from '@offscreen/documents';
import { computeWriterResearchChildId } from '@offscreen/storyteller/tasks';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';
import {
  advanceWriterMissionProviderStep,
  buildWriterResearchRoundWire,
  hashWriterMissionSerializedResponse,
  hashWriterResearchJoinBundle,
  insertWriterMissionParentStep,
  insertWriterResearchChildStepInTransaction,
  applyWriterResearchDelegate,
  joinWriterResearchParent,
  prepareWriterResearchModelStep,
  runWriterMissionModelRound,
  runWriterResearchChildModelRound,
  WRITER_RESEARCH_WAKE_TOPIC,
  WRITER_RESEARCH_JOIN_WAKE_TOPIC,
} from '../dist/storyteller/index.js';

const ROOT_HASH = 'a'.repeat(64);
const REQUEST_HASH = 'b'.repeat(64);
const CHILD_REQUEST_HASH = 'c'.repeat(64);
const CAPTURE_HASH = 'd'.repeat(64);
const RESPONSE_BODY = JSON.stringify({
  kind: 'final',
  proposal: { sceneHash: 'e'.repeat(64) },
});
const RESULT_HASH = hashWriterMissionSerializedResponse(RESPONSE_BODY);

const budgetSnapshot = {
  maxModelRounds: 6,
  maxInputTokens: 12_288,
  maxGeneratedTokens: 4_096,
  maxMicrousd: '150000',
  deadlineMs: 120_000,
};

const providerPolicy = {
  model: 'anthropic/claude-3.5-sonnet',
  provider: 'Anthropic',
  priceVersion: 'wr04-int.v1',
  inputMicrousdPerMillion: '3000000',
  outputMicrousdPerMillion: '15000000',
  maxInputTokens: 8192,
  maxOutputTokens: 1024,
  maxModelRounds: 3,
  maxMicrousd: 500_000n,
  timeoutMs: 30_000,
};

const realUsage = {
  reportedCostMicrousd: 2222n,
  promptTokens: 44,
  completionTokens: 11,
  totalTokens: 55,
  reasoningTokens: null,
  cachedTokens: null,
  cacheWriteTokens: null,
};

const realTelemetry = {
  durationMs: 8,
  httpStatus: 200,
  providerId: 'gen_wr04',
  reportedModel: providerPolicy.model,
  finishReason: 'stop',
};

async function withDisposable(run) {
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
    test.diagnostic(
      `NOT-RUN: disposable Postgres unavailable (${message}). Is Docker/postgres up?`,
    );
    return;
  }
  const database = createDatabase(
    readDatabaseConfig({
      DATABASE_URL: provisioned.connectionString,
    }),
    () => {},
  );
  try {
    await run(database);
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

async function seedFundingStack(client) {
  const generationId = randomUUID();
  const storyId = randomUUID();
  const ownerId = randomUUID();
  const userId = `user_${randomUUID()}`;
  await client.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, 'WR04', $2, true, now(), now())`,
    [userId, `${userId}@example.test`],
  );
  await client.query(
    `INSERT INTO generation (id, owner_id, kind, status_revision, input, state)
     VALUES ($1, $2, 'writer-mission.v1', 0, '{}'::jsonb, 'pending')`,
    [generationId, userId],
  );
  const accountId = randomUUID();
  await client.query(
    `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
     VALUES ($1, 500000, false, now())`,
    [accountId],
  );
  const runRowId = randomUUID();
  await client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1, $2, 500000, 12, true)`,
    [runRowId, accountId],
  );
  await client.query(
    `INSERT INTO storyteller_operation (
       generation_id, account_id, run_id, owner_id, purpose, resources,
       max_model_rounds, max_input_tokens, max_generated_tokens, max_reasoning_tokens, max_microusd
     ) VALUES (
       $1, $2, $3, $4, 'writer-mission', '{}'::jsonb,
       6, 12288, 4096, 0, 500000
     )`,
    [generationId, accountId, runRowId, String(ownerId)],
  );
  return { generationId, storyId, ownerId, accountId, runRowId };
}

async function seedWriterMission(database, stack) {
  const missionId = randomUUID();
  await insertWriterMissionParentStep(database, {
    missionId,
    generationId: stack.generationId,
    operationId: stack.generationId,
    ownerId: stack.ownerId,
    storyId: stack.storyId,
    captureSha256: CAPTURE_HASH,
    libraryRootHash: ROOT_HASH,
    libraryRootRevision: 3,
    budgetSnapshot,
    nextRevision: 8,
  }, {
    ordinal: 7,
    requestCasHash: REQUEST_HASH,
    revision: 1,
    state: 'model-request-prepared',
  });
  return { missionId };
}

function childPolicy(maxMicrousd) {
  return {
    modelSelection: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
    funding: {
      maxModelRounds: 2,
      maxInputTokens: 4096,
      maxGeneratedTokens: 1024,
      maxMicrousd,
    },
  };
}

function buildLibraryFixture() {
  const rootHash = ROOT_HASH;
  let library = createEmptyLibraryIndex();
  const objects = new Map();
  const operations = [];
  const documentId = randomUUID();
  const path = 'lore/trade.md';
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
    title: 'Trade',
    body: '# trade\nSeyda Neen exports kwama eggs.',
  });
  const objectHash = hashCanonicalJson(document);
  objects.set(objectHash, {
    envelope: document.envelope,
    body: document.body,
  });
  operations.push({
    op: 'create',
    entry: {
      documentId,
      revision: 1,
      path,
      objectHash,
      kind: 'lore',
      authority: 'canon',
      visibility: 'player-known',
    },
  });
  library = applyLibraryBatch(library, operations);
  const nodes = new Map(library.store);
  const roots = new Map([[rootHash, library.root]]);
  const reader = {
    async readManifest() {
      throw new Error('v2 library only');
    },
    async readLibraryRoot(hash) {
      const root = roots.get(hash);
      if (!root) throw new Error('foreign root');
      return root;
    },
    async readLibraryNode(hash) {
      const node = nodes.get(hash);
      if (!node) throw new Error(`missing node ${hash}`);
      return node;
    },
    async readDocument(hash) {
      const value = objects.get(hash);
      if (!value) throw new Error(`missing object ${hash}`);
      return value;
    },
    async readSourcePassage() {
      throw new Error('not used');
    },
  };
  return { rootHash, reader, objectHash, documentId, path };
}

async function seedChild(database, missionId, { parentToolCallId = 't1', childOrdinal = 1, maxMicrousd = 80_000, toolAllowlist = ['library.browse', 'library.read'] } = {}) {
  const childId = computeWriterResearchChildId({
    missionId,
    parentToolCallId,
    childOrdinal,
  });
  await database.db.transaction(async (tx) => {
    await insertWriterResearchChildStepInTransaction(
      tx,
      missionId,
      {
        childId,
        parentToolCallId,
        childOrdinal,
        question: `Question for child ${childOrdinal}`,
        requestSha256: CHILD_REQUEST_HASH,
        rootHash: ROOT_HASH,
        rootRevision: 3,
        toolAllowlist,
        skillHashes: [],
        policy: childPolicy(maxMicrousd),
        maxMicrousd,
        state: 'pending',
      },
      {
        ordinal: 1,
        requestCasHash: CHILD_REQUEST_HASH,
        revision: 1,
        state: 'model-request-prepared',
      },
    );
  });
  return { childId, parentToolCallId, childOrdinal };
}

test('WR04: parent default context remains deliverable (v3 path unaffected)', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const parentAttempt = randomUUID();
    const { missionId } = await seedWriterMission(database, stack);
    const delivered = await advanceWriterMissionProviderStep(
      database,
      {
        missionId,
        ordinal: 7,
        attemptId: parentAttempt,
        expectedRevision: 1,
      },
      async () => ({ kind: 'delivered', serializedResponse: RESPONSE_BODY }),
    );
    assert.equal(delivered.status, 'delivered');
    const parentStep = await database.db.$client.query(
      `SELECT context_id, ordinal FROM storyteller_writer_step
       WHERE mission_id = $1 AND ordinal = 7`,
      [missionId],
    );
    assert.equal(parentStep.rows[0].context_id, missionId);
    const mission = await database.db.$client.query(
      `SELECT next_revision FROM storyteller_writer_mission WHERE id = $1`,
      [missionId],
    );
    assert.ok(mission.rows[0].next_revision >= 8);
  });
});

test('WR04: child context records distinct attempt attribution and charged usage', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const parentAttempt = randomUUID();
    const childAttempt = randomUUID();
    const { missionId } = await seedWriterMission(database, stack);
    const { childId } = await seedChild(database, missionId);
    const parentOutcome = await advanceWriterMissionProviderStep(
      database,
      {
        missionId,
        ordinal: 7,
        attemptId: parentAttempt,
        expectedRevision: 1,
      },
      async () => ({ kind: 'delivered', serializedResponse: RESPONSE_BODY }),
    );
    assert.equal(parentOutcome.status, 'delivered');
    const childOutcome = await advanceWriterMissionProviderStep(
      database,
      {
        missionId,
        contextId: childId,
        ordinal: 1,
        attemptId: childAttempt,
        expectedRevision: 1,
        providerPolicy,
        expectedWireSha256: CHILD_REQUEST_HASH,
        reservedMicrousd: 25_000n,
      },
      async () => ({
        kind: 'delivered',
        serializedResponse: RESPONSE_BODY,
        usage: realUsage,
        telemetry: realTelemetry,
        exactWireSha256: CHILD_REQUEST_HASH,
      }),
    );
    assert.equal(childOutcome.status, 'delivered');
    assert.notEqual(parentAttempt, childAttempt);
    const childAttemptRow = await database.db.$client.query(
      `SELECT attribution, charged_microusd FROM storyteller_attempt WHERE id = $1`,
      [childAttempt],
    );
    assert.equal(childAttemptRow.rows[0].attribution.contextId, childId);
    assert.equal(String(childAttemptRow.rows[0].charged_microusd), '2222');
  });
});

test('WR04: oversubscribed children deny second reserve', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const { missionId } = await seedWriterMission(database, stack);
    const childA = await seedChild(database, missionId, {
      childOrdinal: 1,
      maxMicrousd: 100_000,
    });
    const childB = await seedChild(database, missionId, {
      parentToolCallId: 't1',
      childOrdinal: 2,
      maxMicrousd: 100_000,
    });
    const held = await advanceWriterMissionProviderStep(
      database,
      {
        missionId,
        contextId: childB.childId,
        ordinal: 1,
        attemptId: randomUUID(),
        expectedRevision: 1,
        reservedMicrousd: 40_000n,
      },
      async () => ({ kind: 'delivered', serializedResponse: RESPONSE_BODY }),
    );
    assert.equal(held.status, 'held');
    assert.equal(held.reason, 'budget_unavailable');
    assert.ok(childA.childId !== childB.childId);
  });
});

test('WR04: wrong contextId is denied', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const { missionId } = await seedWriterMission(database, stack);
    await seedChild(database, missionId);
    await assert.rejects(
      advanceWriterMissionProviderStep(
        database,
        {
          missionId,
          contextId: randomUUID(),
          ordinal: 1,
          attemptId: randomUUID(),
          expectedRevision: 1,
        },
        async () => ({ kind: 'delivered', serializedResponse: RESPONSE_BODY }),
      ),
      (error) => error?.code === 'step_not_found',
    );
  });
});

test('WR04: parent cannot spend earmarked child suballocation', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const { missionId } = await seedWriterMission(database, stack);
    await seedChild(database, missionId, { maxMicrousd: 120_000 });
    const held = await advanceWriterMissionProviderStep(
      database,
      {
        missionId,
        ordinal: 7,
        attemptId: randomUUID(),
        expectedRevision: 1,
        reservedMicrousd: 50_000n,
      },
      async () => ({ kind: 'delivered', serializedResponse: RESPONSE_BODY }),
    );
    assert.equal(held.status, 'held');
    assert.equal(held.reason, 'budget_unavailable');
  });
});

test('WR04: child research wires and tool browse stay distinct from parent v3', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const { missionId } = await seedWriterMission(database, stack);
    const { childId } = await seedChild(database, missionId);
    const { reader } = buildLibraryFixture();
    const storageDir = await mkdtemp(join(tmpdir(), 'wr04-research-'));
    const storage = new LocalDocumentStore(storageDir);
    const prep = await prepareWriterResearchModelStep(database, storage, {
      missionId,
      contextId: childId,
      ordinal: 1,
      expectedRevision: 1,
      capture: {
        version: 'writer-research.v1',
        missionId,
        parentToolCallId: 't1',
        childOrdinal: 1,
        question: 'Question for child 1',
        rootHash: ROOT_HASH,
        rootRevision: 3,
        skillObjectHashes: [],
        toolAllowlist: ['library.browse', 'library.read'],
        modelSelection: { provider: 'openrouter', model: 'fixture/research' },
        funding: childPolicy(80_000).funding,
        required: true,
      },
    });
    const { wire: childWire } = buildWriterResearchRoundWire(
      {
        version: 'writer-research.v1',
        missionId,
        parentToolCallId: 't1',
        childOrdinal: 1,
        question: 'Question for child 1',
        rootHash: ROOT_HASH,
        rootRevision: 3,
        skillObjectHashes: [],
        toolAllowlist: ['library.browse', 'library.read'],
        modelSelection: { provider: 'openrouter', model: 'fixture/research' },
        funding: childPolicy(80_000).funding,
        required: true,
      },
      [],
    );
    assert.equal(prep.wireSha256, childWire.sha256);
    assert.notEqual(childWire.sha256, REQUEST_HASH);
    const toolBody = JSON.stringify({
      kind: 'tool-calls',
      calls: [{ id: 't1', name: 'library.browse', args: { prefix: 'lore/', pageSize: 4 } }],
    });
    const round = await runWriterResearchChildModelRound(database, {
      childId,
      ordinal: 1,
      attemptId: randomUUID(),
      expectedRevision: prep.revision,
      reader,
      storage,
      scriptedDecisionBody: toolBody,
    });
    assert.equal(round.status, 'tool-round-complete');
    const toolRows = await database.db
      .select()
      .from(storytellerWriterStep)
      .where(
        and(
          eq(storytellerWriterStep.missionId, missionId),
          eq(storytellerWriterStep.contextId, childId),
          isNotNull(storytellerWriterStep.toolCallId),
        ),
      );
    assert.equal(toolRows.length, 1);
    const parentModelSteps = await database.db
      .select()
      .from(storytellerWriterStep)
      .where(
        and(
          eq(storytellerWriterStep.missionId, missionId),
          eq(storytellerWriterStep.contextId, missionId),
          isNull(storytellerWriterStep.toolCallId),
        ),
      );
    assert.ok(parentModelSteps.length >= 1);
  });
});

test('WR04: forged parent-only research tools deny before execution', async () => {
  const forgedTools = [
    { parentToolCallId: 't1', forged: { id: 't1', name: 'workdesk.stage', args: {} } },
    { parentToolCallId: 't2', forged: { id: 't1', name: 'submit_scene', args: {} } },
    {
      parentToolCallId: 't3',
      forged: {
        id: 't1',
        name: 'research.delegate',
        args: { parentToolCallId: 't9', questions: [] },
      },
    },
  ];
  for (const { parentToolCallId, forged } of forgedTools) {
    await withDisposable(async (database) => {
      const stack = await seedFundingStack(database.db.$client);
      const { missionId } = await seedWriterMission(database, stack);
      const { childId } = await seedChild(database, missionId, {
        parentToolCallId,
        childOrdinal: 1,
      });
      const { reader } = buildLibraryFixture();
      const storage = new LocalDocumentStore(
        await mkdtemp(join(tmpdir(), `wr04-forged-${parentToolCallId}-`)),
      );
      const prep = await prepareWriterResearchModelStep(database, storage, {
        missionId,
        contextId: childId,
        ordinal: 1,
        expectedRevision: 1,
        capture: {
          version: 'writer-research.v1',
          missionId,
          parentToolCallId,
          childOrdinal: 1,
          question: `Question for ${parentToolCallId}`,
          rootHash: ROOT_HASH,
          rootRevision: 3,
          skillObjectHashes: [],
          toolAllowlist: ['library.read'],
          modelSelection: { provider: 'openrouter', model: 'fixture/research' },
          funding: childPolicy(80_000).funding,
          required: true,
        },
      });
      const held = await runWriterResearchChildModelRound(database, {
        childId,
        ordinal: 1,
        attemptId: randomUUID(),
        expectedRevision: prep.revision,
        reader,
        storage,
        scriptedDecisionBody: JSON.stringify({
          kind: 'tool-calls',
          calls: [forged],
        }),
      });
      assert.equal(held.status, 'held');
      assert.equal(held.reason, 'forbidden_tool');
    });
  }
});

test('WR04: research join hash is stable across child completion order', () => {
  const childOne = randomUUID();
  const childTwo = randomUUID();
  const first = hashWriterResearchJoinBundle([
    {
      childOrdinal: 2,
      childId: childTwo,
      resultCasHash: 'a'.repeat(64),
      verifiedResultHash: 'b'.repeat(64),
    },
    {
      childOrdinal: 1,
      childId: childOne,
      resultCasHash: 'c'.repeat(64),
      verifiedResultHash: 'd'.repeat(64),
    },
  ]);
  const second = hashWriterResearchJoinBundle([
    {
      childOrdinal: 1,
      childId: childOne,
      resultCasHash: 'c'.repeat(64),
      verifiedResultHash: 'd'.repeat(64),
    },
    {
      childOrdinal: 2,
      childId: childTwo,
      resultCasHash: 'a'.repeat(64),
      verifiedResultHash: 'b'.repeat(64),
    },
  ]);
  assert.equal(first, second);
});

function writerMissionCaptureWithResearch(missionId, storyId, ownerId, generationId) {
  return {
    version: 'writer-mission.v3',
    generationId,
    operationId: generationId,
    ownerId: String(ownerId),
    storyId,
    libraryRootHash: ROOT_HASH,
    libraryRootRevision: 3,
    profileObjectHash: 'f'.repeat(64),
    skillObjectHashes: [],
    toolsAllowlist: [
      'library.read',
      'workdesk.stage',
      'submit_scene',
      'research.delegate',
    ],
    sceneScope: {
      kind: 'continuation',
      baseSceneSequence: 2,
      basePassageId: randomUUID(),
      baseCheckpointHash: 'e'.repeat(64),
      baseRootHash: ROOT_HASH,
      baseRootRevision: 3,
      baseNarrativeRevision: 2,
      baseCampaignStateRevision: 0,
      controllingIntentOrReceiptId: randomUUID(),
      scenarioKind: 'narrative-only',
    },
    modelSelection: { provider: 'openrouter', model: 'scripted-offline' },
    budgets: budgetSnapshot,
    capturedRequestHash: CAPTURE_HASH,
  };
}

test('WR04 T04: delegate enqueues children without parent tool result', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const { missionId } = await seedWriterMission(database, stack);
    const capture = writerMissionCaptureWithResearch(
      missionId,
      stack.storyId,
      stack.ownerId,
      stack.generationId,
    );
  const delegated = await applyWriterResearchDelegate(database, {
      missionId,
      capture,
      call: {
        id: 't9',
        args: {
          parentToolCallId: 't9',
          questions: [
            { question: 'What trade goods leave Seyda Neen?', required: true },
          ],
        },
      },
    });
    const childNotices = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.topic, WRITER_RESEARCH_WAKE_TOPIC));
    assert.equal(childNotices.length, 1);
    assert.equal(childNotices[0].operationId, delegated.childIds[0]);
    const delegateStep = await database.db
      .select()
      .from(storytellerWriterStep)
      .where(
        and(
          eq(storytellerWriterStep.missionId, missionId),
          eq(storytellerWriterStep.toolCallId, 't9'),
        ),
      );
    assert.equal(delegateStep[0].resultCasHash, null);
    const nextModel = await database.db
      .select()
      .from(storytellerWriterStep)
      .where(
        and(
          eq(storytellerWriterStep.missionId, missionId),
          eq(storytellerWriterStep.contextId, missionId),
          isNull(storytellerWriterStep.toolCallId),
          eq(storytellerWriterStep.state, 'model-request-prepared'),
        ),
      )
      .orderBy(asc(storytellerWriterStep.ordinal));
    assert.equal(nextModel.length, 1);
  });
});

test('WR04 T04: duplicate delegate replays same children', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const { missionId } = await seedWriterMission(database, stack);
    const capture = writerMissionCaptureWithResearch(
      missionId,
      stack.storyId,
      stack.ownerId,
      stack.generationId,
    );
    const first = await applyWriterResearchDelegate(database, {
      missionId,
      capture,
      call: {
        id: 't8',
        args: {
          parentToolCallId: 't8',
          questions: [{ question: 'Q1', required: true }],
        },
      },
    });
    const second = await applyWriterResearchDelegate(database, {
      missionId,
      capture,
      call: {
        id: 't8',
        args: {
          parentToolCallId: 't8',
          questions: [{ question: 'Q1', required: true }],
        },
      },
    });
    assert.equal(second.replayed, true);
    assert.deepEqual(second.childIds, first.childIds);
    const childNotices = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.topic, WRITER_RESEARCH_WAKE_TOPIC));
    assert.equal(childNotices.length, 1);
  });
});

test('WR04 T04: join after children resumes parent with one next step', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const { missionId } = await seedWriterMission(database, stack);
    const capture = writerMissionCaptureWithResearch(
      missionId,
      stack.storyId,
      stack.ownerId,
      stack.generationId,
    );
    const delegated = await applyWriterResearchDelegate(database, {
      missionId,
      capture,
      call: {
        id: 't7',
        args: {
          parentToolCallId: 't7',
          questions: [
            { question: 'Q required', required: true },
            { question: 'Q optional', required: false },
          ],
        },
      },
      policy: {
        maxConcurrentChildren: 2,
        maxMicrousdPerChild: 40_000,
        childToolAllowlist: ['library.read'],
        childMaxModelRounds: 2,
        childMaxInputTokens: 2048,
        childMaxGeneratedTokens: 512,
      },
    });
    const { reader } = buildLibraryFixture();
    const storage = new LocalDocumentStore(
      await mkdtemp(join(tmpdir(), 'wr04-join-')),
    );
    const fixtureResult = {
      version: 'writer-research-result.v1',
      claims: [{ text: 'Kwama eggs are exported.', evidence: [] }],
      gaps: [],
      contradictions: [],
    };
    const scriptedBody = JSON.stringify({
      kind: 'final',
      result: fixtureResult,
    });
    for (const childId of delegated.childIds) {
      const prep = await prepareWriterResearchModelStep(database, storage, {
        missionId,
        contextId: childId,
        ordinal: 1,
        expectedRevision: 1,
        capture: {
          version: 'writer-research.v1',
          missionId,
          parentToolCallId: 't7',
          childOrdinal: delegated.childIds.indexOf(childId) + 1,
          question: 'placeholder',
          rootHash: ROOT_HASH,
          rootRevision: 3,
          skillObjectHashes: [],
          toolAllowlist: ['library.read'],
          modelSelection: { provider: 'openrouter', model: 'fixture/research' },
          funding: childPolicy(40_000).funding,
          required: true,
        },
      });
      await runWriterResearchChildModelRound(database, {
        childId,
        ordinal: 1,
        attemptId: randomUUID(),
        expectedRevision: prep.revision,
        reader,
        storage,
        scriptedDecisionBody: scriptedBody,
      });
    }
    const joinOne = await joinWriterResearchParent(database, storage, {
      missionId,
      parentToolCallId: 't7',
      capture,
      access: { privateDocuments: false },
      reader,
    });
    const joinTwo = await joinWriterResearchParent(database, storage, {
      missionId,
      parentToolCallId: 't7',
      capture,
      access: { privateDocuments: false },
      reader,
    });
    assert.ok(joinOne.status === 'joined' || joinOne.status === 'replayed');
    assert.equal(joinTwo.status, 'replayed');
    assert.equal(joinOne.nextWireSha256, joinTwo.nextWireSha256);
    const preparedSteps = await database.db
      .select()
      .from(storytellerWriterStep)
      .where(
        and(
          eq(storytellerWriterStep.missionId, missionId),
          eq(storytellerWriterStep.contextId, missionId),
          isNull(storytellerWriterStep.toolCallId),
          eq(storytellerWriterStep.state, 'model-request-prepared'),
        ),
      );
    assert.ok(preparedSteps.length >= 2);
    const joinNotices = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.topic, WRITER_RESEARCH_JOIN_WAKE_TOPIC));
    assert.equal(joinNotices.length, 0);
  });
});

test('WR04 T04: parent model round with delegate does not schedule next step early', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const { missionId } = await seedWriterMission(database, stack);
    const capture = writerMissionCaptureWithResearch(
      missionId,
      stack.storyId,
      stack.ownerId,
      stack.generationId,
    );
    const { reader } = buildLibraryFixture();
    const storage = new LocalDocumentStore(
      await mkdtemp(join(tmpdir(), 'wr04-delegate-round-')),
    );
    const body = JSON.stringify({
      kind: 'tool-calls',
      calls: [
        {
          id: 't6',
          name: 'research.delegate',
          args: {
            parentToolCallId: 't6',
            questions: [{ question: 'Delegated Q', required: true }],
          },
        },
      ],
    });
    const round = await runWriterMissionModelRound(database, {
      missionId,
      ordinal: 7,
      attemptId: randomUUID(),
      expectedRevision: 1,
      capture,
      access: { privateDocuments: false },
      reader,
      storage,
      scriptedDecisionBody: body,
    });
    assert.equal(round.status, 'research-delegated');
    const nextAfterDelegate = await database.db
      .select()
      .from(storytellerWriterStep)
      .where(
        and(
          eq(storytellerWriterStep.missionId, missionId),
          eq(storytellerWriterStep.contextId, missionId),
          isNull(storytellerWriterStep.toolCallId),
        ),
      )
      .orderBy(asc(storytellerWriterStep.ordinal));
    assert.equal(nextAfterDelegate.length, 1);
  });
});

test('WR04 T04 negative: delegate second child over mission cap is denied', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const { missionId } = await seedWriterMission(database, stack);
    const capture = writerMissionCaptureWithResearch(
      missionId,
      stack.storyId,
      stack.ownerId,
      stack.generationId,
    );
    await assert.rejects(
      () =>
        applyWriterResearchDelegate(database, {
          missionId,
          capture,
          call: {
            id: 't5',
            args: {
              parentToolCallId: 't5',
              questions: [
                { question: 'Q1', required: true },
                { question: 'Q2', required: true },
              ],
            },
          },
          policy: {
            maxConcurrentChildren: 2,
            maxMicrousdPerChild: 100_000,
            childToolAllowlist: ['library.read'],
            childMaxModelRounds: 1,
            childMaxInputTokens: 1024,
            childMaxGeneratedTokens: 512,
          },
        }),
      (error) => error?.code === 'mission_over_cap',
    );
  });
});

test('WR04 T04 negative: stale held mission join does not open a new model step', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const { missionId } = await seedWriterMission(database, stack);
    await database.db.$client.query(
      `UPDATE storyteller_writer_mission SET state = 'held' WHERE id = $1`,
      [missionId],
    );
    const capture = writerMissionCaptureWithResearch(
      missionId,
      stack.storyId,
      stack.ownerId,
      stack.generationId,
    );
    const { reader } = buildLibraryFixture();
    const joinOutcome = await joinWriterResearchParent(
      database,
      new LocalDocumentStore(await mkdtemp(join(tmpdir(), 'wr04-stale-'))),
      {
        missionId,
        parentToolCallId: 't4',
        capture,
        access: { privateDocuments: false },
        reader,
      },
    );
    assert.equal(joinOutcome.status, 'held');
    assert.equal(joinOutcome.reason, 'stale_mission');
  });
});

test('WR04: global uncertain replay blocks new child reserve', async () => {
  await withDisposable(async (database) => {
    const stack = await seedFundingStack(database.db.$client);
    const uncertainAttempt = randomUUID();
    await database.db.$client.query(
      `INSERT INTO storyteller_attempt (
        id, generation_id, account_id, run_id, owner_id, story_id, purpose,
        storyteller_profile_id, storyteller_profile_revision, task_input_version,
        prompt_version, recipe_version, resource_policy_version,
        requested_model, requested_provider, price_version, attribution,
        state, reserved_microusd, reserved_input_tokens, reserved_generated_tokens,
        reserved_reasoning_tokens, estimated_microusd, estimated_input_tokens,
        estimation_method, reconciliation, request_bytes, policy, dispatched_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'writer-mission.v1',
        'writer-mission.v1', 1, 1,
        'writer-mission.v1', 'writer-mission.v1', 'writer-mission.v1',
        'anthropic/claude-3.5-sonnet', 'Anthropic', 'wr04-int.v1',
        '{"kind":"writer-research.v1","contextId":"child-x"}'::jsonb,
        'uncertain', 10000, 256, 256,
        0, 10000, 256,
        'writer-mission-custody', 'unknown', 128,
        '{"version":"writer-round.v1"}'::jsonb,
        now()
      )`,
      [
        uncertainAttempt,
        stack.generationId,
        stack.accountId,
        stack.runRowId,
        String(stack.ownerId),
        randomUUID(),
      ],
    );
    const { missionId } = await seedWriterMission(database, stack);
    const { childId } = await seedChild(database, missionId, { maxMicrousd: 20_000 });
    const held = await advanceWriterMissionProviderStep(
      database,
      {
        missionId,
        contextId: childId,
        ordinal: 1,
        attemptId: randomUUID(),
        expectedRevision: 1,
      },
      async () => ({ kind: 'delivered', serializedResponse: RESPONSE_BODY }),
    );
    assert.equal(held.status, 'held');
    assert.equal(held.reason, 'usage_uncertain');
  });
});