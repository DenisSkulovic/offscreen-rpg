import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, eq, sql } from 'drizzle-orm';
import { storyLaunchRequestSchema } from '@offscreen/story-interface/story-launch';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { LocalDocumentStore } from '@offscreen/documents';
import { story } from '@offscreen/story-persistence/stories';
import { storyLaunch } from '@offscreen/story-persistence/launch';
import { storyPassage } from '@offscreen/story-persistence/stories';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '@offscreen/lab-support';
import { StoryError } from '@offscreen/story-engine/stories';
import { createGameAuthoritySeam } from '../dist/src/application.js';

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
        values (${userId}, ${'WR07B-T05'}, ${`${userId}@example.test`}, true, now(), now())`,
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
      'op-wr07b-t05',
      'approval-wr07b-t05',
    ],
  );
}

async function countStories(database, ownerId) {
  const rows = await database.db
    .select({ id: story.id })
    .from(story)
    .where(eq(story.ownerId, ownerId));
  return rows.length;
}

test('WR07B T05: putLaunch prompt BAH becomes ready and replays without second story', async () => {
  await withDisposable(async (database) => {
    const storageRoot = await mkdtemp(join(tmpdir(), 'wr07b-t05-'));
    const storage = new LocalDocumentStore(storageRoot);
    const seam = createGameAuthoritySeam(database, { documentStore: storage });
    const userId = `user_${randomUUID()}`;
    await insertUser(database, userId);
    await seedLaunchGrant(database, userId);
    const browserOperationId = randomUUID();
    const request = storyLaunchRequestSchema.parse({
      operationId: browserOperationId,
      source: { kind: 'prompt', prompt: 'BAH' },
    });

    const first = await seam.putLaunch({
      ownerId: userId,
      operationId: browserOperationId,
      body: request,
    });
    assert.equal(first.state, 'ready');
    assert.equal(first.sceneSequence, 1);
    assert.ok(first.storyId);

    const [passage] = await database.db
      .select()
      .from(storyPassage)
      .where(
        and(eq(storyPassage.storyId, first.storyId), eq(storyPassage.sequence, 1)),
      );
    assert.ok(passage?.contentDocumentHash);
    const stored = await storage.readSourcePassage(passage.contentDocumentHash);
    assert.equal(stored.content.paragraphs[0], 'BAH');

    const second = await seam.putLaunch({
      ownerId: userId,
      operationId: browserOperationId,
      body: request,
    });
    assert.equal(second.state, 'ready');
    assert.equal(second.storyId, first.storyId);
    assert.equal(await countStories(database, userId), 1);
  });
});

test('WR07B T05: launch negatives for owner, conflict, and id mismatch', async () => {
  await withDisposable(async (database) => {
    const storageRoot = await mkdtemp(join(tmpdir(), 'wr07b-t05-neg-'));
    const storage = new LocalDocumentStore(storageRoot);
    const seam = createGameAuthoritySeam(database, { documentStore: storage });
    const ownerId = `user_${randomUUID()}`;
    const otherId = `user_${randomUUID()}`;
    await insertUser(database, ownerId);
    await insertUser(database, otherId);
    await seedLaunchGrant(database, ownerId);
    const operationId = randomUUID();
    const request = storyLaunchRequestSchema.parse({
      operationId,
      source: { kind: 'prompt', prompt: 'Negative launch probe.' },
    });

    await seam.putLaunch({ ownerId, operationId, body: request });

    await assert.rejects(
      () => seam.getLaunch({ ownerId: otherId, operationId }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );
    await assert.rejects(
      () =>
        seam.putLaunch({
          ownerId: otherId,
          operationId,
          body: request,
        }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );

    const mismatchId = randomUUID();
    await assert.rejects(
      () =>
        seam.putLaunch({
          ownerId,
          operationId: mismatchId,
          body: request,
        }),
      (error) => error instanceof StoryError && error.code === 'conflict',
    );
    const untouchedOperationId = randomUUID();
    await assert.rejects(
      () =>
        seam.putLaunch({
          ownerId,
          operationId: untouchedOperationId,
          body: { ...request, operationId },
        }),
      (error) => error instanceof StoryError && error.code === 'conflict',
    );
    const untouchedRows = await database.db
      .select()
      .from(storyLaunch)
      .where(eq(storyLaunch.operationId, untouchedOperationId));
    assert.equal(untouchedRows.length, 0);

    const rowsBeforeConflict = await database.db
      .select()
      .from(storyLaunch)
      .where(eq(storyLaunch.ownerId, ownerId));
    assert.equal(rowsBeforeConflict.length, 1);

    const conflicting = storyLaunchRequestSchema.parse({
      operationId,
      source: { kind: 'prompt', prompt: 'Different body for same operation.' },
    });
    await assert.rejects(
      () => seam.putLaunch({ ownerId, operationId, body: conflicting }),
      (error) => error instanceof StoryError && error.code === 'conflict',
    );
  });
});