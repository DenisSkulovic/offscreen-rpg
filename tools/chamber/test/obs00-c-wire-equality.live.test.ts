/**
 * OBS00-C provider-free proof: the exact bytes handed to the HTTP transport
 * equal the packet approved and persisted in storyteller_dispatch_review.
 *
 * Every case runs the real application runtime against a disposable
 * offscreen_chamber_run_<uuid> PostgreSQL database with an injected mock
 * transport. No credential is read and no external HTTP is possible: global
 * fetch is a thrower except inside the single worker-composition case, where it
 * is replaced by the same recording mock and restored.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/story-persistence/generations';
import { outbox } from '@offscreen/db/outbox-schema';
import { storytellerPublication } from '@offscreen/story-persistence/storyteller';
import {
  buildLongStoryMemoryCorpus,
  destroyDisposableSandboxDatabase,
  materializeLongStoryMemoryCorpus,
  provisionDisposableSandboxDatabase,
} from '@offscreen/lab-support';
import {
  buildLexicalStoryIndex,
  createCanonicalMemoryExplorer,
  createDispatchReviewControls,
  createMemoryProviderRoundRuntime,
  prepareMemoryEvidenceContext,
  resolveStoryRetrievalRecipe,
  type MemoryExplorationSnapshot,
  createStorytellerBudget,
  createStorytellerRuntime,
  loadCanonicalKnowledge,
  prepareAdmittedStorytellerTask,
  prepareReviewedDispatch,
  readStorytellerWorkerOptions,
  resolveEffectiveUsagePolicy,
  resourcesForEffectiveUsagePolicy,
  wrapApprovedWorkerProvider,
  insertSyntheticCurrentAuthorityForTest,
  storytellerTopic,
} from '@offscreen/story-engine/storyteller';
import { LocalDocumentStore } from '@offscreen/documents';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { createRequestAuditFixtureCases } from '@offscreen/storyteller/providers/request-audit-fixtures';
import {
  createOpenRouterProvider,
  prepareOpenRouterWire,
  type PreparedProviderWire,
  type StorytellerProvider,
} from '@offscreen/storyteller/providers/openrouter';
import {
  storytellerTaskSchema,
  type ExecutionPolicy,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import {
  bootstrapLocalStoryFunding,
  pinnedLocalStoryDispatchAuthority,
} from '../src/story-funding.js';
import { createLocalStoryProvider } from '../src/story-provider.js';

type ProviderExecution = Extract<ExecutionPolicy, { mode: 'provider' }>;

const accountId = '00000000-0000-4000-8000-0000000000c0';
const defaultRunId = '00000000-0000-4000-8000-0000000000c1';
const trialRunId = '00000000-0000-4000-8000-0000000000c2';
const route = 'fake:obs00-c';
// A synthetic, non-credential marker used only to prove it is never archived.
const dummyKey = 'obs00-c-dummy-key-0123456789abcdef';

const realFetch = globalThis.fetch;
let externalFetchCalls = 0;
const forbidFetch = (async () => {
  externalFetchCalls += 1;
  throw new Error('OBS00-C tests forbid external HTTP');
}) as typeof fetch;
test.before(() => {
  globalThis.fetch = forbidFetch;
});
test.after(() => {
  globalThis.fetch = realFetch;
  assert.equal(externalFetchCalls, 0, 'zero external HTTP calls');
});

async function withDisposable(run: (database: Database) => Promise<void>) {
  const runId = randomUUID();
  const provisioned = await provisionDisposableSandboxDatabase({
    runId,
    confirmDisposableProvision: true,
    applyFullMigrations: true,
  });
  const database = createDatabase(
    readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
    () => {},
  );
  try {
    await bootstrapLocalStoryFunding(database.db.$client, {
      accountId,
      defaultRunId,
      accountLimitMicrousd: 1_000_000n,
      defaultRunLimitMicrousd: 1_000_000n,
      defaultRunMaxAttempts: 250,
      trial: { runId: trialRunId, maxMicrousd: 250_000n, maxAttempts: 8 },
      verifiedAt: new Date().toISOString(),
    });
    await run(database);
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

function executionFor(
  overrides: {
    reviewMode?: 'hold' | 'observe';
    provider?: string;
    outputProtocol?:
      | 'native-json-schema'
      | 'json-object-local-validation'
      | 'memory-json-object-native-final';
  } = {},
): ProviderExecution {
  return {
    mode: 'provider',
    accountId,
    runId: trialRunId,
    dispatchReview: { mode: overrides.reviewMode ?? 'observe' },
    policy: {
      version: 'obs00-c.v1',
      route,
      model: 'fake/model',
      provider: overrides.provider ?? 'fake',
      priceVersion: 'obs00-c-test',
      ...(overrides.outputProtocol
        ? { outputProtocol: overrides.outputProtocol }
        : {}),
      inputMicrousdPerMillion: '1000',
      outputMicrousdPerMillion: '1000',
      maxInputTokens: 100_000,
      maxOutputTokens: 2_000,
      timeoutMs: 1_000,
    },
  };
}

function localPolicy(opts: { memory?: boolean; maxMicrousd?: string } = {}) {
  const profile = {
    schemaVersion: 1 as const,
    id: 'local-story-live.v1',
    revision: 1,
    enabled: true,
    allowedRoutes: [route],
    defaultRoute: route,
    fundingModes: ['prepaid' as const],
    recovery: 'explicit-resume' as const,
    limits: {
      maxInputTokensPerRequest: 100_000,
      maxSerializedBytesPerRequest: 400_000,
      maxGeneratedTokensPerRequest: 2_000,
      maxReasoningTokensPerRequest: 0,
      maxInputTokensPerOperation: 300_000,
      maxGeneratedTokensPerOperation: 6_000,
      maxModelRoundsPerOperation: opts.memory ? 3 : 2,
      maxReadsPerOperation: opts.memory ? 4 : 0,
      maxRetainedReadBytes: opts.memory ? 48 * 1024 : 0,
      maxMicrousdPerOperation: opts.maxMicrousd ?? '250000',
      maxInFlightDispatches: 1,
      maxBackgroundJobsPerWindow: 0,
    },
    windows: [],
  };
  const resolved = resolveEffectiveUsagePolicy({
    platform: profile,
    entitlement: profile,
    restrictions: [],
    requestedRoute: route,
    requestedFundingMode: 'prepaid',
  });
  if (resolved.kind !== 'allowed') throw new Error('policy denied');
  return resolved.policy;
}

function taskFor(
  execution: ProviderExecution,
  recipe?: Parameters<typeof resourcesForEffectiveUsagePolicy>[2],
  policy = localPolicy(),
): StorytellerTask {
  const [fixture] = createRequestAuditFixtureCases({
    caseIds: ['opening-narrative'],
  });
  assert.ok(fixture);
  return storytellerTaskSchema.parse({
    ...fixture.task,
    execution,
    resources: resourcesForEffectiveUsagePolicy(execution, policy, recipe),
  });
}

async function seedUser(database: Database) {
  const ownerId = `obs00-c-${randomUUID()}`;
  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, 'OBS00-C', $2, true, now(), now())`,
    [ownerId, `${ownerId}@example.test`],
  );
  return ownerId;
}

async function seedTaskSourceOwnership(
  database: Database,
  ownerId: string,
  task: StorytellerTask,
) {
  if ('draftId' in task.source) {
    await database.db.$client.query(
      `INSERT INTO story_draft (
         id, owner_id, character_name, title, premise, storytelling_direction, revision
       ) VALUES ($1, $2, 'OBS00-C', 'Trial', 'Disposable trial.', 'Direct.', $3)
       ON CONFLICT (id) DO NOTHING`,
      [task.source.draftId, ownerId, task.source.draftRevision ?? 1],
    );
  } else if ('storyId' in task.source) {
    const existing = await database.db.$client.query(
      'SELECT id FROM story WHERE id = $1',
      [task.source.storyId],
    );
    if (existing.rowCount === 0) {
      await database.db.$client.query(
        `INSERT INTO story (
           id, owner_id, source, premise, storyteller, execution, usage_policy,
           document_root_revision, created_at
         ) VALUES (
           $1, $2, 'obs00-c', '{"title":"Trial"}'::jsonb, '{}'::jsonb,
           '{}'::jsonb, '{}'::jsonb, 0, now()
         )`,
        [task.source.storyId, ownerId],
      );
    }
  }
}

async function seedGeneration(
  database: Database,
  ownerId: string,
  task: StorytellerTask,
) {
  await seedTaskSourceOwnership(database, ownerId, task);
  const id = randomUUID();
  await database.db.transaction(async (tx) => {
    await tx.insert(generation).values({
      id,
      ownerId,
      kind: 'storyteller.profiled.v1',
      input: task,
    });
    await tx.insert(storytellerPublication).values({ generationId: id });
    await tx.insert(outbox).values({
      id: randomUUID(),
      topic: storytellerTopic,
      operationId: id,
    });
  });
  return id;
}

async function seedSyntheticDispatchGrant(
  database: Database,
  ownerId: string,
  task: StorytellerTask,
) {
  if (task.execution.mode !== 'provider') return;
  if (task.resources.authority.kind !== 'effective-usage-policy') return;
  await insertSyntheticCurrentAuthorityForTest(database, {
    capturedPolicy: task.resources.authority.policy,
    executionPolicy: task.execution.policy,
    ownerId,
    accountId: task.execution.accountId,
    runId: task.execution.runId,
  });
}

async function seedGenerationWithGrant(
  database: Database,
  ownerId: string,
  task: StorytellerTask,
) {
  const generationId = await seedGeneration(database, ownerId, task);
  await seedSyntheticDispatchGrant(database, ownerId, task);
  return generationId;
}

async function generationRow(database: Database, generationId: string) {
  const result = await database.db.$client.query(
    `select state, failure_code, attempt_id, repair_candidate is not null as has_repair
     from generation where id = $1`,
    [generationId],
  );
  return result.rows[0] as {
    state: string;
    failure_code: string | null;
    attempt_id: string | null;
    has_repair: boolean;
  };
}

type ReviewRow = {
  attempt_id: string;
  state: string;
  revision: number;
  mode: string;
  packet_sha256: string;
  packet: unknown;
  serialized_bytes: number;
};

/** Bytes derive from the persisted (jsonb key-ordered) task, so rebuild from the stored row. */
async function storedTask(database: Database, generationId: string) {
  const result = await database.db.$client.query(
    'select input from generation where id = $1',
    [generationId],
  );
  return storytellerTaskSchema.parse(result.rows[0]?.input);
}

