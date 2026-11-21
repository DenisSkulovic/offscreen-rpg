import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { isDeepStrictEqual } from 'node:util';
import {
  campaign,
  campaignDelegatedOffer,
  gameActionExecution,
} from '@offscreen/db/campaign-schema';
import type { GameOffer } from '@offscreen/game/offers';
import type { NarrativeIntentPlan } from '@offscreen/game/narrative-intent';
import type { Transaction } from '@offscreen/db/outbox';
import {
  incrementStoryViewVersion,
  readDatabaseClockMs,
  type StoryRecord,
} from '../stories/persistence';
import { StoryError } from '../stories/errors';
import { saveCommand } from './settings';
import {
  campaignSituationAuthorization,
  type CampaignRecord,
} from './persistence';
import { consumeCampaignDecisionHold } from './holds';
import {
  recordActionExecutionEvent,
  scheduleActionExecution,
} from './action-executions';
import { narrativeIntentPlanSchema } from '@offscreen/game/narrative-intent';
import type { z } from 'zod';
import { actionCommandSchema } from '@offscreen/contracts/campaign';

export type TrustedCampaignActionSource =
  | { kind: 'player' }
  | {
      kind: 'preapproved-withdrawal';
      policyVersion: number;
      actionKey: string;
    };

export type ValidatedCampaignActionRequest = z.infer<
  typeof actionCommandSchema
> & {
  operationId: string;
};

async function markDelegatedOfferConsumedByPlayer(
  tx: Transaction,
  storyId: string,
  offerId: string,
  selectedAtMs: number,
) {
  await tx
    .update(campaignDelegatedOffer)
    .set({
      status: 'consumed',
      selectionSource: 'player',
      selectedAt: new Date(selectedAtMs),
    })
    .where(
      and(
        eq(campaignDelegatedOffer.storyId, storyId),
        eq(campaignDelegatedOffer.offerId, offerId),
        inArray(campaignDelegatedOffer.status, ['armed', 'paused']),
      ),
    );
}

/**
 * Admits a finite narrative-intent offer action for mechanics-absent campaigns.
 * Mirrors mechanical finite-action persistence without rolls, narration or items.
 */
export async function admitNarrativeIntentAction(
  tx: Transaction,
  current: StoryRecord,
  state: CampaignRecord,
  validatedRequest: ValidatedCampaignActionRequest,
  actionKey: string,
  plan: NarrativeIntentPlan,
  offer: GameOffer,
  trustedSource: TrustedCampaignActionSource,
  request: unknown,
) {
  const { operationId, offerId } = validatedRequest;
  if (state.character !== null || state.content !== null) {
    throw new StoryError('conflict');
  }
  if (offer.id !== offerId) {
    throw new StoryError('conflict');
  }
  const authorization = campaignSituationAuthorization(state);
  if (authorization.offerId !== offer.id) {
    throw new StoryError('conflict');
  }
  const parsedPlan = narrativeIntentPlanSchema.parse(plan);
  if (actionKey !== parsedPlan.key) {
    throw new StoryError('conflict');
  }

  const [existing] = await tx
    .select()
    .from(gameActionExecution)
    .where(eq(gameActionExecution.operationId, operationId));
  if (existing) {
    if (
      existing.storyId !== current.id ||
      existing.actionKey !== plan.key ||
      !isDeepStrictEqual(
        narrativeIntentPlanSchema.parse(existing.plan),
        parsedPlan,
      )
    ) {
      throw new StoryError('conflict');
    }
    return;
  }

  if (state.activeActionOperationId) {
    throw new StoryError('conflict');
  }

  const selectionNow = await readDatabaseClockMs(tx, current.id);
  const selectedState = await consumeCampaignDecisionHold(
    tx,
    state,
    offer.id,
    selectionNow,
  );
  const startGameSecond = selectedState.gameSecond;
  const targetGameSecond =
    startGameSecond + parsedPlan.fictionalDurationSeconds;

  await tx.insert(gameActionExecution).values({
    operationId,
    storyId: current.id,
    offerId: offer.id,
    actionKey: parsedPlan.key,
    baseRevision: current.revision,
    offer,
    plan: parsedPlan,
    pendingResolution: null,
    startGameSecond,
    targetGameSecond,
  });
  await recordActionExecutionEvent(tx, {
    storyId: current.id,
    executionId: operationId,
    executionRevision: 0,
    gameSecond: startGameSecond,
    kind: 'started',
    label: parsedPlan.label,
  });
  await tx
    .update(campaign)
    .set({
      offer: null,
      situationAuthorization: {
        version: 2,
        offerId: null,
        activityAccess: { kind: 'none' },
        preparedPlans: [],
      },
      activeActionOperationId: operationId,
      clockAnchorAt: new Date(selectionNow),
    })
    .where(eq(campaign.storyId, current.id));
  await incrementStoryViewVersion(tx, {
    storyId: current.id,
    viewVersion: current.viewVersion + 1,
  });
  await saveCommand(tx, current.id, operationId, request);
  if (trustedSource.kind === 'player') {
    await markDelegatedOfferConsumedByPlayer(
      tx,
      current.id,
      offer.id,
      selectionNow,
    );
  }
  await scheduleActionExecution(tx, operationId);
}