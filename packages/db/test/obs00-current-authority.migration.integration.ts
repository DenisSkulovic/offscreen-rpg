import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { readDatabaseConfig } from '../src/config';
import { applyMigrations } from '../src/migrate';

const url = process.env['DATABASE_TEST_URL'];
if (!url || new URL(url).pathname !== '/offscreen_db_test') {
  throw new Error(
    'DATABASE_TEST_URL must explicitly target the disposable offscreen_db_test database.',
  );
}
const config = readDatabaseConfig({ DATABASE_URL: url });
const migrations = resolve(__dirname, '../../migrations');

const digest = 'ef'.repeat(32);

function entitlementProfile(revision: number) {
  return {
    schemaVersion: 1,
    id: 'obs00-sql-entitlement.v1',
    revision,
    enabled: true,
    allowedRoutes: ['fake:economy'],
    defaultRoute: 'fake:economy',
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

function routeMap(revision: number) {
  return {
    schemaVersion: 1,
    revision,
    routes: [
      {
        route: 'fake:economy',
        provider: 'Fake',
        model: 'fake/test',
        priceVersion: 'obs00-sql.v1',
        fundingModes: ['prepaid'],
        executionPolicyDigest: digest,
        sourceDigest: digest,
      },
    ],
  };
}

test('OBS00-B T02: migration constraints on disposable SQL', async () => {
  const client = new Client(config);
  await client.connect();
  try {
    await applyMigrations(config, migrations);

    await assert.rejects(
      client.query(
        `INSERT INTO storyteller_current_platform_policy (id, revision, profile, route_map)
         VALUES ($1, 1, $2::jsonb, $3::jsonb)`,
        [
          randomUUID(),
          JSON.stringify({ schemaVersion: 1, id: 'bad', revision: 2 }),
          JSON.stringify(routeMap(1)),
        ],
      ),
    );

    const platformId = randomUUID();
    const revision = 4;
    await client.query(
      `INSERT INTO storyteller_current_platform_policy (id, revision, profile, route_map, enabled)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, false)`,
      [
        platformId,
        revision,
        JSON.stringify(entitlementProfile(revision)),
        JSON.stringify(routeMap(revision)),
      ],
    );
    const secondEnabled = randomUUID();
    await client.query(
      `INSERT INTO storyteller_current_platform_policy (id, revision, profile, route_map, enabled)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, true)`,
      [
        secondEnabled,
        revision,
        JSON.stringify(entitlementProfile(revision)),
        JSON.stringify(routeMap(revision)),
      ],
    );
    await assert.rejects(
      client.query(
        `INSERT INTO storyteller_current_platform_policy (id, revision, profile, route_map, enabled)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, true)`,
        [
          randomUUID(),
          revision,
          JSON.stringify(entitlementProfile(revision)),
          JSON.stringify(routeMap(revision)),
        ],
      ),
    );

    const userId = `user_${randomUUID()}`;
    await client.query(
      `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
       VALUES ($1, 'OBS00', $2, true, now(), now())`,
      [userId, `${userId}@example.test`],
    );
    const accountId = randomUUID();
    await client.query(
      `INSERT INTO storyteller_funding (id, limit_microusd, verified_at)
       VALUES ($1, 0, now())`,
      [accountId],
    );
    const runId = randomUUID();
    await client.query(
      `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
       VALUES ($1, $2, 0, 1, true)`,
      [runId, accountId],
    );
    const accountIdB = randomUUID();
    await client.query(
      `INSERT INTO storyteller_funding (id, limit_microusd, verified_at)
       VALUES ($1, 0, now())`,
      [accountIdB],
    );
    const mismatchedRunId = randomUUID();
    await client.query(
      `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
       VALUES ($1, $2, 0, 1, true)`,
      [mismatchedRunId, accountIdB],
    );

    const grantRevision = 5;
    await client.query(
      `INSERT INTO storyteller_current_owner_grant (
         id, revision, user_id, account_id, run_id, entitlement_profile, enabled, no_expiry,
         requested_route, requested_funding_mode, operator_id, approval_identity
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, false, true, 'fake:economy', 'prepaid', 'op', 'approval')`,
      [
        randomUUID(),
        grantRevision,
        userId,
        accountId,
        runId,
        JSON.stringify(entitlementProfile(grantRevision)),
      ],
    );
    await assert.rejects(
      client.query(
        `INSERT INTO storyteller_current_owner_grant (
           id, revision, user_id, account_id, run_id, entitlement_profile, enabled, no_expiry,
           requested_route, requested_funding_mode, operator_id, approval_identity
         ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, false, true, 'fake:economy', 'prepaid', 'op', 'approval')`,
        [
          randomUUID(),
          grantRevision,
          userId,
          accountId,
          mismatchedRunId,
          JSON.stringify(entitlementProfile(grantRevision)),
        ],
      ),
    );
  } finally {
    await client.end();
  }
});