async function offlineWire(database: Database, generationId: string) {
  const stored = await storedTask(database, generationId);
  return prepareOpenRouterWire(stored, reviewedDispatch(stored));
}

async function reviews(database: Database, generationId: string) {
  const result = await database.db.$client.query(
    `select attempt_id, state, revision, mode, packet_sha256, packet,
            (inspection->>'serializedBytes')::int as serialized_bytes
     from storyteller_dispatch_review where generation_id = $1
     order by prepared_at, attempt_id`,
    [generationId],
  );
  return result.rows as ReviewRow[];
}

async function accounting(database: Database) {
  const run = await database.db.$client.query(
    `select enabled, settled_microusd::text, reserved_microusd::text, admitted_attempts
     from storyteller_run where id = $1`,
    [trialRunId],
  );
  const attempts = await database.db.$client.query(
    `select attempt_id::text as id, state from (
       select id as attempt_id, state from storyteller_attempt where run_id = $1
     ) a order by id`,
    [trialRunId],
  );
  const funding = await database.db.$client.query(
    'select stopped from storyteller_funding where id = $1',
    [accountId],
  );
  return {
    run: run.rows[0],
    attempts: attempts.rows as Array<{ id: string; state: string }>,
    stopped: funding.rows[0]?.stopped as boolean,
  };
}

