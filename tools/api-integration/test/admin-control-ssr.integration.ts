import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { bootstrapAdminStaff } from '@offscreen/admin';
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

const OBS07_SENTINEL = 'SENTINEL-OBS07-PRIVATE-4b1d';

/**
 * OBS07 connected proof (disposable offscreen_auth_test, no provider calls):
 * a steward-bound case shows the S1 Situation in a real browser; an assigned,
 * campaign-linked case WITHOUT the investigator grant is denied safely; the
 * page issues only the admin case list and one situation fetch; the private
 * sentinel never reaches the DOM or any response body.
 */
test(
  'OBS07 Support Situation UI: steward-bound case renders S1, ungranted case denied, sentinel absent (Playwright)',
  { timeout: 240000 },
  async () => {
    await withAppIntegration(async (context) => {
      const { database, origin, user, cookie } = context;
      const q = (sql: string, params?: unknown[]) =>
        database.db.$client.query(sql, params);
      const storyIds: string[] = [];
      const generationIds: string[] = [];
      try {
        const boot = await bootstrapAdminStaff(database, {
          authUserId: user.id,
          environment: 'local',
          actorLabel: 'obs07-ssr-integration',
        });
        await q(
          `UPDATE admin_capability_assignment SET scope = $2::jsonb WHERE id = $1`,
          [
            boot.assignmentId,
            JSON.stringify({ environments: ['local'], playerIds: [user.id] }),
          ],
        );
        const grant = (pkg: string, scope: unknown, provenance: unknown) =>
          q(
            `INSERT INTO admin_capability_assignment (id, staff_principal_id, package_id, package_version, status, scope, provenance, created_at)
             VALUES ($1, $2, $3, 1, 'active', $4::jsonb, $5::jsonb, now())`,
            [
              randomUUID(),
              boot.staffPrincipalId,
              pkg,
              JSON.stringify(scope),
              JSON.stringify(provenance),
            ],
          );
        await grant(
          'support-operator',
          { environments: ['local'] },
          { kind: 'obs07-fixture-support' },
        );

        const newStory = async () => {
          const id = randomUUID();
          storyIds.push(id);
          await q(
            `INSERT INTO story (id, owner_id, source, revision, view_version, document_root_revision, premise)
             VALUES ($1, $2, $3, 1, 3, 0, $4::jsonb)`,
            [
              id,
              user.id,
              `${OBS07_SENTINEL}-source`,
              JSON.stringify({ hidden: `${OBS07_SENTINEL}-premise` }),
            ],
          );
          return id;
        };
        const addCampaign = (storyId: string, holds: unknown[]) =>
          q(
            `INSERT INTO campaign (
               story_id, settings_revision, character, story_facts, game_second, clock,
               clock_anchor_at, clock_pace, holds, situation_authorization,
               world_conditions, active_action_operation_id
             ) VALUES ($1, 1, $2::jsonb, $3::jsonb, 900, '{}'::jsonb, now(), '{}'::jsonb,
               $4::jsonb, '{}'::jsonb, $5::jsonb, NULL)`,
            [
              storyId,
              JSON.stringify({ name: `${OBS07_SENTINEL}-character` }),
              JSON.stringify([`${OBS07_SENTINEL}-fact`]),
              JSON.stringify(holds),
              JSON.stringify([`${OBS07_SENTINEL}-world`]),
            ],
          );
        const newCase = async (title: string, campaignId: string) => {
          const id = randomUUID();
          await q(
            `INSERT INTO admin_case (id, status, category, title, created_by_staff_id, assigned_staff_id, idempotency_key)
             VALUES ($1, 'assigned', 'campaign', $2, $3, $3, $4)`,
            [id, title, boot.staffPrincipalId, randomUUID()],
          );
          await q(
            `INSERT INTO admin_case_link (case_id, subject_kind, subject_id) VALUES ($1, 'campaign', $2)`,
            [id, campaignId],
          );
          return id;
        };

        // Granted story: held Storyteller G (capture held, no model attempt),
        // published passage #23-equivalent (#1 here), settled-free fixture.
        const grantedStory = await newStory();
        const heldG = randomUUID();
        generationIds.push(heldG);
        await q(
          `INSERT INTO generation (id, owner_id, kind, status_revision, input, state)
           VALUES ($1, $2, 'storyteller.action.v1', 1, $3::jsonb, 'pending')`,
          [heldG, user.id, JSON.stringify({ prompt: `${OBS07_SENTINEL}-input` })],
        );
        await q(
          `INSERT INTO storyteller_context_capture (capture_id, story_id, operation_id, capture, capture_sha256, state, failure_code)
           VALUES ($1, $2, $3, $4::jsonb, $5, 'held', 'scripted_hold')`,
          [
            heldG,
            grantedStory,
            randomUUID(),
            JSON.stringify({ secret: `${OBS07_SENTINEL}-capture` }),
            'a'.repeat(64),
          ],
        );
        await q(
          `INSERT INTO storyteller_execution_stage (
             id, generation_id, stage, outcome, source_kind, failure_class,
             idempotency_key, producer_build_id
           ) VALUES ($1, $2, 'stage-held', 'held', 'generation', 'scripted_hold', $3, 'obs07-test')`,
          [randomUUID(), heldG, randomUUID()],
        );
        await q(
          `INSERT INTO story_passage (id, story_id, sequence, content)
           VALUES ($1, $2, 1, $3::jsonb)`,
          [
            randomUUID(),
            grantedStory,
            JSON.stringify({ text: `${OBS07_SENTINEL}-passage` }),
          ],
        );
        await addCampaign(grantedStory, [
          { kind: 'storyteller', generationId: heldG, reason: 'required-turn' },
        ]);
        const grantedCase = await newCase(
          'OBS07 ticket: game froze after item action',
          grantedStory,
        );
        await grant(
          'support-investigator',
          {
            environments: ['local'],
            campaignIds: [grantedStory],
            requireAuthorizedCaseAssignment: true,
          },
          { kind: 'steward-case-binding', authorizedCaseIds: [grantedCase] },
        );

        // Ungranted story: assigned + campaign-linked but no steward binding.
        const ungrantedStory = await newStory();
        await addCampaign(ungrantedStory, []);
        const ungrantedCase = await newCase(
          'OBS07 ungranted link only',
          ungrantedStory,
        );

        const enter = await fetch(`${origin}/api/admin/session/enter`, {
          method: 'POST',
          headers: { cookie, origin },
        });
        assert.equal(enter.status, 200);
        const adminCookie = adminCookieFrom(enter);
        assert.ok(adminCookie);
        const staffCookie = combineCookies(cookie, adminCookie);

        await withBrowserSession(origin, staffCookie, async ({ context: bc }) => {
          const page = await bc.newPage();
          const apiRequests: string[] = [];
          const bodies: string[] = [];
          page.on('request', (request) => {
            const url = new URL(request.url());
            if (url.pathname.startsWith('/api/')) {
              apiRequests.push(`${request.method()} ${url.pathname}`);
            }
          });
          page.on('response', (response) => {
            const url = new URL(response.url());
            if (url.pathname.startsWith('/api/')) {
              void response
                .text()
                .then((text) => bodies.push(text))
                .catch(() => undefined);
            }
          });
          await page.goto(`${origin}/control`, { waitUntil: 'domcontentloaded' });
          const openGranted = page.getByRole('button', {
            name: `Open situation for case ${grantedCase}`,
          });
          await openGranted.waitFor();
          assert.equal(
            apiRequests.filter((entry) => entry.includes('/situation')).length,
            0,
            'no situation request before an explicit open',
          );

          await openGranted.click();
          await page
            .getByRole('region', { name: /what’s happening now/i })
            .waitFor();
          const now = page.getByRole('region', { name: /what’s happening now/i });
          await now
            .getByText('Narration preparation in progress or held')
            .waitFor();
          await now.getByText(/Held/).first().waitFor();
          await now
            .getByText(/No model attempt recorded \(coverage statement/)
            .waitFor();
          await page
            .getByText(
              'Preparing the next scene was held while its context was being assembled. This is not a model timeout: no model call is implied.',
            )
            .waitFor();

          const shotDir = path.join(
            process.cwd(),
            'evidence',
            'runs',
            'obs07-support-situation',
            'assets',
          );
          mkdirSync(shotDir, { recursive: true });
          await page
            .getByRole('heading', { name: 'Case situation' })
            .scrollIntoViewIfNeeded();
          await page.screenshot({
            path: path.join(shotDir, 'obs07-support-situation-synthetic.png'),
            fullPage: true,
          });

          // Ungranted case: assigned + campaign-linked, but no steward grant.
          await page
            .getByRole('button', {
              name: `Open situation for case ${ungrantedCase}`,
            })
            .click();
          await page
            .getByRole('alert')
            .filter({ hasText: 'Investigation not authorized or not yet linked.' })
            .waitFor();
          assert.equal(
            await page
              .getByRole('region', { name: /what’s happening now/i })
              .count(),
            0,
            'denied case must not leave the previous case situation on screen',
          );

          const html = await page.content();
          assert.equal(html.includes(OBS07_SENTINEL), false, 'sentinel in DOM');
          for (const body of bodies) {
            assert.equal(
              body.includes(OBS07_SENTINEL),
              false,
              'sentinel in an /api response body',
            );
          }
          const situationCalls = apiRequests.filter((entry) =>
            entry.includes('/situation'),
          );
          assert.deepEqual(situationCalls.sort(), [
            `GET /api/admin/cases/${grantedCase}/campaigns/${grantedStory}/situation`,
            `GET /api/admin/cases/${ungrantedCase}/campaigns/${ungrantedStory}/situation`,
          ].sort());
          for (const entry of apiRequests) {
            assert.ok(
              entry === 'GET /api/admin/cases' ||
                // Pre-existing Governance panel on the same overview page.
                /^GET \/api\/admin\/staff\/[0-9a-f-]+\/access$/.test(entry) ||
                /^GET \/api\/admin\/cases\/[0-9a-f-]+\/campaigns\/[0-9a-f-]+\/situation$/.test(
                  entry,
                ),
              `unexpected API call from the Support screen: ${entry}`,
            );
          }
        });
      } finally {
        await q(
          `DELETE FROM storyteller_execution_stage WHERE generation_id = ANY($1::uuid[])`,
          [generationIds],
        );
        await q(
          `DELETE FROM storyteller_context_capture WHERE capture_id = ANY($1::uuid[])`,
          [generationIds],
        );
        await q(`DELETE FROM story_passage WHERE story_id = ANY($1::uuid[])`, [
          storyIds,
        ]);
        await q(`DELETE FROM story WHERE id = ANY($1::uuid[])`, [storyIds]);
        await q(`DELETE FROM generation WHERE id = ANY($1::uuid[])`, [
          generationIds,
        ]);
        await cleanupAdminRows(database, [user.id, context.otherUser.id]);
      }
    });
  },
);
