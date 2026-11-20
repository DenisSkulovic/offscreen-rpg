import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { applyMigrations } from '@offscreen/db/migrate';
import { generation } from '@offscreen/db/generation-schema';
import {
  storytellerAttempt,
  storytellerFunding,
  storytellerOperation,
  storytellerRun,
} from '@offscreen/db/storyteller-schema';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { prepareStorytellerTask } from '@offscreen/storyteller/tasks';
import { createStorytellerBudget } from '../dist/storyteller/budget.js';
import { resolveIndependentAuthorityFromStore } from '../dist/storyteller/current-authority.js';
import { revokeCurrentOwnerGrantUnderFundingLock } from '../dist/storyteller/test-revoke-current-owner-grant.js';
import { insertSyntheticCurrentAuthorityForTest } from '../dist/storyteller/test-synthetic-current-authority.js';
import { loadCurrentDispatchAuthority } from '../dist/storyteller/load-current-dispatch-authority.js';

const requireFromDatabasePackage = createRequire(
  new URL('../../db/package.json', import.meta.url),
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
  new URL('../../db/migrations', import.meta.url).pathname,
);

const digest = 'ef'.repeat(32);
const route = 'fake:economy';
const priceVersion = 'obs00-dispatch.v1';

function entitlementProfile(revision) {
  return {
    schemaVersion: 1,
    id: 'obs00-dispatch-entitlement.v1',
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
      maxModelRoundsPerOperation: 2,
      maxReadsPerOperation: 0,
      maxRetainedReadBytes: 0,
      maxMicrousdPerOperation: '0',
      maxInFlightDispatches: 2,
      maxBackgroundJobsPerWindow: 0,
    },
    windows: [],
  };
}

function platformProfile(revision) {
  return {
    ...entitlementProfile(revision),
    id: 'obs00-dispatch-platform.v1',
  };
}

function routeMap(revision) {
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

function providerPolicy() {
  return {
    version: 'obs00-dispatch.v1',
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

function activePlatform(revision) {
  const profile = platformProfile(revision);
  return {
    revision,
    profile,
    routeMap: routeMap(revision),
    enabled: true,
  };
}

function activeGrant(input) {
  const { revision, userId, accountId, runId, overrides = {} } = input;
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
    ['storyteller_usage_allocation', ids.attemptIds, 'attempt_id'],
    ['storyteller_attempt', ids.attemptIds],
    ['storyteller_operation', ids.generationIds, 'generation_id'],
    ['generation', ids.generationIds],
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

async function seedDispatchReady(client, { revision, withAuthority }) {
  const userId = `user_${randomUUID()}`;
  const draftId = randomUUID();
  const accountId = randomUUID();
  const runId = randomUUID();
  const generationId = randomUUID();
  let platformId = randomUUID();
  let grantId = randomUUID();

  await client.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, 'OBS00 Dispatch', $2, true, now(), now())`,
    [userId, `${userId}@example.test`],
  );
  await client.query(
    `INSERT INTO story_draft (
       id, owner_id, character_name, title, premise, storytelling_direction, revision
     ) VALUES ($1, $2, 'Traveler', 'Trial', 'A trial.', 'Direct.', 1)`,
    [draftId, userId],
  );
  await client.query(
    `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
     VALUES ($1, 1000000000000, false, now())`,
    [accountId],
  );
  await client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1, $2, 1000000000000, 10, true)`,
    [runId, accountId],
  );

  const platform = activePlatform(revision);
  const grant = activeGrant({
    revision,
    userId,
    accountId,
    runId,
    overrides: { id: grantId },
  });
  const store = resolveIndependentAuthorityFromStore({ platform, grant });
  assert.equal(store.kind, 'allowed');
  const capturedPolicy = store.policy;

  const execution = {
    mode: 'provider',
    accountId,
    runId,
    dispatchReview: { mode: 'hold' },
    policy: providerPolicy(),
  };
  const prepared = prepareStorytellerTask({
    task: 'opening',
    source: { draftId, draftRevision: 1 },
    profile: storytellerCatalogue.resolve({
      id: 'absurd-action-comedy',
      revision: 1,
    }),
    execution,
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
        maxMicrousd: '1000000000000',
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
        premise: 'A disposable dispatch trial.',
        storytellingDirection: 'Direct.',
      },
      current: null,
      selected: null,
      items: [],
      notes: [],
      evidence: [],
    },
  });
  const task = prepared;

  const database = createDatabase(config, () => {});
  await database.db.insert(generation).values({
    id: generationId,
    ownerId: userId,
    kind: 'storyteller.profiled.v1',
    input: task,
    state: 'pending',
  });

  const budget = createStorytellerBudget(database);
  const attemptId = randomUUID();
  assert.equal(
    await budget.reserve({
      id: attemptId,
      generationId,
      ownerId: userId,
      task,
    }),
    'reserved',
  );

  if (withAuthority) {
  const synthetic = await insertSyntheticCurrentAuthorityForTest(database, {
      capturedPolicy,
      executionPolicy: execution.policy,
      ownerId: userId,
      accountId,
      runId,
    });
    grantId = synthetic.grantId;
    platformId = synthetic.platformId;
  }

  return {
    ids: {
      userIds: [userId],
      draftIds: [draftId],
      accountIds: [accountId],
      runIds: [runId],
      generationIds: [generationId],
      attemptIds: [attemptId],
      platformIds: withAuthority ? [platformId] : [],
      grantIds: withAuthority ? [grantId] : [],
    },
    attemptId,
    execution,
    database,
    budget,
    grantId,
    accountId,
    runId,
    userId,
    capturedPolicy,
    task,
    generationId,
  };
}

