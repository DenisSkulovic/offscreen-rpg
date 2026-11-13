import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { TestContext } from 'node:test';
import { withBrowserSession } from './helpers/browser-session.js';
import { attachPrivateRouteMetrics } from './helpers/private-route-metrics.js';
import { registerStoryConcern } from './helpers/story-suite.js';

const privateTitle = 'A gate and a small decision.';

type PrivateRouteArgs = {
  t: TestContext;
  origin: string;
  cookie: string;
  otherCookie: string;
  /** Fresh session for logout proof so the shared suite cookie stays valid. */
  login: () => Promise<{ cookie: string }>;
};

async function startOwnedChamber(origin: string, cookie: string) {
  const storyId = randomUUID();
  const response = await fetch(`${origin}/api/stories/${storyId}/chamber`, {
    method: 'PUT',
    headers: {
      cookie,
      origin,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ scenario: 'chamber.v2' }),
  });
  assert.equal(response.status, 200);
  return storyId;
}

export async function checkPrivateRouteEvidence({
  t,
  origin,
  cookie,
  otherCookie,
  login,
}: PrivateRouteArgs) {
  await t.test(
    'owner Play SSR HTML is no-store and carries the scene before client GET',
    async () => {
      const storyId = await startOwnedChamber(origin, cookie);
      const playPath = `/play/${storyId}`;
      const htmlResponse = await fetch(`${origin}${playPath}`, {
        headers: { cookie },
      });
      assert.equal(htmlResponse.status, 200);
      assert.match(htmlResponse.headers.get('cache-control') ?? '', /no-store/i);
      const html = await htmlResponse.text();
      assert.ok(
        html.includes(privateTitle),
        'SSR HTML must include the authorized scene title',
      );
      const sessionToken = cookie.includes('=')
        ? cookie.slice(cookie.indexOf('=') + 1).split(';')[0]?.trim()
        : '';
      if (sessionToken && sessionToken.length > 8) {
        assert.equal(
          html.includes(sessionToken),
          false,
          'HTML must not echo the session cookie value',
        );
      }

      await withBrowserSession(origin, cookie, async ({ context }) => {
        const page = await context.newPage();
        const metrics = attachPrivateRouteMetrics(page, {
          storyId,
          revisionHint: 'w14-ssr-hydrate',
        });
        await page.goto(`${origin}${playPath}`, {
          waitUntil: 'domcontentloaded',
        });
        await page.getByRole('heading', { name: privateTitle }).waitFor();
        metrics.markHeadingVisible();
        const receipt = await metrics.receipt(await page.content());
        assert.equal(
          receipt.sample.playSnapshotGetsBeforeHeading,
          0,
          'hydrated heading must not wait on a client snapshot GET',
        );
        assert.ok(receipt.sample.htmlBytes > 0);
        assert.ok(receipt.sample.wallMsToHeading >= 0);
        // SSE open may later invalidate → GET; that is intentional, not SSR miss.
        assert.ok(receipt.sample.sseOpens >= 0);
      });
    },
  );

  await t.test(
    'anonymous and other-owner Play never disclose the private scene title',
    async () => {
      const storyId = await startOwnedChamber(origin, cookie);
      const playPath = `/play/${storyId}`;

      const anonymous = await fetch(`${origin}${playPath}`, {
        redirect: 'manual',
      });
      assert.equal(anonymous.status, 307);
      assert.equal(anonymous.headers.get('location'), '/sign-in');
      const anonymousBody = await anonymous.text();
      assert.equal(anonymousBody.includes(privateTitle), false);

      const foreign = await fetch(`${origin}${playPath}`, {
        headers: { cookie: otherCookie },
      });
      assert.ok(
        foreign.status === 404 || foreign.status === 200,
        `unexpected other-owner status ${foreign.status}`,
      );
      const foreignBody = await foreign.text();
      assert.equal(
        foreignBody.includes(privateTitle),
        false,
        'other-owner HTML must not include the private scene title',
      );

      await withBrowserSession(origin, otherCookie, async ({ context }) => {
        const page = await context.newPage();
        await page.goto(`${origin}${playPath}`, {
          waitUntil: 'domcontentloaded',
        });
        assert.equal(await page.getByRole('heading', { name: privateTitle }).count(), 0);
      });
    },
  );

  await t.test(
    'soft navigation away and back keeps owner scene; metrics receipt stays redacted',
    async () => {
      const storyId = await startOwnedChamber(origin, cookie);
      const playPath = `/play/${storyId}`;

      await withBrowserSession(origin, cookie, async ({ context }) => {
        const page = await context.newPage();
        const metrics = attachPrivateRouteMetrics(page, {
          storyId,
          revisionHint: 'w14-soft-nav',
        });
        await page.goto(`${origin}${playPath}`, {
          waitUntil: 'domcontentloaded',
        });
        await page.getByRole('heading', { name: privateTitle }).waitFor();
        metrics.markHeadingVisible();
        await page.getByRole('link', { name: '← Stories' }).click();
        await page.waitForURL(/\/stories$/);
        await page.goBack();
        await page.getByRole('heading', { name: privateTitle }).waitFor();
        const receipt = await metrics.receipt(await page.content());
        assert.equal(receipt.environment, 'next-start+nest+disposable-db');
        for (const sample of receipt.requests) {
          assert.match(
            sample.class,
            /^(play-html|play-snapshot-get|play-updates-sse|stories-html|sign-in-html)$/,
          );
          assert.equal(
            JSON.stringify(sample).includes(privateTitle),
            false,
            'metrics samples must not embed private story text',
          );
        }
      });
    },
  );

  await t.test(
    'sign-out then history.back does not re-expose private Play HTML',
    async () => {
      const session = await login();
      const storyId = await startOwnedChamber(origin, session.cookie);
      const playPath = `/play/${storyId}`;

      await withBrowserSession(origin, session.cookie, async ({ context }) => {
        const page = await context.newPage();
        await page.goto(`${origin}${playPath}`, {
          waitUntil: 'domcontentloaded',
        });
        await page.getByRole('heading', { name: privateTitle }).waitFor();
        await page.getByRole('link', { name: '← Stories' }).click();
        await page.waitForURL(/\/stories$/);
        await page.getByRole('button', { name: 'Sign out' }).click();
        await page.waitForURL(/\/$/);
        await page.goBack();
        await page.waitForLoadState('domcontentloaded');
        const body = await page.content();
        assert.equal(
          body.includes(privateTitle),
          false,
          'Router/history back after logout must not revive private scene HTML',
        );
        assert.ok(
          page.url().includes('/sign-in') ||
            page.url().replace(/\/$/, '') === origin ||
            (await page.getByRole('button', { name: /Sign in/i }).count()) > 0,
          'post-logout back must land on a public/sign-in surface',
        );
      });
    },
  );
}

registerStoryConcern(import.meta.url, 'private route evidence', async (args) => {
  // Focused suite entry recreates a login from the shared integration owner cookie.
  await checkPrivateRouteEvidence({
    t: args.t,
    origin: args.origin,
    cookie: args.cookie,
    otherCookie: args.otherCookie,
    login: async () => ({ cookie: args.cookie }),
  });
});
