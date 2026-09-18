import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
// Match the database package's CommonJS Drizzle types across the ESM API boundary.
import { createRequire } from 'node:module';
import type * as Drizzle from 'drizzle-orm' with {
  'resolution-mode': 'require',
};
import { generation } from '@offscreen/db/generation-schema';
import { story } from '@offscreen/db/story-schema';
import {
  storytellerAttempt,
  storytellerFunding,
  storytellerRun,
} from '@offscreen/db/storyteller-schema';
import { createDrafts } from '@offscreen/server/drafts';
import { createScriptedOpenings } from '@offscreen/server/scripted-openings';
import { createStorytellerOpenings } from '@offscreen/server/storyteller-openings';
import { createStorytellerRuntime } from '@offscreen/server/storyteller-runtime';
import { createStorytellerBudget } from '@offscreen/server/storyteller-budget';
import { createChamber } from '@offscreen/server/chamber';
import { createStories } from '@offscreen/server/stories';
import { scriptedStorytellerResult } from '@offscreen/ai/storyteller-fixtures';
import { storytellerTaskSchema } from '@offscreen/ai/storyteller-tasks';
import { continuityNotesSchema } from '@offscreen/ai/continuity';
import type { ExecutionPolicy } from '@offscreen/ai/storyteller-policy';
import { withAppIntegration } from './helpers/app-integration.js';
import { withBrowserSession } from './helpers/browser-session.js';

const orm: typeof Drizzle = createRequire(import.meta.url)('drizzle-orm');
const { eq } = orm;

