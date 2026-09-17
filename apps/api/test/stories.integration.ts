import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
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
  restartWorker: () => Promise<void>,
) {
  await t.test(
    'timed replies enforce cutoff, retry identity and one default under contention',
    async () => {
      const stories = createStories(database);
      const put = (id: string, path: string, body: unknown) =>
        fetch(`${origin}/api/stories/${id}${path}`, {
          method: 'PUT',
          headers: { cookie, origin, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
      async function openDecision() {
        const id = randomUUID();
        const firstResponse = await put(id, '/chamber', {
          scenario: 'chamber.v4',
        });
        assert.equal(firstResponse.status, 200);
        const first = storySnapshotSchema.parse(await firstResponse.json());
        const response = await put(id, `/responses/${randomUUID()}`, {
          expectedRevision: 1,
          submission: {
            interactionId: first.current.interaction!.id,
            answer: { kind: 'choice.v1', optionId: 'approach' },
          },
        });
        assert.equal(response.status, 200);
        const saved = storySnapshotSchema.parse(await response.json());
        assert.equal(saved.decision!.defaultOptionId, 'leave');
        assert.equal(saved.waiting, null);
        assert.ok(!JSON.stringify(saved).includes('outcome'));
        return saved;
      }
      const onTime = await openDecision();
      assert.ok((await stories.resolveDecision(onTime.current.id))! > 0);
      const request = {
        expectedRevision: 2,
        submission: {
          interactionId: onTime.current.interaction!.id,
          answer: { kind: 'choice.v1', optionId: 'joke' },
        },
      };
      const operation = randomUUID();
      assert.equal(
        (await put(onTime.id, `/responses/${operation}`, request)).status,
        200,
      );
      // Test clock fixture: expire the already answered offer, then retry its receipt.
      await database.db.$client.query(
        'UPDATE story_passage SET response_due_at = clock_timestamp() WHERE id = $1',
        [onTime.current.id],
      );
      assert.equal(
        (await put(onTime.id, `/responses/${operation}`, request)).status,
        200,
      );
      assert.equal(await stories.resolveDecision(onTime.current.id), null);
      assert.equal(
        (await stories.read(owner, onTime.id)).current.content.title,
        'Someone laughs.',
      );
      const expired = await openDecision();
      await database.db.$client.query(
        'UPDATE story_passage SET response_due_at = clock_timestamp() WHERE id = $1',
        [expired.current.id],
      );
      const late = {
        ...request,
        submission: {
          ...request.submission,
          interactionId: expired.current.interaction!.id,
        },
      };
      // Competing timeout deliveries and a late player write all use the same story lock.
      const results = await Promise.all([
        put(expired.id, `/responses/${randomUUID()}`, late),
        stories.resolveDecision(expired.current.id),
        stories.resolveDecision(expired.current.id),
      ]);
      assert.equal(results[0].status, 409);
      assert.equal(results[1], null);
      assert.equal(results[2], null);
      const final = await stories.read(owner, expired.id);
      assert.equal(final.revision, 3);
      assert.equal(final.decision, null);
      assert.equal(final.current.content.title, 'A quiet departure.');
      const provenance = await database.db.$client.query(
        'SELECT response_source FROM story_passage WHERE id = $1',
        [final.current.id],
      );
      assert.equal(provenance.rows[0].response_source, 'default');
      assert.equal((await stories.history(owner, expired.id)).items.length, 3);
    },
  );
  await t.test(
    'browser publishes a timed offer and Temporal defaults after the browser leaves',
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
        await page.getByLabel('Scenario').selectOption('chamber.v4');
        await page
          .getByRole('button', { name: 'Start scripted chamber' })
          .click();
        await page.getByRole('button', { name: 'Approach the gate' }).click();
        await page
          .getByText('This response window cannot be paused.', { exact: false })
          .waitFor();
        const url = page.url();
        const id = new URL(url).searchParams.get('id')!;
        const before = await createStories(database).read(owner, id);
        await page.close();
        const limit = Date.now() + 30000;
        let latest = before;
        while (latest.revision === before.revision && Date.now() < limit) {
          await delay(300);
          latest = await createStories(database).read(owner, id);
        }
        assert.equal(latest.revision, 3);
        assert.ok(Date.now() >= Date.parse(before.decision!.dueAt));
        const reopened = await context.newPage();
        await reopened.goto(url);
        await reopened
          .getByRole('heading', { name: 'A quiet departure.' })
          .waitFor();
        assert.equal(
          await reopened.getByRole('button', { name: 'Tell a joke' }).count(),
          0,
        );
      } finally {
        await browser.close();
      }
    },
  );
  await t.test(
    'scripted responses connect authenticated HTTP to saved branches and safe retries',
    async () => {
      const id = randomUUID();
      const url = `${origin}/api/stories/${id}`;
      const put = (
        path: string,
        body: unknown,
        actor = cookie,
        source = origin,
      ) =>
        fetch(url + path, {
          method: 'PUT',
          headers: {
            cookie: actor,
            origin: source,
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        });
      const start = await put('/chamber', { scenario: 'chamber.v2' });
      assert.equal(start.status, 200);
      const first = storySnapshotSchema.parse(await start.json());
      assert.equal(first.canRespond, true);
      const body = {
        expectedRevision: first.revision,
        submission: {
          interactionId: first.current.interaction!.id,
          answer: { kind: 'choice.v1', optionId: 'approach' },
        },
      };
      const path = `/responses/${randomUUID()}`;
      assert.equal((await put(path, body, otherCookie)).status, 404);
      assert.equal((await put(path, body, '')).status, 401);
      assert.equal(
        (await put(path, body, cookie, 'https://evil.example')).status,
        403,
      );
      assert.equal(
        (await put(path, { ...body, content: 'injected' })).status,
        400,
      );
      const results = await Promise.all([put(path, body), put(path, body)]);
      assert.ok(results.every((r) => r.status === 200));
      const second = storySnapshotSchema.parse(await results[0]!.json());
      assert.deepEqual(await results[1]!.json(), second);
      assert.equal(second.revision, 2);
      assert.equal(second.current.content.title, 'At the gate.');
      assert.equal((await put(`/responses/${randomUUID()}`, body)).status, 409);
      const finish = await put(`/responses/${randomUUID()}`, {
        expectedRevision: 2,
        submission: {
          interactionId: second.current.interaction!.id,
          answer: { kind: 'choice.v1', optionId: 'leave' },
        },
      });
      assert.equal(finish.status, 200);
      const ending = storySnapshotSchema.parse(await finish.json());
      assert.equal(ending.canRespond, false);
      assert.equal(ending.current.content.title, 'A quiet departure.');
      assert.deepEqual(await (await put(path, body)).json(), ending);
      assert.deepEqual(
        await (await put('/chamber', { scenario: 'chamber.v2' })).json(),
        ending,
      );
      assert.equal(
        (
          await put(path, {
            ...body,
            submission: {
              ...body.submission,
              answer: { kind: 'choice.v1', optionId: 'leave' },
            },
          })
        ).status,
        409,
      );
      const history = await createStories(database).history(owner, id);
      assert.equal(history.items.length, 3);
    },
  );
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
        await page.getByLabel('Scenario').selectOption('chamber.v2');
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
            .getByRole('button', { name: 'Approach the gate' })
            .isDisabled(),
          false,
        );
        await page.reload();
        assert.equal(page.url(), url);
        assert.equal(await page.locator('details').textContent(), before);
        await page.getByRole('button', { name: 'Approach the gate' }).click();
        await page.getByRole('heading', { name: 'At the gate.' }).waitFor();
        await page.reload();
        await page.getByRole('button', { name: 'Tell a joke' }).click();
        await page.getByRole('heading', { name: 'Someone laughs.' }).waitFor();
        await page.reload();
        await page.getByRole('heading', { name: 'Someone laughs.' }).waitFor();
        assert.equal(
          await page
            .getByRole('region', { name: 'Offered interaction' })
            .count(),
          0,
        );
        await page.getByRole('button', { name: 'Read saved passages' }).click();
        const history = page.getByRole('region', { name: 'Saved chronology' });
        await history
          .getByRole('heading', { name: '1. A gate and a small decision.' })
          .waitFor();
        assert.equal(await history.getByRole('article').count(), 3);
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
        await page.goto(`${origin}/chamber`);
        await page
          .getByRole('button', { name: 'Start scripted chamber' })
          .click();
        await page
          .getByRole('button', { name: 'Walk to the cafe (20 seconds)' })
          .click();
        await page
          .getByRole('heading', { name: 'Crossing the courtyard.' })
          .waitFor();
        const timedUrl = page.url();
        const timedId = new URL(timedUrl).searchParams.get('id')!;
        const waiting = await createStories(database).read(owner, timedId);
        assert.ok(waiting.waiting);
        assert.ok(
          (await createStories(database).advanceInterval(waiting.current.id))! >
            0,
        );
        await assert.rejects(
          createStories(database).append(owner, timedId, randomUUID(), {
            expectedRevision: waiting.revision,
            content: waiting.current.content,
            interaction: null,
          }),
          (error: unknown) =>
            error instanceof StoryError && error.code === 'conflict',
        );
        await page.getByRole('button', { name: 'Pause journey' }).click();
        await page.getByRole('button', { name: 'Resume journey' }).waitFor();
        const paused = await createStories(database).read(owner, timedId);
        assert.equal(paused.revision, waiting.revision);
        assert.ok(paused.viewVersion > waiting.viewVersion);
        assert.equal(paused.waiting!.dueAt, null);
        assert.ok(paused.waiting!.remainingMs! > 0);
        const receipt = (
          await database.db.$client.query(
            'SELECT operation_id, request FROM story_control WHERE story_id = $1',
            [timedId],
          )
        ).rows[0];
        const retryControl = (
          body = receipt.request,
          actor = cookie,
          source = origin,
        ) =>
          fetch(
            `${origin}/api/stories/${timedId}/controls/${receipt.operation_id}`,
            {
              method: 'PUT',
              headers: {
                cookie: actor,
                origin: source,
                'content-type': 'application/json',
              },
              body: JSON.stringify(body),
            },
          );
        assert.equal((await retryControl()).status, 200);
        assert.equal(
          (await retryControl(receipt.request, otherCookie)).status,
          404,
        );
        assert.equal((await retryControl(receipt.request, '')).status, 401);
        assert.equal(
          (await retryControl(receipt.request, cookie, 'https://evil.example'))
            .status,
          403,
        );
        assert.equal(
          (await retryControl({ ...receipt.request, action: 'resume' })).status,
          409,
        );
        assert.deepEqual(
          await createStories(database).read(owner, timedId),
          paused,
        );
        await page.close();
        // Wait until dispatch is acknowledged, then restart the worker while the
        // persisted interval is still pending. No browser is driving progression.
        const dispatchLimit = Date.now() + 10000;
        let delivered = false;
        while (!delivered && Date.now() < dispatchLimit) {
          const result = await database.db.$client.query(
            'SELECT delivered_at FROM outbox WHERE id = $1',
            [waiting.current.id],
          );
          delivered = result.rows[0]?.delivered_at != null;
          if (!delivered) await delay(100);
        }
        assert.ok(delivered);
        await restartWorker();
        await delay(
          Math.max(0, Date.parse(waiting.waiting.dueAt!) - Date.now()) + 250,
        );
        assert.equal(
          await createStories(database).advanceInterval(waiting.current.id),
          -1,
        );
        assert.deepEqual(
          await createStories(database).read(owner, timedId),
          paused,
        );
        const resumePage = await context.newPage();
        await resumePage.goto(timedUrl);
        await resumePage
          .getByRole('button', { name: 'Resume journey' })
          .click();
        await resumePage
          .getByRole('button', { name: 'Pause journey' })
          .waitFor();
        const resumed = await createStories(database).read(owner, timedId);
        assert.equal(resumed.waiting!.remainingMs, null);
        assert.equal(resumed.waiting!.controlRevision, 2);
        assert.ok(Date.parse(resumed.waiting!.dueAt!) > Date.now());
        // Retrying an old acknowledged pause cannot pause the resumed journey.
        assert.equal((await retryControl()).status, 200);
        assert.deepEqual(
          await createStories(database).read(owner, timedId),
          resumed,
        );
        await resumePage.close();
        const deadline = Date.now() + 30000;
        let arrived = await createStories(database).read(owner, timedId);
        while (arrived.waiting && Date.now() < deadline) {
          await delay(250);
          arrived = await createStories(database).read(owner, timedId);
        }
        assert.equal(arrived.current.content.title, 'At the cafe.');
        assert.equal(arrived.revision, 3);
        assert.equal(arrived.waiting, null);
        assert.ok(Date.now() >= Date.parse(waiting.waiting.dueAt!));
        assert.equal(
          await createStories(database).advanceInterval(waiting.current.id),
          null,
        );
        assert.equal(
          (await createStories(database).history(owner, timedId)).items.length,
          3,
        );
        const reopened = await context.newPage();
        await reopened.goto(timedUrl);
        await reopened.getByRole('button', { name: 'Tell a joke' }).click();
        await reopened
          .getByRole('heading', { name: 'Coffee and a laugh.' })
          .waitFor();
      } finally {
        await browser.close();
      }
    },
  );
}
