import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { applyMigrations } from '@offscreen/db/migrate';
import { generation } from '@offscreen/db/generation-schema';
import { user } from '@offscreen/identity-persistence/auth';
import { storyDraft } from '@offscreen/db/draft-schema';
import {
  storytellerAttempt,
  storytellerFunding,
  storytellerOperation,
  storytellerRun,
} from '@offscreen/db/storyteller-schema';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { prepareStorytellerTask } from '@offscreen/storyteller/tasks';
import { resolveIndependentAuthorityFromStore } from '../../../packages/story-engine/dist/storyteller/current-authority.js';
import { loadCurrentDispatchAuthority } from '../../../packages/story-engine/dist/storyteller/load-current-dispatch-authority.js';

const requireFromDatabasePackage = createRequire(
  new URL('../../../packages/db/package.json', import.meta.url),
);
const { Client } = requireFromDatabasePackage('pg');

const url = process.env['DATABASE_TEST_URL'];
if (!url || new URL(url).pathname !== '/offscreen_db_test') {
  throw new Error(
    'DATABASE_TEST_URL must explicitly target the disposable offscreen_db_test database.',
  );
}
const config = readDatabaseConfig({ DATABASE_URL: url });
const migrations = resolve(
  new URL('../../../packages/db/migrations', import.meta.url).pathname,
);

const digest = 'ef'.repeat(32);
const route = 'fake:economy';

function entitlementProfile(revision) {
  return {
    schemaVersion: 1,
    id: 'obs00-sql-entitlement.v1',
    revision,
    enabled: true,
    allowedRoutes: [route],
    defaultRoute: route,
    fundingModes: ['prepaid'],
    recovery: 'explicit-resume',
    limits: {
      maxInputTokensPerRequest: 1_000,
      maxSerializedBytesPerRequest: 4_096,
      maxGeneratedTokensPerRequest: 128,
      maxReasoningTokensPerRequest: 0,
      maxInputTokensPerOperation: 3_000,
      maxGeneratedTokensPerOperation: 256,
      maxModelRoundsPerOperation: 1,
      maxReadsPerOperation: 0,
      maxRetainedReadBytes: 0,
      maxMicrousdPerOperation: '0',
      maxInFlightDispatches: 1,
      maxBackgroundJobsPerWindow: 0,
    },
    windows: [],
  };
}

function platformProfile(revision) {
  return {
    ...entitlementProfile(revision),
    id: 'obs00-sql-platform.v1',
  };
}

function routeMap(revision, priceVersion = 'obs00-sql.v1') {
  return {
    schemaVersion: 1,
    revision,
    routes: [
      {
        route,
        provider: 'Fake',
        model: 'fake/test',
        priceVersion,
        fundingModes: ['prepaid'],
        executionPolicyDigest: digest,
        sourceDigest: digest,
      },
    ],
  };
}

function providerPolicy(priceVersion = 'obs00-sql.v1') {
  return {
    version: 'obs00-loader.v1',
    route,
    model: 'fake/test',
    provider: 'Fake',
    priceVersion,
    inputMicrousdPerMillion: '0',
    outputMicrousdPerMillion: '0',
    maxInputTokens: 1_000,
    maxOutputTokens: 128,
    timeoutMs: 5_000,
  };
}

function activePlatform(revision, priceVersion) {
  const profile = platformProfile(revision);
  return {
    revision,
    profile,
    routeMap: routeMap(revision, priceVersion),
    enabled: true,
  };
}

function activeGrant(input) {
  const {
    revision,
    userId,
    accountId,
    runId,
    overrides = {},
  } = input;
  return {
    id: randomUUID(),
    revision,
    userId,
    accountId,
    runId,
    entitlementProfile: entitlementProfile(revision),
    restrictions: [],
    enabled: true,
    revokedAt: null,
    noExpiry: true,
    expiresAt: null,
    requestedRoute: route,
    requestedFundingMode: 'prepaid',
    operatorId: 'op-obs00',
    approvalIdentity: 'approval-obs00',
    ...overrides,
  };
}

async function cleanup(client, ids) {
  const tables = [
    ['storyteller_attempt', ids.attemptIds],
    ['storyteller_operation', ids.generationIds, 'generation_id'],
    ['generation', ids.generationIds],
    ['draft_opening', ids.draftIds, 'draft_id'],
    ['story_draft', ids.draftIds],
    ['storyteller_current_owner_grant', ids.grantIds],
    ['storyteller_current_platform_policy', ids.platformIds],
    ['storyteller_run', ids.runIds],
    ['storyteller_funding', ids.accountIds],
    ['"user"', ids.userIds],
  ];
  for (const [table, values, column = 'id'] of tables) {
    for (const value of values) {
      await client.query(`DELETE FROM ${table} WHERE ${column} = $1`, [value]);
    }
  }
}

