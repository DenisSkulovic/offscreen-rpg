import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignSettings,
  gameActivity,
  gameRoll,
} from '@offscreen/db/campaign-schema';
import { story } from '@offscreen/db/story-schema';
import {
  campaignViewSchema,
  campaignSettingsSchema,
  type CampaignView,
} from '@offscreen/contracts/campaign';
import {
  nextBoundaryTick,
  resolvedActivityPlanSchema,
} from '@offscreen/game/activities';
import {
  paceSchema,
  realMsUntilTick,
  tickProgressSchema,
} from '@offscreen/game/time';

export async function readCampaign(
  db: Pick<Database['db'], 'select'>,
  ownerId: string,
  storyId: string,
): Promise<CampaignView | null> {
  const [row] = await db
    .select({ campaign, settings: campaignSettings.settings })
    .from(campaign)
    .innerJoin(story, eq(story.id, campaign.storyId))
    .innerJoin(
      campaignSettings,
      and(
        eq(campaignSettings.storyId, campaign.storyId),
        eq(campaignSettings.revision, campaign.settingsRevision),
      ),
    )
    .where(and(eq(story.id, storyId), eq(story.ownerId, ownerId)));
  if (!row) {
    return null;
  }
  const state = row.campaign;
  const [activity] = state.activeActivityId
    ? await db
        .select()
        .from(gameActivity)
        .where(
          and(
            eq(gameActivity.id, state.activeActivityId),
            eq(gameActivity.storyId, storyId),
          ),
        )
    : [];
  const rolls = await db
    .select()
    .from(gameRoll)
    .where(eq(gameRoll.storyId, storyId))
    .orderBy(desc(gameRoll.tick), desc(gameRoll.id))
    .limit(100);
  let activityView = null;
  if (activity) {
    const plan = resolvedActivityPlanSchema.parse(activity.plan);
    const pace = paceSchema.parse(activity.pace);
    const progress = tickProgressSchema.parse(activity.progress);
    activityView = {
      id: activity.id,
      label: plan.action.label,
      state: activity.state,
      completed: activity.completed,
      durationTicks: plan.action.durationTicks,
      revision: activity.revision,
      resolvedTicks: plan.resolvedThroughTick,
      settingsRevision: plan.settingsRevision,
      dueAt:
        activity.state === 'running'
          ? new Date(
              activity.anchorAt.getTime() +
                realMsUntilTick(
                  progress,
                  nextBoundaryTick(plan, plan.resolvedThroughTick),
                  pace,
                ),
            ).toISOString()
          : null,
    };
  }
  return campaignViewSchema.parse({
    settings: campaignSettingsSchema.parse(row.settings),
    character: state.character,
    location: state.location,
    tick: state.tick,
    offer: state.offer,
    activity: activityView,
    rolls: rolls.map((roll) => ({
      id: roll.id,
      segment: roll.segment,
      tick: roll.tick,
      roll: roll.result,
      effects: roll.effects,
    })),
  });
}
