import { randomInt, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { campaign, gameActivity } from '@offscreen/db/campaign-schema';
import {
  activityProgressSchema,
  completionBoundaryTick,
  contributeAtBoundary,
  nextBoundaryTick,
  resolvedActivityPlanSchema,
} from '@offscreen/game/activities';
import { resolveCheckResolution } from '@offscreen/game/checks';
import { applyOutcomeEffects } from '@offscreen/game/effects';
import {
  earnedTicks,
  paceSchema,
  realMsUntilTick,
  wholeTicks,
} from '@offscreen/game/time';
import { enqueue, type Transaction } from '../outbox/index';
import {
  lockStoryById,
  readDatabaseClockMs,
  type StoryRecord,
} from '../stories/persistence';
import {
  requireCampaign,
  campaignCharacter,
  recordRoll,
  refreshOffer,
  appendMechanicalPassage,
  type ActivityRecord,
  type CampaignRecord,
} from './persistence';
import { requestConsequenceNarration } from './narration';

export const campaignActivityTopic = 'campaign.activity.v1';
export async function scheduleActivity(tx: Transaction, activityId: string) {
  await enqueue(tx, {
    id: randomUUID(),
    operationId: activityId,
    topic: campaignActivityTopic,
  });
}

/** Called under the story lock. Mechanical state and its follow-up intent commit together. */
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
  const storedProgress = activityProgressSchema.parse(activity.progress);
  const clock = earnedTicks({
    ...activity,
    progress: storedProgress.clock,
    pace,
    now,
    maximumTicks: completionBoundaryTick(plan, storedProgress.process),
  });
  let processProgress = storedProgress.process;
  let cursorTick = plan.resolvedThroughTick;
  let boundariesSettled = activity.boundariesSettled;
  let nextState = 'running';
  let character = campaignCharacter(state);
  const lines: string[] = [];
  // The batch cap limits transaction work, not fictional duration or check cadence.
  for (let boundaryCount = 0; boundaryCount < 24; boundaryCount++) {
    const boundaryTick = nextBoundaryTick(plan, cursorTick);
    if (boundaryTick > clock.elapsedTicks) {
      break;
    }
    boundariesSettled++;
    let contributionComplete = false;
    if (boundaryTick % plan.action.process.everyTicks === 0) {
      const contribution = contributeAtBoundary(plan, processProgress);
      processProgress = contribution.progress;
      contributionComplete = contribution.complete;
    }
    for (const schedule of plan.action.checks) {
      if (boundaryTick % schedule.everyTicks !== 0) {
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
        segment: boundariesSettled,
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
    if (contributionComplete) {
      character = applyOutcomeEffects(
        character,
        plan.action.completion.effects,
      );
      lines.push(plan.action.completion.text);
      nextState = 'complete';
      break;
    }
  }
  if (boundariesSettled === activity.boundariesSettled) {
    return { activity, current, state };
  }
  const retainedProgress = {
    clock: nextState === 'encounter' ? wholeTicks(cursorTick) : clock,
    process: processProgress,
  };
  const nextPlan = { ...plan, resolvedThroughTick: cursorTick };
  const nextActivity = {
    ...activity,
    plan: nextPlan,
    boundariesSettled,
    state: nextState,
    progress: retainedProgress,
    anchorAt: new Date(now),
    revision: activity.revision + 1,
  };
  await tx
    .update(gameActivity)
    .set({
      plan: nextPlan,
      boundariesSettled,
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
  await refreshOffer(tx, nextCampaign, nextState, current.revision + 1);
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
    await requestConsequenceNarration(tx, nextStory, {
      passageId,
      operationId: activity.id,
      afterSegment: activity.boundariesSettled,
      throughSegment: boundariesSettled,
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
        resolvedActivityPlanSchema.parse(reference.plan);
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
        const storedProgress = activityProgressSchema.parse(
          settled.activity.progress,
        );
        const progress = earnedTicks({
          ...settled.activity,
          progress: storedProgress.clock,
          pace,
          now,
          maximumTicks: completionBoundaryTick(plan, storedProgress.process),
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
