import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkDrafts } from './drafts.integration.js';
import { checkDraftBrowser } from './drafts.browser.js';
import { checkGenerations } from './generations.integration.js';
import { checkOpeningHTTP } from './openings.integration.js';
import { withAppIntegration } from './helpers/app-integration.js';

test(
  'identity integration through HTTP and the web application',
  { timeout: 180000 },
  async (t) => {
    await withAppIntegration(async (context) => {
      const {
        database,
        origin,
        auth,
        helpers,
        user,
        cookie,
        otherCookie,
        restartWorker,
      } = context;
      await checkDrafts(t, origin, cookie, otherCookie);
      await checkGenerations(t, database, user.id, context.otherUser.id);
      await checkOpeningHTTP(t, database, user.id, origin, cookie, otherCookie);
      await restartWorker();
      await checkDraftBrowser(t, origin, cookie);

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
          const authContext = await auth.$context;
          await authContext.internalAdapter.updateSession(aging.token, {
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
          const authContext = await auth.$context;
          await authContext.internalAdapter.updateSession(expired.token, {
            expiresAt: new Date(0),
          });
          assert.equal(
            (await fetch(`${origin}/api/me`, { headers: expired.headers }))
              .status,
            401,
          );
        },
      );
    });
  },
);
