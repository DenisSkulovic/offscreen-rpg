import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { campaign, campaignSettings, gameActivity } from '@offscreen/db/campaign-schema';
import { activityControlSchema, paceSchema } from '@offscreen/contracts/campaign';
import { lockOwnedStory, readDatabaseClockMs, incrementStoryViewVersion } from './story-persistence';
import { requireCampaign } from './campaign-persistence';
import { commandReceipt, saveCommand, loadCampaignSettings } from './campaign-settings';
import { settleActivity, scheduleActivity } from './campaign-activities';
import { elapsedGameMs } from './rules/clock';
import { resolvedActivityPlanSchema } from './rules/action-content';
import { StoryError } from './story-errors';

export function createCampaignControls(database: Database) {
  return async function control(args: { ownerId: string; storyId: string; operationId: string; body: unknown }) {
    const parsed = activityControlSchema.safeParse(args.body);
    if (!parsed.success) throw new StoryError('invalid');
    await database.db.transaction(async (tx) => {
      const current = await lockOwnedStory(tx, args);
      const request = { kind: 'activity-control', ...parsed.data };
      if (await commandReceipt(tx, current.id, args.operationId, request)) return;
      const state = await requireCampaign(tx, current.id);
      const [activity] = await tx.select().from(gameActivity).where(eq(gameActivity.id, parsed.data.activityId));
      if (!activity || state.activeActivityId !== activity.id || activity.storyId !== current.id || activity.revision !== parsed.data.expectedRevision) throw new StoryError('conflict');
      if (!['running', 'paused'].includes(activity.state)) throw new StoryError('conflict');
      if ((parsed.data.action === 'pause' && activity.state !== 'running') || (parsed.data.action === 'resume' && activity.state !== 'paused')) throw new StoryError('conflict');
      if (state.locked && parsed.data.action === 'pace') throw new StoryError('conflict');
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
      const elapsedMs = elapsedGameMs({ ...settled.activity, pace: oldPace, now, durationMs: plan.action.durationMs });
      const nextState = parsed.data.action === 'pause' ? 'paused' : parsed.data.action === 'resume' ? 'running' : settled.activity.state;
      await tx.update(gameActivity).set({ state: nextState, elapsedMs, anchorAt: new Date(now), pace: parsed.data.pace ?? oldPace, revision: settled.activity.revision + 1 }).where(eq(gameActivity.id, activity.id));
      if (parsed.data.pace) {
        const previous = await loadCampaignSettings(tx, current.id, state.settingsRevision);
        const revision = state.settingsRevision + 1;
        await tx.insert(campaignSettings).values({ storyId: current.id, revision, profile: previous.profile, settings: { ...previous.settings, revision, pace: parsed.data.pace } });
        await tx.update(campaign).set({ settingsRevision: revision }).where(eq(campaign.storyId, current.id));
      }
      await incrementStoryViewVersion(tx, { storyId: current.id, viewVersion: settled.current.viewVersion + 1 });
      await saveCommand(tx, current.id, args.operationId, request);
      if (nextState === 'running') await scheduleActivity(tx, activity.id);
    });
  };
}
