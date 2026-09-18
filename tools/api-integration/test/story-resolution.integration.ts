import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { TestContext } from 'node:test';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import type { Database } from '@offscreen/db';
import { createChamber } from '@offscreen/application/developer-tools';
import {
  createScriptedContinuations,
  scriptedGeneratedIntervalRealMs,
  scriptedImmediateContinuation,
  scriptedPlayableContinuation,
  scriptedTimedContinuation,
  storyContinuationFromGeneratedResult,
} from '@offscreen/application/generations';
import {
  scriptedOpeningPresentation,
  scriptedPlayableOpening,
} from '@offscreen/application/generations';
import { createStories, StoryError } from '@offscreen/application/stories';
import { withBrowserSession } from './helpers/browser-session.js';
import { requireDefined } from './helpers/require.js';
import { registerStoryConcern } from './helpers/story-suite.js';
import { prepareCurrentCandidate } from './story-start.integration.js';

type StoryResolutionArgs = {
  t: TestContext;
  database: Database;
  owner: string;
  origin: string;
  cookie: string;
  otherCookie: string;
  restartWorker: () => Promise<void>;
};

async function waitForRevision(
  origin: string,
  cookie: string,
  storyId: string,
  revision: number,
) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const snapshot = storySnapshotSchema.parse(
      await (
        await fetch(`${origin}/api/stories/${storyId}`, {
          headers: { cookie },
        })
      ).json(),
    );
    if (snapshot.revision === revision) {
      return snapshot;
    }
    await delay(100);
  }
  throw new Error(`Expected story ${storyId} to reach revision ${revision}`);
}

async function waitForTitle(
  origin: string,
  cookie: string,
  storyId: string,
  title: string,
) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const snapshot = storySnapshotSchema.parse(
      await (
        await fetch(`${origin}/api/stories/${storyId}`, {
          headers: { cookie },
        })
      ).json(),
    );
    if (snapshot.current.content.title === title) {
      return snapshot;
    }
    await delay(100);
  }
  throw new Error(`Expected story ${storyId} to show ${title}`);
}

function assertNoHiddenIntentions(body: string) {
  if (scriptedPlayableOpening.next.kind !== 'choice') {
    throw new Error('Expected a choice fixture');
  }
  for (const option of scriptedPlayableOpening.next.options) {
    assert.equal(body.includes(option.intention), false);
  }
  if (scriptedTimedContinuation.next.kind !== 'interval') {
    throw new Error('Expected a timed fixture');
  }
  const arrivalNext = scriptedTimedContinuation.next.arrival.next;
  if (arrivalNext.kind !== 'choice') {
    throw new Error('Expected an arrival choice');
  }
  for (const option of arrivalNext.options) {
    assert.equal(body.includes(option.intention), false);
  }
  for (const option of scriptedPlayableContinuation.next.kind === 'choice'
    ? scriptedPlayableContinuation.next.options
    : []) {
    assert.equal(body.includes(option.intention), false);
  }
}

