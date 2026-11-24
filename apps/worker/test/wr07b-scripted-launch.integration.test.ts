import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, eq, sql } from 'drizzle-orm';
import { storyLaunchRequestSchema } from '@offscreen/story-interface/story-launch';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { hashCanonicalJson } from '@offscreen/documents';
import { generation } from '@offscreen/db/generation-schema';
import { storyLaunch } from '@offscreen/db/launch-schema';
import {
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/db/storyteller-schema';
import {
  admitLaunchWriterMission,
} from '@offscreen/story-engine/storyteller';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '@offscreen/lab-support';
import { runScriptedLaunchWriter } from '../src/launch/scripted-launch';

const LIBRARY_ROOT_HASH = 'c'.repeat(64);
const SCRIPTED_OPENING_SCENE_CAS = createHash('sha256')
  .update('{"kind":"scripted-opening-scene"}', 'utf8')
  .digest('hex');
const UNCERTAIN_EXPLANATION = 'launch writer dispatch uncertain';

function entitlementProfile(revision: number) {
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

async function withDisposable(run: (database: ReturnType<typeof createDatabase>) => Promise<void>) {
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

async function insertUser(database: ReturnType<typeof createDatabase>, userId: string) {
  await database.db.execute(
    sql`insert into "user" (id, name, email, email_verified, created_at, updated_at)
        values (${userId}, ${'WR07B-T03'}, ${`${userId}@example.test`}, true, now(), now())`,
  );
}

async function seedLaunchGrant(database: ReturnType<typeof createDatabase>, userId: string) {
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
      'op-wr07b-t03',
      'approval-wr07b-t03',
    ],
  );
}

async function insertPendingLaunch(database: ReturnType<typeof createDatabase>, userId: string) {
  const browserOperationId = randomUUID();
  const request = storyLaunchRequestSchema.parse({
    operationId: browserOperationId,
    source: { kind: 'prompt', prompt: 'WR07B T03 scripted launch.' },
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
  return { browserOperationId, reservedStoryId };
}

async function admitLaunch(
  database: ReturnType<typeof createDatabase>,
  userId: string,
  browserOperationId: string,
  reservedStoryId: string,
  launchOutcome?: string,
) {
  const admitted = await admitLaunchWriterMission(database, {
    ownerId: userId,
    operationId: browserOperationId,
    libraryRootHash: LIBRARY_ROOT_HASH,
    libraryRootRevision: 1,
  });
  assert.equal(admitted.reservedStoryId, reservedStoryId);
  if (launchOutcome) {
    const rows = await database.db
      .select()
      .from(generation)
      .where(eq(generation.ownerId, userId));
    const gen = rows[0];
    assert.ok(gen);
    const input = (gen.input ?? {}) as Record<string, unknown>;
    await database.db
      .update(generation)
      .set({
        input: { ...input, launchOutcome },
      })
      .where(eq(generation.id, gen.id));
  }
  return admitted.generationId;
}

async function countStories(database: ReturnType<typeof createDatabase>, ownerId: string) {
  const result = await database.db.execute(
    sql`select count(*)::text as count from story where owner_id = ${ownerId}`,
  );
  const row = result.rows[0] as { count?: string } | undefined;
  return Number(row?.count ?? '0');
}

test('WR07B T03 scene: composing then replayed without story row', async () => {
  await withDisposable(async (database) => {
    const userId = `user_${randomUUID()}`;
    await insertUser(database, userId);
    await seedLaunchGrant(database, userId);
    const { browserOperationId, reservedStoryId } = await insertPendingLaunch(
      database,
      userId,
    );
    await admitLaunch(database, userId, browserOperationId, reservedStoryId);

    const first = await runScriptedLaunchWriter(database, reservedStoryId);
    assert.equal(first, 'composing');

    const launches = await database.db
      .select()
      .from(storyLaunch)
      .where(eq(storyLaunch.reservedStoryId, reservedStoryId));
    assert.equal(launches[0]?.state, 'composing');

    const steps = await database.db.select().from(storytellerWriterStep);
    assert.equal(steps.length, 1);
    assert.equal(steps[0]?.state, 'result-settled');
    assert.equal(steps[0]?.resultCasHash, SCRIPTED_OPENING_SCENE_CAS);

    const missions = await database.db.select().from(storytellerWriterMission);
    assert.equal(missions[0]?.state, 'proposal-ready');
    assert.equal(await countStories(database, userId), 0);

    const second = await runScriptedLaunchWriter(database, reservedStoryId);
    assert.equal(second, 'replayed');
    assert.equal((await database.db.select().from(storytellerWriterStep)).length, 1);
  });
});

test('WR07B T03 fail: failed with rejected reason then replayed', async () => {
  await withDisposable(async (database) => {
    const userId = `user_${randomUUID()}`;
    await insertUser(database, userId);
    await seedLaunchGrant(database, userId);
    const { browserOperationId, reservedStoryId } = await insertPendingLaunch(
      database,
      userId,
    );
    await admitLaunch(database, userId, browserOperationId, reservedStoryId, 'fail');

    assert.equal(await runScriptedLaunchWriter(database, reservedStoryId), 'failed');
    const launch = (
      await database.db
        .select()
        .from(storyLaunch)
        .where(eq(storyLaunch.reservedStoryId, reservedStoryId))
    )[0];
    assert.equal(launch?.state, 'failed');
    assert.equal(launch?.publicReason, 'rejected');
    assert.equal(await runScriptedLaunchWriter(database, reservedStoryId), 'replayed');
  });
});

test('WR07B T03 uncertain: exact explanation and single generation', async () => {
  await withDisposable(async (database) => {
    const userId = `user_${randomUUID()}`;
    await insertUser(database, userId);
    await seedLaunchGrant(database, userId);
    const { browserOperationId, reservedStoryId } = await insertPendingLaunch(
      database,
      userId,
    );
    await admitLaunch(
      database,
      userId,
      browserOperationId,
      reservedStoryId,
      'uncertain',
    );

    assert.equal(
      await runScriptedLaunchWriter(database, reservedStoryId),
      'uncertain',
    );
    const launch = (
      await database.db
        .select()
        .from(storyLaunch)
        .where(eq(storyLaunch.reservedStoryId, reservedStoryId))
    )[0];
    assert.equal(launch?.uncertainExplanation, UNCERTAIN_EXPLANATION);
    assert.equal(launch?.publicReason, null);
    const generationCount = (
      await database.db
        .select()
        .from(generation)
        .where(eq(generation.ownerId, userId))
    ).length;
    assert.equal(generationCount, 1);
    assert.equal(await runScriptedLaunchWriter(database, reservedStoryId), 'replayed');
  });
});

test('WR07B T03 restart: preparing and captured settle to composing once', async () => {
  await withDisposable(async (database) => {
    const userId = `user_${randomUUID()}`;
    await insertUser(database, userId);
    await seedLaunchGrant(database, userId);
    const { browserOperationId, reservedStoryId } = await insertPendingLaunch(
      database,
      userId,
    );
    await admitLaunch(database, userId, browserOperationId, reservedStoryId);

    const before = (
      await database.db
        .select()
        .from(storyLaunch)
        .where(eq(storyLaunch.reservedStoryId, reservedStoryId))
    )[0];
    const missions = await database.db
      .select()
      .from(storytellerWriterMission)
      .where(eq(storytellerWriterMission.storyId, reservedStoryId));
    const steps = await database.db
      .select()
      .from(storytellerWriterStep)
      .where(eq(storytellerWriterStep.missionId, missions[0]?.id ?? ''));
    assert.equal(before?.state, 'preparing');
    assert.equal(steps[0]?.state, 'captured');

    assert.equal(await runScriptedLaunchWriter(database, reservedStoryId), 'composing');
  });
});