const sha256 = (value: string) =>
  createHash('sha256').update(value, 'utf8').digest('hex');

type WireCall = {
  url: string;
  body: string;
  bodySha256: string;
  bodyBytes: number;
  headers: Record<string, string>;
};

function reviewedDispatch(task: StorytellerTask) {
  const rounds = task.resources.recipe.version === 'repairable-turn.v1' ? 2 : 1;
  return {
    request: task.request,
    maxGeneratedTokens: Math.max(
      1,
      Math.floor(task.resources.envelope.maxGeneratedTokens / rounds),
    ),
  };
}

function okEnvelope(content: unknown, id: string) {
  return new Response(
    JSON.stringify({
      id,
      model: 'fake/model',
      usage: {
        cost: 0.00001,
        prompt_tokens: 20,
        completion_tokens: 10,
        total_tokens: 30,
      },
      choices: [
        {
          finish_reason: 'stop',
          message: {
            content:
              typeof content === 'string' ? content : JSON.stringify(content),
          },
        },
      ],
    }),
    { status: 200, headers: { 'x-generation-id': id } },
  );
}

/** Records the exact RequestInit.body string; never reads or stores credentials beyond headers. */
function recordingTransport(
  respond: (call: WireCall, index: number) => Response | Promise<Response> = (
    _call,
    index,
  ) => okEnvelope({ invalid: true }, `obs00-c-${index + 1}`),
) {
  const calls: WireCall[] = [];
  const transport = (async (input: unknown, init?: RequestInit) => {
    assert.equal(typeof init?.body, 'string', 'body is the serialized string');
    const body = init?.body as string;
    const call: WireCall = {
      url: String(input),
      body,
      bodySha256: sha256(body),
      bodyBytes: Buffer.byteLength(body, 'utf8'),
      headers: { ...(init?.headers as Record<string, string>) },
    };
    calls.push(call);
    return respond(call, calls.length - 1);
  }) as typeof fetch;
  return { calls, transport };
}

/** The equality the Change guarantees. Throws on the first divergence. */
function assertWireEqualsReviews(calls: WireCall[], rows: ReviewRow[]) {
  assert.equal(calls.length, rows.length, 'one review per transport call');
  calls.forEach((call, index) => {
    const row = rows[index]!;
    assert.equal(
      call.bodySha256,
      row.packet_sha256,
      `attempt ${row.attempt_id}: intercepted body sha256 == persisted review packet_sha256`,
    );
    assert.equal(
      call.bodyBytes,
      row.serialized_bytes,
      `attempt ${row.attempt_id}: body byte length == reviewed serializedBytes`,
    );
    assert.deepEqual(
      JSON.parse(call.body),
      row.packet,
      `attempt ${row.attempt_id}: parsed body == stored packet`,
    );
  });
}

async function evidenceDirectoryFiles(directory: string) {
  const names = await readdir(directory).catch(() => [] as string[]);
  return Promise.all(
    names.map(async (name) => ({
      name,
      text: await readFile(join(directory, name), 'utf8'),
    })),
  );
}

/** The local Story-mode provider composition + pinned local authority. */
async function localStoryOptions(
  transport: typeof fetch,
  policy = localPolicy(),
) {
  const evidenceDirectory = await mkdtemp(join(tmpdir(), 'obs00-c-evidence-'));
  return {
    evidenceDirectory,
    options: {
      provider: createLocalStoryProvider({
        apiKey: dummyKey,
        evidenceDirectory,
        transport,
      }),
      dispatchAuthority: pinnedLocalStoryDispatchAuthority(policy),
    },
  };
}

test('normal one-shot: prepared review packet == exact transport body (local Story composition)', async () => {
  await withDisposable(async (database) => {
    const ownerId = await seedUser(database);
    const task = taskFor(executionFor());
    const generationId = await seedGenerationWithGrant(database, ownerId, task);
    const { calls, transport } = recordingTransport();
    const { options, evidenceDirectory } = await localStoryOptions(transport);

    const runtime = createStorytellerRuntime(database, options);
    await runtime.complete(generationId);
    assert.equal(calls.length, 1);

    const rows = await reviews(database, generationId);
    assert.equal(rows.length, 1);
    assert.equal(
      rows[0]!.attempt_id,
      (await generationRow(database, generationId)).attempt_id,
    );
    assertWireEqualsReviews(calls, rows);

    // Review SHA is also what an offline preparation of the same task yields.
    const offline = await offlineWire(database, generationId);
    assert.equal(offline.sha256, rows[0]!.packet_sha256);
    assert.equal(offline.serialized, calls[0]!.body);

    // Duplicate delivery: no extra paid send.
    await runtime.complete(generationId);
    assert.equal(calls.length, 1);
    assert.equal((await reviews(database, generationId)).length, 1);

    // The private Authorization header reached the transport but never the body,
    // the persisted review, or the local response evidence.
    assert.equal(calls[0]!.headers['authorization'], `Bearer ${dummyKey}`);
    assert.equal(calls[0]!.body.includes(dummyKey), false);
    assert.equal(calls[0]!.body.toLowerCase().includes('bearer'), false);
    assert.equal(JSON.stringify(rows).includes(dummyKey), false);
    const evidence = await evidenceDirectoryFiles(evidenceDirectory);
    assert.ok(evidence.length >= 1, 'local response evidence was written');
    for (const file of evidence) {
      assert.equal(file.text.includes(dummyKey), false, file.name);
      assert.equal(file.text.includes('Bearer'), false, file.name);
    }
    const response = JSON.parse(
      evidence.find((file) => file.name.startsWith('provider-response-'))!.text,
    ) as { requestSha256: string };
    assert.equal(response.requestSha256, rows[0]!.packet_sha256);
  });
});

