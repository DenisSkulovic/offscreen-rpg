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

export async function readNearestPendingWorldObligations(
  tx: Transaction,
  args: { storyId: string; throughTick: number },
) {
  const records = await tx
    .select()
    .from(worldObligation)
    .where(
      and(
        eq(worldObligation.storyId, args.storyId),
        eq(worldObligation.state, 'pending'),
        lte(worldObligation.dueTick, args.throughTick),
      ),
    )
    .orderBy(asc(worldObligation.dueTick), asc(worldObligation.id));
  const nearestTick = records[0]?.dueTick;
  return nearestTick === undefined
    ? []
    : records.filter((record) => record.dueTick === nearestTick);
}

/** Commits the nearest equal-tick set with independent receipts and one hold. */
export async function fireWorldObligations(
  tx: Transaction,
  current: StoryRecord,
  state: CampaignRecord,
  records: readonly WorldObligationRecord[],
  now: number,
) {
  if (!records.length) {
    return state;
  }
  const obligations = records.map((record) => {
    const obligation = worldObligationSchema.parse(record.definition);
    if (record.dueTick !== obligation.dueTick || record.dueTick > state.tick) {
      throw new Error('World obligation is not due at the settled frontier');
    }
    return obligation;
  });
  if (new Set(obligations.map((item) => item.dueTick)).size !== 1) {
    throw new Error('Controlling world obligations must share one due tick');
  }
  const fired = [];
  for (let index = 0; index < records.length; index++) {
    const record = records[index]!;
    const obligation = obligations[index]!;
    const [updated] = await tx
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
    if (updated) {
      fired.push(obligation);
    }
  }
  if (!fired.length) {
    return state;
  }
  const worldConditions = fired.reduce(
    (conditions, obligation) =>
      applyWorldObligationCondition({ conditions, obligation }),
    state.worldConditions,
  );
  const controlling = fired[0]!;
  const holds = campaignHoldsSchema.parse([
    ...campaignHoldsSchema.parse(state.holds),
    {
      kind: 'world-obligation',
      obligationId: controlling.id,
      reason: 'controlling-event',
    },
  ]);
  await tx.insert(worldObligationEvent).values(
    fired.map((obligation) => ({
      id: randomUUID(),
      storyId: state.storyId,
      obligationId: obligation.id,
      obligationRevision: obligation.revision,
      tick: obligation.dueTick,
      kind: 'fired',
      label: obligation.label,
      details: { consequence: obligation.consequence },
    })),
  );
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
  const label = fired
    .map((obligation) => obligation.label)
    .join(' / ')
    .slice(0, 200);
  const intention = fired
    .map(
      (obligation) =>
        `${obligation.label}: ${obligation.consequence.condition.label} is now ${String(obligation.consequence.condition.value)}.`,
    )
    .join(' ')
    .slice(0, 500);
  await tx.insert(campaignConsequence).values({
    operationId: controlling.id,
    storyId: state.storyId,
    passageId: passage.id,
    baseRevision: current.revision,
    receipt: {
      kind: 'world-obligation',
      passageId: passage.id,
      operationId: controlling.id,
      obligationIds: fired.map((obligation) => obligation.id),
      label,
      intention,
    },
  });
  await enqueue(tx, {
    id: randomUUID(),
    operationId: controlling.id,
    topic: campaignConsequenceTopic,
  });
  await tx
    .update(campaign)
    .set({ worldConditions, holds, clockAnchorAt: new Date(now) })
    .where(eq(campaign.storyId, state.storyId));
  return { ...state, worldConditions, holds, clockAnchorAt: new Date(now) };
}
