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
    'continuations commit once, fence stale writers and retain original start identity',
    async () => {
      const stories = createStories(database);
      const id = randomUUID();
      const opening = {
        source: 'transition-test.v1',
        content: {
          version: 1,
          title: 'Beginning',
          paragraphs: ['A quiet room.'],
        },
        interaction: null,
      };
      await stories.initialize(owner, id, opening);
      const transitionId = randomUUID();
      const proposal = {
        expectedRevision: 1,
        content: {
          version: 1,
          title: 'A visitor',
          paragraphs: ['Someone knocks.'],
        },
        interaction: {
          kind: 'choice.v1',
          prompt: 'What now?',
          options: [
            { id: 'answer', label: 'Answer' },
            { id: 'wait', label: 'Wait' },
          ],
        },
      };
      const [a, b] = await Promise.all([
        stories.append(owner, id, transitionId, proposal),
        stories.append(owner, id, transitionId, proposal),
      ]);
      assert.deepEqual(a, b);
      assert.equal(a.revision, 2);
      assert.ok(a.current.interaction?.id);
      const next = {
        ...proposal,
        expectedRevision: 2,
        interaction: null,
        response: {
          interactionId: a.current.interaction.id,
          answer: { kind: 'choice.v1', optionId: 'answer' },
        },
      };
      const race = await Promise.allSettled([
        stories.append(owner, id, randomUUID(), next),
        stories.append(owner, id, randomUUID(), next),
      ]);
      assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
      const loser = race.find((r) => r.status === 'rejected');
      assert.ok(
        loser?.status === 'rejected' &&
          loser.reason instanceof StoryError &&
          loser.reason.code === 'conflict',
      );
      const current = await stories.read(owner, id);
      assert.equal(current.revision, 3);
      assert.deepEqual(
        await createStories(database).append(owner, id, transitionId, proposal),
        current,
      );
      assert.deepEqual(await stories.initialize(owner, id, opening), current);
      const rejects = async (
        actor: string,
        key: string,
        body: unknown,
        code: string,
      ) => {
        await assert.rejects(
          stories.append(actor, id, key, body),
          (error: unknown) =>
            error instanceof StoryError && error.code === code,
        );
        assert.deepEqual(await stories.read(owner, id), current);
      };
      await rejects('another-owner', transitionId, proposal, 'not_found');
      await rejects(owner, randomUUID(), proposal, 'conflict');
      await rejects(
        owner,
        transitionId,
        { ...proposal, expectedRevision: 2 },
        'conflict',
      );
      await rejects(
        owner,
        transitionId,
        { ...proposal, interaction: null },
        'conflict',
      );
      await rejects(
        owner,
        transitionId,
        { ...proposal, content: opening.content },
        'conflict',
      );
      await rejects(
        owner,
        randomUUID(),
        { ...proposal, expectedRevision: 3, interaction: { kind: 'unknown' } },
        'invalid',
      );
      await rejects(
        owner,
        randomUUID(),
        { ...proposal, expectedRevision: 2147483647 },
        'invalid',
      );
      const history = await stories.history(owner, id);
      assert.deepEqual(
        history.items.map((entry) => entry.sequence),
        [3, 2, 1],
      );
      assert.deepEqual(history.items[1]!.content, proposal.content);
    },
  );
  await t.test(
    'a consequence records only an answer to the current authoritative offer',
    async () => {
      const stories = createStories(database);
      const id = randomUUID();
      const initial = {
        source: 'response-test.v1',
        content: {
          version: 1,
          title: 'A visitor',
          paragraphs: ['Someone knocks.'],
        },
        interaction: {
          kind: 'choice.v1',
          prompt: 'What now?',
          options: [
            { id: 'answer', label: 'Answer' },
            { id: 'wait', label: 'Wait' },
          ],
        },
      };
      const start = await stories.initialize(owner, id, initial);
      assert.ok(start.current.interaction);
      const other = await stories.initialize(owner, randomUUID(), initial);
      const proposal = {
        expectedRevision: 1,
        content: {
          version: 1,
          title: 'You answer',
          paragraphs: ['The visitor introduces herself.'],
        },
        interaction: null,
      };
      const response = {
        interactionId: start.current.interaction.id,
        answer: { kind: 'choice.v1', optionId: 'answer' },
      };
      for (const [submitted, code] of [
        [null, 'conflict'],
        [
          { ...response, interactionId: other.current.interaction!.id },
          'conflict',
        ],
        [
          { ...response, answer: { kind: 'choice.v1', optionId: 'invented' } },
          'invalid',
        ],
        [{ ...response, effects: ['free gold'] }, 'invalid'],
      ] as const) {
        await assert.rejects(
          stories.append(owner, id, randomUUID(), {
            ...proposal,
            response: submitted,
          }),
          (error: unknown) =>
            error instanceof StoryError && error.code === code,
        );
        assert.deepEqual(await stories.read(owner, id), start);
      }
      const key = randomUUID();
      const accepted = { ...proposal, response };
      const saved = await stories.append(owner, id, key, accepted);
      assert.equal(saved.revision, 2);
      assert.deepEqual(
        await createStories(database).append(owner, id, key, accepted),
        saved,
      );
      const recorded = await database.db.$client.query(
        'SELECT response FROM story_passage WHERE story_id = $1 AND transition_id = $2',
        [id, key],
      );
      assert.deepEqual(recorded.rows[0].response, response);
      await assert.rejects(
        stories.append(owner, id, key, {
          ...accepted,
          response: {
            ...response,
            answer: { kind: 'choice.v1', optionId: 'wait' },
          },
        }),
        (error: unknown) =>
          error instanceof StoryError && error.code === 'conflict',
      );
      // A stale answer cannot be attached to a later passage, even at its revision.
      await assert.rejects(
        stories.append(owner, id, randomUUID(), {
          ...accepted,
          expectedRevision: 2,
        }),
        (error: unknown) =>
          error instanceof StoryError && error.code === 'conflict',
      );
      assert.deepEqual(await stories.read(owner, id), saved);
      assert.equal((await stories.history(owner, id)).items.length, 2);
    },
  );
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
      async function append(from: number, to: number) {
        for (let sequence = from; sequence <= to; sequence++) {
          await stories.append(owner, id, randomUUID(), {
            expectedRevision: sequence - 1,
            content: {
              version: 1,
              title: `Passage ${sequence}`,
              paragraphs: ['An ordinary day.'],
            },
            interaction: null,
          });
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
