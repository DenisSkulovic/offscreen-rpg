import { randomInt, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { campaign, gameActivity } from '@offscreen/db/campaign-schema';
import {
  activityBoundaryBlockText,
  activityProgressSchema,
  initialActivityProgress,
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
import {
  consumePreparedActivityPlan,
  immediateActionAvailable,
} from '@offscreen/game/immediate-actions';
import { enqueue, type Transaction } from '../outbox/index';
import {
  lockStoryById,
  incrementStoryViewVersion,
  readDatabaseClockMs,
  type StoryRecord,
} from '../stories/persistence';
import {
  requireCampaign,
  campaignCharacter,
  campaignStoryFacts,
  campaignSituationAuthorization,
  recordRoll,
  refreshOffer,
  appendMechanicalPassage,
  campaignActivityOccurrences,
  recordActivityEvent,
  processOccurrenceAvailable,
  type ActivityEventKind,
  type ActivityRecord,
  type CampaignRecord,
} from './persistence';
import { projectCampaignClock } from './clock';
import {
  acceptedActivityPlanSchema,
  readAcceptedActivityPlan,
} from './accepted-plans';
import { campaignClockHeld } from './holds';
import { campaignActivityTopic } from './topics';
import {
  activityCompletionIsNonControlling,
  planActivityBoundaryFollowUps,
} from './activity-follow-up-policy';
import { applyCampaignFollowUpIntents } from './follow-up-intents';
import {
  fireWorldObligation,
  readNearestPendingWorldObligation,
  type WorldObligationRecord,
} from './world-obligations';

export { campaignActivityTopic } from './topics';

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

async function settleAcceptedPlanBoundary(
  tx: Transaction,
  state: CampaignRecord,
  completedActivity: ActivityRecord,
) {
  const accepted = readAcceptedActivityPlan(state.acceptedActivityPlan);
  if (!accepted || accepted.state !== 'active') return state;
  const currentEntry = accepted.entries[accepted.cursor];
  if (currentEntry?.activityId !== completedActivity.id) return state;
  const completedEntries = accepted.entries.map((entry, index) =>
    index === accepted.cursor
      ? { ...entry, state: 'complete' as const }
      : entry,
  );
  const nextCursor = accepted.cursor + 1;
  const nextEntry = completedEntries[nextCursor];
  if (!nextEntry) {
    const finished = acceptedActivityPlanSchema.parse({
      ...accepted,
      revision: accepted.revision + 1,
      state: 'complete',
      cursor: nextCursor,
      entries: completedEntries,
    });
    await tx
      .update(campaign)
      .set({ acceptedActivityPlan: finished, activeActivityId: null })
      .where(eq(campaign.storyId, state.storyId));
    return { ...state, acceptedActivityPlan: finished, activeActivityId: null };
  }
  if (state.tick >= accepted.horizonTick) {
    const stopped = acceptedActivityPlanSchema.parse({
      ...accepted,
      revision: accepted.revision + 1,
      state: 'horizon-reached',
      cursor: nextCursor,
      entries: completedEntries.map((entry, index) =>
        index >= nextCursor ? { ...entry, state: 'cancelled' as const } : entry,
      ),
      blockedReason: `The accepted plan reached its tick ${accepted.horizonTick} horizon before the next activity could start.`,
    });
    await tx
      .update(campaign)
      .set({ acceptedActivityPlan: stopped, activeActivityId: null })
      .where(eq(campaign.storyId, state.storyId));
    return { ...state, acceptedActivityPlan: stopped, activeActivityId: null };
  }
  const authorization = campaignSituationAuthorization(state);
  const prepared = authorization.preparedPlans.find(
    (plan) => plan.key === nextEntry.plan.key,
  );
  const stillAuthorized =
    authorization.activityAccess.kind === 'selected' &&
    authorization.activityAccess.actionKeys.includes(nextEntry.plan.key);
  const eligible =
    prepared?.resolution.kind === 'process' &&
    isDeepStrictEqual(prepared, nextEntry.plan) &&
    stillAuthorized &&
    immediateActionAvailable(
      campaignCharacter(state),
      campaignStoryFacts(state),
      prepared,
    ) &&
    (await processOccurrenceAvailable(tx, state, prepared));
  if (!eligible || !prepared || prepared.resolution.kind !== 'process') {
    const blocked = acceptedActivityPlanSchema.parse({
      ...accepted,
      revision: accepted.revision + 1,
      state: 'blocked',
      cursor: nextCursor,
      entries: completedEntries.map((entry, index) =>
        index === nextCursor ? { ...entry, state: 'blocked' as const } : entry,
      ),
      blockedReason:
        'The next activity is no longer authorized or mechanically eligible in the current situation.',
    });
    await tx
      .update(campaign)
      .set({ acceptedActivityPlan: blocked, activeActivityId: null })
      .where(eq(campaign.storyId, state.storyId));
    return { ...state, acceptedActivityPlan: blocked, activeActivityId: null };
  }
  const activityId = randomUUID();
  await tx.insert(gameActivity).values({
    id: activityId,
    storyId: state.storyId,
    plan: {
      version: 6,
      action: prepared.resolution.action,
      settingsRevision: state.settingsRevision,
      resolvedThroughTick: 0,
    },
    state: 'running',
    boundariesSettled: 0,
    progress: initialActivityProgress(prepared.resolution.action),
  });
  await recordActivityEvent(tx, {
    storyId: state.storyId,
    activityId,
    activityRevision: 0,
    tick: state.tick,
    kind: 'started',
    causeKey: `accepted-plan:${accepted.id}:entry:${nextEntry.id}`,
    label: prepared.label,
    summary: `${prepared.label} started from the accepted activity plan.`,
  });
  const advanced = acceptedActivityPlanSchema.parse({
    ...accepted,
    revision: accepted.revision + 1,
    cursor: nextCursor,
    entries: completedEntries.map((entry, index) =>
      index === nextCursor
        ? { ...entry, state: 'running' as const, activityId }
        : entry,
    ),
  });
  const nextAuthorization = {
    ...authorization,
    offerId: null,
    activityAccess: { kind: 'none' as const },
    preparedPlans: consumePreparedActivityPlan(
      authorization.preparedPlans,
      prepared,
    ),
  };
  await tx
    .update(campaign)
    .set({
      acceptedActivityPlan: advanced,
      activeActivityId: activityId,
      offer: null,
      situationAuthorization: nextAuthorization,
    })
    .where(eq(campaign.storyId, state.storyId));
  await scheduleActivity(tx, activityId);
  return {
    ...state,
    acceptedActivityPlan: advanced,
    activeActivityId: activityId,
    offer: null,
    situationAuthorization: nextAuthorization,
  };
}

/** Called under the story lock. Mechanical state and its follow-up intent commit together. */
export async function settleActivity(
  tx: Transaction,
  current: StoryRecord,
  state: CampaignRecord,
  activity: ActivityRecord,
  now: number,
  controllingObligation?: WorldObligationRecord | null,
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
    { kind: 'accepted-activity', activityId: activity.id },
    campaignClockHeld(state),
    instantTargetTick,
    controllingObligation
      ? Math.max(state.tick, controllingObligation.dueTick)
      : undefined,
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
    // A hard world cutoff owns equality. Productive effects at that exact tick
    // remain unapplied and the obligation is committed first by the caller.
    if (
      controllingObligation &&
      worldBoundaryTick >= controllingObligation.dueTick
    ) {
      break;
    }
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
  const nonControllingCompletion = activityCompletionIsNonControlling(
    nextState,
    plan.action.completionFollowUp,
  );
  const refreshedOffer = await refreshOffer(
    tx,
    nextCampaign,
    current.revision + 1,
    nonControllingCompletion,
  );
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
  let settledCampaign: CampaignRecord = {
    ...nextCampaign,
    offer: refreshedOffer,
  };
  const followUps = planActivityBoundaryFollowUps({
    nextState,
    completionFollowUp: plan.action.completionFollowUp,
    current: nextStory,
    activity: nextActivity,
    passageId,
    afterSegment: activity.boundariesSettled,
    throughSegment: boundariesSettled,
    label: plan.action.label,
    intention: plan.action.description,
    factualSummary:
      lines.at(-1) ?? `${plan.action.label} completed as admitted.`,
    completionEffects: plan.action.completion.effects,
  });
  // Reports capture the completed source moment before a queued successor can
  // consume its refreshed offer. They are historical, not controlling scenes.
  settledCampaign = await applyCampaignFollowUpIntents(
    tx,
    settledCampaign,
    followUps.beforeContinuation,
    now,
  );
  if (nextState === 'complete') {
    // The refreshed offer is the current Storyteller-authored handoff. A queued
    // successor may consume it, but the old acceptance cannot bypass a scene
    // hold or stale prerequisites merely because its predecessor completed.
    const refreshedCampaign = await requireCampaign(tx, current.id);
    settledCampaign = await settleAcceptedPlanBoundary(
      tx,
      refreshedCampaign,
      nextActivity,
    );
  }
  settledCampaign = await applyCampaignFollowUpIntents(
    tx,
    settledCampaign,
    followUps.afterContinuation,
    now,
  );
  return { activity: nextActivity, state: settledCampaign, current: nextStory };
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
        const controllingObligation = await readNearestPendingWorldObligation(
          tx,
          {
            storyId: current.id,
            throughTick: Number.MAX_SAFE_INTEGER,
          },
        );
        const settled = await settleActivity(
          tx,
          current,
          state,
          activity,
          now,
          controllingObligation,
        );
        if (
          controllingObligation &&
          settled.state.tick >= controllingObligation.dueTick
        ) {
          const interruptedRevision = settled.activity.revision + 1;
          await tx
            .update(gameActivity)
            .set({ state: 'encounter', revision: interruptedRevision })
            .where(eq(gameActivity.id, settled.activity.id));
          await recordActivityEvent(tx, {
            storyId: current.id,
            activityId: settled.activity.id,
            activityRevision: interruptedRevision,
            tick: controllingObligation.dueTick,
            kind: 'interrupted',
            causeKey: `world-obligation:${controllingObligation.id}:${controllingObligation.revision}`,
            label: resolvedActivityPlanSchema.parse(settled.activity.plan)
              .action.label,
            summary: `${resolvedActivityPlanSchema.parse(settled.activity.plan).action.label} was interrupted by a due world event.`,
          });
          await fireWorldObligation(
            tx,
            settled.state,
            controllingObligation,
            now,
          );
          await incrementStoryViewVersion(tx, {
            storyId: current.id,
            viewVersion: current.viewVersion + 1,
          });
          return null;
        }
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
          {
            kind: 'accepted-activity',
            activityId: settled.activity.id,
          },
          campaignClockHeld(settled.state),
          settled.state.tick,
          controllingObligation
            ? Math.max(settled.state.tick, controllingObligation.dueTick)
            : undefined,
        );
        const nextWorldBoundary = worldTickForEffortBoundary({
          campaignTick: settled.state.tick,
          retainedEffortTicks: storedProgress.effortTicks,
          boundaryEffortTick: nextBoundaryTick(plan, plan.resolvedThroughTick),
        });
        return realMsUntilTick(
          progress,
          Math.min(
            nextWorldBoundary,
            controllingObligation
              ? Math.max(settled.state.tick, controllingObligation.dueTick)
              : nextWorldBoundary,
          ),
          pace,
        );
      });
    },
  };
}