// All sources and provider responses in this suite are local. No credentials are read.
test(
  'profiled storyteller: durable choices, context, accounting and browser creation',
  { timeout: 240000 },
  async (t) => {
    await withAppIntegration(
      async ({
        database,
        ownerId,
        origin,
        cookie,
        otherCookie,
        restartWorker,
      }) => {
        const drafts = createDrafts(database);
        const openings = createScriptedOpenings(database);
        const stories = createChamber(database);
        const runtime = createStorytellerRuntime(database, {
          realDurationMs: () => 1000,
        });
        async function candidate(profile = 'absurd-action-comedy') {
          const draftId = randomUUID();
          await drafts.save(ownerId, draftId, {
            title: 'Pineapple test',
            premise: 'SpongeBob wakes in the pineapple with Gary.',
            storytellingDirection: '',
            storyteller: { id: profile, revision: 1 },
            expectedRevision: 0,
          });
          const generationId = randomUUID();
          await openings.request(ownerId, draftId, generationId, 1);
          await runtime.complete(generationId);
          const storyId = randomUUID();
          const snapshot = await stories.startFromCandidate({
            ownerId,
            storyId,
            candidateId: generationId,
            expectedDraftRevision: 1,
          });
          return { draftId, generationId, storyId, snapshot };
        }
        async function choose(storyId: string, optionId: string) {
          const before = await stories.read({ ownerId, storyId });
          assert.ok(before.current.interaction);
          const operationId = randomUUID();
          const body = {
            expectedRevision: before.revision,
            submission: {
              interactionId: before.current.interaction.id,
              answer: { kind: 'choice.v1', optionId },
            },
          };
          await stories.admitResolution({
            ownerId,
            storyId,
            operationId,
            body,
          });
          await runtime.complete(operationId);
          return {
            operationId,
            body,
            snapshot: await stories.read({ ownerId, storyId }),
          };
        }
        const first = await candidate();
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
              /remembering/,
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
        await t.test(
          'concurrent reservations obey a shared cap and duplicate settlement is harmless',
          async () => {
            const accountId = randomUUID();
            const runId = randomUUID();
            await database.db.insert(storytellerFunding).values({
              id: accountId,
              limitMicrousd: 150n,
              stopped: false,
              verifiedAt: new Date(),
            });
            await database.db.insert(storytellerRun).values({
              id: runId,
              accountId,
              limitMicrousd: 150n,
              maxAttempts: 3,
              enabled: true,
            });
            const execution = {
              mode: 'provider' as const,
              accountId,
              runId,
              policy: {
                version: 'fake',
                model: 'fake/model',
                provider: 'fake',
                priceVersion: 'concurrency-test',
                inputMicrousdPerMillion: '1000',
                outputMicrousdPerMillion: '1000',
                maxInputTokens: 100000,
                maxOutputTokens: 2000,
                timeoutMs: 1000,
              },
            };
            const budget = createStorytellerBudget(database);
            const ids = [randomUUID(), randomUUID()];
            const results = await Promise.allSettled(
              ids.map((id) =>
                budget.reserve({
                  id,
                  generationId: first.generationId,
                  execution,
                  request: {},
                }),
              ),
            );
            assert.equal(
              results.filter((result) => result.status === 'fulfilled').length,
              1,
            );
            const winner =
              ids[results.findIndex((result) => result.status === 'fulfilled')];
            assert.ok(winner);
            assert.equal(
              (await budget.inspect(accountId)).reservedMicrousd,
              102n,
            );
            assert.equal(await budget.dispatch(winner, execution), true);
            assert.equal(await budget.dispatch(winner, execution), false);
            const settlement = {
              id: winner,
              execution,
              chargeMicrousd: 80n,
              providerId: 'fake-settled',
            };
            await budget.settle(settlement);
            await budget.settle(settlement);
            assert.equal(
              (await budget.inspect(accountId)).settledMicrousd,
              80n,
            );
            assert.equal(
              (await budget.inspect(accountId)).reservedMicrousd,
              0n,
            );
          },
        );
        await t.test(
          'fake provider accounting settles once and unknown dispatch is never repeated',
          async () => {
            const accountId = randomUUID();
            const runId = randomUUID();
            await database.db.insert(storytellerFunding).values({
              id: accountId,
              limitMicrousd: 1000000n,
              stopped: false,
              verifiedAt: new Date(),
            });
            await database.db.insert(storytellerRun).values({
              id: runId,
              accountId,
              limitMicrousd: 1000000n,
              maxAttempts: 4,
              enabled: true,
            });
            const execution: ExecutionPolicy = {
              mode: 'provider',
              accountId,
              runId,
              policy: {
                version: 'fake',
                model: 'fake/model',
                provider: 'fake',
                priceVersion: 'test-only',
                inputMicrousdPerMillion: '1000',
                outputMicrousdPerMillion: '1000',
                maxInputTokens: 100000,
                maxOutputTokens: 2000,
                timeoutMs: 1000,
              },
            };
            const profiled = createStorytellerOpenings(database, execution);
            let calls = 0;
            const source = createStorytellerRuntime(database, {
              provider: async (task) => {
                calls++;
                return {
                  kind: 'result',
                  output: scriptedStorytellerResult(task),
                  chargeMicrousd: 10n,
                  providerId: 'fake-provider-id',
                };
              },
            });
            const draftId = randomUUID();
            await drafts.save(ownerId, draftId, {
              title: '',
              premise: 'SpongeBob in the pineapple',
              storytellingDirection: '',
              storyteller: { id: 'absurd-action-comedy', revision: 1 },
              expectedRevision: 0,
            });
            const id = randomUUID();
            await profiled.request(ownerId, draftId, id, 1);
            await source.complete(id);
            await source.complete(id);
            assert.equal(calls, 1);
            const budget = createStorytellerBudget(database);
            assert.equal(
              (await budget.inspect(accountId)).settledMicrousd,
              10n,
            );
            const uncertainId = randomUUID();
            await profiled.request(ownerId, draftId, uncertainId, 1);
            const uncertain = createStorytellerRuntime(database, {
              provider: async () => {
                calls++;
                return { kind: 'uncertain' };
              },
            });
            await uncertain.complete(uncertainId);
            await uncertain.complete(uncertainId);
            assert.equal(calls, 2);
            const account = await budget.inspect(accountId);
            assert.equal(account.stopped, true);
            assert.ok(account.reservedMicrousd > 0n);
            const [attempt] = await database.db
              .select()
              .from(storytellerAttempt)
              .where(eq(storytellerAttempt.generationId, uncertainId));
            assert.equal(attempt?.state, 'uncertain');
            assert.ok(attempt);
            // Explicit simulated reconciliation; keep this disposable test database usable on rerun.
            if (execution.mode !== 'provider') {
              throw new Error('Expected provider execution');
            }
            await budget.settle({
              id: attempt.id,
              execution,
              chargeMicrousd: 1n,
              providerId: 'fake-reconciled',
            });
            assert.equal((await budget.inspect(accountId)).stopped, true);
          },
        );
        await t.test(
          'browser selects a profile, starts, chooses, reloads and finds live story',
          async () => {
            await restartWorker();
            await withBrowserSession(origin, cookie, async ({ context }) => {
              const page = await context.newPage();
              await page.goto(`${origin}/stories/new`);
              await page
                .getByLabel('Choose your storyteller')
                .selectOption('quiet-eerie-mystery/1');
              await page
                .getByLabel('Who are you, and where does this begin?')
                .fill('I am SpongeBob in the pineapple with Gary.');
              await page
                .getByRole('button', { name: 'Save draft', exact: true })
                .click();
              await page
                .getByRole('link', { name: 'Review opening candidate' })
                .click();
              await page
                .getByRole('button', {
                  name: 'Generate opening candidate',
                  exact: true,
                })
                .click();
              await page
                .getByRole('button', { name: 'Start story', exact: true })
                .click({ timeout: 30000 });
              await page.waitForURL('**/play/**');
              await page
                .getByRole('button', {
                  name: 'Ask Gary about the delivery',
                  exact: true,
                })
                .click();
              await page
                .getByRole('heading', { name: 'Gary’s promise', exact: true })
                .waitFor({ timeout: 30000 });
              await page
                .getByRole('button', {
                  name: 'Walk to work and leave this for later',
                  exact: true,
                })
                .click();
              await page
                .getByRole('heading', {
                  name: 'On the way to work',
                  exact: true,
                })
                .waitFor({ timeout: 30000 });
              await page
                .getByRole('button', { name: 'Pause', exact: true })
                .click();
              await page.getByText(/Journey paused/).waitFor();
              await restartWorker();
              const url = page.url();
              await page.reload();
              await page.getByText(/Journey paused/).waitFor();
              await page
                .getByRole('button', { name: 'Resume', exact: true })
                .click();
              await page
                .getByRole('heading', { name: 'Outside work', exact: true })
                .waitFor({ timeout: 35000 });
              await page.reload();
              await page
                .getByRole('button', {
                  name: 'Read saved passages',
                  exact: true,
                })
                .click();
              await page
                .getByRole('heading', { name: /1. Morning in the pineapple/ })
                .waitFor();
              await page.goto(`${origin}/stories`);
              assert.ok(
                await page
                  .locator(`a[href="${new URL(url).pathname}"]`)
                  .count(),
              );
            });
          },
        );
      },
    );
  },
);
