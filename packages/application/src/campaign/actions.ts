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
  consumePreparedActivityPlan,
  immediateActionAvailable,
  rebindPreparedResume,
  resolveImmediateAction,
} from '@offscreen/game/immediate-actions';
import { selectOfferAction } from '@offscreen/game/offers';
import {
  actionAvailable,
  initialActivityProgress,
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
  campaignSituationAuthorization,
  requireCampaign,
  loadOfferPlan,
  processOccurrenceAvailable,
  recordActivityEvent,
} from './persistence';
import { requestActionNarration } from './narration';
import { scheduleActivity } from './activities';
import { projectCampaignClock } from './clock';
import { createAcceptedActivityPlan } from './accepted-plans';

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
      const authorization = campaignSituationAuthorization(state);
      if (offer.id !== parsed.data.offerId) {
        throw new StoryError('conflict');
      }
      if (authorization.offerId !== offer.id) {
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
      const acceptedSequence = [definition];
      for (const successorPath of parsed.data.successorPaths ?? []) {
        const successorSelection = selectOfferAction(offer, successorPath);
        if (successorSelection.state !== 'selected') {
          throw new StoryError('invalid');
        }
        const successor = await loadOfferPlan(tx, {
          storyId: current.id,
          offerId: offer.id,
          narrativeRevision: current.revision,
          actionKey: successorSelection.actionKey,
        });
        if (
          !successor ||
          successor.resolution.kind !== 'process' ||
          authorization.activityAccess.kind !== 'selected' ||
          !authorization.activityAccess.actionKeys.includes(successor.key) ||
          acceptedSequence.some((entry) => entry.key === successor.key)
        ) {
          throw new StoryError('conflict');
        }
        acceptedSequence.push(successor);
      }
      if (
        acceptedSequence.length > 1 &&
        definition.resolution.kind !== 'process'
      ) {
        throw new StoryError('invalid');
      }
      const acceptedHorizonTicks = parsed.data.horizonTicks;
      if (
        (definition.resolution.kind === 'process' ||
          definition.resolution.kind === 'resume') &&
        (authorization.activityAccess.kind !== 'selected' ||
          !authorization.activityAccess.actionKeys.includes(definition.key))
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
          !['encounter', 'suspended', 'blocked'].includes(retained.state)
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
        await recordActivityEvent(tx, {
          storyId: current.id,
          activityId: retained.id,
          activityRevision: retained.revision + 1,
          tick: state.tick,
          kind: 'resumed',
          causeKey: `command:${args.operationId}`,
          label: activePlan.action.label,
          summary: `${activePlan.action.label} resumed with its saved progress.`,
        });
        await tx
          .update(campaign)
          .set({
            offer: null,
            situationAuthorization: {
              version: 2,
              offerId: null,
              activityAccess: { kind: 'none' },
              preparedPlans: consumePreparedActivityPlan(
                authorization.preparedPlans,
                definition,
              ),
            },
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
        if (!(await processOccurrenceAvailable(tx, state, definition))) {
          throw new StoryError('conflict');
        }
        // A new commitment takes the character's one advancing slot, but it does
        // not erase interrupted work. The retained row remains an explicit future
        // choice with the same identity, progress, rolls and captured terms.
        let retainedRevision: number | null = null;
        if (active && ['encounter', 'paused'].includes(active.state)) {
          retainedRevision = active.revision + 1;
          const retainedPlan = resolvedActivityPlanSchema.parse(active.plan);
          await tx
            .update(gameActivity)
            .set({ state: 'suspended', revision: active.revision + 1 })
            .where(eq(gameActivity.id, active.id));
          await recordActivityEvent(tx, {
            storyId: current.id,
            activityId: active.id,
            activityRevision: active.revision + 1,
            tick: state.tick,
            kind: 'suspended',
            causeKey: `command:${args.operationId}`,
            label: retainedPlan.action.label,
            summary: `${retainedPlan.action.label} was suspended while other work began.`,
          });
        } else if (active?.state === 'blocked') {
          // Blocked work is already dormant. Keep its blocker and exact revision;
          // starting another activity must not disguise it as voluntary suspension.
          retainedRevision = active.revision;
        }
        const now = await readDatabaseClockMs(tx, current.id);
        const clockHeld = Boolean(
          active && ['encounter', 'paused'].includes(active.state),
        );
        const projected = projectCampaignClock(state, now, clockHeld);
        const activityId = randomUUID();
        let acceptedPlan = null;
        if (acceptedSequence.length > 1) {
          if (acceptedHorizonTicks === undefined) {
            throw new StoryError('invalid');
          }
          acceptedPlan = createAcceptedActivityPlan({
            offerId: offer.id,
            plans: acceptedSequence,
            firstActivityId: activityId,
            acceptedAtTick: projected.clock.elapsedTicks,
            horizonTicks: acceptedHorizonTicks,
          });
        }
        await tx.insert(gameActivity).values({
          id: activityId,
          storyId: current.id,
          plan: {
            version: 6,
            action: definition.resolution.action,
            settingsRevision: state.settingsRevision,
            resolvedThroughTick: 0,
          },
          state: 'running',
          boundariesSettled: 0,
          progress: initialActivityProgress(definition.resolution.action),
        });
        await recordActivityEvent(tx, {
          storyId: current.id,
          activityId,
          activityRevision: 0,
          tick: projected.clock.elapsedTicks,
          kind: 'started',
          causeKey: `command:${args.operationId}`,
          label: definition.resolution.action.label,
          summary: `${definition.resolution.action.label} started.`,
        });
        await tx
          .update(campaign)
          .set({
            offer: null,
            situationAuthorization: {
              version: 2,
              offerId: null,
              activityAccess: { kind: 'none' },
              preparedPlans:
                active && retainedRevision !== null
                  ? rebindPreparedResume(
                      consumePreparedActivityPlan(
                        authorization.preparedPlans,
                        definition,
                      ),
                      active.id,
                      retainedRevision,
                    )
                  : consumePreparedActivityPlan(
                      authorization.preparedPlans,
                      definition,
                    ),
            },
            activeActivityId: activityId,
            acceptedActivityPlan: acceptedPlan,
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
          situationAuthorization: {
            version: 2,
            offerId: null,
            activityAccess: { kind: 'none' },
            preparedPlans: [],
          },
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