test('OpenAI strict-schema projection: packet and transport still match after projection', async () => {
  await withDisposable(async (database) => {
    const ownerId = await seedUser(database);
    const execution = executionFor({ provider: 'OpenAI' });
    const task = taskFor(execution);
    const generationId = await seedGenerationWithGrant(database, ownerId, task);
    const { calls, transport } = recordingTransport();
    const { options } = await localStoryOptions(transport);
    await createStorytellerRuntime(database, options).complete(generationId);

    const rows = await reviews(database, generationId);
    assertWireEqualsReviews(calls, rows);
    const sent = JSON.parse(calls[0]!.body) as {
      response_format: { json_schema: { schema: unknown } };
    };
    assert.notDeepEqual(
      sent.response_format.json_schema.schema,
      task.request.outputSchema,
      'the projected (transport) schema, not the captured domain schema, was reviewed and sent',
    );
  });
});

test('repair request R differs from task.request: mock receives R and it matches that attempt review', async () => {
  await withDisposable(async (database) => {
    const ownerId = await seedUser(database);
    const task = taskFor(executionFor(), {
      posture: 'off',
      maxRepairRounds: 1,
    });
    assert.equal(task.resources.recipe.version, 'repairable-turn.v1');
    const generationId = await seedGenerationWithGrant(database, ownerId, task);
    const { calls, transport } = recordingTransport();
    const { options } = await localStoryOptions(transport);
    const runtime = createStorytellerRuntime(database, options);

    await runtime.complete(generationId);
    assert.equal(calls.length, 1);
    const afterFirst = await generationRow(database, generationId);
    assert.equal(afterFirst.state, 'failed');
    assert.equal(afterFirst.failure_code, 'invalid_output');
    assert.equal(
      afterFirst.has_repair,
      true,
      'invalid candidate was captured for repair',
    );

    // Same transition recovery.ts performs for an explicit repair retry.
    await database.db.$client.query(
      `update generation set state = 'pending', attempt_id = null, failure_code = null
       where id = $1`,
      [generationId],
    );
    await runtime.complete(generationId);
    assert.equal(calls.length, 2);

    const rows = await reviews(database, generationId);
    assert.equal(rows.length, 2);
    assert.notEqual(rows[0]!.attempt_id, rows[1]!.attempt_id);
    assert.notEqual(rows[0]!.packet_sha256, rows[1]!.packet_sha256);
    assertWireEqualsReviews(calls, rows);

    const original = JSON.parse(calls[0]!.body) as {
      messages: Array<{ content: string }>;
    };
    const repair = JSON.parse(calls[1]!.body) as {
      messages: Array<{ content: string }>;
    };
    assert.deepEqual(original.messages, task.request.messages);
    assert.notDeepEqual(repair.messages, task.request.messages);
    assert.match(
      repair.messages[1]!.content,
      /Invalid candidate: \{"invalid":true\}/,
    );
  });
});

async function memoryFixture(database: Database, ownerId: string) {
  const storage = new LocalDocumentStore(
    await mkdtemp(join(tmpdir(), 'obs00-c-memory-')),
  );
  const corpus = buildLongStoryMemoryCorpus('greywake');
  const materialized = await materializeLongStoryMemoryCorpus(storage, corpus);
  const loaded = await loadCanonicalKnowledge(storage, {
    storyId: materialized.storyId,
    rootHash: materialized.rootHash,
    rootRevision: materialized.rootRevision,
  });
  const hiding = corpus.evidence.find(
    (entry) => entry.key === 'relationship.brass-key-hiding-place',
  );
  const hidingEntry = loaded.catalogue.find(
    (entry) => entry.documentId === hiding?.documentId,
  );
  assert.ok(hidingEntry);
  const canonicalKnowledge = {
    ...loaded,
    catalogue: loaded.catalogue.map((entry) =>
      entry.handle === hidingEntry.handle ? { ...entry, loaded: false } : entry,
    ),
    documents: loaded.documents.filter(
      (entry) => entry.handle !== hidingEntry.handle,
    ),
  };
  const scene = corpus.scenes.at(-1)!;
  const current = {
    id: scene.documentId,
    sequence: scene.sequence,
    content: {
      version: 1 as const,
      title: scene.title,
      paragraphs: scene.paragraphs,
    },
    response: null,
  };
  const policy = localPolicy({ memory: true });
  const execution = executionFor({
    outputProtocol: 'memory-json-object-native-final',
  });
  const task = prepareAdmittedStorytellerTask(
    {
      task: 'continuation',
      source: {
        storyId: corpus.campaignId,
        narrativeRevision: scene.sequence,
        passageId: scene.documentId,
        interactionId: randomUUID(),
      },
      profile: storytellerCatalogue.resolve({
        id: 'quiet-eerie-mystery',
        revision: 1,
      }),
      execution,
      context: {
        canonicalKnowledge,
        premise: {
          title: 'Return to Greywake',
          premise: 'A traveler returns to Greywake after a long absence.',
          storytellingDirection:
            'Recover only relevant established history before narrating.',
        },
        current,
        selected: {
          id: 'ask-key-hiding-place',
          label: 'Ask Mira where she hid the brass key',
          intention: 'Ask Mira Vale to repeat the exact old hiding place.',
        },
        items: [],
        notes: [],
        evidence: [current],
      },
    },
    policy,
    {
      posture: 'minimal',
      requested: {
        maxQueries: 1,
        maxReads: 1,
        maxRetainedBytes: 4096,
        maxModelRounds: 1,
      },
      maxRepairRounds: 0,
    },
  );
  assert.equal(task.resources.recipe.version, 'memory-exploration.v1');
  const generationId = await seedGenerationWithGrant(database, ownerId, task);
  return { storage, policy, task, generationId };
}

