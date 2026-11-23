import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { bootstrapAdminStaff } from '@offscreen/admin';
import { caseSummaryV1Schema } from '@offscreen/admin-interface/admin';
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
  'AD08 case create/assign does not escalate player privilege',
  { timeout: 120000 },
  async () => {
    await withApiOnlyAuth(async (context) => {
      const { database, origin, user, otherUser, cookie } = context;
      const boot = await bootstrapAdminStaff(database, {
        authUserId: user.id,
        environment: 'local',
        actorLabel: 'ad08-integration',
      });

      // Keep admin-reader for bootstrap enter; add support packages for case APIs.
      await database.db.$client.query(
        `UPDATE admin_capability_assignment
         SET scope = $2::jsonb
         WHERE id = $1`,
        [
          boot.assignmentId,
          JSON.stringify({
            environments: ['local'],
            playerIds: [user.id],
          }),
        ],
      );
      const supportAssignmentId = randomUUID();
      await database.db.$client.query(
        `INSERT INTO admin_capability_assignment (
           id, staff_principal_id, package_id, package_version, status, scope, provenance, created_at
         ) VALUES (
           $1, $2, 'support-operator', 1, 'active',
           $3::jsonb,
           '{"kind":"ad08-support"}'::jsonb,
           now()
         )`,
        [
          supportAssignmentId,
          boot.staffPrincipalId,
          JSON.stringify({
            environments: ['local'],
            playerIds: [user.id],
          }),
        ],
      );
      const leadAssignmentId = randomUUID();
      await database.db.$client.query(
        `INSERT INTO admin_capability_assignment (
           id, staff_principal_id, package_id, package_version, status, scope, provenance, created_at
         ) VALUES (
           $1, $2, 'support-lead', 1, 'active',
           $3::jsonb,
           '{"kind":"ad08-test"}'::jsonb,
           now()
         )`,
        [
          leadAssignmentId,
          boot.staffPrincipalId,
          JSON.stringify({ environments: ['local'] }),
        ],
      );

      const enter = await fetch(`${origin}/api/admin/session/enter`, {
        method: 'POST',
        headers: { cookie, origin },
      });
      assert.equal(enter.status, 200);
      const adminCookie = adminCookieFrom(enter);
      assert.ok(adminCookie);
      const headers = {
        cookie: combineCookies(cookie, adminCookie),
        origin,
        'content-type': 'application/json',
      };

      const idempotencyKey = randomUUID();
      const created = await fetch(`${origin}/api/admin/cases`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          idempotencyKey,
          category: 'account',
          title: 'Scoped account question',
          link: { kind: 'player', id: user.id },
        }),
      });
      if (created.status !== 200) {
        throw new Error(
          `case create failed: ${created.status} ${JSON.stringify(await readJson(created))}`,
        );
      }
      const caseBody = caseSummaryV1Schema.parse(await readJson(created));
      assert.equal(caseBody.status, 'open');
      assert.equal(caseBody.links[0]?.id, user.id);

      const replay = await fetch(`${origin}/api/admin/cases`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          idempotencyKey,
          category: 'account',
          title: 'Scoped account question',
          link: { kind: 'player', id: user.id },
        }),
      });
      assert.equal(replay.status, 200);
      assert.equal(
        (await readJson<{ id: string }>(replay)).id,
        caseBody.id,
      );

      // Linking a foreign player fails independently of case.create.
      const foreignLink = await fetch(`${origin}/api/admin/cases`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          idempotencyKey: randomUUID(),
          category: 'account',
          title: 'Foreign attempt',
          link: { kind: 'player', id: otherUser.id },
        }),
      });
      assert.equal(foreignLink.status, 404);

      const assigned = await fetch(
        `${origin}/api/admin/cases/${caseBody.id}/assign`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ assignedStaffId: boot.staffPrincipalId }),
        },
      );
      assert.equal(assigned.status, 200);
      assert.equal(
        (await readJson<{ status: string }>(assigned)).status,
        'assigned',
      );

      // Assignment must not unlock another player's Player 360.
      const escalate = await fetch(
        `${origin}/api/admin/players/${encodeURIComponent(otherUser.id)}`,
        { headers },
      );
      assert.equal(escalate.status, 404);

      await database.db.$client.query(
        `DELETE FROM admin_case_link WHERE case_id = $1`,
        [caseBody.id],
      );
      await database.db.$client.query(`DELETE FROM admin_case WHERE id = $1`, [
        caseBody.id,
      ]);
      await database.db.$client.query(
        `DELETE FROM admin_capability_assignment WHERE id = ANY($1::uuid[])`,
        [[leadAssignmentId, supportAssignmentId]],
      );
    });
  },
);
