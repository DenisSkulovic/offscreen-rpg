import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { bootstrapAdminStaff } from '@offscreen/application/admin';
import {
  adminAuditPageV1Schema,
  adminStaffAccessV1Schema,
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
  'AD07 staff access self-view and sanitized audit page',
  { timeout: 120000 },
  async () => {
    await withApiOnlyAuth(async (context) => {
      const { database, origin, user, otherUser, cookie, otherCookie } =
        context;
      const boot = await bootstrapAdminStaff(database, {
        authUserId: user.id,
        environment: 'local',
        actorLabel: 'ad07-integration',
      });

      const enter = await fetch(`${origin}/api/admin/session/enter`, {
        method: 'POST',
        headers: { cookie, origin },
      });
      assert.equal(enter.status, 200);
      const adminCookie = adminCookieFrom(enter);
      assert.ok(adminCookie);
      const headers = { cookie: combineCookies(cookie, adminCookie) };

      const selfAccess = await fetch(
        `${origin}/api/admin/staff/${boot.staffPrincipalId}/access`,
        { headers },
      );
      assert.equal(selfAccess.status, 200);
      const accessBody = adminStaffAccessV1Schema.parse(
        await readJson(selfAccess),
      );
      assert.equal(accessBody.packages[0]?.packageId, 'admin-reader');
      assert.equal(accessBody.packages[0]?.scope.playerScope, 'any');
      assert.ok(accessBody.packages[0]?.provenanceKind);

      const otherBoot = await bootstrapAdminStaff(database, {
        authUserId: otherUser.id,
        environment: 'local',
        actorLabel: 'ad07-other',
      });
      const otherPeek = await fetch(
        `${origin}/api/admin/staff/${otherBoot.staffPrincipalId}/access`,
        { headers },
      );
      // admin-reader lacks staff.access.inspect
      assert.equal(otherPeek.status, 403);

      const auditDenied = await fetch(`${origin}/api/admin/audit`, {
        headers,
      });
      assert.equal(auditDenied.status, 403);

      const auditorAssignmentId = randomUUID();
      await database.db.$client.query(
        `INSERT INTO admin_capability_assignment (
           id, staff_principal_id, package_id, package_version, status, scope, provenance, created_at
         ) VALUES (
           $1, $2, 'security-auditor', 1, 'active',
           $3::jsonb,
           '{"kind":"ad07-test"}'::jsonb,
           now()
         )`,
        [
          auditorAssignmentId,
          boot.staffPrincipalId,
          JSON.stringify({ environments: ['local'] }),
        ],
      );

      await fetch(`${origin}/api/admin/session/exit`, {
        method: 'POST',
        headers,
      });
      const reenter = await fetch(`${origin}/api/admin/session/enter`, {
        method: 'POST',
        headers: { cookie, origin },
      });
      assert.equal(reenter.status, 200);
      const auditorCookie = adminCookieFrom(reenter);
      assert.ok(auditorCookie);
      const auditorHeaders = {
        cookie: combineCookies(cookie, auditorCookie),
      };

      const audit = await fetch(`${origin}/api/admin/audit`, {
        headers: auditorHeaders,
      });
      assert.equal(audit.status, 200);
      const page = adminAuditPageV1Schema.parse(await readJson(audit));
      assert.equal(page.coverage, 'since-enabled');
      assert.ok(page.items.length > 0);
      assert.ok(
        page.items.some((item) => item.kind.startsWith('admin.session.')),
      );
      const wire = JSON.stringify(page);
      assert.ok(!wire.includes('PRIVATE'));
      assert.ok(!wire.includes('narrative'));

      const otherAccess = await fetch(
        `${origin}/api/admin/staff/${otherBoot.staffPrincipalId}/access`,
        { headers: auditorHeaders },
      );
      assert.equal(otherAccess.status, 200);

      const nonstaff = await fetch(`${origin}/api/admin/audit`, {
        headers: { cookie: otherCookie },
      });
      assert.equal(nonstaff.status, 403);

      await database.db.$client.query(
        `DELETE FROM admin_capability_assignment WHERE id = $1`,
        [auditorAssignmentId],
      );
    });
  },
);