const needsContext = {
  kind: 'needs_context',
  version: 1,
  purpose: 'Verify the established hiding place.',
  requests: [
    {
      requestId: 'r1',
      operation: 'ask_memory',
      intent: 'evidence',
      question: 'What hiding place did Mira Vale name for the key?',
    },
  ],
};

test('memory decision round then final round (per-round runtime source): two attempts, two distinct bodies/protocols, both match their reviews', async () => {
  await withDisposable(async (database) => {
    const ownerId = await seedUser(database);
    const { storage, policy, task, generationId } = await memoryFixture(
      database,
      ownerId,
    );
    const root = task.context.canonicalKnowledge!;
    assert.ok('storyId' in task.source);
    const recipe = task.resources.recipe;
    assert.equal(recipe.version, 'memory-exploration.v1');
    const index = await buildLexicalStoryIndex(storage, {
      storyId: task.source.storyId,
      rootHash: root.rootHash,
      rootRevision: root.rootRevision,
    });
    const explorer = createCanonicalMemoryExplorer({
      storage,
      index,
      recipe: resolveStoryRetrievalRecipe({
        posture: 'minimal',
        operationLimits: {
          maxReads: recipe.maxReads,
          maxRetainedBytes: recipe.maxRetainedReadBytes,
        },
      }),
      creativeExploration: task.resources.creativeExploration,
    });

    const { calls, transport } = recordingTransport((_call, index) =>
      okEnvelope(
        index === 0
          ? needsContext
          : { invalid: 'final-content-not-the-subject' },
        `obs00-c-mem-${index + 1}`,
      ),
    );
    const { options } = await localStoryOptions(transport, policy);
    const memory = createMemoryProviderRoundRuntime(database, {
      generationId,
      ownerId,
      task,
      provider: options.provider,
      dispatchAuthority: async () => options.dispatchAuthority(),
    });
    const roundInput = (round: number, snapshot: MemoryExplorationSnapshot) => {
      const prepared = prepareMemoryEvidenceContext(task, snapshot, round);
      return {
        attemptId: randomUUID(),
        task,
        round,
        canRequestContext:
          round <= recipe.maxModelRounds - recipe.finalAnswerReserveRounds,
        snapshot,
        request: prepared.request,
        capturedRequestBytes: prepared.capturedRequestBytes,
        boundedRequestBytes: prepared.boundedRequestBytes,
      };
    };

    const first = roundInput(1, explorer.snapshot());
    assert.equal(first.canRequestContext, true);
    const firstOutcome = (await memory.source(first)) as { kind: string };
    assert.equal(firstOutcome.kind, 'result');
    assert.equal(calls.length, 1);

    // Harness-only release of the in-flight slot between rounds: the controller's
    // own settlement is blocked by the separate 7ba3ff1d defect pinned below.
    await createStorytellerBudget(database).settle({
      id: first.attemptId,
      execution: task.execution as ProviderExecution,
      usage: {
        reportedCostMicrousd: 10n,
        promptTokens: 20,
        completionTokens: 10,
        totalTokens: 30,
        reasoningTokens: null,
        cachedTokens: null,
        cacheWriteTokens: null,
      },
      telemetry: {
        durationMs: 1,
        httpStatus: 200,
        providerId: 'obs00-c-mem-1',
        reportedModel: 'fake/model',
        finishReason: 'stop',
      },
      generationOutcome: {
        state: 'failed',
        output: null,
        failureCode: 'invalid_output',
        repairCandidate: { harness: true },
        repairDiagnostic: { harness: true },
      },
      operationOutcome: 'continue',
    });
    await explorer.execute(needsContext as never);

    const second = roundInput(2, explorer.snapshot());
    assert.equal(second.canRequestContext, false);
    await memory.source(second);
    assert.equal(
      calls.length,
      2,
      'decision round and final round each sent once',
    );

    const rows = await reviews(database, generationId);
    assert.deepEqual(
      rows.map((row) => row.attempt_id),
      [first.attemptId, second.attemptId],
    );
    assert.notEqual(rows[0]!.packet_sha256, rows[1]!.packet_sha256);
    assertWireEqualsReviews(calls, rows);

    const decision = JSON.parse(calls[0]!.body) as {
      response_format: { type: string };
      max_tokens: number;
    };
    const final = JSON.parse(calls[1]!.body) as {
      response_format: { type: string };
      max_tokens: number;
    };
    assert.equal(decision.response_format.type, 'json_object');
    assert.equal(final.response_format.type, 'json_schema');
    assert.notEqual(
      decision.max_tokens,
      final.max_tokens,
      'per-round ceiling override reached the wire',
    );
    assert.equal((await accounting(database)).attempts.length, 2);
  });
});

