import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { generation } from '@offscreen/db/generation-schema';
import { campaignConsequence, gameActivity } from '@offscreen/db/campaign-schema';
import { storyResolution } from '@offscreen/db/story-schema';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import { requireDefined } from './helpers/require.js';
import type { TestContext } from 'node:test';
import { type ProfiledStoryteller, orm, eq } from './storyteller-suite.js';
import { registerProfiledStoryteller } from './storyteller-suite.js';

// Moved unchanged from the profiled Storyteller suite.
export async function checkAcceptedPlan(
  t: TestContext,
  {
    database,
    ownerId,
    stories,
    storyService,
    runtime,
    mechanicalCandidate,
  }: ProfiledStoryteller,
): Promise<void> {
  await t.test(
    'accepted finite plan starts each authorized successor without generation',
    async () => {
      const started = await mechanicalCandidate('microbe.v3', {
        kind: 'instant',
      });
      // Scoped to this story: other tests' background workers also create
      // generations on the shared owner.
      const countStoryGenerations = async () =>
        (
          await database.db
            .select({ count: orm.count() })
            .from(storyResolution)
            .where(eq(storyResolution.storyId, started.storyId))
        )[0]?.count;
      const generationCountBefore = await countStoryGenerations();
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
      // Admission and both successor starts created no generation.
      assert.equal(await countStoryGenerations(), generationCountBefore);
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
      assert.equal(await countStoryGenerations(), generationCountBefore);
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

      // The activity-completion narration owns a separately admitted G.
      await storyService.prepareCampaignConsequence(firstActivityId);
      const [handoffConsequence] = await database.db
        .select({ generationId: campaignConsequence.generationId })
        .from(campaignConsequence)
        .where(eq(campaignConsequence.operationId, firstActivityId));
      const handoffGenerationId = requireDefined(
        handoffConsequence?.generationId,
        'Expected the activity completion narration to be admitted',
      );
      const [captured] = await database.db
        .select({ input: generation.input })
        .from(generation)
        .where(eq(generation.id, handoffGenerationId));
      const task = storytellerTaskSchema.parse(captured?.input);
      assert.equal(
        task.context.activitySituation?.acceptedPlan?.nextEntry.plan.key,
        'keep-harbor-watch',
      );
      await runtime.complete(handoffGenerationId);
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
      assert.equal(completed.campaign?.activity, null);
      const [finishedActivity] = await database.db
        .select({ id: gameActivity.id, state: gameActivity.state })
        .from(gameActivity)
        .where(eq(gameActivity.id, currentActivityId));
      assert.deepEqual(finishedActivity, {
        id: currentActivityId,
        state: 'complete',
      });
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
}

registerProfiledStoryteller(import.meta.url, 'accepted activity plans', checkAcceptedPlan);
