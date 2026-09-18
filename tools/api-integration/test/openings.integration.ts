import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { TestContext } from 'node:test';
import type { Database } from '@offscreen/db';
import { createOutbox } from '@offscreen/application/outbox';
import {
  scriptedOpeningTopic,
  createScriptedOpenings,
  scriptedPlayableOpening,
  scriptedOpeningPresentation,
} from '@offscreen/application/generations';
import { startRuntime } from '@offscreen/worker/runtime';
import { setTimeout as delay } from 'node:timers/promises';
import {
  latestOpeningSchema,
  openingPreviewSchema,
} from '@offscreen/contracts/openings';
import { requireDefined } from './helpers/require.js';

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
      const first = await submit();
      assert.equal(first.status, 202);
      const raw = await first.json();
      assert.ok(typeof raw === 'object' && raw !== null);
      let preview = openingPreviewSchema.parse(raw);
      assert.equal(
        preview.state,
        'pending',
        'API accepts while worker is offline',
      );
      assert.equal(preview.mode, 'scripted');
      assert.equal(preview.isCurrent, true);
      assert.equal(preview.candidate, null);
      assert.equal(Object.hasOwn(raw, 'input'), false);
      assert.equal(Object.hasOwn(raw, 'attemptId'), false);
      assert.deepEqual(await (await submit()).json(), preview);
      const notices = await database.db.$client.query(
        'SELECT * FROM outbox WHERE id = $1',
        [id],
      );
      assert.equal(notices.rowCount, 1);
      assert.equal(notices.rows[0].operation_id, id);
      const outbox = createOutbox(database);
      const claims = await Promise.all([
        outbox.claim([scriptedOpeningTopic]),
        outbox.claim([scriptedOpeningTopic]),
      ]);
      assert.equal(
        claims.filter(Boolean).length,
        1,
        'concurrent relays do not share an active lease',
      );
      const abandoned = requireDefined(
        claims.find(Boolean),
        'Expected one leased outbox notice',
      );
      await database.db.$client.query(
        "UPDATE outbox SET available_at = now() - interval '1 second' WHERE id = $1",
        [id],
      );
      const reclaimed = requireDefined(
        await outbox.claim([scriptedOpeningTopic]),
        'Expected reclaim after lease expiry',
      );
      assert.notEqual(reclaimed.leaseId, abandoned.leaseId);
      await outbox.acknowledge(abandoned);
      assert.equal(
        (
          await database.db.$client.query(
            'SELECT delivered_at FROM outbox WHERE id = $1',
            [id],
          )
        ).rows[0].delivered_at,
        null,
        'old lease cannot acknowledge a new delivery',
      );
      await database.db.$client.query(
        'UPDATE outbox SET available_at = now() WHERE id = $1',
        [id],
      );
      const config = {
        address: process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233',
        namespace: 'default',
        taskQueue: `integration-${randomUUID()}`,
      };
      let runtime = await startRuntime(database, config, () => {});
      try {
        for (let n = 0; n < 100; n++) {
          const latest = requireDefined(
            latestOpeningSchema.parse(
              await (
                await fetch(`${url}/latest`, { headers: { cookie } })
              ).json(),
            ).preview,
            'Expected opening preview while waiting for completion',
          );
          preview = latest;
          if (latest.state === 'succeeded') {
            break;
          }
          await delay(100);
        }
        assert.equal(
          preview.state,
          'succeeded',
          'saved request completes without another PUT',
        );
        assert.deepEqual(preview.candidate, scriptedOpeningPresentation);
        const publicBody = JSON.stringify(preview);
        assert.equal(publicBody.includes('intention'), false);
        assert.equal(publicBody.includes('"system"'), false);
        if (scriptedPlayableOpening.next.kind !== 'choice') {
          throw new Error('Expected a choice fixture');
        }
        for (const option of scriptedPlayableOpening.next.options) {
          assert.equal(publicBody.includes(option.intention), false);
        }
        const stored = await database.db.$client.query(
          'SELECT input, output FROM generation WHERE id = $1 AND owner_id = $2',
          [id, owner],
        );
        const storedInput = stored.rows[0].input;
        const storedOutput = stored.rows[0].output;
        assert.equal(storedInput.task, 'opening');
        assert.equal(storedInput.promptVersion, 'playable.v1');
        assert.equal(storedOutput.next.kind, 'choice');
        assert.deepEqual(
          storedOutput.next.options.map(
            (option: { intention: string }) => option.intention,
          ),
          scriptedPlayableOpening.next.options.map(
            (option) => option.intention,
          ),
        );
      } finally {
        await runtime.stop();
      }
      const saved = await database.db.$client.query(
        'SELECT updated_at FROM generation WHERE id = $1 AND owner_id = $2',
        [id, owner],
      );
      await Promise.all([
        createScriptedOpenings(database).complete(id),
        createScriptedOpenings(database).complete(id),
      ]);
      assert.deepEqual(
        (
          await database.db.$client.query(
            'SELECT updated_at FROM generation WHERE id = $1',
            [id],
          )
        ).rows,
        saved.rows,
        'repeated Activity completion preserves the committed result',
      );
      // Simulate lost relay acknowledgement after execution. A fresh worker and
      // relay must observe the existing workflow/result rather than generate again.
      await database.db.$client.query(
        'UPDATE outbox SET delivered_at = NULL, lease_id = NULL, available_at = now() WHERE id = $1',
        [id],
      );
      runtime = await startRuntime(database, config, () => {});
      try {
        let delivered = false;
        for (let n = 0; n < 100; n++) {
          delivered = Boolean(
            (
              await database.db.$client.query(
                'SELECT delivered_at FROM outbox WHERE id = $1',
                [id],
              )
            ).rows[0].delivered_at,
          );
          if (delivered) {
            break;
          }
          await delay(100);
        }
        assert.ok(delivered, 'restarted relay acknowledges duplicate start');
        assert.deepEqual(
          (
            await database.db.$client.query(
              'SELECT updated_at FROM generation WHERE id = $1',
              [id],
            )
          ).rows,
          saved.rows,
        );
      } finally {
        await runtime.stop();
      }
      assert.deepEqual(await (await submit()).json(), preview);
      const latest = latestOpeningSchema.parse(
        await (await fetch(`${url}/latest`, { headers: { cookie } })).json(),
      );
      assert.deepEqual(latest.preview, preview);
      const conflictingId = randomUUID();
      await database.db.$client.query(
        'INSERT INTO outbox (id, topic, operation_id) VALUES ($1, $2, $3)',
        [conflictingId, 'different.v1', randomUUID()],
      );
      try {
        const rejected = await fetch(`${url}/${conflictingId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ expectedRevision: 1 }),
        });
        assert.equal(rejected.status, 503);
        assert.equal(
          (
            await database.db.$client.query(
              'SELECT id FROM generation WHERE id = $1',
              [conflictingId],
            )
          ).rowCount,
          0,
          'notice conflict rolls back generation admission',
        );
        assert.equal(
          latestOpeningSchema.parse(
            await (
              await fetch(`${url}/latest`, { headers: { cookie } })
            ).json(),
          ).preview?.id,
          id,
        );
      } finally {
        await database.db.$client.query('DELETE FROM outbox WHERE id = $1', [
          conflictingId,
        ]);
      }
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
      assert.deepEqual(old.candidate, preview.candidate);
    },
  );
}
