import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import type { CampaignActivityEventKind } from '@offscreen/contracts/campaign';
import {
  campaign,
  gameOffer,
  gameRoll,
  gameActivity,
  gameActivityEvent,
} from '@offscreen/db/campaign-schema';
import {
  immediateActionContentSchema,
  immediateActionAvailable,
  immediateActionPlanSchema,
  situationAuthorizationSchema,
  type ImmediateActionPlan,
} from '@offscreen/game/immediate-actions';
import type { Roll } from '@offscreen/game/checks';
import type { OutcomeEffect } from '@offscreen/game/effects';
import { offerSchema, type GameOffer } from '@offscreen/game/offers';
import { composeOpportunities } from '@offscreen/game/opportunities';
import { characterSchema, storyFactsSchema } from '@offscreen/game/state';
import {
  activityOccurrenceAvailable,
  activityOccurrencesSchema,
  resolvedActivityPlanSchema,
} from '@offscreen/game/activities';
import type { Transaction } from '../outbox/index';
import {
  advanceStoryView,
  insertContinuationPassage,
  type StoryRecord,
} from '../stories/persistence';
import { StoryError } from '../stories/errors';

export type CampaignRecord = typeof campaign.$inferSelect;
export type ActivityRecord = typeof gameActivity.$inferSelect;
export type ActivityEventKind = CampaignActivityEventKind;
export async function requireCampaign(tx: Transaction, storyId: string) {
  const [state] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, storyId));
  if (!state || !state.character || !state.content)
    throw new StoryError('conflict');
  return state;
}
export async function recordRoll(
  tx: Transaction,
  args: {
    storyId: string;
    operationId: string;
    segment: number;
    checkKey: string;
    gameSecond: number;
    plan: unknown;
    result: Roll;
    effects: OutcomeEffect[];
  },
) {
  await tx.insert(gameRoll).values({ id: randomUUID(), ...args });
}

/**
 * Appends player-meaningful history inside the transaction that changes the
 * activity. The cause fence makes command and worker replay invisible.
 */
export async function recordActivityEvent(
  tx: Transaction,
  args: {
    storyId: string;
    activityId: string;
    activityRevision: number;
    gameSecond: number;
    kind: ActivityEventKind;
    causeKey: string;
    label: string;
    summary: string;
    details?: unknown;
  },
) {
  const details = args.details ?? {};
  await tx
    .insert(gameActivityEvent)
    .values({ id: randomUUID(), ...args, details })
    .onConflictDoNothing();
  const [saved] = await tx
    .select()
    .from(gameActivityEvent)
    .where(
      and(
        eq(gameActivityEvent.activityId, args.activityId),
        eq(gameActivityEvent.causeKey, args.causeKey),
        eq(gameActivityEvent.kind, args.kind),
      ),
    );
  if (
    !saved ||
    saved.storyId !== args.storyId ||
    saved.activityRevision !== args.activityRevision ||
    saved.gameSecond !== args.gameSecond ||
    saved.label !== args.label ||
    saved.summary !== args.summary ||
    !isDeepStrictEqual(saved.details, details)
  ) {
    throw new Error('Activity event identity conflict');
  }
}
export async function refreshOffer(
  tx: Transaction,
  state: CampaignRecord,
  narrativeRevision: number,
  allowPreparedActivities: boolean,
): Promise<GameOffer> {
  const authorization = campaignSituationAuthorization(state);
  const eligiblePlans: ImmediateActionPlan[] = [];
  if (allowPreparedActivities) {
    for (const plan of authorization.preparedPlans) {
      if (
        !immediateActionAvailable(
          campaignCharacter(state),
          campaignStoryFacts(state),
          plan,
        )
      ) {
        continue;
      }
      if (
        plan.resolution.kind === 'process' &&
        !(await processOccurrenceAvailable(tx, state, plan))
      ) {
        continue;
      }
      if (plan.resolution.kind === 'resume') {
        const resume = plan.resolution;
        if (!resume.activityId || resume.activityRevision === undefined) {
          continue;
        }
        const [retained] = await tx
          .select()
          .from(gameActivity)
          .where(eq(gameActivity.id, resume.activityId));
        if (
          !retained ||
          retained.storyId !== state.storyId ||
          retained.revision !== resume.activityRevision ||
          !['encounter', 'suspended', 'blocked'].includes(retained.state)
        ) {
          continue;
        }
      }
      eligiblePlans.push(plan);
    }
  }
  const opportunities = composeOpportunities({
    id: randomUUID(),
    content: immediateActionContentSchema.parse({
      version: 1,
      id: `prepared-${state.storyId}`,
      plans: eligiblePlans,
    }),
    character: campaignCharacter(state),
    storyFacts: campaignStoryFacts(state),
    busy: false,
  });
  const offer = offerSchema.parse(opportunities.offer);
  await saveOfferPlans(
    tx,
    state.storyId,
    narrativeRevision,
    offer.id,
    opportunities.plans,
  );
  const activityAccess = opportunities.plans.length
    ? {
        kind: 'selected' as const,
        actionKeys: opportunities.plans.map((plan) => plan.key),
      }
    : { kind: 'none' as const };
  await tx
    .update(campaign)
    .set({
      offer,
      situationAuthorization: {
        version: 2,
        offerId: offer.id,
        activityAccess,
        preparedPlans: authorization.preparedPlans,
      },
    })
    .where(eq(campaign.storyId, state.storyId));
  return offer;
}