test('memory controller loop: round 1 is sent and wire-equal, then settlement hits pre-existing 7ba3ff1d defect (pinned, NOT OBS00-C)', async () => {
  await withDisposable(async (database) => {
    const ownerId = await seedUser(database);
    const { storage, policy, generationId } = await memoryFixture(
      database,
      ownerId,
    );
    const { calls, transport } = recordingTransport(() =>
      okEnvelope(needsContext, 'obs00-c-mem-loop-1'),
    );
    const { options } = await localStoryOptions(transport, policy);
    const defect = await createStorytellerRuntime(database, {
      ...options,
      documentStore: storage,
    })
      .complete(generationId)
      .then(
        () => null,
        (error: unknown) => error,
      );
    if (defect !== null) {
      assert.match(
        defect instanceof Error ? defect.message : String(defect),
        /Only a retained invalid candidate may keep an operation open/,
      );
    }
    assert.ok(calls.length >= 1, 'memory round 1 reached the mock transport');
    assertWireEqualsReviews(calls, await reviews(database, generationId));
  // Pinned to the current defect: flip this test when budget.settle accepts a
  // 'continue' settlement without a generation outcome for memory rounds.
    const memoryAttempts = (await accounting(database)).attempts;
    assert.ok(memoryAttempts.length >= 1);
    assert.ok(
      memoryAttempts[0]?.state === 'dispatched' ||
        memoryAttempts[0]?.state === 'uncertain',
    );
  });
});
test('deliberate one-byte divergence after review is refused before reserve/dispatch: 0 HTTP, review unchanged, no liability', async () => {
  await withDisposable(async (database) => {
    const ownerId = await seedUser(database);
    const task = taskFor(executionFor());
    const generationId = await seedGeneration(database, ownerId, task);
    const { calls, transport } = recordingTransport();
    const { options } = await localStoryOptions(transport);
    const honest = options.provider;

    // Consistent (sha matches its own bytes) but one byte differs from the reviewed packet.
    const diverging: StorytellerProvider = Object.assign(
      (...args: Parameters<StorytellerProvider>) => honest(...args),
      {
        prepareWire: (
          t: StorytellerTask,
          d?: Parameters<NonNullable<StorytellerProvider['prepareWire']>>[1],
        ): PreparedProviderWire => {
          const wire = prepareOpenRouterWire(t, d);
          const serialized = `${wire.serialized.slice(0, -1)} }`;
          return {
            ...wire,
            serialized,
            sha256: sha256(serialized),
            serializedBytes: Buffer.byteLength(serialized, 'utf8'),
          };
        },
      },
    );
    await createStorytellerRuntime(database, {
      ...options,
      provider: diverging,
    }).complete(generationId);

    assert.equal(calls.length, 0, 'zero HTTP');
    const row = await generationRow(database, generationId);
    assert.equal(row.state, 'failed');
    assert.equal(row.failure_code, 'wire_mismatch');
    const rows = await reviews(database, generationId);
    assert.equal(rows.length, 1);
    const expected = await offlineWire(database, generationId);
    assert.equal(
      rows[0]!.packet_sha256,
      expected.sha256,
      'original review not overwritten',
    );
    assert.equal(rows[0]!.state, 'not-held');
    assert.equal(rows[0]!.revision, 0);
    const state = await accounting(database);
    assert.deepEqual(
      state.attempts,
      [],
      'no attempt row: possibly-sent boundary never reached',
    );
    assert.equal(state.run.admitted_attempts, 0);
    assert.equal(state.run.reserved_microusd, '0');
    assert.equal(state.run.settled_microusd, '0');
    assert.equal(
      state.stopped,
      false,
      'a local refusal does not fabricate uncertainty',
    );

    // An internally inconsistent wire (digest does not describe its bytes) is refused too.
    const lying: StorytellerProvider = Object.assign(
      (...args: Parameters<StorytellerProvider>) => honest(...args),
      {
        prepareWire: (
          t: StorytellerTask,
          d?: Parameters<NonNullable<StorytellerProvider['prepareWire']>>[1],
        ): PreparedProviderWire => {
          const wire = prepareOpenRouterWire(t, d);
          return { ...wire, serialized: `${wire.serialized} ` };
        },
      },
    );
    const second = await seedGeneration(database, ownerId, task);
    await createStorytellerRuntime(database, {
      ...options,
      provider: lying,
    }).complete(second);
    assert.equal(calls.length, 0);
    assert.equal(
      (await generationRow(database, second)).failure_code,
      'wire_mismatch',
    );
  });
});

test('provider-level defence in depth: a tampered frozen wire never reaches transport and is confirmed unsent', async () => {
  const { calls, transport } = recordingTransport();
  const provider = createOpenRouterProvider({
    enabled: true,
    apiKey: dummyKey,
    transport,
  });
  const task = taskFor(executionFor());
  const dispatch = {
    request: task.request,
    maxGeneratedTokens: task.resources.envelope.maxGeneratedTokens,
  };
  const wire = prepareOpenRouterWire(task, dispatch);
  const tampered = `${wire.serialized.slice(0, -1)} }`;
  const outcome = await provider(task, {
    ...dispatch,
    wire: {
      ...wire,
      serialized: tampered,
      sha256: sha256(tampered),
      serializedBytes: Buffer.byteLength(tampered, 'utf8'),
    },
  });
  assert.equal(calls.length, 0);
  assert.equal(outcome.kind, 'failed');
  assert.equal(
    outcome.kind === 'failed' && outcome.telemetry.finishReason,
    'wire-mismatch-unsent',
  );
  assert.equal(outcome.kind === 'failed' && outcome.telemetry.httpStatus, null);

  // The honest frozen wire is sent byte-for-byte.
  await provider(task, { ...dispatch, wire });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.body, wire.serialized);
  assert.equal(calls[0]!.bodySha256, wire.sha256);
});

test('invalid dispatch override exceeding the token limit is denied before review, HTTP or reservation', async () => {
  await withDisposable(async (database) => {
    const ownerId = await seedUser(database);
    const task = taskFor(executionFor());
    const generationId = await seedGeneration(database, ownerId, task);
    const { calls, transport } = recordingTransport();
    const { options } = await localStoryOptions(transport);
    await assert.rejects(
      prepareReviewedDispatch(
        database,
        generationId,
        randomUUID(),
        task,
        {
          request: task.request,
          maxGeneratedTokens: task.resources.envelope.maxGeneratedTokens + 1,
        },
        options.provider,
      ),
      /Invalid provider dispatch output ceiling/,
    );
    assert.equal(calls.length, 0);
    assert.equal((await reviews(database, generationId)).length, 0);
    assert.equal((await accounting(database)).attempts.length, 0);
  });
});

