import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, eq, sql } from 'drizzle-orm';
import { storyLaunchRequestSchema } from '@offscreen/contracts/story-launch';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { hashCanonicalJson, LocalDocumentStore } from '@offscreen/documents';
import { storyLaunch } from '@offscreen/db/launch-schema';
import {
  story,
  storyPassage,
  storySceneCheckpoint,
} from '@offscreen/db/story-schema';
import {
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/db/storyteller-schema';
import {
  admitLaunchWriterMission,
  publishLaunchOpeningScene,
} from '../../../packages/story-engine/dist/storyteller/index.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';

const LIBRARY_ROOT_HASH = 'c'.repeat(64);
const SCRIPTED_OPENING_SCENE_CAS = hashCanonicalJson({ kind: 'scripted-opening-scene' });

const BAH_PASSAGE = {
  version: 1,
  title: 'BAH',
  paragraphs: ['A bashful moon watches.'],
};

function entitlementProfile(revision) {
  return {
    schemaVersion: 1,
    id: 'wr07b-launch-entitlement.v1',
    revision,
    enabled: true,
    allowedRoutes: ['writer:launch'],
    defaultRoute: 'writer:launch',
    fundingModes: ['prepaid'],
    recovery: 'explicit-resume',
    limits: {
      maxInputTokensPerRequest: 8_000,
      maxSerializedBytesPerRequest: 65_536,
      maxGeneratedTokensPerRequest: 2_000,
      maxReasoningTokensPerRequest: 0,
      maxInputTokensPerOperation: 8_000,
      maxGeneratedTokensPerOperation: 2_000,
      maxModelRoundsPerOperation: 4,
      maxReadsPerOperation: 0,
      maxRetainedReadBytes: 0,
      maxMicrousdPerOperation: '250000',
      maxInFlightDispatches: 1,
      maxBackgroundJobsPerWindow: 0,
    },
    windows: [],
  };
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

async function insertUser(database, userId) {
  await database.db.execute(
    sql`insert into "user" (id, name, email, email_verified, created_at, updated_at)
        values (${userId}, ${'WR07B-T04'}, ${`${userId}@example.test`}, true, now(), now())`,
  );
}

async function seedLaunchGrant(database, userId) {
  const client = database.db.$client;
  const accountId = randomUUID();
  const runRowId = randomUUID();
  const grantId = randomUUID();
  await client.query(
    `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
     VALUES ($1, 250000, false, now())`,
    [accountId],
  );
  await client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1, $2, 250000, 4, true)`,
    [runRowId, accountId],
  );
  await client.query(
    `INSERT INTO storyteller_current_owner_grant (
       id, revision, user_id, account_id, run_id, entitlement_profile, restrictions, enabled,
       revoked_at, no_expiry, expires_at, requested_route, requested_funding_mode, operator_id,
       approval_identity
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, '[]'::jsonb, true, null, true, null, $7, 'prepaid', $8, $9)`,
    [
      grantId,
      1,
      userId,
      accountId,
      runRowId,
      JSON.stringify(entitlementProfile(1)),
      'writer:launch',
      'op-wr07b-t04',
      'approval-wr07b-t04',
    ],
  );
}

async function insertPendingLaunch(database, userId) {
  const browserOperationId = randomUUID();
  const request = storyLaunchRequestSchema.parse({
    operationId: browserOperationId,
    source: { kind: 'prompt', prompt: 'WR07B T04 launch publication.' },
  });
  const reservedStoryId = randomUUID();
  const reservedFirstPassageId = randomUUID();
  await database.db.insert(storyLaunch).values({
    ownerId: userId,
    operationId: browserOperationId,
    requestHash: hashCanonicalJson(request),
    request,
    reservedStoryId,
    reservedFirstPassageId,
    state: 'pending',
    generationId: null,
    sceneSequence: null,
    publicReason: null,
    uncertainExplanation: null,
  });
  return { browserOperationId, reservedStoryId, reservedFirstPassageId };
}

async function driveLaunchComposing(database, generationId) {
  const missions = await database.db
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.generationId, generationId));
  const mission = missions[0];
  assert.ok(mission);
  await database.db
    .update(storytellerWriterStep)
    .set({
      state: 'result-settled',
      resultCasHash: SCRIPTED_OPENING_SCENE_CAS,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(
      and(
        eq(storytellerWriterStep.missionId, mission.id),
        eq(storytellerWriterStep.contextId, mission.id),
        eq(storytellerWriterStep.ordinal, 1),
      ),
    );
  await database.db
    .update(storytellerWriterMission)
    .set({ state: 'proposal-ready', updatedAt: sql`clock_timestamp()` })
    .where(eq(storytellerWriterMission.id, mission.id));
  await database.db
    .update(storyLaunch)
    .set({ state: 'composing', updatedAt: sql`clock_timestamp()` })
    .where(eq(storyLaunch.generationId, generationId));
}

function openingProposalV2(overrides = {}) {
  return {
    version: 2,
    summary: 'This summary must not become passage content.',
    stagedObjectHashes: [],
    sourceEvidence: [],
    scene: {
      content: BAH_PASSAGE,
      interaction: null,
    },
    ...overrides,
  };
}

async function countStories(database, ownerId) {
  const result = await database.db.execute(
    sql`select count(*)::text as count from story where owner_id = ${ownerId}`,
  );
  const row = result.rows[0];
  return Number(row?.count ?? '0');
}

test('WR07B T04: null-interaction v2 proposal publishes one launch opening scene', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'wr07b-t04-pub-'));
    const storage = new LocalDocumentStore(root);
    const userId = `user_${randomUUID()}`;
    await insertUser(database, userId);
    await seedLaunchGrant(database, userId);
    const { browserOperationId, reservedStoryId, reservedFirstPassageId } =
      await insertPendingLaunch(database, userId);
    const admitted = await admitLaunchWriterMission(database, {
      ownerId: userId,
      operationId: browserOperationId,
      libraryRootHash: LIBRARY_ROOT_HASH,
      libraryRootRevision: 1,
    });
    await driveLaunchComposing(database, admitted.generationId);

    const first = await publishLaunchOpeningScene(database, storage, {
      ownerId: userId,
      operationId: browserOperationId,
      proposal: openingProposalV2(),
    });
    assert.equal(first.replayed, false);
    assert.equal(first.storyId, reservedStoryId);
    assert.equal(first.passageId, reservedFirstPassageId);
    assert.match(first.checkpointHash, /^[0-9a-f]{64}$/);

    const [launch] = await database.db
      .select()
      .from(storyLaunch)
      .where(
        and(
          eq(storyLaunch.ownerId, userId),
          eq(storyLaunch.operationId, browserOperationId),
        ),
      );
    assert.equal(launch?.state, 'ready');
    assert.equal(launch?.sceneSequence, 1);
    assert.equal(await countStories(database, userId), 1);

    const checkpoints = await database.db
      .select()
      .from(storySceneCheckpoint)
      .where(eq(storySceneCheckpoint.storyId, reservedStoryId));
    assert.equal(checkpoints.length, 1);
    assert.equal(checkpoints[0]?.stateSchemaVersion, 2);

    const [passage] = await database.db
      .select()
      .from(storyPassage)
      .where(
        and(
          eq(storyPassage.storyId, reservedStoryId),
          eq(storyPassage.sequence, 1),
        ),
      );
    assert.ok(passage?.contentDocumentHash);
    const stored = await storage.readSourcePassage(passage.contentDocumentHash);
    assert.equal(stored.content.paragraphs[0], BAH_PASSAGE.paragraphs[0]);
    assert.notEqual(stored.content.paragraphs[0], openingProposalV2().summary);

    const second = await publishLaunchOpeningScene(database, storage, {
      ownerId: userId,
      operationId: browserOperationId,
      proposal: openingProposalV2(),
    });
    assert.equal(second.replayed, true);
    assert.equal(second.storyId, first.storyId);
    assert.equal(second.passageId, first.passageId);
    assert.equal(second.checkpointHash, first.checkpointHash);
    assert.equal(await countStories(database, userId), 1);
    assert.equal(
      (
        await database.db
          .select()
          .from(storySceneCheckpoint)
          .where(eq(storySceneCheckpoint.storyId, reservedStoryId))
      ).length,
      1,
    );
  });
});

test('WR07B T04: choice.v1 opening interaction fails closed before story insert', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'wr07b-t04-choice-'));
    const storage = new LocalDocumentStore(root);
    const userId = `user_${randomUUID()}`;
    await insertUser(database, userId);
    await seedLaunchGrant(database, userId);
    const { browserOperationId } = await insertPendingLaunch(database, userId);
    const admitted = await admitLaunchWriterMission(database, {
      ownerId: userId,
      operationId: browserOperationId,
      libraryRootHash: LIBRARY_ROOT_HASH,
      libraryRootRevision: 1,
    });
    await driveLaunchComposing(database, admitted.generationId);

    await assert.rejects(
      () =>
        publishLaunchOpeningScene(database, storage, {
          ownerId: userId,
          operationId: browserOperationId,
          proposal: openingProposalV2({
            scene: {
              content: BAH_PASSAGE,
              interaction: {
                kind: 'choice.v1',
                prompt: 'Where?',
                options: [{ id: 'stay', label: 'Stay' }],
              },
            },
          }),
        }),
      /launch_interaction_unsupported/,
    );

    assert.equal(await countStories(database, userId), 0);
    const [launch] = await database.db
      .select()
      .from(storyLaunch)
      .where(eq(storyLaunch.operationId, browserOperationId));
    assert.notEqual(launch?.state, 'ready');
  });
});

test('WR07B T04: wrong owner cannot publish launch opening', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'wr07b-t04-owner-'));
    const storage = new LocalDocumentStore(root);
    const ownerId = `user_${randomUUID()}`;
    const otherId = `user_${randomUUID()}`;
    await insertUser(database, ownerId);
    await insertUser(database, otherId);
    await seedLaunchGrant(database, ownerId);
    const { browserOperationId } = await insertPendingLaunch(database, ownerId);
    const admitted = await admitLaunchWriterMission(database, {
      ownerId,
      operationId: browserOperationId,
      libraryRootHash: LIBRARY_ROOT_HASH,
      libraryRootRevision: 1,
    });
    await driveLaunchComposing(database, admitted.generationId);

    await assert.rejects(
      () =>
        publishLaunchOpeningScene(database, storage, {
          ownerId: otherId,
          operationId: browserOperationId,
          proposal: openingProposalV2(),
        }),
      /launch_not_found/,
    );
    assert.equal(await countStories(database, ownerId), 0);

    const storiesOther = await database.db
      .select({ id: story.id })
      .from(story)
      .where(eq(story.ownerId, otherId));
    assert.equal(storiesOther.length, 0);
  });
});