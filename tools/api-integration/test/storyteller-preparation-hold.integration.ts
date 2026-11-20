import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { generation } from '@offscreen/db/generation-schema';
import { campaign as campaignTable, gameActionExecution, gameActionReceipt } from '@offscreen/db/campaign-schema';
import { story } from '@offscreen/db/story-schema';
import { requireDefined } from './helpers/require.js';
import type { TestContext } from 'node:test';
import { type ProfiledStoryteller, eq, inspectStorytellerProgress } from './storyteller-suite.js';
import { registerProfiledStoryteller } from './storyteller-suite.js';

// Moved unchanged from the profiled Storyteller suite.
export async function checkPreparationHold(
  t: TestContext,
  {
    database,
    ownerId,
    origin,
    cookie,
    restartWorker,
    stories,
    storyService,
    mechanicalCandidate,
  }: ProfiledStoryteller,
): Promise<void> {
  await t.test(
    'failed preparation preserves the committed outcome and intent-owned clock hold',
    async () => {
      const started = await mechanicalCandidate(undefined, {
        kind: 'instant',
      });
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
      await storyService.advanceCampaignAction(operationId);
      const [admittedReceipt] = await database.db
        .select({ generationId: gameActionReceipt.generationId })
        .from(gameActionReceipt)
        .where(eq(gameActionReceipt.operationId, operationId));
      // ENG03-narrow: settlement links the receipt to the narration G
      // reserved at admission, so that generation owns the clock hold.
      const captureGenerationId = requireDefined(
        admittedReceipt?.generationId,
        'Expected the admission-time narration identity',
      );
      const [beforeFailure] = await database.db
        .select({
          clock: campaignTable.clock,
          holds: campaignTable.holds,
        })
        .from(campaignTable)
        .where(eq(campaignTable.storyId, started.storyId));
      assert.deepEqual(beforeFailure?.holds, [
        {
          kind: 'storyteller',
          generationId: captureGenerationId,
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
      // ENG03-narrow: the revision fence now lives in the capture frozen at
      // admission, so promoting the already-reserved G no longer re-reads
      // the live revision (that rejection remains only for the legacy
      // committed-capture path, which has no admission-time G). Whatever
      // preparation does here, it must not lose the committed outcome,
      // unlink the receipt from G, or open a clock-projection gap.
      await storyService.prepareCampaignConsequence(operationId);

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
      assert.equal(receipt?.generationId, captureGenerationId);
      assert.ok(receipt?.outcome);
      assert.ok(receipt?.effects);
      assert.deepEqual(afterFailure?.clock, beforeFailure?.clock);
      assert.deepEqual(afterFailure?.holds, beforeFailure?.holds);
    },
  );
  await t.test(
    'Chamber failure holds time until the same generation is retried',
    async () => {
      const started = await mechanicalCandidate(undefined, {
        kind: 'instant',
      });
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
      await storyService.advanceCampaignAction(operationId);
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
      if (failed.resolution?.blocker?.recovery !== 'retry') {
        const controlResponse = await fetch(controlUrl, {
          headers: { cookie },
        });
        const controlBody = (await controlResponse.json()) as {
          control: { state: string; revision: number; generationId: string | null };
        };
        const progress = await inspectStorytellerProgress(database, {
          storyId: started.storyId,
          operationId,
        });
        assert.equal(
          failed.resolution?.blocker?.recovery,
          'retry',
          `Chamber retry prerequisite never became true. control=${JSON.stringify(controlBody.control)} publicResolution=${JSON.stringify({
            state: failed.resolution?.state,
            evidence: failed.resolution?.evidence,
            blocker: failed.resolution?.blocker,
            holds: failed.campaign?.holds,
          })} progress=${JSON.stringify(progress)}`,
        );
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
      for (let attempt = 0; attempt < 100; attempt++) {
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
      // The generation row is succeeded (asserted above) but the public read
      // keeps a succeeded-yet-unpublished resolution as 'running'.
      assert.equal(paused.resolution?.state, 'running');

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
}

registerProfiledStoryteller(import.meta.url, 'preparation holds and world-boundary overlap', checkPreparationHold);