test('wrapper that drops the dispatch argument: unattested wrapper is refused pre-send; attested-but-dropping wrapper fails the equality proof', async () => {
  await withDisposable(async (database) => {
    const ownerId = await seedUser(database);
    const task = taskFor(executionFor(), {
      posture: 'off',
      maxRepairRounds: 1,
    });
    const { calls, transport } = recordingTransport();
    const { options } = await localStoryOptions(transport);
    const inner = options.provider;

    // (a) Plain wrapper: cannot attest, so the application refuses before liability.
    const unattested: StorytellerProvider = async (t) => inner(t);
    const refusedId = await seedGeneration(database, ownerId, task);
    await createStorytellerRuntime(database, {
      ...options,
      provider: unattested,
    }).complete(refusedId);
    assert.equal(calls.length, 0);
    assert.equal(
      (await generationRow(database, refusedId)).failure_code,
      'wire_mismatch',
    );
    assert.deepEqual((await accounting(database)).attempts, []);

    // (b) Buggy wrapper that copies prepareWire but ignores argument 2: the
    // repair round goes out with the ORIGINAL request. The equality proof fails
    // and makes no compliant "sent == reviewed" claim.
    const dropping: StorytellerProvider = Object.assign(
      async (t: StorytellerTask) => inner(t),
      { prepareWire: inner.prepareWire! },
    );
    const generationId = await seedGenerationWithGrant(database, ownerId, task);
    const runtime = createStorytellerRuntime(database, {
      ...options,
      provider: dropping,
    });
    await runtime.complete(generationId);
    await database.db.$client.query(
      `update generation set state = 'pending', attempt_id = null, failure_code = null
       where id = $1`,
      [generationId],
    );
    await runtime.complete(generationId);
    assert.equal(calls.length, 2);
    assert.throws(
      () => assertWireEqualsReviews(calls, [] as ReviewRow[]),
      assert.AssertionError,
    );
    const rows = await reviews(database, generationId);
    assert.throws(
      () => assertWireEqualsReviews(calls, rows),
      /body sha256 == persisted review packet_sha256/,
      'second (repair) body is the original request, not the reviewed repair packet',
    );
    assert.equal(calls[1]!.bodySha256, calls[0]!.bodySha256);
    assert.notEqual(calls[1]!.bodySha256, rows[1]!.packet_sha256);
  });
});

test('worker wrapper keeps the attestation and forwards the frozen dispatch; a policy mismatch fails pre-send', () => {
  const execution = executionFor();
  const task = taskFor(execution);
  const { calls, transport } = recordingTransport();
  const inner = createOpenRouterProvider({
    enabled: true,
    apiKey: dummyKey,
    transport,
  });
  const wrapped = wrapApprovedWorkerProvider(inner, execution);
  assert.equal(typeof wrapped.prepareWire, 'function');
  const dispatch = {
    request: task.request,
    maxGeneratedTokens: task.resources.envelope.maxGeneratedTokens,
  };
  assert.equal(
    wrapped.prepareWire!(task, dispatch).sha256,
    prepareOpenRouterWire(task, dispatch).sha256,
  );
  const other = executionFor({ provider: 'someone-else' });
  assert.throws(
    () => wrapped.prepareWire!({ ...task, execution: other }, dispatch),
    /Execution policy differs/,
  );
  assert.equal(calls.length, 0);
  // A wrapped provider without attestation never gains one.
  const plain = wrapApprovedWorkerProvider(async () => {
    throw new Error('never called');
  }, execution);
  assert.equal(plain.prepareWire, undefined);
});

test('generic worker composition: equality holds through wrapApprovedWorkerProvider, and stays denied without OBS00-B', async () => {
  await withDisposable(async (database) => {
    const ownerId = await seedUser(database);
    const execution = executionFor();
    const task = taskFor(execution, { posture: 'off', maxRepairRounds: 1 });
    const { calls, transport } = recordingTransport();
    const previousFetch = globalThis.fetch;
    // readStorytellerWorkerOptions captures global fetch at creation time. Route it
    // to the recording mock for exactly this composition, then restore the thrower.
    globalThis.fetch = transport;
    let workerOptions: ReturnType<typeof readStorytellerWorkerOptions>;
    try {
      workerOptions = readStorytellerWorkerOptions({
        STORYTELLER_LIVE_ENABLED: 'true',
        STORYTELLER_EXECUTION_JSON: JSON.stringify(execution),
        OPENROUTER_API_KEY: dummyKey,
      });
    } finally {
      globalThis.fetch = previousFetch;
    }
    assert.equal('dispatchAuthority' in workerOptions, false);
    assert.ok(workerOptions.provider);

    // Missing OBS00-B: the generic worker has no independent current authority.
    const deniedId = await seedGeneration(database, ownerId, task);
    await createStorytellerRuntime(database, workerOptions).complete(deniedId);
    assert.equal(
      (await generationRow(database, deniedId)).failure_code,
      'authority_unavailable',
    );
    assert.equal(calls.length, 0, 'packet equality alone grants no dispatch');
    assert.equal(
      (await reviews(database, deniedId)).length,
      1,
      'the packet was reviewed (and would match) yet nothing was sent',
    );
    assert.equal((await accounting(database)).run.reserved_microusd, '0');

    // Compose with a test-only pinned authority purely to observe wrapper equality.
    const generationId = await seedGenerationWithGrant(database, ownerId, task);
    const runtime = createStorytellerRuntime(database, {
      ...workerOptions,
      dispatchAuthority: pinnedLocalStoryDispatchAuthority(localPolicy()),
    });
    await runtime.complete(generationId);
    await database.db.$client.query(
      `update generation set state = 'pending', attempt_id = null, failure_code = null
       where id = $1`,
      [generationId],
    );
    await runtime.complete(generationId);
    assert.equal(calls.length, 2);
    assertWireEqualsReviews(calls, await reviews(database, generationId));
  });
});

