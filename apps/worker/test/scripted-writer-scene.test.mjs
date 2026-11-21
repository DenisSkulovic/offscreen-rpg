import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { campaign, gameActionExecution } from '@offscreen/db/campaign-schema';
import { storyPassage } from '@offscreen/db/story-schema';
import { storytellerWriterMission } from '@offscreen/db/storyteller-schema';
import { LocalDocumentStore } from '@offscreen/documents';
import { narrativeIntentPlanSchema } from '@offscreen/game/narrative-intent';
import { offerSchema } from '@offscreen/game/offers';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { WRITER_SCENE_WAKE_TOPIC } from '@offscreen/application/storyteller';
import {
  writerSceneWorkflowId,
  writerSceneWorkflowType,
} from '@offscreen/workflows/contracts';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '@offscreen/application/developer-tools';
import { admitCampaignActionInTransaction } from '../../../packages/story-engine/dist/campaign/actions.js';
import { settleActionExecution } from '../../../packages/story-engine/dist/campaign/action-executions.js';
import { saveOfferPlans } from '../../../packages/story-engine/dist/campaign/persistence.js';
import { initializeCampaign } from '../../../packages/story-engine/dist/campaign/settings.js';
import { createStoryInitialization } from '../../../packages/story-engine/dist/stories/initialization.js';
import { lockStoryById } from '../../../packages/story-engine/dist/stories/persistence.js';
import { selectNoticeDispatch } from '../dist/src/outbox/dispatch.js';
import { runScriptedWriterScene } from '../dist/src/activities/scripted-writer-scene.js';

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

function openingOffer(offerId) {
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
    console.warn(
      `NOT-RUN: disposable Postgres unavailable (${message}). Is Docker/postgres up?`,
    );
    return;
  }
  const database = createDatabase(
    readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
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

async function insertUser(database, ownerId) {
  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [ownerId, 'WR08-T03', `${ownerId}@example.test`],
  );
}

async function seedWriterGrant(database, ownerId) {
  const accountId = randomUUID();
  const runRowId = randomUUID();
  const grantId = randomUUID();
  await database.db.$client.query(
    `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
     VALUES ($1, 250000, false, now())`,
    [accountId],
  );
  await database.db.$client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1, $2, 250000, 4, true)`,
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
      'op-writer-scene',
      'approval-writer-scene',
    ],
  );
}

async function seedStory(database, store, ownerId) {
  const storyId = randomUUID();
  const offerId = randomUUID();
  const initializeStory = createStoryInitialization(database, store);
  await initializeStory({
    ownerId,
    storyId,
    initial: {
      source: 'playable.opening.v1',
      premise: {
        title: 'Writer continuation',
        premise: 'A road near Seyda Neen.',
        storytellingDirection: 'Keep it grounded.',
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

async function admitAndSettle(database, storyId, offerId) {
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
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.storyId, storyId));
  assert.equal(missions.length, 1);
  return missions[0].id;
}

test('writer.scene.v1 dispatches writerSceneV1 with writer-scene/<missionId>', () => {
  const missionId = randomUUID();
  const dispatch = selectNoticeDispatch(WRITER_SCENE_WAKE_TOPIC);
  assert.equal(dispatch?.kind, 'start');
  if (dispatch?.kind === 'start') {
    assert.equal(dispatch.workflowType, writerSceneWorkflowType);
    assert.equal(dispatch.workflowId(missionId), writerSceneWorkflowId(missionId));
  }
});

test('WR08 T03: scripted wake publishes one new passage and replays safely', async () => {
  await withDisposable(async (database) => {
    const ownerId = randomUUID();
    await insertUser(database, ownerId);
    await seedWriterGrant(database, ownerId);
    const root = await mkdtemp(join(tmpdir(), 'wr08-writer-scene-'));
    const store = new LocalDocumentStore(root);
    const { storyId, offerId } = await seedStory(database, store, ownerId);
    const missionId = await admitAndSettle(database, storyId, offerId);

    await runScriptedWriterScene(database, store, missionId);
    const passages = await database.db
      .select({ sequence: storyPassage.sequence })
      .from(storyPassage)
      .where(eq(storyPassage.storyId, storyId));
    assert.deepEqual(
      passages.map((row) => row.sequence).sort((a, b) => a - b),
      [1, 2],
    );

    const steps = await database.db.$client.query(
      `SELECT COUNT(*)::int AS count
       FROM storyteller_writer_step
       WHERE mission_id = $1 AND ordinal = 1 AND tool_call_id IS NULL`,
      [missionId],
    );
    assert.equal(steps.rows[0]?.count, 1);

    await runScriptedWriterScene(database, store, missionId);
    const afterReplay = await database.db
      .select({ sequence: storyPassage.sequence })
      .from(storyPassage)
      .where(eq(storyPassage.storyId, storyId));
    assert.equal(afterReplay.length, 2);
  });
});

test('WR08 T03 negative: missing document store throws without publishing', async () => {
  await withDisposable(async (database) => {
    const ownerId = randomUUID();
    await insertUser(database, ownerId);
    await seedWriterGrant(database, ownerId);
    const root = await mkdtemp(join(tmpdir(), 'wr08-writer-scene-no-store-'));
    const store = new LocalDocumentStore(root);
    const { storyId, offerId } = await seedStory(database, store, ownerId);
    const missionId = await admitAndSettle(database, storyId, offerId);
    await assert.rejects(
      () => runScriptedWriterScene(database, undefined, missionId),
      /document_store_unavailable/,
    );
    const passages = await database.db
      .select()
      .from(storyPassage)
      .where(eq(storyPassage.storyId, storyId));
    assert.equal(passages.length, 1);
  });
});

test('WR08 T03 negative: uncertain mission does not publish a second scene', async () => {
  await withDisposable(async (database) => {
    const ownerId = randomUUID();
    await insertUser(database, ownerId);
    await seedWriterGrant(database, ownerId);
    const root = await mkdtemp(join(tmpdir(), 'wr08-writer-scene-uncertain-'));
    const store = new LocalDocumentStore(root);
    const { storyId, offerId } = await seedStory(database, store, ownerId);
    const missionId = await admitAndSettle(database, storyId, offerId);
    await database.db
      .update(storytellerWriterMission)
      .set({ state: 'uncertain' })
      .where(eq(storytellerWriterMission.id, missionId));
    await runScriptedWriterScene(database, store, missionId);
    const passages = await database.db
      .select()
      .from(storyPassage)
      .where(eq(storyPassage.storyId, storyId));
    assert.equal(passages.length, 1);
  });
});