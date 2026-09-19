import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { campaign, gameActivity } from '@offscreen/db/campaign-schema';
import { enqueue, type Transaction } from '../outbox/index';
import { projectCampaignClock } from './clock';
import type { CampaignRecord } from './persistence';
import { campaignActivityTopic } from './topics';

export const campaignHoldSchema = z.strictObject({
  kind: z.literal('storyteller'),
  generationId: z.uuid(),
  reason: z.literal('required-turn'),
});
export const campaignHoldsSchema = z
  .array(campaignHoldSchema)
  .max(20)
  .refine(
    (holds) =>
      new Set(holds.map((hold) => hold.generationId)).size === holds.length,
    'Campaign hold owners must be unique',
  );

export function campaignClockHeld(state: CampaignRecord) {
  return campaignHoldsSchema.parse(state.holds).length > 0;
}

/** Freeze at database time without discarding already-earned clock progress. */
export async function holdCampaignForStoryteller(
  tx: Transaction,
  state: CampaignRecord,
  generationId: string,
  now: number,
) {
  const holds = campaignHoldsSchema.parse(state.holds);
  if (holds.some((hold) => hold.generationId === generationId)) return state;
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

/** Clearing one owner never clears another hold and never earns held wall time. */
export async function releaseCampaignStorytellerHold(
  tx: Transaction,
  state: CampaignRecord,
  generationId: string,
  now: number,
) {
  const holds = campaignHoldsSchema.parse(state.holds);
  if (!holds.some((hold) => hold.generationId === generationId)) return state;
  const nextHolds = holds.filter((hold) => hold.generationId !== generationId);
  await tx
    .update(campaign)
    .set({ clockAnchorAt: new Date(now), holds: nextHolds })
    .where(eq(campaign.storyId, state.storyId));
  if (nextHolds.length === 0 && state.activeActivityId) {
    const [activity] = await tx
      .select({ state: gameActivity.state })
      .from(gameActivity)
      .where(eq(gameActivity.id, state.activeActivityId));
    if (activity?.state === 'running') {
      await enqueue(tx, {
        id: randomUUID(),
        operationId: state.activeActivityId,
        topic: campaignActivityTopic,
      });
    }
  }
  return { ...state, clockAnchorAt: new Date(now), holds: nextHolds };
}
