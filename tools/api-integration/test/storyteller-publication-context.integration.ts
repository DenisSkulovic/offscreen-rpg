import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { generation } from '@offscreen/db/generation-schema';
import { story } from '@offscreen/db/story-schema';
import { createStorytellerRuntime } from '@offscreen/application/storyteller';
import { createStories } from '@offscreen/application/stories';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import { continuityNotesSchema } from '@offscreen/storyteller/context';
import type { TestContext } from 'node:test';
import { type ProfiledStoryteller, eq } from './storyteller-suite.js';
import { registerProfiledStoryteller } from './storyteller-suite.js';

// Moved unchanged from the profiled Storyteller suite.
export async function checkPublicationContext(
  t: TestContext,
  {
    database,
    ownerId,
    origin,
    cookie,
    otherCookie,
    stories,
    runtime,
    candidate,
    choose,
    first,
  }: ProfiledStoryteller,
): Promise<void> {
  await t.test(
    'captured selection, ownership, duplicate publication and distinct intentions',
    async () => {
      assert.equal(
        first.snapshot.storyteller?.id,
        'absurd-action-comedy',
      );
      const response = await fetch(
        `${origin}/api/stories/${first.storyId}`,
        { headers: { cookie: otherCookie } },
      );
      assert.equal(response.status, 404);
      const asked = await choose(first.storyId, 'ask');
      assert.match(
        asked.snapshot.current.content.paragraphs.join(' '),
        /not promised/,
      );
      await runtime.complete(asked.operationId);
      await stories.admitResolution({
        ownerId,
        storyId: first.storyId,
        operationId: asked.operationId,
        body: asked.body,
      });
      assert.equal(
        (await stories.read({ ownerId, storyId: first.storyId }))
          .revision,
        2,
      );
      const second = await candidate();
      const quiet = await choose(second.storyId, 'quiet');
      assert.match(
        quiet.snapshot.current.content.paragraphs.join(' '),
        /calm moment/,
      );
      assert.notDeepEqual(
        asked.snapshot.current.content,
        quiet.snapshot.current.content,
      );
      assert.equal(
        JSON.stringify(asked.snapshot).includes('currentNotes'),
        false,
      );
      assert.equal(
        JSON.stringify(asked.snapshot).includes('taskGuidance'),
        false,
      );
    },
  );
  await t.test(
    'memory outlives recent window, timed arrival uses same source and notes',
    async () => {
      for (let i = 0; i < 7; i++) {
        await choose(first.storyId, 'quiet');
      }
      const journey = await choose(first.storyId, 'leave');
      assert.ok(journey.snapshot.waiting);
      const [record] = await database.db
        .select()
        .from(generation)
        .where(eq(generation.id, journey.operationId));
      assert.ok(record);
      const task = storytellerTaskSchema.parse(record.input);
      assert.ok(
        task.context.notes.some((note) => note.key === 'gary-promise'),
      );
      assert.ok(
        task.context.evidence.some((passage) => passage.sequence === 2),
      );
      await delay(1100);
      const operations = createStories(database);
      await operations.advanceInterval({
        intervalId: journey.snapshot.current.id,
      });
      await operations.advanceInterval({
        intervalId: journey.snapshot.current.id,
      });
      const arrived = await stories.read({
        ownerId,
        storyId: first.storyId,
      });
      assert.match(
        arrived.current.content.paragraphs.join(' '),
        /delivery.*remains unexplained/i,
      );
      assert.equal(arrived.revision, journey.snapshot.revision + 1);
      await choose(first.storyId, 'return');
      const [saved] = await database.db
        .select()
        .from(story)
        .where(eq(story.id, first.storyId));
      assert.ok(saved);
      assert.ok(
        continuityNotesSchema
          .parse(saved.continuityNotes)
          .some((note) => note.key === 'gary-promise'),
      );
    },
  );
  await t.test(
    'saved output survives publication failure and arrival notes wait for arrival',
    async () => {
      const fresh = await candidate();
      assert.ok(fresh.snapshot.current.interaction);
      const operationId = randomUUID();
      await stories.admitResolution({
        ownerId,
        storyId: fresh.storyId,
        operationId,
        body: {
          expectedRevision: 1,
          submission: {
            interactionId: fresh.snapshot.current.interaction.id,
            answer: { kind: 'choice.v1', optionId: 'leave' },
          },
        },
      });
      let sourceCalls = 0;
      const source = (
        task: Parameters<typeof scriptedStorytellerResult>[0],
      ) => {
        sourceCalls++;
        return {
          ...scriptedStorytellerResult(task),
          arrivalNotes: [
            {
              kind: 'create',
              key: 'arrived',
              text: 'The character reached work.',
              evidence: ['arrival'],
            },
          ],
        };
      };
      await createStorytellerRuntime(database, {
        scriptedSource: source,
        realDurationMs: () => 100,
      }).complete(operationId);
      const blocked = await stories.read({
        ownerId,
        storyId: fresh.storyId,
      });
      assert.equal(blocked.revision, 1);
      assert.equal(blocked.resolution?.reason, 'publication_blocked');
      await createStories(database).retryResolution({
        ownerId,
        storyId: fresh.storyId,
        retryId: randomUUID(),
      });
      await createStorytellerRuntime(database, {
        scriptedSource: source,
        realDurationMs: () => 1000,
      }).complete(operationId);
      assert.equal(sourceCalls, 1);
      const departed = await stories.read({
        ownerId,
        storyId: fresh.storyId,
      });
      assert.equal(departed.revision, 2);
      const [beforeArrival] = await database.db
        .select()
        .from(story)
        .where(eq(story.id, fresh.storyId));
      assert.equal(
        continuityNotesSchema
          .parse(beforeArrival?.continuityNotes)
          .some((note) => note.key === 'arrived'),
        false,
      );
      await delay(1100);
      await createStories(database).advanceInterval({
        intervalId: departed.current.id,
      });
      const arrived = await stories.read({
        ownerId,
        storyId: fresh.storyId,
      });
      const [afterArrival] = await database.db
        .select()
        .from(story)
        .where(eq(story.id, fresh.storyId));
      const note = continuityNotesSchema
        .parse(afterArrival?.continuityNotes)
        .find((note) => note.key === 'arrived');
      assert.deepEqual(note?.sources, [arrived.current.id]);
    },
  );
  await t.test(
    'malformed source fails without publication; explicit recovery reuses intention',
    async () => {
      const fresh = await candidate('quiet-eerie-mystery');
      const operationId = randomUUID();
      assert.ok(fresh.snapshot.current.interaction);
      await stories.admitResolution({
        ownerId,
        storyId: fresh.storyId,
        operationId,
        body: {
          expectedRevision: 1,
          submission: {
            interactionId: fresh.snapshot.current.interaction.id,
            answer: { kind: 'choice.v1', optionId: 'ask' },
          },
        },
      });
      await createStorytellerRuntime(database, {
        scriptedSource: () => ({ invalid: true }),
      }).complete(operationId);
      const failed = await stories.read({
        ownerId,
        storyId: fresh.storyId,
      });
      assert.equal(failed.resolution?.state, 'failed');
      assert.deepEqual(failed.resolution?.blocker, {
        kind: 'generation',
        recovery: 'retry',
      });
      assert.equal(failed.resolution?.canRetry, true);
      assert.equal(failed.revision, 1);
      const retryId = randomUUID();
      await stories.retryResolution({
        ownerId,
        storyId: fresh.storyId,
        retryId,
      });
      await stories.retryResolution({
        ownerId,
        storyId: fresh.storyId,
        retryId,
      });
      await runtime.complete(operationId);
      assert.equal(
        (await stories.read({ ownerId, storyId: fresh.storyId }))
          .revision,
        2,
      );
    },
  );
}

registerProfiledStoryteller(
  import.meta.url,
  'publication context and recovery',
  checkPublicationContext,
  {
    executionMode: 'manual',
    distributedLive: process.env['STORYTELLER_DISTRIBUTED_V1'] === 'true',
  },
);
