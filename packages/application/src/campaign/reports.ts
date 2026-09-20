import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { campaignReport, gameRoll } from '@offscreen/db/campaign-schema';
import { characterSchema, storyFactsSchema } from '@offscreen/game/state';
import { offerSchema } from '@offscreen/game/offers';
import type { OutcomeEffect } from '@offscreen/game/effects';
import { contextInputSchema } from '@offscreen/storyteller/context';
import { storytellerProfileSchema } from '@offscreen/storyteller/profiles';
import { executionPolicySchema } from '@offscreen/storyteller/tasks';
import type { Transaction } from '../outbox/index';
import type { StoryRecord } from '../stories/persistence';
import {
  canonicalContextDependencies,
  loadStorytellerContext,
} from '../storyteller/context';
import { insertStorytellerTask } from '../storyteller/records';
import type { ActivityRecord, CampaignRecord } from './persistence';
import { effectiveUsagePolicySchema } from '@offscreen/contracts/usage-policy';
import { prepareAdmittedStorytellerTask } from '../storyteller/task-admission';
import {
  campaignReportSourceKey,
  campaignReportSourceSchema,
  type CampaignReportSource,
} from './report-source';
import type { DocumentStore } from '@offscreen/documents';

async function requestHistoricalReport(
  tx: Transaction,
  args: {
    current: StoryRecord;
    state: CampaignRecord;
    source: CampaignReportSource;
    selectedId: string;
    sourceTick: number;
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
    documentStore?: DocumentStore;
  },
) {
  const source = campaignReportSourceSchema.parse(args.source);
  const hookId = randomUUID();
  const generationId = randomUUID();
  const baseContext = await loadStorytellerContext(tx, {
    storyId: args.current.id,
    revision: args.current.revision,
    premise: args.current.premise,
    notes: args.current.continuityNotes,
    activeSceneScope: args.current.activeSceneScope,
    selected: {
      id: args.selectedId,
      label: args.label,
      intention: args.intention,
    },
    ...canonicalContextDependencies(args.current, args.documentStore),
  });
  const task = prepareAdmittedStorytellerTask(
    {
      task: 'report',
      source: {
        storyId: args.current.id,
        narrativeRevision: args.current.revision,
        passageId: args.passageId,
        hookId,
      },
      profile: storytellerProfileSchema.parse(args.current.storyteller),
      execution: executionPolicySchema.parse(args.current.execution),
      context: contextInputSchema.parse({
        ...baseContext,
        resolution: {
          character: characterSchema.parse(args.state.character),
          storyFacts: storyFactsSchema.parse(args.state.storyFacts),
          tick: args.state.tick,
          offer: offerSchema.parse(args.state.offer),
          receipts: [
            {
              id: hookId,
              text: args.factualSummary,
              roll: null,
              effects: args.effects,
              declarations: [],
            },
            ...(args.receipts ?? []),
          ],
        },
      }),
    },
    args.current.usagePolicy === null
      ? null
      : effectiveUsagePolicySchema.parse(args.current.usagePolicy),
  );
  await insertStorytellerTask(tx, {
    id: generationId,
    ownerId: args.current.ownerId,
    task,
  });
  await tx.insert(campaignReport).values({
    id: hookId,
    storyId: args.current.id,
    sourceKey: campaignReportSourceKey(source),
    source,
    sourcePassageId: args.passageId,
    sourceRevision: args.current.revision,
    sourceTick: args.sourceTick,
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
    documentStore?: DocumentStore;
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
    sourceTick: args.state.tick,
    effects: args.completionEffects,
    receipts: rolls.map((roll) => ({
      id: roll.id,
      roll: roll.result,
      effects: roll.effects,
      declarations: [],
    })),
    ...(args.documentStore ? { documentStore: args.documentStore } : {}),
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
    dueTick: number;
    label: string;
    factualSummary: string;
    documentStore?: DocumentStore;
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
    sourceTick: args.dueTick,
    intention: args.factualSummary,
    effects: [],
    ...(args.documentStore ? { documentStore: args.documentStore } : {}),
  });
}
