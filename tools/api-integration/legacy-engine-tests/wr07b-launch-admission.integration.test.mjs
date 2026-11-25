import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq, sql } from 'drizzle-orm';
import { storyLaunchRequestSchema } from '@offscreen/story-interface/story-launch';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { hashCanonicalJson } from '@offscreen/documents';
import { generation } from '@offscreen/story-persistence/generations';
import { storyLaunch } from '@offscreen/story-persistence/launch';
import { outbox } from '@offscreen/db/outbox-schema';
import {
  storytellerOperation,
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/story-persistence/storyteller';
import {
  admitLaunchWriterMission,
  LAUNCH_WAKE_TOPIC,
} from '../../../packages/story-engine/dist/storyteller/index.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';

const LIBRARY_ROOT_HASH = 'c'.repeat(64);

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
        values (${userId}, ${'WR07B'}, ${`${userId}@example.test`}, true, now(), now())`,
  );
}

async function seedLaunchGrant(database, userId) {
  const client = database.db.$client;
  const accountId = randomUUID();
  const runRowId = randomUUID();
  const grantId = randomUUID();
  const revision = 1;

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
      revision,
      userId,
      accountId,
      runRowId,
      JSON.stringify(entitlementProfile(revision)),
      'writer:launch',
      'op-wr07b',
      'approval-wr07b',
    ],
  );
  return { accountId, runRowId, grantId };
}

async function insertPendingLaunch(database, userId) {
  const browserOperationId = randomUUID();
  const request = storyLaunchRequestSchema.parse({
    operationId: browserOperationId,
    source: { kind: 'prompt', prompt: 'A launch prompt for WR07B.' },
  });
  const requestHash = hashCanonicalJson(request);
  const reservedStoryId = randomUUID();
  const reservedFirstPassageId = randomUUID();
  await database.db.insert(storyLaunch).values({
    ownerId: userId,
    operationId: browserOperationId,
    requestHash,
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

async function countForOwner(database, table, ownerId) {
  const client = database.db.$client;
  const result = await client.query(
    `SELECT count(*)::text AS count FROM ${table} WHERE owner_id = $1`,
    [ownerId],
  );
  return Number(result.rows[0]?.count ?? '0');
}

async function assertAdmissionShape(database, ownerId, reservedStoryId) {
  const generations = await database.db
    .select()
    .from(generation)
    .where(eq(generation.ownerId, ownerId));
  assert.equal(generations.length, 1);

  const operations = await database.db
    .select()
    .from(storytellerOperation)
    .where(eq(storytellerOperation.ownerId, ownerId));
  assert.equal(operations.length, 1);
  assert.equal(operations[0]?.generationId, generations[0]?.id);

  const missions = await database.db
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.ownerId, ownerId));
  assert.equal(missions.length, 1);

  const steps = await database.db
    .select()
    .from(storytellerWriterStep)
    .where(eq(storytellerWriterStep.missionId, missions[0]?.id ?? ''));
  assert.equal(steps.length, 1);

  const launches = await database.db
    .select()
    .from(storyLaunch)
    .where(eq(storyLaunch.ownerId, ownerId));
  assert.equal(launches.length, 1);
  assert.equal(launches[0]?.state, 'preparing');
  assert.equal(launches[0]?.generationId, generations[0]?.id);

  const notices = await database.db
    .select()
    .from(outbox)
    .where(eq(outbox.id, reservedStoryId));
  assert.equal(notices.length, 1);
  assert.equal(notices[0]?.topic, LAUNCH_WAKE_TOPIC);
  assert.equal(notices[0]?.operationId, reservedStoryId);
}

test('WR07B launch admission admits once and replays idempotently', async () => {
  await withDisposable(async (database) => {
    const userId = `user_${randomUUID()}`;
    await insertUser(database, userId);
    await seedLaunchGrant(database, userId);
    const { browserOperationId, reservedStoryId } = await insertPendingLaunch(
      database,
      userId,
    );

    const first = await admitLaunchWriterMission(database, {
      ownerId: userId,
      operationId: browserOperationId,
      libraryRootHash: LIBRARY_ROOT_HASH,
      libraryRootRevision: 1,
    });
    assert.equal(first.replayed, false);
    assert.equal(first.reservedStoryId, reservedStoryId);
    await assertAdmissionShape(database, userId, reservedStoryId);

    const generationCount = await countForOwner(database, 'generation', userId);
    assert.equal(generationCount, 1);

    const second = await admitLaunchWriterMission(database, {
      ownerId: userId,
      operationId: browserOperationId,
      libraryRootHash: LIBRARY_ROOT_HASH,
      libraryRootRevision: 1,
    });
    assert.equal(second.replayed, true);
    assert.equal(second.generationId, first.generationId);
    assert.equal(second.reservedStoryId, reservedStoryId);
    await assertAdmissionShape(database, userId, reservedStoryId);

    const notices = await database.db.select().from(outbox);
    const launchNotices = notices.filter(
      (row) => row.topic === LAUNCH_WAKE_TOPIC,
    );
    assert.equal(launchNotices.length, 1);
  });
});

test('WR07B launch admission rejects owner without an enabled grant', async () => {
  await withDisposable(async (database) => {
    const admittedUserId = `user_${randomUUID()}`;
    const deniedUserId = `user_${randomUUID()}`;
    await insertUser(database, admittedUserId);
    await insertUser(database, deniedUserId);
    await seedLaunchGrant(database, admittedUserId);

    const deniedLaunch = await insertPendingLaunch(database, deniedUserId);

    await assert.rejects(
      () =>
        admitLaunchWriterMission(database, {
          ownerId: deniedUserId,
          operationId: deniedLaunch.browserOperationId,
          libraryRootHash: LIBRARY_ROOT_HASH,
          libraryRootRevision: 1,
        }),
      (error) =>
        error instanceof Error && error.message === 'launch_not_admitted',
    );

    const deniedGenerations = await countForOwner(
      database,
      'generation',
      deniedUserId,
    );
    assert.equal(deniedGenerations, 0);

    const rows = await database.db
      .select()
      .from(storyLaunch)
      .where(eq(storyLaunch.ownerId, deniedUserId));
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.state, 'pending');
    assert.equal(rows[0]?.generationId, null);
  });
});