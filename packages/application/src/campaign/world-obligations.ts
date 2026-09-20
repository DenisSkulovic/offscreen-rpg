import { randomUUID } from 'node:crypto';
import { and, asc, eq, lte } from 'drizzle-orm';
import {
  campaign,
  campaignConsequence,
  worldObligation,
  worldObligationEvent,
} from '@offscreen/db/campaign-schema';
import { storyPassage } from '@offscreen/db/story-schema';
import {
  applyWorldObligationCondition,
  worldObligationSchema,
} from '@offscreen/game/world-obligations';
import type { Transaction } from '../outbox/index';
import { enqueue } from '../outbox/index';
import type { StoryRecord } from '../stories/persistence';
import { campaignHoldsSchema } from './holds';
import type { CampaignRecord } from './persistence';
import { campaignConsequenceTopic } from './topics';

export type WorldObligationRecord = typeof worldObligation.$inferSelect;

export async function readNearestPendingWorldObligation(
  tx: Transaction,
  args: { storyId: string; throughTick: number },
) {
  const [record] = await tx
    .select()
    .from(worldObligation)
    .where(
      and(
        eq(worldObligation.storyId, args.storyId),
        eq(worldObligation.state, 'pending'),
        lte(worldObligation.dueTick, args.throughTick),
      ),
    )
    .orderBy(asc(worldObligation.dueTick), asc(worldObligation.id))
    .limit(1);
  return record ?? null;
}

/** Commits one due obligation and its controlling hold exactly once. */
export async function fireWorldObligation(
  tx: Transaction,
  current: StoryRecord,
  state: CampaignRecord,
  record: WorldObligationRecord,
  now: number,
) {
  const obligation = worldObligationSchema.parse(record.definition);
  if (record.dueTick !== obligation.dueTick || record.dueTick > state.tick) {
    throw new Error('World obligation is not due at the settled frontier');
  }
  const [fired] = await tx
    .update(worldObligation)
    .set({ state: 'fired', firedAtTick: record.dueTick })
    .where(
      and(
        eq(worldObligation.id, record.id),
        eq(worldObligation.revision, record.revision),
        eq(worldObligation.state, 'pending'),
      ),
    )
    .returning({ id: worldObligation.id });
  if (!fired) {
    return state;
  }
  const worldConditions = applyWorldObligationCondition({
    conditions: state.worldConditions,
    obligation,
  });
  const holds = campaignHoldsSchema.parse([
    ...campaignHoldsSchema.parse(state.holds),
    {
      kind: 'world-obligation',
      obligationId: obligation.id,
      reason: 'controlling-event',
    },
  ]);
  await tx.insert(worldObligationEvent).values({
    id: randomUUID(),
    storyId: state.storyId,
    obligationId: obligation.id,
    obligationRevision: obligation.revision,
    tick: obligation.dueTick,
    kind: 'fired',
    label: obligation.label,
    details: { consequence: obligation.consequence },
  });
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
    throw new Error('Missing current passage for world obligation');
  }
  await tx.insert(campaignConsequence).values({
    operationId: obligation.id,
    storyId: state.storyId,
    passageId: passage.id,
    baseRevision: current.revision,
    receipt: {
      kind: 'world-obligation',
      passageId: passage.id,
      operationId: obligation.id,
      label: obligation.label,
      intention: `${obligation.label}: ${obligation.consequence.condition.label} is now ${String(obligation.consequence.condition.value)}.`,
    },
  });
  await enqueue(tx, {
    id: randomUUID(),
    operationId: obligation.id,
    topic: campaignConsequenceTopic,
  });
  await tx
    .update(campaign)
    .set({ worldConditions, holds, clockAnchorAt: new Date(now) })
    .where(eq(campaign.storyId, state.storyId));
  return { ...state, worldConditions, holds, clockAnchorAt: new Date(now) };
}
