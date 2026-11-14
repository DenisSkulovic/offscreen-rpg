import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bootstrapAdminStaff } from '@offscreen/application/admin';
import { withAppIntegration } from './helpers/app-integration.js';
import { withBrowserSession } from './helpers/browser-session.js';

const PRIVILEGED_MARKERS = [
  'Command overview',
  'Player 360 lookup',
  'Authorized summary for',
] as const;

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

function assertNoPrivilegedHtml(html: string, label: string) {
  for (const marker of PRIVILEGED_MARKERS) {
    assert.equal(
      html.includes(marker),
      false,
      `${label} must not include privileged marker "${marker}"`,
    );
  }
}

async function cleanupAdminRows(
  database: {
    db: { $client: { query: (sql: string, params?: unknown[]) => Promise<unknown> } };
  },
  authUserIds: string[],
) {
  await database.db.$client.query(
    `DELETE FROM admin_case_link WHERE case_id IN (
       SELECT id FROM admin_case WHERE created_by_staff_id IN (
         SELECT id FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])
       ) OR assigned_staff_id IN (
         SELECT id FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])
       )
     )`,
    [authUserIds],
  );
  await database.db.$client.query(
    `DELETE FROM admin_case WHERE created_by_staff_id IN (
       SELECT id FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])
     ) OR assigned_staff_id IN (
       SELECT id FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])
     )`,
    [authUserIds],
  );
  await database.db.$client.query(
    `DELETE FROM admin_audit_event WHERE auth_user_id = ANY($1::text[])
       OR staff_principal_id IN (
         SELECT id FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])
       )`,
    [authUserIds],
  );
  await database.db.$client.query(
    `DELETE FROM admin_staff_session WHERE staff_principal_id IN (
       SELECT id FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])
     )`,
    [authUserIds],
  );
  await database.db.$client.query(
    `DELETE FROM admin_capability_assignment WHERE staff_principal_id IN (
       SELECT id FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])
     )`,
    [authUserIds],
  );
  await database.db.$client.query(
    `DELETE FROM admin_staff_principal WHERE auth_user_id = ANY($1::text[])`,
    [authUserIds],
  );
}

