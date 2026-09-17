import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { TestContext } from 'node:test';
import { draftListSchema, draftSchema } from '@offscreen/contracts/drafts';

export async function checkDrafts(
  t: TestContext,
  origin: string,
  cookie: string,
  otherCookie: string,
) {
  const id = randomUUID();
  const base = {
    title: 'A life between stars',
    premise: 'I am a tiny organism aboard a ship.',
    storytellingDirection: 'Quiet wonder, with absurd interruptions.',
  };
  const save = (key: string, body: unknown, actor = cookie, source = origin) =>
    fetch(`${origin}/api/drafts/${key}`, {
      method: 'PUT',
      headers: {
        cookie: actor,
        origin: source,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  await t.test(
    'draft create retries reuse one identity and preserve the original text',
    async () => {
      const first = await save(id, { ...base, expectedRevision: 0 });
      assert.equal(first.status, 200);
      const created = draftSchema.parse(await first.json());
      assert.equal(created.revision, 1);
      assert.equal(created.premise, base.premise);
      const retry = await save(id, { ...base, expectedRevision: 0 });
      assert.deepEqual(await retry.json(), created);
      const page = await fetch(`${origin}/stories/${id}`, {
        headers: { cookie },
      });
      assert.equal(page.status, 200);
      assert.ok((await page.text()).includes(base.title));
    },
  );
  await t.test(
    'simultaneous edits commit one revision and reject the stale writer',
    async () => {
      const outcomes = await Promise.all([
        save(id, { ...base, title: 'First edit', expectedRevision: 1 }),
        save(id, { ...base, title: 'Second edit', expectedRevision: 1 }),
      ]);
      assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409]);
      const winning = draftSchema.parse(
        await outcomes.find((r) => r.status === 200)!.json(),
      );
      assert.equal(winning.revision, 2);
      const retry = await save(id, {
        title: winning.title,
        premise: winning.premise,
        storytellingDirection: winning.storytellingDirection,
        expectedRevision: 1,
      });
      assert.deepEqual(await retry.json(), winning);
      assert.equal(
        (await save(id, { ...base, expectedRevision: 0 })).status,
        409,
      );
    },
  );
  await t.test(
    'ownership is enforced for reads, writes and cursor queries',
    async () => {
      assert.equal(
        (
          await fetch(`${origin}/api/drafts/${id}`, {
            headers: { cookie: otherCookie },
          })
        ).status,
        404,
      );
      assert.equal(
        (await save(id, { ...base, expectedRevision: 2 }, otherCookie)).status,
        404,
      );
      assert.equal(
        (await save(id, { ...base, expectedRevision: 0 }, otherCookie)).status,
        404,
      );
      const list = draftListSchema.parse(
        await (
          await fetch(`${origin}/api/drafts`, {
            headers: { cookie: otherCookie },
          })
        ).json(),
      );
      assert.equal(list.items.length, 0);
      assert.equal(
        (
          await fetch(`${origin}/api/drafts?cursor=${id}`, {
            headers: { cookie: otherCookie },
          })
        ).status,
        404,
      );
      assert.equal((await fetch(`${origin}/api/drafts/${id}`)).status, 401);
    },
  );
  await t.test(
    'validation and CSRF checks reject malformed writes without creating data',
    async () => {
      const rejectedId = randomUUID();
      assert.equal(
        (
          await save(rejectedId, {
            ...base,
            expectedRevision: 0,
            ownerId: 'other',
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await save(rejectedId, {
            ...base,
            expectedRevision: 0,
            premise: 'x'.repeat(6001),
          })
        ).status,
        400,
      );
      assert.equal(
        (await save('not-an-id', { ...base, expectedRevision: 0 })).status,
        400,
      );
      assert.equal(
        (
          await save(
            rejectedId,
            { ...base, expectedRevision: 0 },
            cookie,
            'https://evil.example',
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await fetch(`${origin}/api/drafts/${rejectedId}`, {
            headers: { cookie },
          })
        ).status,
        404,
      );
      const noOrigin = await fetch(`${origin}/api/drafts/${rejectedId}`, {
        method: 'PUT',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ ...base, expectedRevision: 0 }),
      });
      assert.equal(noOrigin.status, 403);
    },
  );
  await t.test(
    'incomplete drafts are saved and pagination includes every owned draft once',
    async () => {
      for (let index = 0; index < 21; index++) {
        const response = await save(randomUUID(), {
          title: '',
          premise: '',
          storytellingDirection: '',
          expectedRevision: 0,
        });
        assert.equal(response.status, 200);
      }
      const first = draftListSchema.parse(
        await (
          await fetch(`${origin}/api/drafts`, { headers: { cookie } })
        ).json(),
      );
      assert.equal(first.items.length, 20);
      assert.ok(first.nextCursor);
      const second = draftListSchema.parse(
        await (
          await fetch(`${origin}/api/drafts?cursor=${first.nextCursor}`, {
            headers: { cookie },
          })
        ).json(),
      );
      assert.equal(second.items.length, 2);
      assert.equal(second.nextCursor, null);
      assert.equal(
        new Set([...first.items, ...second.items].map((item) => item.id)).size,
        22,
      );
    },
  );
}
