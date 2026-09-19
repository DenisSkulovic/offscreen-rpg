import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { gameActivityReport, gameRoll } from '@offscreen/db/campaign-schema';
import { characterSchema, storyFactsSchema } from '@offscreen/game/state';
import { offerSchema } from '@offscreen/game/offers';
import type { OutcomeEffect } from '@offscreen/game/effects';
import { contextInputSchema } from '@offscreen/storyteller/context';
import { storytellerProfileSchema } from '@offscreen/storyteller/profiles';
import { executionPolicySchema } from '@offscreen/storyteller/tasks';
import type { Transaction } from '../outbox/index';
import type { StoryRecord } from '../stories/persistence';
import { loadStorytellerContext } from '../storyteller/context';
import { insertStorytellerTask } from '../storyteller/records';
import type { ActivityRecord, CampaignRecord } from './persistence';
import { effectiveUsagePolicySchema } from '@offscreen/contracts/usage-policy';
import { prepareAdmittedStorytellerTask } from '../storyteller/task-admission';

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
  const hookId = randomUUID();
  const generationId = randomUUID();
  const rolls = await tx
    .select()
    .from(gameRoll)
    .where(eq(gameRoll.operationId, args.activity.id))
    .orderBy(gameRoll.segment, gameRoll.checkKey);
  const baseContext = await loadStorytellerContext(tx, {
    storyId: args.current.id,
    revision: args.current.revision,
    premise: args.current.premise,
    notes: args.current.continuityNotes,
    activeSceneScope: args.current.activeSceneScope,
    selected: {
      id: args.activity.id,
      label: args.label,
      intention: args.intention,
    },
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
              effects: args.completionEffects,
              declarations: [],
            },
            ...rolls.map((roll) => ({
              id: roll.id,
              roll: roll.result,
              effects: roll.effects,
              declarations: [],
            })),
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
  await tx.insert(gameActivityReport).values({
    id: hookId,
    storyId: args.current.id,
    activityId: args.activity.id,
    activityRevision: args.activity.revision,
    sourcePassageId: args.passageId,
    sourceRevision: args.current.revision,
    sourceTick: args.state.tick,
    label: args.label,
    factualSummary: args.factualSummary,
    state: 'generating',
    generationId,
  });
}
