import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { campaign } from '@offscreen/db/campaign-schema';
import type { Transaction } from '../outbox/index';
import { projectCampaignClock } from './clock';
import type { CampaignRecord } from './persistence';

export const campaignHoldSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('storyteller'),
    generationId: z.uuid(),
    reason: z.literal('required-turn'),
  }),
  z.strictObject({
    kind: z.literal('decision'),
    offerId: z.uuid(),
    reason: z.literal('player-choice'),
  }),
]);
export const campaignHoldsSchema = z
  .array(campaignHoldSchema)
  .max(20)
  .refine(
    (holds) =>
      new Set(
        holds.map((hold) =>
          hold.kind === 'storyteller'
            ? `storyteller:${hold.generationId}`
            : `decision:${hold.offerId}`,
        ),
      ).size === holds.length,
    'Campaign hold owners must be unique',
  )
  .refine(
    (holds) => holds.filter((hold) => hold.kind === 'decision').length <= 1,
    'The solo campaign supports one unresolved player decision',
  );

export function campaignClockHeld(state: CampaignRecord) {
  return campaignHoldsSchema.parse(state.holds).length > 0;
}

/** Publication transfers the freeze from model work to the offered player choice. */
export async function transitionStorytellerHoldToDecision(
  tx: Transaction,
  state: CampaignRecord,
  generationId: string,
  offerId: string,
  now: number,
) {
  const holds = campaignHoldsSchema.parse(state.holds);
  if (
    !holds.some(
      (hold) =>
        hold.kind === 'storyteller' && hold.generationId === generationId,
    )
  ) {
    return state;
  }
  const nextHolds = campaignHoldsSchema.parse([
    ...holds.filter(
      (hold) =>
        !(hold.kind === 'storyteller' && hold.generationId === generationId),
    ),
    { kind: 'decision', offerId, reason: 'player-choice' },
  ]);
  await tx
    .update(campaign)
    .set({ clockAnchorAt: new Date(now), holds: nextHolds })
    .where(eq(campaign.storyId, state.storyId));
  return { ...state, clockAnchorAt: new Date(now), holds: nextHolds };
}

/** A validated selection consumes only the decision hold for its exact offer. */
export async function consumeCampaignDecisionHold(
  tx: Transaction,
  state: CampaignRecord,
  offerId: string,
  now: number,
) {
  const holds = campaignHoldsSchema.parse(state.holds);
  const nextHolds = holds.filter(
    (hold) => !(hold.kind === 'decision' && hold.offerId === offerId),
  );
  if (nextHolds.length === holds.length) return state;
  await tx
    .update(campaign)
    .set({ clockAnchorAt: new Date(now), holds: nextHolds })
    .where(eq(campaign.storyId, state.storyId));
  return { ...state, clockAnchorAt: new Date(now), holds: nextHolds };
}

/** Freeze at database time without discarding already-earned clock progress. */
export async function holdCampaignForStoryteller(
  tx: Transaction,
  state: CampaignRecord,
  generationId: string,
  now: number,
) {
  const holds = campaignHoldsSchema.parse(state.holds);
  if (
    holds.some(
      (hold) =>
        hold.kind === 'storyteller' && hold.generationId === generationId,
    )
  )
    return state;
  const projected = projectCampaignClock(state, now, holds.length > 0).clock;
  const nextHolds = campaignHoldsSchema.parse([
    ...holds,
    { kind: 'storyteller', generationId, reason: 'required-turn' },
  ]);
  await tx
    .update(campaign)
    .set({ clock: projected, clockAnchorAt: new Date(now), holds: nextHolds })
    .where(eq(campaign.storyId, state.storyId));
  return {
    ...state,
    clock: projected,
    clockAnchorAt: new Date(now),
    holds: nextHolds,
  };
}
