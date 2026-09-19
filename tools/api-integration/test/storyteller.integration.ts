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
import {
  campaign as campaignTable,
  campaignConsequence,
  gameActionReceipt,
  gameActivity,
  gameActivityReport,
  gameOffer,
} from '@offscreen/db/campaign-schema';
import { story } from '@offscreen/db/story-schema';
import {
  storytellerAttempt,
  storytellerFunding,
  storytellerRun,
} from '@offscreen/db/storyteller-schema';
import { createDrafts } from '@offscreen/application/drafts';
import { createScriptedOpenings } from '@offscreen/application/generations';
import { createStorytellerOpenings } from '@offscreen/application/storyteller';
import { createStorytellerRuntime } from '@offscreen/application/storyteller';
import { createStorytellerBudget } from '@offscreen/application/storyteller';
import { createChamber } from '@offscreen/application/developer-tools';
import { createStories } from '@offscreen/application/stories';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import { continuityNotesSchema } from '@offscreen/storyteller/context';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';
import { withAppIntegration } from './helpers/app-integration.js';
import { withBrowserSession } from './helpers/browser-session.js';
import { requireDefined } from './helpers/require.js';

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
            | { kind: 'rate'; ticks: number; realMs: number } = {
            kind: 'rate',
            ticks: 1,
            realMs: 1000,
          },
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
          const snapshot = await stories.startFromCandidate({
            ownerId,
            storyId,
            candidateId: generationId,
            expectedDraftRevision: 1,
            campaign: {
              mechanics: true,
              locked: false,
              pace,
            },
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
          'mechanical opening and three consequences reshape plans from committed state',
          async () => {
            const started = await mechanicalCandidate();
            let snapshot = started.snapshot;
            assert.equal(snapshot.revision, 1);
            assert.equal(snapshot.campaign?.offer?.nodes[0]?.id, 'take-cover');

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
              const committed = await stories.read({
                ownerId,
                storyId: started.storyId,
              });
              assert.equal(committed.revision, snapshot.revision);
              assert.equal(committed.campaign?.offer, null);
              assert.equal(
                committed.campaign?.actionReceipts[0]?.id,
                operationId,
              );
              assert.equal(
                committed.campaign?.actionReceipts[0]?.state,
                'pending',
              );

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
                  effortTicks: 5,
                  process: { kind: 'contribution.v1', earned: 3 },
                  completionPending: false,
                },
                plan: { ...plan, resolvedThroughTick: 5 },
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
                      action: { kind: 'attempt' },
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
              .select({ operationId: campaignConsequence.operationId })
              .from(campaignConsequence)
              .where(eq(campaignConsequence.operationId, activityId));
            assert.equal(blockedFollowUp.length, 1);
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
                horizonTicks: 20,
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
                horizonTicks: 20,
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
                horizonTicks: 1,
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
              acceptedPlan.horizonTick,
              acceptedPlan.acceptedAtTick + 1,
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
              /reached its tick .* horizon/,
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
                horizonTicks: 20,
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
                horizonTicks: 20,
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
              elapsedTicks: 10,
              requiredTicks: 10,
            });
            assert.equal(completed.campaign?.tick, 10);
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
            assert.equal(duplicate.campaign?.tick, 10);
            assert.equal(duplicate.campaign?.rolls.length, 0);
            assert.deepEqual(
              duplicate.campaign?.activityEvents.map((event) => event.kind),
              ['completed', 'started'],
            );

            const [reportHook] = await database.db
              .select()
              .from(gameActivityReport)
              .where(eq(gameActivityReport.activityId, activityId));
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
            assert.equal(repeatSnapshot.campaign?.tick, 14);
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
              .from(gameActivityReport)
              .where(eq(gameActivityReport.activityId, activityId));
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
