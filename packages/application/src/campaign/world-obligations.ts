import { randomUUID } from 'node:crypto';
import { and, asc, eq, lte } from 'drizzle-orm';
import {
  campaign,
  worldObligation,
  worldObligationEvent,
} from '@offscreen/db/campaign-schema';
import {
  applyWorldObligationCondition,
  worldObligationSchema,
} from '@offscreen/game/world-obligations';
import type { Transaction } from '../outbox/index';
import { campaignHoldsSchema } from './holds';
import type { CampaignRecord } from './persistence';

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
  await tx
    .update(campaign)
    .set({ worldConditions, holds, clockAnchorAt: new Date(now) })
    .where(eq(campaign.storyId, state.storyId));
  return { ...state, worldConditions, holds, clockAnchorAt: new Date(now) };
}
