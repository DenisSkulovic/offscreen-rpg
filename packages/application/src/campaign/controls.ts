import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignSettings,
  gameActivity,
} from '@offscreen/db/campaign-schema';
import { activityControlSchema } from '@offscreen/contracts/campaign';
import {
  lockOwnedStory,
  readDatabaseClockMs,
  incrementStoryViewVersion,
} from '../stories/persistence';
import { requireCampaign } from './persistence';
import {
  commandReceipt,
  saveCommand,
  loadCampaignSettings,
} from './settings';
import { settleActivity, scheduleActivity } from './activities';
import {
  nextBoundaryTick,
  resolvedActivityPlanSchema,
} from '@offscreen/game/activities';
import {
  earnedTicks,
  paceSchema,
  tickProgressSchema,
} from '@offscreen/game/time';
import { StoryError } from '../stories/errors';

export function createCampaignControls(database: Database) {
  return async function control(args: {
    ownerId: string;
    storyId: string;
    operationId: string;
    body: unknown;
  }) {
    const parsed = activityControlSchema.safeParse(args.body);
    if (!parsed.success) throw new StoryError('invalid');
    const result = await database.db.transaction(async (tx) => {
      const current = await lockOwnedStory(tx, args);
      const request = { kind: 'activity-control', ...parsed.data };
      if (await commandReceipt(tx, current.id, args.operationId, request))
        return;
      const state = await requireCampaign(tx, current.id);
      const [activity] = await tx
        .select()
        .from(gameActivity)
        .where(eq(gameActivity.id, parsed.data.activityId));
      if (
        !activity ||
        state.activeActivityId !== activity.id ||
        activity.storyId !== current.id ||
        activity.revision !== parsed.data.expectedRevision
      )
        throw new StoryError('conflict');
      if (!['running', 'paused'].includes(activity.state))
        throw new StoryError('conflict');
      if (
        (parsed.data.action === 'pause' && activity.state !== 'running') ||
        (parsed.data.action === 'resume' && activity.state !== 'paused')
      )
        throw new StoryError('conflict');
      if (state.locked && parsed.data.action === 'pace')
        throw new StoryError('conflict');
      const now = await readDatabaseClockMs(tx, current.id);
      const settled = await settleActivity(tx, current, state, activity, now);
      if (!['running', 'paused'].includes(settled.activity.state)) {
        // Completion/encounter won the race. Keep its effects and acknowledge the
        // requested control as superseded instead of rolling the transaction back.
        await saveCommand(tx, current.id, args.operationId, request);
        return;
      }
      const oldPace = paceSchema.parse(settled.activity.pace);
      const plan = resolvedActivityPlanSchema.parse(settled.activity.plan);
      const progress = earnedTicks({
        ...settled.activity,
        progress: tickProgressSchema.parse(settled.activity.progress),
        pace: oldPace,
        now,
        durationTicks: plan.action.durationTicks,
      });
      if (
        settled.activity.state === 'running' &&
        nextBoundaryTick(plan, plan.resolvedThroughTick) <=
          progress.elapsedTicks
      ) {
        // Commit the batch and continue catch-up before accepting a control.
        // Throwing inside this transaction would undo the progress just made.
        await scheduleActivity(tx, activity.id);
        return 'catching-up' as const;
      }
      let nextState = settled.activity.state;
      if (parsed.data.action === 'pause') {
        nextState = 'paused';
      } else if (parsed.data.action === 'resume') {
        nextState = 'running';
      }
      await tx
        .update(gameActivity)
        .set({
          state: nextState,
          progress,
          anchorAt: new Date(now),
          pace: parsed.data.pace ?? oldPace,
          revision: settled.activity.revision + 1,
        })
        .where(eq(gameActivity.id, activity.id));
      if (parsed.data.pace) {
        const previous = await loadCampaignSettings(
          tx,
          current.id,
          state.settingsRevision,
        );
        const revision = state.settingsRevision + 1;
        await tx
          .insert(campaignSettings)
          .values({
            storyId: current.id,
            revision,
            profile: previous.profile,
            settings: {
              ...previous.settings,
              revision,
              pace: parsed.data.pace,
            },
          });
        await tx
          .update(campaign)
          .set({ settingsRevision: revision })
          .where(eq(campaign.storyId, current.id));
      }
      await incrementStoryViewVersion(tx, {
        storyId: current.id,
        viewVersion: settled.current.viewVersion + 1,
      });
      await saveCommand(tx, current.id, args.operationId, request);
      if (nextState === 'running') await scheduleActivity(tx, activity.id);
    });
    if (result === 'catching-up') {
      throw new StoryError('conflict');
    }
  };
}
