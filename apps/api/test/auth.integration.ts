import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { betterAuth } from 'better-auth';
import { testUtils } from 'better-auth/plugins';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { applyMigrations } from '@offscreen/db/migrate';
import { createApp } from '../src/app.js';
import { authOptions } from '../src/auth/auth.js';
import { checkDrafts } from './drafts.integration.js';
import { checkDraftBrowser } from './drafts.browser.js';
import { checkGenerations } from './generations.integration.js';
import { checkOpeningHTTP } from './openings.integration.js';
import { checkStories } from './stories.integration.js';
import { startRuntime } from '@offscreen/worker/runtime';
import { requireCookie } from './helpers/require.js';

const databaseURL = process.env['DATABASE_TEST_URL'];
if (!databaseURL || new URL(databaseURL).pathname !== '/offscreen_auth_test') {
  throw new Error(
    'DATABASE_TEST_URL must target the disposable offscreen_auth_test database.',
  );
}

test(
  'identity integration through HTTP and the web application',
  { timeout: 180000 },
  async (t) => {
    const config = readDatabaseConfig({ DATABASE_URL: databaseURL });
    await applyMigrations(
      config,
      fileURLToPath(
        new URL('../../../../packages/db/migrations', import.meta.url),
      ),
    );
    const database = createDatabase(config, () => {});
    const origin = 'http://127.0.0.1:3100';
    const utilities = testUtils();
    // Normalize the plugin's explicit undefined options for exactOptionalPropertyTypes.
    const strictUtilities = {
      ...utilities,
      init(context: Parameters<typeof utilities.init>[0]) {
        const result = utilities.init(context);
        return { ...result, options: result.options ?? {} };
      },
    };
    const auth = betterAuth({
      ...authOptions(database, {
        origin,
        secret: 'integration-only-not-a-runtime-secret-1234',
        githubClientId: 'test-client',
        githubClientSecret: 'test-secret',
      }),
      plugins: [strictUtilities],
    });
    const app = await createApp(database, auth, origin);
    const helpers = (await auth.$context).test;
    const user = await helpers.saveUser(
      helpers.createUser({ name: 'Integration Reader' }),
    );
    const otherUser = await helpers.saveUser(helpers.createUser());
    let web: ReturnType<typeof spawn> | undefined;
    let exited: Promise<unknown> | undefined;
    let runtime: Awaited<ReturnType<typeof startRuntime>> | undefined;
    try {
      await app.listen(3001, '127.0.0.1');
      web = spawn(
        process.execPath,
        [
          'node_modules/next/dist/bin/next',
          'start',
          '--hostname',
          '127.0.0.1',
          '--port',
          '3100',
        ],
        {
          cwd: fileURLToPath(new URL('../../../web', import.meta.url)),
          env: { ...process.env, API_INTERNAL_ORIGIN: 'http://127.0.0.1:3001' },
          stdio: 'ignore',
          windowsHide: true,
        },
      );
      exited = once(web, 'exit');
      let ready = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        try {
          if ((await fetch(`${origin}/sign-in`)).ok) {
            ready = true;
            break;
          }
        } catch {
          /* server starting */
        }
        if (web.exitCode !== null) {
          throw new Error('Web server exited during startup');
        }
        await delay(200);
      }
      assert.ok(ready, 'Web server started');
      const login = await helpers.login({ userId: user.id });
      const cookie = requireCookie(login.headers);
      const otherLogin = await helpers.login({ userId: otherUser.id });
      const otherCookie = requireCookie(otherLogin.headers);
      await checkDrafts(t, origin, cookie, otherCookie);
      await checkGenerations(t, database, user.id, otherUser.id);
      await checkOpeningHTTP(t, database, user.id, origin, cookie, otherCookie);
      const restartWorker = async () => {
        await runtime?.stop();
        runtime = await startRuntime(
          database,
          {
            address: process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233',
            namespace: 'default',
            taskQueue: 'browser-integration',
          },
          () => {},
        );
      };
      await restartWorker();
      await checkDraftBrowser(t, origin, cookie);
      await checkStories(
        t,
        database,
        user.id,
        origin,
        cookie,
        otherCookie,
        restartWorker,
      );

      await t.test(
        'anonymous API requests fail and the page redirects to sign-in',
        async () => {
          assert.equal((await fetch(`${origin}/api/me`)).status, 401);
          const page = await fetch(`${origin}/stories`, { redirect: 'manual' });
          assert.equal(page.status, 307);
          assert.equal(page.headers.get('location'), '/sign-in');
        },
      );
      await t.test(
        'a stored session reaches a private page through the proxy',
        async () => {
          const response = await fetch(`${origin}/api/me`, {
            headers: { cookie },
          });
          assert.equal(response.status, 200);
          assert.equal(response.headers.get('cache-control'), 'no-store');
          assert.deepEqual(await response.json(), {
            id: user.id,
            name: user.name,
            email: user.email,
          });
          const page = await fetch(`${origin}/stories`, {
            headers: { cookie },
          });
          assert.ok((await page.text()).includes('Integration Reader'));
          assert.match(page.headers.get('cache-control') ?? '', /no-store/);
        },
      );
      await t.test(
        'OAuth starts with a state value and rejects an external return URL',
        async () => {
          const response = await fetch(`${origin}/api/auth/sign-in/social`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin },
            body: JSON.stringify({
              provider: 'github',
              callbackURL: '/stories',
              disableRedirect: true,
            }),
          });
          assert.equal(response.status, 200);
          const body = (await response.json()) as { url: string };
          const destination = new URL(body.url);
          assert.equal(destination.origin, 'https://github.com');
          assert.ok(destination.searchParams.get('state'));
          assert.equal(
            destination.searchParams.get('redirect_uri'),
            `${origin}/api/auth/callback/github`,
          );
          const rejected = await fetch(`${origin}/api/auth/sign-in/social`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin },
            body: JSON.stringify({
              provider: 'github',
              callbackURL: 'https://evil.example/',
            }),
          });
          assert.equal(rejected.status, 403);
        },
      );
      await t.test('invalid OAuth state cannot create a session', async () => {
        const response = await fetch(
          `${origin}/api/auth/callback/github?code=unused&state=invalid`,
          { redirect: 'manual' },
        );
        assert.ok(response.status >= 300);
        assert.ok(
          !(response.headers.get('set-cookie') ?? '').includes(
            'session_token=',
          ),
        );
      });
      await t.test(
        'forged cookies and cross-origin sign-out are rejected',
        async () => {
          assert.equal(
            (
              await fetch(`${origin}/api/me`, {
                headers: { cookie: 'better-auth.session_token=forged' },
              })
            ).status,
            401,
          );
          const response = await fetch(`${origin}/api/auth/sign-out`, {
            method: 'POST',
            headers: {
              cookie,
              origin: 'https://evil.example',
              'content-type': 'application/json',
            },
            body: '{}',
          });
          assert.equal(response.status, 403);
          assert.equal(
            (await fetch(`${origin}/api/me`, { headers: { cookie } })).status,
            200,
          );
        },
      );
      await t.test(
        'logout revokes the database session and clears the cookie',
        async () => {
          const response = await fetch(`${origin}/api/auth/sign-out`, {
            method: 'POST',
            headers: { cookie, origin, 'content-type': 'application/json' },
            body: '{}',
          });
          assert.equal(response.status, 200);
          assert.match(response.headers.get('set-cookie') ?? '', /Max-Age=0/i);
          assert.equal(
            (await fetch(`${origin}/api/me`, { headers: { cookie } })).status,
            401,
          );
        },
      );
      await t.test(
        'browser session reads renew the cookie; identity reads do not',
        async () => {
          const aging = await helpers.login({ userId: user.id });
          const context = await auth.$context;
          await context.internalAdapter.updateSession(aging.token, {
            expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          });
          const read = await fetch(`${origin}/api/me`, {
            headers: aging.headers,
          });
          assert.equal(read.status, 200);
          assert.equal(read.headers.get('set-cookie'), null);
          const renewed = await fetch(`${origin}/api/auth/get-session`, {
            headers: aging.headers,
          });
          assert.equal(renewed.status, 200);
          assert.match(
            renewed.headers.get('set-cookie') ?? '',
            /session_token=/,
          );
        },
      );
      await t.test(
        'expired sessions fail without a cookie cache grace period',
        async () => {
          const expired = await helpers.login({ userId: user.id });
          const context = await auth.$context;
          await context.internalAdapter.updateSession(expired.token, {
            expiresAt: new Date(0),
          });
          assert.equal(
            (await fetch(`${origin}/api/me`, { headers: expired.headers }))
              .status,
            401,
          );
        },
      );
    } finally {
      await runtime?.stop();
      if (web) {
        web.kill();
        await exited;
      }
      await database.db.$client.query(
        'DELETE FROM draft_opening WHERE draft_id IN (SELECT id FROM story_draft WHERE owner_id = $1)',
        [user.id],
      );
      await database.db.$client.query(
        'DELETE FROM outbox WHERE operation_id IN (SELECT id FROM generation WHERE owner_id = $1)',
        [user.id],
      );
      await database.db.$client.query(
        'DELETE FROM generation WHERE owner_id = $1',
        [user.id],
      );
      await database.db.$client.query(
        'DELETE FROM story_draft WHERE owner_id = $1',
        [user.id],
      );
      await database.db.$client.query(
        'DELETE FROM outbox WHERE operation_id IN (SELECT p.id FROM story_passage p JOIN story s ON s.id = p.story_id WHERE s.owner_id = $1)',
        [user.id],
      );
      await database.db.$client.query(
        'DELETE FROM story_passage WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
        [user.id],
      );
      await database.db.$client.query(
        'DELETE FROM story_control WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
        [user.id],
      );
      await database.db.$client.query(
        'DELETE FROM story_item WHERE story_id IN (SELECT id FROM story WHERE owner_id = $1)',
        [user.id],
      );
      await database.db.$client.query('DELETE FROM story WHERE owner_id = $1', [
        user.id,
      ]);
      await helpers.deleteUser(otherUser.id);
      await helpers.deleteUser(user.id);
      await app.close();
    }
  },
);
