import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { generation } from '@offscreen/db/generation-schema';
import { campaignConsequence, gameActionExecution, gameActionExecutionEvent, gameActionReceipt } from '@offscreen/db/campaign-schema';
import { storytellerTaskSchema } from '@offscreen/storyteller/tasks';
import { requireDefined } from './helpers/require.js';
import type { TestContext } from 'node:test';
import { type ProfiledStoryteller, eq, asc, inspectStorytellerProgress } from './storyteller-suite.js';
import { registerProfiledStoryteller } from './storyteller-suite.js';

// Moved unchanged from the profiled Storyteller suite.
export async function checkWorkerReplay(
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
        fictionalSeconds: 5,
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
      let lastControl: {
        revision: number;
        state: string;
        generationId: string | null;
      } | null = null;
      let released = false;
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
        lastControl = controlBody.control;
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
          released = true;
          break;
        }
        await delay(500);
        held = await stories.read({
          ownerId,
          storyId: started.storyId,
        });
      }
      if (!released) {
        const progress = await inspectStorytellerProgress(database, {
          storyId: started.storyId,
          operationId,
        });
        assert.ok(
          released,
          `Worker-replay never reached chamber held + generating receipt. control=${JSON.stringify(lastControl)} public=${JSON.stringify({
            gameSecond: held.campaign?.gameSecond,
            receiptState: held.campaign?.actionReceipts[0]?.state,
            receiptCount: held.campaign?.actionReceipts.length,
            evidence: held.resolution?.evidence,
            blocker: held.resolution?.blocker,
            holds: held.campaign?.holds,
            execution: held.campaign?.actionExecution,
          })} progress=${JSON.stringify(progress)}`,
        );
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
}

registerProfiledStoryteller(
  import.meta.url,
  'worker restart and activity replay',
  checkWorkerReplay,
  {
    executionMode: 'worker',
    distributedLive: process.env['STORYTELLER_DISTRIBUTED_V1'] === 'true',
  },
);
