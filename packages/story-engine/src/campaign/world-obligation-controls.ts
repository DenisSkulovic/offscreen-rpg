import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  gameActionExecution,
  gameActivity,
  worldObligation,
  worldObligationEvent,
} from '@offscreen/db/campaign-schema';
import { worldObligationControlSchema } from '@offscreen/contracts/campaign';
import { compileWorldDate } from '@offscreen/game/calendar';
import { worldObligationSchema } from '@offscreen/game/world-obligations';
import {
  incrementStoryViewVersion,
  lockOwnedStory,
  readDatabaseClockMs,
} from '../stories/persistence';
import { StoryError } from '../stories/errors';
import { projectCampaignClock } from './clock';
import { campaignClockHeld } from './holds';
import { requireCampaign } from './persistence';
import { commandReceipt, loadCampaignSettings, saveCommand } from './settings';
import { scheduleActionExecution } from './action-executions';
import { scheduleActivity } from './activities';
import { readNearestPendingWorldObligations } from './world-obligations';

/** Revises one pending schedule under the story lock and wakes accepted work. */
export function createWorldObligationControls(database: Database) {
  return async function control(args: {
    ownerId: string;
    storyId: string;
    operationId: string;
    body: unknown;
  }) {
    const parsed = worldObligationControlSchema.safeParse(args.body);
    if (!parsed.success) throw new StoryError('invalid');

    await database.db.transaction(async (tx) => {
      const current = await lockOwnedStory(tx, args);
      const request = { kind: 'world-obligation-control', ...parsed.data };
      if (await commandReceipt(tx, current.id, args.operationId, request)) {
        return;
      }
      const state = await requireCampaign(tx, current.id);
      const [record] = await tx
        .select()
        .from(worldObligation)
        .where(eq(worldObligation.id, parsed.data.obligationId));
      if (
        !record ||
        record.storyId !== current.id ||
        record.state !== 'pending' ||
        record.revision !== parsed.data.expectedRevision
      ) {
        throw new StoryError('conflict');
      }
      const definition = worldObligationSchema.parse(record.definition);
      const now = await readDatabaseClockMs(tx, current.id);
      const nearest = await readNearestPendingWorldObligations(tx, {
        storyId: current.id,
        throughGameSecond: Number.MAX_SAFE_INTEGER,
        followUp: 'controlling-scene',
      });
      const nearestGameSecond = nearest[0]?.dueGameSecond;
      const [action] = state.activeActionOperationId
        ? await tx
            .select()
            .from(gameActionExecution)
            .where(
              eq(
                gameActionExecution.operationId,
                state.activeActionOperationId,
              ),
            )
        : [];
      const [activity] = state.activeActivityId
        ? await tx
            .select()
            .from(gameActivity)
            .where(eq(gameActivity.id, state.activeActivityId))
        : [];
      const runningAction = action?.state === 'running' ? action : null;
      const runningActivity = activity?.state === 'running' ? activity : null;
      let eligibility:
        | { kind: 'accepted-action'; operationId: string }
        | { kind: 'accepted-activity'; activityId: string }
        | { kind: 'none' } = { kind: 'none' };
      if (runningAction) {
        eligibility = {
          kind: 'accepted-action',
          operationId: runningAction.operationId,
        };
      } else if (runningActivity) {
        eligibility = {
          kind: 'accepted-activity',
          activityId: runningActivity.id,
        };
      }
      const projected = projectCampaignClock(
        state,
        now,
        eligibility,
        campaignClockHeld(state),
        runningAction?.targetGameSecond ??
          nearestGameSecond ??
          state.gameSecond,
        nearestGameSecond,
      ).clock;
      if (projected.elapsedGameSeconds >= record.dueGameSecond) {
        // Once accepted work has earned the old boundary, that event wins even
        // if its sleeping worker has not persisted the interruption yet.
        throw new StoryError('conflict');
      }

      if (record.revision >= 2_147_483_646) {
        throw new StoryError('conflict');
      }
      const revision = record.revision + 1;
      let dueGameSecond = record.dueGameSecond;
      if (parsed.data.action === 'postpone') {
        const settings = await loadCampaignSettings(
          tx,
          current.id,
          state.settingsRevision,
        );
        try {
          dueGameSecond =
            parsed.data.due.kind === 'game-second'
              ? parsed.data.due.gameSecond
              : compileWorldDate(settings.settings.time, parsed.data.due.date);
        } catch {
          throw new StoryError('invalid');
        }
      }
      if (
        parsed.data.action === 'postpone' &&
        (dueGameSecond <= projected.elapsedGameSeconds ||
          dueGameSecond <= record.dueGameSecond)
      ) {
        throw new StoryError('conflict');
      }
      const nextDefinition = worldObligationSchema.parse({
        ...definition,
        revision,
        dueGameSecond,
      });
      const [updated] = await tx
        .update(worldObligation)
        .set({
          revision,
          definition: nextDefinition,
          dueGameSecond,
          state: parsed.data.action === 'cancel' ? 'cancelled' : 'pending',
        })
        .where(
          and(
            eq(worldObligation.id, record.id),
            eq(worldObligation.revision, record.revision),
            eq(worldObligation.state, 'pending'),
          ),
        )
        .returning({ id: worldObligation.id });
      if (!updated) throw new StoryError('conflict');
      await tx.insert(worldObligationEvent).values({
        id: randomUUID(),
        storyId: current.id,
        obligationId: record.id,
        obligationRevision: revision,
        gameSecond: projected.elapsedGameSeconds,
        kind: parsed.data.action === 'cancel' ? 'cancelled' : 'postponed',
        label: definition.label,
        details:
          parsed.data.action === 'postpone'
            ? { previousDueGameSecond: record.dueGameSecond, dueGameSecond }
            : { previousDueGameSecond: record.dueGameSecond },
      });
      await incrementStoryViewVersion(tx, {
        storyId: current.id,
        viewVersion: current.viewVersion + 1,
      });
      await saveCommand(tx, current.id, args.operationId, request);
      if (runningAction) {
        await scheduleActionExecution(tx, runningAction.operationId);
      } else if (runningActivity) {
        await scheduleActivity(tx, runningActivity.id);
      }
    });
  };
}
