import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { TestContext } from 'node:test';
import {
  storyHistorySchema,
  storySnapshotSchema,
} from '@offscreen/contracts/stories';
import { listChamberScenarios } from '@offscreen/contracts/chamber';
import type { Database } from '@offscreen/db';
import type { ReadCache } from '@offscreen/application/cache';
import { createStories, StoryError } from '@offscreen/application/stories';
import {
  createChamber,
  listChamberScenarios as listServerScenarios,
} from '@offscreen/application/developer-tools';
import { requireDefined } from './helpers/require.js';
import { registerStoryConcern } from './helpers/story-suite.js';

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
    'story snapshot cache is owner checked, version addressed and disposable',
    async () => {
      const values = new Map<string, unknown>();
      const reads: string[] = [];
      const writes: string[] = [];
      const incidents: string[] = [];
      const cache: ReadCache = {
        async get(key) {
          reads.push(key);
          return values.get(key) ?? null;
        },
        async set(key, value) {
          writes.push(key);
          values.set(key, value);
        },
      };
      const chamber = createChamber(database, {
        cache,
        onCacheIncident: ({ operation }) => incidents.push(operation),
      });
      const storyId = randomUUID();
      await chamber.start({ ownerId: owner, storyId });
      reads.length = 0;
      writes.length = 0;

      const first = await chamber.read({ ownerId: owner, storyId });
      const second = await chamber.read({ ownerId: owner, storyId });
      assert.deepEqual(second, first);
      assert.equal(reads.length, 2);
      assert.equal(writes.length, 0, 'the Start response populated the cache');

      await database.db.$client.query(
        'UPDATE story SET view_version = view_version + 1 WHERE id = $1',
        [storyId],
      );
      const changed = await chamber.read({ ownerId: owner, storyId });
      assert.equal(changed.viewVersion, first.viewVersion + 1);
      assert.equal(writes.length, 1, 'a new identity builds a new cache entry');

      const currentKey = writes.at(-1);
      assert.ok(currentKey);
      values.set(currentKey, { malformed: true });
      const recovered = await chamber.read({ ownerId: owner, storyId });
      assert.equal(recovered.viewVersion, changed.viewVersion);
      assert.deepEqual(incidents, ['get']);

      const readsBeforeUnauthorized = reads.length;
      await assert.rejects(
        chamber.read({ ownerId: 'not-the-owner', storyId }),
        (error: unknown) =>
          error instanceof StoryError && error.code === 'not_found',
      );
      assert.equal(reads.length, readsBeforeUnauthorized);
    },
  );

  await t.test(
    'chamber catalog metadata maps to fixtures and inspector reads committed state',
    async () => {
      const catalog = listChamberScenarios();
      assert.deepEqual(
        listServerScenarios().map((entry) => entry.id),
        catalog.map((entry) => entry.id),
      );
      const chamber = createChamber(database);
      for (const entry of catalog) {
        assert.ok(entry.name);
        assert.ok(entry.description);
        assert.ok(entry.exercises.length > 0);
        const started = await chamber.start({
          ownerId: owner,
          storyId: randomUUID(),
          scenario: entry.id,
        });
        const inspection = await chamber.inspect({
          ownerId: owner,
          storyId: started.id,
        });
        assert.equal(inspection.story.source, entry.id);
        assert.equal(inspection.story.revision, started.revision);
        assert.equal(inspection.story.viewVersion, started.viewVersion);
        assert.ok(
          inspection.recentHistory.length <= 20 &&
            inspection.recentHistory.length >= 1,
        );
      }
      const timedId = randomUUID();
      await chamber.start({
        ownerId: owner,
        storyId: timedId,
        scenario: 'chamber.v3',
      });
      const timedOpening = await chamber.read({
        ownerId: owner,
        storyId: timedId,
      });
      const visit = requireDefined(
        timedOpening.current.interaction,
        'Expected courtyard opening offer',
      );
      await chamber.respond({
        ownerId: owner,
        storyId: timedId,
        operationId: randomUUID(),
        body: {
          expectedRevision: 1,
          submission: {
            interactionId: visit.id,
            answer: { kind: 'choice.v1', optionId: 'visit' },
          },
        },
      });
      const waiting = await chamber.inspect({
        ownerId: owner,
        storyId: timedId,
      });
      assert.ok(waiting.timing.waitPlan);
      assert.equal(waiting.timing.remainingMs, null);
      assert.ok(waiting.timing.dueAt);
      const letterId = randomUUID();
      await chamber.start({
        ownerId: owner,
        storyId: letterId,
        scenario: 'chamber.v5',
      });
      const letterOpening = await chamber.read({
        ownerId: owner,
        storyId: letterId,
      });
      const letterOffer = requireDefined(
        letterOpening.current.interaction,
        'Expected letter opening offer',
      );
      await chamber.respond({
        ownerId: owner,
        storyId: letterId,
        operationId: randomUUID(),
        body: {
          expectedRevision: 1,
          submission: {
            interactionId: letterOffer.id,
            answer: { kind: 'choice.v1', optionId: 'deliver' },
          },
        },
      });
      const delivered = await chamber.inspect({
        ownerId: owner,
        storyId: letterId,
      });
      assert.equal(delivered.items[0]?.holderKey, 'caretaker');
      assert.equal(delivered.recentHistory.length, 2);
      assert.equal(delivered.recentHistory[0]?.hasEffect, true);
      await assert.rejects(
        chamber.inspect({ ownerId: randomUUID(), storyId: letterId }),
        (error: unknown) =>
          error instanceof StoryError && error.code === 'not_found',
      );
    },
  );

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
      const first = await stories.initialize({
        ownerId: owner,
        storyId: id,
        initial,
      });
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
        stories.append({
          ownerId: owner,
          storyId: id,
          transitionId: operation,
          proposed: proposal,
        }),
        stories.append({
          ownerId: owner,
          storyId: id,
          transitionId: operation,
          proposed: proposal,
        }),
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
      assert.equal(
        (await stories.history({ ownerId: owner, storyId: id })).items.length,
        2,
      );
      const current = await stories.read({ ownerId: owner, storyId: id });
      assert.deepEqual(
        await stories.initialize({ ownerId: owner, storyId: id, initial }),
        current,
      );
      await assert.rejects(
        stories.append({
          ownerId: owner,
          storyId: id,
          transitionId: operation,
          proposed: {
            ...proposal,
            effects: [{ ...transfer, toHolder: 'other' }],
          },
        }),
        (error: unknown) =>
          error instanceof StoryError && error.code === 'conflict',
      );
      // The first effect succeeds but the second fails. Both state and prose must roll back.
      await assert.rejects(
        stories.append({
          ownerId: owner,
          storyId: id,
          transitionId: randomUUID(),
          proposed: {
            expectedRevision: 2,
            content,
            interaction: null,
            effects: [
              { ...transfer, fromHolder: 'receiver', toHolder: 'sender' },
              { ...transfer, itemKey: 'missing' },
            ],
          },
        }),
        (error: unknown) =>
          error instanceof StoryError && error.code === 'conflict',
      );
      assert.deepEqual(
        await stories.read({ ownerId: owner, storyId: id }),
        current,
      );
      assert.equal(
        requireDefined(first.items[0], 'Expected seeded opening item')
          .holderKey,
        'sender',
      );
      const other = await stories.initialize({
        ownerId: owner,
        storyId: randomUUID(),
        initial,
      });
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
      const remaining = await stories.resolveDecision({
        passageId: onTime.current.id,
      });
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
      assert.equal(
        await stories.resolveDecision({ passageId: onTime.current.id }),
        null,
      );
      assert.equal(
        (await stories.read({ ownerId: owner, storyId: onTime.id })).current
          .content.title,
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
        stories.resolveDecision({ passageId: expired.current.id }),
        stories.resolveDecision({ passageId: expired.current.id }),
      ]);
      assert.equal(results[0].status, 409);
      assert.equal(results[1], null);
      assert.equal(results[2], null);
      const final = await stories.read({
        ownerId: owner,
        storyId: expired.id,
      });
      assert.equal(final.revision, 3);
      assert.equal(final.decision, null);
      assert.equal(final.current.content.title, 'A quiet departure.');
      const provenance = await database.db.$client.query(
        'SELECT response_source FROM story_passage WHERE id = $1',
        [final.current.id],
      );
      assert.equal(provenance.rows[0].response_source, 'default');
      assert.equal(
        (await stories.history({ ownerId: owner, storyId: expired.id })).items
          .length,
        3,
      );
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
      await stories.initialize({
        ownerId: owner,
        storyId: id,
        initial: opening,
      });
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
        stories.append({
          ownerId: owner,
          storyId: id,
          transitionId,
          proposed: proposal,
        }),
        stories.append({
          ownerId: owner,
          storyId: id,
          transitionId,
          proposed: proposal,
        }),
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
        stories.append({
          ownerId: owner,
          storyId: id,
          transitionId: randomUUID(),
          proposed: next,
        }),
        stories.append({
          ownerId: owner,
          storyId: id,
          transitionId: randomUUID(),
          proposed: next,
        }),
      ]);
      assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
      const loser = race.find((r) => r.status === 'rejected');
      assert.ok(
        loser?.status === 'rejected' &&
          loser.reason instanceof StoryError &&
          loser.reason.code === 'conflict',
      );
      const current = await stories.read({ ownerId: owner, storyId: id });
      assert.equal(current.revision, 3);
      assert.deepEqual(
        await createStories(database).append({
          ownerId: owner,
          storyId: id,
          transitionId,
          proposed: proposal,
        }),
        current,
      );
      assert.deepEqual(
        await stories.initialize({
          ownerId: owner,
          storyId: id,
          initial: opening,
        }),
        current,
      );
      const rejects = async (
        actor: string,
        key: string,
        body: unknown,
        code: string,
      ) => {
        await assert.rejects(
          stories.append({
            ownerId: actor,
            storyId: id,
            transitionId: key,
            proposed: body,
          }),
          (error: unknown) =>
            error instanceof StoryError && error.code === code,
        );
        assert.deepEqual(
          await stories.read({ ownerId: owner, storyId: id }),
          current,
        );
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
      const history = await stories.history({ ownerId: owner, storyId: id });
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
      const start = await stories.initialize({
        ownerId: owner,
        storyId: id,
        initial,
      });
      const startOffer = requireDefined(
        start.current.interaction,
        'Expected opening offer',
      );
      const other = await stories.initialize({
        ownerId: owner,
        storyId: randomUUID(),
        initial,
      });
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
          stories.append({
            ownerId: owner,
            storyId: id,
            transitionId: randomUUID(),
            proposed: {
              ...proposal,
              response: submitted,
            },
          }),
          (error: unknown) =>
            error instanceof StoryError && error.code === code,
        );
        assert.deepEqual(
          await stories.read({ ownerId: owner, storyId: id }),
          start,
        );
      }
      const key = randomUUID();
      const accepted = { ...proposal, response };
      const saved = await stories.append({
        ownerId: owner,
        storyId: id,
        transitionId: key,
        proposed: accepted,
      });
      assert.equal(saved.revision, 2);
      assert.deepEqual(
        await createStories(database).append({
          ownerId: owner,
          storyId: id,
          transitionId: key,
          proposed: accepted,
        }),
        saved,
      );
      const recorded = await database.db.$client.query(
        'SELECT response FROM story_passage WHERE story_id = $1 AND transition_id = $2',
        [id, key],
      );
      assert.deepEqual(recorded.rows[0].response, response);
      await assert.rejects(
        stories.append({
          ownerId: owner,
          storyId: id,
          transitionId: key,
          proposed: {
            ...accepted,
            response: {
              ...response,
              answer: { kind: 'choice.v1', optionId: 'wait' },
            },
          },
        }),
        (error: unknown) =>
          error instanceof StoryError && error.code === 'conflict',
      );
      // A stale answer cannot be attached to a later passage, even at its revision.
      await assert.rejects(
        stories.append({
          ownerId: owner,
          storyId: id,
          transitionId: randomUUID(),
          proposed: {
            ...accepted,
            expectedRevision: 2,
          },
        }),
        (error: unknown) =>
          error instanceof StoryError && error.code === 'conflict',
      );
      assert.deepEqual(
        await stories.read({ ownerId: owner, storyId: id }),
        saved,
      );
      assert.equal(
        (await stories.history({ ownerId: owner, storyId: id })).items.length,
        2,
      );
    },
  );

  await t.test(
    'history pages remain ordered as new passages arrive and never expose another owner',
    async () => {
      const id = randomUUID();
      const stories = createStories(database);
      await stories.initialize({
        ownerId: owner,
        storyId: id,
        initial: {
          source: 'history-test.v1',
          content: {
            version: 1,
            title: 'Beginning',
            paragraphs: ['Quiet morning.'],
          },
          interaction: null,
        },
      });
      async function append(from: number, to: number) {
        for (let sequence = from; sequence <= to; sequence++) {
          await stories.append({
            ownerId: owner,
            storyId: id,
            transitionId: randomUUID(),
            proposed: {
              expectedRevision: sequence - 1,
              content: {
                version: 1,
                title: `Passage ${sequence}`,
                paragraphs: ['An ordinary day.'],
              },
              interaction: null,
            },
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

registerStoryConcern(import.meta.url, 'story core integration', checkStoryCore);
