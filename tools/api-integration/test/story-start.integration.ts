import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { TestContext } from 'node:test';
import {
  latestOpeningSchema,
  openingPreviewSchema,
} from '@offscreen/contracts/openings';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import type { Database } from '@offscreen/db';
import {
  scriptedOpeningPresentation,
  scriptedPlayableOpening,
} from '@offscreen/application/generations';
import {
  createStories,
  StoryError,
  playableOpeningStorySource,
} from '@offscreen/application/stories';
import { createChamber } from '@offscreen/application/developer-tools';
import { withBrowserSession } from './helpers/browser-session.js';
import { requireDefined } from './helpers/require.js';
import { registerStoryConcern } from './helpers/story-suite.js';

type StoryStartArgs = {
  t: TestContext;
  database: Database;
  owner: string;
  origin: string;
  cookie: string;
  otherCookie: string;
};

async function saveDraft(
  origin: string,
  cookie: string,
  draftId: string,
  expectedRevision: number,
  premise = 'A traveller at a locked gate.',
) {
  const response = await fetch(`${origin}/api/drafts/${draftId}`, {
    method: 'PUT',
    headers: {
      cookie,
      origin,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Start candidate',
      premise,
      storytellingDirection: 'Strange but gentle.',
      expectedRevision,
    }),
  });
  assert.equal(response.status, 200);
}

async function requestOpening(
  origin: string,
  cookie: string,
  draftId: string,
  openingId: string,
  expectedRevision: number,
) {
  const response = await fetch(
    `${origin}/api/drafts/${draftId}/openings/${openingId}`,
    {
      method: 'PUT',
      headers: {
        cookie,
        origin,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ expectedRevision }),
    },
  );
  assert.ok(response.status === 202 || response.status === 200);
  return openingPreviewSchema.parse(await response.json());
}

async function waitForSucceededOpening(
  origin: string,
  cookie: string,
  draftId: string,
) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const latest = latestOpeningSchema.parse(
      await (
        await fetch(`${origin}/api/drafts/${draftId}/openings/latest`, {
          headers: { cookie },
        })
      ).json(),
    ).preview;
    if (latest?.state === 'succeeded' && latest.candidate) {
      return latest;
    }
    await delay(100);
  }
  throw new Error('Expected the playable opening candidate to succeed');
}

export async function prepareCurrentCandidate(
  origin: string,
  cookie: string,
  expectedRevision = 1,
) {
  const draftId = randomUUID();
  await saveDraft(origin, cookie, draftId, 0);
  const candidateId = randomUUID();
  await requestOpening(origin, cookie, draftId, candidateId, expectedRevision);
  const preview = await waitForSucceededOpening(origin, cookie, draftId);
  assert.equal(preview.id, candidateId);
  return { draftId, candidateId, preview };
}