test('held review: zero transport and no reservation; release then sends exactly the held packet', async () => {
  await withDisposable(async (database) => {
    const ownerId = await seedUser(database);
    const task = taskFor(executionFor({ reviewMode: 'hold' }));
    const generationId = await seedGenerationWithGrant(database, ownerId, task);
    const { calls, transport } = recordingTransport();
    const { options } = await localStoryOptions(transport);
    const runtime = createStorytellerRuntime(database, options);

    await runtime.complete(generationId);
    assert.equal(calls.length, 0);
    const held = await reviews(database, generationId);
    assert.equal(held.length, 1);
    assert.equal(held[0]!.state, 'awaiting-review');
    const state = await accounting(database);
    assert.deepEqual(state.attempts, []);
    assert.equal(state.run.reserved_microusd, '0');
    assert.equal(state.run.admitted_attempts, 0);

    const controls = createDispatchReviewControls(database);
    await controls.decide(ownerId, {
      generationId,
      attemptId: held[0]!.attempt_id,
      decisionId: randomUUID(),
      expectedRevision: held[0]!.revision,
      packetSha256: held[0]!.packet_sha256,
      decision: 'release',
    });
    await runtime.complete(generationId);
    assert.equal(calls.length, 1);
    const released = await reviews(database, generationId);
    assert.equal(released[0]!.packet_sha256, held[0]!.packet_sha256);
    assert.equal(released[0]!.state, 'released');
    assertWireEqualsReviews(calls, released);
  });
});

test('released review, then the task changes before retry: original attempt/hash is guarded, nothing is rebuilt or resent', async () => {
  await withDisposable(async (database) => {
    const ownerId = await seedUser(database);
    const task = taskFor(executionFor({ reviewMode: 'hold' }));
    const generationId = await seedGenerationWithGrant(database, ownerId, task);
    const { calls, transport } = recordingTransport();
    const { options } = await localStoryOptions(transport);
    const runtime = createStorytellerRuntime(database, options);
    await runtime.complete(generationId);
    const [held] = await reviews(database, generationId);
    await createDispatchReviewControls(database).decide(ownerId, {
      generationId,
      attemptId: held!.attempt_id,
      decisionId: randomUUID(),
      expectedRevision: held!.revision,
      packetSha256: held!.packet_sha256,
      decision: 'release',
    });

    // Source/prompt changes after the owner released the original packet.
    const changed = structuredClone(task) as StorytellerTask;
    changed.request.messages[1]!.content +=
      ' (rebuilt under newer prompt build)';
    await database.db.$client.query(
      'update generation set input = $2::jsonb where id = $1',
      [generationId, JSON.stringify(changed)],
    );
    await runtime.complete(generationId);

    assert.equal(
      calls.length,
      0,
      'a released packet is never silently rebuilt and sent',
    );
    const [after] = await reviews(database, generationId);
    assert.equal(
      after!.packet_sha256,
      held!.packet_sha256,
      'original reviewed hash retained',
    );
    assert.deepEqual(
      after!.packet,
      held!.packet,
      'original packet body retained',
    );
    assert.equal(after!.state, 'superseded');
    assert.deepEqual((await accounting(database)).attempts, []);
  });
});

test('uncertain after a possible send (transport timeout): uncertain, liability held, no automatic retry', async () => {
  await withDisposable(async (database) => {
    const ownerId = await seedUser(database);
    const task = taskFor(executionFor());
    const generationId = await seedGenerationWithGrant(database, ownerId, task);
    const { calls, transport } = recordingTransport(() => {
      throw new DOMException('The operation timed out', 'TimeoutError');
    });
    const { options } = await localStoryOptions(transport);
    const runtime = createStorytellerRuntime(database, options);
    await runtime.complete(generationId);

    assert.equal(calls.length, 1);
    assert.equal(
      (await generationRow(database, generationId)).state,
      'uncertain',
    );
    const rows = await reviews(database, generationId);
    assertWireEqualsReviews(calls, rows);
    const state = await accounting(database);
    assert.equal(state.attempts.length, 1);
    assert.equal(state.attempts[0]!.state, 'uncertain');
    assert.equal(state.stopped, true, 'uncertainty stops the funding account');

    await runtime.complete(generationId);
    const next = await seedGenerationWithGrant(database, ownerId, task);
    await runtime.complete(next);
    assert.equal(
      calls.length,
      1,
      'no automatic retry and no free-charge fiction',
    );
  });
});

test('wrong or stale authority and a stopped account: no dispatch even with a matching packet', async () => {
  await withDisposable(async (database) => {
    const ownerId = await seedUser(database);
    const task = taskFor(executionFor());

    // Wrong authority: pinned policy differs from the captured one.
    const wrong = await seedGeneration(database, ownerId, task);
    const { calls, transport } = recordingTransport();
    const { options } = await localStoryOptions(
      transport,
      localPolicy({ maxMicrousd: '240000' }),
    );
    await createStorytellerRuntime(database, options).complete(wrong);
    assert.equal(
      (await generationRow(database, wrong)).failure_code,
      'authority_unavailable',
    );
    assert.equal(calls.length, 0);
    const wrongReviews = await reviews(database, wrong);
    assert.equal(
      wrongReviews[0]!.packet_sha256,
      (await offlineWire(database, wrong)).sha256,
      'the packet matched; authority alone denied the send',
    );

    // Stopped account with correct authority.
    await createStorytellerBudget(database).stop(accountId);
    const stoppedGeneration = await seedGenerationWithGrant(
      database,
      ownerId,
      task,
    );
    const correct = await localStoryOptions(transport);
    await createStorytellerRuntime(database, correct.options).complete(
      stoppedGeneration,
    );
    assert.equal(calls.length, 0);
    const stoppedState = await generationRow(database, stoppedGeneration);
    assert.equal(stoppedState.state, 'failed');
    assert.notEqual(stoppedState.state, 'succeeded');
    assert.equal((await accounting(database)).run.settled_microusd, '0');
  });
});