test(
  'AD04 /control SSR privacy: anonymous, player-only, staff HTML + Playwright',
  { timeout: 240000 },
  async (t) => {
    await withAppIntegration(async (context) => {
      const { database, origin, user, otherUser, cookie, otherCookie } = context;

      try {
        const boot = await bootstrapAdminStaff(database, {
          authUserId: user.id,
          environment: 'local',
          actorLabel: 'ad04-ssr-integration',
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

        await t.test(
          'anonymous /control redirects to sign-in without privileged HTML',
          async () => {
            const response = await fetch(`${origin}/control`, {
              redirect: 'manual',
            });
            assert.equal(response.status, 307);
            const location = response.headers.get('location') ?? '';
            assert.match(location, /\/sign-in/);
            assertNoPrivilegedHtml(await response.text(), 'anonymous /control');
          },
        );

        await t.test(
          'player-only /control redirects to enter without privileged HTML',
          async () => {
            const response = await fetch(`${origin}/control`, {
              headers: { cookie },
              redirect: 'manual',
            });
            assert.equal(response.status, 307);
            assert.equal(response.headers.get('location'), '/control/enter');
            assertNoPrivilegedHtml(await response.text(), 'player-only /control');

            const enter = await fetch(`${origin}/control/enter`, {
              headers: { cookie },
            });
            assert.equal(enter.status, 200);
            const enterHtml = await enter.text();
            assert.match(enterHtml, /Enter staff mode/);
            assertNoPrivilegedHtml(enterHtml, 'player-only /control/enter');
          },
        );

        const enter = await fetch(`${origin}/api/admin/session/enter`, {
          method: 'POST',
          headers: { cookie, origin },
        });
        assert.equal(enter.status, 200);
        const adminCookie = adminCookieFrom(enter);
        assert.ok(adminCookie);
        const staffCookie = combineCookies(cookie, adminCookie);

        await t.test(
          'staff /control SSR is no-store and carries Command overview',
          async () => {
            const response = await fetch(`${origin}/control`, {
              headers: { cookie: staffCookie },
            });
            assert.equal(response.status, 200);
            assert.match(
              response.headers.get('cache-control') ?? '',
              /no-store/i,
            );
            const html = await response.text();
            assert.match(html, /Command overview/);
            assert.match(html, /Player 360 lookup/);
            const sessionToken = adminCookie.includes('=')
              ? adminCookie.slice(adminCookie.indexOf('=') + 1)
              : '';
            if (sessionToken.length > 8) {
              assert.equal(
                html.includes(sessionToken),
                false,
                'HTML must not echo the Admin cookie value',
              );
            }
          },
        );

        await t.test(
          'staff /control/players?ref= SSR hydrates authorized summary only',
          async () => {
            const allowed = await fetch(
              `${origin}/control/players?ref=${encodeURIComponent(user.id)}`,
              { headers: { cookie: staffCookie } },
            );
            assert.equal(allowed.status, 200);
            const allowedHtml = await allowed.text();
            assert.match(allowedHtml, /Authorized summary for/);
            assert.match(allowedHtml, new RegExp(user.id));
            assert.equal(
              allowedHtml.includes(otherUser.id),
              false,
              'allowed SSR must not mention foreign player id',
            );

            const forbidden = await fetch(
              `${origin}/control/players?ref=${encodeURIComponent(otherUser.id)}`,
              { headers: { cookie: staffCookie } },
            );
            assert.equal(forbidden.status, 200);
            const forbiddenHtml = await forbidden.text();
            // Typed ref may appear in the search input; must not hydrate a match.
            assert.equal(
              forbiddenHtml.includes('Authorized summary for'),
              false,
              'unauthorized ref must not SSR a summary',
            );
            assert.equal(
              forbiddenHtml.includes(`Player ${otherUser.id}`),
              false,
              'unauthorized ref must not SSR a player summary heading',
            );
          },
        );

        await t.test(
          'foreign player cookie cannot reuse staff Admin cookie for /control HTML',
          async () => {
            const response = await fetch(`${origin}/control`, {
              headers: {
                cookie: combineCookies(otherCookie, adminCookie),
              },
              redirect: 'manual',
            });
            // Bound to wrong player session → enter or sign-in, never overview.
            assert.ok(
              response.status === 307 || response.status === 200,
              `unexpected status ${response.status}`,
            );
            if (response.status === 307) {
              const location = response.headers.get('location') ?? '';
              assert.ok(
                location.includes('/control/enter') ||
                  location.includes('/sign-in'),
              );
              assertNoPrivilegedHtml(
                await response.text(),
                'foreign+admin cookie redirect body',
              );
            } else {
              const html = await response.text();
              assertNoPrivilegedHtml(html, 'foreign+admin cookie HTML');
              assert.equal(html.includes('Command overview'), false);
            }
          },
        );

        await t.test(
          'Playwright: staff sees overview; player-only does not; exit clears SSR',
          async () => {
            await withBrowserSession(origin, staffCookie, async ({ context }) => {
              const page = await context.newPage();
              await page.goto(`${origin}/control`, {
                waitUntil: 'domcontentloaded',
              });
              await page
                .getByRole('heading', { name: 'Command overview' })
                .waitFor();
              await page
                .getByRole('link', { name: 'Player 360 lookup' })
                .waitFor();
            });

            await withBrowserSession(origin, cookie, async ({ context }) => {
              const page = await context.newPage();
              await page.goto(`${origin}/control`, {
                waitUntil: 'domcontentloaded',
              });
              await page.waitForURL(/\/control\/enter/);
              await page
                .getByRole('heading', { name: 'Enter staff mode' })
                .waitFor();
              assert.equal(
                await page
                  .getByRole('heading', { name: 'Command overview' })
                  .count(),
                0,
              );
            });

            const exit = await fetch(`${origin}/api/admin/session/exit`, {
              method: 'POST',
              headers: { cookie: staffCookie, origin },
            });
            assert.ok(exit.status === 200 || exit.status === 204);

            const afterExit = await fetch(`${origin}/control`, {
              headers: { cookie: staffCookie },
              redirect: 'manual',
            });
            assert.equal(afterExit.status, 307);
            assert.equal(afterExit.headers.get('location'), '/control/enter');
            assertNoPrivilegedHtml(
              await afterExit.text(),
              'post-exit /control',
            );
          },
        );
      } finally {
        await cleanupAdminRows(database, [user.id, otherUser.id]);
      }
    });
  },
);
