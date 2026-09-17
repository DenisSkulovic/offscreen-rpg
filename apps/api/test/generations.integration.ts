import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { TestContext } from 'node:test';
import type { Database } from '@offscreen/db';
import { createDrafts } from '@offscreen/server/drafts';
import { createOpenings } from '@offscreen/server/openings';
import {
  createGenerations,
  GenerationError,
} from '@offscreen/server/generations';
import { z } from 'zod';
import { requireDefined } from './helpers/require.js';

function playableOutput(title: string) {
  return {
    version: 1 as const,
    content: {
      version: 1 as const,
      title,
      paragraphs: ['The surrounding air is still.'],
    },
    next: {
      kind: 'choice' as const,
      prompt: 'What do you attempt?',
      options: [
        {
          id: 'wait',
          label: 'Wait',
          intention: 'Remain still and observe.',
        },
        {
          id: 'move',
          label: 'Move closer',
          intention: 'Approach the nearest notable feature.',
        },
      ],
    },
  };
}

export async function checkGenerations(
  t: TestContext,
  database: Database,
  owner: string,
  stranger: string,
) {
  const drafts = createDrafts(database);
  const openings = createOpenings(database);
  const content = {
    title: '',
    premise: 'A bird lives in an abandoned orbital station.',
    storytellingDirection: 'Quiet and strange.',
  };
  const draftId = randomUUID();
  const id = randomUUID();
  await drafts.save(owner, draftId, { ...content, expectedRevision: 0 });
  const code = (expected: GenerationError['code']) => (error: unknown) =>
    error instanceof GenerationError && error.code === expected;

  await t.test(
    'admission retries keep one captured input, including after editing the draft',
    async () => {
      const [first, duplicate] = await Promise.all([
        openings.request(owner, draftId, id, 1),
        openings.request(owner, draftId, id, 1),
      ]);
      assert.deepEqual(first, duplicate);
      assert.equal(first.state, 'pending');
      assert.equal(
        (await createOpenings(database).latest(owner, draftId))?.id,
        id,
      );
      assert.equal(first.isCurrent, true);
      await drafts.save(owner, draftId, {
        ...content,
        premise: 'A fish instead.',
        expectedRevision: 1,
      });
      const retried = await openings.request(owner, draftId, id, 1);
      assert.equal(retried.isCurrent, false);
      assert.deepEqual(retried.input, first.input);
      assert.equal(
        JSON.parse(retried.input.request.messages[1].content).premise.premise,
        content.premise,
      );
      await assert.rejects(
        openings.request(owner, draftId, id, 2),
        code('conflict'),
      );
      await assert.rejects(
        openings.request(owner, draftId, randomUUID(), 2),
        code('busy'),
      );
    },
  );
  await t.test(
    'one worker claims; restart and duplicate delivery do not rerun the fake generator',
    async () => {
      const attempts = [randomUUID(), randomUUID()];
      const claims = await Promise.all(
        attempts.map((attempt) => openings.claim(owner, id, attempt)),
      );
      assert.equal(claims.filter((claim) => claim.claimed).length, 1);
      const attempt = requireDefined(
        attempts[claims.findIndex((claim) => claim.claimed)],
        'Expected one successful claim attempt',
      );
      let calls = 0;
      const fake = () => {
        calls++;
        return playableOutput('The bird wakes');
      };
      const results = claims.filter((claim) => claim.claimed).map(() => fake());
      const result = requireDefined(
        results[0],
        'Expected fake generation output',
      );
      const restarted = createOpenings(database);
      const retryClaim = await restarted.claim(owner, id, attempt);
      if (retryClaim.claimed) {
        fake();
      }
      assert.equal(retryClaim.claimed, false);
      assert.equal((await restarted.read(owner, id)).attemptId, attempt);
      const saved = await restarted.settle(owner, id, attempt, {
        state: 'succeeded',
        output: result,
      });
      assert.deepEqual(
        await restarted.settle(owner, id, attempt, {
          state: 'succeeded',
          output: result,
        }),
        saved,
      );
      assert.equal(calls, 1);
      assert.equal((await restarted.read(owner, id)).isCurrent, false);
      await assert.rejects(
        restarted.settle(owner, id, attempt, {
          state: 'succeeded',
          output: playableOutput('A different result'),
        }),
        code('conflict'),
      );
    },
  );
  await t.test(
    'new generation replaces preview eligibility without deleting earlier results',
    async () => {
      const next = randomUUID();
      const pending = await openings.request(owner, draftId, next, 2);
      assert.equal(pending.isCurrent, true);
      assert.equal(
        (await openings.read(owner, id)).output?.content.title,
        'The bird wakes',
      );
      assert.equal((await openings.read(owner, id)).isCurrent, false);
      const attempt = randomUUID();
      await openings.claim(owner, next, attempt);
      await openings.settle(owner, next, attempt, { state: 'uncertain' });
      assert.equal(
        (await createOpenings(database).claim(owner, next, randomUUID()))
          .claimed,
        false,
      );
      await assert.rejects(
        openings.request(owner, draftId, randomUUID(), 2),
        code('busy'),
      );
      await assert.rejects(
        openings.settle(owner, next, randomUUID(), {
          state: 'failed',
          failureCode: 'provider_failed',
        }),
        code('conflict'),
      );
      await openings.settle(owner, next, attempt, {
        state: 'succeeded',
        output: playableOutput('The fish finds a warm current.'),
      });
      assert.equal((await openings.read(owner, next)).state, 'succeeded');
      // A delayed timeout handler cannot overwrite a reconciled success.
      await assert.rejects(
        openings.settle(owner, next, attempt, { state: 'uncertain' }),
        code('conflict'),
      );
    },
  );
  await t.test(
    'invalid output cannot be saved as success; failure remains readable',
    async () => {
      const failed = randomUUID();
      await openings.request(owner, draftId, failed, 2);
      const attempt = randomUUID();
      await openings.claim(owner, failed, attempt);
      await assert.rejects(
        openings.settle(owner, failed, attempt, {
          state: 'succeeded',
          output: {
            version: 1 as const,
            content: {
              version: 1 as const,
              title: '',
              paragraphs: ['Still.'],
            },
            next: { kind: 'end' as const },
          },
        }),
        code('invalid'),
      );
      assert.equal((await openings.read(owner, failed)).state, 'running');
      await openings.settle(owner, failed, attempt, {
        state: 'failed',
        failureCode: 'invalid_output',
      });
      assert.equal(
        (await createOpenings(database).read(owner, failed)).failureCode,
        'invalid_output',
      );
    },
  );
  await t.test(
    'operations enforce ownership and request identity at every boundary',
    async () => {
      await assert.rejects(openings.read(stranger, id), code('not_found'));
      await assert.rejects(
        openings.latest(stranger, draftId),
        code('not_found'),
      );
      await assert.rejects(
        openings.claim(stranger, id, randomUUID()),
        code('not_found'),
      );
      await assert.rejects(
        openings.settle(stranger, id, randomUUID(), { state: 'uncertain' }),
        code('not_found'),
      );
      await assert.rejects(
        openings.request(stranger, draftId, id, 1),
        code('not_found'),
      );
      const otherDraft = randomUUID();
      await drafts.save(owner, otherDraft, { ...content, expectedRevision: 0 });
      assert.equal(await openings.latest(owner, otherDraft), null);
      await assert.rejects(
        openings.request(owner, otherDraft, id, 1),
        code('conflict'),
      );
    },
  );
  await t.test(
    'the lifecycle supports another payload without opening-specific fields',
    async () => {
      const store = createGenerations(database, {
        kind: 'test.summary.v1',
        input: z.strictObject({ text: z.string() }),
        output: z.strictObject({ summary: z.string() }),
      });
      const key = randomUUID();
      const input = { text: 'Several things happened.' };
      await database.db.transaction((tx) =>
        store.insert(tx, owner, key, input),
      );
      await database.db.transaction((tx) =>
        store.insert(tx, owner, key, input),
      );
      await assert.rejects(
        database.db.transaction((tx) =>
          store.insert(tx, owner, key, { text: 'Changed' }),
        ),
        code('conflict'),
      );
      await assert.rejects(openings.read(owner, key), code('not_found'));
      const attempt = randomUUID();
      assert.equal((await store.claim(owner, key, attempt)).claimed, true);
      await store.settle(owner, key, attempt, {
        state: 'succeeded',
        output: { summary: 'A short recap.' },
      });
      assert.deepEqual((await store.read(owner, key)).output, {
        summary: 'A short recap.',
      });
      await assert.rejects(
        database.db.$client.query(
          'UPDATE generation SET state = $1 WHERE id = $2',
          ['pending', key],
        ),
      );
      assert.equal((await store.read(owner, key)).state, 'succeeded');
      const rolledBack = randomUUID();
      await assert.rejects(
        database.db.transaction(async (tx) => {
          await store.insert(tx, owner, rolledBack, input);
          throw new Error('Later admission work failed');
        }),
      );
      await assert.rejects(store.read(owner, rolledBack), code('not_found'));
    },
  );
}