async function seedCore(client, { revision, priceVersion, grantOverrides }) {
  const userId = `user_${randomUUID()}`;
  const draftId = randomUUID();
  const accountId = randomUUID();
  const runId = randomUUID();
  const generationId = randomUUID();
  const attemptId = randomUUID();
  const platformId = randomUUID();
  const grantId = randomUUID();

  await client.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, 'OBS00 Loader', $2, true, now(), now())`,
    [userId, `${userId}@example.test`],
  );
  await client.query(
    `INSERT INTO story_draft (
       id, owner_id, character_name, title, premise, storytelling_direction, revision
     ) VALUES ($1, $2, 'Traveler', 'Trial', 'A trial.', 'Direct.', 1)`,
    [draftId, userId],
  );
  await client.query(
    `INSERT INTO storyteller_funding (id, limit_microusd, verified_at)
     VALUES ($1, 1, now())`,
    [accountId],
  );
  await client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1, $2, 1, 4, true)`,
    [runId, accountId],
  );

  const platform = activePlatform(revision, priceVersion);
  const captureGrant = activeGrant({
    revision,
    userId,
    accountId,
    runId,
    overrides: { id: grantId },
  });
  const grant = activeGrant({
    revision,
    userId,
    accountId,
    runId,
    overrides: { ...grantOverrides, id: grantId },
  });
  const store = resolveIndependentAuthorityFromStore({
    platform,
    grant: captureGrant,
  });
  assert.equal(store.kind, 'allowed', 'fixture store must allow');
  const capturedPolicy = store.policy;

  const task = prepareStorytellerTask({
    task: 'opening',
    source: { draftId, draftRevision: 1 },
    profile: storytellerCatalogue.resolve({
      id: 'absurd-action-comedy',
      revision: 1,
    }),
    execution: {
      mode: 'provider',
      accountId,
      runId,
      dispatchReview: { mode: 'hold' },
      policy: providerPolicy(priceVersion),
    },
    resources: {
      version: 'storyteller-resources.v2',
      recipe: {
        version: 'single-turn.v1',
        maxModelRounds: 1,
        maxReads: 0,
        tools: 'disabled',
        automaticEscalation: false,
      },
      envelope: {
        maxSerializedRequestBytes: 48_000,
        maxInputTokens: 1_000,
        maxGeneratedTokens: 128,
        maxReasoningTokens: 0,
        maxMicrousd: '0',
        deadlineMs: 5_000,
      },
      authority: {
        kind: 'effective-usage-policy',
        policy: capturedPolicy,
      },
    },
    context: {
      premise: {
        title: 'Trial',
        premise: 'A disposable authority trial.',
        storytellingDirection: 'Direct.',
      },
      current: null,
      selected: null,
      items: [],
      notes: [],
      evidence: [],
    },
  });

  const database = createDatabase(config, () => {});
  await database.db.insert(generation).values({
    id: generationId,
    ownerId: userId,
    kind: 'storyteller.profiled.v1',
    input: task,
    state: 'running',
    attemptId,
  });
  await database.db.insert(storytellerOperation).values({
    generationId,
    accountId,
    runId,
    ownerId: userId,
    purpose: 'opening',
    resources: task.resources,
    maxModelRounds: 1,
    maxInputTokens: 1_000,
    maxGeneratedTokens: 128,
    maxReasoningTokens: 0,
    maxMicrousd: 0n,
  });
  await database.db.insert(storytellerAttempt).values({
    id: attemptId,
    generationId,
    accountId,
    runId,
    ownerId: userId,
    storyId: null,
    draftId,
    purpose: 'opening',
    storytellerProfileId: task.profile.id,
    storytellerProfileRevision: task.profile.revision,
    taskInputVersion: task.inputVersion,
    promptVersion: task.promptVersion,
    recipeVersion: task.resources.recipe.version,
    resourcePolicyVersion: task.resources.version,
    requestedModel: task.execution.policy.model,
    requestedProvider: task.execution.policy.provider,
    priceVersion: task.execution.policy.priceVersion,
    attribution: {},
    state: 'reserved',
    reservedMicrousd: 0n,
    reservedInputTokens: 100,
    reservedGeneratedTokens: 128,
    reservedReasoningTokens: 0,
    estimatedMicrousd: 0n,
    estimatedInputTokens: 100,
    estimationMethod: 'obs00-loader',
    reconciliation: 'pending',
    requestBytes: 256,
    policy: task.execution.policy,
  });

  return {
    ids: {
      userIds: [userId],
      draftIds: [draftId],
      accountIds: [accountId],
      runIds: [runId],
      generationIds: [generationId],
      attemptIds: [attemptId],
      platformIds: [platformId],
      grantIds: [grantId],
    },
    platform,
    grant,
    attemptId,
    generationId,
    platformId,
    grantId,
    database,
  };
}