test('OBS00-B T04: dispatch SQL owns authorization', async (t) => {
  const priorFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('network refused in OBS00-B dispatch tests');
  };
  const admin = new Client(config);
  await admin.connect();
  try {
    await applyMigrations(config, migrations);
    await admin.query(
      `DELETE FROM storyteller_attempt WHERE state = 'uncertain' AND estimation_method = 'obs00-dispatch'`,
    );
    await admin.query(
      `DELETE FROM storyteller_current_owner_grant WHERE operator_id IN ('op-obs00', 'synthetic-test-operator')`,
    );
    await admin.query(
      `UPDATE storyteller_current_platform_policy SET enabled = false WHERE enabled = true`,
    );

    await t.test('missing grant releases reserved attempt once as unsent', async () => {
      const fixture = await seedDispatchReady(admin, {
        revision: 21,
        withAuthority: false,
      });
      try {
        const [beforeFunding] = await fixture.database.db
          .select()
          .from(storytellerFunding)
          .where(eq(storytellerFunding.id, fixture.accountId));
        const [beforeRun] = await fixture.database.db
          .select()
          .from(storytellerRun)
          .where(eq(storytellerRun.id, fixture.runId));
        const [beforeOperation] = await fixture.database.db
          .select()
          .from(storytellerOperation)
          .where(eq(storytellerOperation.generationId, fixture.generationId));
        assert.equal(beforeOperation?.reservedRounds, 1);
        assert.equal(await fixture.budget.dispatch(fixture.attemptId, fixture.execution, true), false);
        assert.equal(await fixture.budget.dispatch(fixture.attemptId, fixture.execution, true), false);
        const [attemptRow] = await fixture.database.db
          .select()
          .from(storytellerAttempt)
          .where(eq(storytellerAttempt.id, fixture.attemptId));
        assert.equal(attemptRow?.state, 'unsent');
        assert.equal(attemptRow?.dispatchAuthorityGrantId, null);
        const [afterFunding] = await fixture.database.db
          .select()
          .from(storytellerFunding)
          .where(eq(storytellerFunding.id, fixture.accountId));
        const [afterRun] = await fixture.database.db
          .select()
          .from(storytellerRun)
          .where(eq(storytellerRun.id, fixture.runId));
        const [afterOperation] = await fixture.database.db
          .select()
          .from(storytellerOperation)
          .where(eq(storytellerOperation.generationId, fixture.generationId));
        assert.equal(afterOperation?.reservedRounds, 0);
        assert.equal(afterFunding?.reservedMicrousd, 0n);
        assert.equal(afterRun?.reservedMicrousd, 0n);
      } finally {
        await cleanup(admin, fixture.ids);
      }
    });

    await t.test('two workers compete for one reserved attempt', async () => {
      const fixture = await seedDispatchReady(admin, {
        revision: 22,
        withAuthority: true,
      });
      try {
        const peer = createDatabase(config, () => {});
        const peerBudget = createStorytellerBudget(peer);
        const [first, second] = await Promise.all([
          fixture.budget.dispatch(fixture.attemptId, fixture.execution, true),
          peerBudget.dispatch(fixture.attemptId, fixture.execution, true),
        ]);
        assert.equal(Number(first) + Number(second), 1);
        const [attemptRow] = await fixture.database.db
          .select()
          .from(storytellerAttempt)
          .where(eq(storytellerAttempt.id, fixture.attemptId));
        assert.equal(attemptRow?.state, 'dispatched');
        assert.equal(attemptRow?.dispatchAuthorityGrantId, fixture.grantId);
      } finally {
        await cleanup(admin, fixture.ids);
      }
    });

    await t.test('revocation before dispatch denies with unsent release', async () => {
      const fixture = await seedDispatchReady(admin, {
        revision: 23,
        withAuthority: true,
      });
      try {
        const revoked = await fixture.database.db.transaction((tx) =>
          revokeCurrentOwnerGrantUnderFundingLock(
            tx,
            fixture.execution,
            fixture.grantId,
          ),
        );
        assert.equal(revoked, true);
        assert.equal(
          await fixture.budget.dispatch(fixture.attemptId, fixture.execution, true),
          false,
        );
        const [attemptRow] = await fixture.database.db
          .select()
          .from(storytellerAttempt)
          .where(eq(storytellerAttempt.id, fixture.attemptId));
        assert.equal(attemptRow?.state, 'unsent');
      } finally {
        await cleanup(admin, fixture.ids);
      }
    });

    await t.test('dispatch before revocation stays dispatched', async () => {
      const fixture = await seedDispatchReady(admin, {
        revision: 24,
        withAuthority: true,
      });
      try {
        const authority = await fixture.database.db.transaction(async (tx) => {
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
        assert.equal(
          authority.kind,
          'allowed',
          authority.kind === 'denied' ? authority.reason : 'expected allowed authority',
        );
        assert.equal(
          await fixture.budget.dispatch(fixture.attemptId, fixture.execution, true),
          true,
        );
        const revoked = await fixture.database.db.transaction((tx) =>
          revokeCurrentOwnerGrantUnderFundingLock(
            tx,
            fixture.execution,
            fixture.grantId,
          ),
        );
        assert.equal(revoked, true);
        const [attemptRow] = await fixture.database.db
          .select()
          .from(storytellerAttempt)
          .where(eq(storytellerAttempt.id, fixture.attemptId));
        assert.equal(attemptRow?.state, 'dispatched');
        assert.equal(attemptRow?.dispatchAuthorityGrantId, fixture.grantId);
      } finally {
        await cleanup(admin, fixture.ids);
      }
    });

    await t.test('existing uncertain attempt blocks new dispatch', async () => {
      const fixture = await seedDispatchReady(admin, {
        revision: 25,
        withAuthority: true,
      });
      const uncertainId = randomUUID();
      try {
        await fixture.database.db.insert(storytellerAttempt).values({
          id: uncertainId,
          generationId: fixture.generationId,
          accountId: fixture.accountId,
          runId: fixture.runId,
          ownerId: fixture.userId,
          storyId: null,
          draftId: fixture.ids.draftIds[0],
          purpose: 'opening',
          storytellerProfileId: fixture.task.profile.id,
          storytellerProfileRevision: fixture.task.profile.revision,
          taskInputVersion: fixture.task.inputVersion,
          promptVersion: fixture.task.promptVersion,
          recipeVersion: fixture.task.resources.recipe.version,
          resourcePolicyVersion: fixture.task.resources.version,
          requestedModel: fixture.execution.policy.model,
          requestedProvider: fixture.execution.policy.provider,
          priceVersion: fixture.execution.policy.priceVersion,
          attribution: {},
          state: 'uncertain',
          reservedMicrousd: 0n,
          reservedInputTokens: 0,
          reservedGeneratedTokens: 0,
          reservedReasoningTokens: 0,
          estimatedMicrousd: 0n,
          estimatedInputTokens: 0,
          estimationMethod: 'obs00-dispatch',
          reconciliation: 'unknown',
          requestBytes: 0,
          policy: fixture.execution.policy,
          dispatchedAt: new Date(),
        });
        fixture.ids.attemptIds.push(uncertainId);
        assert.equal(
          await fixture.budget.dispatch(fixture.attemptId, fixture.execution, true),
          false,
        );
        const [attemptRow] = await fixture.database.db
          .select()
          .from(storytellerAttempt)
          .where(eq(storytellerAttempt.id, fixture.attemptId));
        assert.equal(attemptRow?.state, 'unsent');
      } finally {
        await cleanup(admin, fixture.ids);
      }
    });

    await t.test('callback true without authority rows still denies', async () => {
      const fixture = await seedDispatchReady(admin, {
        revision: 26,
        withAuthority: false,
      });
      try {
        assert.equal(
          await fixture.budget.dispatch(fixture.attemptId, fixture.execution, true),
          false,
        );
      } finally {
        await cleanup(admin, fixture.ids);
      }
    });
  } finally {
    await admin.end();
    globalThis.fetch = priorFetch;
  }
});