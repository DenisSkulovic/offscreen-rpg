import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { campaign, gameActivity } from '@offscreen/db/campaign-schema';
import { paceSchema } from '@offscreen/contracts/campaign';
import { enqueue, type Transaction } from './outbox';
import { lockStoryById, readDatabaseClockMs, type StoryRecord } from './story-persistence';
import { requireCampaign, campaignCharacter, recordRoll, refreshOffer, appendMechanicalPassage, type ActivityRecord, type CampaignRecord } from './campaign-persistence';
import { resolvedActivityPlanSchema, nextBoundaryMs } from './rules/action-content';
import { resolveScheduledCheck } from './rules/checks';
import { applyOutcomeEffects } from './rules/effects';
import { elapsedGameMs, waitUntilBoundary } from './rules/clock';
import { admitConsequenceNarration } from './campaign-narration';

export const campaignActivityTopic = 'campaign.activity.v1';
export async function scheduleActivity(tx: Transaction, activityId: string) {
  await enqueue(tx, { id: randomUUID(), operationId: activityId, topic: campaignActivityTopic });
}

/** Called under the story lock. Each boundary commits receipts and consequences together. */
export async function settleActivity(tx: Transaction, current: StoryRecord, state: CampaignRecord, activity: ActivityRecord, now: number) {
  const plan = resolvedActivityPlanSchema.parse(activity.plan);
  if (activity.state !== 'running') {
    return { activity, current, state };
  }
  const pace = paceSchema.parse(activity.pace);
  const elapsedMs = elapsedGameMs({ ...activity, pace, now, durationMs: plan.action.durationMs });
  let cursorMs = plan.resolvedThroughMs;
  let completed = activity.completed;
  let nextState = 'running';
  let character = campaignCharacter(state);
  const lines: string[] = [];
  // The batch cap limits transaction work, not fictional duration or check cadence.
  for (let boundaryCount = 0; boundaryCount < 24; boundaryCount++) {
    const boundaryMs = nextBoundaryMs(plan, cursorMs);
    if (boundaryMs > elapsedMs) {
      break;
    }
    completed++;
    for (const schedule of plan.action.checks) {
      if (plan.action.durationMs !== 0 && boundaryMs % schedule.everyMs !== 0) {
        continue;
      }
      const before = character;
      const result = resolveScheduledCheck(before, schedule.resolution);
      const outcome = result.success ? schedule.success : schedule.failure;
      character = applyOutcomeEffects(character, outcome.effects);
      await recordRoll(tx, {
        storyId: current.id, operationId: activity.id, segment: completed,
        checkKey: schedule.id, gameTimeMs: plan.startGameTimeMs + boundaryMs,
        plan: { resolution: schedule.resolution, character: before }, result, effects: outcome.effects,
      });
      lines.push(outcome.text);
      if (outcome.interrupts) {
        nextState = 'encounter';
        break;
      }
    }
    cursorMs = boundaryMs;
    if (nextState === 'encounter') {
      break;
    }
    if (cursorMs === plan.action.durationMs) {
      character = applyOutcomeEffects(character, plan.action.completion.effects);
      lines.push(plan.action.completion.text);
      nextState = 'complete';
      break;
    }
  }
  if (completed === activity.completed) {
    return { activity, current, state };
  }
  const retainedElapsed = nextState === 'encounter' ? cursorMs : elapsedMs;
  const nextPlan = { ...plan, resolvedThroughMs: cursorMs };
  const nextActivity = { ...activity, plan: nextPlan, completed, state: nextState, elapsedMs: retainedElapsed, anchorAt: new Date(now), revision: activity.revision + 1 };
  await tx.update(gameActivity).set({ plan: nextPlan, completed, state: nextState, elapsedMs: retainedElapsed, anchorAt: new Date(now), revision: nextActivity.revision }).where(eq(gameActivity.id, activity.id));
  const nextCampaign = { ...state, character, gameTimeMs: plan.startGameTimeMs + cursorMs };
  await tx.update(campaign).set({ character, gameTimeMs: nextCampaign.gameTimeMs }).where(eq(campaign.storyId, current.id));
  await refreshOffer(tx, nextCampaign, nextState);
  // Receipts retain every roll. Keep the player-facing summary within passage bounds.
  const paragraphs = lines.slice(-8);
  if (lines.length > 8) {
    paragraphs.unshift(`${lines.length - 8} earlier check outcomes are recorded in the saved dice history.`);
  }
  const passageId = await appendMechanicalPassage(tx, current, plan.action.label, paragraphs.length ? paragraphs : ['The admitted interval advances.']);
  const nextStory = { ...current, revision: current.revision + 1, viewVersion: current.viewVersion + 1 };
  if (nextState !== 'running') {
    await admitConsequenceNarration(tx, nextStory, {
      passageId, operationId: activity.id, afterSegment: activity.completed,
      throughSegment: completed, label: plan.action.label, intention: plan.action.description,
    });
  }
  return { activity: nextActivity, state: nextCampaign, current: nextStory };
}

export function createCampaignActivities(database: Database) {
  return {
    async advance(id: string): Promise<number | null> {
      return database.db.transaction(async (tx) => {
        const [reference] = await tx.select().from(gameActivity).where(eq(gameActivity.id, id));
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
        const [activity] = await tx.select().from(gameActivity).where(eq(gameActivity.id, id));
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
        const elapsed = elapsedGameMs({ ...settled.activity, pace, now, durationMs: plan.action.durationMs });
        return waitUntilBoundary(elapsed, nextBoundaryMs(plan, plan.resolvedThroughMs), pace);
      });
    },
  };
}
