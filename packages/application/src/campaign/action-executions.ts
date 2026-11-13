import { randomInt, randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  campaign,
  gameActionExecution,
  gameActionExecutionEvent,
  gameActionReceipt,
} from '@offscreen/db/campaign-schema';
import { storyPassage } from '@offscreen/db/story-schema';
import {
  immediateActionPlanSchema,
  positiveItemTransfers,
} from '@offscreen/game/immediate-actions';
import { enqueue, type Transaction } from '../outbox/index';
import {
  applyStoryItemEffects,
  incrementStoryViewVersion,
  lockStoryById,
  readDatabaseClockMs,
  readStoryItemHolders,
  type StoryRecord,
} from '../stories/persistence';
import { requireCampaign } from './persistence';
import { campaignActionTopic } from './topics';
import type { CampaignRecord } from './persistence';
import { decideActionExecutionTransition } from './action-execution-transition';
import { applyCampaignFollowUpIntents } from './follow-up-intents';
import { campaignClockHeld, holdCampaignForStorytellerIntent } from './holds';
import { requestConsequenceNarration } from './narration';
import {
  fireWorldObligations,
  readNearestPendingWorldObligations,
  readPendingWorldObligations,
} from './world-obligations';
import { appendPublicStoryEvent } from '../stories/public-events';
import type { DocumentStore } from '@offscreen/documents';

type ActionExecutionRecord = typeof gameActionExecution.$inferSelect;
export type ActionExecutionEventKind =
  'started' | 'paused' | 'resumed' | 'pace-changed' | 'interrupted' | 'settled';

