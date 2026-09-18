import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { campaign, campaignSettings, gameActivity, gameRoll } from '@offscreen/db/campaign-schema';
import { story } from '@offscreen/db/story-schema';
import { campaignViewSchema, campaignSettingsSchema, paceSchema, type CampaignView } from '@offscreen/contracts/campaign';
import { activityPlanSchema } from './rules/content';
import { waitUntilBoundary } from './rules/clock';
import { resolvedActivityPlanSchema, nextBoundaryMs } from './rules/action-content';

export async function readCampaign(db: Pick<Database['db'], 'select'>, ownerId: string, storyId: string): Promise<CampaignView | null> {
  const [row] = await db.select({ campaign, settings: campaignSettings.settings }).from(campaign)
    .innerJoin(story, eq(story.id, campaign.storyId))
    .innerJoin(campaignSettings, and(eq(campaignSettings.storyId, campaign.storyId), eq(campaignSettings.revision, campaign.settingsRevision)))
    .where(and(eq(story.id, storyId), eq(story.ownerId, ownerId)));
  if (!row) return null;
  const state = row.campaign;
  const [activity] = state.activeActivityId ? await db.select().from(gameActivity).where(and(eq(gameActivity.id, state.activeActivityId), eq(gameActivity.storyId, storyId))) : [];
  const rolls = await db.select().from(gameRoll).where(eq(gameRoll.storyId, storyId)).orderBy(desc(gameRoll.gameTimeMs), desc(gameRoll.id)).limit(100);
  const resolved = activity ? resolvedActivityPlanSchema.safeParse(activity.plan) : null;
  const plan = activity && !resolved?.success ? activityPlanSchema.parse(activity.plan) : null;
  let activityView = null;
  if (activity && resolved?.success) {
    const captured = resolved.data;
    const pace = paceSchema.parse(activity.pace);
    activityView = {
      id: activity.id, label: captured.action.label, state: activity.state,
      completed: activity.completed, hours: captured.action.durationMs / 3600000,
      durationMs: captured.action.durationMs, revision: activity.revision,
      elapsedMs: captured.resolvedThroughMs, settingsRevision: captured.settingsRevision,
      dueAt: activity.state === 'running' ? new Date(activity.anchorAt.getTime() + waitUntilBoundary(activity.elapsedMs, nextBoundaryMs(captured, captured.resolvedThroughMs), pace)).toISOString() : null,
    };
  }
  return campaignViewSchema.parse({
    unavailableReason: state.character && !state.content ? 'This earlier mechanical prototype is preserved for inspection. Its scenario-coupled actions are retired; start a new reviewed mechanical candidate to use the shared resolver.' : undefined,
    settings: campaignSettingsSchema.parse(row.settings), character: state.character, location: state.location,
    gameTimeMs: state.gameTimeMs, offer: state.content ? state.offer : null,
    activity: activityView ?? (activity && plan ? {
      id: activity.id, label: plan.label, state: activity.state, completed: activity.completed, hours: plan.hours,
      revision: activity.revision, elapsedMs: activity.elapsedMs, settingsRevision: plan.settingsRevision,
      dueAt: null,
    } : null),
    rolls: rolls.map((roll) => ({ id: roll.id, segment: roll.segment, gameTimeMs: roll.gameTimeMs, roll: roll.result, effects: roll.effects })),
  });
}
