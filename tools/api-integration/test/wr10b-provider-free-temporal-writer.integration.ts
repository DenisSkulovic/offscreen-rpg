/**
 * WR10B T04: connected provider-free Writer round through real Temporal executor.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import test, { type TestContext } from 'node:test';
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
import { LocalDocumentStore } from '@offscreen/documents';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '@offscreen/lab-support';
import { narrativeIntentPlanSchema } from '@offscreen/game/narrative-intent';
import { offerSchema } from '@offscreen/game/offers';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { WRITER_SCENE_WAKE_TOPIC } from '@offscreen/story-engine/storyteller';
import {
  writerRoundPrivateCustodyContractVersion,
  writerRoundPrivatePreparePath,
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
import {
  startWr10bTemporalLabStack,
  WR10B_GA_CONTROL_TOKEN,
  WR10B_GA_EXECUTOR_TOKEN,
  WR10B_GA_STORY_TOKEN,
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
const { readExecutionWorkerConfig, forbidBroadDatabaseOnExecutor } = await import(
  pathToFileURL(join(repoRoot, 'apps/worker/dist/src/bootstrap/config.js')).href
);
const { deliverOutboxNotice } = await import(
  pathToFileURL(join(repoRoot, 'apps/worker/dist/src/outbox/dispatch.js')).href
);
const { createWriterRoundSeam } = await import(
  pathToFileURL(join(repoRoot, 'apps/game-authority/dist/src/writer-round-control-seam.js')).href
);
const { scriptedOfflineLabWriterRoundPolicy } = await import(
  pathToFileURL(join(repoRoot, 'apps/game-authority/dist/src/writer-round-lab-policy.js')).href
);
const { startGameAuthorityServer } = await import(
  pathToFileURL(join(repoRoot, 'apps/game-authority/dist/src/server.js')).href
);

const temporalAddress =
  process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233';
const temporalNamespace = process.env['TEMPORAL_NAMESPACE'] ?? 'default';

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

const providerDefaultPolicy = {
  model: 'anthropic/claude-3.5-sonnet',
  provider: 'Anthropic',
  priceVersion: 'wr10b-neg.v1',
  inputMicrousdPerMillion: '3000000',
  outputMicrousdPerMillion: '15000000',
  maxInputTokens: 8192,
  maxOutputTokens: 2048,
  maxModelRounds: 4,
  maxMicrousd: 250_000n,
  timeoutMs: 30_000,
} as const;

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
    [ownerId, 'WR10B-T04', `${ownerId}@example.test`],
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
      'op-writer-scene-wr10b',
      'approval-writer-scene-wr10b',
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
        title: 'WR10B continuation',
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
  storyId: string,
  offerId: string,
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
    await settleActionExecution(tx, current, state, execution, Date.now() + 60_000);
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
  timeoutMs = 90_000,
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
    hasResultPointer: steps.rows.every((row) => !!row.result_cas_hash),
  };
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

test('WR10B T04: connected scripted lab Writer round through Temporal', async (t) => {
  const temporalReady = await assertTemporalAvailable(t);
  if (!temporalReady) return;

  const gate = await withDisposable('wr10b-connected', async ({
    database,
    connectionString,
    storageRoot,
  }) => {
    const fetchCounter = { external: 0 };
    const priorFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (!url.startsWith('http://127.0.0.1:')) {
        fetchCounter.external += 1;
      }
      return priorFetch(input, init);
    };

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
        { temporalAddress, temporalNamespace },
      );
      temporalConnection = await Connection.connect({ address: temporalAddress });
      const client = new Client({
        connection: temporalConnection,
        namespace: temporalNamespace,
      });

    const missionId = await admitAndSettle(database, storyId, offerId);

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

      const handle = client.workflow.getHandle(writerSceneWorkflowId(missionId));
      const description = await handle.describe();
      assert.equal(
        description.type,
        writerSceneDistributedWorkflowType,
      );
      assert.equal(description.status.name, 'COMPLETED');

      const history = await handle.fetchHistory();
      const executeQueueEvents = history.events?.filter((event) => {
        const attrs = event.activityTaskScheduledEventAttributes;
        if (!attrs) return false;
        return (
          attrs.taskQueue?.name === storytellerExecuteTaskQueue &&
          attrs.activityType?.name === 'executePreparedWriterRound'
        );
      });
      assert.ok(executeQueueEvents && executeQueueEvents.length >= 1);

      const attempts = await missionAttemptStats(database, missionId);
      assert.equal(attempts.uniqueAttemptCount, 1);
      assert.equal(attempts.totalChargeMicrousd, 0n);
      assert.equal(attempts.hasResultPointer, true);
      assert.equal(fetchCounter.external, 0);

      assert.throws(() =>
        forbidBroadDatabaseOnExecutor({
          DATABASE_URL: connectionString,
          TEMPORAL_ADDRESS: temporalAddress,
          GAME_AUTHORITY_ORIGIN: stack!.gaOrigin,
          GAME_AUTHORITY_EXECUTOR_TOKEN: WR10B_GA_EXECUTOR_TOKEN,
        }),
      );
      const executorConfig = readExecutionWorkerConfig({
        TEMPORAL_ADDRESS: temporalAddress,
        TEMPORAL_NAMESPACE: temporalNamespace,
        GAME_AUTHORITY_ORIGIN: stack.gaOrigin,
        GAME_AUTHORITY_EXECUTOR_TOKEN: WR10B_GA_EXECUTOR_TOKEN,
        OFFSCREEN_WRITER_EXECUTION_MODE: 'scripted-offline-lab',
      });
      assert.equal(executorConfig.writerRound.mode, 'scripted-offline-lab');
      assert.equal(executorConfig.writerRound.apiKey, undefined);

      const replayFinalize = await authFetch(
        stack.gaOrigin,
        writerSceneRoundFinalizePath(missionId),
        { method: 'POST', token: WR10B_GA_CONTROL_TOKEN },
      );
      assert.equal(replayFinalize.status, 200);
      const replayBody = (await replayFinalize.json()) as { status: string };
      assert.equal(replayBody.status, 'replayed');

      const passagesAfterReplay = (
        await database.db.$client.query(
          `SELECT sequence FROM story_passage WHERE story_id = $1 ORDER BY sequence`,
          [storyId],
        )
      ).rows as Array<{ sequence: number }>;
      assert.equal(passagesAfterReplay.length, 2);

      const attemptsAfterReplay = await missionAttemptStats(database, missionId);
      assert.equal(attemptsAfterReplay.uniqueAttemptCount, 1);
      assert.equal(attemptsAfterReplay.totalChargeMicrousd, 0n);
      assert.equal(fetchCounter.external, 0);

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
      globalThis.fetch = priorFetch;
      await stack?.stop();
      await temporalConnection?.close().catch(() => undefined);
    }
  });
  if (!gate?.available) return;
});

test('WR10B T04 negatives: auth, lab gate, provider default, duplicate wake', async (t) => {
  const gate = await withDisposable('wr10b-neg', async ({
    database,
    connectionString,
    storageRoot,
  }) => {
    const ownerId = randomUUID();
    await insertUser(database, ownerId);
    await seedWriterGrant(database, ownerId);
    const store = new LocalDocumentStore(storageRoot);
    const { storyId, offerId } = await seedStory(database, store, ownerId);
    const missionId = await admitAndSettle(database, storyId, offerId);

    const writerRounds = createWriterRoundSeam(database, store, {
      providerPolicy: providerDefaultPolicy,
      capturePolicyMode: 'provider-default',
    });
    const policyServer = await startGameAuthorityServer({
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
      writerRounds,
      token: WR10B_GA_STORY_TOKEN,
      executorToken: WR10B_GA_EXECUTOR_TOKEN,
      controlToken: WR10B_GA_CONTROL_TOKEN,
      timeoutMs: 15_000,
    });
  try {
      const held = await authFetch(
        policyServer.origin,
        writerSceneRoundPlanPath(missionId),
        { method: 'POST', token: WR10B_GA_CONTROL_TOKEN },
      );
      assert.equal(held.status, 200);
      const heldBody = (await held.json()) as { status?: string; reason?: string };
      assert.equal(heldBody.status, 'held');
      assert.equal(heldBody.reason, 'scripted_offline_model');
    } finally {
      await policyServer.close();
    }

    const labRounds = createWriterRoundSeam(database, store, {
      providerPolicy: scriptedOfflineLabWriterRoundPolicy,
      capturePolicyMode: 'scripted-offline-lab',
    });
    const labServer = await startGameAuthorityServer({
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
      writerRounds: labRounds,
      token: WR10B_GA_STORY_TOKEN,
      executorToken: WR10B_GA_EXECUTOR_TOKEN,
      controlToken: WR10B_GA_CONTROL_TOKEN,
      timeoutMs: 15_000,
    });
    try {
      const storyDenied = await authFetch(
        labServer.origin,
        writerRoundPrivatePreparePath(missionId, 1),
        {
          method: 'POST',
          token: WR10B_GA_STORY_TOKEN,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            schemaVersion: writerRoundPrivateCustodyContractVersion,
            contextId: missionId,
            attemptId: randomUUID(),
            expectedRevision: 1,
          }),
        },
      );
      assert.equal(storyDenied.status, 401);

      const executorFinalizeDenied = await authFetch(
        labServer.origin,
        writerSceneRoundFinalizePath(missionId),
        { method: 'POST', token: WR10B_GA_EXECUTOR_TOKEN },
      );
      assert.equal(executorFinalizeDenied.status, 401);

      const controlPrepareDenied = await authFetch(
        labServer.origin,
        writerSceneRoundPlanPath(missionId),
        { method: 'POST', token: WR10B_GA_STORY_TOKEN },
      );
      assert.equal(controlPrepareDenied.status, 401);
    } finally {
      await labServer.close();
    }

    const { spawn } = await import('node:child_process');
    const { createServer } = await import('node:net');
    const gaRepoRoot = join(repoRoot, 'apps/game-authority');
    const defaultRuleSource = join(
      repoRoot,
      'content/rules/srd-5.2.1-subset',
    );
    const port = await new Promise<number>((resolve, reject) => {
      const server = createServer();
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        const chosen =
          address && typeof address === 'object' ? address.port : undefined;
        if (!chosen) {
          reject(new Error('port reserve failed'));
          return;
        }
        server.close((error) => {
          if (error) reject(error);
          else resolve(chosen);
        });
      });
    });
    const noLabOrigin = `http://127.0.0.1:${port}`;
    const noLabGa = spawn(process.execPath, ['dist/src/bootstrap/main.js'], {
      cwd: gaRepoRoot,
      env: {
        ...process.env,
        DATABASE_URL: connectionString,
        STORYTELLER_LIVE_ENABLED: 'false',
        GAME_AUTHORITY_HOST: '127.0.0.1',
        GAME_AUTHORITY_PORT: String(port),
        GAME_AUTHORITY_SERVICE_TOKEN: WR10B_GA_STORY_TOKEN,
        GAME_AUTHORITY_CONTROL_TOKEN: WR10B_GA_CONTROL_TOKEN,
        GAME_AUTHORITY_EXECUTOR_TOKEN: WR10B_GA_EXECUTOR_TOKEN,
        OFFSCREEN_DOCUMENT_ROOT: storageRoot,
        OFFSCREEN_DEFAULT_RULE_SOURCE: defaultRuleSource,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    try {
      for (let attempt = 0; attempt < 150; attempt++) {
        try {
          const live = await fetch(`${noLabOrigin}/internal/v1/health/live`);
          if (live.ok) break;
        } catch {
          /* wait */
        }
        await delay(100);
      }
      const missingLab = await authFetch(
        noLabOrigin,
        writerSceneRoundPlanPath(missionId),
        { method: 'POST', token: WR10B_GA_CONTROL_TOKEN },
      );
      assert.equal(missingLab.status, 503);
    } finally {
      noLabGa.kill();
    }

    let startAttempts = 0;
    let workflowsCreated = 0;
    const duplicateWakeDeps = {
      connection: {
        withDeadline: async (_deadline: number, run: () => Promise<void>) => {
          await run();
        },
      } as never,
      client: {
        workflow: {
          start: async () => {
            startAttempts += 1;
            if (startAttempts > 1) {
              throw new WorkflowExecutionAlreadyStartedError(
                'already started',
                writerSceneWorkflowId(missionId),
                writerSceneDistributedWorkflowType,
              );
            }
            workflowsCreated += 1;
          },
        },
      } as never,
      taskQueue: 'wr10b-neg-relay',
      intervalNeedsWake: async () => false,
    };
    const wakeNotice = {
      topic: WRITER_SCENE_WAKE_TOPIC,
      operationId: missionId,
    };
    await deliverOutboxNotice(wakeNotice, duplicateWakeDeps);
    await deliverOutboxNotice(wakeNotice, duplicateWakeDeps);
    assert.equal(startAttempts, 2);
    assert.equal(workflowsCreated, 1);
  });
  if (!gate?.available) return;
});