async function clearEnabledPlatformPolicies(client) {
  await client.query(
    `UPDATE storyteller_current_platform_policy SET enabled = false WHERE enabled = true`,
  );
}

async function insertPlatform(client, platformId, platform) {
  await clearEnabledPlatformPolicies(client);
  await client.query(
    `INSERT INTO storyteller_current_platform_policy (id, revision, profile, route_map, enabled)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, true)`,
    [
      platformId,
      platform.revision,
      JSON.stringify(platform.profile),
      JSON.stringify(platform.routeMap),
    ],
  );
}

async function insertGrant(client, grant) {
  await client.query(
    `INSERT INTO storyteller_current_owner_grant (
       id, revision, user_id, account_id, run_id, entitlement_profile, restrictions, enabled,
       revoked_at, no_expiry, expires_at, requested_route, requested_funding_mode, operator_id,
       approval_identity
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, '[]'::jsonb, $7, $8, $9, $10, $11, 'prepaid', $12, $13)`,
    [
      grant.id,
      grant.revision,
      grant.userId,
      grant.accountId,
      grant.runId,
      JSON.stringify(grant.entitlementProfile),
      grant.enabled,
      grant.revokedAt,
      grant.noExpiry,
      grant.expiresAt,
      grant.requestedRoute,
      grant.operatorId,
      grant.approvalIdentity,
    ],
  );
}