export function campaignActivityOccurrences(state: CampaignRecord) {
  return activityOccurrencesSchema.parse(state.activityOccurrences);
}

/**
 * Finite scope is campaign history, not offer history. An unfinished instance
 * reserves its limited scope so switching work cannot create a duplicate.
 */
export async function processOccurrenceAvailable(
  tx: Transaction,
  state: CampaignRecord,
  plan: ImmediateActionPlan,
) {
  if (plan.resolution.kind !== 'process') return true;
  const action = plan.resolution.action;
  if (
    !activityOccurrenceAvailable(campaignActivityOccurrences(state), action)
  ) {
    return false;
  }
  if (action.occurrence.kind === 'unbounded') return true;
  const policy = action.occurrence;
  const activities = await tx
    .select({ plan: gameActivity.plan, state: gameActivity.state })
    .from(gameActivity)
    .where(eq(gameActivity.storyId, state.storyId));
  return !activities.some((candidate) => {
    if (
      ['complete', 'failed', 'expired', 'invalidated', 'abandoned'].includes(
        candidate.state,
      )
    ) {
      return false;
    }
    const parsed = resolvedActivityPlanSchema.safeParse(candidate.plan);
    return (
      parsed.success &&
      parsed.data.action.occurrence.kind === 'limited' &&
      parsed.data.action.occurrence.scopeKey === policy.scopeKey
    );
  });
}

export async function saveOfferPlans(
  tx: Transaction,
  storyId: string,
  narrativeRevision: number,
  offerId: string,
  plans: readonly ImmediateActionPlan[],
) {
  await tx.insert(gameOffer).values({
    id: offerId,
    storyId,
    narrativeRevision,
    plans: plans.map((plan) => immediateActionPlanSchema.parse(plan)),
  });
}

export async function loadOfferPlan(
  tx: Transaction,
  input: {
    storyId: string;
    offerId: string;
    narrativeRevision: number;
    actionKey: string;
  },
) {
  const [stored] = await tx
    .select()
    .from(gameOffer)
    .where(
      and(
        eq(gameOffer.id, input.offerId),
        eq(gameOffer.storyId, input.storyId),
        eq(gameOffer.narrativeRevision, input.narrativeRevision),
      ),
    );
  if (!stored) return null;
  return (
    z
      .array(immediateActionPlanSchema)
      .parse(stored.plans)
      .find((plan) => plan.key === input.actionKey) ?? null
  );
}
export async function appendMechanicalPassage(
  tx: Transaction,
  current: StoryRecord,
  title: string,
  paragraphs: string[],
) {
  const passageId = await insertContinuationPassage(tx, {
    storyId: current.id,
    sequence: current.revision + 1,
    transitionId: randomUUID(),
    responseSource: null,
    input: {
      expectedRevision: current.revision,
      content: { version: 1, title, paragraphs },
      effects: [],
      response: null,
      interaction: null,
      wait: null,
      decision: null,
    },
  });
  await advanceStoryView(tx, {
    storyId: current.id,
    revision: current.revision + 1,
    viewVersion: current.viewVersion + 1,
  });
  return passageId;
}
export function campaignCharacter(state: CampaignRecord) {
  return characterSchema.parse(state.character);
}
export function campaignStoryFacts(state: CampaignRecord) {
  return storyFactsSchema.parse(state.storyFacts);
}
export function campaignOffer(state: CampaignRecord) {
  return offerSchema.parse(state.offer);
}
export function campaignSituationAuthorization(state: CampaignRecord) {
  return situationAuthorizationSchema.parse(state.situationAuthorization);
}
