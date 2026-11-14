import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bootstrapAdminStaff } from '@offscreen/application/admin';
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
  'AD02 grant policy guard: allow, privacy 404, compound deny, access inspect',
  { timeout: 120000 },
  async () => {
    await withApiOnlyAuth(async (context) => {
      const { database, origin, user, cookie, otherCookie } = context;
      const boot = await bootstrapAdminStaff(database, {
        authUserId: user.id,
        environment: 'local',
        actorLabel: 'ad02-integration',
      });

      // Scope bootstrap assignment to a single player id.
      await database.db.$client.query(
        `UPDATE admin_capability_assignment
         SET scope = $2::jsonb
         WHERE id = $1`,
        [
          boot.assignmentId,
          JSON.stringify({
            environments: ['local'],
            playerIds: ['player-allowed'],
          }),
        ],
      );

      const enter = await fetch(`${origin}/api/admin/session/enter`, {
        method: 'POST',
        headers: { cookie, origin },
      });
      assert.equal(enter.status, 200);
      const self = await readJson<{
        staffPrincipalId: string;
        workspaceFamilies: string[];
      }>(enter);
      assert.ok(self.workspaceFamilies.includes('player'));
      const adminCookie = adminCookieFrom(enter);
      assert.ok(adminCookie);
      const staffHeaders = {
        cookie: combineCookies(cookie, adminCookie),
        origin,
        'content-type': 'application/json',
      };

      const allowed = await fetch(
        `${origin}/api/admin/players/player-allowed/summary-probe`,
        { headers: staffHeaders },
      );
      assert.equal(allowed.status, 200);
      assert.equal((await readJson<{ allowed: boolean }>(allowed)).allowed, true);

      const deniedHidden = await fetch(
        `${origin}/api/admin/players/player-secret/summary-probe`,
        { headers: staffHeaders },
      );
      assert.equal(deniedHidden.status, 404);
      assert.equal(
        (await readJson<{ code: string }>(deniedHidden)).code,
        'not_found',
      );

      const productionEnv = await fetch(`${origin}/api/admin/access/check`, {
        method: 'POST',
        headers: staffHeaders,
        body: JSON.stringify({
          capability: 'player.summary.read',
          resourceKind: 'player',
          resourceId: 'player-allowed',
          environment: 'production',
        }),
      });
      assert.equal(productionEnv.status, 200);
      const prodBody = await readJson<{
        decision: string;
        reason: string;
      }>(productionEnv);
      assert.equal(prodBody.decision, 'deny');
      assert.equal(prodBody.reason, 'environment_mismatch');

      const unknownCap = await fetch(`${origin}/api/admin/access/check`, {
        method: 'POST',
        headers: staffHeaders,
        body: JSON.stringify({
          capability: 'commercial.refund.request',
          resourceKind: 'player',
          resourceId: 'player-allowed',
          environment: 'local',
        }),
      });
      assert.equal(unknownCap.status, 200);
      assert.equal(
        (await readJson<{ decision: string }>(unknownCap)).decision,
        'deny',
      );

      const access = await fetch(
        `${origin}/api/admin/staff/${boot.staffPrincipalId}/access`,
        { headers: staffHeaders },
      );
      assert.equal(access.status, 200);
      const accessBody = await readJson<{
        packages: Array<{ packageId: string; status: string }>;
      }>(access);
      assert.equal(accessBody.packages[0]?.packageId, 'admin-reader');
      assert.equal(accessBody.packages[0]?.status, 'active');

      // Player-only cookie cannot hit guarded probe.
      const playerOnly = await fetch(
        `${origin}/api/admin/players/player-allowed/summary-probe`,
        { headers: { cookie } },
      );
      assert.equal(playerOnly.status, 403);

      // Nonstaff cannot enter or check.
      const otherEnter = await fetch(`${origin}/api/admin/session/enter`, {
        method: 'POST',
        headers: { cookie: otherCookie, origin },
      });
      assert.equal(otherEnter.status, 403);
    });
  },
);