test('OBS00-B T03: loadCurrentDispatchAuthority on disposable SQL', async (t) => {
  const admin = new Client(config);
  await admin.connect();
  try {
    await applyMigrations(config, migrations);

    await t.test('equal independently recomputed policy allows', async () => {
      const revision = 11;
      const fixture = await seedCore(admin, { revision, priceVersion: 'obs00-sql.v1', grantOverrides: {} });
      try {
        await insertPlatform(admin, fixture.platformId, fixture.platform);
        await insertGrant(admin, fixture.grant);
        const outcome = await fixture.database.db.transaction(async (tx) => {
          const [attempt] = await tx
            .select()
            .from(storytellerAttempt)
            .where(eq(storytellerAttempt.id, fixture.attemptId));
          const [operation] = await tx
            .select()
            .from(storytellerOperation)
            .where(eq(storytellerOperation.generationId, fixture.generationId));
          return loadCurrentDispatchAuthority(tx, { attempt, operation });
        });
        assert.equal(outcome.kind, 'allowed');
      } finally {
        await cleanup(admin, fixture.ids);
      }
    });

    await t.test('missing platform denies', async () => {
      const revision = 12;
      const fixture = await seedCore(admin, { revision, priceVersion: 'obs00-sql.v1', grantOverrides: {} });
      try {
        await clearEnabledPlatformPolicies(admin);
        await insertGrant(admin, fixture.grant);
        const outcome = await fixture.database.db.transaction(async (tx) => {
          const [attempt] = await tx
            .select()
            .from(storytellerAttempt)
            .where(eq(storytellerAttempt.id, fixture.attemptId));
          const [operation] = await tx
            .select()
            .from(storytellerOperation)
            .where(eq(storytellerOperation.generationId, fixture.generationId));
          return loadCurrentDispatchAuthority(tx, { attempt, operation });
        });
        assert.deepEqual(outcome, { kind: 'denied', reason: 'platform_missing' });
      } finally {
        await cleanup(admin, fixture.ids);
      }
    });

    await t.test('revoked grant denies', async () => {
      const revision = 13;
      const fixture = await seedCore(admin, {
        revision,
        priceVersion: 'obs00-sql.v1',
        grantOverrides: {
          enabled: false,
          revokedAt: '2026-01-01T00:00:00.000Z',
        },
      });
      try {
        await insertPlatform(admin, fixture.platformId, fixture.platform);
        await insertGrant(admin, fixture.grant);
        const outcome = await fixture.database.db.transaction(async (tx) => {
          const [attempt] = await tx
            .select()
            .from(storytellerAttempt)
            .where(eq(storytellerAttempt.id, fixture.attemptId));
          const [operation] = await tx
            .select()
            .from(storytellerOperation)
            .where(eq(storytellerOperation.generationId, fixture.generationId));
          return loadCurrentDispatchAuthority(tx, { attempt, operation });
        });
        assert.deepEqual(outcome, { kind: 'denied', reason: 'grant_disabled' });
      } finally {
        await cleanup(admin, fixture.ids);
      }
    });

    await t.test('expired grant denies', async () => {
      const revision = 14;
      const fixture = await seedCore(admin, {
        revision,
        priceVersion: 'obs00-sql.v1',
        grantOverrides: {
          noExpiry: false,
          expiresAt: '1999-01-01T00:00:00.000Z',
        },
      });
      try {
        await insertPlatform(admin, fixture.platformId, fixture.platform);
        await insertGrant(admin, fixture.grant);
        const outcome = await fixture.database.db.transaction(async (tx) => {
          const [attempt] = await tx
            .select()
            .from(storytellerAttempt)
            .where(eq(storytellerAttempt.id, fixture.attemptId));
          const [operation] = await tx
            .select()
            .from(storytellerOperation)
            .where(eq(storytellerOperation.generationId, fixture.generationId));
          return loadCurrentDispatchAuthority(
            tx,
            { attempt, operation },
            new Date('2020-01-01T00:00:00.000Z'),
          );
        });
        assert.deepEqual(outcome, { kind: 'denied', reason: 'grant_expired' });
      } finally {
        await cleanup(admin, fixture.ids);
      }
    });

    await t.test('wrong owner denies', async () => {
      const revision = 15;
      const fixture = await seedCore(admin, { revision, priceVersion: 'obs00-sql.v1', grantOverrides: {} });
      const otherUser = `user_${randomUUID()}`;
      try {
        await admin.query(
          `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
           VALUES ($1, 'Other', $2, true, now(), now())`,
          [otherUser, `${otherUser}@example.test`],
        );
        fixture.ids.userIds.push(otherUser);
        fixture.grant.userId = otherUser;
        await insertPlatform(admin, fixture.platformId, fixture.platform);
        await insertGrant(admin, fixture.grant);
        const outcome = await fixture.database.db.transaction(async (tx) => {
          const [attempt] = await tx
            .select()
            .from(storytellerAttempt)
            .where(eq(storytellerAttempt.id, fixture.attemptId));
          const [operation] = await tx
            .select()
            .from(storytellerOperation)
            .where(eq(storytellerOperation.generationId, fixture.generationId));
          return loadCurrentDispatchAuthority(tx, { attempt, operation });
        });
        assert.deepEqual(outcome, { kind: 'denied', reason: 'grant_missing' });
      } finally {
        await cleanup(admin, fixture.ids);
      }
    });

    await t.test('price or provider drift denies', async () => {
      const revision = 16;
      const fixture = await seedCore(admin, {
        revision,
        priceVersion: 'obs00-sql.v1',
        grantOverrides: {},
      });
      fixture.platform.routeMap = routeMap(revision, 'obs00-drift.v2');
      try {
        await insertPlatform(admin, fixture.platformId, fixture.platform);
        await insertGrant(admin, fixture.grant);
        const outcome = await fixture.database.db.transaction(async (tx) => {
          const [attempt] = await tx
            .select()
            .from(storytellerAttempt)
            .where(eq(storytellerAttempt.id, fixture.attemptId));
          const [operation] = await tx
            .select()
            .from(storytellerOperation)
            .where(eq(storytellerOperation.generationId, fixture.generationId));
          return loadCurrentDispatchAuthority(tx, { attempt, operation });
        });
        assert.deepEqual(outcome, { kind: 'denied', reason: 'route_binding_mismatch' });
      } finally {
        await cleanup(admin, fixture.ids);
      }
    });

    await t.test('invalid JSON denies safely', async () => {
      const revision = 17;
      const fixture = await seedCore(admin, { revision, priceVersion: 'obs00-sql.v1', grantOverrides: {} });
      try {
        await insertPlatform(admin, fixture.platformId, fixture.platform);
        await insertGrant(admin, fixture.grant);
        await admin.query(
          `UPDATE storyteller_current_owner_grant
           SET restrictions = $2::jsonb
           WHERE id = $1`,
          [fixture.grantId, JSON.stringify([{ bad: true }])],
        );
        const outcome = await fixture.database.db.transaction(async (tx) => {
          const [attempt] = await tx
            .select()
            .from(storytellerAttempt)
            .where(eq(storytellerAttempt.id, fixture.attemptId));
          const [operation] = await tx
            .select()
            .from(storytellerOperation)
            .where(eq(storytellerOperation.generationId, fixture.generationId));
          return loadCurrentDispatchAuthority(tx, { attempt, operation });
        });
        assert.equal(outcome.kind, 'denied');
        assert.equal(outcome.reason, 'invalid_store');
      } finally {
        await cleanup(admin, fixture.ids);
      }
    });
  } finally {
    await admin.end();
  }
});