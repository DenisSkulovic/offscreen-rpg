import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { bootstrapAdminStaff } from '@offscreen/application/admin';
import { usageStatusEnvelopeV1Schema } from '@offscreen/contracts/admin';
import { withApiOnlyAuth } from './helpers/api-only-auth.js';

function combineCookies(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join('; ');
}

function adminCookieFrom(response: Response): string | null {
  const raw = response.headers.getSetCookie?.() ?? [];
  const line =
    raw.find((entry) => entry.startsWith('offscreen-admin=')) ??
    raw.find((entry) => entry.startsWith('__Host-offscreen-admin='));
  if (!line) return null;
  return line.split(';', 1)[0] ?? null;
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test(
  'AD06 technical usage status with scoped grants',
  { timeout: 120000 },
  async () => {
    await withApiOnlyAuth(async (context) => {
      const { database, origin, user, cookie } = context;
      const boot = await bootstrapAdminStaff(database, {
        authUserId: user.id,
        environment: 'local',
        actorLabel: 'ad06-integration',
      });

      const fundingId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const foreignFundingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const generationId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
      const attemptId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
      const runId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
      const usageAssignmentId = randomUUID();

      await database.db.$client.query(
        `INSERT INTO storyteller_funding (
           id, limit_microusd, settled_microusd, reserved_microusd, stopped, verified_at
         ) VALUES ($1, 1000, 0, 200, true, now()), ($2, 1000, 0, 0, true, now())`,
        [fundingId, foreignFundingId],
      );
      await database.db.$client.query(
        `INSERT INTO storyteller_run (
           id, account_id, limit_microusd, settled_microusd, reserved_microusd,
           max_attempts, admitted_attempts, enabled
         ) VALUES ($1, $2, 1000, 0, 200, 1, 0, false)`,
        [runId, fundingId],
      );
      await database.db.$client.query(
        `INSERT INTO generation (id, owner_id, kind, status_revision, input, state, attempt_id, failure_code, updated_at)
         VALUES ($1, $2, 'storyteller.action.v1', 1, '{}'::jsonb, 'failed', $3, 'invalid_output', now())`,
        [generationId, user.id, attemptId],
      );
      await database.db.$client.query(
        `INSERT INTO storyteller_attempt (
           id, generation_id, account_id, run_id, owner_id, purpose,
           storyteller_profile_id, storyteller_profile_revision,
           task_input_version, prompt_version, recipe_version, resource_policy_version,
           requested_model, requested_provider, price_version,
           attribution, state,
           reserved_microusd, reserved_input_tokens, reserved_generated_tokens,
           reserved_reasoning_tokens, estimated_microusd, estimated_input_tokens,
           estimation_method, reconciliation, request_bytes, policy
         ) VALUES (
           $1, $2, $3, $4, $5, 'action',
           'fixture', 1,
           1, 'p1', 'r1', 'rp1',
           'fixture-model', 'fixture-provider', 'price-1',
           '{}'::jsonb, 'reserved',
           200, 0, 0, 0, 200, 0,
           'fixture', 'pending', 0, '{}'::jsonb
         )`,
        [attemptId, generationId, fundingId, runId, user.id],
      );
      await database.db.$client.query(
        `INSERT INTO storyteller_usage_allocation (
           attempt_id, window_id, window_version, scope, scope_key, metric,
           definition, state, reserved, consumed, attributed_at
         ) VALUES (
           $1, 'account-microusd', 1, 'account', $2, 'microusd',
           '{}'::jsonb, 'reserved', 200, NULL, now()
         ), (
           $1, 'account-microusd-dispatched', 1, 'account', $2, 'microusd',
           '{}'::jsonb, 'dispatched', 50, NULL, now()
         )`,
        [attemptId, fundingId],
      );

      // admin-reader alone cannot read usage.
      const enterReader = await fetch(`${origin}/api/admin/session/enter`, {
        method: 'POST',
        headers: { cookie, origin },
      });
      assert.equal(enterReader.status, 200);
      const readerCookie = adminCookieFrom(enterReader);
      assert.ok(readerCookie);
      const readerHeaders = {
        cookie: combineCookies(cookie, readerCookie),
      };
      const denied = await fetch(
        `${origin}/api/admin/usage/status?accountRef=${fundingId}`,
        { headers: readerHeaders },
      );
      assert.equal(denied.status, 404);

      await database.db.$client.query(
        `INSERT INTO admin_capability_assignment (
           id, staff_principal_id, package_id, package_version, status, scope, provenance, created_at
         ) VALUES (
           $1, $2, 'usage-observer', 1, 'active',
           $3::jsonb,
           '{"kind":"ad06-test"}'::jsonb,
           now()
         )`,
        [
          usageAssignmentId,
          boot.staffPrincipalId,
          JSON.stringify({
            environments: ['local'],
            accountIds: [fundingId],
          }),
        ],
      );

      // Re-enter so access epoch / assignments are fresh for the new package.
      await fetch(`${origin}/api/admin/session/exit`, {
        method: 'POST',
        headers: readerHeaders,
      });
      const enterUsage = await fetch(`${origin}/api/admin/session/enter`, {
        method: 'POST',
        headers: { cookie, origin },
      });
      assert.equal(enterUsage.status, 200);
      const usageCookie = adminCookieFrom(enterUsage);
      assert.ok(usageCookie);
      const usageHeaders = {
        cookie: combineCookies(cookie, usageCookie),
      };

      const allowed = await fetch(
        `${origin}/api/admin/usage/status?accountRef=${fundingId}`,
        { headers: usageHeaders },
      );
      assert.equal(allowed.status, 200);
      const envelope = usageStatusEnvelopeV1Schema.parse(
        await readJson(allowed),
      );
      assert.equal(envelope.data.accountRef, fundingId);
      assert.equal(envelope.data.usageUnit, 'microusd');
      assert.equal(envelope.data.reserved, '200');
      assert.equal(envelope.data.dispatched, '50');
      assert.equal(envelope.data.commercialIntegration, 'unsupported');
      assert.ok(!JSON.stringify(envelope).includes('Free tier'));
      assert.ok(!JSON.stringify(envelope).includes('paid turns'));

      const foreign = await fetch(
        `${origin}/api/admin/usage/status?accountRef=${foreignFundingId}`,
        { headers: usageHeaders },
      );
      assert.equal(foreign.status, 404);

      await database.db.$client.query(
        `DELETE FROM storyteller_usage_allocation WHERE attempt_id = $1`,
        [attemptId],
      );
      await database.db.$client.query(
        `DELETE FROM storyteller_attempt WHERE id = $1`,
        [attemptId],
      );
      await database.db.$client.query(`DELETE FROM generation WHERE id = $1`, [
        generationId,
      ]);
      await database.db.$client.query(
        `DELETE FROM storyteller_run WHERE id = $1`,
        [runId],
      );
      await database.db.$client.query(
        `DELETE FROM storyteller_funding WHERE id = ANY($1::uuid[])`,
        [[fundingId, foreignFundingId]],
      );
      await database.db.$client.query(
        `DELETE FROM admin_capability_assignment WHERE id = $1`,
        [usageAssignmentId],
      );
    });
  },
);
