/**
 * TESTLAB01 T05: disposable Postgres launch admission with provider-free grant ensure.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { storyLaunchRequestSchema } from '@offscreen/contracts/story-launch';
import {
  createDatabase,
  readDatabaseConfig,
  type Database,
} from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storyLaunch } from '@offscreen/db/launch-schema';
import { outbox } from '@offscreen/db/outbox-schema';
import { storytellerOperation } from '@offscreen/db/storyteller-schema';
import { hashCanonicalJson } from '@offscreen/documents';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '@offscreen/lab-support';
import {
  admitLaunchWriterMission,
  LAUNCH_WAKE_TOPIC,
} from '@offscreen/story-engine/storyteller';
import { createRequire } from 'node:module';
import type * as Drizzle from 'drizzle-orm' with {
  'resolution-mode': 'require',
};
import { createTestlabFundingDeps } from './helpers/testlab-disposable-grant-deps.js';
import {
  readTestlabProviderTripwireCount,
  resetTestlabProviderTripwire,
  testlabProviderTripwire,
} from './helpers/testlab-provider-tripwire.js';

const require = createRequire(import.meta.url);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const orm: typeof Drizzle = require('drizzle-orm');
const { eq } = orm;
const { buildTestlabSuiteApprovalIdentity } = await import(
  pathToFileURL(join(repoRoot, 'scripts/repo-tools/testlab-grant-store.mjs'))
    .href
);
const { runTestlabFundingEnsure } = await import(
  pathToFileURL(join(repoRoot, 'scripts/repo-tools/testlab-funding.mjs')).href
);
const { buildTestlabEntitlementProfile } = await import(
  pathToFileURL(join(repoRoot, 'scripts/repo-tools/testlab-grant-contract.mjs'))
    .href
);

const LIBRARY_ROOT_HASH = 'b'.repeat(64);
const SUITE_ID = 'suite-testlab01-provider-free-launch';

void testlabProviderTripwire();

type DisposableContext = {
  database: Database;
};

async function withDisposable(
  run: (ctx: DisposableContext) => Promise<void>,
): Promise<{ available: boolean; error?: string }> {
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
    return { available: false, error: message };
  }

  const database = createDatabase(
    readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
    () => {},
  );
  try {
    await run({ database });
    return { available: true };
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

async function insertUser(database: Database, ownerId: string): Promise<void> {
  await database.db.$client.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, $2, $3, true, now(), now())`,
    [ownerId, 'TESTLAB01-T05', `${ownerId}@example.test`],
  );
}

async function preparePendingLaunch(database: Database, ownerId: string) {
  const operationId = randomUUID();
  const request = storyLaunchRequestSchema.parse({
    operationId,
    source: {
      kind: 'prompt',
      prompt: 'A traveller waits beneath the silt strider.',
    },
  });
  const requestHash = hashCanonicalJson(request);
  const reservedStoryId = randomUUID();
  const reservedFirstPassageId = randomUUID();
  await database.db.insert(storyLaunch).values({
    ownerId,
    operationId,
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
  return {
    ownerId,
    operationId,
    reservedStoryId,
    reservedFirstPassageId,
    state: 'pending' as const,
    generationId: null,
  };
}

async function countGenerations(
  database: Database,
  ownerId: string,
): Promise<number> {
  const rows = await database.db
    .select({ id: generation.id })
    .from(generation)
    .where(eq(generation.ownerId, ownerId));
  return rows.length;
}

async function countLaunchWakeOutbox(
  database: Database,
  ownerId: string,
): Promise<number> {
  const launches = await database.db
    .select({ reservedStoryId: storyLaunch.reservedStoryId })
    .from(storyLaunch)
    .where(eq(storyLaunch.ownerId, ownerId));
  if (launches.length === 0) {
    return 0;
  }
  let count = 0;
  for (const launch of launches) {
    const notices = await database.db
      .select({ topic: outbox.topic })
      .from(outbox)
      .where(eq(outbox.id, launch.reservedStoryId));
    count += notices.filter((row) => row.topic === LAUNCH_WAKE_TOPIC).length;
  }
  return count;
}

async function seedExpiredLaunchGrant(
  database: Database,
  ownerId: string,
): Promise<void> {
  const client = database.db.$client;
  const accountId = randomUUID();
  const runRowId = randomUUID();
  const grantId = randomUUID();
  const expiredAt = new Date(Date.parse('2020-01-01T00:00:00.000Z'));
  await client.query(
    `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
     VALUES ($1::uuid, $2::bigint, false, now())`,
    [accountId, '250000'],
  );
  await client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1::uuid, $2::uuid, $3::bigint, $4::integer, true)`,
    [runRowId, accountId, '250000', 4],
  );
  await client.query(
    `INSERT INTO storyteller_current_owner_grant (
       id, revision, user_id, account_id, run_id, entitlement_profile, restrictions, enabled,
       revoked_at, no_expiry, expires_at, requested_route, requested_funding_mode, operator_id,
       approval_identity
     ) VALUES ($1::uuid, 1, $2, $3::uuid, $4::uuid, $5::jsonb, '[]'::jsonb, true, null, false, $6, $7, 'prepaid', $8, $9)`,
    [
      grantId,
      ownerId,
      accountId,
      runRowId,
      JSON.stringify(buildTestlabEntitlementProfile(1)),
      expiredAt,
      'writer:launch',
      'testlab:provisioner',
      buildTestlabSuiteApprovalIdentity(SUITE_ID),
    ],
  );
}

async function seedInadmissibleLaunchGrant(
  database: Database,
  ownerId: string,
): Promise<void> {
  const client = database.db.$client;
  const accountId = randomUUID();
  const runRowId = randomUUID();
  const grantId = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await client.query(
    `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
     VALUES ($1::uuid, $2::bigint, false, now())`,
    [accountId, '100000'],
  );
  await client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1::uuid, $2::uuid, $3::bigint, $4::integer, true)`,
    [runRowId, accountId, '100000', 4],
  );
  await client.query(
    `INSERT INTO storyteller_current_owner_grant (
       id, revision, user_id, account_id, run_id, entitlement_profile, restrictions, enabled,
       revoked_at, no_expiry, expires_at, requested_route, requested_funding_mode, operator_id,
       approval_identity
     ) VALUES ($1::uuid, 1, $2, $3::uuid, $4::uuid, $5::jsonb, '[]'::jsonb, true, null, false, $6, $7, 'prepaid', $8, $9)`,
    [
      grantId,
      ownerId,
      accountId,
      runRowId,
      JSON.stringify(buildTestlabEntitlementProfile(1)),
      expiresAt,
      'writer:launch',
      'testlab:provisioner',
      buildTestlabSuiteApprovalIdentity(SUITE_ID),
    ],
  );
}

test(
  'TESTLAB01 T05 provider-free launch grant ensure and admission',
  { timeout: 180_000 },
  async (t) => {
    resetTestlabProviderTripwire();

    const outcome = await withDisposable(async ({ database }) => {
      const ownerId = `user_${randomUUID()}`;
      const deniedOwnerId = `user_${randomUUID()}`;
      await insertUser(database, ownerId);
      await insertUser(database, deniedOwnerId);

      const ensureFlags = {
        target: 'disposable',
        owner: ownerId,
        suite: SUITE_ID,
        approval: buildTestlabSuiteApprovalIdentity(SUITE_ID),
      };
      const deps = createTestlabFundingDeps(database);

      const firstEnsure = await runTestlabFundingEnsure(ensureFlags, deps);
      assert.equal(firstEnsure.outcome, 'created');
      assert.ok(firstEnsure.fundingId);
      assert.ok(firstEnsure.runId);
      assert.ok(firstEnsure.grantId);

      const pending = await preparePendingLaunch(database, ownerId);
      const admitted = await admitLaunchWriterMission(database, {
        ownerId,
        operationId: pending.operationId,
        libraryRootHash: LIBRARY_ROOT_HASH,
        libraryRootRevision: 1,
      });
      assert.equal(admitted.replayed, false);
      assert.equal(admitted.reservedStoryId, pending.reservedStoryId);

      assert.equal(await countGenerations(database, ownerId), 1);
      assert.equal(await countLaunchWakeOutbox(database, ownerId), 1);

      const operations = await database.db
        .select()
        .from(storytellerOperation)
        .where(eq(storytellerOperation.ownerId, ownerId));
      assert.equal(operations.length, 1);
      assert.equal(operations[0]?.generationId, admitted.generationId);

      const secondEnsure = await runTestlabFundingEnsure(ensureFlags, deps);
      assert.equal(secondEnsure.outcome, 'reused');
      assert.equal(secondEnsure.fundingId, firstEnsure.fundingId);
      assert.equal(secondEnsure.runId, firstEnsure.runId);
      assert.equal(secondEnsure.grantId, firstEnsure.grantId);

      const replayed = await admitLaunchWriterMission(database, {
        ownerId,
        operationId: pending.operationId,
        libraryRootHash: LIBRARY_ROOT_HASH,
        libraryRootRevision: 1,
      });
      assert.equal(replayed.replayed, true);
      assert.equal(replayed.generationId, admitted.generationId);
      assert.equal(await countGenerations(database, ownerId), 1);
      assert.equal(await countLaunchWakeOutbox(database, ownerId), 1);

      assert.equal(readTestlabProviderTripwireCount(), 0);

      await t.test(
        'missing grant refuses without generation or outbox',
        async () => {
          const launch = await preparePendingLaunch(database, deniedOwnerId);
          await assert.rejects(
            () =>
              admitLaunchWriterMission(database, {
                ownerId: deniedOwnerId,
                operationId: launch.operationId,
                libraryRootHash: LIBRARY_ROOT_HASH,
                libraryRootRevision: 1,
              }),
            (error: unknown) =>
              error instanceof Error && error.message === 'launch_not_admitted',
          );
          assert.equal(await countGenerations(database, deniedOwnerId), 0);
          assert.equal(await countLaunchWakeOutbox(database, deniedOwnerId), 0);
        },
      );

      await t.test('expired grant refuses admission', async () => {
        const expiredOwner = `user_${randomUUID()}`;
        await insertUser(database, expiredOwner);
        await seedExpiredLaunchGrant(database, expiredOwner);
        const launch = await preparePendingLaunch(database, expiredOwner);
        await assert.rejects(
          () =>
            admitLaunchWriterMission(database, {
              ownerId: expiredOwner,
              operationId: launch.operationId,
              libraryRootHash: LIBRARY_ROOT_HASH,
              libraryRootRevision: 1,
            }),
          (error: unknown) =>
            error instanceof Error && error.message === 'launch_not_admitted',
        );
        assert.equal(await countGenerations(database, expiredOwner), 0);
        assert.equal(await countLaunchWakeOutbox(database, expiredOwner), 0);
      });

      await t.test('incompatible grant limits refuse admission', async () => {
        const incompatibleOwner = `user_${randomUUID()}`;
        await insertUser(database, incompatibleOwner);
        await seedInadmissibleLaunchGrant(database, incompatibleOwner);
        const launch = await preparePendingLaunch(database, incompatibleOwner);
        await assert.rejects(
          () =>
            admitLaunchWriterMission(database, {
              ownerId: incompatibleOwner,
              operationId: launch.operationId,
              libraryRootHash: LIBRARY_ROOT_HASH,
              libraryRootRevision: 1,
            }),
          (error: unknown) =>
            error instanceof Error && error.message === 'launch_not_admitted',
        );
        assert.equal(await countGenerations(database, incompatibleOwner), 0);
        assert.equal(
          await countLaunchWakeOutbox(database, incompatibleOwner),
          0,
        );
      });

      await t.test(
        'wrong owner cannot admit another users pending launch',
        async () => {
          const wrongOwner = `user_${randomUUID()}`;
          await insertUser(database, wrongOwner);
          const otherLaunch = await preparePendingLaunch(database, wrongOwner);
          await assert.rejects(
            () =>
              admitLaunchWriterMission(database, {
                ownerId,
                operationId: otherLaunch.operationId,
                libraryRootHash: LIBRARY_ROOT_HASH,
                libraryRootRevision: 1,
              }),
            (error: unknown) =>
              error instanceof Error && error.message === 'launch_not_found',
          );
          assert.equal(await countGenerations(database, wrongOwner), 0);
          assert.equal(await countLaunchWakeOutbox(database, wrongOwner), 0);
        },
      );
    });

    if (!outcome.available) {
      t.skip(outcome.error ?? 'disposable Postgres unavailable');
    }
  },
);
