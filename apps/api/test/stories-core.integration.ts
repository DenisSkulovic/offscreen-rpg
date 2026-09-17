import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { TestContext } from 'node:test';
import {
  storyHistorySchema,
  storySnapshotSchema,
} from '@offscreen/contracts/stories';
import type { Database } from '@offscreen/db';
import { createStories, StoryError } from '@offscreen/server/stories';
import { requireDefined } from './helpers/require.js';

type StoryCoreArgs = {
  t: TestContext;
  database: Database;
  owner: string;
  origin: string;
  cookie: string;
  otherCookie: string;
};

export async function checkStoryCore({
  t,
  database,
  owner,
  origin,
  cookie,
  otherCookie,
}: StoryCoreArgs) {
  await t.test(
    'item transfers commit with prose, retry safely and roll back failed effects',
    async () => {
      const stories = createStories(database);
      const id = randomUUID();
      const initial = {
        source: 'items-test.v1',
        content: {
          version: 1,
          title: 'Parcel',
          paragraphs: ['A parcel waits.'],
        },
        interaction: null,
        items: [{ key: 'parcel', label: 'Sealed parcel', holderKey: 'sender' }],
      };
      const first = await stories.initialize(owner, id, initial);
      const content = {
        version: 1,
        title: 'Delivered',
        paragraphs: ['The receiver has the parcel.'],
      };
      const transfer = {
        kind: 'item.transfer.v1',
        itemKey: 'parcel',
        fromHolder: 'sender',
        toHolder: 'receiver',
      };
      const proposal = {
        expectedRevision: 1,
        content,
        interaction: null,
        effects: [transfer],
      };
      const operation = randomUUID();
      const results = await Promise.all([
        stories.append(owner, id, operation, proposal),
        stories.append(owner, id, operation, proposal),
      ]);
      const transferred = requireDefined(
        results[0]?.items[0],
        'Expected transferred item on committed snapshot',
      );
      assert.ok(
        results.every(
          (result) => result.items[0]?.holderKey === transferred.holderKey,
        ),
      );
      assert.equal(transferred.holderKey, 'receiver');
      assert.equal((await stories.history(owner, id)).items.length, 2);
      const current = await stories.read(owner, id);
      assert.deepEqual(await stories.initialize(owner, id, initial), current);
      await assert.rejects(
        stories.append(owner, id, operation, {
          ...proposal,
          effects: [{ ...transfer, toHolder: 'other' }],
        }),
        (error: unknown) =>
          error instanceof StoryError && error.code === 'conflict',
      );
      // The first effect succeeds but the second fails. Both state and prose must roll back.
      await assert.rejects(
        stories.append(owner, id, randomUUID(), {
          expectedRevision: 2,
          content,
          interaction: null,
          effects: [
            { ...transfer, fromHolder: 'receiver', toHolder: 'sender' },
            { ...transfer, itemKey: 'missing' },
          ],
        }),
        (error: unknown) =>
          error instanceof StoryError && error.code === 'conflict',
      );
      assert.deepEqual(await stories.read(owner, id), current);
      assert.equal(
        requireDefined(first.items[0], 'Expected seeded opening item')
          .holderKey,
        'sender',
      );
      const other = await stories.initialize(owner, randomUUID(), initial);
      assert.equal(
        requireDefined(other.items[0], 'Expected seeded item on other story')
          .holderKey,
        'sender',
      );
      const forbidden = await fetch(`${origin}/api/stories/${id}`, {
        headers: { cookie: otherCookie },
      });
      assert.equal(forbidden.status, 404);
    },
  );

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
        const offer = requireDefined(
          first.current.interaction,
          'Expected published decision offer',
        );
        const response = await put(id, `/responses/${randomUUID()}`, {
          expectedRevision: 1,
          submission: {
            interactionId: offer.id,
            answer: { kind: 'choice.v1', optionId: 'approach' },
          },
        });
        assert.equal(response.status, 200);
        const saved = storySnapshotSchema.parse(await response.json());
        const decision = requireDefined(
          saved.decision,
          'Expected response deadline on timed offer',
        );
        assert.equal(decision.defaultOptionId, 'leave');
        assert.equal(saved.waiting, null);
        assert.ok(!JSON.stringify(saved).includes('outcome'));
        return saved;
      }
      const onTime = await openDecision();
      const remaining = await stories.resolveDecision(onTime.current.id);
      assert.ok(remaining != null && remaining > 0);
      const onTimeOffer = requireDefined(
        onTime.current.interaction,
        'Expected open timed offer',
      );
      const request = {
        expectedRevision: 2,
        submission: {
          interactionId: onTimeOffer.id,
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
      const expiredOffer = requireDefined(
        expired.current.interaction,
        'Expected expired timed offer',
      );
      const late = {
        ...request,
        submission: {
          ...request.submission,
          interactionId: expiredOffer.id,
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
      const publishedOffer = requireDefined(
        a.current.interaction,
        'Expected published continuation offer',
      );
      const next = {
        ...proposal,
        expectedRevision: 2,
        interaction: null,
        response: {
          interactionId: publishedOffer.id,
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
      assert.deepEqual(
        requireDefined(history.items[1], 'Expected middle history entry')
          .content,
        proposal.content,
      );
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
      const startOffer = requireDefined(
        start.current.interaction,
        'Expected opening offer',
      );
      const other = await stories.initialize(owner, randomUUID(), initial);
      const otherOffer = requireDefined(
        other.current.interaction,
        'Expected other story offer',
      );
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
        interactionId: startOffer.id,
        answer: { kind: 'choice.v1', optionId: 'answer' },
      };
      for (const [submitted, code] of [
        [null, 'conflict'],
        [{ ...response, interactionId: otherOffer.id }, 'conflict'],
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
      assert.equal(
        requireDefined((await read()).items[0], 'Expected newest history item')
          .sequence,
        46,
      );
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
}