export async function recordActionExecutionEvent(
  tx: Transaction,
  args: {
    storyId: string;
    executionId: string;
    executionRevision: number;
    gameSecond: number;
    kind: ActionExecutionEventKind;
    label: string;
  },
) {
  const id = randomUUID();
  await tx.insert(gameActionExecutionEvent).values({
    id,
    ...args,
  });
  if (args.kind === 'settled' || args.kind === 'interrupted') {
    await appendPublicStoryEvent(tx, {
      storyId: args.storyId,
      kind:
        args.kind === 'settled' ? 'action-settled' : 'action-interrupted',
      gameSecond: args.gameSecond,
      title: args.label.slice(0, 200),
      summary:
        args.kind === 'interrupted'
          ? 'The accepted action could not complete as planned.'
          : null,
      sourceKind: 'action-execution',
      sourceId: id,
    });
  }
  return id;
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
  documentStore?: DocumentStore,
) {
  const plan = immediateActionPlanSchema.parse(execution.plan);
  const items = await readStoryItemHolders(tx, current.id);
  const controllingObligations = await readNearestPendingWorldObligations(tx, {
    storyId: current.id,
    throughGameSecond: execution.targetGameSecond,
    followUp: 'controlling-scene',
  });
  const controllingObligation = controllingObligations[0] ?? null;
  const transition = decideActionExecutionTransition({
    state,
    execution: {
      ...execution,
      ...(controllingObligation
        ? {
            controllingGameSecond: Math.max(
              state.gameSecond,
              controllingObligation.dueGameSecond,
            ),
          }
        : {}),
      items,
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
    const eventId = await recordActionExecutionEvent(tx, {
      storyId: current.id,
      executionId: execution.operationId,
      executionRevision: transition.fact.executionRevision,
      gameSecond: transition.fact.gameSecond,
      kind: transition.fact.kind,
      label: transition.fact.label,
    });
    await tx
      .update(campaign)
      .set({
        gameSecond: transition.campaign.gameSecond,
        clock: transition.campaign.clock,
        clockAnchorAt: transition.campaign.clockAnchorAt,
        activeActionOperationId: null,
      })
      .where(eq(campaign.storyId, current.id));
    const reportObligations = await readPendingWorldObligations(tx, {
      storyId: current.id,
      throughGameSecond: transition.campaign.gameSecond,
      followUp: 'report',
    });
    let interruptedCampaign = transition.campaign;
    if (transition.cause === 'controlling-world-obligation') {
      if (!controllingObligation) {
        throw new Error(
          'Controlling interrupt missing its world-obligation owner',
        );
      }
      interruptedCampaign = await fireWorldObligations(
        tx,
        current,
        transition.campaign,
        [...reportObligations, ...controllingObligations],
        now,
        documentStore,
      );
    } else if (transition.cause === 'required-item-holder-changed') {
      if (controllingObligation) {
        throw new Error(
          'Item-holder interrupt must not share a controlling world obligation',
        );
      }
      if (execution.preparationGenerationId) {
        throw new Error(
          'Item-transfer interrupt must not reuse a speculative preparation',
        );
      }
      const [passage] = await tx
        .select({ id: storyPassage.id })
        .from(storyPassage)
        .where(
          and(
            eq(storyPassage.storyId, current.id),
            eq(storyPassage.sequence, current.revision),
          ),
        );
      if (!passage) {
        throw new Error('Missing current passage for interrupted action');
      }
      const itemKeys = positiveItemTransfers(plan).map(
        (transfer) => transfer.itemKey,
      );
      if (!itemKeys.length) {
        throw new Error('Item-holder interrupt missing required item keys');
      }
      const intention =
        'The accepted transfer could not complete; the required item was no longer available.';
      await requestConsequenceNarration(tx, current, {
        kind: 'action-interrupted',
        passageId: passage.id,
        operationId: execution.operationId,
        executionId: execution.operationId,
        executionRevision: transition.fact.executionRevision,
        gameSecond: transition.fact.gameSecond,
        cause: 'required-item-holder-changed',
        offerId: execution.offerId,
        actionKey: execution.actionKey,
        itemKeys,
        eventId,
        label: transition.fact.label.slice(0, 200),
        intention: intention.slice(0, 500),
      });
      interruptedCampaign = await holdCampaignForStorytellerIntent(
        tx,
        transition.campaign,
        execution.operationId,
        now,
      );
    } else {
      transition.cause satisfies never;
      throw new Error('Unknown action interrupt cause');
    }
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
    generationId: execution.preparationGenerationId,
  });
  if (
    transition.receipt.outcome !== 'failure' &&
    transition.receipt.worldEffects.length > 0
  ) {
    await applyStoryItemEffects(tx, {
      storyId: current.id,
      effects: transition.receipt.worldEffects,
    });
  }
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
    gameSecond: transition.fact.gameSecond,
    kind: transition.fact.kind,
    label: transition.fact.label,
  });
  await tx
    .update(campaign)
    .set({
      character: transition.campaign.character,
      storyFacts: transition.campaign.storyFacts,
      gameSecond: transition.campaign.gameSecond,
      clock: transition.campaign.clock,
      clockAnchorAt: transition.campaign.clockAnchorAt,
      activeActionOperationId: null,
    })
    .where(eq(campaign.storyId, current.id));
  const reportObligations = await readPendingWorldObligations(tx, {
    storyId: current.id,
    throughGameSecond: transition.campaign.gameSecond,
    followUp: 'report',
  });
  const campaignWithReports = await fireWorldObligations(
    tx,
    current,
    transition.campaign,
    reportObligations,
    now,
    documentStore,
  );
  await incrementStoryViewVersion(tx, {
    storyId: current.id,
    viewVersion: current.viewVersion + 1,
  });
  const settledCampaign = await applyCampaignFollowUpIntents(
    tx,
    campaignWithReports,
    transition.followUps,
    now,
    documentStore,
  );
  return { state: 'settled' as const, campaign: settledCampaign };
}

export function createCampaignActionExecutions(
  database: Database,
  documentStore?: DocumentStore,
) {
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
          documentStore,
        );
        return result.state === 'waiting' ? result.remainingRealMs : null;
      });
    },
  };
}