export async function checkGeneratedResolution({
  t,
  database,
  owner,
  origin,
  cookie,
  otherCookie,
  restartWorker,
}: StoryResolutionArgs) {
  const headers = {
    cookie,
    origin,
    'content-type': 'application/json',
  };
  const chamber = createChamber(database);
  const continuations = createScriptedContinuations(database);

  async function startLiveStory() {
    const { candidateId, draftId } = await prepareCurrentCandidate(
      origin,
      cookie,
    );
    const storyId = randomUUID();
    const started = await fetch(`${origin}/api/stories/${storyId}/start`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        candidateId,
        expectedDraftRevision: 1,
      }),
    });
    assert.equal(started.status, 200);
    const snapshot = storySnapshotSchema.parse(await started.json());
    return { storyId, snapshot, draftId, candidateId };
  }

  await t.test(
    'immediate generated continuations still translate without a wait',
    () => {
      const proposed = storyContinuationFromGeneratedResult({
        output: scriptedImmediateContinuation,
        response: null,
        generationId: randomUUID(),
      });
      assert.equal(proposed.wait, null);
      assert.equal(proposed.interaction?.options[0]?.id, 'inspect-change');
      assert.equal(proposed.sourceGenerationPart, 'current');
      assert.equal(
        JSON.stringify(proposed.interaction).includes(
          'Look more closely at what has changed ahead.',
        ),
        false,
      );
    },
  );

  await t.test(
    'Start freezes the owned draft premise onto the story',
    async () => {
      const { storyId } = await startLiveStory();
      const stored = await database.db.$client.query(
        'SELECT premise FROM story WHERE id = $1',
        [storyId],
      );
      assert.equal(stored.rowCount, 1);
      assert.deepEqual(stored.rows[0].premise, {
        title: 'Start candidate',
        premise: 'A traveller at a locked gate.',
        storytellingDirection: 'Strange but gentle.',
      });
      const chamberStory = await chamber.start({
        ownerId: owner,
        storyId: randomUUID(),
        scenario: 'chamber.v2',
      });
      const chamberPremise = await database.db.$client.query(
        'SELECT premise FROM story WHERE id = $1',
        [chamberStory.id],
      );
      assert.equal(chamberPremise.rows[0].premise, null);
    },
  );

  await t.test(
    'generated option admission is pending, retried, and committed once',
    async () => {
      const { storyId, snapshot } = await startLiveStory();
      const offer = requireDefined(
        snapshot.current.interaction,
        'Expected generated opening offer',
      );
      const optionId = requireDefined(
        offer.specification.options[0]?.id,
        'Expected a published option',
      );
      const operationId = randomUUID();
      const body = {
        expectedRevision: 1,
        submission: {
          interactionId: offer.id,
          answer: { kind: 'choice.v1' as const, optionId },
        },
      };
      const admitted = await fetch(
        `${origin}/api/stories/${storyId}/resolutions/${operationId}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        },
      );
      assert.equal(admitted.status, 202);
      const pending = storySnapshotSchema.parse(await admitted.json());
      assert.equal(pending.revision, 1);
      assert.equal(pending.resolution?.state, 'pending');
      assert.equal(pending.canRespond, false);
      const publicBody = JSON.stringify(pending);
      assertNoHiddenIntentions(publicBody);
      const retried = await fetch(
        `${origin}/api/stories/${storyId}/resolutions/${operationId}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        },
      );
      assert.equal(retried.status, 202);
      assert.equal(
        (
          await fetch(
            `${origin}/api/stories/${storyId}/resolutions/${operationId}`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                ...body,
                submission: {
                  ...body.submission,
                  answer: {
                    kind: 'choice.v1',
                    optionId: offer.specification.options[1]?.id,
                  },
                },
              }),
            },
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await fetch(
            `${origin}/api/stories/${storyId}/resolutions/${randomUUID()}`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify(body),
            },
          )
        ).status,
        409,
      );
      const inspection = await chamber.inspect({
        ownerId: owner,
        storyId,
      });
      assert.equal(inspection.resolution?.operationId, operationId);
      assert.equal(inspection.resolution?.selectedOptionId, optionId);
      if (scriptedPlayableOpening.next.kind !== 'choice') {
        throw new Error('Expected a choice fixture');
      }
      assert.equal(
        inspection.resolution?.selectedIntention,
        scriptedPlayableOpening.next.options[0]?.intention,
      );
      await continuations.complete(operationId);
      const travelling = await waitForRevision(origin, cookie, storyId, 2);
      assert.equal(travelling.resolution, null);
      assert.equal(travelling.canRespond, false);
      assert.equal(travelling.current.interaction, null);
      assert.equal(travelling.current.content.title, 'On the road');
      assert.deepEqual(
        travelling.current.content,
        scriptedTimedContinuation.content,
      );
      const waiting = requireDefined(
        travelling.waiting,
        'Expected a persisted generated wait',
      );
      assert.equal(waiting.gameDurationMs, 600000);
      assert.equal(waiting.canControl, true);
      assert.ok(waiting.dueAt);
      assert.equal(
        Date.parse(waiting.dueAt) - Date.now() <=
          scriptedGeneratedIntervalRealMs + 2000,
        true,
      );
      assertNoHiddenIntentions(JSON.stringify(travelling));
      const stored = await database.db.$client.query(
        `SELECT source_generation_id, source_generation_part, response_source
         FROM story_passage WHERE story_id = $1 AND sequence = 2`,
        [storyId],
      );
      assert.equal(stored.rows[0].source_generation_id, operationId);
      assert.equal(stored.rows[0].source_generation_part, 'current');
      assert.equal(stored.rows[0].response_source, 'player');
      await continuations.complete(operationId);
      const unchanged = storySnapshotSchema.parse(
        await (
          await fetch(`${origin}/api/stories/${storyId}`, {
            headers: { cookie },
          })
        ).json(),
      );
      assert.equal(unchanged.revision, 2);
      assert.equal(unchanged.current.id, travelling.current.id);
      let remaining = await createStories(database).advanceInterval({
        intervalId: travelling.current.id,
      });
      if (remaining != null && remaining > 0) {
        await delay(remaining + 50);
        remaining = await createStories(database).advanceInterval({
          intervalId: travelling.current.id,
        });
      }
      assert.equal(remaining, null);
      const arrived = await waitForRevision(origin, cookie, storyId, 3);
      assert.equal(arrived.current.content.title, 'At the tavern');
      assert.equal(arrived.waiting, null);
      assert.equal(arrived.canRespond, true);
      assertNoHiddenIntentions(JSON.stringify(arrived));
      const arrivalStored = await database.db.$client.query(
        `SELECT source_generation_id, source_generation_part
         FROM story_passage WHERE story_id = $1 AND sequence = 3`,
        [storyId],
      );
      assert.equal(arrivalStored.rows[0].source_generation_id, operationId);
      assert.equal(arrivalStored.rows[0].source_generation_part, 'arrival');
      const nextOffer = requireDefined(
        arrived.current.interaction,
        'Expected a generated arrival offer',
      );
      const nextOperation = randomUUID();
      const nextAdmit = await fetch(
        `${origin}/api/stories/${storyId}/resolutions/${nextOperation}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            expectedRevision: 3,
            submission: {
              interactionId: nextOffer.id,
              answer: {
                kind: 'choice.v1',
                optionId: nextOffer.specification.options[0]?.id,
              },
            },
          }),
        },
      );
      assert.equal(nextAdmit.status, 202);
      const arrivalInspection = await chamber.inspect({
        ownerId: owner,
        storyId,
      });
      assert.equal(
        arrivalInspection.resolution?.selectedIntention,
        'Ask the bartender what this place is like tonight.',
      );
      await continuations.complete(nextOperation);
      const third = await waitForRevision(origin, cookie, storyId, 4);
      assert.equal(third.current.content.title, 'On the road');
      assert.equal(
        (
          await fetch(
            `${origin}/api/stories/${storyId}/resolutions/${randomUUID()}`,
            {
              method: 'PUT',
              headers: { ...headers, cookie: otherCookie },
              body: JSON.stringify(body),
            },
          )
        ).status,
        404,
      );
    },
  );

  await t.test(
    'missing provenance, stale revisions and late results cannot rewrite history',
    async () => {
      const { storyId, snapshot } = await startLiveStory();
      const offer = requireDefined(
        snapshot.current.interaction,
        'Expected generated opening offer',
      );
      await database.db.$client.query(
        'UPDATE story_passage SET source_generation_id = NULL WHERE story_id = $1 AND sequence = 1',
        [storyId],
      );
      assert.equal(
        (
          await fetch(
            `${origin}/api/stories/${storyId}/resolutions/${randomUUID()}`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                expectedRevision: 1,
                submission: {
                  interactionId: offer.id,
                  answer: {
                    kind: 'choice.v1',
                    optionId: offer.specification.options[0]?.id,
                  },
                },
              }),
            },
          )
        ).status,
        400,
      );
      const live = await startLiveStory();
      const liveOffer = requireDefined(
        live.snapshot.current.interaction,
        'Expected generated opening offer',
      );
      assert.equal(
        (
          await fetch(
            `${origin}/api/stories/${live.storyId}/resolutions/${randomUUID()}`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                expectedRevision: 2,
                submission: {
                  interactionId: liveOffer.id,
                  answer: {
                    kind: 'choice.v1',
                    optionId: liveOffer.specification.options[0]?.id,
                  },
                },
              }),
            },
          )
        ).status,
        409,
      );
      const stale = await startLiveStory();
      const staleOffer = requireDefined(
        stale.snapshot.current.interaction,
        'Expected generated opening offer',
      );
      const staleOperation = randomUUID();
      assert.equal(
        (
          await fetch(
            `${origin}/api/stories/${stale.storyId}/resolutions/${staleOperation}`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                expectedRevision: 1,
                submission: {
                  interactionId: staleOffer.id,
                  answer: {
                    kind: 'choice.v1',
                    optionId: staleOffer.specification.options[0]?.id,
                  },
                },
              }),
            },
          )
        ).status,
        202,
      );
      await createStories(database).append({
        ownerId: owner,
        storyId: stale.storyId,
        transitionId: randomUUID(),
        proposed: {
          expectedRevision: 1,
          response: {
            interactionId: staleOffer.id,
            answer: {
              kind: 'choice.v1',
              optionId: staleOffer.specification.options[0]?.id,
            },
          },
          content: scriptedOpeningPresentation.content,
          interaction: scriptedOpeningPresentation.interaction,
        },
      });
      await continuations.complete(staleOperation);
      const afterStale = storySnapshotSchema.parse(
        await (
          await fetch(`${origin}/api/stories/${stale.storyId}`, {
            headers: { cookie },
          })
        ).json(),
      );
      assert.equal(afterStale.revision, 2);
      const passages = await database.db.$client.query(
        'SELECT sequence, source_generation_id FROM story_passage WHERE story_id = $1 ORDER BY sequence',
        [stale.storyId],
      );
      assert.equal(passages.rowCount, 2);
      assert.equal(passages.rows[1].source_generation_id, null);
      await assert.rejects(
        () =>
          chamber.admitResolution({
            ownerId: owner,
            storyId: live.storyId,
            operationId: 'not-a-uuid',
            body: {
              expectedRevision: 1,
              submission: {
                interactionId: liveOffer.id,
                answer: {
                  kind: 'choice.v1',
                  optionId: liveOffer.specification.options[0]?.id,
                },
              },
            },
          }),
        (error) => error instanceof StoryError && error.code === 'invalid',
      );
    },
  );

  await t.test(
    'pause holds a generated wait past its original due time and resume publishes one arrival',
    async () => {
      const { storyId, snapshot } = await startLiveStory();
      const offer = requireDefined(
        snapshot.current.interaction,
        'Expected generated opening offer',
      );
      const operationId = randomUUID();
      assert.equal(
        (
          await fetch(
            `${origin}/api/stories/${storyId}/resolutions/${operationId}`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                expectedRevision: 1,
                submission: {
                  interactionId: offer.id,
                  answer: {
                    kind: 'choice.v1',
                    optionId: offer.specification.options[0]?.id,
                  },
                },
              }),
            },
          )
        ).status,
        202,
      );
      await continuations.complete(operationId);
      const travelling = await waitForRevision(origin, cookie, storyId, 2);
      const waiting = requireDefined(
        travelling.waiting,
        'Expected a generated wait',
      );
      const originalDue = requireDefined(waiting.dueAt, 'Expected due time');
      const pauseId = randomUUID();
      assert.equal(
        (
          await fetch(`${origin}/api/stories/${storyId}/controls/${pauseId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              intervalId: travelling.current.id,
              expectedControlRevision: waiting.controlRevision,
              action: 'pause',
            }),
          })
        ).status,
        200,
      );
      await delay(Math.max(0, Date.parse(originalDue) - Date.now()) + 250);
      assert.equal(
        await createStories(database).advanceInterval({
          intervalId: travelling.current.id,
        }),
        -1,
      );
      const stillWaiting = await waitForTitle(
        origin,
        cookie,
        storyId,
        'On the road',
      );
      assert.equal(stillWaiting.revision, 2);
      assert.ok(stillWaiting.waiting?.remainingMs != null);
      const resumeId = randomUUID();
      assert.equal(
        (
          await fetch(`${origin}/api/stories/${storyId}/controls/${resumeId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              intervalId: travelling.current.id,
              expectedControlRevision: stillWaiting.waiting.controlRevision,
              action: 'resume',
            }),
          })
        ).status,
        200,
      );
      const arrived = await waitForTitle(
        origin,
        cookie,
        storyId,
        'At the tavern',
      );
      assert.equal(arrived.revision, 3);
      const count = await database.db.$client.query(
        'SELECT count(*)::int AS count FROM story_passage WHERE story_id = $1',
        [storyId],
      );
      assert.equal(count.rows[0].count, 3);
    },
  );

  await t.test(
    'worker restart completes one generated continuation without duplicating it',
    async () => {
      const { storyId, snapshot } = await startLiveStory();
      const offer = requireDefined(
        snapshot.current.interaction,
        'Expected generated opening offer',
      );
      const operationId = randomUUID();
      assert.equal(
        (
          await fetch(
            `${origin}/api/stories/${storyId}/resolutions/${operationId}`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                expectedRevision: 1,
                submission: {
                  interactionId: offer.id,
                  answer: {
                    kind: 'choice.v1',
                    optionId: offer.specification.options[0]?.id,
                  },
                },
              }),
            },
          )
        ).status,
        202,
      );
      await restartWorker();
      const travelling = await waitForRevision(origin, cookie, storyId, 2);
      assert.equal(travelling.current.content.title, 'On the road');
      assert.ok(travelling.waiting);
      const count = await database.db.$client.query(
        'SELECT count(*)::int AS count FROM story_passage WHERE story_id = $1',
        [storyId],
      );
      assert.equal(count.rows[0].count, 2);
    },
  );

  await t.test(
    'browser selects a generated choice, reloads while pending, and reaches the next passage',
    async () => {
      await withBrowserSession(origin, cookie, async ({ context }) => {
        const page = await context.newPage();
        await page.goto(`${origin}/stories/new`);
        await page.getByLabel('Title').fill('Generated resolution');
        await page
          .getByLabel('Who are you')
          .fill('A traveller at a locked gate.');
        await page.getByRole('button', { name: 'Save draft' }).click();
        await page.getByText('Saved.', { exact: true }).waitFor();
        await page
          .getByRole('link', { name: 'Review opening candidate' })
          .click();
        await page
          .getByRole('button', {
            name: 'Generate opening candidate',
            exact: true,
          })
          .click();
        await page.getByRole('button', { name: 'Start story' }).waitFor();
        await page.getByRole('button', { name: 'Start story' }).click();
        await page.waitForURL(/\/play\/[0-9a-f-]{36}$/);
        await page.getByText('A fork in the path', { exact: true }).waitFor();
        await page
          .getByRole('button', { name: 'Walk toward the water' })
          .click();
        await page
          .getByText('The storyteller is resolving this intention.')
          .waitFor();
        await page.reload();
        await page
          .getByText('The storyteller is resolving this intention.')
          .waitFor();
        await page
          .getByText('On the road', { exact: true })
          .waitFor({ timeout: 20000 });
        await page.getByText('Still travelling.').waitFor();
        await page.reload();
        await page.getByRole('heading', { name: 'On the road' }).waitFor();
        await page
          .getByText('At the tavern', { exact: true })
          .waitFor({ timeout: 20000 });
        const next = page.getByRole('button', {
          name: 'Speak to the bartender',
        });
        assert.equal(await next.isEnabled(), true);
        await next.click();
        await page
          .getByText('The storyteller is resolving this intention.')
          .waitFor();
        await page
          .getByText('On the road', { exact: true })
          .waitFor({ timeout: 20000 });
      });
    },
  );
}

registerStoryConcern(
  import.meta.url,
  'generated intention resolution',
  (args) => checkGeneratedResolution(args),
);
