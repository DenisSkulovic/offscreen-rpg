import { randomInt, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  campaign,
  gameActionExecution,
  gameActionExecutionEvent,
  gameActionReceipt,
} from '@offscreen/db/campaign-schema';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { enqueue, type Transaction } from '../outbox/index';
import {
  incrementStoryViewVersion,
  lockStoryById,
  readDatabaseClockMs,
} from '../stories/persistence';
import type { StoryRecord } from '../stories/persistence';
import { requireCampaign } from './persistence';
import { campaignActionTopic } from './topics';
import type { CampaignRecord } from './persistence';
import { decideActionExecutionTransition } from './action-execution-transition';
import { applyCampaignFollowUpIntents } from './follow-up-intents';
import { campaignClockHeld } from './holds';
import {
  fireWorldObligations,
  readNearestPendingWorldObligations,
} from './world-obligations';

type ActionExecutionRecord = typeof gameActionExecution.$inferSelect;
export type ActionExecutionEventKind =
  'started' | 'paused' | 'resumed' | 'pace-changed' | 'interrupted' | 'settled';

export async function recordActionExecutionEvent(
  tx: Transaction,
  args: {
    storyId: string;
    executionId: string;
    executionRevision: number;
    tick: number;
    kind: ActionExecutionEventKind;
    label: string;
  },
) {
  await tx.insert(gameActionExecutionEvent).values({
    id: randomUUID(),
    ...args,
  });
}

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

/**
 * Settles one admitted finite action under the story lock. A worker retry sees
 * the terminal execution row and cannot draw a second roll or apply effects
 * twice. Until the target is due, this operation is projection-only.
 */
export async function settleActionExecution(
  tx: Transaction,
  current: StoryRecord,
  state: CampaignRecord,
  execution: ActionExecutionRecord,
  now: number,
) {
  const plan = immediateActionPlanSchema.parse(execution.plan);
  const controllingObligations = await readNearestPendingWorldObligations(tx, {
    storyId: current.id,
    throughTick: execution.targetTick,
  });
  const controllingObligation = controllingObligations[0] ?? null;
  const transition = decideActionExecutionTransition({
    state,
    execution: {
      ...execution,
      ...(controllingObligation
        ? {
            controllingTick: Math.max(
              state.tick,
              controllingObligation.dueTick,
            ),
          }
        : {}),
    },
    clockHeld: campaignClockHeld(state),
    now,
    rollDie: () => randomInt(1, 21),
  });
  if (transition.state === 'waiting') return transition;

  if (transition.state === 'interrupted') {
    await tx
      .update(gameActionExecution)
      .set({
        state: 'interrupted',
        revision: transition.fact.executionRevision,
        settledAt: new Date(now),
      })
      .where(eq(gameActionExecution.operationId, execution.operationId));
    await recordActionExecutionEvent(tx, {
      storyId: current.id,
      executionId: execution.operationId,
      executionRevision: transition.fact.executionRevision,
      tick: transition.fact.tick,
      kind: transition.fact.kind,
      label: transition.fact.label,
    });
    await tx
      .update(campaign)
      .set({
        tick: transition.campaign.tick,
        clock: transition.campaign.clock,
        clockAnchorAt: transition.campaign.clockAnchorAt,
        activeActionOperationId: null,
      })
      .where(eq(campaign.storyId, current.id));
    const interruptedCampaign = controllingObligation
      ? await fireWorldObligations(
          tx,
          current,
          transition.campaign,
          controllingObligations,
          now,
        )
      : transition.campaign;
    await incrementStoryViewVersion(tx, {
      storyId: current.id,
      viewVersion: current.viewVersion + 1,
    });
    return { state: 'interrupted' as const, campaign: interruptedCampaign };
  }

  await tx.insert(gameActionReceipt).values({
    operationId: execution.operationId,
    storyId: current.id,
    offerId: execution.offerId,
    actionKey: execution.actionKey,
    baseRevision: execution.baseRevision,
    offer: execution.offer,
    plan,
    label: plan.label,
    intention: plan.intention,
    outcome: transition.receipt.outcome,
    outcomeText: transition.receipt.text,
    effects: transition.receipt.effects,
    declarations: transition.receipt.declarations,
    roll: transition.receipt.roll,
  });
  await tx
    .update(gameActionExecution)
    .set({
      state: 'settled',
      revision: transition.fact.executionRevision,
      settledAt: new Date(now),
    })
    .where(eq(gameActionExecution.operationId, execution.operationId));
  await recordActionExecutionEvent(tx, {
    storyId: current.id,
    executionId: execution.operationId,
    executionRevision: transition.fact.executionRevision,
    tick: transition.fact.tick,
    kind: transition.fact.kind,
    label: transition.fact.label,
  });
  await tx
    .update(campaign)
    .set({
      character: transition.campaign.character,
      storyFacts: transition.campaign.storyFacts,
      tick: transition.campaign.tick,
      clock: transition.campaign.clock,
      clockAnchorAt: transition.campaign.clockAnchorAt,
      activeActionOperationId: null,
    })
    .where(eq(campaign.storyId, current.id));
  await incrementStoryViewVersion(tx, {
    storyId: current.id,
    viewVersion: current.viewVersion + 1,
  });
  const settledCampaign = await applyCampaignFollowUpIntents(
    tx,
    transition.campaign,
    transition.followUps,
    now,
  );
  return { state: 'settled' as const, campaign: settledCampaign };
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

        const current = await lockStoryById(tx, reference.storyId);
        const state = await requireCampaign(tx, current.id);
        if (state.activeActionOperationId !== operationId) return null;
        const [execution] = await tx
          .select()
          .from(gameActionExecution)
          .where(eq(gameActionExecution.operationId, operationId));
        if (!execution || execution.state !== 'running') return null;

        const now = await readDatabaseClockMs(tx, current.id);
        const result = await settleActionExecution(
          tx,
          current,
          state,
          execution,
          now,
        );
        return result.state === 'waiting' ? result.remainingRealMs : null;
      });
    },
  };
}
