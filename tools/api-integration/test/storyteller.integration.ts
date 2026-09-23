import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
// Match the database package's CommonJS Drizzle types across the ESM API boundary.
import { createRequire } from 'node:module';
import type * as Drizzle from 'drizzle-orm' with {
  'resolution-mode': 'require',
};
import { generation } from '@offscreen/db/generation-schema';
import {
  campaign as campaignTable,
  campaignConsequence,
  campaignReport,
  gameActionExecution,
  gameActionExecutionEvent,
  gameActionReceipt,
  gameActivity,
  gameOffer,
  worldObligation,
  worldObligationEvent,
} from '@offscreen/db/campaign-schema';
import type { CampaignStart } from '@offscreen/contracts/campaign';
import { story, storyPassage } from '@offscreen/db/story-schema';
import {
  storytellerAttempt,
  storytellerFunding,
  storytellerMemoryExploration,
  storytellerOperation,
  storytellerRun,
  storytellerUsageAllocation,
} from '@offscreen/db/storyteller-schema';
import { createDrafts } from '@offscreen/application/drafts';
import { createScriptedOpenings } from '@offscreen/application/generations';
import { createStorytellerOpenings } from '@offscreen/application/storyteller';
import { createStorytellerRuntime } from '@offscreen/application/storyteller';
import {
  createStorytellerBudget,
  createDispatchReviewControls,
  createMemoryProviderRoundRuntime,
  CanonicalMemoryExplorationError,
  MemoryExplorationControllerError,
  resourcesForEffectiveUsagePolicy,
  runMemoryExploration,
  type MemoryExplorationSnapshot,
} from '@offscreen/application/storyteller';
import {
  createChamber,
  createChamberStorytellerControl,
} from '@offscreen/application/developer-tools';
import { createStories } from '@offscreen/application/stories';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import { continuityNotesSchema } from '@offscreen/storyteller/context';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';
import { withAppIntegration } from './helpers/app-integration.js';
import { withBrowserSession } from './helpers/browser-session.js';
import { requireDefined } from './helpers/require.js';
import { createTestUsagePolicy } from './helpers/usage-policy.js';
import {
  LocalDocumentStore,
  importRulePackageDirectory,
  importStartPackageDirectory,
} from '@offscreen/documents';

const orm: typeof Drizzle = createRequire(import.meta.url)('drizzle-orm');
const { asc, eq } = orm;

const fakeUsage = (reportedCostMicrousd: bigint) => ({
  reportedCostMicrousd,
  promptTokens: 20,
  completionTokens: 10,
  totalTokens: 30,
  reasoningTokens: 0,
  cachedTokens: 0,
  cacheWriteTokens: 0,
});
const fakeTelemetry = (providerId: string) => ({
  durationMs: 25,
  httpStatus: 200,
  providerId,
  reportedModel: 'fake/model',
  finishReason: 'stop',
});

