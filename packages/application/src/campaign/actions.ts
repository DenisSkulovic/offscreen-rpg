import { randomInt } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { storyResolution } from '@offscreen/db/story-schema';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignConsequence,
  gameActionReceipt,
  gameActivity,
} from '@offscreen/db/campaign-schema';
import { actionCommandSchema } from '@offscreen/contracts/campaign';
import {
  immediateActionAvailable,
  resolveImmediateAction,
} from '@offscreen/game/immediate-actions';
import { selectOfferAction } from '@offscreen/game/offers';
import { lockOwnedStory } from '../stories/persistence';
import { StoryError, parseStoryIdentifier } from '../stories/errors';
import { commandReceipt, saveCommand } from './settings';
import {
  campaignCharacter,
  campaignOffer,
  requireCampaign,
  loadOfferPlan,
} from './persistence';
import { requestActionNarration } from './narration';

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
      // An interruption stops the old commitment. Follow-up intentions get new plans;
      // they cannot silently award its uncompleted future.
      if (active?.state === 'encounter') {
        await tx
          .update(gameActivity)
          .set({ state: 'abandoned', revision: active.revision + 1 })
          .where(eq(gameActivity.id, active.id));
      }
      const resolved = resolveImmediateAction(
        campaignCharacter(state),
        definition,
        () => randomInt(1, 21),
      );
      await tx.insert(gameActionReceipt).values({
        operationId: args.operationId,
        storyId: current.id,
        offerId: offer.id,
        actionKey: definition.key,
        baseRevision: current.revision,
        offer,
        plan: definition,
        label: definition.label,
        intention: definition.intention,
        outcome: resolved.outcome,
        outcomeText: resolved.text,
        effects: resolved.effects,
        roll: resolved.roll,
      });
      await tx
        .update(campaign)
        .set({
          character: resolved.character,
          offer: null,
          activeActivityId: null,
        })
        .where(eq(campaign.storyId, current.id));
      await saveCommand(tx, current.id, args.operationId, request);
      await requestActionNarration(tx, args.operationId);
    });
  };
}
