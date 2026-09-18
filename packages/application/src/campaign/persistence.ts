import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  campaign,
  gameOffer,
  gameRoll,
  gameActivity,
} from '@offscreen/db/campaign-schema';
import {
  immediateActionContentSchema,
  immediateActionPlanSchema,
  type ImmediateActionPlan,
} from '@offscreen/game/immediate-actions';
import type { Roll } from '@offscreen/game/checks';
import type { OutcomeEffect } from '@offscreen/game/effects';
import { offerSchema, type GameOffer } from '@offscreen/game/offers';
import { composeOpportunities } from '@offscreen/game/opportunities';
import { characterSchema } from '@offscreen/game/state';
import type { Transaction } from '../outbox/index';
import {
  advanceStoryView,
  insertContinuationPassage,
  type StoryRecord,
} from '../stories/persistence';
import { StoryError } from '../stories/errors';

export type CampaignRecord = typeof campaign.$inferSelect;
export type ActivityRecord = typeof gameActivity.$inferSelect;
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
    tick: number;
    plan: unknown;
    result: Roll;
    effects: OutcomeEffect[];
  },
) {
  await tx.insert(gameRoll).values({ id: randomUUID(), ...args });
}
export async function refreshOffer(
  tx: Transaction,
  state: CampaignRecord,
  activityState: string | null,
  narrativeRevision: number,
): Promise<GameOffer> {
  const opportunities = composeOpportunities({
    id: randomUUID(),
    content: immediateActionContentSchema.parse(state.content),
    character: campaignCharacter(state),
    busy: activityState === 'running' || activityState === 'paused',
  });
  await saveOfferPlans(
    tx,
    state.storyId,
    narrativeRevision,
    opportunities.offer.id,
    opportunities.plans,
  );
  await tx
    .update(campaign)
    .set({ offer: opportunities.offer })
    .where(eq(campaign.storyId, state.storyId));
  return opportunities.offer;
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
export function campaignOffer(state: CampaignRecord) {
  return offerSchema.parse(state.offer);
}
