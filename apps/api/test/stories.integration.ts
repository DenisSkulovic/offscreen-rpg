import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { TestContext } from 'node:test';
import type { Database } from '@offscreen/db';
import { createStories, StoryError } from '@offscreen/server/stories';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { chromium } from 'playwright';

export async function checkStories(
  t: TestContext,
  database: Database,
  owner: string,
  origin: string,
  cookie: string,
  otherCookie: string,
) {
  await t.test(
    'chamber starts once, is owner-scoped and reopens through a fresh application instance',
    async () => {
      const id = randomUUID();
      const url = `${origin}/api/stories/${id}`;
      const send = (
        actor = cookie,
        body: unknown = { scenario: 'chamber.v1' },
        source = origin,
      ) =>
        fetch(`${url}/chamber`, {
          method: 'PUT',
          headers: {
            cookie: actor,
            origin: source,
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        });
      const results = await Promise.all([send(), send()]);
      assert.ok(results.every((r) => r.status === 200));
      const first = storySnapshotSchema.parse(await results[0]!.json());
      assert.deepEqual(await results[1]!.json(), first);
      assert.deepEqual(await createStories(database).read(owner, id), first);
      assert.equal(
        (
          await database.db.$client.query(
            'SELECT id FROM story_passage WHERE story_id = $1',
            [id],
          )
        ).rowCount,
        1,
      );
      assert.equal((await send(otherCookie)).status, 404);
      assert.equal(
        (await fetch(url, { headers: { cookie: otherCookie } })).status,
        404,
      );
      assert.equal((await fetch(url)).status, 401);
      assert.equal(
        (await send(cookie, { scenario: 'chamber.v1', content: 'injected' }))
          .status,
        400,
      );
      assert.equal(
        (await send(cookie, { scenario: 'chamber.v1' }, 'https://evil.example'))
          .status,
        403,
      );
      await assert.rejects(
        createStories(database).initialize(owner, id, {
          source: 'chamber.v1',
          content: {
            version: 1,
            title: 'Replacement',
            paragraphs: ['Do not overwrite'],
          },
          interaction: null,
        }),
        (error: unknown) =>
          error instanceof StoryError && error.code === 'conflict',
      );
      assert.deepEqual(await createStories(database).read(owner, id), first);
    },
  );
  await t.test(
    'browser starts and reloads the same chamber and stored interaction',
    async () => {
      const browser = await chromium.launch();
      try {
        const context = await browser.newContext();
        await context.addCookies(
          cookie.split(';').map((part) => {
            const at = part.indexOf('=');
            return {
              name: part.slice(0, at).trim(),
              value: part.slice(at + 1).trim(),
              url: origin,
            };
          }),
        );
        const page = await context.newPage();
        await page.goto(`${origin}/chamber`);
        await page
          .getByRole('button', { name: 'Start scripted chamber' })
          .click();
        await page
          .getByRole('heading', { name: 'A gate and a small decision.' })
          .waitFor();
        const url = page.url();
        const before = await page.locator('details').textContent();
        assert.equal(
          await page
            .getByRole('button', { name: 'Offer a token' })
            .isDisabled(),
          true,
        );
        await page.reload();
        assert.equal(page.url(), url);
        assert.equal(await page.locator('details').textContent(), before);
        assert.equal(
          await page
            .getByRole('button', { name: 'Start scripted chamber' })
            .count(),
          0,
        );
      } finally {
        await browser.close();
      }
    },
  );
}
