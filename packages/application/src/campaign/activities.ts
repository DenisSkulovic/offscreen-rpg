import { randomInt, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { campaign, gameActivity } from '@offscreen/db/campaign-schema';
import {
  activityBoundaryBlockText,
  activityProgressSchema,
  nextBoundaryTick,
  processBoundaryDue,
  processProgressAtEffortTick,
  resolvedActivityPlanSchema,
  recordActivityOccurrence,
  settleProcessBoundary,
  worldTickForEffortBoundary,
} from '@offscreen/game/activities';
import { resolveCheckResolution } from '@offscreen/game/checks';
import { applyOutcomeEffects } from '@offscreen/game/effects';
import { realMsUntilTick, wholeTicks } from '@offscreen/game/time';
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
  campaignActivityOccurrences,
  recordActivityEvent,
  type ActivityEventKind,
  type ActivityRecord,
  type CampaignRecord,
} from './persistence';
import { requestConsequenceNarration } from './narration';
import { projectCampaignClock } from './clock';

export const campaignActivityTopic = 'campaign.activity.v1';

function transitionEventKind(state: string): ActivityEventKind | null {
  switch (state) {
    case 'blocked':
      return 'blocked';
    case 'encounter':
      return 'interrupted';
    case 'complete':
      return 'completed';
    case 'abandoned':
    case 'failed':
    case 'expired':
    case 'invalidated':
      return state;
    default:
      return null;
  }
}
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
  const storedProgress = activityProgressSchema.parse(activity.progress);
  const nextEffortBoundary = nextBoundaryTick(plan, plan.resolvedThroughTick);
  const instantTargetTick = storedProgress.completionPending
    ? state.tick
    : worldTickForEffortBoundary({
        campaignTick: state.tick,
        retainedEffortTicks: storedProgress.effortTicks,
        boundaryEffortTick: nextEffortBoundary,
      });
  const { clock, pace } = projectCampaignClock(
    state,
    now,
    false,
    instantTargetTick,
  );
  const availableWorldTicks = clock.elapsedTicks - state.tick;
  let availableEffortTicks = storedProgress.effortTicks + availableWorldTicks;
  if (pace.kind === 'instant') {
    availableEffortTicks = storedProgress.completionPending
      ? storedProgress.effortTicks
      : nextEffortBoundary;
  }
  let processProgress = storedProgress.process;
  let cursorTick = plan.resolvedThroughTick;
  let worldCursor = state.tick;
  let boundariesSettled = activity.boundariesSettled;
  let nextState = 'running';
  let completionPending = storedProgress.completionPending;
  let character = campaignCharacter(state);
  const lines: string[] = [];
  const initialBlockText = activityBoundaryBlockText(character, plan.action);
  if (initialBlockText) {
    nextState = 'blocked';
    lines.push(initialBlockText);
  } else if (completionPending) {
    character = applyOutcomeEffects(character, plan.action.completion.effects);
    lines.push(plan.action.completion.text);
    nextState = 'complete';
    completionPending = false;
  }
  // The batch cap limits transaction work, not fictional duration or check cadence.
  for (
    let boundaryCount = 0;
    nextState === 'running' && boundaryCount < 24;
    boundaryCount++
  ) {
    const boundaryTick = nextBoundaryTick(plan, cursorTick);
    if (boundaryTick > availableEffortTicks) {
      break;
    }
    const worldBoundaryTick = worldTickForEffortBoundary({
      campaignTick: state.tick,
      retainedEffortTicks: storedProgress.effortTicks,
      boundaryEffortTick: boundaryTick,
    });
    boundariesSettled++;
    let processComplete = false;
    if (processBoundaryDue(plan, boundaryTick)) {
      const before = character;
      const result = settleProcessBoundary(plan, processProgress, before, () =>
        randomInt(1, 21),
      );
      processProgress = result.progress;
      processComplete = result.complete;
      if (result.roll && plan.action.process.kind === 'contribution.v1') {
        await recordRoll(tx, {
          storyId: current.id,
          operationId: activity.id,
          segment: boundariesSettled,
          checkKey: 'process-contribution',
          tick: worldBoundaryTick,
          plan: {
            resolution: {
              kind: 'ability',
              plan: plan.action.process.attempt.check,
            },
            character: before,
          },
          result: result.roll,
          effects: [],
        });
      }
      if (result.text) lines.push(result.text);
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
        tick: worldBoundaryTick,
        plan: { resolution: schedule.resolution, character: before },
        result,
        effects: outcome.effects,
      });
      lines.push(outcome.text);
      const boundaryBlockText = activityBoundaryBlockText(
        character,
        plan.action,
      );
      if (boundaryBlockText) {
        nextState = 'blocked';
        completionPending = processComplete;
        lines.push(boundaryBlockText);
        break;
      }
      if (outcome.interrupts) {
        nextState = 'encounter';
        break;
      }
    }
    cursorTick = boundaryTick;
    worldCursor = worldBoundaryTick;
    if (nextState === 'encounter') {
      completionPending = processComplete;
      break;
    }
    if (processComplete) {
      character = applyOutcomeEffects(
        character,
        plan.action.completion.effects,
      );
      lines.push(plan.action.completion.text);
      nextState = 'complete';
      break;
    }
  }
  const reachedBoundary =
    boundariesSettled !== activity.boundariesSettled ||
    storedProgress.completionPending ||
    nextState !== 'running';
  const backlogDue =
    nextState === 'running' &&
    nextBoundaryTick(plan, cursorTick) <= availableEffortTicks;
  const caughtUpRunning = nextState === 'running' && !backlogDue;
  const nextEffortTicks = caughtUpRunning ? availableEffortTicks : cursorTick;
  processProgress = processProgressAtEffortTick(
    plan,
    processProgress,
    nextEffortTicks,
  );
  const nextClock =
    nextState === 'running' && pace.kind !== 'instant'
      ? clock
      : wholeTicks(worldCursor);
  const nextCampaignTick = caughtUpRunning
    ? nextClock.elapsedTicks
    : worldCursor;
  const activityOccurrences =
    nextState === 'complete'
      ? recordActivityOccurrence(
          campaignActivityOccurrences(state),
          plan.action,
        )
      : campaignActivityOccurrences(state);
  const retainedProgress = {
    effortTicks: nextEffortTicks,
    process: processProgress,
    completionPending,
  };
  const nextPlan = { ...plan, resolvedThroughTick: cursorTick };
  const nextActivity = {
    ...activity,
    plan: nextPlan,
    boundariesSettled,
    state: nextState,
    progress: retainedProgress,
    revision: activity.revision + (reachedBoundary ? 1 : 0),
  };
  await tx
    .update(gameActivity)
    .set({
      plan: nextPlan,
      boundariesSettled,
      state: nextState,
      progress: retainedProgress,
      revision: nextActivity.revision,
    })
    .where(eq(gameActivity.id, activity.id));
  const transitionKind =
    activity.state === nextState ? null : transitionEventKind(nextState);
  const boundaryCause = `boundary:${boundariesSettled}:revision:${nextActivity.revision}`;
  if (transitionKind) {
    await recordActivityEvent(tx, {
      storyId: current.id,
      activityId: activity.id,
      activityRevision: nextActivity.revision,
      tick: nextCampaignTick,
      kind: transitionKind,
      causeKey: boundaryCause,
      label: plan.action.label,
      summary: lines.at(-1) ?? `${plan.action.label} became ${nextState}.`,
    });
  }
  if (!storedProgress.completionPending && completionPending) {
    await recordActivityEvent(tx, {
      storyId: current.id,
      activityId: activity.id,
      activityRevision: nextActivity.revision,
      tick: nextCampaignTick,
      kind: 'completion-pending',
      causeKey: boundaryCause,
      label: plan.action.label,
      summary: `${plan.action.label} reached its goal, but completion is waiting for the interruption or blocker to be resolved.`,
    });
  }
  const nextCampaign = {
    ...state,
    character,
    tick: nextCampaignTick,
    clock: nextClock,
    clockAnchorAt: new Date(now),
    activityOccurrences,
  };
  await tx
    .update(campaign)
    .set({
      character,
      tick: nextCampaign.tick,
      clock: nextClock,
      clockAnchorAt: new Date(now),
      activityOccurrences,
    })
    .where(eq(campaign.storyId, current.id));
  if (!reachedBoundary) {
    return { activity: nextActivity, current, state: nextCampaign };
  }
  const quietCompletion =
    nextState === 'complete' && plan.action.completionFollowUp === 'quiet';
  await refreshOffer(tx, nextCampaign, current.revision + 1, quietCompletion);
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
  if (nextState !== 'running' && !quietCompletion) {
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
        const storedProgress = activityProgressSchema.parse(
          settled.activity.progress,
        );
        const { clock: progress, pace } = projectCampaignClock(
          settled.state,
          now,
          false,
        );
        const nextWorldBoundary = worldTickForEffortBoundary({
          campaignTick: settled.state.tick,
          retainedEffortTicks: storedProgress.effortTicks,
          boundaryEffortTick: nextBoundaryTick(plan, plan.resolvedThroughTick),
        });
        return realMsUntilTick(progress, nextWorldBoundary, pace);
      });
    },
  };
}
