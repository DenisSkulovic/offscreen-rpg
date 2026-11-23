import { randomInt, randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { storyResolution } from '@offscreen/db/story-schema';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignCommand,
  campaignConsequence,
  campaignDelegatedOffer,
  gameActionExecution,
  gameActivity,
  storyDelegationPolicy,
} from '@offscreen/db/campaign-schema';
import { isDeclineHarmlessInvitation } from '@offscreen/game/delegation-eligibility';
import { actionCommandSchema } from '@offscreen/story-interface/campaign';
import {
  actionOverlapEligibility,
  consumePreparedActivityPlan,
  immediateActionAvailable,
  itemTransferBlocked,
  positiveItemTransfers,
  rebindPreparedResume,
  resolveImmediateAction,
} from '@offscreen/game/immediate-actions';
import { selectOfferAction } from '@offscreen/game/offers';
import { narrativeIntentPlanSchema } from '@offscreen/game/narrative-intent';
import {
  actionAvailable,
  initialActivityProgress,
  resolvedActivityPlanSchema,
} from '@offscreen/game/activities';
import {
  incrementStoryViewVersion,
  lockOwnedStory,
  lockStoryById,
  readDatabaseClockMs,
  readStoryItemHolders,
  type StoryRecord,
} from '../stories/persistence';
import type { Transaction } from '@offscreen/db/outbox';
import { canonicalPlanFingerprint } from './delegated-offer';
import { StoryError, parseStoryIdentifier } from '../stories/errors';
import { commandReceipt, saveCommand } from './settings';
import {
  campaignCharacter,
  campaignStoryFacts,
  campaignOffer,
  campaignSituationAuthorization,
  requireCampaign,
  loadOfferPlan,
  isImmediateActionPlan,
  isNarrativeIntentPlan,
  isNarrativeIntentPlanValue,
  processOccurrenceAvailable,
  recordActivityEvent,
} from './persistence';
import { admitNarrativeIntentAction } from './narrative-intent-action';
import { scheduleActivity } from './activities';
import {
  recordActionExecutionEvent,
  scheduleActionExecution,
} from './action-executions';
import { projectCampaignClock } from './clock';
import { campaignClockHeld, consumeCampaignDecisionHold } from './holds';
import {
  admitAcceptedPlanSuccessor,
  createAcceptedActivityPlan,
  reenterAcceptedActivityPlan,
  sameQuietRepeat,
} from './accepted-plans';
import { readPendingWorldObligations } from './world-obligations';
import { freezePendingActionResolution } from './action-overlap';
import { preparePendingActionNarration } from './narration';
import type { DocumentStore } from '@offscreen/documents';
import type { z } from 'zod';

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

