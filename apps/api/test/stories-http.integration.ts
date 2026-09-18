import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { TestContext } from 'node:test';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { chamberInspectorSchema } from '@offscreen/contracts/chamber';
import type { Database } from '@offscreen/db';
import { createStories, StoryError } from '@offscreen/application/stories';
import { requireDefined } from './helpers/require.js';
import { registerStoryConcern } from './helpers/story-suite.js';

type StoryHttpArgs = {
  t: TestContext;
  database: Database;
  owner: string;
  origin: string;
  cookie: string;
  otherCookie: string;
};

export async function checkStoryHttp({
  t,
  database,
  owner,
  origin,
  cookie,
  otherCookie,
}: StoryHttpArgs) {
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
      const offer = requireDefined(
        first.current.interaction,
        'Expected playable chamber offer',
      );
      const body = {
        expectedRevision: first.revision,
        submission: {
          interactionId: offer.id,
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
      const firstResult = requireDefined(
        results[0],
        'Expected first concurrent response',
      );
      const secondResult = requireDefined(
        results[1],
        'Expected second concurrent response',
      );
      const second = storySnapshotSchema.parse(await firstResult.json());
      assert.deepEqual(await secondResult.json(), second);
      assert.equal(second.revision, 2);
      assert.equal(second.current.content.title, 'At the gate.');
      assert.equal((await put(`/responses/${randomUUID()}`, body)).status, 409);
      const gateOffer = requireDefined(
        second.current.interaction,
        'Expected gate offer',
      );
      const finish = await put(`/responses/${randomUUID()}`, {
        expectedRevision: 2,
        submission: {
          interactionId: gateOffer.id,
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
      const history = await createStories(database).history({
        ownerId: owner,
        storyId: id,
      });
      assert.equal(history.items.length, 3);
    },
  );

  await t.test(
    'chamber inspector is authenticated, owner-scoped and read-only',
    async () => {
      const id = randomUUID();
      const started = await fetch(`${origin}/api/stories/${id}/chamber`, {
        method: 'PUT',
        headers: {
          cookie,
          origin,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ scenario: 'chamber.v5' }),
      });
      assert.equal(started.status, 200);
      const url = `${origin}/api/chamber-tools/stories/${id}`;
      assert.equal((await fetch(url)).status, 401);
      assert.equal(
        (await fetch(url, { headers: { cookie: otherCookie } })).status,
        404,
      );
      const response = await fetch(url, { headers: { cookie } });
      assert.equal(response.status, 200);
      const inspection = chamberInspectorSchema.parse(await response.json());
      assert.equal(inspection.story.source, 'chamber.v5');
      assert.equal(inspection.items[0]?.holderKey, 'courier');
      assert.equal(
        (await fetch(url, { method: 'PUT', headers: { cookie, origin } }))
          .status,
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
      const firstResult = requireDefined(
        results[0],
        'Expected first chamber start response',
      );
      const secondResult = requireDefined(
        results[1],
        'Expected second chamber start response',
      );
      const first = storySnapshotSchema.parse(await firstResult.json());
      assert.deepEqual(await secondResult.json(), first);
      assert.deepEqual(
        await createStories(database).read({ ownerId: owner, storyId: id }),
        first,
      );
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
        createStories(database).initialize({
          ownerId: owner,
          storyId: id,
          initial: {
            source: 'chamber.v1',
            content: {
              version: 1,
              title: 'Replacement',
              paragraphs: ['Do not overwrite'],
            },
            interaction: null,
          },
        }),
        (error: unknown) =>
          error instanceof StoryError && error.code === 'conflict',
      );
      assert.deepEqual(
        await createStories(database).read({ ownerId: owner, storyId: id }),
        first,
      );
    },
  );
}

registerStoryConcern(import.meta.url, 'story http integration', checkStoryHttp);
