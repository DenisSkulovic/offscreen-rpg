import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { campaignReport, gameRoll } from '@offscreen/db/campaign-schema';
import type { OutcomeEffect } from '@offscreen/game/effects';
import type { Transaction } from '@offscreen/db/outbox';
import type { StoryRecord } from '../stories/persistence';
import { captureHistoricalReport } from '../storyteller/context-capture';
import type { ActivityRecord, CampaignRecord } from './persistence';
import {
  campaignReportSourceKey,
  campaignReportSourceSchema,
  campaignReportSourcesMatch,
  type CampaignReportSource,
} from './report-source';

async function requestHistoricalReport(
  tx: Transaction,
  args: {
    current: StoryRecord;
    state: CampaignRecord;
    source: CampaignReportSource;
    selectedId: string;
    sourceGameSecond: number;
    passageId: string;
    label: string;
    intention: string;
    factualSummary: string;
    effects: readonly OutcomeEffect[];
    receipts?: ReadonlyArray<{
      id: string;
      roll: unknown;
      effects: unknown;
      declarations: readonly [];
    }>;
  },
) {
  const source = campaignReportSourceSchema.parse(args.source);
  const sourceKey = campaignReportSourceKey(source);
  const [existing] = await tx
    .select({
      id: campaignReport.id,
      source: campaignReport.source,
      generationId: campaignReport.generationId,
    })
    .from(campaignReport)
    .where(
      and(
        eq(campaignReport.storyId, args.current.id),
        eq(campaignReport.sourceKey, sourceKey),
      ),
    );
  if (existing) {
    const existingSource = campaignReportSourceSchema.parse(existing.source);
    if (!campaignReportSourcesMatch(existingSource, source)) {
      throw new Error('report_source_conflict');
    }
    return;
  }
  const hookId = randomUUID();
  const generationId = await captureHistoricalReport(
    tx,
    args.current,
    args.state,
    {
      hookId,
      sourceKey,
      source,
      passageId: args.passageId,
      selectedId: args.selectedId,
      label: args.label,
      intention: args.intention,
      factualSummary: args.factualSummary,
      sourceGameSecond: args.sourceGameSecond,
      effects: args.effects,
      ...(args.receipts
        ? {
            receipts: args.receipts.map((receipt) => ({
              id: receipt.id,
              roll: receipt.roll,
              effects: receipt.effects,
            })),
          }
        : {}),
    },
  );
  await tx.insert(campaignReport).values({
    id: hookId,
    storyId: args.current.id,
    sourceKey,
    source,
    sourcePassageId: args.passageId,
    sourceRevision: args.current.revision,
    sourceGameSecond: args.sourceGameSecond,
    label: args.label,
    factualSummary: args.factualSummary,
    state: 'generating',
    generationId,
  });
}

/** Capture immutable evidence at the mechanical boundary, before later play. */
export async function requestActivityReport(
  tx: Transaction,
  args: {
    current: StoryRecord;
    state: CampaignRecord;
    activity: ActivityRecord;
    passageId: string;
    label: string;
    intention: string;
    factualSummary: string;
    completionEffects: readonly OutcomeEffect[];
  },
) {
  const rolls = await tx
    .select()
    .from(gameRoll)
    .where(eq(gameRoll.operationId, args.activity.id))
    .orderBy(gameRoll.segment, gameRoll.checkKey);
  await requestHistoricalReport(tx, {
    ...args,
    source: {
      kind: 'activity',
      activityId: args.activity.id,
      activityRevision: args.activity.revision,
    },
    selectedId: args.activity.id,
    sourceGameSecond: args.state.gameSecond,
    effects: args.completionEffects,
    receipts: rolls.map((roll) => ({
      id: roll.id,
      roll: roll.result,
      effects: roll.effects,
      declarations: [],
    })),
  });
}

/** Records optional prose about an already committed world transition. */
export async function requestWorldObligationReport(
  tx: Transaction,
  args: {
    current: StoryRecord;
    state: CampaignRecord;
    passageId: string;
    obligationId: string;
    obligationRevision: number;
    dueGameSecond: number;
    label: string;
    factualSummary: string;
  },
) {
  await requestHistoricalReport(tx, {
    ...args,
    source: {
      kind: 'world-obligation',
      obligationId: args.obligationId,
      obligationRevision: args.obligationRevision,
    },
    selectedId: args.obligationId,
    sourceGameSecond: args.dueGameSecond,
    intention: args.factualSummary,
    effects: [],
  });
}