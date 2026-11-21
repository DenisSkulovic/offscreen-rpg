import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { campaign as campaignTable, campaignReport } from '@offscreen/db/campaign-schema';
import { createStorytellerRuntime } from '@offscreen/story-engine/storyteller';
import { scriptedStorytellerResult } from '@offscreen/storyteller/fixtures';
import { requireDefined } from './helpers/require.js';
import type { TestContext } from 'node:test';
import { type ProfiledStoryteller, eq } from './storyteller-suite.js';
import { registerProfiledStoryteller } from './storyteller-suite.js';

// Moved unchanged from the profiled Storyteller suite.
export async function checkActivitySettlement(
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
}

registerProfiledStoryteller(
  import.meta.url,
  'fictional time settlement and optional reporting',
  checkActivitySettlement,
  {
    distributedLive: process.env['STORYTELLER_DISTRIBUTED_V1'] === 'true',
  },
);