// All sources and provider responses in this suite are local. No credentials are read.
test(
  'profiled storyteller: durable choices, context, accounting and browser creation',
  { timeout: 240000 },
  async (t) => {
    const chamberStorytellerControl = createChamberStorytellerControl();
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
        const storyService = createStories(database);
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
        async function mechanicalCandidate(
          contentId = 'pineapple-mechanics.v4',
          pace:
            | { kind: 'instant' }
            | {
                kind: 'rate';
                fictionalSeconds: number;
                realSeconds: number;
              } = {
            kind: 'rate',
            fictionalSeconds: 1,
            realSeconds: 1,
          },
          campaignOverrides: Partial<CampaignStart> = {},
        ) {
          const draftId = randomUUID();
          await drafts.save(ownerId, draftId, {
            title: 'Mechanical loop test',
            premise: 'Wake in a strange place and respond carefully.',
            storytellingDirection: '',
            storyteller: { id: 'absurd-action-comedy', revision: 1 },
            expectedRevision: 0,
          });
          const generationId = randomUUID();
          await openings.request(ownerId, draftId, generationId, 1, contentId);
          await runtime.complete(generationId);
          const storyId = randomUUID();
          const campaign: CampaignStart = {
            mechanics: campaignOverrides.mechanics ?? true,
            locked: campaignOverrides.locked ?? false,
            pace: campaignOverrides.pace ?? pace,
            time: campaignOverrides.time ?? {
              kind: 'elapsed',
              id: 'simulation-gameSeconds',
              revision: 1,
              unit: {
                id: 'game-second',
                label: 'game-second',
                pluralLabel: 'gameSeconds',
                gameSecondsPerUnit: 1,
              },
              epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
            },
            worldObligations: campaignOverrides.worldObligations ?? [],
            worlds: campaignOverrides.worlds ?? [],
          };
          const snapshot = await stories.startFromCandidate({
            ownerId,
            storyId,
            candidateId: generationId,
            expectedDraftRevision: 1,
            campaign,
          });
          return { storyId, snapshot };
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
          'imported abstract start publishes one root and one obligation across retry',
          async () => {
            const fixtureRoot = await mkdtemp(
              join(tmpdir(), 'offscreen-start-integration-'),
            );
            const storage = new LocalDocumentStore(join(fixtureRoot, 'store'));
            const rules = await importRulePackageDirectory(
              storage,
              resolve('content/rules/srd-5.2.1-subset'),
            );
            const defaultRules = {
              ruleSetId: rules.manifest.ruleSetId,
              rootHash: rules.rootHash,
              revision: rules.manifest.revision,
              engine: rules.manifest.engine,
            };
            const source = join(fixtureRoot, 'abstract-start');
            await mkdir(join(source, 'obligations'), { recursive: true });
            await writeFile(
              join(source, 'START.md'),
              '# Gradient life\n\nThere are no people here, only a living response to chemical gradients.',
            );
            const packageObligationId = randomUUID();
            await writeFile(
              join(source, 'obligations', 'warming.json'),
              JSON.stringify({
                version: 1,
                obligation: {
                  id: packageObligationId,
                  revision: 1,
                  source: { id: 'gradient-life', revision: 1 },
                  label: 'The medium warms',
                  visibility: { kind: 'hidden' },
                  consequence: {
                    kind: 'condition.set.v1',
                    condition: {
                      id: 'warm-medium',
                      label: 'Warm medium',
                      value: true,
                    },
                  },
                  followUp: 'report',
                  due: { kind: 'game-second', gameSecond: 12 },
                },
              }),
            );
            const startPackageId = randomUUID();
            await writeFile(
              join(source, 'start-package.json'),
              JSON.stringify({
                format: 'offscreen.start-package-source.v1',
                startPackageId,
                authorOperationId: randomUUID(),
                title: 'Gradient life',
                worlds: [],
                rules: defaultRules,
                documents: [
                  {
                    path: 'START.md',
                    kind: 'orientation',
                    activation: 'initial-canon',
                    authority: 'canon',
                    visibility: 'player-known',
                  },
                  {
                    path: 'obligations/warming.json',
                    kind: 'world-obligation',
                    activation: 'executable-obligation',
                    authority: 'canon',
                    visibility: 'storyteller-private',
                    schemaId: 'world-obligation.v1',
                  },
                ],
              }),
            );
            const imported = await importStartPackageDirectory(storage, source);
            const storiesWithDocuments = createStories(database, {
              documentStore: storage,
              defaultRules,
            });
            const draftId = randomUUID();
            await drafts.save(ownerId, draftId, {
              title: 'Abstract start integration',
              premise: 'A small organism responds to its environment.',
              storytellingDirection: 'Avoid humanoid assumptions.',
              storyteller: { id: 'absurd-action-comedy', revision: 1 },
              expectedRevision: 0,
            });
            const generationId = randomUUID();
            await openings.request(
              ownerId,
              draftId,
              generationId,
              1,
              'microbe.v3',
            );
            await runtime.complete(generationId);
            const storyId = randomUUID();
            const campaign: CampaignStart = {
              mechanics: true,
              locked: false,
              pace: { kind: 'instant' },
              time: {
                kind: 'elapsed',
                id: 'simulation-gameSeconds',
                revision: 1,
                unit: {
                  id: 'game-second',
                  label: 'game-second',
                  pluralLabel: 'gameSeconds',
                  gameSecondsPerUnit: 1,
                },
                epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
              },
              worldObligations: [],
              worlds: [],
              startPackage: {
                startPackageId,
                rootHash: imported.rootHash,
                revision: imported.manifest.revision,
              },
            };
            await storiesWithDocuments.startFromCandidate({
              ownerId,
              storyId,
              candidateId: generationId,
              expectedDraftRevision: 1,
              campaign,
            });
            const [createdStory] = await database.db
              .select({
                rootHash: story.documentRootHash,
                rootRevision: story.documentRootRevision,
              })
              .from(story)
              .where(eq(story.id, storyId));
            assert.ok(createdStory?.rootHash);
            assert.equal(createdStory.rootRevision, 2);
            const firstRootHash = createdStory.rootHash;
            const firstManifest = await storage.readManifest(firstRootHash);
            assert.ok(
              firstManifest.entries.some(
                (entry) => entry.path === 'start/package.md',
              ),
            );
            assert.ok(
              firstManifest.entries.some(
                (entry) => entry.path === 'start/reference.json',
              ),
            );
            assert.equal(
              firstManifest.entries.some((entry) => entry.kind === 'character'),
              true,
              'the mechanical opening character remains explicit campaign data',
            );
            const obligationsAfterStart = await database.db
              .select()
              .from(worldObligation)
              .where(eq(worldObligation.storyId, storyId));
            assert.equal(obligationsAfterStart.length, 1);
            assert.notEqual(obligationsAfterStart[0]?.id, packageObligationId);
            assert.equal(obligationsAfterStart[0]?.dueGameSecond, 12);

            await storiesWithDocuments.startFromCandidate({
              ownerId,
              storyId,
              candidateId: generationId,
              expectedDraftRevision: 1,
              campaign,
            });
            const [retriedStory] = await database.db
              .select({
                rootHash: story.documentRootHash,
                rootRevision: story.documentRootRevision,
              })
              .from(story)
              .where(eq(story.id, storyId));
            assert.deepEqual(retriedStory, createdStory);
            assert.equal(
              (
                await database.db
                  .select()
                  .from(worldObligation)
                  .where(eq(worldObligation.storyId, storyId))
              ).length,
              1,
            );
          },
        );
        await t.test(
          'mechanical opening and three consequences reshape plans from committed state',
          async () => {
            const started = await mechanicalCandidate();
            let snapshot = started.snapshot;
            assert.equal(snapshot.revision, 1);
            assert.equal(snapshot.campaign?.offer?.nodes[0]?.id, 'take-cover');
            assert.deepEqual(snapshot.campaign?.holds, [
              {
                kind: 'decision',
                offerId: snapshot.campaign?.offer?.id,
                reason: 'player-choice',
              },
            ]);

            for (let round = 0; round < 3; round++) {
              const campaign = requireDefined(
                snapshot.campaign,
                'Expected a mechanical campaign',
              );
              const offer = requireDefined(
                campaign.offer,
                'Expected a generated mechanical offer',
              );
              const action = requireDefined(
                offer.nodes[0],
                'Expected an admitted mechanical action',
              );
              assert.ok(action.action);
              const operationId = randomUUID();
              await stories.campaignAction({
                ownerId,
                storyId: started.storyId,
                operationId,
                body: {
                  expectedRevision: snapshot.revision,
                  offerId: offer.id,
                  path: [action.id],
                },
              });
              const admitted = await stories.read({
                ownerId,
                storyId: started.storyId,
              });
              assert.equal(admitted.revision, snapshot.revision);
              assert.equal(admitted.campaign?.offer, null);
              assert.equal(
                admitted.campaign?.actionExecution?.operationId,
                operationId,
              );
              assert.equal(admitted.campaign?.actionReceipts.length, round);
              assert.deepEqual(admitted.campaign?.holds, []);

              if (round === 0) {
                await stories.actionExecutionControl({
                  ownerId,
                  storyId: started.storyId,
                  operationId: randomUUID(),
                  body: {
                    executionId: operationId,
                    expectedRevision: 0,
                    action: 'pause',
                  },
                });
                assert.equal(
                  await storyService.advanceCampaignAction(operationId),
                  null,
                );
                const paused = await stories.read({
                  ownerId,
                  storyId: started.storyId,
                });
                assert.equal(paused.campaign?.actionExecution?.state, 'paused');
                assert.equal(paused.campaign?.actionReceipts.length, 0);
                await stories.actionExecutionControl({
                  ownerId,
                  storyId: started.storyId,
                  operationId: randomUUID(),
                  body: {
                    executionId: operationId,
                    expectedRevision: 1,
                    action: 'pace',
                    pace: { kind: 'instant' },
                  },
                });
                await stories.actionExecutionControl({
                  ownerId,
                  storyId: started.storyId,
                  operationId: randomUUID(),
                  body: {
                    executionId: operationId,
                    expectedRevision: 2,
                    action: 'resume',
                  },
                });
              }

              assert.equal(
                await storyService.advanceCampaignAction(operationId),
                null,
              );
              const committed = await stories.read({
                ownerId,
                storyId: started.storyId,
              });
              assert.equal(committed.campaign?.actionExecution, null);
              assert.equal(
                committed.campaign?.actionReceipts[0]?.id,
                operationId,
              );
              assert.equal(
                committed.campaign?.actionReceipts[0]?.state,
                'pending',
              );
              assert.deepEqual(committed.campaign?.holds, [
                {
                  kind: 'storyteller-intent',
                  operationId,
                  reason: 'required-turn',
                },
              ]);

              await storyService.prepareCampaignConsequence(operationId);
              const [receipt] = await database.db
                .select({ generationId: gameActionReceipt.generationId })
                .from(gameActionReceipt)
                .where(eq(gameActionReceipt.operationId, operationId));
              assert.ok(receipt?.generationId);
              const held = await stories.read({
                ownerId,
                storyId: started.storyId,
              });
              assert.deepEqual(held.campaign?.holds, [
                {
                  kind: 'storyteller',
                  generationId: receipt.generationId,
                  reason: 'required-turn',
                },
              ]);
              await runtime.complete(receipt.generationId);
              snapshot = await stories.read({
                ownerId,
                storyId: started.storyId,
              });
              assert.equal(snapshot.revision, round + 2);
              assert.deepEqual(snapshot.campaign?.holds, [
                {
                  kind: 'decision',
                  offerId: snapshot.campaign?.offer?.id,
                  reason: 'player-choice',
                },
              ]);
              assert.equal(snapshot.campaign?.actionReceipts.length, round + 1);
              assert.equal(
                snapshot.campaign?.actionReceipts[0]?.state,
                'published',
              );
              assert.ok(snapshot.campaign?.offer?.nodes.length);
              if (round === 0) {
                assert.deepEqual(
                  snapshot.campaign?.offer?.nodes.map((node) => node.id),
                  ['inspect-from-cover', 'leave-cover'],
                );
              }
            }
          },
        );
        await t.test(
          'microbe completes three mechanical turns through the shared finite-action path',
          async () => {
            const started = await mechanicalCandidate('microbe.v3', {
              kind: 'instant',
            });
            let snapshot = started.snapshot;
            const microbePlans = new Set([
              'follow-gradient',
              'contract',
              'remain-sheltered',
              'follow-gradient-again',
              'contract-again',
            ]);

            for (let round = 0; round < 3; round++) {
              const offer = requireDefined(
                snapshot.campaign?.offer,
                'Expected a microbe decision offer',
              );
              assert.ok(offer.nodes.length > 0);
              assert.equal(
                offer.nodes.every((node) => microbePlans.has(node.id)),
                true,
              );
              const selected = requireDefined(
                offer.nodes.find((node) => node.action),
                'Expected an admitted finite microbe action',
              );
              const operationId = randomUUID();
              const tickBefore = requireDefined(
                snapshot.campaign?.gameSecond,
                'Expected a microbe campaign gameSecond',
              );

              await stories.campaignAction({
                ownerId,
                storyId: started.storyId,
                operationId,
                body: {
                  expectedRevision: snapshot.revision,
                  offerId: offer.id,
                  path: [selected.id],
                },
              });
              assert.equal(
                await storyService.advanceCampaignAction(operationId),
                null,
              );
              const committed = await stories.read({
                ownerId,
                storyId: started.storyId,
              });
              assert.equal(committed.campaign?.gameSecond, tickBefore + 5);
              assert.equal(
                committed.campaign?.actionReceipts.length,
                round + 1,
              );
              assert.deepEqual(committed.campaign?.holds, [
                {
                  kind: 'storyteller-intent',
                  operationId,
                  reason: 'required-turn',
                },
              ]);

              await storyService.prepareCampaignConsequence(operationId);
              const [receipt] = await database.db
                .select({ generationId: gameActionReceipt.generationId })
                .from(gameActionReceipt)
                .where(eq(gameActionReceipt.operationId, operationId));
              assert.ok(receipt?.generationId);
              await runtime.complete(receipt.generationId);
              snapshot = await stories.read({
                ownerId,
                storyId: started.storyId,
              });
              assert.equal(snapshot.revision, round + 2);
              assert.equal(snapshot.campaign?.actionReceipts.length, round + 1);
              assert.equal(
                snapshot.campaign?.actionReceipts[0]?.state,
                'published',
              );
              assert.deepEqual(snapshot.campaign?.holds, [
                {
                  kind: 'decision',
                  offerId: snapshot.campaign?.offer?.id,
                  reason: 'player-choice',
                },
              ]);
            }
          },
        );
        await t.test(
          'active journey re-reads postponed and cancelled schedules before a stale wake settles',
          async () => {
            const postponedId = randomUUID();
            const cancelledId = randomUUID();
            const ordinalTime = {
              kind: 'ordinal-days' as const,
              id: 'bloom-days',
              revision: 1,
              dayLabel: 'Bloom',
              gameSecondsPerDay: 1,
              epoch: { day: 1, gameSecondOfDay: 0 },
            };
            const winterConsequence = {
              kind: 'condition.set.v1' as const,
              condition: {
                id: 'frost-pass',
                label: 'Frost pass',
                value: 'closed',
              },
            };
            const started = await mechanicalCandidate(
              'frost-road.v1',
              { kind: 'rate', fictionalSeconds: 1, realSeconds: 60 },
              {
                time: ordinalTime,
                worldObligations: [
                  {
                    id: postponedId,
                    revision: 1,
                    source: { id: 'winter-threshold', revision: 1 },
                    label: 'Winter threshold',
                    visibility: {
                      kind: 'described',
                      description: 'Winter is approaching.',
                    },
                    consequence: winterConsequence,
                    followUp: 'controlling-scene',
                    due: {
                      kind: 'date',
                      date: {
                        kind: 'ordinal-days',
                        day: 51,
                        gameSecondOfDay: 0,
                      },
                    },
                  },
                  {
                    id: cancelledId,
                    revision: 1,
                    source: { id: 'road-inspection', revision: 1 },
                    label: 'Road inspection',
                    visibility: { kind: 'exact' },
                    consequence: {
                      kind: 'condition.set.v1',
                      condition: {
                        id: 'road-inspected',
                        label: 'Road inspected',
                        value: true,
                      },
                    },
                    followUp: 'controlling-scene',
                    due: { kind: 'game-second', gameSecond: 58 },
                  },
                ],
              },
            );
            const offer = requireDefined(
              started.snapshot.campaign?.offer,
              'Expected the Frost Road offer',
            );
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: ['cross-frost-road'],
              },
            });
            let snapshot = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const activity = requireDefined(
              snapshot.campaign?.activity,
              'Expected an active journey',
            );
            await stories.worldObligationControl({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                obligationId: postponedId,
                expectedRevision: 1,
                action: 'postpone',
                due: {
                  kind: 'date',
                  date: {
                    kind: 'ordinal-days',
                    day: 56,
                    gameSecondOfDay: 0,
                  },
                },
              },
            });
            await assert.rejects(
              stories.worldObligationControl({
                ownerId,
                storyId: started.storyId,
                operationId: randomUUID(),
                body: {
                  obligationId: postponedId,
                  expectedRevision: 1,
                  action: 'cancel',
                },
              }),
              /conflict/,
            );
            await stories.worldObligationControl({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                obligationId: cancelledId,
                expectedRevision: 1,
                action: 'cancel',
              },
            });
            snapshot = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const postponed = snapshot.campaign?.worldObligations.find(
              (obligation) => obligation.id === postponedId,
            );
            assert.equal(postponed?.revision, 2);
            assert.equal(postponed?.visibility, 'described');
            assert.ok(postponed && !('dueGameSecond' in postponed));
            assert.equal(
              snapshot.campaign?.worldObligations.find(
                (obligation) => obligation.id === cancelledId,
              )?.state,
              'cancelled',
            );
            const staleWakeRemaining =
              await storyService.advanceCampaignActivity(activity.id);
            assert.ok(
              staleWakeRemaining !== null && staleWakeRemaining > 0,
              'The old wake must re-read the postponed boundary',
            );
            await stories.campaignControl({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                activityId: activity.id,
                expectedRevision: snapshot.campaign?.activity?.revision,
                action: 'pace',
                pace: { kind: 'instant' },
              },
            });
            await storyService.advanceCampaignActivity(activity.id);
            const interrupted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(interrupted.campaign?.gameSecond, 55);
            assert.equal(interrupted.campaign?.activity?.state, 'encounter');
            assert.deepEqual(
              interrupted.campaign?.worldObligationEvents
                .filter((event) => event.obligationId === postponedId)
                .map((event) => event.kind)
                .sort(),
              ['fired', 'postponed'],
            );
            assert.deepEqual(
              interrupted.campaign?.worldObligationEvents
                .filter((event) => event.obligationId === cancelledId)
                .map((event) => event.kind),
              ['cancelled'],
            );
          },
        );
        await t.test(
          'custom-calendar winter interrupts a sixty-day journey at day fifty-five and publishes a replacement scene',
          async () => {
            const obligationId = randomUUID();
            const reportObligationId = randomUUID();
            const started = await mechanicalCandidate(
              'frost-road.v1',
              { kind: 'instant' },
              {
                time: {
                  kind: 'named-year',
                  id: 'ember-rain-frost',
                  revision: 1,
                  gameSecondsPerDay: 1,
                  yearLabel: 'year',
                  months: [
                    { id: 'ember', label: 'Ember', days: 20 },
                    { id: 'rain', label: 'Rain', days: 35 },
                    { id: 'frost', label: 'Frost', days: 25 },
                  ],
                  epoch: {
                    year: 8,
                    monthId: 'ember',
                    day: 10,
                    gameSecondOfDay: 0,
                    eraLabel: 'Lantern Era',
                  },
                },
                worldObligations: [
                  {
                    id: reportObligationId,
                    revision: 1,
                    source: { id: 'frost-road-opening', revision: 1 },
                    label: 'First snow reaches the lower road',
                    visibility: { kind: 'hidden' },
                    consequence: {
                      kind: 'condition.set.v1',
                      condition: {
                        id: 'lower-road-snow',
                        label: 'Lower road snow',
                        value: true,
                      },
                    },
                    followUp: 'report',
                    due: { kind: 'game-second', gameSecond: 20 },
                  },
                  {
                    id: obligationId,
                    revision: 1,
                    source: { id: 'frost-road-opening', revision: 1 },
                    label: 'Winter closes the Frost Road',
                    visibility: { kind: 'exact' },
                    consequence: {
                      kind: 'condition.set.v1',
                      condition: {
                        id: 'frost-pass',
                        label: 'Frost pass',
                        value: 'closed',
                      },
                    },
                    followUp: 'controlling-scene',
                    due: {
                      kind: 'date',
                      date: {
                        kind: 'named-year',
                        year: 8,
                        monthId: 'frost',
                        day: 10,
                        gameSecondOfDay: 0,
                      },
                    },
                  },
                ],
              },
            );
            const campaign = requireDefined(
              started.snapshot.campaign,
              'Expected a mechanical campaign',
            );
            const visibleDeadline = requireDefined(
              campaign.worldObligations[0],
              'Expected the visible winter deadline',
            );
            assert.equal(visibleDeadline.visibility, 'exact');
            assert.ok(visibleDeadline.visibility === 'exact');
            assert.equal(visibleDeadline.dueGameSecond, 55);
            const offer = requireDefined(
              campaign.offer,
              'Expected the Frost Road offer',
            );
            const journey = requireDefined(
              offer.nodes.find((node) => node.id === 'cross-frost-road'),
              'Expected the long journey plan',
            );
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: [journey.id],
              },
            });
            const admitted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const activityId = requireDefined(
              admitted.campaign?.activity?.id,
              'Expected the admitted Frost Road journey',
            );
            await storyService.advanceCampaignActivity(activityId);

            const interrupted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(interrupted.campaign?.gameSecond, 55);
            assert.equal(
              interrupted.campaign?.worldTime.label,
              'Frost 10, year 8 of Lantern Era',
            );
            assert.equal(interrupted.campaign?.activity?.state, 'encounter');
            assert.deepEqual(interrupted.campaign?.activity?.progress, {
              kind: 'wait',
              label: 'Road crossed',
              elapsedFictionalSeconds: 55,
              requiredFictionalSeconds: 60,
            });
            assert.deepEqual(interrupted.campaign?.worldConditions, [
              {
                id: 'lower-road-snow',
                label: 'Lower road snow',
                value: true,
                provenance: {
                  kind: 'world-obligation',
                  obligationId: reportObligationId,
                },
                setAtGameSecond: 20,
              },
              {
                id: 'frost-pass',
                label: 'Frost pass',
                value: 'closed',
                provenance: {
                  kind: 'world-obligation',
                  obligationId,
                },
                setAtGameSecond: 55,
              },
            ]);
            assert.deepEqual(interrupted.campaign?.holds, [
              {
                kind: 'world-obligation',
                obligationId,
                reason: 'controlling-event',
              },
            ]);
            const report = requireDefined(
              interrupted.campaign?.worldObligationReports[0],
              'Expected the optional world-event report',
            );
            assert.equal(report.obligationId, reportObligationId);
            assert.equal(report.sourceGameSecond, 20);
            assert.equal(report.state, 'generating');
            const [reportHook] = await database.db
              .select()
              .from(campaignReport)
              .where(eq(campaignReport.id, report.id));
            await runtime.complete(
              requireDefined(
                reportHook?.generationId,
                'Expected the optional report generation',
              ),
            );
            const withReport = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(
              withReport.campaign?.worldObligationReports[0]?.state,
              'published',
            );
            assert.deepEqual(withReport.campaign?.holds, [
              {
                kind: 'world-obligation',
                obligationId,
                reason: 'controlling-event',
              },
            ]);
            assert.equal(
              await storyService.advanceCampaignActivity(activityId),
              null,
            );
            const firedEvents = await database.db
              .select()
              .from(worldObligationEvent)
              .where(eq(worldObligationEvent.obligationId, obligationId));
            assert.equal(firedEvents.length, 1);
            assert.equal(firedEvents[0]?.kind, 'fired');
            const [storedObligation] = await database.db
              .select()
              .from(worldObligation)
              .where(eq(worldObligation.id, obligationId));
            assert.equal(storedObligation?.state, 'fired');

            await storyService.prepareCampaignConsequence(obligationId);
            const [consequence] = await database.db
              .select({ generationId: campaignConsequence.generationId })
              .from(campaignConsequence)
              .where(eq(campaignConsequence.operationId, obligationId));
            const generationId = requireDefined(
              consequence?.generationId,
              'Expected the winter consequence generation',
            );
            await runtime.complete(generationId);
            const published = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.deepEqual(published.campaign?.holds, [
              {
                kind: 'decision',
                offerId: published.campaign?.offer?.id,
                reason: 'player-choice',
              },
            ]);
            assert.deepEqual(
              published.campaign?.offer?.nodes.map((node) => node.id),
              ['make-winter-camp'],
            );
            assert.equal(published.campaign?.activity?.id, activityId);
            assert.equal(published.campaign?.activity?.state, 'encounter');
          },
        );
        await t.test(
          'failed preparation preserves the committed outcome and intent-owned clock hold',
          async () => {
            const started = await mechanicalCandidate();
            const offer = requireDefined(
              started.snapshot.campaign?.offer,
              'Expected a generated mechanical offer',
            );
            const action = requireDefined(
              offer.nodes[0],
              'Expected an admitted mechanical action',
            );
            const operationId = randomUUID();
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId,
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: [action.id],
              },
            });
            const [beforeFailure] = await database.db
              .select({
                clock: campaignTable.clock,
                holds: campaignTable.holds,
              })
              .from(campaignTable)
              .where(eq(campaignTable.storyId, started.storyId));
            assert.deepEqual(beforeFailure?.holds, [
              {
                kind: 'storyteller-intent',
                operationId,
                reason: 'required-turn',
              },
            ]);

            // Make the saved receipt stale before its worker prepares a task.
            // The preparation transaction must fail without losing the already
            // committed mechanics or opening a clock-projection gap.
            await database.db
              .update(story)
              .set({ revision: started.snapshot.revision + 1 })
              .where(eq(story.id, started.storyId));
            await assert.rejects(
              storyService.prepareCampaignConsequence(operationId),
              /lost its story revision fence/,
            );

            const [receipt] = await database.db
              .select({
                generationId: gameActionReceipt.generationId,
                outcome: gameActionReceipt.outcome,
                effects: gameActionReceipt.effects,
              })
              .from(gameActionReceipt)
              .where(eq(gameActionReceipt.operationId, operationId));
            const [afterFailure] = await database.db
              .select({
                clock: campaignTable.clock,
                holds: campaignTable.holds,
              })
              .from(campaignTable)
              .where(eq(campaignTable.storyId, started.storyId));
            assert.equal(receipt?.generationId, null);
            assert.ok(receipt?.outcome);
            assert.ok(receipt?.effects);
            assert.deepEqual(afterFailure?.clock, beforeFailure?.clock);
            assert.deepEqual(afterFailure?.holds, beforeFailure?.holds);
          },
        );
        await t.test(
          'Chamber failure holds time until the same generation is retried',
          async () => {
            const started = await mechanicalCandidate();
            const offer = requireDefined(
              started.snapshot.campaign?.offer,
              'Expected a generated mechanical offer',
            );
            const action = requireDefined(
              offer.nodes[0],
              'Expected an admitted mechanical action',
            );
            const controlUrl = `${origin}/api/chamber-tools/stories/${started.storyId}/storyteller-control`;
            const armFailure = await fetch(controlUrl, {
              method: 'PUT',
              headers: {
                cookie,
                origin,
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                action: 'arm-failure',
                expectedRevision: 0,
              }),
            });
            assert.equal(armFailure.status, 200);
            const operationId = randomUUID();
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId,
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: [action.id],
              },
            });
            await restartWorker();
            let failed = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            for (let attempt = 0; attempt < 30; attempt++) {
              if (failed.resolution?.blocker?.recovery === 'retry') break;
              await delay(500);
              failed = await stories.read({
                ownerId,
                storyId: started.storyId,
              });
            }
            const [receipt] = await database.db
              .select({ generationId: gameActionReceipt.generationId })
              .from(gameActionReceipt)
              .where(eq(gameActionReceipt.operationId, operationId));
            const generationId = requireDefined(
              receipt?.generationId,
              'Expected required narration identity',
            );
            assert.deepEqual(failed.campaign?.holds, [
              { kind: 'storyteller', generationId, reason: 'required-turn' },
            ]);
            assert.deepEqual(failed.resolution?.blocker, {
              kind: 'generation',
              recovery: 'retry',
            });
            const controlResponse = await fetch(controlUrl, {
              headers: { cookie },
            });
            assert.equal(controlResponse.status, 200);
            const controlBody = (await controlResponse.json()) as {
              control: {
                state: string;
                generationId: string | null;
              };
            };
            assert.deepEqual(controlBody.control, {
              storyId: started.storyId,
              revision: 2,
              state: 'failed',
              generationId,
            });

            const [heldState] = await database.db
              .select({ clock: campaignTable.clock })
              .from(campaignTable)
              .where(eq(campaignTable.storyId, started.storyId));
            assert.ok(heldState);
            // Simulate a long offline interval while the required scene is blocked.
            // Release must re-anchor, not project this deliberately ancient anchor.
            await database.db
              .update(campaignTable)
              .set({ clockAnchorAt: new Date('2000-01-01T00:00:00.000Z') })
              .where(eq(campaignTable.storyId, started.storyId));

            const retry = await fetch(
              `${origin}/api/stories/${started.storyId}/retries/${randomUUID()}`,
              {
                method: 'PUT',
                headers: { cookie, origin },
              },
            );
            assert.equal(retry.status, 200);
            let recovered = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            for (let attempt = 0; attempt < 30; attempt++) {
              if (
                recovered.resolution === null &&
                recovered.campaign?.actionReceipts[0]?.state === 'published'
              ) {
                break;
              }
              await delay(500);
              recovered = await stories.read({
                ownerId,
                storyId: started.storyId,
              });
            }
            const [releasedState] = await database.db
              .select({ clock: campaignTable.clock })
              .from(campaignTable)
              .where(eq(campaignTable.storyId, started.storyId));
            assert.deepEqual(releasedState?.clock, heldState.clock);

            assert.deepEqual(recovered.campaign?.holds, [
              {
                kind: 'decision',
                offerId: recovered.campaign?.offer?.id,
                reason: 'player-choice',
              },
            ]);
            assert.equal(recovered.resolution, null);
            assert.equal(
              recovered.campaign?.actionReceipts[0]?.state,
              'published',
            );
            const receipts = await database.db
              .select({
                generationId: gameActionReceipt.generationId,
                operationId: gameActionReceipt.operationId,
              })
              .from(gameActionReceipt)
              .where(eq(gameActionReceipt.operationId, operationId));
            assert.deepEqual(receipts, [{ generationId, operationId }]);
          },
        );
        await t.test(
          'early preparation stays private while its finite action is paused',
          async () => {
            const started = await mechanicalCandidate();
            const campaign = requireDefined(
              started.snapshot.campaign,
              'Expected a mechanical campaign',
            );
            const offer = requireDefined(
              campaign.offer,
              'Expected a generated mechanical offer',
            );
            const action = requireDefined(
              offer.nodes[0],
              'Expected an admitted finite action',
            );
            const operationId = randomUUID();
            await restartWorker();
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId,
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: [action.id],
              },
            });

            const control = async (
              expectedRevision: number,
              actionControl: 'pause' | 'resume' | 'pace',
              pace?: { kind: 'instant' },
            ) => {
              const response = await fetch(
                `${origin}/api/stories/${started.storyId}/action-execution-controls/${randomUUID()}`,
                {
                  method: 'PUT',
                  headers: {
                    cookie,
                    origin,
                    'content-type': 'application/json',
                  },
                  body: JSON.stringify({
                    executionId: operationId,
                    expectedRevision,
                    action: actionControl,
                    ...(pace ? { pace } : {}),
                  }),
                },
              );
              assert.equal(response.status, 200);
            };
            await control(0, 'pause');

            let preparationGenerationId: string | null = null;
            let preparationState: string | null = null;
            for (let attempt = 0; attempt < 30; attempt++) {
              const [execution] = await database.db
                .select({
                  preparationGenerationId:
                    gameActionExecution.preparationGenerationId,
                })
                .from(gameActionExecution)
                .where(eq(gameActionExecution.operationId, operationId));
              preparationGenerationId =
                execution?.preparationGenerationId ?? null;
              if (preparationGenerationId) {
                const [prepared] = await database.db
                  .select({ state: generation.state })
                  .from(generation)
                  .where(eq(generation.id, preparationGenerationId));
                preparationState = prepared?.state ?? null;
                if (preparationState === 'succeeded') break;
              }
              await delay(200);
            }
            const generationId = requireDefined(
              preparationGenerationId,
              'Expected an early preparation generation',
            );
            assert.equal(preparationState, 'succeeded');
            const paused = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(paused.revision, started.snapshot.revision);
            assert.equal(paused.campaign?.gameSecond, campaign.gameSecond);
            assert.equal(paused.campaign?.actionExecution?.state, 'paused');
            assert.equal(paused.campaign?.actionReceipts.length, 0);
            assert.equal(paused.resolution?.evidence, 'pending-action');
            assert.equal(paused.resolution?.state, 'succeeded');

            await delay(1100);
            const stillPaused = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(stillPaused.campaign?.gameSecond, campaign.gameSecond);
            assert.equal(
              stillPaused.campaign?.actionExecution?.state,
              'paused',
            );
            assert.equal(stillPaused.campaign?.actionReceipts.length, 0);

            await control(1, 'pace', { kind: 'instant' });
            await control(2, 'resume');
            let published = stillPaused;
            for (let attempt = 0; attempt < 30; attempt++) {
              if (
                published.campaign?.actionReceipts[0]?.state === 'published'
              ) {
                break;
              }
              await delay(200);
              published = await stories.read({
                ownerId,
                storyId: started.storyId,
              });
            }
            assert.equal(
              published.campaign?.gameSecond,
              campaign.gameSecond + 5,
            );
            assert.equal(published.campaign?.actionReceipts.length, 1);
            const [receipt] = await database.db
              .select({ generationId: gameActionReceipt.generationId })
              .from(gameActionReceipt)
              .where(eq(gameActionReceipt.operationId, operationId));
            assert.equal(receipt?.generationId, generationId);
          },
        );
        await t.test(
          'a due world boundary prevents finite-action overlap',
          async () => {
            const obligationId = randomUUID();
            const started = await mechanicalCandidate(
              'pineapple-mechanics.v4',
              { kind: 'rate', fictionalSeconds: 1, realSeconds: 60 },
              {
                worldObligations: [
                  {
                    id: obligationId,
                    revision: 1,
                    source: { id: 'incoming-tide', revision: 1 },
                    label: 'The tide reaches the pineapple',
                    visibility: { kind: 'exact' },
                    consequence: {
                      kind: 'condition.set.v1',
                      condition: {
                        id: 'pineapple-flooded',
                        label: 'Pineapple flooded',
                        value: true,
                      },
                    },
                    followUp: 'controlling-scene',
                    due: { kind: 'game-second', gameSecond: 3 },
                  },
                ],
              },
            );
            const campaign = requireDefined(
              started.snapshot.campaign,
              'Expected a mechanical campaign',
            );
            const offer = requireDefined(
              campaign.offer,
              'Expected a generated mechanical offer',
            );
            const action = requireDefined(
              offer.nodes[0],
              'Expected an admitted finite action',
            );
            const operationId = randomUUID();
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId,
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: [action.id],
              },
            });

            const [admittedExecution] = await database.db
              .select({
                pendingResolution: gameActionExecution.pendingResolution,
                preparationGenerationId:
                  gameActionExecution.preparationGenerationId,
              })
              .from(gameActionExecution)
              .where(eq(gameActionExecution.operationId, operationId));
            assert.equal(admittedExecution?.pendingResolution, null);
            assert.equal(admittedExecution?.preparationGenerationId, null);
            const admitted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(admitted.resolution, null);
            assert.equal(admitted.campaign?.actionReceipts.length, 0);

            await stories.actionExecutionControl({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                executionId: operationId,
                expectedRevision: 0,
                action: 'pace',
                pace: { kind: 'instant' },
              },
            });
            assert.equal(
              await storyService.advanceCampaignAction(operationId),
              null,
            );

            const interrupted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(interrupted.campaign?.gameSecond, 3);
            assert.equal(interrupted.campaign?.actionReceipts.length, 0);
            assert.deepEqual(interrupted.campaign?.holds, [
              {
                kind: 'world-obligation',
                obligationId,
                reason: 'controlling-event',
              },
            ]);
            assert.equal(
              interrupted.campaign?.worldConditions.find(
                (condition) => condition.id === 'pineapple-flooded',
              )?.value,
              true,
            );
            const [storedExecution] = await database.db
              .select({
                state: gameActionExecution.state,
                pendingResolution: gameActionExecution.pendingResolution,
                preparationGenerationId:
                  gameActionExecution.preparationGenerationId,
              })
              .from(gameActionExecution)
              .where(eq(gameActionExecution.operationId, operationId));
            assert.deepEqual(storedExecution, {
              state: 'interrupted',
              pendingResolution: null,
              preparationGenerationId: null,
            });
          },
        );
        await t.test(
          'selecting earned work admits a durable process without paying its reward',
          async () => {
            const started = await mechanicalCandidate('beacon-watch.v1');
            const campaign = requireDefined(
              started.snapshot.campaign,
              'Expected a mechanical campaign',
            );
            const offer = requireDefined(
              campaign.offer,
              'Expected a generated mechanical offer',
            );
            const action = requireDefined(
              offer.nodes[0],
              'Expected the beacon process action',
            );
            assert.deepEqual(campaign.activityAccess, {
              kind: 'selected',
              actionKeys: ['restore-beacon'],
            });
            const operationId = randomUUID();

            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId,
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: [action.id],
              },
            });

            const snapshot = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(snapshot.campaign?.offer, null);
            assert.equal(snapshot.campaign?.activity?.state, 'running');
            assert.deepEqual(snapshot.campaign?.activity?.progress, {
              kind: 'contribution',
              label: 'Beacon repair',
              earned: 0,
              required: 9,
            });
            assert.equal(
              snapshot.campaign?.character?.quantities.find(
                (quantity) => quantity.id === 'harbor-credit',
              )?.value,
              0,
            );
            assert.equal(snapshot.campaign?.actionReceipts.length, 0);

            const [activity] = await database.db
              .select({ id: gameActivity.id, plan: gameActivity.plan })
              .from(gameActivity)
              .where(eq(gameActivity.storyId, started.storyId));
            // The DB column is intentionally JSON at this boundary; production
            // reads parse the full plan before use. Here we only inspect the two
            // admission invariants this integration owns.
            const plan = activity?.plan as {
              version?: unknown;
              action?: { id?: unknown };
            };
            assert.equal(plan.version, 6);
            assert.equal(plan.action?.id, 'restore-beacon');

            const activityId = requireDefined(
              activity?.id,
              'Expected the admitted activity identity',
            );
            const encounterOfferId = randomUUID();
            const encounterPlan = {
              version: 1 as const,
              key: 'bar-the-door',
              label: 'Bar the beacon door',
              intention: 'Secure the entrance until the stranger leaves.',
              risk: null,
              evidence: [],
              requires: [{ id: 'stranger-at-beacon', value: true }],
              requiresStory: [],
              requiresQuantities: [],
              resolution: {
                kind: 'automatic' as const,
                fictionalDurationSeconds: 5,
                outcome: {
                  text: 'You bar the door until the stranger returns to the boat.',
                  effects: [
                    {
                      kind: 'fact.set.v1' as const,
                      fact: { id: 'stranger-at-beacon', value: false },
                    },
                  ],
                  declarations: [],
                },
              },
            };
            await database.db.insert(gameOffer).values({
              id: encounterOfferId,
              storyId: started.storyId,
              narrativeRevision: snapshot.revision,
              plans: [encounterPlan],
            });
            await database.db
              .update(gameActivity)
              .set({
                state: 'encounter',
                boundariesSettled: 1,
                progress: {
                  effortGameSeconds: 5,
                  process: { kind: 'contribution.v1', earned: 3 },
                  completionPending: false,
                },
                plan: { ...plan, resolvedThroughGameSecond: 5 },
              })
              .where(eq(gameActivity.id, activityId));
            await database.db
              .update(campaignTable)
              .set({
                character: {
                  ...requireDefined(
                    snapshot.campaign?.character,
                    'Expected the beacon character',
                  ),
                  facts: requireDefined(
                    snapshot.campaign?.character,
                    'Expected the beacon character',
                  ).facts.map((fact) =>
                    fact.id === 'stranger-at-beacon'
                      ? { ...fact, value: true }
                      : fact,
                  ),
                },
                offer: {
                  id: encounterOfferId,
                  nodes: [
                    {
                      id: encounterPlan.key,
                      parent: null,
                      label: encounterPlan.label,
                      description: encounterPlan.intention,
                      risk: encounterPlan.risk,
                      action: {
                        kind: 'attempt',
                        timing: { kind: 'finite', fictionalSeconds: 5 },
                      },
                    },
                  ],
                },
                situationAuthorization: {
                  version: 2,
                  offerId: encounterOfferId,
                  activityAccess: { kind: 'none' },
                  preparedPlans: [],
                },
              })
              .where(eq(campaignTable.storyId, started.storyId));

            const encounterOperationId = randomUUID();
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: encounterOperationId,
              body: {
                expectedRevision: snapshot.revision,
                offerId: encounterOfferId,
                path: [encounterPlan.key],
              },
            });
            const [afterResponse] = await database.db
              .select({ activeActivityId: campaignTable.activeActivityId })
              .from(campaignTable)
              .where(eq(campaignTable.storyId, started.storyId));
            assert.equal(afterResponse?.activeActivityId, activityId);

            await stories.actionExecutionControl({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                executionId: encounterOperationId,
                expectedRevision: 0,
                action: 'pace',
                pace: { kind: 'instant' },
              },
            });
            assert.equal(
              await storyService.advanceCampaignAction(encounterOperationId),
              null,
            );
            const afterTimedResponse = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(
              afterTimedResponse.campaign?.gameSecond,
              campaign.gameSecond + 5,
            );
            assert.deepEqual(afterTimedResponse.campaign?.activity?.progress, {
              kind: 'contribution',
              label: 'Beacon repair',
              earned: 3,
              required: 9,
            });

            await storyService.prepareCampaignConsequence(encounterOperationId);
            const [receipt] = await database.db
              .select({ generationId: gameActionReceipt.generationId })
              .from(gameActionReceipt)
              .where(eq(gameActionReceipt.operationId, encounterOperationId));
            assert.ok(receipt?.generationId);
            const [capturedTask] = await database.db
              .select({ input: generation.input })
              .from(generation)
              .where(eq(generation.id, receipt.generationId));
            const task = storytellerTaskSchema.parse(capturedTask?.input);
            assert.equal(task.task, 'consequence');
            assert.equal(
              task.context.activitySituation?.activeActivityId,
              activityId,
            );
            assert.deepEqual(
              task.context.activitySituation?.commitments.map((commitment) => ({
                id: commitment.activityId,
                state: commitment.state,
                progress: commitment.progress,
              })),
              [
                {
                  id: activityId,
                  state: 'encounter',
                  progress: {
                    kind: 'contribution',
                    label: 'Beacon repair',
                    earned: 3,
                    required: 9,
                  },
                },
              ],
            );
            await runtime.complete(receipt.generationId);
            const afterNarration = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const resumeOffer = requireDefined(
              afterNarration.campaign?.offer,
              'Expected the fixture storyteller to offer the retained work',
            );
            assert.deepEqual(
              resumeOffer.nodes.map((node) => node.id),
              ['resume-beacon-repair', 'secure-repair-tools'],
            );
            assert.deepEqual(afterNarration.campaign?.activityAccess, {
              kind: 'selected',
              actionKeys: ['resume-beacon-repair', 'secure-repair-tools'],
            });
            const [savedResumeOffer] = await database.db
              .select({ plans: gameOffer.plans })
              .from(gameOffer)
              .where(eq(gameOffer.id, resumeOffer.id));
            const savedPlans = savedResumeOffer?.plans as Array<{
              key?: string;
              resolution?: {
                kind?: string;
                activityId?: string;
                activityRevision?: number;
              };
            }>;
            const savedResume = savedPlans.find(
              (candidate) => candidate.key === 'resume-beacon-repair',
            );
            assert.deepEqual(savedResume?.resolution, {
              kind: 'resume',
              activityActionId: 'restore-beacon',
              activityId,
              activityRevision: 0,
            });

            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: afterNarration.revision,
                offerId: resumeOffer.id,
                path: ['secure-repair-tools'],
              },
            });
            const commitments = await database.db
              .select({ id: gameActivity.id, state: gameActivity.state })
              .from(gameActivity)
              .where(eq(gameActivity.storyId, started.storyId));
            assert.deepEqual(
              commitments.map((commitment) => commitment.state).sort(),
              ['running', 'suspended'],
            );
            const diversion = requireDefined(
              commitments.find((commitment) => commitment.id !== activityId),
              'Expected a second activity identity',
            );
            const admittedDiversion = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const diversionView = requireDefined(
              admittedDiversion.campaign?.activity,
              'Expected the diversion to be active',
            );
            await storyService.campaignControl({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                activityId: diversion.id,
                expectedRevision: diversionView.revision,
                action: 'pace',
                pace: { kind: 'instant' },
              },
            });
            const paced = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            if (paced.campaign?.activity?.state === 'running') {
              await storyService.advanceCampaignActivity(diversion.id);
            }
            const quietCompletion = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(quietCompletion.campaign?.activity?.state, 'complete');
            const freshResumeOffer = requireDefined(
              quietCompletion.campaign?.offer,
              'Expected quiet completion to restore authored work',
            );
            assert.deepEqual(
              freshResumeOffer.nodes.map((node) => node.id),
              ['resume-beacon-repair'],
            );
            const narratedDiversion = await database.db
              .select({ operationId: campaignConsequence.operationId })
              .from(campaignConsequence)
              .where(eq(campaignConsequence.operationId, diversion.id));
            assert.equal(narratedDiversion.length, 0);

            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: quietCompletion.revision,
                offerId: freshResumeOffer.id,
                path: ['resume-beacon-repair'],
              },
            });
            const resumed = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(resumed.campaign?.activity?.id, activityId);
            assert.equal(resumed.campaign?.activity?.state, 'running');
            assert.equal(
              resumed.campaign?.activity?.progress.kind === 'contribution'
                ? resumed.campaign.activity.progress.earned
                : null,
              3,
            );
            assert.equal(
              (
                await database.db
                  .select({ id: gameActivity.id })
                  .from(gameActivity)
                  .where(eq(gameActivity.storyId, started.storyId))
              ).length,
              2,
            );
          },
        );
        await t.test(
          'routine activity progress does not manufacture narrative passages',
          async () => {
            const started = await mechanicalCandidate('beacon-watch.v1', {
              kind: 'rate',
              fictionalSeconds: 5,
              realSeconds: 100,
            });
            const offer = requireDefined(
              started.snapshot.campaign?.offer,
              'Expected the beacon offer',
            );
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: ['restore-beacon'],
              },
            });
            const admitted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const activityId = requireDefined(
              admitted.campaign?.activity?.id,
              'Expected admitted beacon work',
            );
            const [passagesBefore] = await database.db
              .select({ count: orm.count() })
              .from(storyPassage)
              .where(eq(storyPassage.storyId, started.storyId));
            await database.db
              .update(campaignTable)
              .set({ clockAnchorAt: new Date(Date.now() - 101_000) })
              .where(eq(campaignTable.storyId, started.storyId));

            const nextWakeMs =
              await storyService.advanceCampaignActivity(activityId);
            const advanced = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const [passagesAfter] = await database.db
              .select({ count: orm.count() })
              .from(storyPassage)
              .where(eq(storyPassage.storyId, started.storyId));
            const [storedActivity] = await database.db
              .select({ boundariesSettled: gameActivity.boundariesSettled })
              .from(gameActivity)
              .where(eq(gameActivity.id, activityId));

            assert.notEqual(nextWakeMs, null);
            assert.equal(advanced.campaign?.activity?.state, 'running');
            assert.equal(storedActivity?.boundariesSettled, 1);
            assert.equal(advanced.campaign?.rolls.length, 1);
            assert.equal(advanced.revision, admitted.revision);
            assert.equal(advanced.viewVersion, admitted.viewVersion + 1);
            assert.equal(advanced.current.id, admitted.current.id);
            assert.equal(passagesAfter?.count, passagesBefore?.count);
            assert.deepEqual(
              advanced.campaign?.activityEvents.map((event) => event.kind),
              ['started'],
            );
          },
        );
        await t.test(
          'boundary prerequisites block work before another attempt or reward',
          async () => {
            const started = await mechanicalCandidate('beacon-watch.v1');
            const offer = requireDefined(
              started.snapshot.campaign?.offer,
              'Expected the beacon offer',
            );
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: ['restore-beacon'],
              },
            });
            const admitted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const activityId = requireDefined(
              admitted.campaign?.activity?.id,
              'Expected admitted beacon work',
            );
            const character = requireDefined(
              admitted.campaign?.character,
              'Expected the beacon character',
            );
            await database.db
              .update(campaignTable)
              .set({
                character: {
                  ...character,
                  facts: character.facts.map((fact) =>
                    fact.id === 'repair-tools'
                      ? { ...fact, value: false }
                      : fact,
                  ),
                },
              })
              .where(eq(campaignTable.storyId, started.storyId));

            assert.equal(
              await storyService.advanceCampaignActivity(activityId),
              null,
            );
            const blocked = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(blocked.campaign?.activity?.id, activityId);
            assert.equal(blocked.campaign?.activity?.state, 'blocked');
            assert.deepEqual(blocked.campaign?.activity?.progress, {
              kind: 'contribution',
              label: 'Beacon repair',
              earned: 0,
              required: 9,
            });
            assert.equal(blocked.campaign?.rolls.length, 0);
            assert.deepEqual(
              blocked.campaign?.activityEvents.map((event) => event.kind),
              ['blocked', 'started'],
            );
            assert.equal(
              blocked.campaign?.character?.quantities.find(
                (quantity) => quantity.id === 'harbor-credit',
              )?.value,
              0,
            );
            assert.equal(
              await storyService.advanceCampaignActivity(activityId),
              null,
            );
            const blockedFollowUp = await database.db
              .select({
                operationId: campaignConsequence.operationId,
                generationId: campaignConsequence.generationId,
              })
              .from(campaignConsequence)
              .where(eq(campaignConsequence.operationId, activityId));
            assert.equal(blockedFollowUp.length, 1);
            assert.equal(blockedFollowUp[0]?.generationId, null);

            await storyService.prepareCampaignConsequence(activityId);
            const [preparedFollowUp] = await database.db
              .select({ generationId: campaignConsequence.generationId })
              .from(campaignConsequence)
              .where(eq(campaignConsequence.operationId, activityId));
            const generationId = requireDefined(
              preparedFollowUp?.generationId,
              'Expected the blocked activity consequence to be prepared',
            );
            const [preparedGeneration] = await database.db
              .select({ input: generation.input })
              .from(generation)
              .where(eq(generation.id, generationId));
            const preparedInput = preparedGeneration?.input as {
              context?: { resolution?: { offer?: unknown } };
            };
            assert.equal(preparedInput.context?.resolution?.offer, null);
            const blockedAfterReplay = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.deepEqual(
              blockedAfterReplay.campaign?.activityEvents.map(
                (event) => event.kind,
              ),
              ['blocked', 'started'],
            );
          },
        );
        await t.test(
          'accepted finite plan starts each authorized successor without generation',
          async () => {
            const started = await mechanicalCandidate('microbe.v3', {
              kind: 'instant',
            });
            const [generationCountBefore] = await database.db
              .select({ count: orm.count() })
              .from(generation);
            const offer = requireDefined(
              started.snapshot.campaign?.offer,
              'Expected the microbe opening offer',
            );
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: ['sample-gradient-cycle'],
                successorPaths: [
                  ['hold-temperature-cycle'],
                  ['hold-pressure-cycle'],
                ],
                horizonGameSeconds: 20,
              },
            });
            const admitted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const firstActivityId = requireDefined(
              admitted.campaign?.activity?.id,
              'Expected the first accepted activity',
            );
            assert.deepEqual(
              admitted.campaign?.acceptedActivityPlan?.entries.map((entry) => [
                entry.label,
                entry.state,
              ]),
              [
                ['Sample the gradient briefly', 'running'],
                ['Hold through a temperature cycle', 'pending'],
                ['Hold through a pressure cycle', 'pending'],
              ],
            );
            await storyService.advanceCampaignActivity(firstActivityId);
            const advanced = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const successorId = requireDefined(
              advanced.campaign?.activity?.id,
              'Expected the accepted successor activity',
            );
            assert.notEqual(successorId, firstActivityId);
            assert.equal(advanced.campaign?.activity?.state, 'running');
            assert.deepEqual(
              advanced.campaign?.acceptedActivityPlan?.entries.map((entry) => [
                entry.state,
                entry.activityId,
              ]),
              [
                ['complete', firstActivityId],
                ['running', successorId],
                ['pending', null],
              ],
            );
            await storyService.advanceCampaignActivity(successorId);
            const advancedAgain = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const finalActivityId = requireDefined(
              advancedAgain.campaign?.activity?.id,
              'Expected the final accepted activity',
            );
            assert.notEqual(finalActivityId, successorId);
            await storyService.advanceCampaignActivity(finalActivityId);
            const completed = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(
              completed.campaign?.acceptedActivityPlan?.state,
              'complete',
            );
            assert.deepEqual(
              completed.campaign?.acceptedActivityPlan?.entries.map(
                (entry) => entry.state,
              ),
              ['complete', 'complete', 'complete'],
            );
            assert.equal(completed.campaign?.rolls.length, 0);
            assert.equal(completed.campaign?.activityReports.length, 0);
            const [generationCount] = await database.db
              .select({ count: orm.count() })
              .from(generation);
            assert.equal(generationCount?.count, generationCountBefore?.count);
          },
        );
        await t.test(
          'scene handoff requires explicit player re-entry into an accepted plan',
          async () => {
            const started = await mechanicalCandidate('beacon-watch.v1', {
              kind: 'instant',
            });
            const offer = requireDefined(
              started.snapshot.campaign?.offer,
              'Expected the beacon opening offer',
            );
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: ['observe-harbor-shift'],
                successorPaths: [['keep-harbor-watch']],
                horizonGameSeconds: 20,
              },
            });
            const admitted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const firstActivityId = requireDefined(
              admitted.campaign?.activity?.id,
              'Expected the observation activity',
            );
            await storyService.advanceCampaignActivity(firstActivityId);
            const awaitingScene = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(awaitingScene.campaign?.activity, null);
            assert.equal(
              awaitingScene.campaign?.acceptedActivityPlan?.state,
              'blocked',
            );
            assert.deepEqual(
              awaitingScene.campaign?.acceptedActivityPlan?.entries.map(
                (entry) => [entry.state, entry.activityId],
              ),
              [
                ['complete', firstActivityId],
                ['blocked', null],
              ],
            );

            const [captured] = await database.db
              .select({ input: generation.input })
              .from(generation)
              .where(eq(generation.id, firstActivityId));
            const task = storytellerTaskSchema.parse(captured?.input);
            assert.equal(
              task.context.activitySituation?.acceptedPlan?.nextEntry.plan.key,
              'keep-harbor-watch',
            );
            await runtime.complete(firstActivityId);
            const handedBack = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const handoffOffer = requireDefined(
              handedBack.campaign?.offer,
              'Expected an explicit Storyteller handoff offer',
            );
            assert.deepEqual(
              handoffOffer.nodes.map((node) => node.id),
              ['keep-harbor-watch'],
            );
            assert.equal(handedBack.campaign?.activity, null);
            assert.equal(
              handedBack.campaign?.acceptedActivityPlan?.state,
              'blocked',
            );

            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: handedBack.revision,
                offerId: handoffOffer.id,
                path: ['keep-harbor-watch'],
              },
            });
            const reentered = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const successorId = requireDefined(
              reentered.campaign?.activity?.id,
              'Expected the explicitly selected successor',
            );
            assert.equal(
              reentered.campaign?.acceptedActivityPlan?.state,
              'active',
            );
            assert.deepEqual(
              reentered.campaign?.acceptedActivityPlan?.entries.map((entry) => [
                entry.state,
                entry.activityId,
              ]),
              [
                ['complete', firstActivityId],
                ['running', successorId],
              ],
            );
            await storyService.advanceCampaignActivity(successorId);
            const completed = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(
              completed.campaign?.acceptedActivityPlan?.state,
              'complete',
            );
            assert.equal(completed.campaign?.activityReports.length, 0);
          },
        );
        await t.test(
          'accepted horizon prevents a later activity from starting',
          async () => {
            const started = await mechanicalCandidate('microbe.v3', {
              kind: 'instant',
            });
            const offer = requireDefined(
              started.snapshot.campaign?.offer,
              'Expected the microbe opening offer',
            );
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: ['sample-gradient-cycle'],
                successorPaths: [['hold-temperature-cycle']],
                horizonGameSeconds: 1,
              },
            });
            const admitted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const firstActivityId = requireDefined(
              admitted.campaign?.activity?.id,
              'Expected the first accepted activity',
            );
            const acceptedPlan = requireDefined(
              admitted.campaign?.acceptedActivityPlan,
              'Expected the accepted plan horizon',
            );
            assert.equal(
              acceptedPlan.horizonGameSecond,
              acceptedPlan.acceptedAtGameSecond + 1,
            );
            await storyService.advanceCampaignActivity(firstActivityId);
            const stopped = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(
              stopped.campaign?.acceptedActivityPlan?.state,
              'horizon-reached',
            );
            assert.deepEqual(
              stopped.campaign?.acceptedActivityPlan?.entries.map((entry) => [
                entry.state,
                entry.activityId,
              ]),
              [
                ['complete', firstActivityId],
                ['cancelled', null],
              ],
            );
            assert.match(
              stopped.campaign?.acceptedActivityPlan?.blockedReason ?? '',
              /reached its gameSecond .* horizon/,
            );
            const activities = await database.db
              .select({ id: gameActivity.id })
              .from(gameActivity)
              .where(eq(gameActivity.storyId, started.storyId));
            assert.deepEqual(activities, [{ id: firstActivityId }]);
          },
        );
        await t.test(
          'changed prerequisites block the accepted successor without starting it',
          async () => {
            const started = await mechanicalCandidate('microbe.v3', {
              kind: 'instant',
            });
            const offer = requireDefined(
              started.snapshot.campaign?.offer,
              'Expected the microbe opening offer',
            );
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: ['wait-contracted'],
                successorPaths: [['hold-temperature-cycle']],
                horizonGameSeconds: 20,
              },
            });
            const admitted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const firstActivityId = requireDefined(
              admitted.campaign?.activity?.id,
              'Expected the first accepted activity',
            );
            await storyService.advanceCampaignActivity(firstActivityId);
            const blocked = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(blocked.campaign?.activity, null);
            assert.equal(
              blocked.campaign?.acceptedActivityPlan?.state,
              'blocked',
            );
            assert.deepEqual(
              blocked.campaign?.acceptedActivityPlan?.entries.map((entry) => [
                entry.state,
                entry.activityId,
              ]),
              [
                ['complete', firstActivityId],
                ['blocked', null],
              ],
            );
            assert.match(
              blocked.campaign?.acceptedActivityPlan?.blockedReason ?? '',
              /no longer authorized or mechanically eligible/,
            );
            assert.equal(blocked.campaign?.activityReports.length, 1);
            assert.equal(blocked.campaign?.rolls.length, 0);
            assert.deepEqual(
              blocked.campaign?.activityEvents.map((event) => event.kind),
              ['completed', 'started'],
            );
            const activities = await database.db
              .select({ id: gameActivity.id })
              .from(gameActivity)
              .where(eq(gameActivity.storyId, started.storyId));
            assert.deepEqual(activities, [{ id: firstActivityId }]);
          },
        );
        await t.test(
          'cancelling pending plan entries leaves current work running',
          async () => {
            const started = await mechanicalCandidate('microbe.v3', {
              kind: 'instant',
            });
            const offer = requireDefined(
              started.snapshot.campaign?.offer,
              'Expected the microbe opening offer',
            );
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: ['sample-gradient-cycle'],
                successorPaths: [['hold-temperature-cycle']],
                horizonGameSeconds: 20,
              },
            });
            const admitted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const currentActivityId = requireDefined(
              admitted.campaign?.activity?.id,
              'Expected current accepted work',
            );
            const accepted = requireDefined(
              admitted.campaign?.acceptedActivityPlan,
              'Expected the accepted activity plan',
            );
            await stories.acceptedPlanControl({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                planId: accepted.id,
                expectedRevision: accepted.revision,
                action: 'cancel-pending',
              },
            });
            const cancelled = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(cancelled.campaign?.activity?.id, currentActivityId);
            assert.equal(cancelled.campaign?.activity?.state, 'running');
            assert.deepEqual(
              cancelled.campaign?.acceptedActivityPlan?.entries.map(
                (entry) => entry.state,
              ),
              ['running', 'cancelled'],
            );
            await storyService.advanceCampaignActivity(currentActivityId);
            const completed = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(completed.campaign?.activity?.id, currentActivityId);
            assert.equal(completed.campaign?.activity?.state, 'complete');
            assert.equal(
              completed.campaign?.acceptedActivityPlan?.state,
              'cancelled',
            );
            assert.deepEqual(
              completed.campaign?.activityEvents.map((event) => event.kind),
              ['completed', 'started'],
            );
          },
        );
        await t.test(
          'Seyda warehouse shift advances thirty fictional minutes and pays once',
          async () => {
            const started = await mechanicalCandidate('seyda-neen-arrival.v1', {
              kind: 'instant',
            });
            const offer = requireDefined(
              started.snapshot.campaign?.offer,
              'Expected the Seyda opening offer',
            );
            const shift = requireDefined(
              offer.nodes.find((node) => node.id === 'work-warehouse-shift'),
              'Expected the warehouse shift option',
            );
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: [shift.id],
              },
            });
            const admitted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const activityId = requireDefined(
              admitted.campaign?.activity?.id,
              'Expected the admitted warehouse shift',
            );
            await storyService.advanceCampaignActivity(activityId);
            const completed = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(completed.campaign?.activity?.state, 'complete');
            assert.deepEqual(completed.campaign?.activity?.progress, {
              kind: 'wait',
              label: 'Warehouse work completed',
              elapsedFictionalSeconds: 1_800,
              requiredFictionalSeconds: 1_800,
            });
            assert.equal(completed.campaign?.gameSecond, 1_800);
            assert.equal(
              completed.campaign?.character?.quantities.find(
                (quantity) => quantity.id === 'septims',
              )?.value,
              6,
            );
            assert.equal(
              completed.campaign?.character?.facts.find(
                (fact) => fact.id === 'warehouse-shift-available',
              )?.value,
              false,
            );
            assert.equal(
              await storyService.advanceCampaignActivity(activityId),
              null,
            );
            const replayed = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(
              replayed.campaign?.character?.quantities.find(
                (quantity) => quantity.id === 'septims',
              )?.value,
              6,
            );
            assert.equal(replayed.campaign?.gameSecond, 1_800);
          },
        );
        await t.test(
          'clock wait completes from eligible time without rolling or earning work points',
          async () => {
            const started = await mechanicalCandidate('microbe.v3', {
              kind: 'instant',
            });
            const offer = requireDefined(
              started.snapshot.campaign?.offer,
              'Expected the microbe opening offer',
            );
            const wait = requireDefined(
              offer.nodes.find((node) => node.id === 'wait-contracted'),
              'Expected an authored wait option',
            );
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: [wait.id],
              },
            });
            const admitted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const activityId = requireDefined(
              admitted.campaign?.activity?.id,
              'Expected the admitted wait activity',
            );
            await storyService.advanceCampaignActivity(activityId);
            const completed = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(completed.campaign?.activity?.state, 'complete');
            assert.deepEqual(completed.campaign?.activity?.progress, {
              kind: 'wait',
              label: 'Protective interval',
              elapsedFictionalSeconds: 10,
              requiredFictionalSeconds: 10,
            });
            assert.equal(completed.campaign?.gameSecond, 10);
            assert.equal(completed.campaign?.rolls.length, 0);
            assert.equal(completed.campaign?.activityReports.length, 1);
            assert.equal(
              completed.campaign?.activityReports[0]?.state,
              'generating',
            );
            assert.equal(
              completed.campaign?.character?.facts.find(
                (fact) => fact.id === 'exposed',
              )?.value,
              false,
            );
            assert.equal(
              await storyService.advanceCampaignActivity(activityId),
              null,
            );
            const duplicate = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(duplicate.revision, completed.revision);
            assert.equal(duplicate.campaign?.gameSecond, 10);
            assert.equal(duplicate.campaign?.rolls.length, 0);
            assert.deepEqual(
              duplicate.campaign?.activityEvents.map((event) => event.kind),
              ['completed', 'started'],
            );

            const [reportHook] = await database.db
              .select()
              .from(campaignReport)
              .where(eq(campaignReport.storyId, started.storyId));
            const reportGenerationId = requireDefined(
              reportHook?.generationId,
              'Expected a report generation bound to the completed wait',
            );
            const sourceRevision = duplicate.revision;
            const sourceViewVersion = duplicate.viewVersion;
            const sourcePassageId = duplicate.current.id;
            const sourceOfferId = duplicate.campaign?.offer?.id;
            await runtime.complete(reportGenerationId);
            const reported = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(reported.revision, sourceRevision);
            assert.equal(reported.viewVersion, sourceViewVersion + 1);
            assert.equal(reported.current.id, sourcePassageId);
            assert.equal(reported.campaign?.offer?.id, sourceOfferId);
            assert.equal(
              reported.campaign?.activityReports[0]?.state,
              'published',
            );
            assert.equal(
              reported.campaign?.activityReports[0]?.report?.paragraphs[0],
              'The disturbance passes while the organism remains contracted.',
            );
            await runtime.complete(reportGenerationId);
            const replayedReport = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(replayedReport.viewVersion, reported.viewVersion);
            assert.equal(replayedReport.revision, reported.revision);

            let repeatSnapshot = replayedReport;
            const repeatedIds: string[] = [];
            for (let cycle = 0; cycle < 2; cycle++) {
              const repeatOffer = requireDefined(
                repeatSnapshot.campaign?.offer,
                'Expected the repeatable sampling opportunity',
              );
              assert.deepEqual(
                repeatOffer.nodes.map((node) => node.id),
                ['sample-gradient-cycle'],
              );
              await stories.campaignAction({
                ownerId,
                storyId: started.storyId,
                operationId: randomUUID(),
                body: {
                  expectedRevision: repeatSnapshot.revision,
                  offerId: repeatOffer.id,
                  path: ['sample-gradient-cycle'],
                },
              });
              const admittedRepeat = await stories.read({
                ownerId,
                storyId: started.storyId,
              });
              const repeatedId = requireDefined(
                admittedRepeat.campaign?.activity?.id,
                'Expected a fresh repeat activity',
              );
              repeatedIds.push(repeatedId);
              await storyService.advanceCampaignActivity(repeatedId);
              repeatSnapshot = await stories.read({
                ownerId,
                storyId: started.storyId,
              });
              assert.equal(
                repeatSnapshot.campaign?.activity?.state,
                'complete',
              );
            }
            assert.notEqual(repeatedIds[0], repeatedIds[1]);
            assert.equal(repeatSnapshot.campaign?.gameSecond, 14);
            assert.equal(repeatSnapshot.campaign?.rolls.length, 0);
            assert.deepEqual(
              repeatSnapshot.campaign?.offer?.nodes.map((node) => node.id),
              [],
            );
            assert.deepEqual(
              repeatSnapshot.campaign?.activityEvents.map(
                (event) => event.kind,
              ),
              [
                'completed',
                'started',
                'completed',
                'started',
                'completed',
                'started',
              ],
            );
            const [occurrenceState] = await database.db
              .select({
                activityOccurrences: campaignTable.activityOccurrences,
              })
              .from(campaignTable)
              .where(eq(campaignTable.storyId, started.storyId));
            assert.deepEqual(occurrenceState?.activityOccurrences, [
              { scopeKey: 'microbe-gradient-samples', completed: 2 },
            ]);
          },
        );
        await t.test(
          'failed optional reporting preserves the factual result and current authority',
          async () => {
            const started = await mechanicalCandidate('microbe.v3', {
              kind: 'instant',
            });
            const offer = requireDefined(
              started.snapshot.campaign?.offer,
              'Expected the microbe opening offer',
            );
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId: randomUUID(),
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: ['wait-contracted'],
              },
            });
            const admitted = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const activityId = requireDefined(
              admitted.campaign?.activity?.id,
              'Expected the reportable wait activity',
            );
            await storyService.advanceCampaignActivity(activityId);
            const completed = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            const [hook] = await database.db
              .select()
              .from(campaignReport)
              .where(eq(campaignReport.storyId, started.storyId));
            const generationId = requireDefined(
              hook?.generationId,
              'Expected a bound report generation',
            );
            const failingRuntime = createStorytellerRuntime(database, {
              scriptedSource: (task) =>
                task.task === 'report' ? {} : scriptedStorytellerResult(task),
            });
            await failingRuntime.complete(generationId);
            const unavailable = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(unavailable.revision, completed.revision);
            assert.equal(unavailable.viewVersion, completed.viewVersion + 1);
            assert.equal(unavailable.current.id, completed.current.id);
            assert.equal(
              unavailable.campaign?.activityReports[0]?.state,
              'unavailable',
            );
            assert.equal(
              unavailable.campaign?.activityReports[0]?.factualSummary,
              'The disturbance passes while the organism remains contracted.',
            );
            assert.equal(
              unavailable.campaign?.activityReports[0]?.report,
              null,
            );
          },
        );
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
        await t.test(
          'concurrent reservations obey a shared cap and duplicate settlement is harmless',
          async () => {
            const accountId = randomUUID();
            const runId = randomUUID();
            await database.db.insert(storytellerFunding).values({
              id: accountId,
              limitMicrousd: 1000n,
              stopped: false,
              verifiedAt: new Date(),
            });
            await database.db.insert(storytellerRun).values({
              id: runId,
              accountId,
              limitMicrousd: 1000n,
              maxAttempts: 3,
              enabled: true,
            });
            const execution = {
              mode: 'provider' as const,
              accountId,
              runId,
              dispatchReview: { mode: 'hold' as const },
              policy: {
                version: 'fake',
                route: 'fake:economy',
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
            const [sourceGeneration] = await database.db
              .select()
              .from(generation)
              .where(eq(generation.id, first.generationId));
            assert.ok(sourceGeneration);
            const sourceTask = storytellerTaskSchema.parse(
              sourceGeneration.input,
            );
            const resources = resourcesForEffectiveUsagePolicy(
              execution,
              createTestUsagePolicy(execution.policy.route, [
                {
                  id: 'account-cost-burst',
                  version: 1,
                  scope: 'account',
                  metric: 'microusd',
                  limit: '150',
                  window: { kind: 'rolling', durationSeconds: 3600 },
                },
              ]),
            );
            const ids = [randomUUID(), randomUUID()];
            const results = await Promise.allSettled(
              ids.map((id) =>
                budget.reserve({
                  id,
                  generationId: first.generationId,
                  ownerId,
                  task: {
                    ...sourceTask,
                    execution,
                    resources,
                  },
                }),
              ),
            );
            assert.equal(
              results.filter((result) => result.status === 'fulfilled').length,
              1,
            );
            const allocations = await database.db
              .select()
              .from(storytellerUsageAllocation);
            assert.equal(allocations.length, 1);
            assert.equal(allocations[0]?.reserved, 102n);
            const [reservedOperation] = await database.db
              .select()
              .from(storytellerOperation)
              .where(eq(storytellerOperation.generationId, first.generationId));
            assert.equal(reservedOperation?.reservedRounds, 1);
            assert.equal(reservedOperation?.dispatchedRounds, 0);
            assert.equal(reservedOperation?.reservedMicrousd, 102n);
            const winner =
              ids[results.findIndex((result) => result.status === 'fulfilled')];
            assert.ok(winner);
            assert.equal(
              (await budget.inspect(accountId)).reservedMicrousd,
              102n,
            );
            assert.equal(await budget.dispatch(winner, execution, true), true);
            assert.equal(await budget.dispatch(winner, execution, true), false);
            const settlement = {
              id: winner,
              execution,
              usage: fakeUsage(80n),
              telemetry: fakeTelemetry('fake-settled'),
            };
            await budget.settle(settlement);
            await budget.settle(settlement);
            const [settledAllocation] = await database.db
              .select()
              .from(storytellerUsageAllocation);
            assert.equal(settledAllocation?.state, 'settled');
            assert.equal(settledAllocation?.consumed, 80n);
            assert.equal(
              (await budget.inspect(accountId)).settledMicrousd,
              80n,
            );
            assert.equal(
              (await budget.inspect(accountId)).reservedMicrousd,
              0n,
            );
            const [completedOperation] = await database.db
              .select()
              .from(storytellerOperation)
              .where(eq(storytellerOperation.generationId, first.generationId));
            assert.equal(completedOperation?.state, 'complete');
            assert.equal(completedOperation?.reservedRounds, 0);
            assert.equal(completedOperation?.dispatchedRounds, 1);
            assert.equal(completedOperation?.reservedMicrousd, 0n);
            assert.equal(completedOperation?.consumedMicrousd, 80n);
            await assert.rejects(
              budget.reserve({
                id: randomUUID(),
                generationId: first.generationId,
                ownerId,
                task: {
                  ...sourceTask,
                  execution,
                  resources,
                },
              }),
              { code: 'budget_unavailable' },
            );
          },
        );
        await t.test(
          'multiple dispatch slices consume one operation envelope',
          async () => {
            const accountId = randomUUID();
            const runId = randomUUID();
            const generationId = randomUUID();
            await database.db.insert(storytellerFunding).values({
              id: accountId,
              limitMicrousd: 1000n,
              stopped: false,
              verifiedAt: new Date(),
            });
            await database.db.insert(storytellerRun).values({
              id: runId,
              accountId,
              limitMicrousd: 1000n,
              maxAttempts: 3,
              enabled: true,
            });
            const execution = {
              mode: 'provider' as const,
              accountId,
              runId,
              dispatchReview: { mode: 'off' as const },
              policy: {
                version: 'fake',
                route: 'fake:economy',
                model: 'fake/model',
                provider: 'fake',
                priceVersion: 'multi-round-test',
                inputMicrousdPerMillion: '1000',
                outputMicrousdPerMillion: '1000',
                maxInputTokens: 100000,
                maxOutputTokens: 2000,
                timeoutMs: 1000,
              },
            };
            const [sourceGeneration] = await database.db
              .select()
              .from(generation)
              .where(eq(generation.id, first.generationId));
            assert.ok(sourceGeneration);
            const sourceTask = storytellerTaskSchema.parse(
              sourceGeneration.input,
            );
            const policy = createTestUsagePolicy(execution.policy.route, [], {
              maxModelRoundsPerOperation: 2,
              maxReadsPerOperation: 2,
              maxRetainedReadBytes: 4096,
            });
            const resources = resourcesForEffectiveUsagePolicy(
              execution,
              policy,
              { posture: 'minimal' },
            );
            const task = storytellerTaskSchema.parse({
              ...sourceTask,
              execution,
              resources,
            });
            await database.db.insert(generation).values({
              id: generationId,
              ownerId,
              kind: sourceGeneration.kind,
              input: task,
            });
            const budget = createStorytellerBudget(database);
            const slice = {
              request: task.request,
              maxSerializedRequestBytes:
                resources.envelope.maxSerializedRequestBytes,
              maxInputTokens: 50000,
              maxGeneratedTokens: 500,
              maxReasoningTokens: 0,
            };
            const firstAttempt = randomUUID();
            await budget.reserve({
              id: firstAttempt,
              generationId,
              ownerId,
              task,
              dispatch: slice,
            });
            assert.equal(
              await budget.dispatch(firstAttempt, execution, true),
              true,
            );
            await budget.settle({
              id: firstAttempt,
              execution,
              usage: fakeUsage(10n),
              telemetry: fakeTelemetry('fake-round-one'),
              operationOutcome: 'continue',
            });
            const secondAttempt = randomUUID();
            await budget.reserve({
              id: secondAttempt,
              generationId,
              ownerId,
              task,
              dispatch: slice,
            });
            assert.equal(
              await budget.dispatch(secondAttempt, execution, true),
              true,
            );
            await budget.settle({
              id: secondAttempt,
              execution,
              usage: fakeUsage(10n),
              telemetry: fakeTelemetry('fake-round-two'),
              operationOutcome: 'complete',
            });
            const [completed] = await database.db
              .select()
              .from(storytellerOperation)
              .where(eq(storytellerOperation.generationId, generationId));
            assert.equal(completed?.state, 'complete');
            assert.equal(completed?.dispatchedRounds, 2);
            assert.equal(completed?.consumedMicrousd, 20n);
            assert.equal(completed?.consumedInputTokens, 40);
            assert.equal(completed?.consumedGeneratedTokens, 20);
          },
        );
        await t.test(
          'memory exploration uses reviewed provider attempts and settles its final round',
          async () => {
            const accountId = randomUUID();
            const runId = randomUUID();
            const generationId = randomUUID();
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
              maxAttempts: 20,
              enabled: true,
            });
            const execution: ExecutionPolicy = {
              mode: 'provider',
              accountId,
              runId,
              dispatchReview: { mode: 'hold' },
              policy: {
                version: 'fake',
                route: 'fake:memory',
                model: 'fake/model',
                provider: 'fake',
                priceVersion: 'memory-round-test',
                inputMicrousdPerMillion: '1000',
                outputMicrousdPerMillion: '1000',
                maxInputTokens: 100000,
                maxOutputTokens: 2000,
                timeoutMs: 1000,
              },
            };
            const [sourceGeneration] = await database.db
              .select()
              .from(generation)
              .where(eq(generation.id, first.generationId));
            assert.ok(sourceGeneration);
            const sourceTask = storytellerTaskSchema.parse(
              sourceGeneration.input,
            );
            const policy = createTestUsagePolicy(execution.policy.route, [], {
              maxModelRoundsPerOperation: 2,
              maxReadsPerOperation: 1,
              maxRetainedReadBytes: 4096,
            });
            const task = storytellerTaskSchema.parse({
              ...sourceTask,
              execution,
              resources: resourcesForEffectiveUsagePolicy(execution, policy, {
                posture: 'minimal',
              }),
            });
            await database.db.insert(generation).values({
              id: generationId,
              ownerId,
              kind: sourceGeneration.kind,
              input: task,
            });
            const initialSnapshot: MemoryExplorationSnapshot = {
              format: 'offscreen.memory-exploration-snapshot.v1',
              storyId:
                'storyId' in task.source
                  ? task.source.storyId
                  : task.source.draftId,
              rootHash: 'a'.repeat(64),
              rootRevision: 1,
              readsUsed: 0,
              retainedBytes: 0,
              readyDecisions: 0,
              memoryHandles: [],
              sourceHandles: [],
              rounds: [],
            };
            const createExplorer = (saved?: MemoryExplorationSnapshot) => ({
              execute: async () => {
                throw new Error('Final-only provider must not request memory');
              },
              snapshot: () => saved ?? initialSnapshot,
            });
            let providerCalls = 0;
            const providerRuntime = createMemoryProviderRoundRuntime(database, {
              generationId,
              ownerId,
              task,
              dispatchAuthority: () => policy,
              provider: async (providerTask, dispatch) => {
                providerCalls += 1;
                assert.ok(dispatch);
                assert.notDeepEqual(dispatch.request, providerTask.request);
                return {
                  kind: 'result',
                  output:
                    providerCalls === 1
                      ? {
                          kind: 'ready_to_answer',
                          version: 1,
                          purpose:
                            'The supplied evidence is sufficient for the final task.',
                        }
                      : {
                          result: scriptedStorytellerResult(providerTask),
                          evidenceUse: { itemIds: [], sourceIds: [] },
                          creativeDirections: {
                            format: 'offscreen.creative-direction-set.v1',
                            directions: [],
                          },
                        },
                  usage: fakeUsage(10n),
                  telemetry: fakeTelemetry('fake-memory-provider'),
                };
              },
            });
            await assert.rejects(
              runMemoryExploration(database, {
                generationId,
                task,
                createExplorer,
                ...providerRuntime,
              }),
              (error: unknown) =>
                error instanceof MemoryExplorationControllerError &&
                error.code === 'review-held',
            );
            assert.equal(providerCalls, 0);
            const [heldArtifact] = await database.db
              .select()
              .from(storytellerMemoryExploration)
              .where(
                eq(storytellerMemoryExploration.generationId, generationId),
              );
            assert.equal(heldArtifact?.state, 'held');
            assert.equal(heldArtifact?.failureCode, 'review-held');
            assert.equal(heldArtifact?.pendingModelOutput, null);
            const reviews = createDispatchReviewControls(database);
            const review = await reviews.read(ownerId, generationId);
            assert.equal(review?.state, 'awaiting-review');
            await reviews.decide(ownerId, {
              generationId,
              attemptId: review?.attemptId,
              decisionId: randomUUID(),
              expectedRevision: review?.revision,
              packetSha256: review?.packetSha256,
              decision: 'release',
            });
            await assert.rejects(
              runMemoryExploration(database, {
                generationId,
                task,
                createExplorer,
                ...providerRuntime,
              }),
              (error: unknown) =>
                error instanceof MemoryExplorationControllerError &&
                error.code === 'review-held',
            );
            assert.equal(providerCalls, 1);
            const finalReview = await reviews.read(ownerId, generationId);
            assert.equal(finalReview?.state, 'awaiting-review');
            assert.notEqual(finalReview?.attemptId, review?.attemptId);
            await reviews.decide(ownerId, {
              generationId,
              attemptId: finalReview?.attemptId,
              decisionId: randomUUID(),
              expectedRevision: finalReview?.revision,
              packetSha256: finalReview?.packetSha256,
              decision: 'release',
            });
            const completed = await runMemoryExploration(database, {
              generationId,
              task,
              createExplorer,
              ...providerRuntime,
            });
            assert.equal(completed.replayed, false);
            assert.equal(providerCalls, 2);
            const attempts = await database.db
              .select()
              .from(storytellerAttempt)
              .where(eq(storytellerAttempt.generationId, generationId));
            const [operation] = await database.db
              .select()
              .from(storytellerOperation)
              .where(eq(storytellerOperation.generationId, generationId));
            assert.equal(attempts.length, 2);
            assert.ok(
              attempts.every(
                (attempt) =>
                  attempt.state === 'settled' &&
                  attempt.providerId === 'fake-memory-provider',
              ),
            );
            assert.equal(operation?.state, 'complete');
            assert.equal(operation?.dispatchedRounds, 2);
            assert.equal(operation?.consumedMicrousd, 20n);
            const replayed = await runMemoryExploration(database, {
              generationId,
              task,
              createExplorer,
              ...providerRuntime,
            });
            assert.equal(replayed.replayed, true);
            assert.equal(providerCalls, 2);

            const noRepairGenerationId = randomUUID();
            const noRepairTask = storytellerTaskSchema.parse({
              ...task,
              execution: {
                ...execution,
                dispatchReview: { mode: 'off' },
              },
            });
            await database.db.insert(generation).values({
              id: noRepairGenerationId,
              ownerId,
              kind: sourceGeneration.kind,
              input: noRepairTask,
            });
            let noRepairCalls = 0;
            const noRepairRuntime = createMemoryProviderRoundRuntime(database, {
              generationId: noRepairGenerationId,
              ownerId,
              task: noRepairTask,
              dispatchAuthority: () => policy,
              provider: async () => {
                noRepairCalls += 1;
                return {
                  kind: 'result',
                  output: { malformed: 'final candidate' },
                  usage: fakeUsage(10n),
                  telemetry: fakeTelemetry('fake-memory-no-repair'),
                };
              },
            });
            await assert.rejects(
              runMemoryExploration(database, {
                generationId: noRepairGenerationId,
                task: noRepairTask,
                createExplorer,
                ...noRepairRuntime,
              }),
              (error: unknown) =>
                error instanceof MemoryExplorationControllerError &&
                error.code === 'invalid-output',
            );
            assert.equal(noRepairCalls, 1);
            const [noRepairArtifact] = await database.db
              .select()
              .from(storytellerMemoryExploration)
              .where(
                eq(
                  storytellerMemoryExploration.generationId,
                  noRepairGenerationId,
                ),
              );
            assert.equal(noRepairArtifact?.state, 'failed');
            assert.equal(noRepairArtifact?.modelRoundsUsed, 1);

            const repairGenerationId = randomUUID();
            const repairPolicy = createTestUsagePolicy(
              execution.policy.route,
              [],
              {
                maxModelRoundsPerOperation: 3,
                maxReadsPerOperation: 1,
                maxRetainedReadBytes: 4096,
              },
            );
            const repairTask = storytellerTaskSchema.parse({
              ...task,
              resources: resourcesForEffectiveUsagePolicy(
                execution,
                repairPolicy,
                {
                  posture: 'minimal',
                  maxRepairRounds: 1,
                },
              ),
              execution: {
                ...execution,
                dispatchReview: { mode: 'off' },
              },
            });
            await database.db.insert(generation).values({
              id: repairGenerationId,
              ownerId,
              kind: sourceGeneration.kind,
              input: repairTask,
            });
            let repairCalls = 0;
            const repairRuntime = createMemoryProviderRoundRuntime(database, {
              generationId: repairGenerationId,
              ownerId,
              task: repairTask,
              dispatchAuthority: () => repairPolicy,
              provider: async (providerTask) => {
                repairCalls += 1;
                return {
                  kind: 'result',
                  output:
                    repairCalls === 1
                      ? {
                          kind: 'ready_to_answer',
                          version: 1,
                          purpose:
                            'The supplied evidence is sufficient for the final task.',
                        }
                      : repairCalls === 2
                        ? { malformed: 'final candidate' }
                        : {
                            result: scriptedStorytellerResult(providerTask),
                            evidenceUse: { itemIds: [], sourceIds: [] },
                            creativeDirections: {
                              format: 'offscreen.creative-direction-set.v1',
                              directions: [],
                            },
                          },
                  usage: fakeUsage(10n),
                  telemetry: fakeTelemetry(`fake-memory-repair-${repairCalls}`),
                };
              },
            });
            const repaired = await runMemoryExploration(database, {
              generationId: repairGenerationId,
              task: repairTask,
              createExplorer,
              ...repairRuntime,
            });
            assert.equal(repaired.replayed, false);
            assert.equal(repairCalls, 3);
            const [repairArtifact] = await database.db
              .select()
              .from(storytellerMemoryExploration)
              .where(
                eq(
                  storytellerMemoryExploration.generationId,
                  repairGenerationId,
                ),
              );
            assert.equal(repairArtifact?.state, 'final-ready');
            assert.equal(repairArtifact?.modelRoundsUsed, 3);
            const [repairOperation] = await database.db
              .select()
              .from(storytellerOperation)
              .where(eq(storytellerOperation.generationId, repairGenerationId));
            assert.equal(repairOperation?.state, 'complete');
            assert.equal(repairOperation?.dispatchedRounds, 3);

            const failedGenerationId = randomUUID();
            const failedTask = storytellerTaskSchema.parse({
              ...task,
              execution: {
                ...execution,
                dispatchReview: { mode: 'off' },
              },
            });
            await database.db.insert(generation).values({
              id: failedGenerationId,
              ownerId,
              kind: sourceGeneration.kind,
              input: failedTask,
            });
            const failedRuntime = createMemoryProviderRoundRuntime(database, {
              generationId: failedGenerationId,
              ownerId,
              task: failedTask,
              dispatchAuthority: () => policy,
              provider: async () => ({
                kind: 'failed',
                failureCode: 'invalid_output',
                usage: fakeUsage(7n),
                telemetry: fakeTelemetry('fake-invalid-memory-provider'),
              }),
            });
            await assert.rejects(
              runMemoryExploration(database, {
                generationId: failedGenerationId,
                task: failedTask,
                createExplorer,
                ...failedRuntime,
              }),
              (error: unknown) =>
                error instanceof MemoryExplorationControllerError &&
                error.code === 'invalid-output',
            );
            const [failedArtifact] = await database.db
              .select()
              .from(storytellerMemoryExploration)
              .where(
                eq(
                  storytellerMemoryExploration.generationId,
                  failedGenerationId,
                ),
              );
            assert.equal(failedArtifact?.state, 'failed');
            assert.equal(failedArtifact?.failureCode, 'invalid-output');
            assert.ok(failedArtifact?.pendingModelOutput);
            await assert.rejects(
              runMemoryExploration(database, {
                generationId: failedGenerationId,
                task: failedTask,
                createExplorer,
                ...failedRuntime,
              }),
              (error: unknown) =>
                error instanceof MemoryExplorationControllerError &&
                error.code === 'invalid-output',
            );

            const readFailureGenerationId = randomUUID();
            await database.db.insert(generation).values({
              id: readFailureGenerationId,
              ownerId,
              kind: sourceGeneration.kind,
              input: failedTask,
            });
            let readFailureCalls = 0;
            const readFailureRuntime = createMemoryProviderRoundRuntime(
              database,
              {
                generationId: readFailureGenerationId,
                ownerId,
                task: failedTask,
                dispatchAuthority: () => policy,
                provider: async () => {
                  readFailureCalls += 1;
                  return {
                    kind: 'result',
                    output: {
                      kind: 'needs_context',
                      version: 1,
                      purpose: 'Recover one exact fact before answering.',
                      requests: [
                        {
                          requestId: 'r1',
                          operation: 'ask_memory',
                          intent: 'evidence',
                          question: 'What exact fact constrains this return?',
                        },
                      ],
                    },
                    usage: fakeUsage(5n),
                    telemetry: fakeTelemetry('fake-read-failure-provider'),
                  };
                },
              },
            );
            const createFailingExplorer = (
              saved?: MemoryExplorationSnapshot,
            ) => ({
              execute: async () => {
                throw new CanonicalMemoryExplorationError('stale-root');
              },
              snapshot: () => saved ?? initialSnapshot,
            });
            await assert.rejects(
              runMemoryExploration(database, {
                generationId: readFailureGenerationId,
                task: failedTask,
                createExplorer: createFailingExplorer,
                ...readFailureRuntime,
              }),
              (error: unknown) =>
                error instanceof MemoryExplorationControllerError &&
                error.code === 'stale-root',
            );
            const [closedAfterReadFailure] = await database.db
              .select()
              .from(storytellerOperation)
              .where(
                eq(storytellerOperation.generationId, readFailureGenerationId),
              );
            assert.equal(closedAfterReadFailure?.state, 'complete');
            assert.equal(closedAfterReadFailure?.reservedMicrousd, 0n);
            assert.equal(closedAfterReadFailure?.consumedMicrousd, 5n);
            assert.equal(
              await createStorytellerBudget(database).completeOperation(
                readFailureGenerationId,
                execution,
              ),
              'complete',
            );
            await assert.rejects(
              runMemoryExploration(database, {
                generationId: readFailureGenerationId,
                task: failedTask,
                createExplorer: createFailingExplorer,
                ...readFailureRuntime,
              }),
              (error: unknown) =>
                error instanceof MemoryExplorationControllerError &&
                error.code === 'stale-root',
            );
            assert.equal(readFailureCalls, 1);

            const rejectedGenerationId = randomUUID();
            await database.db.insert(generation).values({
              id: rejectedGenerationId,
              ownerId,
              kind: sourceGeneration.kind,
              input: task,
            });
            let rejectedCalls = 0;
            const rejectedRuntime = createMemoryProviderRoundRuntime(database, {
              generationId: rejectedGenerationId,
              ownerId,
              task,
              dispatchAuthority: () => policy,
              provider: async () => {
                rejectedCalls += 1;
                throw new Error('Rejected review must not dispatch');
              },
            });
            await assert.rejects(
              runMemoryExploration(database, {
                generationId: rejectedGenerationId,
                task,
                createExplorer,
                ...rejectedRuntime,
              }),
              (error: unknown) =>
                error instanceof MemoryExplorationControllerError &&
                error.code === 'review-held',
            );
            const rejectedReview = await reviews.read(
              ownerId,
              rejectedGenerationId,
            );
            await reviews.decide(ownerId, {
              generationId: rejectedGenerationId,
              attemptId: rejectedReview?.attemptId,
              decisionId: randomUUID(),
              expectedRevision: rejectedReview?.revision,
              packetSha256: rejectedReview?.packetSha256,
              decision: 'reject',
            });
            await assert.rejects(
              runMemoryExploration(database, {
                generationId: rejectedGenerationId,
                task,
                createExplorer,
                ...rejectedRuntime,
              }),
              (error: unknown) =>
                error instanceof MemoryExplorationControllerError &&
                error.code === 'review-stopped',
            );
            const [rejectedArtifact] = await database.db
              .select()
              .from(storytellerMemoryExploration)
              .where(
                eq(
                  storytellerMemoryExploration.generationId,
                  rejectedGenerationId,
                ),
              );
            assert.equal(rejectedArtifact?.state, 'failed');
            assert.equal(rejectedArtifact?.failureCode, 'review-stopped');
            assert.equal(rejectedCalls, 0);
            assert.equal(
              (
                await database.db
                  .select()
                  .from(storytellerAttempt)
                  .where(
                    eq(storytellerAttempt.generationId, rejectedGenerationId),
                  )
              ).length,
              0,
            );

            const deniedGenerationId = randomUUID();
            await database.db.insert(generation).values({
              id: deniedGenerationId,
              ownerId,
              kind: sourceGeneration.kind,
              input: failedTask,
            });
            let deniedCalls = 0;
            const deniedRuntime = createMemoryProviderRoundRuntime(database, {
              generationId: deniedGenerationId,
              ownerId,
              task: failedTask,
              dispatchAuthority: () => null,
              provider: async () => {
                deniedCalls += 1;
                throw new Error('Denied authority must not dispatch');
              },
            });
            await assert.rejects(
              runMemoryExploration(database, {
                generationId: deniedGenerationId,
                task: failedTask,
                createExplorer,
                ...deniedRuntime,
              }),
              (error: unknown) =>
                error instanceof MemoryExplorationControllerError &&
                error.code === 'authority-unavailable',
            );
            const [deniedAttempt] = await database.db
              .select()
              .from(storytellerAttempt)
              .where(eq(storytellerAttempt.generationId, deniedGenerationId));
            const [deniedOperation] = await database.db
              .select()
              .from(storytellerOperation)
              .where(eq(storytellerOperation.generationId, deniedGenerationId));
            assert.equal(deniedCalls, 0);
            assert.equal(deniedAttempt?.state, 'unsent');
            assert.equal(deniedAttempt?.chargedMicrousd, 0n);
            assert.equal(deniedOperation?.state, 'complete');
            assert.equal(deniedOperation?.reservedMicrousd, 0n);

            const uncertainGenerationId = randomUUID();
            await database.db.insert(generation).values({
              id: uncertainGenerationId,
              ownerId,
              kind: sourceGeneration.kind,
              input: failedTask,
            });
            let uncertainCalls = 0;
            const uncertainRuntime = createMemoryProviderRoundRuntime(
              database,
              {
                generationId: uncertainGenerationId,
                ownerId,
                task: failedTask,
                dispatchAuthority: () => policy,
                provider: async () => {
                  uncertainCalls += 1;
                  return {
                    kind: 'uncertain',
                    telemetry: fakeTelemetry('fake-uncertain-memory-provider'),
                  };
                },
              },
            );
            await assert.rejects(
              runMemoryExploration(database, {
                generationId: uncertainGenerationId,
                task: failedTask,
                createExplorer,
                ...uncertainRuntime,
              }),
              (error: unknown) =>
                error instanceof MemoryExplorationControllerError &&
                error.code === 'provider-uncertain',
            );
            const [uncertainArtifact] = await database.db
              .select()
              .from(storytellerMemoryExploration)
              .where(
                eq(
                  storytellerMemoryExploration.generationId,
                  uncertainGenerationId,
                ),
              );
            assert.equal(uncertainArtifact?.state, 'uncertain');
            assert.equal(uncertainArtifact?.failureCode, 'provider-uncertain');
            assert.ok(uncertainArtifact?.pendingModelOutput);
            await assert.rejects(
              runMemoryExploration(database, {
                generationId: uncertainGenerationId,
                task: failedTask,
                createExplorer,
                ...uncertainRuntime,
              }),
              (error: unknown) =>
                error instanceof MemoryExplorationControllerError &&
                error.code === 'provider-uncertain',
            );
            assert.equal(uncertainCalls, 1);
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
              maxAttempts: 6,
              enabled: true,
            });
            const execution: ExecutionPolicy = {
              mode: 'provider',
              accountId,
              runId,
              dispatchReview: { mode: 'off' },
              policy: {
                version: 'fake',
                route: 'fake:economy',
                model: 'fake/model',
                provider: 'fake',
                priceVersion: 'test-only',
                inputMicrousdPerMillion: '100000',
                cacheReadMicrousdPerMillion: '10000',
                cacheWriteMicrousdPerMillion: '250000',
                outputMicrousdPerMillion: '100000',
                maxInputTokens: 100000,
                maxOutputTokens: 2000,
                timeoutMs: 1000,
              },
            };
            const profiled = createStorytellerOpenings(
              database,
              execution,
              createTestUsagePolicy(execution.policy.route),
            );
            let calls = 0;
            const source = createStorytellerRuntime(database, {
              dispatchAuthority: ({ task }) =>
                task.resources.authority.kind === 'effective-usage-policy'
                  ? task.resources.authority.policy
                  : null,
              provider: async (task) => {
                calls++;
                return {
                  kind: 'result',
                  output: scriptedStorytellerResult(task),
                  usage: { ...fakeUsage(10n), cacheWriteTokens: 15 },
                  telemetry: fakeTelemetry('fake-provider-id'),
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
            const heldExecution: ExecutionPolicy = {
              ...execution,
              dispatchReview: { mode: 'hold' },
            };
            const heldProfiled = createStorytellerOpenings(
              database,
              heldExecution,
              createTestUsagePolicy(execution.policy.route),
            );
            const heldId = randomUUID();
            await heldProfiled.request(ownerId, draftId, heldId, 1);
            let heldCalls = 0;
            const heldRuntime = createStorytellerRuntime(database, {
              dispatchAuthority: ({ task }) =>
                task.resources.authority.kind === 'effective-usage-policy'
                  ? task.resources.authority.policy
                  : null,
              provider: async (task) => {
                heldCalls++;
                return {
                  kind: 'result',
                  output: scriptedStorytellerResult(task),
                  usage: fakeUsage(10n),
                  telemetry: fakeTelemetry('reviewed-provider-id'),
                };
              },
            });
            await heldRuntime.complete(heldId);
            assert.equal(heldCalls, 0);
            const reviews = createDispatchReviewControls(database);
            const review = await reviews.read(ownerId, heldId);
            assert.equal(review?.state, 'awaiting-review');
            assert.equal(review?.mode, 'hold');
            assert.match(review?.packetSha256 ?? '', /^[0-9a-f]{64}$/);
            const [attemptBeforeRelease] = await database.db
              .select()
              .from(storytellerAttempt)
              .where(eq(storytellerAttempt.generationId, heldId));
            assert.equal(attemptBeforeRelease, undefined);
            await reviews.decide(ownerId, {
              generationId: heldId,
              attemptId: review?.attemptId,
              decisionId: randomUUID(),
              expectedRevision: review?.revision,
              packetSha256: review?.packetSha256,
              decision: 'release',
            });
            await heldRuntime.complete(heldId);
            assert.equal(heldCalls, 1);
            assert.equal(
              (await reviews.read(ownerId, heldId))?.state,
              'released',
            );
            const deniedId = randomUUID();
            await profiled.request(ownerId, draftId, deniedId, 1);
            await createStorytellerRuntime(database, {
              provider: async (task) => {
                calls++;
                return {
                  kind: 'result',
                  output: scriptedStorytellerResult(task),
                  usage: fakeUsage(10n),
                  telemetry: fakeTelemetry('must-not-dispatch'),
                };
              },
            }).complete(deniedId);
            assert.equal(calls, 0);
            const [deniedAttempt] = await database.db
              .select()
              .from(storytellerAttempt)
              .where(eq(storytellerAttempt.generationId, deniedId));
            const [deniedOperation] = await database.db
              .select()
              .from(storytellerOperation)
              .where(eq(storytellerOperation.generationId, deniedId));
            assert.equal(deniedAttempt?.state, 'unsent');
            assert.equal(deniedOperation?.state, 'open');
            assert.equal(deniedOperation?.reservedRounds, 0);
            assert.equal(deniedOperation?.reservedMicrousd, 0n);
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
            const [settledAttempt] = await database.db
              .select()
              .from(storytellerAttempt)
              .where(eq(storytellerAttempt.generationId, id));
            assert.ok(settledAttempt);
            assert.equal(settledAttempt.ownerId, ownerId);
            assert.equal(settledAttempt.storyId, null);
            assert.equal(settledAttempt.draftId, draftId);
            assert.equal(settledAttempt.purpose, 'opening');
            assert.equal(
              settledAttempt.storytellerProfileId,
              'absurd-action-comedy',
            );
            assert.equal(settledAttempt.requestedModel, 'fake/model');
            assert.equal(settledAttempt.reportedModel, 'fake/model');
            assert.equal(settledAttempt.providerId, 'fake-provider-id');
            assert.equal(settledAttempt.promptTokens, 20);
            assert.equal(settledAttempt.completionTokens, 10);
            assert.equal(settledAttempt.reasoningTokens, 0);
            assert.equal(settledAttempt.chargedMicrousd, 10n);
            assert.equal(settledAttempt.calculatedMicrousd, 6n);
            assert.ok(
              settledAttempt.estimatedMicrousd <
                settledAttempt.reservedMicrousd,
            );
            assert.equal(
              settledAttempt.estimationMethod,
              'serialized-byte-upper-bound.v1',
            );
            assert.ok(settledAttempt.estimatedInputTokens > 0);
            assert.equal(settledAttempt.reconciliation, 'different');
            assert.ok(settledAttempt.requestBytes > 0);
            assert.ok(settledAttempt.dispatchedAt);
            assert.ok(settledAttempt.settledAt);
            assert.equal(settledAttempt.durationMs, 25);
            const overlappingId = randomUUID();
            await profiled.request(ownerId, draftId, overlappingId, 1);
            let overlapCalls = 0;
            let releaseProvider!: () => void;
            const providerReleased = new Promise<void>((resolve) => {
              releaseProvider = resolve;
            });
            let enterProvider!: () => void;
            const providerEntered = new Promise<void>((resolve) => {
              enterProvider = resolve;
            });
            const overlapping = createStorytellerRuntime(database, {
              dispatchAuthority: ({ task }) =>
                task.resources.authority.kind === 'effective-usage-policy'
                  ? task.resources.authority.policy
                  : null,
              provider: async (task) => {
                overlapCalls++;
                enterProvider();
                await providerReleased;
                return {
                  kind: 'result',
                  output: scriptedStorytellerResult(task),
                  usage: fakeUsage(10n),
                  telemetry: fakeTelemetry('overlapping-provider-id'),
                };
              },
            });
            const firstDelivery = overlapping.complete(overlappingId);
            await providerEntered;
            await overlapping.complete(overlappingId);
            assert.equal(overlapCalls, 1);
            assert.equal((await budget.inspect(accountId)).stopped, false);
            releaseProvider();
            await firstDelivery;
            const [overlappingAttempt] = await database.db
              .select()
              .from(storytellerAttempt)
              .where(eq(storytellerAttempt.generationId, overlappingId));
            assert.equal(overlappingAttempt?.state, 'settled');
            assert.equal(overlappingAttempt?.chargedMicrousd, 10n);
            const uncertainId = randomUUID();
            await profiled.request(ownerId, draftId, uncertainId, 1);
            const uncertain = createStorytellerRuntime(database, {
              dispatchAuthority: ({ task }) =>
                task.resources.authority.kind === 'effective-usage-policy'
                  ? task.resources.authority.policy
                  : null,
              provider: async () => {
                calls++;
                return {
                  kind: 'uncertain',
                  telemetry: fakeTelemetry('fake-uncertain'),
                };
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
            assert.equal(attempt.reconciliation, 'unknown');
            assert.equal(attempt.providerId, 'fake-uncertain');
            assert.equal(attempt.durationMs, 25);
            // Explicit simulated reconciliation; keep this disposable test database usable on rerun.
            if (execution.mode !== 'provider') {
              throw new Error('Expected provider execution');
            }
            await budget.settle({
              id: attempt.id,
              execution,
              usage: fakeUsage(1n),
              telemetry: fakeTelemetry('fake-reconciled'),
            });
            assert.equal((await budget.inspect(accountId)).stopped, true);
          },
        );
        await t.test(
          'provider recovery retries only work proven unsent',
          async () => {
            async function providerStory(
              repairable = false,
              repairOpening = false,
            ) {
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
                dispatchReview: { mode: 'off' },
                policy: {
                  version: 'fake',
                  route: 'fake:economy',
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
              const draftId = randomUUID();
              await drafts.save(ownerId, draftId, {
                title: 'Provider recovery test',
                premise: 'SpongeBob wakes in the pineapple with Gary.',
                storytellingDirection: '',
                storyteller: { id: 'absurd-action-comedy', revision: 1 },
                expectedRevision: 0,
              });
              const openingId = randomUUID();
              const profiledOpenings = createStorytellerOpenings(
                database,
                execution,
                createTestUsagePolicy(
                  execution.policy.route,
                  [],
                  repairable
                    ? {
                        maxInputTokensPerOperation: 200000,
                        maxGeneratedTokensPerOperation: 4000,
                        maxModelRoundsPerOperation: 2,
                      }
                    : {},
                ),
              );
              await profiledOpenings.request(ownerId, draftId, openingId, 1);
              let openingCalls = 0;
              await createStorytellerRuntime(database, {
                dispatchAuthority: ({ task }) =>
                  task.resources.authority.kind === 'effective-usage-policy'
                    ? task.resources.authority.policy
                    : null,
                provider: async (task) => {
                  openingCalls++;
                  return {
                    kind: 'result',
                    output: repairOpening
                      ? { invalid: true }
                      : scriptedStorytellerResult(task),
                    usage: fakeUsage(10n),
                    telemetry: fakeTelemetry('provider-opening'),
                  };
                },
              }).complete(openingId);
              if (repairOpening) {
                const failedOpening = await profiledOpenings.latest(
                  ownerId,
                  draftId,
                );
                assert.equal(failedOpening?.state, 'failed');
                assert.equal(failedOpening?.canRetry, true);
                await profiledOpenings.retry(
                  ownerId,
                  draftId,
                  openingId,
                  randomUUID(),
                );
                await createStorytellerRuntime(database, {
                  dispatchAuthority: ({ task }) =>
                    task.resources.authority.kind === 'effective-usage-policy'
                      ? task.resources.authority.policy
                      : null,
                  provider: async (task) => {
                    openingCalls++;
                    return {
                      kind: 'result',
                      output: scriptedStorytellerResult(task),
                      usage: fakeUsage(10n),
                      telemetry: fakeTelemetry('provider-opening-repair'),
                    };
                  },
                }).complete(openingId);
              }
              const storyId = randomUUID();
              await stories.startFromCandidate({
                ownerId,
                storyId,
                candidateId: openingId,
                expectedDraftRevision: 1,
              });
              return { accountId, execution, storyId, openingCalls };
            }

            async function admit(storyId: string) {
              const before = await stories.read({ ownerId, storyId });
              assert.ok(before.current.interaction);
              const generationId = randomUUID();
              await stories.admitResolution({
                ownerId,
                storyId,
                operationId: generationId,
                body: {
                  expectedRevision: before.revision,
                  submission: {
                    interactionId: before.current.interaction.id,
                    answer: { kind: 'choice.v1', optionId: 'ask' },
                  },
                },
              });
              return generationId;
            }

            const repairedOpening = await providerStory(true, true);
            assert.equal(repairedOpening.openingCalls, 2);

            const unsent = await providerStory();
            const unsentId = await admit(unsent.storyId);
            let unsentCalls = 0;
            await createStorytellerRuntime(database, {
              dispatchAuthority: () => null,
              provider: async (task) => {
                unsentCalls++;
                return {
                  kind: 'result',
                  output: scriptedStorytellerResult(task),
                  usage: fakeUsage(10n),
                  telemetry: fakeTelemetry('must-not-be-called'),
                };
              },
            }).complete(unsentId);
            const denied = await stories.read({
              ownerId,
              storyId: unsent.storyId,
            });
            assert.deepEqual(denied.resolution?.blocker, {
              kind: 'authority',
              recovery: 'retry',
            });
            assert.equal(denied.resolution?.canRetry, true);
            assert.equal(unsentCalls, 0);
            await stories.retryResolution({
              ownerId,
              storyId: unsent.storyId,
              retryId: randomUUID(),
            });
            await createStorytellerRuntime(database, {
              dispatchAuthority: ({ task }) =>
                task.resources.authority.kind === 'effective-usage-policy'
                  ? task.resources.authority.policy
                  : null,
              provider: async (task) => {
                unsentCalls++;
                return {
                  kind: 'result',
                  output: scriptedStorytellerResult(task),
                  usage: fakeUsage(10n),
                  telemetry: fakeTelemetry('retried-unsent'),
                };
              },
            }).complete(unsentId);
            assert.equal(unsentCalls, 1);
            assert.equal(
              (await stories.read({ ownerId, storyId: unsent.storyId }))
                .revision,
              2,
            );

            const spent = await providerStory();
            const spentId = await admit(spent.storyId);
            let spentCalls = 0;
            await createStorytellerRuntime(database, {
              dispatchAuthority: ({ task }) =>
                task.resources.authority.kind === 'effective-usage-policy'
                  ? task.resources.authority.policy
                  : null,
              provider: async () => {
                spentCalls++;
                return {
                  kind: 'result',
                  output: { invalid: true },
                  usage: fakeUsage(10n),
                  telemetry: fakeTelemetry('spent-invalid-output'),
                };
              },
            }).complete(spentId);
            const invalid = await stories.read({
              ownerId,
              storyId: spent.storyId,
            });
            assert.deepEqual(invalid.resolution?.blocker, {
              kind: 'generation',
              recovery: 'none',
            });
            assert.equal(invalid.resolution?.canRetry, false);
            await assert.rejects(
              stories.retryResolution({
                ownerId,
                storyId: spent.storyId,
                retryId: randomUUID(),
              }),
              { code: 'conflict' },
            );
            assert.equal(spentCalls, 1);

            const repairable = await providerStory(true);
            const repairableId = await admit(repairable.storyId);
            let repairCalls = 0;
            await createStorytellerRuntime(database, {
              dispatchAuthority: ({ task }) =>
                task.resources.authority.kind === 'effective-usage-policy'
                  ? task.resources.authority.policy
                  : null,
              provider: async (_task, dispatch) => {
                repairCalls++;
                assert.ok(dispatch);
                return {
                  kind: 'result',
                  output: { invalid: true },
                  usage: fakeUsage(10n),
                  telemetry: fakeTelemetry('repairable-invalid-output'),
                };
              },
            }).complete(repairableId);
            const [capturedInvalid] = await database.db
              .select()
              .from(generation)
              .where(eq(generation.id, repairableId));
            assert.equal(capturedInvalid?.state, 'failed');
            assert.deepEqual(capturedInvalid?.repairCandidate, {
              invalid: true,
            });
            assert.ok(capturedInvalid?.repairDiagnostic);
            const [openRepairOperation] = await database.db
              .select()
              .from(storytellerOperation)
              .where(eq(storytellerOperation.generationId, repairableId));
            assert.equal(openRepairOperation?.state, 'open');
            const repairableFailure = await stories.read({
              ownerId,
              storyId: repairable.storyId,
            });
            assert.deepEqual(repairableFailure.resolution?.blocker, {
              kind: 'generation',
              recovery: 'retry',
            });
            assert.equal(repairableFailure.resolution?.canRetry, true);
            await stories.retryResolution({
              ownerId,
              storyId: repairable.storyId,
              retryId: randomUUID(),
            });
            await createStorytellerRuntime(database, {
              dispatchAuthority: ({ task }) =>
                task.resources.authority.kind === 'effective-usage-policy'
                  ? task.resources.authority.policy
                  : null,
              provider: async (task, dispatch) => {
                repairCalls++;
                assert.ok(dispatch);
                assert.match(
                  dispatch.request.messages[1].content,
                  /Invalid candidate: \{"invalid":true\}/,
                );
                assert.match(
                  dispatch.request.messages[1].content,
                  /Validator findings/,
                );
                return {
                  kind: 'result',
                  output: scriptedStorytellerResult(task),
                  usage: fakeUsage(10n),
                  telemetry: fakeTelemetry('repaired-output'),
                };
              },
            }).complete(repairableId);
            assert.equal(repairCalls, 2);
            const repairedStory = await stories.read({
              ownerId,
              storyId: repairable.storyId,
            });
            assert.equal(repairedStory.revision, 2);
            const repairedAttempts = await database.db
              .select()
              .from(storytellerAttempt)
              .where(eq(storytellerAttempt.generationId, repairableId));
            assert.equal(repairedAttempts.length, 2);
            assert.equal(
              repairedAttempts.reduce(
                (total, attempt) => total + (attempt.chargedMicrousd ?? 0n),
                0n,
              ),
              20n,
            );
            const [repairedGeneration] = await database.db
              .select()
              .from(generation)
              .where(eq(generation.id, repairableId));
            assert.equal(repairedGeneration?.state, 'succeeded');
            assert.equal(repairedGeneration?.repairCandidate, null);
            const [completeRepairOperation] = await database.db
              .select()
              .from(storytellerOperation)
              .where(eq(storytellerOperation.generationId, repairableId));
            assert.equal(completeRepairOperation?.state, 'complete');

            const uncertain = await providerStory();
            const uncertainId = await admit(uncertain.storyId);
            let uncertainCalls = 0;
            await createStorytellerRuntime(database, {
              dispatchAuthority: ({ task }) =>
                task.resources.authority.kind === 'effective-usage-policy'
                  ? task.resources.authority.policy
                  : null,
              provider: async () => {
                uncertainCalls++;
                return {
                  kind: 'uncertain',
                  telemetry: fakeTelemetry('uncertain-delivery'),
                };
              },
            }).complete(uncertainId);
            const unknown = await stories.read({
              ownerId,
              storyId: uncertain.storyId,
            });
            assert.deepEqual(unknown.resolution?.blocker, {
              kind: 'usage-uncertain',
              recovery: 'operator',
            });
            assert.equal(unknown.resolution?.canRetry, false);
            await assert.rejects(
              stories.retryResolution({
                ownerId,
                storyId: uncertain.storyId,
                retryId: randomUUID(),
              }),
              { code: 'conflict' },
            );
            assert.equal(uncertainCalls, 1);
            assert.equal(
              (
                await createStorytellerBudget(database).inspect(
                  uncertain.accountId,
                )
              ).stopped,
              true,
            );
          },
        );
        await t.test(
          'worker restart and activity replay settle one finite action exactly once',
          async () => {
            const started = await mechanicalCandidate();
            const campaign = requireDefined(
              started.snapshot.campaign,
              'Expected a mechanical campaign',
            );
            const offer = requireDefined(
              campaign.offer,
              'Expected a generated mechanical offer',
            );
            const action = requireDefined(
              offer.nodes[0],
              'Expected an admitted finite action',
            );
            assert.deepEqual(action.action?.timing, {
              kind: 'finite',
              gameSeconds: 5,
            });
            const controlUrl = `${origin}/api/chamber-tools/stories/${started.storyId}/storyteller-control`;
            const armControl = await fetch(controlUrl, {
              method: 'PUT',
              headers: {
                cookie,
                origin,
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                action: 'arm-hold',
                expectedRevision: 0,
              }),
            });
            assert.equal(armControl.status, 200);
            const operationId = randomUUID();
            await stories.campaignAction({
              ownerId,
              storyId: started.storyId,
              operationId,
              body: {
                expectedRevision: started.snapshot.revision,
                offerId: offer.id,
                path: [action.id],
              },
            });

            const preparing = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(preparing.resolution?.evidence, 'pending-action');
            assert.ok(preparing.campaign?.actionExecution);
            assert.equal(preparing.campaign?.actionReceipts.length, 0);

            await restartWorker();
            await delay(1200);
            const [beforeRestart] = await database.db
              .select({ state: gameActionExecution.state })
              .from(gameActionExecution)
              .where(eq(gameActionExecution.operationId, operationId));
            const receiptsBeforeRestart = await database.db
              .select({ id: gameActionReceipt.operationId })
              .from(gameActionReceipt)
              .where(eq(gameActionReceipt.operationId, operationId));
            assert.equal(beforeRestart?.state, 'running');
            assert.equal(receiptsBeforeRestart.length, 0);

            await restartWorker();
            let held = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            for (let attempt = 0; attempt < 30; attempt++) {
              const controlResponse = await fetch(controlUrl, {
                headers: { cookie },
              });
              assert.equal(controlResponse.status, 200);
              const controlBody = (await controlResponse.json()) as {
                control: {
                  revision: number;
                  state: string;
                  generationId: string | null;
                };
              };
              if (
                controlBody.control.state === 'held' &&
                held.campaign?.actionReceipts[0]?.state === 'generating'
              ) {
                assert.deepEqual(Object.keys(controlBody.control).sort(), [
                  'generationId',
                  'revision',
                  'state',
                  'storyId',
                ]);
                const release = await fetch(controlUrl, {
                  method: 'PUT',
                  headers: {
                    cookie,
                    origin,
                    'content-type': 'application/json',
                  },
                  body: JSON.stringify({
                    action: 'release',
                    expectedRevision: controlBody.control.revision,
                    generationId: controlBody.control.generationId,
                  }),
                });
                assert.equal(release.status, 200);
                break;
              }
              await delay(500);
              held = await stories.read({
                ownerId,
                storyId: started.storyId,
              });
            }
            assert.equal(held.campaign?.gameSecond, campaign.gameSecond + 5);
            assert.equal(held.campaign?.actionReceipts[0]?.state, 'generating');

            let completed = held;
            for (let attempt = 0; attempt < 30; attempt++) {
              if (
                completed.revision === started.snapshot.revision + 1 &&
                completed.campaign?.actionReceipts[0]?.state === 'published'
              ) {
                break;
              }
              await delay(500);
              completed = await stories.read({
                ownerId,
                storyId: started.storyId,
              });
            }
            assert.equal(
              completed.revision,
              started.snapshot.revision + 1,
              'Restarted worker published the required consequence',
            );
            assert.equal(
              completed.campaign?.gameSecond,
              campaign.gameSecond + 5,
            );
            assert.equal(completed.campaign?.actionReceipts.length, 1);
            assert.equal(
              completed.campaign?.actionReceipts[0]?.id,
              operationId,
            );
            assert.equal(
              completed.campaign?.actionReceipts[0]?.state,
              'published',
            );
            const publishedReceipt = completed.campaign?.actionReceipts[0];

            assert.equal(
              await storyService.advanceCampaignAction(operationId),
              null,
            );
            assert.equal(
              await storyService.advanceCampaignAction(operationId),
              null,
            );
            const executions = await database.db
              .select({
                state: gameActionExecution.state,
                revision: gameActionExecution.revision,
                pendingResolution: gameActionExecution.pendingResolution,
                preparationGenerationId:
                  gameActionExecution.preparationGenerationId,
              })
              .from(gameActionExecution)
              .where(eq(gameActionExecution.operationId, operationId));
            const receipts = await database.db
              .select({
                outcome: gameActionReceipt.outcome,
                roll: gameActionReceipt.roll,
                generationId: gameActionReceipt.generationId,
              })
              .from(gameActionReceipt)
              .where(eq(gameActionReceipt.operationId, operationId));
            const events = await database.db
              .select({ kind: gameActionExecutionEvent.kind })
              .from(gameActionExecutionEvent)
              .where(eq(gameActionExecutionEvent.executionId, operationId))
              .orderBy(asc(gameActionExecutionEvent.ordinal));
            const consequences = await database.db
              .select({ operationId: campaignConsequence.operationId })
              .from(campaignConsequence)
              .where(eq(campaignConsequence.operationId, operationId));
            assert.equal(executions.length, 1);
            assert.equal(executions[0]?.state, 'settled');
            assert.equal(executions[0]?.revision, 1);
            assert.ok(executions[0]?.pendingResolution);
            assert.ok(executions[0]?.preparationGenerationId);
            assert.deepEqual(
              events.map((event) => event.kind),
              ['started', 'settled'],
            );
            assert.equal(receipts.length, 1);
            assert.equal(receipts[0]?.outcome, publishedReceipt?.outcome);
            assert.deepEqual(receipts[0]?.roll, publishedReceipt?.roll);
            assert.equal(
              receipts[0]?.generationId,
              executions[0]?.preparationGenerationId,
            );
            assert.equal(consequences.length, 0);
            const [prepared] = await database.db
              .select({ input: generation.input })
              .from(generation)
              .where(
                eq(
                  generation.id,
                  requireDefined(
                    executions[0]?.preparationGenerationId,
                    'Expected one overlapping preparation',
                  ),
                ),
              );
            assert.equal(
              storytellerTaskSchema.parse(prepared?.input).task,
              'pending-consequence',
            );

            await delay(1100);
            const heldDecision = await stories.read({
              ownerId,
              storyId: started.storyId,
            });
            assert.equal(
              heldDecision.campaign?.gameSecond,
              campaign.gameSecond + 5,
            );
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
      {
        chamberStorytellerControl,
        storytellerRuntime: {
          scriptedGate: chamberStorytellerControl.evaluate,
        },
      },
    );
  },
);
