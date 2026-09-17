import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { TestContext } from 'node:test';
import type { Database } from '@offscreen/db';
import { createStories, StoryError } from '@offscreen/server/stories';
import {
  storySnapshotSchema,
  storyHistorySchema,
} from '@offscreen/contracts/stories';
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
    'history pages remain ordered as new passages arrive and never expose another owner',
    async () => {
      const id = randomUUID();
      const stories = createStories(database);
      await stories.initialize(owner, id, {
        source: 'history-test.v1',
        content: {
          version: 1,
          title: 'Beginning',
          paragraphs: ['Quiet morning.'],
        },
        interaction: null,
      });
      // Test-only persisted history, not an alternative production write endpoint.
      async function append(from: number, to: number) {
        const client = await database.db.$client.connect();
        try {
          await client.query('BEGIN');
          for (let sequence = from; sequence <= to; sequence++) {
            await client.query(
              `
            INSERT INTO story_passage (id, story_id, sequence, content)
            VALUES ($1, $2, $3, $4::jsonb)`,
              [
                randomUUID(),
                id,
                sequence,
                JSON.stringify({
                  version: 1,
                  title: `Passage ${sequence}`,
                  paragraphs: ['An ordinary day.'],
                }),
              ],
            );
          }
          await client.query('UPDATE story SET revision = $1 WHERE id = $2', [
            to,
            id,
          ]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
      await append(2, 45);
      const url = `${origin}/api/stories/${id}/history`;
      const read = async (query = '') => {
        const response = await fetch(url + query, { headers: { cookie } });
        assert.equal(response.status, 200);
        return storyHistorySchema.parse(await response.json());
      };
      const first = await read();
      assert.deepEqual(
        first.items.map((entry) => entry.sequence),
        Array.from({ length: 20 }, (_, i) => 45 - i),
      );
      assert.equal(first.nextBefore, 26);
      assert.ok(first.items.every((entry) => !('interaction' in entry)));
      await append(46, 46);
      const second = await read(`?before=${first.nextBefore}`);
      const third = await read(`?before=${second.nextBefore}`);
      assert.deepEqual(
        [...first.items, ...second.items, ...third.items].map(
          (entry) => entry.sequence,
        ),
        Array.from({ length: 45 }, (_, i) => 45 - i),
      );
      assert.equal(third.nextBefore, null);
      assert.equal((await read()).items[0]!.sequence, 46);
      assert.deepEqual(await read('?before=1'), {
        items: [],
        nextBefore: null,
      });
      for (const query of [
        '?before=0',
        '?before=-1',
        '?before=1.5',
        '?before=',
        '?before=2147483648',
        '?before=2&before=3',
      ]) {
        assert.equal(
          (await fetch(url + query, { headers: { cookie } })).status,
          400,
        );
      }
      assert.equal(
        (await fetch(url, { headers: { cookie: otherCookie } })).status,
        404,
      );
      assert.equal(
        (await fetch(url + '?before=1', { headers: { cookie: otherCookie } }))
          .status,
        404,
      );
      assert.equal((await fetch(url)).status, 401);
      assert.equal(
        (
          await fetch(`${origin}/api/stories/${randomUUID()}/history`, {
            headers: { cookie },
          })
        ).status,
        404,
      );
    },
  );
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
        await page.getByRole('button', { name: 'Read saved passages' }).click();
        const history = page.getByRole('region', { name: 'Saved chronology' });
        await history
          .getByRole('heading', { name: '1. A gate and a small decision.' })
          .waitFor();
        assert.equal(await history.getByRole('article').count(), 1);
        assert.equal(
          await history
            .getByRole('button', { name: 'Read older passages' })
            .count(),
          0,
        );
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