/** Shared campaign action admission under an existing story row lock. */
export async function admitCampaignActionInTransaction(
  tx: Transaction,
  current: StoryRecord,
  validatedRequest: ValidatedCampaignActionRequest,
  trustedSource: TrustedCampaignActionSource,
  options: { documentStore?: DocumentStore } = {},
) {
  const {
    operationId,
    expectedRevision,
    offerId,
    path,
    successorPaths,
    horizonGameSeconds,
  } = validatedRequest;
  const parsedFields = {
    expectedRevision,
    offerId,
    path,
    successorPaths,
    horizonGameSeconds,
  };
  const request =
    trustedSource.kind === 'player'
      ? { kind: 'action' as const, ...parsedFields }
      : {
          kind: 'action' as const,
          source: 'preapproved-withdrawal' as const,
          policyVersion: trustedSource.policyVersion,
          actionKey: trustedSource.actionKey,
          ...parsedFields,
        };
  const [narration] = await tx
    .select()
    .from(storyResolution)
    .where(
      and(
        eq(storyResolution.storyId, current.id),
        eq(storyResolution.baseRevision, current.revision),
      ),
    );
  if (narration) {
    throw new StoryError('conflict');
  }
  const [pendingConsequence] = await tx
    .select({ operationId: campaignConsequence.operationId })
    .from(campaignConsequence)
    .where(
      and(
        eq(campaignConsequence.storyId, current.id),
        eq(campaignConsequence.baseRevision, current.revision),
      ),
    );
  // Another action cannot overtake the durable narration preparation that
  // owns this narrative revision. The committed result remains readable.
  if (pendingConsequence) {
    throw new StoryError('conflict');
  }
  const [existingExecution] = await tx
    .select()
    .from(gameActionExecution)
    .where(eq(gameActionExecution.operationId, operationId));
  if (
    existingExecution?.storyId === current.id &&
    isNarrativeIntentPlanValue(existingExecution.plan)
  ) {
    const parsedPlan = narrativeIntentPlanSchema.parse(existingExecution.plan);
    const replayKey = path[path.length - 1];
    if (
      existingExecution.actionKey !== replayKey ||
      parsedPlan.key !== replayKey ||
      existingExecution.offerId !== offerId
    ) {
      throw new StoryError('conflict');
    }
    return;
  }
  const [preState] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, current.id));
  if (!preState) {
    throw new StoryError('conflict');
  }
  if (preState.offer != null) {
    const preOffer = campaignOffer(preState);
    if (preOffer.id === offerId) {
      const preAuthorization = campaignSituationAuthorization(preState);
      if (preAuthorization.offerId === preOffer.id) {
        const preSelection = selectOfferAction(preOffer, path);
        if (preSelection.state === 'incomplete') {
          throw new StoryError('invalid');
        }
        if (preSelection.state === 'selected') {
          const storedPlan = await loadOfferPlan(tx, {
            storyId: current.id,
            offerId: preOffer.id,
            narrativeRevision: current.revision,
            actionKey: preSelection.actionKey,
          });
          if (storedPlan && isNarrativeIntentPlan(storedPlan)) {
            await admitNarrativeIntentAction(
              tx,
              current,
              preState,
              validatedRequest,
              preSelection.actionKey,
              storedPlan,
              preOffer,
              trustedSource,
              request,
            );
            return;
          }
        }
      }
    }
  }
  const state = await requireCampaign(tx, current.id);
  const offer = campaignOffer(state);
  const authorization = campaignSituationAuthorization(state);
  if (offer.id !== offerId) {
    throw new StoryError('conflict');
  }
  if (authorization.offerId !== offer.id) {
    throw new StoryError('conflict');
  }
  const selection = selectOfferAction(offer, path);
  if (selection.state === 'missing') {
    throw new StoryError('conflict');
  }
  if (selection.state === 'incomplete') {
    throw new StoryError('invalid');
  }
  const definition = await loadOfferPlan(tx, {
    storyId: current.id,
    offerId: offer.id,
    narrativeRevision: current.revision,
    actionKey: selection.actionKey,
  });
  if (
    !definition ||
    !isImmediateActionPlan(definition) ||
    !immediateActionAvailable(
      campaignCharacter(state),
      campaignStoryFacts(state),
      definition,
    )
  ) {
    throw new StoryError('conflict');
  }
  const acceptedSequence = [definition];
  for (const successorPath of successorPaths ?? []) {
    const successorSelection = selectOfferAction(offer, successorPath);
    if (successorSelection.state !== 'selected') {
      throw new StoryError('invalid');
    }
    const successor = await loadOfferPlan(tx, {
      storyId: current.id,
      offerId: offer.id,
      narrativeRevision: current.revision,
      actionKey: successorSelection.actionKey,
    });
    if (
      !successor ||
      !isImmediateActionPlan(successor) ||
      successor.resolution.kind !== 'process' ||
      authorization.activityAccess.kind !== 'selected' ||
      !authorization.activityAccess.actionKeys.includes(successor.key) ||
      admitAcceptedPlanSuccessor({
        accepted: acceptedSequence,
        successor,
      }) === 'reject'
    ) {
      throw new StoryError('conflict');
    }
    acceptedSequence.push(successor);
  }
  if (
    acceptedSequence.length > 1 &&
    acceptedSequence.some(
      (entry, index) => index > 0 && entry.key === acceptedSequence[0]?.key,
    ) &&
    !sameQuietRepeat(acceptedSequence)
  ) {
    throw new StoryError('conflict');
  }
  if (
    acceptedSequence.length > 1 &&
    definition.resolution.kind !== 'process'
  ) {
    throw new StoryError('invalid');
  }
  const selectionNow = await readDatabaseClockMs(tx, current.id);
  const selectedState = await consumeCampaignDecisionHold(
    tx,
    state,
    offer.id,
    selectionNow,
  );
  const acceptedHorizonGameSeconds = horizonGameSeconds;
  if (
    (definition.resolution.kind === 'process' ||
      definition.resolution.kind === 'resume') &&
    (authorization.activityAccess.kind !== 'selected' ||
      !authorization.activityAccess.actionKeys.includes(definition.key))
  ) {
    throw new StoryError('conflict');
  }
  const [active] = state.activeActivityId
    ? await tx
        .select()
        .from(gameActivity)
        .where(eq(gameActivity.id, state.activeActivityId))
    : [];
  if (state.activeActionOperationId) {
    throw new StoryError('conflict');
  }
  if (
    active &&
    (active.state === 'running' ||
      (active.state === 'paused' &&
        definition.resolution.kind !== 'process'))
  ) {
    throw new StoryError('conflict');
  }
  if (definition.resolution.kind === 'resume') {
    const resume = definition.resolution;
    if (
      resume.activityId === undefined ||
      resume.activityRevision === undefined
    ) {
      throw new StoryError('conflict');
    }
    const [retained] = await tx
      .select()
      .from(gameActivity)
      .where(eq(gameActivity.id, resume.activityId));
    if (
      !retained ||
      retained.storyId !== current.id ||
      retained.revision !== resume.activityRevision ||
      !['encounter', 'suspended', 'blocked'].includes(retained.state)
    ) {
      throw new StoryError('conflict');
    }
    const activePlan = resolvedActivityPlanSchema.parse(retained.plan);
    if (
      activePlan.action.id !== resume.activityActionId ||
      !actionAvailable(campaignCharacter(state), activePlan.action)
    ) {
      throw new StoryError('conflict');
    }
    const now = selectionNow;
    await tx
      .update(gameActivity)
      .set({
        state: 'running',
        revision: retained.revision + 1,
      })
      .where(eq(gameActivity.id, retained.id));
    await recordActivityEvent(tx, {
      storyId: current.id,
      activityId: retained.id,
      activityRevision: retained.revision + 1,
      gameSecond: state.gameSecond,
      kind: 'resumed',
      causeKey: `command:${operationId}`,
      label: activePlan.action.label,
      summary: `${activePlan.action.label} resumed with its saved progress.`,
    });
    await tx
      .update(campaign)
      .set({
        offer: null,
        situationAuthorization: {
          version: 2,
          offerId: null,
          activityAccess: { kind: 'none' },
          preparedPlans: consumePreparedActivityPlan(
            authorization.preparedPlans,
            definition,
          ),
        },
        activeActivityId: retained.id,
        clockAnchorAt: new Date(now),
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
        now,
      );
    }
    await scheduleActivity(tx, retained.id);
    return;
  }
  if (definition.resolution.kind === 'process') {
    if (!(await processOccurrenceAvailable(tx, state, definition))) {
      throw new StoryError('conflict');
    }
    // A new commitment takes the character's one advancing slot, but it does
    // not erase interrupted work. The retained row remains an explicit future
    // choice with the same identity, progress, rolls and captured terms.
    let retainedRevision: number | null = null;
    if (active && ['encounter', 'paused'].includes(active.state)) {
      retainedRevision = active.revision + 1;
      const retainedPlan = resolvedActivityPlanSchema.parse(active.plan);
      await tx
        .update(gameActivity)
        .set({ state: 'suspended', revision: active.revision + 1 })
        .where(eq(gameActivity.id, active.id));
      await recordActivityEvent(tx, {
        storyId: current.id,
        activityId: active.id,
        activityRevision: active.revision + 1,
        gameSecond: state.gameSecond,
        kind: 'suspended',
        causeKey: `command:${operationId}`,
        label: retainedPlan.action.label,
        summary: `${retainedPlan.action.label} was suspended while other work began.`,
      });
    } else if (active?.state === 'blocked') {
      // Blocked work is already dormant. Keep its blocker and exact revision;
      // starting another activity must not disguise it as voluntary suspension.
      retainedRevision = active.revision;
    }
    const now = selectionNow;
    const clockHeld =
      campaignClockHeld(selectedState) ||
      Boolean(active && ['encounter', 'paused'].includes(active.state));
    // Selection of new work starts at the current settled frontier. Idle
    // wall time and dormant commitments cannot be donated to a new job.
    const projected = projectCampaignClock(
      selectedState,
      now,
      { kind: 'none' },
      clockHeld,
    );
    const activityId = randomUUID();
    let acceptedPlan = null;
    if (acceptedSequence.length > 1) {
      if (acceptedHorizonGameSeconds === undefined) {
        throw new StoryError('invalid');
      }
      acceptedPlan = createAcceptedActivityPlan({
        offerId: offer.id,
        plans: acceptedSequence,
        firstActivityId: activityId,
        acceptedAtGameSecond: projected.clock.elapsedGameSeconds,
        horizonGameSeconds: acceptedHorizonGameSeconds,
      });
    } else {
      acceptedPlan = reenterAcceptedActivityPlan({
        value: state.acceptedActivityPlan,
        selectedPlan: definition,
        activityId,
        currentGameSecond: projected.clock.elapsedGameSeconds,
      });
    }
    await tx.insert(gameActivity).values({
      id: activityId,
      storyId: current.id,
      plan: {
        version: 6,
        action: definition.resolution.action,
        settingsRevision: state.settingsRevision,
        resolvedThroughGameSecond: 0,
      },
      state: 'running',
      boundariesSettled: 0,
      progress: initialActivityProgress(definition.resolution.action),
    });
    await recordActivityEvent(tx, {
      storyId: current.id,
      activityId,
      activityRevision: 0,
      gameSecond: projected.clock.elapsedGameSeconds,
      kind: 'started',
      causeKey: `command:${operationId}`,
      label: definition.resolution.action.label,
      summary: `${definition.resolution.action.label} started.`,
    });
    await tx
      .update(campaign)
      .set({
        offer: null,
        situationAuthorization: {
          version: 2,
          offerId: null,
          activityAccess: { kind: 'none' },
          preparedPlans:
            active && retainedRevision !== null
              ? rebindPreparedResume(
                  consumePreparedActivityPlan(
                    authorization.preparedPlans,
                    definition,
                  ),
                  active.id,
                  retainedRevision,
                )
              : consumePreparedActivityPlan(
                  authorization.preparedPlans,
                  definition,
                ),
        },
        activeActivityId: activityId,
        acceptedActivityPlan: acceptedPlan,
        gameSecond: projected.clock.elapsedGameSeconds,
        clock: projected.clock,
        clockAnchorAt: new Date(now),
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
        now,
      );
    }
    await scheduleActivity(tx, activityId);
    return;
  }
  const startGameSecond = selectedState.gameSecond;
  const targetGameSecond =
    startGameSecond + definition.resolution.fictionalDurationSeconds;
  const interveningObligations = await readPendingWorldObligations(tx, {
    storyId: current.id,
    throughGameSecond: targetGameSecond,
  });
  const transfers = positiveItemTransfers(definition);
  if (transfers.length > 0) {
    const items = await readStoryItemHolders(tx, current.id);
    if (itemTransferBlocked(transfers, items))
      throw new StoryError('conflict');
  }
  const overlap = actionOverlapEligibility({
    resolutionKind: definition.resolution.kind,
    hasInterveningWorldObligation: interveningObligations.length > 0,
    hasItemTransfer: transfers.length > 0,
  });
  const pendingResolution = overlap.eligible
    ? freezePendingActionResolution({
        character: campaignCharacter(selectedState),
        storyFacts: campaignStoryFacts(selectedState),
        startGameSecond,
        targetGameSecond,
        resolution: resolveImmediateAction(
          campaignCharacter(selectedState),
          campaignStoryFacts(selectedState),
          definition,
          operationId,
          () => randomInt(1, 21),
        ),
      })
    : null;
  await tx.insert(gameActionExecution).values({
    operationId,
    storyId: current.id,
    offerId: offer.id,
    actionKey: definition.key,
    baseRevision: current.revision,
    offer,
    plan: definition,
    pendingResolution,
    startGameSecond,
    targetGameSecond,
  });
  if (pendingResolution) {
    try {
      await preparePendingActionNarration(tx, current, {
        executionId: operationId,
        startGameSecond,
        targetGameSecond,
        offer,
        plan: definition,
        label: definition.label,
        intention: definition.intention,
        pending: pendingResolution,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'context_too_large' ||
          error.message === 'context_capture_too_large' ||
          error.message.includes('context_capture_too_large'))
      ) {
        throw new StoryError('unavailable', 'context_too_large');
      }
      throw error;
    }
  }
  await recordActionExecutionEvent(tx, {
    storyId: current.id,
    executionId: operationId,
    executionRevision: 0,
    gameSecond: startGameSecond,
    kind: 'started',
    label: definition.label,
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
      // An encounter action resolves the obstacle, not the interrupted
      // commitment. Keep its identity attached so subsequent narration can
      // offer a resume of the exact durable work and retained progress.
      activeActivityId: active?.state === 'encounter' ? active.id : null,
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

/** Forces the withdrawal transaction to roll back without committing a partial action. */
class PreapprovedWithdrawalDeclined extends Error {
  constructor() {
    super('preapproved-withdrawal-declined');
  }
}

export async function admitPreapprovedWithdrawal(
  database: Database,
  args: { storyId: string; offerId: string },
  documentStore?: DocumentStore,
): Promise<{ applied: boolean }> {
  try {
    return await database.db.transaction(async (tx) => {
    let current: StoryRecord;
    try {
      current = await lockStoryById(tx, args.storyId);
    } catch (error) {
      if (error instanceof StoryError && error.code === 'not_found') {
        return { applied: false };
      }
      throw error;
    }
    const [row] = await tx
      .select()
      .from(campaignDelegatedOffer)
      .where(eq(campaignDelegatedOffer.offerId, args.offerId));

    if (!row || row.storyId !== args.storyId || row.ownerId !== current.ownerId) {
      return { applied: false };
    }

    const clockMs = await readDatabaseClockMs(tx, current.id);

    const [existingCommand] = await tx
      .select({ operationId: campaignCommand.operationId })
      .from(campaignCommand)
      .where(
        and(
          eq(campaignCommand.storyId, current.id),
          eq(campaignCommand.operationId, row.actionOperationId),
        ),
      );
    if (existingCommand) {
      return { applied: true };
    }

    if (
      row.status !== 'armed' ||
      clockMs < row.dueAt.getTime()
    ) {
      return { applied: false };
    }

    const holdIneligible = async () => {
      await tx
        .update(campaignDelegatedOffer)
        .set({ status: 'held', remainingMs: null })
        .where(eq(campaignDelegatedOffer.offerId, row.offerId));
      return { applied: false as const };
    };

    const [policy] = await tx
      .select()
      .from(storyDelegationPolicy)
      .where(eq(storyDelegationPolicy.storyId, current.id));

    if (
      !policy?.enabled ||
      policy.ownerId !== current.ownerId ||
      policy.version !== row.capturedPolicyVersion
    ) {
      return holdIneligible();
    }

    const fallbackPlan = await loadOfferPlan(tx, {
      storyId: current.id,
      offerId: row.offerId,
      narrativeRevision: row.narrativeRevision,
      actionKey: row.fallbackActionKey,
    });

    if (
      !fallbackPlan ||
      !isImmediateActionPlan(fallbackPlan) ||
      !isDeclineHarmlessInvitation(fallbackPlan) ||
      canonicalPlanFingerprint(fallbackPlan, row.fallbackActionKey) !==
        row.sourceFingerprint
    ) {
      return holdIneligible();
    }

    const state = await requireCampaign(tx, current.id);
    const offer = campaignOffer(state);
    if (offer.id !== row.offerId) {
      return holdIneligible();
    }

    const path = JSON.parse(row.fallbackPath) as string[];
    const validatedRequest: ValidatedCampaignActionRequest = {
      operationId: row.actionOperationId,
      expectedRevision: current.revision,
      offerId: row.offerId,
      path,
    };

    try {
      await admitCampaignActionInTransaction(
        tx,
        current,
        validatedRequest,
        {
          kind: 'preapproved-withdrawal',
          policyVersion: row.capturedPolicyVersion,
          actionKey: row.fallbackActionKey,
        },
        documentStore === undefined ? {} : { documentStore },
      );
    } catch (error) {
      if (error instanceof StoryError) {
        throw new PreapprovedWithdrawalDeclined();
      }
      throw error;
    }

    await tx
      .update(campaignDelegatedOffer)
      .set({
        status: 'admitted',
        selectionSource: 'preapproved-withdrawal',
        selectedAt: new Date(clockMs),
      })
      .where(eq(campaignDelegatedOffer.offerId, row.offerId));

    return { applied: true };
    });
  } catch (error) {
    if (error instanceof PreapprovedWithdrawalDeclined) {
      return { applied: false };
    }
    throw error;
  }
}

export function createCampaignActions(
  database: Database,
  documentStore?: DocumentStore,
) {
  return async function act(args: {
    ownerId: string;
    storyId: string;
    operationId: string;
    body: unknown;
  }) {
    const parsed = actionCommandSchema.safeParse(args.body);
    if (!parsed.success) {
      throw new StoryError('invalid');
    }
    parseStoryIdentifier(args.storyId);
    await database.db.transaction(async (tx) => {
      const current = await lockOwnedStory(tx, args);
      const request = { kind: 'action', ...parsed.data };
      if (await commandReceipt(tx, current.id, args.operationId, request)) {
        return;
      }
      if (current.revision !== parsed.data.expectedRevision) {
        throw new StoryError('conflict');
      }
      await admitCampaignActionInTransaction(
        tx,
        current,
        { operationId: args.operationId, ...parsed.data },
        { kind: 'player' },
        documentStore === undefined ? {} : { documentStore },
      );
    });
  };
}
