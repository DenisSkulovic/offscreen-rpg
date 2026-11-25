import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { generation } from '@offscreen/story-persistence/generations';
import { campaign as campaignTable, campaignConsequence, gameActionReceipt, gameActivity, gameOffer } from '@offscreen/story-persistence/campaign';
import { storyPassage } from '@offscreen/story-persistence/stories';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import { requireDefined } from './helpers/require.js';
import type { TestContext } from 'node:test';
import { type ProfiledStoryteller, orm, eq } from './storyteller-suite.js';
import { registerProfiledStoryteller } from './storyteller-suite.js';

// Moved unchanged from the profiled Storyteller suite.
export async function checkActivityAdmission(
  t: TestContext,
  {
    database,
    ownerId,
    stories,
    storyService,
    runtime,
    candidate,
    mechanicalCandidate,
  }: ProfiledStoryteller,
): Promise<void> {
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
      // beacon-watch.v1 now offers the observation and watch plans ahead of
      // the repair; select the earned-work process by its stable key.
      const action = requireDefined(
        offer.nodes.find((node) => node.id === 'restore-beacon'),
        'Expected the beacon process action',
      );
      assert.deepEqual(campaign.activityAccess, {
        kind: 'selected',
        actionKeys: [
          'observe-harbor-shift',
          'keep-harbor-watch',
          'restore-beacon',
        ],
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
      // ENG03-narrow: capture-first narration is a pending-consequence task.
      assert.equal(task.task, 'pending-consequence');
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
        context?: {
          resolution?: { offer?: { nodes?: unknown[] } | null };
        };
      };
      // The captured task now carries an offer shell; the invariant is
      // that a blocked activity captures no player-actionable plan.
      assert.deepEqual(
        preparedInput.context?.resolution?.offer?.nodes ?? [],
        [],
      );
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
}

registerProfiledStoryteller(import.meta.url, 'earned work admission', checkActivityAdmission);
