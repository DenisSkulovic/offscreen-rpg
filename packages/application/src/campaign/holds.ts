import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { campaign } from '@offscreen/db/campaign-schema';
import type { Transaction } from '../outbox/index';
import { projectCampaignClock } from './clock';
import type { CampaignRecord } from './persistence';

export const campaignHoldSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('storyteller-intent'),
    operationId: z.uuid(),
    reason: z.literal('required-turn'),
  }),
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
  z.strictObject({
    kind: z.literal('world-obligation'),
    obligationId: z.uuid(),
    reason: z.literal('controlling-event'),
  }),
]);
export const campaignHoldsSchema = z
  .array(campaignHoldSchema)
  .max(20)
  .refine(
    (holds) =>
      new Set(
        holds.map((hold) =>
          hold.kind === 'storyteller-intent'
            ? `storyteller-intent:${hold.operationId}`
            : hold.kind === 'storyteller'
              ? `storyteller:${hold.generationId}`
              : hold.kind === 'decision'
                ? `decision:${hold.offerId}`
                : `world-obligation:${hold.obligationId}`,
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

/**
 * Own the required-turn freeze in the transaction that creates its durable
 * preparation request. The worker later transfers this exact owner to a
 * generation; it never creates the first hold asynchronously.
 */
export async function holdCampaignForStorytellerIntent(
  tx: Transaction,
  state: CampaignRecord,
  operationId: string,
  now: number,
) {
  const holds = campaignHoldsSchema.parse(state.holds);
  if (
    holds.some(
      (hold) =>
        hold.kind === 'storyteller-intent' && hold.operationId === operationId,
    )
  ) {
    return state;
  }
  const projected = projectCampaignClock(
    state,
    now,
    { kind: 'none' },
    holds.length > 0,
  ).clock;
  const nextHolds = campaignHoldsSchema.parse([
    ...holds,
    { kind: 'storyteller-intent', operationId, reason: 'required-turn' },
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

/** Transfer a saved preparation intent to the exact admitted generation. */
export async function transitionStorytellerIntentToGeneration(
  tx: Transaction,
  state: CampaignRecord,
  operationId: string,
  generationId: string,
  now: number,
) {
  const holds = campaignHoldsSchema.parse(state.holds);
  const ownsIntent = holds.some(
    (hold) =>
      hold.kind === 'storyteller-intent' && hold.operationId === operationId,
  );
  if (!ownsIntent) {
    throw new Error(
      'Required Storyteller intent does not own the campaign hold',
    );
  }
  const nextHolds = campaignHoldsSchema.parse([
    ...holds.filter(
      (hold) =>
        !(
          hold.kind === 'storyteller-intent' && hold.operationId === operationId
        ),
    ),
    { kind: 'storyteller', generationId, reason: 'required-turn' },
  ]);
  await tx
    .update(campaign)
    .set({ clockAnchorAt: new Date(now), holds: nextHolds })
    .where(eq(campaign.storyId, state.storyId));
  return { ...state, clockAnchorAt: new Date(now), holds: nextHolds };
}

/** Transfer a fired world-event freeze to its exact preparation generation. */
export async function transitionWorldObligationHoldToGeneration(
  tx: Transaction,
  state: CampaignRecord,
  obligationId: string,
  generationId: string,
  now: number,
) {
  const holds = campaignHoldsSchema.parse(state.holds);
  const ownsEvent = holds.some(
    (hold) =>
      hold.kind === 'world-obligation' &&
      hold.obligationId === obligationId,
  );
  if (!ownsEvent) {
    throw new Error('World obligation does not own the campaign hold');
  }
  const nextHolds = campaignHoldsSchema.parse([
    ...holds.filter(
      (hold) =>
        !(
          hold.kind === 'world-obligation' &&
          hold.obligationId === obligationId
        ),
    ),
    { kind: 'storyteller', generationId, reason: 'required-turn' },
  ]);
  await tx
    .update(campaign)
    .set({ clockAnchorAt: new Date(now), holds: nextHolds })
    .where(eq(campaign.storyId, state.storyId));
  return { ...state, clockAnchorAt: new Date(now), holds: nextHolds };
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
