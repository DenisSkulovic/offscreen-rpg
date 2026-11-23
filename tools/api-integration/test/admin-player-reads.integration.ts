import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bootstrapAdminStaff } from '@offscreen/admin';
import {
  playerSearchPageV1Schema,
  playerSummaryEnvelopeV1Schema,
} from '@offscreen/admin-interface/admin';
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
  'AD03 exact-ref player search and safe Player 360 summary',
  { timeout: 120000 },
  async () => {
    await withApiOnlyAuth(async (context) => {
      const { database, origin, user, otherUser, cookie } = context;
      const boot = await bootstrapAdminStaff(database, {
        authUserId: user.id,
        environment: 'local',
        actorLabel: 'ad03-integration',
      });

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

      // Seed one legacy-owned story for the allowed player only.
      await database.db.$client.query(
        `INSERT INTO story (
           id, owner_id, source, revision, view_version, document_root_revision
         ) VALUES (
           $1, $2, 'ad03-fixture', 1, 1, 0
         )`,
        ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', user.id],
      );

      const enter = await fetch(`${origin}/api/admin/session/enter`, {
        method: 'POST',
        headers: { cookie, origin },
      });
      assert.equal(enter.status, 200);
      const adminCookie = adminCookieFrom(enter);
      assert.ok(adminCookie);
      const staffHeaders = {
        cookie: combineCookies(cookie, adminCookie),
      };

      const searchAllowed = await fetch(
        `${origin}/api/admin/players?ref=${encodeURIComponent(user.id)}&limit=1`,
        { headers: staffHeaders },
      );
      assert.equal(searchAllowed.status, 200);
      const allowedPage = playerSearchPageV1Schema.parse(
        await readJson(searchAllowed),
      );
      assert.equal(allowedPage.items.length, 1);
      assert.equal(allowedPage.items[0]?.id, user.id);
      assert.equal('email' in (allowedPage.items[0] ?? {}), false);

      const searchForbidden = await fetch(
        `${origin}/api/admin/players?ref=${encodeURIComponent(otherUser.id)}&limit=1`,
        { headers: staffHeaders },
      );
      assert.equal(searchForbidden.status, 200);
      const forbiddenPage = playerSearchPageV1Schema.parse(
        await readJson(searchForbidden),
      );
      assert.equal(forbiddenPage.items.length, 0);

      const summary = await fetch(
        `${origin}/api/admin/players/${encodeURIComponent(user.id)}`,
        { headers: staffHeaders },
      );
      assert.equal(summary.status, 200);
      const envelope = playerSummaryEnvelopeV1Schema.parse(
        await readJson(summary),
      );
      assert.equal(envelope.data.id, user.id);
      assert.equal(envelope.data.status, 'unknown');
      assert.equal(envelope.data.commercial.status, 'unsupported');
      assert.equal(
        envelope.data.relationshipSummary.legacyOwnedCampaignCount,
        1,
      );
      const wire = JSON.stringify(envelope);
      assert.ok(!wire.includes(user.email));
      assert.ok(!wire.toLowerCase().includes('access_token'));
      assert.ok(!wire.includes('ad03-fixture'));

      const denied = await fetch(
        `${origin}/api/admin/players/${encodeURIComponent(otherUser.id)}`,
        { headers: staffHeaders },
      );
      assert.equal(denied.status, 404);
      assert.equal((await readJson<{ code: string }>(denied)).code, 'not_found');

      const missing = await fetch(
        `${origin}/api/admin/players/definitely-missing-player`,
        { headers: staffHeaders },
      );
      assert.equal(missing.status, 404);

      const anonymous = await fetch(
        `${origin}/api/admin/players?ref=${encodeURIComponent(user.id)}`,
      );
      assert.equal(anonymous.status, 401);

      await database.db.$client.query('DELETE FROM story WHERE id = $1', [
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      ]);
    });
  },
);
