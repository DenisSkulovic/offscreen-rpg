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
import { requestWorldObligationReport } from './reports';
import type { DocumentStore } from '@offscreen/documents';

export type WorldObligationRecord = typeof worldObligation.$inferSelect;

export async function readPendingWorldObligations(
  tx: Transaction,
  args: {
    storyId: string;
    throughTick: number;
    followUp?: 'controlling-scene' | 'report';
  },
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
  return args.followUp
    ? records.filter(
        (record) =>
          worldObligationSchema.parse(record.definition).followUp ===
          args.followUp,
      )
    : records;
}

export async function readNearestPendingWorldObligations(
  tx: Transaction,
  args: {
    storyId: string;
    throughTick: number;
    followUp?: 'controlling-scene' | 'report';
  },
) {
  const records = await readPendingWorldObligations(tx, args);
  const nearestTick = records[0]?.dueTick;
  return nearestTick === undefined
    ? []
    : records.filter((record) => record.dueTick === nearestTick);
}

/** Commits due effects atomically; only controlling follow-ups freeze play. */
export async function fireWorldObligations(
  tx: Transaction,
  current: StoryRecord,
  state: CampaignRecord,
  records: readonly WorldObligationRecord[],
  now: number,
  documentStore?: DocumentStore,
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
  const controlling = fired.filter(
    (obligation) => obligation.followUp === 'controlling-scene',
  );
  if (new Set(controlling.map((item) => item.dueTick)).size > 1) {
    throw new Error('Controlling world obligations must share one due tick');
  }
  const controllingOwner = controlling[0] ?? null;
  const holds = campaignHoldsSchema.parse([
    ...campaignHoldsSchema.parse(state.holds),
    ...(controllingOwner
      ? [
          {
            kind: 'world-obligation' as const,
            obligationId: controllingOwner.id,
            reason: 'controlling-event' as const,
          },
        ]
      : []),
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
  if (controllingOwner) {
    const label = controlling
      .map((obligation) => obligation.label)
      .join(' / ')
      .slice(0, 200);
    const intention = controlling
      .map(
        (obligation) =>
          `${obligation.label}: ${obligation.consequence.condition.label} is now ${String(obligation.consequence.condition.value)}.`,
      )
      .join(' ')
      .slice(0, 500);
    await tx.insert(campaignConsequence).values({
      operationId: controllingOwner.id,
      storyId: state.storyId,
      passageId: passage.id,
      baseRevision: current.revision,
      receipt: {
        kind: 'world-obligation',
        passageId: passage.id,
        operationId: controllingOwner.id,
        obligationIds: controlling.map((obligation) => obligation.id),
        label,
        intention,
      },
    });
    await enqueue(tx, {
      id: randomUUID(),
      operationId: controllingOwner.id,
      topic: campaignConsequenceTopic,
    });
  }
  await tx
    .update(campaign)
    .set({ worldConditions, holds, clockAnchorAt: new Date(now) })
    .where(eq(campaign.storyId, state.storyId));
  const nextState = {
    ...state,
    worldConditions,
    holds,
    clockAnchorAt: new Date(now),
  };
  for (const obligation of fired) {
    if (obligation.followUp !== 'report') {
      continue;
    }
    await requestWorldObligationReport(tx, {
      current,
      state: nextState,
      passageId: passage.id,
      obligationId: obligation.id,
      obligationRevision: obligation.revision,
      dueTick: obligation.dueTick,
      label: obligation.label,
      factualSummary: `${obligation.consequence.condition.label} became ${String(obligation.consequence.condition.value)} at tick ${obligation.dueTick}.`,
      ...(documentStore ? { documentStore } : {}),
    });
  }
  return nextState;
}