export async function checkStoryStart({
  t,
  database,
  owner,
  origin,
  cookie,
  otherCookie,
}: StoryStartArgs) {
  const stories = createStories(database);
  const headers = {
    cookie,
    origin,
    'content-type': 'application/json',
  };

  await t.test(
    'a current playable candidate starts as live passage 1 with provenance',
    async () => {
      const { candidateId, preview } = await prepareCurrentCandidate(
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
      assert.equal(snapshot.id, storyId);
      assert.equal(snapshot.revision, 1);
      assert.equal(snapshot.canRespond, true);
      assert.equal(snapshot.resolution, null);
      assert.deepEqual(snapshot.current.content, preview.candidate?.content);
      assert.deepEqual(
        snapshot.current.interaction?.specification,
        preview.candidate?.interaction,
      );
      assert.deepEqual(
        snapshot.current.content,
        scriptedOpeningPresentation.content,
      );
      const publicBody = JSON.stringify(snapshot);
      assert.equal(publicBody.includes('intention'), false);
      if (scriptedPlayableOpening.next.kind !== 'choice') {
        throw new Error('Expected a choice fixture');
      }
      for (const option of scriptedPlayableOpening.next.options) {
        assert.equal(publicBody.includes(option.intention), false);
      }
      const stored = await database.db.$client.query(
        `SELECT p.source_generation_id, p.content, p.interaction, s.source, g.output
         FROM story_passage p
         JOIN story s ON s.id = p.story_id
         JOIN generation g ON g.id = p.source_generation_id
         WHERE p.story_id = $1 AND p.sequence = 1`,
        [storyId],
      );
      assert.equal(stored.rowCount, 1);
      assert.equal(stored.rows[0].source_generation_id, candidateId);
      assert.equal(stored.rows[0].source, playableOpeningStorySource);
      assert.deepEqual(
        stored.rows[0].output.next.options.map(
          (option: { intention: string }) => option.intention,
        ),
        scriptedPlayableOpening.next.options.map((option) => option.intention),
      );
      const inspection = await createChamber(database).inspect({
        ownerId: owner,
        storyId,
      });
      assert.equal(inspection.generation?.id, candidateId);
      assert.equal(inspection.generation?.state, 'succeeded');
      assert.deepEqual(
        inspection.generation?.optionIntentions?.map(
          (option) => option.intention,
        ),
        scriptedPlayableOpening.next.options.map((option) => option.intention),
      );
      const reopened = storySnapshotSchema.parse(
        await (
          await fetch(`${origin}/api/stories/${storyId}`, {
            headers: { cookie },
          })
        ).json(),
      );
      assert.deepEqual(reopened.current.content, snapshot.current.content);
      assert.deepEqual(
        reopened.current.interaction?.specification,
        snapshot.current.interaction?.specification,
      );
      const retry = await fetch(`${origin}/api/stories/${storyId}/start`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          candidateId,
          expectedDraftRevision: 1,
        }),
      });
      assert.equal(retry.status, 200);
      assert.deepEqual(await retry.json(), snapshot);
      const otherCandidate = await prepareCurrentCandidate(origin, cookie);
      assert.equal(
        (
          await fetch(`${origin}/api/stories/${storyId}/start`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              candidateId: otherCandidate.candidateId,
              expectedDraftRevision: 1,
            }),
          })
        ).status,
        409,
      );
      const offer = requireDefined(
        snapshot.current.interaction,
        'Expected started opening offer',
      );
      assert.equal(
        (
          await fetch(
            `${origin}/api/stories/${storyId}/responses/${randomUUID()}`,
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
        409,
      );
      assert.equal(
        (
          await fetch(`${origin}/api/stories/${storyId}/start`, {
            method: 'PUT',
            headers: { ...headers, cookie: otherCookie },
            body: JSON.stringify({
              candidateId,
              expectedDraftRevision: 1,
            }),
          })
        ).status,
        404,
      );
    },
  );

  await t.test(
    'stale, pending, malformed and foreign candidates cannot start',
    async () => {
      const { draftId, candidateId } = await prepareCurrentCandidate(
        origin,
        cookie,
      );
      await saveDraft(origin, cookie, draftId, 1, 'A changed premise.');
      assert.equal(
        (
          await fetch(`${origin}/api/stories/${randomUUID()}/start`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              candidateId,
              expectedDraftRevision: 1,
            }),
          })
        ).status,
        409,
      );
      const second = randomUUID();
      await requestOpening(origin, cookie, draftId, second, 2);
      const current = await waitForSucceededOpening(origin, cookie, draftId);
      assert.equal(current.id, second);
      assert.equal(
        (
          await fetch(`${origin}/api/stories/${randomUUID()}/start`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              candidateId,
              expectedDraftRevision: 2,
            }),
          })
        ).status,
        409,
      );
      const notReady = await prepareCurrentCandidate(origin, cookie);
      await database.db.$client.query(
        `UPDATE generation
         SET state = 'failed', output = NULL, failure_code = 'fixture'
         WHERE id = $1`,
        [notReady.candidateId],
      );
      assert.equal(
        (
          await fetch(`${origin}/api/stories/${randomUUID()}/start`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              candidateId: notReady.candidateId,
              expectedDraftRevision: 1,
            }),
          })
        ).status,
        409,
      );
      const malformed = await prepareCurrentCandidate(origin, cookie);
      await database.db.$client.query(
        `UPDATE generation SET output = '{"bad":true}'::jsonb WHERE id = $1`,
        [malformed.candidateId],
      );
      assert.equal(
        (
          await fetch(`${origin}/api/stories/${randomUUID()}/start`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              candidateId: malformed.candidateId,
              expectedDraftRevision: 1,
            }),
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await fetch(`${origin}/api/stories/${randomUUID()}/start`, {
            method: 'PUT',
            headers: { ...headers, cookie: otherCookie },
            body: JSON.stringify({
              candidateId: malformed.candidateId,
              expectedDraftRevision: 1,
            }),
          })
        ).status,
        404,
      );
      await assert.rejects(
        () =>
          stories.startFromCandidate({
            ownerId: owner,
            storyId: 'not-a-uuid',
            candidateId: randomUUID(),
            expectedDraftRevision: 1,
          }),
        (error) => error instanceof StoryError && error.code === 'invalid',
      );
    },
  );

  await t.test(
    'Start versus a locked draft edit cannot publish an already-stale candidate',
    async () => {
      const { draftId, candidateId } = await prepareCurrentCandidate(
        origin,
        cookie,
      );
      const locker = await database.db.$client.connect();
      try {
        await locker.query('BEGIN');
        await locker.query(
          'SELECT id FROM story_draft WHERE id = $1 FOR UPDATE',
          [draftId],
        );
        const start = stories.startFromCandidate({
          ownerId: owner,
          storyId: randomUUID(),
          candidateId,
          expectedDraftRevision: 1,
        });
        await delay(50);
        await locker.query(
          'UPDATE story_draft SET revision = revision + 1 WHERE id = $1',
          [draftId],
        );
        await locker.query('COMMIT');
        await assert.rejects(
          () => start,
          (error) => error instanceof StoryError && error.code === 'conflict',
        );
      } finally {
        locker.release();
      }
    },
  );

  await t.test(
    'browser starts a reviewed candidate and can select a generated choice',
    async () => {
      await withBrowserSession(origin, cookie, async ({ context }) => {
        const page = await context.newPage();
        await page.goto(`${origin}/stories/new`);
        await page.getByLabel('Title').fill('Started from candidate');
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
        const choice = page.getByRole('button', {
          name: 'Walk toward the water',
        });
        assert.equal(await choice.isEnabled(), true);
        const liveUrl = page.url();
        await page.reload();
        assert.equal(page.url(), liveUrl);
        await page.getByText('A fork in the path', { exact: true }).waitFor();
        assert.equal(await choice.isEnabled(), true);
      });
    },
  );
}

registerStoryConcern(import.meta.url, 'playable candidate start', (args) =>
  checkStoryStart(args),
);
