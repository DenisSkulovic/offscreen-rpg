import { and, eq } from 'drizzle-orm';
import { storyResolution } from '@offscreen/db/story-schema';
import type { Database } from '@offscreen/db';
import { campaign, gameActivity } from '@offscreen/db/campaign-schema';
import { actionCommandSchema } from '@offscreen/contracts/campaign';
import { lockOwnedStory, readDatabaseClockMs } from './story-persistence';
import { StoryError, parseStoryIdentifier } from './story-errors';
import { commandReceipt, saveCommand, loadCampaignSettings } from './campaign-settings';
import { campaignCharacter, campaignOffer, requireCampaign, refreshOffer, appendMechanicalPassage } from './campaign-persistence';
import { selectedAction } from './rules/options';
import { actionContentSchema, actionAvailable, resolvedActivityPlanSchema } from './rules/action-content';
import { scheduleActivity, settleActivity } from './campaign-activities';

export function createCampaignActions(database: Database) {
  return async function act(args: { ownerId: string; storyId: string; operationId: string; body: unknown }) {
    const parsed = actionCommandSchema.safeParse(args.body);
    if (!parsed.success) {
      throw new StoryError('invalid');
    }
    parseStoryIdentifier(args.storyId);
    await database.db.transaction(async (tx) => {
      const current = await lockOwnedStory(tx, args);
      const request = { kind: 'action', ...parsed.data };
      if (await commandReceipt(tx, current.id, args.operationId, request)) {
        return;
      }
      if (current.revision !== parsed.data.expectedRevision) {
        throw new StoryError('conflict');
      }
      const [narration] = await tx.select().from(storyResolution).where(and(eq(storyResolution.storyId, current.id), eq(storyResolution.baseRevision, current.revision)));
      if (narration) {
        throw new StoryError('conflict');
      }
      const state = await requireCampaign(tx, current.id);
      const offer = campaignOffer(state);
      if (offer.id !== parsed.data.offerId) {
        throw new StoryError('conflict');
      }
      const action = selectedAction(offer, parsed.data.path);
      if (action.kind !== 'attempt') {
        throw new StoryError('invalid');
      }
      const content = actionContentSchema.parse(state.content);
      const definition = content.actions.find((candidate) => candidate.id === action.definition);
      if (!definition || !actionAvailable(campaignCharacter(state), definition)) {
        throw new StoryError('conflict');
      }
      const [active] = state.activeActivityId ? await tx.select().from(gameActivity).where(eq(gameActivity.id, state.activeActivityId)) : [];
      if (active && ['running', 'paused'].includes(active.state)) {
        throw new StoryError('conflict');
      }
      const { settings } = await loadCampaignSettings(tx, current.id, state.settingsRevision);
      const now = await readDatabaseClockMs(tx, current.id);
      const plan = resolvedActivityPlanSchema.parse({
        version: 2, action: definition, startGameTimeMs: state.gameTimeMs, settingsRevision: settings.revision,
      });
      // An interruption stops the old commitment. Follow-up intentions get new plans;
      // they cannot silently award its uncompleted future.
      if (active?.state === 'encounter') {
        await tx.update(gameActivity).set({ state: 'abandoned', revision: active.revision + 1 }).where(eq(gameActivity.id, active.id));
      }
      const [activity] = await tx.insert(gameActivity).values({
        id: args.operationId, storyId: current.id, plan, state: 'running',
        elapsedMs: 0, anchorAt: new Date(now), pace: settings.pace,
      }).returning();
      if (!activity) {
        throw new Error('Missing admitted activity');
      }
      const admitted = { ...state, activeActivityId: activity.id };
      await tx.update(campaign).set({ activeActivityId: activity.id }).where(eq(campaign.storyId, current.id));
      if (definition.durationMs === 0) {
        await settleActivity(tx, current, admitted, activity, now);
      } else {
        await refreshOffer(tx, admitted, 'running');
        await appendMechanicalPassage(tx, current, definition.label, ['Your attempt begins. Its consequences will be resolved as game time elapses.']);
        await scheduleActivity(tx, activity.id);
      }
      await saveCommand(tx, current.id, args.operationId, request);
    });
  };
}
