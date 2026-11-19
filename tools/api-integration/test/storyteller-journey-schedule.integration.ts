import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { campaignConsequence, campaignReport, worldObligation, worldObligationEvent } from '@offscreen/db/campaign-schema';
import { requireDefined } from './helpers/require.js';
import type { TestContext } from 'node:test';
import { type ProfiledStoryteller, eq } from './storyteller-suite.js';
import { registerProfiledStoryteller } from './storyteller-suite.js';

// Moved unchanged from the profiled Storyteller suite.
export async function checkJourneySchedule(
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
}

registerProfiledStoryteller(import.meta.url, 'journey schedules and calendar interruption', checkJourneySchedule);
