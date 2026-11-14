import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bootstrapAdminStaff } from '@offscreen/application/admin';
import {
  campaignMetadataPageV1Schema,
  redactedOperationEnvelopeV1Schema,
  redactedOperationPageV1Schema,
} from '@offscreen/contracts/admin';
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
  'AD05 campaign and redacted operation drilldown',
  { timeout: 120000 },
  async () => {
    await withApiOnlyAuth(async (context) => {
      const { database, origin, user, otherUser, cookie } = context;
      const boot = await bootstrapAdminStaff(database, {
        authUserId: user.id,
        environment: 'local',
        actorLabel: 'ad05-integration',
      });
      await database.db.$client.query(
        `UPDATE admin_capability_assignment SET scope = $2::jsonb WHERE id = $1`,
        [
          boot.assignmentId,
          JSON.stringify({
            environments: ['local'],
            playerIds: [user.id],
          }),
        ],
      );

      const storyId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
      const otherStoryId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
      const generationId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
      const attemptId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
      const fundingId = '11111111-1111-4111-8111-111111111111';
      const runId = '22222222-2222-4222-8222-222222222222';

      await database.db.$client.query(
        `INSERT INTO story (id, owner_id, source, revision, view_version, document_root_revision)
         VALUES ($1, $2, 'secret-premise-text', 2, 3, 0)`,
        [storyId, user.id],
      );
      await database.db.$client.query(
        `INSERT INTO story (id, owner_id, source, revision, view_version, document_root_revision)
         VALUES ($1, $2, 'other-owner-secret', 1, 1, 0)`,
        [otherStoryId, otherUser.id],
      );
      await database.db.$client.query(
        `INSERT INTO generation (id, owner_id, kind, status_revision, input, state, attempt_id, failure_code, updated_at)
         VALUES ($1, $2, 'storyteller.action.v1', 1, '{"prompt":"PRIVATE"}'::jsonb, 'failed', $3, 'invalid_output', now())`,
        [generationId, user.id, attemptId],
      );
      await database.db.$client.query(
        `INSERT INTO storyteller_funding (
           id, limit_microusd, settled_microusd, reserved_microusd, stopped, verified_at
         ) VALUES ($1, 0, 0, 0, true, now())`,
        [fundingId],
      );
      await database.db.$client.query(
        `INSERT INTO storyteller_run (
           id, account_id, limit_microusd, settled_microusd, reserved_microusd,
           max_attempts, admitted_attempts, enabled
         ) VALUES ($1, $2, 0, 0, 0, 1, 0, false)`,
        [runId, fundingId],
      );
      await database.db.$client.query(
        `INSERT INTO storyteller_attempt (
           id, generation_id, account_id, run_id, owner_id, story_id, purpose,
           storyteller_profile_id, storyteller_profile_revision,
           task_input_version, prompt_version, recipe_version, resource_policy_version,
           requested_model, requested_provider, price_version,
           attribution, state,
           reserved_microusd, reserved_input_tokens, reserved_generated_tokens,
           reserved_reasoning_tokens, estimated_microusd, estimated_input_tokens,
           estimation_method, reconciliation, request_bytes, policy
         ) VALUES (
           $1, $2, $3, $4, $5, $6, 'action',
           'fixture', 1,
           1, 'p1', 'r1', 'rp1',
           'fixture-model', 'fixture-provider', 'price-1',
           '{}'::jsonb, 'reserved',
           0, 0, 0, 0, 0, 0,
           'fixture', 'pending', 0, '{}'::jsonb
         )`,
        [attemptId, generationId, fundingId, runId, user.id, storyId],
      );

      const enter = await fetch(`${origin}/api/admin/session/enter`, {
        method: 'POST',
        headers: { cookie, origin },
      });
      assert.equal(enter.status, 200);
      const adminCookie = adminCookieFrom(enter);
      assert.ok(adminCookie);
      const headers = { cookie: combineCookies(cookie, adminCookie) };

      const campaigns = await fetch(
        `${origin}/api/admin/players/${encodeURIComponent(user.id)}/campaigns`,
        { headers },
      );
      assert.equal(campaigns.status, 200);
      const campaignPage = campaignMetadataPageV1Schema.parse(
        await readJson(campaigns),
      );
      assert.equal(campaignPage.items.length, 1);
      assert.equal(campaignPage.items[0]?.id, storyId);
      assert.equal(campaignPage.items[0]?.relation, 'legacy-owner');
      const campaignWire = JSON.stringify(campaignPage);
      assert.ok(!campaignWire.includes('secret-premise-text'));

      const foreign = await fetch(
        `${origin}/api/admin/campaigns/${otherStoryId}/operations`,
        { headers },
      );
      assert.equal(foreign.status, 404);

      const ops = await fetch(
        `${origin}/api/admin/campaigns/${storyId}/operations`,
        { headers },
      );
      assert.equal(ops.status, 200);
      const opPage = redactedOperationPageV1Schema.parse(await readJson(ops));
      assert.equal(opPage.items.length, 1);
      assert.equal(opPage.items[0]?.id, generationId);
      assert.equal(opPage.items[0]?.safeFailureCode, 'invalid_output');
      const opWire = JSON.stringify(opPage);
      assert.ok(!opWire.includes('PRIVATE'));
      assert.ok(!opWire.includes('prompt'));

      const detail = await fetch(
        `${origin}/api/admin/operations/${generationId}`,
        { headers },
      );
      assert.equal(detail.status, 200);
      const envelope = redactedOperationEnvelopeV1Schema.parse(
        await readJson(detail),
      );
      assert.equal(envelope.data.state, 'failed');
      assert.equal('input' in envelope.data, false);

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
        `DELETE FROM storyteller_funding WHERE id = $1`,
        [fundingId],
      );
      await database.db.$client.query(
        `DELETE FROM story WHERE id = ANY($1::uuid[])`,
        [[storyId, otherStoryId]],
      );
    });
  },
);
