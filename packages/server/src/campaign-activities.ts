import { randomInt, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { campaign, gameActivity } from '@offscreen/db/campaign-schema';
import {
  nextBoundaryTick,
  resolvedActivityPlanSchema,
} from '@offscreen/game/activities';
import { resolveCheckResolution } from '@offscreen/game/checks';
import { applyOutcomeEffects } from '@offscreen/game/effects';
import {
  earnedTicks,
  paceSchema,
  realMsUntilTick,
  tickProgressSchema,
  wholeTicks,
} from '@offscreen/game/time';
import { enqueue, type Transaction } from './outbox';
import {
  lockStoryById,
  readDatabaseClockMs,
  type StoryRecord,
} from './story-persistence';
import {
  requireCampaign,
  campaignCharacter,
  recordRoll,
  refreshOffer,
  appendMechanicalPassage,
  type ActivityRecord,
  type CampaignRecord,
} from './campaign-persistence';
import { admitConsequenceNarration } from './campaign-narration';

export const campaignActivityTopic = 'campaign.activity.v1';
export async function scheduleActivity(tx: Transaction, activityId: string) {
  await enqueue(tx, {
    id: randomUUID(),
    operationId: activityId,
    topic: campaignActivityTopic,
  });
}

/** Called under the story lock. Each boundary commits receipts and consequences together. */
export async function settleActivity(
  tx: Transaction,
  current: StoryRecord,
  state: CampaignRecord,
  activity: ActivityRecord,
  now: number,
) {
  const plan = resolvedActivityPlanSchema.parse(activity.plan);
  if (activity.state !== 'running') {
    return { activity, current, state };
  }
  const pace = paceSchema.parse(activity.pace);
  const progress = earnedTicks({
    ...activity,
    progress: tickProgressSchema.parse(activity.progress),
    pace,
    now,
    durationTicks: plan.action.durationTicks,
  });
  let cursorTick = plan.resolvedThroughTick;
  let completed = activity.completed;
  let nextState = 'running';
  let character = campaignCharacter(state);
  const lines: string[] = [];
  // The batch cap limits transaction work, not fictional duration or check cadence.
  for (let boundaryCount = 0; boundaryCount < 24; boundaryCount++) {
    const boundaryTick = nextBoundaryTick(plan, cursorTick);
    if (boundaryTick > progress.elapsedTicks) {
      break;
    }
    completed++;
    for (const schedule of plan.action.checks) {
      if (
        plan.action.durationTicks !== 0 &&
        boundaryTick % schedule.everyTicks !== 0
      ) {
        continue;
      }
      const before = character;
      const result = resolveCheckResolution(before, schedule.resolution, () =>
        randomInt(1, 21),
      );
      const outcome = result.success ? schedule.success : schedule.failure;
      character = applyOutcomeEffects(character, outcome.effects);
      await recordRoll(tx, {
        storyId: current.id,
        operationId: activity.id,
        segment: completed,
        checkKey: schedule.id,
        tick: plan.startTick + boundaryTick,
        plan: { resolution: schedule.resolution, character: before },
        result,
        effects: outcome.effects,
      });
      lines.push(outcome.text);
      if (outcome.interrupts) {
        nextState = 'encounter';
        break;
      }
    }
    cursorTick = boundaryTick;
    if (nextState === 'encounter') {
      break;
    }
    if (cursorTick === plan.action.durationTicks) {
      character = applyOutcomeEffects(
        character,
        plan.action.completion.effects,
      );
      lines.push(plan.action.completion.text);
      nextState = 'complete';
      break;
    }
  }
  if (completed === activity.completed) {
    return { activity, current, state };
  }
  const retainedProgress =
    nextState === 'encounter' ? wholeTicks(cursorTick) : progress;
  const nextPlan = { ...plan, resolvedThroughTick: cursorTick };
  const nextActivity = {
    ...activity,
    plan: nextPlan,
    completed,
    state: nextState,
    progress: retainedProgress,
    anchorAt: new Date(now),
    revision: activity.revision + 1,
  };
  await tx
    .update(gameActivity)
    .set({
      plan: nextPlan,
      completed,
      state: nextState,
      progress: retainedProgress,
      anchorAt: new Date(now),
      revision: nextActivity.revision,
    })
    .where(eq(gameActivity.id, activity.id));
  const nextCampaign = {
    ...state,
    character,
    tick: plan.startTick + cursorTick,
  };
  await tx
    .update(campaign)
    .set({ character, tick: nextCampaign.tick })
    .where(eq(campaign.storyId, current.id));
  await refreshOffer(tx, nextCampaign, nextState);
  // Receipts retain every roll. Keep the player-facing summary within passage bounds.
  const paragraphs = lines.slice(-8);
  if (lines.length > 8) {
    paragraphs.unshift(
      `${lines.length - 8} earlier check outcomes are recorded in the saved dice history.`,
    );
  }
  const passageId = await appendMechanicalPassage(
    tx,
    current,
    plan.action.label,
    paragraphs.length ? paragraphs : ['The admitted interval advances.'],
  );
  const nextStory = {
    ...current,
    revision: current.revision + 1,
    viewVersion: current.viewVersion + 1,
  };
  if (nextState !== 'running') {
    await admitConsequenceNarration(tx, nextStory, {
      passageId,
      operationId: activity.id,
      afterSegment: activity.completed,
      throughSegment: completed,
      label: plan.action.label,
      intention: plan.action.description,
    });
  }
  return { activity: nextActivity, state: nextCampaign, current: nextStory };
}

export function createCampaignActivities(database: Database) {
  return {
    async advance(id: string): Promise<number | null> {
      return database.db.transaction(async (tx) => {
        const [reference] = await tx
          .select()
          .from(gameActivity)
          .where(eq(gameActivity.id, id));
        if (!reference || reference.state !== 'running') {
          return null;
        }
        // Older prototypes remain saved; never reinterpret their admitted plans.
        if (!resolvedActivityPlanSchema.safeParse(reference.plan).success) {
          return null;
        }
        const current = await lockStoryById(tx, reference.storyId);
        const state = await requireCampaign(tx, current.id);
        if (state.activeActivityId !== id) {
          return null;
        }
        const [activity] = await tx
          .select()
          .from(gameActivity)
          .where(eq(gameActivity.id, id));
        if (!activity || activity.state !== 'running') {
          return null;
        }
        const now = await readDatabaseClockMs(tx, current.id);
        const settled = await settleActivity(tx, current, state, activity, now);
        if (settled.activity.state !== 'running') {
          return null;
        }
        const plan = resolvedActivityPlanSchema.parse(settled.activity.plan);
        const pace = paceSchema.parse(settled.activity.pace);
        const progress = earnedTicks({
          ...settled.activity,
          progress: tickProgressSchema.parse(settled.activity.progress),
          pace,
          now,
          durationTicks: plan.action.durationTicks,
        });
        return realMsUntilTick(
          progress,
          nextBoundaryTick(plan, plan.resolvedThroughTick),
          pace,
        );
      });
    },
  };
}
