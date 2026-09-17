import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { TestContext } from 'node:test';
import type { Database } from '@offscreen/db';
import { createOpenings } from '@offscreen/server/openings';
import {
  latestOpeningSchema,
  openingPreviewSchema,
} from '@offscreen/contracts/openings';

export async function checkOpeningHTTP(
  t: TestContext,
  database: Database,
  owner: string,
  origin: string,
  cookie: string,
  otherCookie: string,
) {
  await t.test(
    'scripted preview is private, retryable, reopenable and revision-bound through HTTP',
    async () => {
      const draftId = randomUUID();
      const id = randomUUID();
      const headers = { cookie, origin, 'content-type': 'application/json' };
      const content = {
        title: 'HTTP preview',
        premise: 'An organism in a ship.',
        storytellingDirection: '',
      };
      assert.equal(
        (
          await fetch(`${origin}/api/drafts/${draftId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ ...content, expectedRevision: 0 }),
          })
        ).status,
        200,
      );
      const url = `${origin}/api/drafts/${draftId}/openings`;
      const submit = (
        actor = cookie,
        source = origin,
        body: unknown = { expectedRevision: 1 },
      ) =>
        fetch(`${url}/${id}`, {
          method: 'PUT',
          headers: { ...headers, cookie: actor, origin: source },
          body: JSON.stringify(body),
        });
      // Simulate loss of execution after admission; the endpoint resumes this fixture.
      await createOpenings(database, 'opening.scripted.v1').request(
        owner,
        draftId,
        id,
        1,
      );
      const first = await submit();
      assert.equal(first.status, 200);
      const raw = await first.json();
      assert.ok(typeof raw === 'object' && raw !== null);
      const preview = openingPreviewSchema.parse(raw);
      assert.equal(preview.state, 'succeeded');
      assert.equal(preview.mode, 'scripted');
      assert.equal(preview.isCurrent, true);
      assert.equal(Object.hasOwn(raw, 'input'), false);
      assert.equal(Object.hasOwn(raw, 'attemptId'), false);
      assert.deepEqual(await (await submit()).json(), preview);
      const latest = latestOpeningSchema.parse(
        await (await fetch(`${url}/latest`, { headers: { cookie } })).json(),
      );
      assert.deepEqual(latest.preview, preview);
      assert.equal((await submit(otherCookie)).status, 404);
      assert.equal(
        (await fetch(`${url}/latest`, { headers: { cookie: otherCookie } }))
          .status,
        404,
      );
      assert.equal((await fetch(`${url}/latest`)).status, 401);
      assert.equal((await submit(cookie, 'https://evil.example')).status, 403);
      assert.equal(
        (
          await submit(cookie, origin, {
            expectedRevision: 1,
            output: 'injected',
          })
        ).status,
        400,
      );
      await fetch(`${origin}/api/drafts/${draftId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...content,
          premise: 'A different organism.',
          expectedRevision: 1,
        }),
      });
      const old = openingPreviewSchema.parse(await (await submit()).json());
      assert.equal(old.id, id);
      assert.equal(old.isCurrent, false);
      assert.equal(old.opening, preview.opening);
    },
  );
}
