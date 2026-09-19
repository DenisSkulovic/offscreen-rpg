import { randomInt, randomUUID } from 'node:crypto';
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
import {
  actionAvailable,
  resolvedActivityPlanSchema,
} from '@offscreen/game/activities';
import {
  incrementStoryViewVersion,
  lockOwnedStory,
  readDatabaseClockMs,
} from '../stories/persistence';
import { StoryError, parseStoryIdentifier } from '../stories/errors';
import { commandReceipt, saveCommand } from './settings';
import {
  campaignCharacter,
  campaignStoryFacts,
  campaignOffer,
  requireCampaign,
  loadOfferPlan,
} from './persistence';
import { requestActionNarration } from './narration';
import { scheduleActivity } from './activities';
import { projectCampaignClock } from './clock';

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
        !immediateActionAvailable(
          campaignCharacter(state),
          campaignStoryFacts(state),
          definition,
        )
      ) {
        throw new StoryError('conflict');
      }
      const [active] = state.activeActivityId
        ? await tx
            .select()
            .from(gameActivity)
            .where(eq(gameActivity.id, state.activeActivityId))
        : [];
      if (
        active &&
        (active.state === 'running' ||
          (active.state === 'paused' &&
            definition.resolution.kind !== 'process'))
      ) {
        throw new StoryError('conflict');
      }
      if (definition.resolution.kind === 'resume') {
        const resume = definition.resolution;
        if (
          resume.activityId === undefined ||
          resume.activityRevision === undefined
        ) {
          throw new StoryError('conflict');
        }
        const [retained] = await tx
          .select()
          .from(gameActivity)
          .where(eq(gameActivity.id, resume.activityId));
        if (
          !retained ||
          retained.storyId !== current.id ||
          retained.revision !== resume.activityRevision ||
          !['encounter', 'suspended'].includes(retained.state)
        ) {
          throw new StoryError('conflict');
        }
        const activePlan = resolvedActivityPlanSchema.parse(retained.plan);
        if (
          activePlan.action.id !== resume.activityActionId ||
          !actionAvailable(campaignCharacter(state), activePlan.action)
        ) {
          throw new StoryError('conflict');
        }
        const now = await readDatabaseClockMs(tx, current.id);
        await tx
          .update(gameActivity)
          .set({
            state: 'running',
            revision: retained.revision + 1,
          })
          .where(eq(gameActivity.id, retained.id));
        await tx
          .update(campaign)
          .set({
            offer: null,
            activeActivityId: retained.id,
            clockAnchorAt: new Date(now),
          })
          .where(eq(campaign.storyId, current.id));
        await incrementStoryViewVersion(tx, {
          storyId: current.id,
          viewVersion: current.viewVersion + 1,
        });
        await saveCommand(tx, current.id, args.operationId, request);
        await scheduleActivity(tx, retained.id);
        return;
      }
      if (definition.resolution.kind === 'process') {
        // A new commitment takes the character's one advancing slot, but it does
        // not erase interrupted work. The retained row remains an explicit future
        // choice with the same identity, progress, rolls and captured terms.
        if (active && ['encounter', 'paused'].includes(active.state)) {
          await tx
            .update(gameActivity)
            .set({ state: 'suspended', revision: active.revision + 1 })
            .where(eq(gameActivity.id, active.id));
        }
        const now = await readDatabaseClockMs(tx, current.id);
        const clockHeld = Boolean(
          active && ['encounter', 'paused'].includes(active.state),
        );
        const projected = projectCampaignClock(state, now, clockHeld);
        const activityId = randomUUID();
        await tx.insert(gameActivity).values({
          id: activityId,
          storyId: current.id,
          plan: {
            version: 5,
            action: definition.resolution.action,
            settingsRevision: state.settingsRevision,
            resolvedThroughTick: 0,
          },
          state: 'running',
          boundariesSettled: 0,
          progress: {
            effortTicks: 0,
            process: { kind: 'contribution.v1', earned: 0 },
            completionPending: false,
          },
        });
        await tx
          .update(campaign)
          .set({
            offer: null,
            activeActivityId: activityId,
            tick: projected.clock.elapsedTicks,
            clock: projected.clock,
            clockAnchorAt: new Date(now),
          })
          .where(eq(campaign.storyId, current.id));
        await incrementStoryViewVersion(tx, {
          storyId: current.id,
          viewVersion: current.viewVersion + 1,
        });
        await saveCommand(tx, current.id, args.operationId, request);
        await scheduleActivity(tx, activityId);
        return;
      }
      const resolved = resolveImmediateAction(
        campaignCharacter(state),
        campaignStoryFacts(state),
        definition,
        args.operationId,
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
        declarations: resolved.declarations,
        roll: resolved.roll,
      });
      await tx
        .update(campaign)
        .set({
          character: resolved.character,
          storyFacts: resolved.storyFacts,
          offer: null,
          // An encounter action resolves the obstacle, not the interrupted
          // commitment. Keep its identity attached so subsequent narration can
          // offer a resume of the exact durable work and retained progress.
          activeActivityId: active?.state === 'encounter' ? active.id : null,
        })
        .where(eq(campaign.storyId, current.id));
      await saveCommand(tx, current.id, args.operationId, request);
      await requestActionNarration(tx, args.operationId);
    });
  };
}
