import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bootstrapAdminStaff } from '@offscreen/application/admin';
import type { AdminErrorV1, AdminSelfV1 } from '@offscreen/contracts/admin';
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

function errorCode(body: unknown): string {
  if (
    body &&
    typeof body === 'object' &&
    'code' in body &&
    typeof (body as AdminErrorV1).code === 'string'
  ) {
    return (body as AdminErrorV1).code;
  }
  if (body && typeof body === 'object' && 'message' in body) {
    const nested = (body as { message?: AdminErrorV1 }).message;
    if (nested && typeof nested.code === 'string') return nested.code;
  }
  assert.fail(`expected AdminErrorV1, got ${JSON.stringify(body)}`);
}

test(
  'AD01 staff session enter/me/exit with nonstaff denial',
  { timeout: 120000 },
  async () => {
    await withApiOnlyAuth(async (context) => {
      const { database, origin, user, otherUser, cookie, otherCookie } =
        context;

      const anonymous = await fetch(`${origin}/api/admin/me`);
      assert.equal(anonymous.status, 401);
      assert.equal(
        errorCode(await readJson(anonymous)),
        'unauthenticated',
      );

      const playerEnter = await fetch(`${origin}/api/admin/session/enter`, {
        method: 'POST',
        headers: { cookie, origin },
      });
      assert.equal(playerEnter.status, 403);
      assert.equal(errorCode(await readJson(playerEnter)), 'not_authorized');

      const boot = await bootstrapAdminStaff(database, {
        authUserId: user.id,
        environment: 'local',
        actorLabel: 'ad01-integration',
      });
      assert.equal(boot.created, true);
      const again = await bootstrapAdminStaff(database, {
        authUserId: user.id,
        environment: 'local',
        actorLabel: 'ad01-integration',
      });
      assert.equal(again.created, false);
      assert.equal(again.staffPrincipalId, boot.staffPrincipalId);

      const crossOrigin = await fetch(`${origin}/api/admin/session/enter`, {
        method: 'POST',
        headers: { cookie, origin: 'https://evil.example' },
      });
      assert.equal(crossOrigin.status, 403);

      const enter = await fetch(`${origin}/api/admin/session/enter`, {
        method: 'POST',
        headers: { cookie, origin },
      });
      assert.equal(enter.status, 200);
      const self = await readJson<AdminSelfV1>(enter);
      assert.equal(self.version, 1);
      assert.equal(self.staffPrincipalId, boot.staffPrincipalId);
      assert.deepEqual(self.workspaceFamilies, []);
      const adminCookie = adminCookieFrom(enter);
      assert.ok(adminCookie);
      assert.ok(!adminCookie.includes(self.staffPrincipalId));

      const me = await fetch(`${origin}/api/admin/me`, {
        headers: { cookie: combineCookies(cookie, adminCookie) },
      });
      assert.equal(me.status, 200);
      assert.equal(
        (await readJson<AdminSelfV1>(me)).staffPrincipalId,
        boot.staffPrincipalId,
      );

      const playerOnlyMe = await fetch(`${origin}/api/admin/me`, {
        headers: { cookie },
      });
      assert.equal(playerOnlyMe.status, 403);
      assert.equal(
        errorCode(await readJson(playerOnlyMe)),
        'staff_session_required',
      );

      const otherEnter = await fetch(`${origin}/api/admin/session/enter`, {
        method: 'POST',
        headers: { cookie: otherCookie, origin },
      });
      assert.equal(otherEnter.status, 403);

      const forged = await fetch(`${origin}/api/admin/me`, {
        headers: {
          cookie: combineCookies(cookie, 'offscreen-admin=forged-token'),
        },
      });
      assert.equal(forged.status, 403);

      const exit = await fetch(`${origin}/api/admin/session/exit`, {
        method: 'POST',
        headers: {
          cookie: combineCookies(cookie, adminCookie),
          origin,
        },
      });
      assert.equal(exit.status, 200);
      assert.deepEqual(await exit.json(), { version: 1, closed: true });

      const afterExit = await fetch(`${origin}/api/admin/me`, {
        headers: { cookie: combineCookies(cookie, adminCookie) },
      });
      assert.equal(afterExit.status, 403);

      const audits = await database.db.$client.query(
        `SELECT kind FROM admin_audit_event
         WHERE auth_user_id = $1
         ORDER BY created_at ASC`,
        [user.id],
      );
      const kinds = audits.rows.map((row: { kind: string }) => row.kind);
      assert.ok(kinds.includes('admin.bootstrap.created'));
      assert.ok(kinds.includes('admin.session.enter'));
      assert.ok(kinds.includes('admin.session.exit'));
      assert.ok(kinds.includes('admin.session.enter_denied'));

      const assignment = await database.db.$client.query(
        `SELECT status, package_id FROM admin_capability_assignment
         WHERE staff_principal_id = $1`,
        [boot.staffPrincipalId],
      );
      assert.equal(assignment.rows[0]?.status, 'inert');
      assert.equal(assignment.rows[0]?.package_id, 'admin-reader');

      // Email twin without principal still denied (otherUser).
      assert.ok(otherUser.email);
    });
  },
);
