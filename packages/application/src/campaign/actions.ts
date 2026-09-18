import { and, eq } from 'drizzle-orm';
import { storyResolution } from '@offscreen/db/story-schema';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignConsequence,
  gameActivity,
} from '@offscreen/db/campaign-schema';
import { actionCommandSchema } from '@offscreen/contracts/campaign';
import { resolvedActivityPlanSchema } from '@offscreen/game/activities';
import {
  immediateActionAvailable,
  type ImmediateActionPlan,
} from '@offscreen/game/immediate-actions';
import { selectOfferAction } from '@offscreen/game/offers';
import { wholeTicks } from '@offscreen/game/time';
import { lockOwnedStory, readDatabaseClockMs } from '../stories/persistence';
import { StoryError, parseStoryIdentifier } from '../stories/errors';
import { commandReceipt, saveCommand, loadCampaignSettings } from './settings';
import {
  campaignCharacter,
  campaignOffer,
  requireCampaign,
  loadOfferPlan,
} from './persistence';
import { settleActivity } from './activities';

export function createCampaignActions(database: Database) {
  return async function act(args: {
    ownerId: string;
    storyId: string;
    operationId: string;
    body: unknown;
  }) {
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
      const [narration] = await tx
        .select()
        .from(storyResolution)
        .where(
          and(
            eq(storyResolution.storyId, current.id),
            eq(storyResolution.baseRevision, current.revision),
          ),
        );
      if (narration) {
        throw new StoryError('conflict');
      }
      const [pendingConsequence] = await tx
        .select({ operationId: campaignConsequence.operationId })
        .from(campaignConsequence)
        .where(
          and(
            eq(campaignConsequence.storyId, current.id),
            eq(campaignConsequence.baseRevision, current.revision),
          ),
        );
      // Another action cannot overtake the durable narration preparation that
      // owns this narrative revision. The committed result remains readable.
      if (pendingConsequence) {
        throw new StoryError('conflict');
      }
      const state = await requireCampaign(tx, current.id);
      const offer = campaignOffer(state);
      if (offer.id !== parsed.data.offerId) {
        throw new StoryError('conflict');
      }
      const selection = selectOfferAction(offer, parsed.data.path);
      if (selection.state === 'missing') {
        throw new StoryError('conflict');
      }
      if (selection.state === 'incomplete') {
        throw new StoryError('invalid');
      }
      const definition = await loadOfferPlan(tx, {
        storyId: current.id,
        offerId: offer.id,
        narrativeRevision: current.revision,
        actionKey: selection.actionKey,
      });
      if (
        !definition ||
        !immediateActionAvailable(campaignCharacter(state), definition)
      ) {
        throw new StoryError('conflict');
      }
      const [active] = state.activeActivityId
        ? await tx
            .select()
            .from(gameActivity)
            .where(eq(gameActivity.id, state.activeActivityId))
        : [];
      if (active && ['running', 'paused'].includes(active.state)) {
        throw new StoryError('conflict');
      }
      const { settings } = await loadCampaignSettings(
        tx,
        current.id,
        state.settingsRevision,
      );
      const now = await readDatabaseClockMs(tx, current.id);
      const plan = resolvedActivityPlanSchema.parse({
        version: 3,
        action: activityAction(definition),
        startTick: state.tick,
        settingsRevision: settings.revision,
      });
      // An interruption stops the old commitment. Follow-up intentions get new plans;
      // they cannot silently award its uncompleted future.
      if (active?.state === 'encounter') {
        await tx
          .update(gameActivity)
          .set({ state: 'abandoned', revision: active.revision + 1 })
          .where(eq(gameActivity.id, active.id));
      }
      const [activity] = await tx
        .insert(gameActivity)
        .values({
          id: args.operationId,
          storyId: current.id,
          plan,
          state: 'running',
          progress: wholeTicks(0),
          anchorAt: new Date(now),
          pace: settings.pace,
        })
        .returning();
      if (!activity) {
        throw new Error('Missing admitted activity');
      }
      const admitted = { ...state, activeActivityId: activity.id };
      await tx
        .update(campaign)
        .set({ activeActivityId: activity.id })
        .where(eq(campaign.storyId, current.id));
      await settleActivity(tx, current, admitted, activity, now);
      await saveCommand(tx, current.id, args.operationId, request);
    });
  };
}

// Current adapter into settlement; zero duration is not the future process model.
// See ../../README.md, Mechanical selection and consequence, before extending it.
function activityAction(plan: ImmediateActionPlan) {
  const completion = {
    text: 'The immediate attempt is resolved.',
    effects: [],
  };
  if (plan.resolution.kind === 'automatic') {
    return {
      id: plan.key,
      label: plan.label,
      description: plan.intention,
      requires: plan.requires,
      durationTicks: 0,
      checks: [],
      completion: plan.resolution.outcome,
    };
  }
  return {
    id: plan.key,
    label: plan.label,
    description: plan.intention,
    requires: plan.requires,
    durationTicks: 0,
    checks: [
      {
        id: 'resolution',
        everyTicks: 1,
        resolution: { kind: 'ability' as const, plan: plan.resolution.check },
        success: { ...plan.resolution.success, interrupts: false },
        failure: { ...plan.resolution.failure, interrupts: false },
      },
    ],
    completion,
  };
}
