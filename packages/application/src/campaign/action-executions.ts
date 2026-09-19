import { randomInt, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  campaign,
  gameActionExecution,
  gameActionReceipt,
} from '@offscreen/db/campaign-schema';
import {
  immediateActionPlanSchema,
  resolveImmediateAction,
} from '@offscreen/game/immediate-actions';
import { realMsUntilTick } from '@offscreen/game/time';
import { enqueue, type Transaction } from '../outbox/index';
import {
  incrementStoryViewVersion,
  lockStoryById,
  readDatabaseClockMs,
} from '../stories/persistence';
import {
  campaignCharacter,
  campaignStoryFacts,
  requireCampaign,
} from './persistence';
import { campaignClockHeld, holdCampaignForStorytellerIntent } from './holds';
import { projectCampaignClock } from './clock';
import { requestActionNarration } from './narration';
import { campaignActionTopic } from './topics';

export async function scheduleActionExecution(
  tx: Transaction,
  operationId: string,
) {
  await enqueue(tx, {
    id: randomUUID(),
    operationId,
    topic: campaignActionTopic,
  });
}

export function createCampaignActionExecutions(database: Database) {
  return {
    async advance(operationId: string): Promise<number | null> {
      return database.db.transaction(async (tx) => {
        const [reference] = await tx
          .select()
          .from(gameActionExecution)
          .where(eq(gameActionExecution.operationId, operationId));
        if (!reference || reference.state !== 'running') return null;

        const plan = immediateActionPlanSchema.parse(reference.plan);
        if (
          plan.resolution.kind === 'process' ||
          plan.resolution.kind === 'resume'
        ) {
          throw new Error('Finite action execution contains an activity plan');
        }
        const current = await lockStoryById(tx, reference.storyId);
        const state = await requireCampaign(tx, current.id);
        if (state.activeActionOperationId !== operationId) return null;

        const now = await readDatabaseClockMs(tx, current.id);
        const projected = projectCampaignClock(
          state,
          now,
          { kind: 'accepted-action', operationId },
          campaignClockHeld(state),
          reference.targetTick,
        );
        if (projected.clock.elapsedTicks < reference.targetTick) {
          return realMsUntilTick(
            projected.clock,
            reference.targetTick,
            projected.pace,
          );
        }

        const resolved = resolveImmediateAction(
          campaignCharacter(state),
          campaignStoryFacts(state),
          plan,
          operationId,
          () => randomInt(1, 21),
        );
        await tx.insert(gameActionReceipt).values({
          operationId,
          storyId: current.id,
          offerId: reference.offerId,
          actionKey: reference.actionKey,
          baseRevision: reference.baseRevision,
          offer: reference.offer,
          plan,
          label: plan.label,
          intention: plan.intention,
          outcome: resolved.outcome,
          outcomeText: resolved.text,
          effects: resolved.effects,
          declarations: resolved.declarations,
          roll: resolved.roll,
        });
        await tx
          .update(gameActionExecution)
          .set({ state: 'settled', settledAt: new Date(now) })
          .where(eq(gameActionExecution.operationId, operationId));
        const settledState = {
          ...state,
          character: resolved.character,
          storyFacts: resolved.storyFacts,
          tick: reference.targetTick,
          clock: {
            ...projected.clock,
            elapsedTicks: reference.targetTick,
          },
          clockAnchorAt: new Date(now),
          activeActionOperationId: null,
        };
        await tx
          .update(campaign)
          .set({
            character: settledState.character,
            storyFacts: settledState.storyFacts,
            tick: settledState.tick,
            clock: settledState.clock,
            clockAnchorAt: settledState.clockAnchorAt,
            activeActionOperationId: null,
          })
          .where(eq(campaign.storyId, current.id));
        await incrementStoryViewVersion(tx, {
          storyId: current.id,
          viewVersion: current.viewVersion + 1,
        });
        await holdCampaignForStorytellerIntent(
          tx,
          settledState,
          operationId,
          now,
        );
        await requestActionNarration(tx, operationId);
        return null;
      });
    },
  };
}
