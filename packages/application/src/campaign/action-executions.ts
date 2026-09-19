import { randomInt, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  campaign,
  gameActionExecution,
  gameActionExecutionEvent,
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
import type { StoryRecord } from '../stories/persistence';
import {
  campaignCharacter,
  campaignStoryFacts,
  requireCampaign,
} from './persistence';
import { campaignClockHeld, holdCampaignForStorytellerIntent } from './holds';
import { projectCampaignClock } from './clock';
import { requestActionNarration } from './narration';
import { campaignActionTopic } from './topics';
import type { CampaignRecord } from './persistence';

type ActionExecutionRecord = typeof gameActionExecution.$inferSelect;
export type ActionExecutionEventKind =
  'started' | 'paused' | 'resumed' | 'pace-changed' | 'settled';

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
  if (plan.resolution.kind === 'process' || plan.resolution.kind === 'resume') {
    throw new Error('Finite action execution contains an activity plan');
  }
  const projected = projectCampaignClock(
    state,
    now,
    { kind: 'accepted-action', operationId: execution.operationId },
    campaignClockHeld(state),
    execution.targetTick,
  );
  if (projected.clock.elapsedTicks < execution.targetTick) {
    return {
      state: 'waiting' as const,
      projected,
      remainingRealMs: realMsUntilTick(
        projected.clock,
        execution.targetTick,
        projected.pace,
      ),
    };
  }

  const resolved = resolveImmediateAction(
    campaignCharacter(state),
    campaignStoryFacts(state),
    plan,
    execution.operationId,
    () => randomInt(1, 21),
  );
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
    outcome: resolved.outcome,
    outcomeText: resolved.text,
    effects: resolved.effects,
    declarations: resolved.declarations,
    roll: resolved.roll,
  });
  await tx
    .update(gameActionExecution)
    .set({
      state: 'settled',
      revision: execution.revision + 1,
      settledAt: new Date(now),
    })
    .where(eq(gameActionExecution.operationId, execution.operationId));
  await recordActionExecutionEvent(tx, {
    storyId: current.id,
    executionId: execution.operationId,
    executionRevision: execution.revision + 1,
    tick: execution.targetTick,
    kind: 'settled',
    label: plan.label,
  });
  const settledState = {
    ...state,
    character: resolved.character,
    storyFacts: resolved.storyFacts,
    tick: execution.targetTick,
    clock: projected.clock,
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
    execution.operationId,
    now,
  );
  await requestActionNarration(tx, execution.operationId);
  return { state: 'settled' as const, campaign: settledState };
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
