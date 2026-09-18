import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { TestContext } from 'node:test';
import type { Database } from '@offscreen/db';
import { createStories, StoryError } from '@offscreen/application/stories';
import { withBrowserSession } from './helpers/browser-session.js';
import { requireDefined } from './helpers/require.js';
import { registerStoryConcern } from './helpers/story-suite.js';

type StoryBrowserArgs = {
  t: TestContext;
  database: Database;
  owner: string;
  origin: string;
  cookie: string;
  otherCookie: string;
  restartWorker: () => Promise<void>;
};

export async function checkStoryBrowser({
  t,
  database,
  owner,
  origin,
  cookie,
  otherCookie,
  restartWorker,
}: StoryBrowserArgs) {
  await t.test(
    'browser delivers a persistent item through an authored choice',
    async () => {
      await withBrowserSession(origin, cookie, async ({ context }) => {
        const page = await context.newPage();
        await page.goto(`${origin}/chamber`);
        await page.getByRole('combobox', { name: 'Scenario' }).waitFor();
        assert.equal(
          await page.getByRole('combobox', { name: 'Scenario' }).inputValue(),
          'chamber.v3',
        );
        await page
          .getByRole('region', { name: 'Selected scenario purpose' })
          .getByText(
            'Exercises a durable wait that continues while the browser is closed.',
          )
          .waitFor();
        await page
          .getByRole('combobox', { name: 'Scenario' })
          .selectOption('chamber.v5');
        await page
          .getByRole('region', { name: 'Selected scenario purpose' })
          .getByText('authoritative item transfer', { exact: false })
          .waitFor();
        await page
          .getByRole('button', { name: 'Start scripted chamber' })
          .click();
        await page
          .getByText('Sealed letter — held by courier', { exact: true })
          .waitFor();
        await page.getByRole('region', { name: 'Inspector' }).waitFor();
        const id = requireDefined(
          new URL(page.url()).searchParams.get('id'),
          'Expected chamber story id in URL',
        );
        // The response endpoint must not accept arbitrary effects from a client.
        const snapshot = await createStories(database).read({
          ownerId: owner,
          storyId: id,
        });
        const offer = requireDefined(
          snapshot.current.interaction,
          'Expected letter fixture offer',
        );
        const submission = {
          interactionId: offer.id,
          answer: { kind: 'choice.v1', optionId: 'deliver' },
        };
        const injection = await fetch(
          `${origin}/api/stories/${id}/responses/${randomUUID()}`,
          {
            method: 'PUT',
            headers: { cookie, origin, 'content-type': 'application/json' },
            body: JSON.stringify({
              expectedRevision: 1,
              submission,
              effects: [],
            }),
          },
        );
        assert.equal(injection.status, 400);
        await page
          .getByRole('button', { name: 'Give the letter to the caretaker' })
          .click();
        await page
          .getByRole('heading', { name: 'Letter delivered.' })
          .waitFor();
        await page
          .getByRole('region', { name: 'Inspector' })
          .getByText('caretaker', { exact: false })
          .waitFor();
        await page.reload();
        await page
          .getByText('Sealed letter — held by caretaker', { exact: true })
          .waitFor();
        assert.equal(
          (await createStories(database).read({ ownerId: owner, storyId: id }))
            .revision,
          2,
        );
      });
    },
  );

  await t.test(
    'browser publishes a timed offer and Temporal defaults after the browser leaves',
    async () => {
      await withBrowserSession(origin, cookie, async ({ context }) => {
        const page = await context.newPage();
        await page.goto(`${origin}/chamber`);
        await page
          .getByRole('combobox', { name: 'Scenario' })
          .selectOption('chamber.v4');
        await page
          .getByRole('button', { name: 'Start scripted chamber' })
          .click();
        await page.getByRole('button', { name: 'Approach the gate' }).click();
        await page
          .getByText('This response window cannot be paused.', {
            exact: false,
          })
          .waitFor();
        const url = page.url();
        const id = requireDefined(
          new URL(url).searchParams.get('id'),
          'Expected timed chamber story id',
        );
        const before = await createStories(database).read({
          ownerId: owner,
          storyId: id,
        });
        const decision = requireDefined(
          before.decision,
          'Expected published decision deadline',
        );
        await page.close();
        const limit = Date.now() + 30000;
        let latest = before;
        while (latest.revision === before.revision && Date.now() < limit) {
          await delay(300);
          latest = await createStories(database).read({
            ownerId: owner,
            storyId: id,
          });
        }
        assert.equal(latest.revision, 3);
        assert.ok(Date.now() >= Date.parse(decision.dueAt));
        const reopened = await context.newPage();
        await reopened.goto(url);
        await reopened
          .getByRole('heading', { name: 'A quiet departure.' })
          .waitFor();
        assert.equal(
          await reopened.getByRole('button', { name: 'Tell a joke' }).count(),
          0,
        );
      });
    },
  );

  await t.test(
    'browser starts and reloads the same chamber and stored interaction',
    async () => {
      await withBrowserSession(origin, cookie, async ({ context }) => {
        const page = await context.newPage();
        await page.goto(`${origin}/chamber`);
        await page
          .getByRole('combobox', { name: 'Scenario' })
          .selectOption('chamber.v2');
        await page
          .getByRole('button', { name: 'Start scripted chamber' })
          .click();
        await page
          .getByRole('heading', { name: 'A gate and a small decision.' })
          .waitFor();
        const url = page.url();
        const inspect = page
          .locator('details')
          .filter({ hasText: 'Inspect saved state' });
        const before = await inspect.textContent();
        assert.equal(
          await page
            .getByRole('button', { name: 'Approach the gate' })
            .isDisabled(),
          false,
        );
        await page.reload();
        assert.equal(page.url(), url);
        assert.equal(await inspect.textContent(), before);
        await page.getByRole('button', { name: 'Approach the gate' }).click();
        await page.getByRole('heading', { name: 'At the gate.' }).waitFor();
        await page.reload();
        await page.getByRole('button', { name: 'Tell a joke' }).click();
        await page.getByRole('heading', { name: 'Someone laughs.' }).waitFor();
        await page.reload();
        await page.getByRole('heading', { name: 'Someone laughs.' }).waitFor();
        assert.equal(
          await page
            .getByRole('region', { name: 'Offered interaction' })
            .count(),
          0,
        );
        await page.getByRole('button', { name: 'Read saved passages' }).click();
        const history = page.getByRole('region', { name: 'Saved chronology' });
        await history
          .getByRole('heading', { name: '1. A gate and a small decision.' })
          .waitFor();
        assert.equal(await history.getByRole('article').count(), 3);
        assert.equal(
          await history
            .getByRole('button', { name: 'Read older passages' })
            .count(),
          0,
        );
        assert.equal(
          await page
            .getByRole('button', { name: 'Start scripted chamber' })
            .count(),
          0,
        );
        await page.goto(`${origin}/chamber`);
        await page
          .getByRole('button', { name: 'Start scripted chamber' })
          .click();
        await page
          .getByRole('button', { name: 'Walk to the cafe (20 seconds)' })
          .click();
        await page
          .getByRole('heading', { name: 'Crossing the courtyard.' })
          .waitFor();
        const timedUrl = page.url();
        const timedId = requireDefined(
          new URL(timedUrl).searchParams.get('id'),
          'Expected timed journey story id',
        );
        const waiting = await createStories(database).read({
          ownerId: owner,
          storyId: timedId,
        });
        const waitingState = requireDefined(
          waiting.waiting,
          'Expected waiting journey snapshot',
        );
        const remainingBeforeArrival = await createStories(
          database,
        ).advanceInterval({ intervalId: waiting.current.id });
        assert.ok(remainingBeforeArrival != null && remainingBeforeArrival > 0);
        await assert.rejects(
          createStories(database).append({
            ownerId: owner,
            storyId: timedId,
            transitionId: randomUUID(),
            proposed: {
              expectedRevision: waiting.revision,
              content: waiting.current.content,
              interaction: null,
            },
          }),
          (error: unknown) =>
            error instanceof StoryError && error.code === 'conflict',
        );
        await page.getByRole('button', { name: 'Pause journey' }).click();
        await page.getByRole('button', { name: 'Resume journey' }).waitFor();
        const paused = await createStories(database).read({
          ownerId: owner,
          storyId: timedId,
        });
        const pausedWaiting = requireDefined(
          paused.waiting,
          'Expected paused journey snapshot',
        );
        assert.equal(paused.revision, waiting.revision);
        assert.ok(paused.viewVersion > waiting.viewVersion);
        assert.equal(pausedWaiting.dueAt, null);
        assert.ok(
          pausedWaiting.remainingMs != null && pausedWaiting.remainingMs > 0,
        );
        const receipt = requireDefined(
          (
            await database.db.$client.query(
              'SELECT operation_id, request FROM story_control WHERE story_id = $1',
              [timedId],
            )
          ).rows[0],
          'Expected pause control receipt',
        );
        const retryControl = (
          body = receipt.request,
          actor = cookie,
          source = origin,
        ) =>
          fetch(
            `${origin}/api/stories/${timedId}/controls/${receipt.operation_id}`,
            {
              method: 'PUT',
              headers: {
                cookie: actor,
                origin: source,
                'content-type': 'application/json',
              },
              body: JSON.stringify(body),
            },
          );
        assert.equal((await retryControl()).status, 200);
        assert.equal(
          (await retryControl(receipt.request, otherCookie)).status,
          404,
        );
        assert.equal((await retryControl(receipt.request, '')).status, 401);
        assert.equal(
          (await retryControl(receipt.request, cookie, 'https://evil.example'))
            .status,
          403,
        );
        assert.equal(
          (await retryControl({ ...receipt.request, action: 'resume' })).status,
          409,
        );
        assert.deepEqual(
          await createStories(database).read({
            ownerId: owner,
            storyId: timedId,
          }),
          paused,
        );
        await page.close();
        // Wait until dispatch is acknowledged, then restart the worker while the
        // persisted interval is still pending. No browser is driving progression.
        const dispatchLimit = Date.now() + 10000;
        let delivered = false;
        while (!delivered && Date.now() < dispatchLimit) {
          const result = await database.db.$client.query(
            'SELECT delivered_at FROM outbox WHERE id = $1',
            [waiting.current.id],
          );
          delivered = result.rows[0]?.delivered_at != null;
          if (!delivered) {
            await delay(100);
          }
        }
        assert.ok(delivered);
        await restartWorker();
        const waitingDueAt = requireDefined(
          waitingState.dueAt,
          'Expected original journey due time',
        );
        await delay(Math.max(0, Date.parse(waitingDueAt) - Date.now()) + 250);
        assert.equal(
          await createStories(database).advanceInterval({
            intervalId: waiting.current.id,
          }),
          -1,
        );
        assert.deepEqual(
          await createStories(database).read({
            ownerId: owner,
            storyId: timedId,
          }),
          paused,
        );
        const resumePage = await context.newPage();
        await resumePage.goto(timedUrl);
        await resumePage
          .getByRole('button', { name: 'Resume journey' })
          .click();
        await resumePage
          .getByRole('button', { name: 'Pause journey' })
          .waitFor();
        const resumed = await createStories(database).read({
          ownerId: owner,
          storyId: timedId,
        });
        const resumedWaiting = requireDefined(
          resumed.waiting,
          'Expected resumed journey snapshot',
        );
        assert.equal(resumedWaiting.remainingMs, null);
        assert.equal(resumedWaiting.controlRevision, 2);
        const resumedDueAt = requireDefined(
          resumedWaiting.dueAt,
          'Expected resumed due time',
        );
        assert.ok(Date.parse(resumedDueAt) > Date.now());
        // Retrying an old acknowledged pause cannot pause the resumed journey.
        assert.equal((await retryControl()).status, 200);
        assert.deepEqual(
          await createStories(database).read({
            ownerId: owner,
            storyId: timedId,
          }),
          resumed,
        );
        await resumePage.close();
        const deadline = Date.now() + 30000;
        let arrived = await createStories(database).read({
          ownerId: owner,
          storyId: timedId,
        });
        while (arrived.waiting && Date.now() < deadline) {
          await delay(250);
          arrived = await createStories(database).read({
            ownerId: owner,
            storyId: timedId,
          });
        }
        assert.equal(arrived.current.content.title, 'At the cafe.');
        assert.equal(arrived.revision, 3);
        assert.equal(arrived.waiting, null);
        assert.ok(Date.now() >= Date.parse(waitingDueAt));
        assert.equal(
          await createStories(database).advanceInterval({
            intervalId: waiting.current.id,
          }),
          null,
        );
        assert.equal(
          (
            await createStories(database).history({
              ownerId: owner,
              storyId: timedId,
            })
          ).items.length,
          3,
        );
        const reopened = await context.newPage();
        await reopened.goto(timedUrl);
        await reopened.getByRole('button', { name: 'Tell a joke' }).click();
        await reopened
          .getByRole('heading', { name: 'Coffee and a laugh.' })
          .waitFor();
      });
    },
  );
}

registerStoryConcern(
  import.meta.url,
  'story browser integration',
  checkStoryBrowser,
);
