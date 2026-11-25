/**
 * WR11 T05: provider-authorized Writer continuation with injected fake transport.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import test, { type TestContext } from 'node:test';
import { z } from 'zod';
import {
  Client,
  Connection,
  WorkflowExecutionAlreadyStartedError,
} from '@temporalio/client';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { campaign, gameActionExecution } from '@offscreen/story-persistence/campaign';
import { storytellerWriterMission } from '@offscreen/story-persistence/storyteller';
import { createRequire } from 'node:module';
import type * as Drizzle from 'drizzle-orm' with { 'resolution-mode': 'require' };
import { hashCanonicalJson, LocalDocumentStore } from '@offscreen/documents';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '@offscreen/lab-support';
import { narrativeIntentPlanSchema } from '@offscreen/game/narrative-intent';
import { offerSchema } from '@offscreen/game/offers';
import {
  offlineExecution,
  writerMissionCaptureSchema,
  writerRoundOutputJsonSchema,
  type WriterMissionCapture,
} from '@offscreen/storyteller/tasks';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import type {
  PreparedProviderWire,
  ProviderTelemetry,
  ProviderUsage,
} from '@offscreen/storyteller/providers/openrouter';
import type {
  PreparedWriterRoundTransport,
  WriterRoundModelPolicy,
  WriterRoundTransportResult,
} from '@offscreen/storyteller/providers/writer-round-transport';
import { readWriterProviderAuthorizationPolicy } from '@offscreen/storyteller/providers/writer-provider-authorization-policy';
import {
  advanceDurableWriterMissionProviderStep,
  insertWriterMissionParentStep,
  prepareWriterMissionModelStep,
} from '@offscreen/story-engine/storyteller';
import { finalizeSettledWriterSceneRound } from '@offscreen/story-engine/storyteller/writer-round-settled-finalization';
import { WRITER_SCENE_WAKE_TOPIC } from '@offscreen/story-engine/storyteller';
import { writerMissionSceneScopeContinuationSchema } from '@offscreen/storyteller/tasks';
import {
  writerRoundPrivateCustodyContractVersion,
} from '@offscreen/game-authority-protocol/writer-round-private-custody';
import {
  writerSceneRoundFinalizePath,
  writerSceneRoundPlanPath,
} from '@offscreen/game-authority-protocol/writer-scene-round-control';
import { initializeCampaign } from '@offscreen/story-engine/campaign/settings';
import { admitCampaignActionInTransaction } from '@offscreen/story-engine/campaign/actions';
import { settleActionExecution } from '@offscreen/story-engine/campaign/action-executions';
import { saveOfferPlans } from '@offscreen/story-engine/campaign/persistence';
import { createStoryInitialization } from '@offscreen/story-engine/stories/initialization';
import { lockStoryById } from '@offscreen/story-engine/stories/persistence';
import { startExecutionRuntime } from '@offscreen/worker/runtime/execution';
import {
  startWr10bTemporalLabStack,
  wr11ProviderAuthorizedEnv,
  WR10B_GA_CONTROL_TOKEN,
  WR10B_GA_EXECUTOR_TOKEN,
  WR10B_GA_STORY_TOKEN,
  WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
} from './helpers/wr10b-temporal-lab-stack.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const orm: typeof Drizzle = createRequire(import.meta.url)('drizzle-orm');
const { eq } = orm;
const {
  storytellerControlTaskQueue,
  storytellerExecuteTaskQueue,
  writerSceneDistributedWorkflowType,
  writerSceneWorkflowId,
} = await import(
  pathToFileURL(join(repoRoot, 'packages/workflows/dist/contracts.js')).href
);
const { readExecutionWorkerConfig } = await import(
  pathToFileURL(join(repoRoot, 'apps/worker/dist/src/bootstrap/config.js')).href
);
const { buildScriptedOfflineLabFinalDecisionBody } = await import(
  pathToFileURL(
    join(
      repoRoot,
      'apps/worker/dist/src/custody/scripted-offline-lab-writer-round-transport.js',
    ),
  ).href
);
const { createWriterRoundSeam, writerRoundCapturePolicyModeForBootstrap } =
  await import(
    pathToFileURL(
      join(repoRoot, 'apps/game-authority/dist/src/writer-round-control-seam.js'),
    ).href
  );
const { startGameAuthorityServer } = await import(
  pathToFileURL(join(repoRoot, 'apps/game-authority/dist/src/server.js')).href
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
const temporalAddress =
  process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233';
const temporalNamespace = process.env['TEMPORAL_NAMESPACE'] ?? 'default';

const WR11_MODEL = 'test/wr11-integration-model';
const WR11_POLICY = 'wr11.bootstrap.v1';
const providerPinEnv = wr11ProviderAuthorizedEnv(WR11_MODEL, WR11_POLICY);
const providerAuthorization = readWriterProviderAuthorizationPolicy(providerPinEnv);
const providerPolicy = providerAuthorization.policy;
const providerAdmission = providerAuthorization.admission;
const capturePolicyMode = writerRoundCapturePolicyModeForBootstrap(
  WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
);

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

const planA = narrativeIntentPlanSchema.parse({
  kind: 'narrative-intent.v1',
  key: 'option-a',
  label: 'Watch the road',
  intention: 'Study who passes on the road.',
  risk: 'You may be seen watching.',
  fictionalDurationSeconds: 1,
  effects: [],
});

const zeroUsage: ProviderUsage = {
  reportedCostMicrousd: 0n,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  reasoningTokens: null,
  cachedTokens: null,
  cacheWriteTokens: null,
};

const zeroTelemetry: ProviderTelemetry = {
  durationMs: 0,
  httpStatus: null,
  providerId: 'wr11-fake-transport',
  reportedModel: WR11_MODEL,
  finishReason: 'stop',
};

function openingOffer(offerId: string) {
  return offerSchema.parse({
    id: offerId,
    nodes: [
      {
        id: planA.key,
        parent: null,
        label: planA.label,
        description: planA.intention,
        action: {
          kind: 'attempt',
          timing: { kind: 'finite', fictionalSeconds: planA.fictionalDurationSeconds },
        },
      },
    ],
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

function parseV3ContinuationSceneScope(
  wire: PreparedProviderWire,
): z.infer<typeof writerMissionSceneScopeContinuationSchema> | null {
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(wire.serialized) as Record<string, unknown>;
  } catch {
    return null;
  }
  const messages = body['messages'];
  if (!Array.isArray(messages)) {
    return null;
  }
  const userMessage = messages.find(
    (message) =>
      message &&
      typeof message === 'object' &&
      (message as { role?: string }).role === 'user',
  ) as { content?: string } | undefined;
  if (!userMessage || typeof userMessage.content !== 'string') {
    return null;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(userMessage.content);
  } catch {
    return null;
  }
  const pins = (payload as { pins?: { sceneScope?: unknown } })?.pins?.sceneScope;
  const parsed = writerMissionSceneScopeContinuationSchema.safeParse(pins);
  return parsed.success ? parsed.data : null;
}

function createWr11FakePrepareTransport(
  invocationCounter: { count: number },
): (input: {
  capturedWire: PreparedProviderWire;
  pinnedModelPolicy: WriterRoundModelPolicy;
  outputSchema: unknown;
  apiKey: string | undefined;
  fetchImpl: typeof fetch;
}) => PreparedWriterRoundTransport {
  return (input) => {
    const { capturedWire } = input;
    return {
      preflight: () => ({ kind: 'ready', wireSha256: capturedWire.sha256 }),
      invoke: async (): Promise<WriterRoundTransportResult> => {
        invocationCounter.count += 1;
        if (invocationCounter.count > 2) {
          throw new Error(
            `wr11 fake transport refuses invocation ${invocationCounter.count}`,
          );
        }
        if (invocationCounter.count === 1) {
          return {
            kind: 'delivered',
            serializedResponse: round1ToolBody(),
            usage: { ...zeroUsage },
            telemetry: { ...zeroTelemetry },
            exactWireSha256: capturedWire.sha256,
          };
        }
        const sceneScope = parseV3ContinuationSceneScope(capturedWire);
        if (!sceneScope) {
          return {
            kind: 'failed',
            failureCode: 'wire_rejected',
            usage: { ...zeroUsage },
            telemetry: {
              ...zeroTelemetry,
              finishReason: 'wire-rejected',
            },
            exactWireSha256: null,
            sent: false,
          };
        }
        return {
          kind: 'delivered',
          serializedResponse: buildScriptedOfflineLabFinalDecisionBody({
            baseSceneSequence: sceneScope.baseSceneSequence,
          }),
          usage: { ...zeroUsage },
          telemetry: { ...zeroTelemetry },
          exactWireSha256: capturedWire.sha256,
        };
      },
    };
  };
}

function createGaSafeFetch(): typeof fetch {
  return async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const host = new URL(url).hostname;
    if (host !== '127.0.0.1' && host !== 'localhost') {
      throw new Error(`wr11 blocked external network host: ${host}`);
    }
    return fetch(input, init);
  };
}

async function withDisposable(
  prefix: string,
  run: (ctx: {
    database: ReturnType<typeof createDatabase>;
    connectionString: string;
    storageRoot: string;
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
  const connectionString = provisioned.connectionString;
  const database = createDatabase(
    readDatabaseConfig({ DATABASE_URL: connectionString }),
    () => {},
  );
  const storageRoot = await mkdtemp(join(tmpdir(), `${prefix}-cas-`));
  try {
    await run({ database, connectionString, storageRoot });
    return { available: true as const };
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

async function insertUser(
  database: ReturnType<typeof createDatabase>,
  ownerId: string,
) {
  await database.db.$client.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, $2, $3, true, now(), now())`,
    [ownerId, 'WR11-T05', `${ownerId}@example.test`],
  );
}

async function seedWriterGrant(
  database: ReturnType<typeof createDatabase>,
  ownerId: string,
) {
  const accountId = randomUUID();
  const runRowId = randomUUID();
  const grantId = randomUUID();
  await database.db.$client.query(
    `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
     VALUES ($1, 5000000, false, now())`,
    [accountId],
  );
  await database.db.$client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1, $2, 5000000, 6, true)`,
    [runRowId, accountId],
  );
  await database.db.$client.query(
    `INSERT INTO storyteller_current_owner_grant (
       id, revision, user_id, account_id, run_id, entitlement_profile, restrictions, enabled,
       revoked_at, no_expiry, expires_at, requested_route, requested_funding_mode, operator_id,
       approval_identity
     ) VALUES ($1, 1, $2, $3, $4, $5::jsonb, '[]'::jsonb, true, null, true, null, $6, 'prepaid', $7, $8)`,
    [
      grantId,
      ownerId,
      accountId,
      runRowId,
      JSON.stringify({
        schemaVersion: 1,
        id: 'writer-scene-entitlement.v1',
        revision: 1,
        enabled: true,
        allowedRoutes: ['writer:scene'],
        defaultRoute: 'writer:scene',
        fundingModes: ['prepaid'],
        recovery: 'explicit-resume',
        limits: {
          maxInputTokensPerRequest: 8000,
          maxSerializedBytesPerRequest: 65536,
          maxGeneratedTokensPerRequest: 2000,
          maxReasoningTokensPerRequest: 0,
          maxInputTokensPerOperation: 8000,
          maxGeneratedTokensPerOperation: 2000,
          maxModelRoundsPerOperation: 4,
          maxReadsPerOperation: 0,
          maxRetainedReadBytes: 0,
          maxMicrousdPerOperation: '250000',
          maxInFlightDispatches: 1,
          maxBackgroundJobsPerWindow: 0,
        },
        windows: [],
      }),
      'writer:scene',
      'op-writer-scene-wr11',
      'approval-writer-scene-wr11',
    ],
  );
}

async function seedStory(
  database: ReturnType<typeof createDatabase>,
  store: LocalDocumentStore,
  ownerId: string,
) {
  const storyId = randomUUID();
  const offerId = randomUUID();
  const initializeStory = createStoryInitialization(database, store);
  await initializeStory({
    ownerId,
    storyId,
    initial: {
      source: 'playable.opening.v1',
      premise: {
        title: 'WR11 provider continuation',
        premise: 'A road near Seyda Neen.',
        storytellingDirection: 'Grounded.',
      },
      storyteller: profile,
      execution: offlineExecution,
      usagePolicy: null,
      items: [],
      content: {
        version: 1,
        title: 'Scene 1',
        paragraphs: ['Dust hangs over the road.'],
      },
      interaction: {
        kind: 'choice.v1',
        prompt: 'What next?',
        options: [{ id: planA.key, label: planA.label }],
      },
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
    const current = await lockStoryById(tx, storyId);
    const offer = openingOffer(offerId);
    await saveOfferPlans(tx, storyId, current.revision, offerId, [planA]);
    await tx
      .update(campaign)
      .set({
        offer,
        situationAuthorization: {
          version: 2,
          offerId,
          activityAccess: { kind: 'selected', actionKeys: [planA.key] },
          preparedPlans: [],
        },
      })
      .where(eq(campaign.storyId, storyId));
  });
  return { storyId, offerId };
}

async function admitAndSettle(
  database: ReturnType<typeof createDatabase>,
  store: LocalDocumentStore,
  storyId: string,
  offerId: string,
  writerContinuationAdmission = providerAdmission,
) {
  const operationId = randomUUID();
  await database.db.transaction(async (tx) => {
    const current = await lockStoryById(tx, storyId);
    await admitCampaignActionInTransaction(
      tx,
      current,
      {
        operationId,
        expectedRevision: current.revision,
        offerId,
        path: [planA.key],
      },
      { kind: 'player' },
    );
  });
  await database.db.transaction(async (tx) => {
    const current = await lockStoryById(tx, storyId);
    const [execution] = await tx
      .select()
      .from(gameActionExecution)
      .where(eq(gameActionExecution.operationId, operationId));
    assert.ok(execution);
    const [state] = await tx
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, storyId));
    assert.ok(state);
    await settleActionExecution(
      tx,
      current,
      state,
      execution,
      Date.now() + 60_000,
      store,
      writerContinuationAdmission,
    );
  });
  const missions = await database.db
    .select({ id: storytellerWriterMission.id })
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.storyId, storyId));
  assert.equal(missions.length, 1);
  return missions[0]!.id;
}

async function waitForPassageCount(
  database: ReturnType<typeof createDatabase>,
  storyId: string,
  expected: number,
  timeoutMs = 120_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const passages = (
      await database.db.$client.query(
        `SELECT sequence FROM story_passage WHERE story_id = $1 ORDER BY sequence`,
        [storyId],
      )
    ).rows as Array<{ sequence: number }>;
    if (passages.length >= expected) {
      return passages;
    }
    await delay(300);
  }
  throw new Error(
    `Timed out waiting for ${expected} passages on story ${storyId}`,
  );
}

async function missionAttemptStats(
  database: ReturnType<typeof createDatabase>,
  missionId: string,
) {
  const steps = await database.db.$client.query(
    `SELECT attempt_id, result_cas_hash, response_object_hash
     FROM storyteller_writer_step
     WHERE mission_id = $1 AND tool_call_id IS NULL AND attempt_id IS NOT NULL`,
    [missionId],
  );
  const attemptIds = steps.rows
    .map((row) => row.attempt_id as string | null)
    .filter((value): value is string => !!value);
  const uniqueAttempts = new Set(attemptIds);
  let totalCharge = 0n;
  for (const attemptId of uniqueAttempts) {
    const attempt = await database.db.$client.query(
      `SELECT charged_microusd FROM storyteller_attempt WHERE id = $1`,
      [attemptId],
    );
    const charged = attempt.rows[0]?.charged_microusd;
    if (charged != null) {
      totalCharge += BigInt(String(charged));
    }
  }
  return {
    parentStepsWithAttempts: steps.rows.length,
    uniqueAttemptCount: uniqueAttempts.size,
    totalChargeMicrousd: totalCharge,
  };
}

async function executeActivityCount(
  client: Client,
  missionId: string,
): Promise<number> {
  const handle = client.workflow.getHandle(writerSceneWorkflowId(missionId));
  const history = await handle.fetchHistory();
  return (
    history.events?.filter((event) => {
      const attrs = event.activityTaskScheduledEventAttributes;
      if (!attrs) return false;
      return (
        attrs.taskQueue?.name === storytellerExecuteTaskQueue &&
        attrs.activityType?.name === 'executePreparedWriterRound'
      );
    }).length ?? 0
  );
}

function authFetch(
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

async function assertTemporalAvailable(t: TestContext): Promise<boolean> {
  try {
    const connection = await Connection.connect({
      address: temporalAddress,
      connectTimeout: 5_000,
    });
    await connection.close();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `NOT-RUN: local Temporal required at ${temporalAddress}: ${message}`,
    );
    t.skip(`Temporal unavailable at ${temporalAddress}: ${message}`);
    return false;
  }
}

function rehashedMissionCapture(
  capture: WriterMissionCapture,
  patch: Partial<WriterMissionCapture>,
): WriterMissionCapture {
  const merged = { ...capture, ...patch };
  const { capturedRequestHash: _ignored, ...body } = merged;
  return writerMissionCaptureSchema.parse({
    ...body,
    capturedRequestHash: hashCanonicalJson(body),
  });
}

async function insertStorytellerOperationForGeneration(
  database: ReturnType<typeof createDatabase>,
  generationId: string,
  ownerId: string,
  sourceMissionId: string,
) {
  const template = (
    await database.db.$client.query(
      `SELECT account_id, run_id
       FROM storyteller_operation
       WHERE generation_id = (
         SELECT generation_id FROM storyteller_writer_mission WHERE id = $1
       )`,
      [sourceMissionId],
    )
  ).rows[0] as { account_id: string; run_id: string } | undefined;
  assert.ok(template);
  await database.db.$client.query(
    `INSERT INTO storyteller_operation (
       generation_id, account_id, run_id, owner_id, purpose, resources,
       max_model_rounds, max_input_tokens, max_generated_tokens, max_reasoning_tokens, max_microusd, state
     ) VALUES (
       $1, $2, $3, $4, 'writer-scene', '{}'::jsonb,
       4, 8000, 2000, 0, 250000, 'open'
     )`,
    [generationId, template.account_id, template.run_id, ownerId],
  );
}

async function readMissionCapture(
  database: ReturnType<typeof createDatabase>,
  missionId: string,
): Promise<WriterMissionCapture> {
  const row = (
    await database.db.$client.query(
      `SELECT g.input
       FROM storyteller_writer_mission m
       INNER JOIN generation g ON g.id = m.generation_id
       WHERE m.id = $1`,
      [missionId],
    )
  ).rows[0] as { input: { writerMissionCapture?: unknown } } | undefined;
  assert.ok(row);
  return writerMissionCaptureSchema.parse(row.input.writerMissionCapture);
}

test('WR11 T05: connected provider continuation with fake transport (tool then final)', async (t) => {
  const temporalReady = await assertTemporalAvailable(t);
  if (!temporalReady) return;

  const gate = await withDisposable('wr11-connected', async ({
    database,
    connectionString,
    storageRoot,
  }) => {
    const fakeInvocations = { count: 0 };
    const ownerId = randomUUID();
    await insertUser(database, ownerId);
    await seedWriterGrant(database, ownerId);
    const store = new LocalDocumentStore(storageRoot);
    const { storyId, offerId } = await seedStory(database, store, ownerId);

    let stack: Awaited<ReturnType<typeof startWr10bTemporalLabStack>> | undefined;
    let temporalConnection: Connection | undefined;
    try {
      stack = await startWr10bTemporalLabStack(
        database,
        connectionString,
        storageRoot,
        {
          temporalAddress,
          temporalNamespace,
          relayTaskQueue: 'wr11-integration-relay',
          writerExecutionMode: WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED,
          gameAuthorityEnv: { ...providerPinEnv },
          executorEnv: { ...providerPinEnv },
          relayWriterContinuationAdmission: providerAdmission,
          startAdapters: {
            startExecutor: async (config) => {
              const hardened: typeof config = {
                ...config,
                writerRound: {
                  ...config.writerRound,
                  fetchImpl: createGaSafeFetch(),
                  prepareTransport: createWr11FakePrepareTransport(fakeInvocations),
                },
              };
              return startExecutionRuntime(hardened);
            },
          },
        },
      );
      temporalConnection = await Connection.connect({ address: temporalAddress });
      const client = new Client({
        connection: temporalConnection,
        namespace: temporalNamespace,
      });

      const executorConfig = readExecutionWorkerConfig({
        TEMPORAL_ADDRESS: temporalAddress,
        TEMPORAL_NAMESPACE: temporalNamespace,
        GAME_AUTHORITY_ORIGIN: stack.gaOrigin,
        GAME_AUTHORITY_EXECUTOR_TOKEN: WR10B_GA_EXECUTOR_TOKEN,
        ...providerPinEnv,
      });
      assert.equal(executorConfig.writerRound.mode, WRITER_EXECUTION_MODE_PROVIDER_AUTHORIZED);
      assert.equal(executorConfig.writerRound.apiKey, providerPinEnv.OPENROUTER_API_KEY);

      const missionId = await admitAndSettle(database, store, storyId, offerId);

      const capture = await readMissionCapture(database, missionId);
      assert.equal(capture.version, 'writer-mission.v3');
      assert.ok(capture.providerPolicy);
      assert.equal(capture.providerPolicy.model, WR11_MODEL);
      assert.equal(capture.providerPolicy.version, WR11_POLICY);
      assert.equal(capture.modelSelection.model, WR11_MODEL);

      const outboxRow = await database.db.$client.query(
        `SELECT topic, operation_id FROM outbox WHERE id = $1`,
        [missionId],
      );
      assert.equal(outboxRow.rows[0]?.topic, WRITER_SCENE_WAKE_TOPIC);
      assert.equal(outboxRow.rows[0]?.operation_id, missionId);

      const passages = await waitForPassageCount(database, storyId, 2);
      assert.deepEqual(
        passages.map((row) => row.sequence),
        [1, 2],
      );

      const checkpoints = (
        await database.db.$client.query(
          `SELECT scene_sequence FROM story_scene_checkpoint
           WHERE story_id = $1 ORDER BY scene_sequence`,
          [storyId],
        )
      ).rows as Array<{ scene_sequence: number }>;
      assert.deepEqual(
        checkpoints.map((row) => row.scene_sequence),
        [1, 2],
      );

      const toolReceipts = (
        await database.db.$client.query(
          `SELECT count(*)::int AS count
           FROM storyteller_writer_step
           WHERE mission_id = $1 AND tool_call_id IS NOT NULL`,
          [missionId],
        )
      ).rows[0] as { count: number };
      assert.equal(toolReceipts.count, 1);

      assert.equal(fakeInvocations.count, 2);

      const handle = client.workflow.getHandle(writerSceneWorkflowId(missionId));
      const description = await handle.describe();
      assert.equal(description.type, writerSceneDistributedWorkflowType);
      assert.equal(description.status.name, 'COMPLETED');

      const executeCount = await executeActivityCount(client, missionId);
      assert.equal(executeCount, 2);

      const attempts = await missionAttemptStats(database, missionId);
      assert.equal(attempts.uniqueAttemptCount, 2);
      assert.equal(attempts.totalChargeMicrousd, 0n);

      const replayFinalize = await authFetch(
        stack.gaOrigin,
        writerSceneRoundFinalizePath(missionId),
        { method: 'POST', token: WR10B_GA_CONTROL_TOKEN },
      );
      assert.equal(replayFinalize.status, 200);
      const replayBody = (await replayFinalize.json()) as { status: string };
      assert.equal(replayBody.status, 'replayed');
      assert.equal(fakeInvocations.count, 2);

      const passagesAfterReplay = (
        await database.db.$client.query(
          `SELECT sequence FROM story_passage WHERE story_id = $1 ORDER BY sequence`,
          [storyId],
        )
      ).rows as Array<{ sequence: number }>;
      assert.equal(passagesAfterReplay.length, 2);

      let duplicateStarts = 0;
      try {
        await client.workflow.start(writerSceneDistributedWorkflowType, {
          taskQueue: storytellerControlTaskQueue,
          workflowId: writerSceneWorkflowId(missionId),
          args: [missionId],
          workflowIdReusePolicy: 'REJECT_DUPLICATE',
        });
        duplicateStarts += 1;
      } catch (error) {
        if (!(error instanceof WorkflowExecutionAlreadyStartedError)) {
          throw error;
        }
      }
      assert.equal(duplicateStarts, 0);
      assert.equal(await executeActivityCount(client, missionId), 2);
    } catch (error) {
      if (
        error instanceof Error &&
        /ECONNREFUSED|connection refused/i.test(error.message)
      ) {
        t.skip(`Temporal or stack unavailable: ${error.message}`);
        return;
      }
      throw error;
    } finally {
      await stack?.stop();
      await temporalConnection?.close().catch(() => undefined);
    }
  });
  if (!gate?.available) return;
});

test('WR11 T05 negatives: policy mismatch, research.delegate, uncertain dispatch', async (t) => {
  const gate = await withDisposable('wr11-neg', async ({
    database,
    connectionString,
    storageRoot,
  }) => {
    const store = new LocalDocumentStore(storageRoot);
    const ownerId = randomUUID();
    await insertUser(database, ownerId);
    await seedWriterGrant(database, ownerId);
    const { storyId, offerId } = await seedStory(database, store, ownerId);
    const missionId = await admitAndSettle(database, store, storyId, offerId);

    const policyMismatchCounter = { count: 0 };
    const mismatchedEnv = wr11ProviderAuthorizedEnv(
      WR11_MODEL,
      'wr11.policy-mismatch.v1',
    );
    const mismatchedPolicy = readWriterProviderAuthorizationPolicy(mismatchedEnv).policy;
    const mismatchServer = await startGameAuthorityServer({
      seam: {
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
      },
      writerRounds: createWriterRoundSeam(database, store, {
        providerPolicy: mismatchedPolicy,
        capturePolicyMode,
      }),
      token: WR10B_GA_STORY_TOKEN,
      executorToken: WR10B_GA_EXECUTOR_TOKEN,
      controlToken: WR10B_GA_CONTROL_TOKEN,
      timeoutMs: 15_000,
    });
    try {
      const held = await authFetch(
        mismatchServer.origin,
        writerSceneRoundPlanPath(missionId),
        { method: 'POST', token: WR10B_GA_CONTROL_TOKEN },
      );
      assert.equal(held.status, 200);
      const heldBody = (await held.json()) as { status?: string; reason?: string };
      assert.equal(heldBody.status, 'held');
      assert.equal(heldBody.reason, 'model_policy_mismatch');
      assert.equal(policyMismatchCounter.count, 0);
    } finally {
      await mismatchServer.close();
    }

    const capture = await readMissionCapture(database, missionId);
    const researchGenerationId = randomUUID();
    const researchCapture = rehashedMissionCapture(capture, {
      generationId: researchGenerationId,
      operationId: researchGenerationId,
      toolsAllowlist: ['research.delegate'],
    });
    const researchMissionId = randomUUID();
    await database.db.$client.query(
      `INSERT INTO generation (
         id, owner_id, kind, state, input, status_revision
       ) VALUES ($1, $2, 'writer-scene', 'pending', $3::jsonb, 0)`,
      [
        researchGenerationId,
        ownerId,
        JSON.stringify({
          scheduleOperationId: randomUUID(),
          storyId,
          controllingIntentOrReceiptId: randomUUID(),
          writerMissionCapture: researchCapture,
        }),
      ],
    );
    await insertStorytellerOperationForGeneration(
      database,
      researchGenerationId,
      ownerId,
      missionId,
    );
    await insertWriterMissionParentStep(
      database,
      {
        missionId: researchMissionId,
        generationId: researchGenerationId,
        operationId: researchGenerationId,
        ownerId,
        storyId,
        captureSha256: researchCapture.capturedRequestHash,
        libraryRootHash: researchCapture.libraryRootHash,
        libraryRootRevision: researchCapture.libraryRootRevision,
        budgetSnapshot: researchCapture.budgets,
      },
      {
        ordinal: 1,
        requestCasHash: '0'.repeat(64),
        revision: 1,
        state: 'captured',
      },
    );
    const researchPrep = await prepareWriterMissionModelStep(database, store, {
      missionId: researchMissionId,
      ordinal: 1,
      expectedRevision: 1,
      capture: researchCapture,
    });
    const researchAttempt = randomUUID();
    await advanceDurableWriterMissionProviderStep(
      database,
      store,
      {
        missionId: researchMissionId,
        ordinal: 1,
        attemptId: researchAttempt,
        expectedRevision: researchPrep.revision,
        providerPolicy,
        expectedWireSha256: researchPrep.wireSha256,
        reservedMicrousd: 25_000n,
      },
      {
        preflight: () => ({ kind: 'ready', wireSha256: researchPrep.wireSha256 }),
        invoke: async () => ({
          kind: 'delivered',
          serializedResponse: researchDelegateBody(),
          usage: zeroUsage,
          telemetry: zeroTelemetry,
          exactWireSha256: researchPrep.wireSha256,
        }),
      },
    );
    const researchFinalize = await finalizeSettledWriterSceneRound(
      database,
      store,
      {
        missionId: researchMissionId,
        policy: providerPolicy,
        capturePolicyMode,
      },
    );
    assert.deepEqual(researchFinalize, {
      status: 'held',
      reason: 'research_delegate_unsupported',
    });
  const passageCountBefore = (
      await database.db.$client.query(
        `SELECT count(*)::int AS count FROM story_passage WHERE story_id = $1`,
        [storyId],
      )
    ).rows[0] as { count: number };
    assert.equal(passageCountBefore.count, 1);

    const uncertainGenerationId = randomUUID();
    const uncertainCapture = rehashedMissionCapture(capture, {
      generationId: uncertainGenerationId,
      operationId: uncertainGenerationId,
    });
    const uncertainMissionId = randomUUID();
    await database.db.$client.query(
      `INSERT INTO generation (
         id, owner_id, kind, state, input, status_revision
       ) VALUES ($1, $2, 'writer-scene', 'pending', $3::jsonb, 0)`,
      [
        uncertainGenerationId,
        ownerId,
        JSON.stringify({
          scheduleOperationId: randomUUID(),
          storyId,
          controllingIntentOrReceiptId: randomUUID(),
          writerMissionCapture: uncertainCapture,
        }),
      ],
    );
    await insertStorytellerOperationForGeneration(
      database,
      uncertainGenerationId,
      ownerId,
      missionId,
    );
    await insertWriterMissionParentStep(
      database,
      {
        missionId: uncertainMissionId,
        generationId: uncertainGenerationId,
        operationId: uncertainGenerationId,
        ownerId,
        storyId,
        captureSha256: uncertainCapture.capturedRequestHash,
        libraryRootHash: uncertainCapture.libraryRootHash,
        libraryRootRevision: uncertainCapture.libraryRootRevision,
        budgetSnapshot: uncertainCapture.budgets,
      },
      {
        ordinal: 1,
        requestCasHash: '0'.repeat(64),
        revision: 1,
        state: 'captured',
      },
    );
    const uncertainGa = await startGameAuthorityServer({
      seam: {
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
      },
      writerRounds: createWriterRoundSeam(database, store, {
        providerPolicy,
        capturePolicyMode,
      }),
      token: WR10B_GA_STORY_TOKEN,
      executorToken: WR10B_GA_EXECUTOR_TOKEN,
      controlToken: WR10B_GA_CONTROL_TOKEN,
      timeoutMs: 15_000,
    });
    try {
      const custody = createWriterRoundPrivateClient({
        origin: uncertainGa.origin,
        executorToken: WR10B_GA_EXECUTOR_TOKEN,
        timeoutMs: 15_000,
      });
      const uncertainCounter = { count: 0 };
      const uncertainAttempt = randomUUID();
      const uncertainResult = await executePreparedWriterRound(
        {
          missionId: uncertainMissionId,
          ordinal: 1,
          contextId: uncertainMissionId,
          attemptId: uncertainAttempt,
          expectedRevision: 1,
        },
        {
          custody,
          apiKey: providerPinEnv.OPENROUTER_API_KEY,
          outputSchema: writerRoundOutputJsonSchema(),
          fetchImpl: createGaSafeFetch(),
          prepareTransport: (input: {
            capturedWire: PreparedProviderWire;
          }) => ({
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

      const stepBefore = (
        await database.db.$client.query(
          `SELECT attempt_id, revision
           FROM storyteller_writer_step
           WHERE mission_id = $1 AND context_id = $1 AND ordinal = 1 AND tool_call_id IS NULL`,
          [uncertainMissionId],
        )
      ).rows[0] as { attempt_id: string | null; revision: number };
      const retryAttempt = randomUUID();
      assert.notEqual(retryAttempt, stepBefore.attempt_id);
      const retryPrepare = await custody.prepare(uncertainMissionId, 1, {
        contextId: uncertainMissionId,
        attemptId: retryAttempt,
        expectedRevision: stepBefore.revision,
      });
      assert.equal(retryPrepare.status, 'uncertain');
      assert.equal(uncertainCounter.count, 1);
      const stepAfter = (
        await database.db.$client.query(
          `SELECT attempt_id
           FROM storyteller_writer_step
           WHERE mission_id = $1 AND context_id = $1 AND ordinal = 1 AND tool_call_id IS NULL`,
          [uncertainMissionId],
        )
      ).rows[0] as { attempt_id: string | null };
      assert.equal(stepAfter.attempt_id, stepBefore.attempt_id);
    } finally {
      await uncertainGa.close();
    }

    void connectionString;
    void offerId;
  });
  if (!gate?.available) return;
});