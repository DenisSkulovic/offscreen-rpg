import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { campaign, gameActionExecution } from '@offscreen/db/campaign-schema';
import { actionExecutionControlSchema } from '@offscreen/contracts/campaign';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { paceSchema, tickProgressSchema } from '@offscreen/game/time';
import {
  incrementStoryViewVersion,
  lockOwnedStory,
  readDatabaseClockMs,
} from '../stories/persistence';
import { StoryError } from '../stories/errors';
import { requireCampaign } from './persistence';
import {
  commandReceipt,
  recordCampaignPaceChange,
  saveCommand,
} from './settings';
import {
  scheduleActionExecution,
  settleActionExecution,
  recordActionExecutionEvent,
} from './action-executions';

/** Player controls for the one finite action currently allowed to age the world. */
export function createActionExecutionControls(database: Database) {
  return async function control(args: {
    ownerId: string;
    storyId: string;
    operationId: string;
    body: unknown;
  }) {
    const parsed = actionExecutionControlSchema.safeParse(args.body);
    if (!parsed.success) throw new StoryError('invalid');

    await database.db.transaction(async (tx) => {
      const current = await lockOwnedStory(tx, args);
      const request = { kind: 'action-execution-control', ...parsed.data };
      if (await commandReceipt(tx, current.id, args.operationId, request)) {
        return;
      }
      const state = await requireCampaign(tx, current.id);
      const [execution] = await tx
        .select()
        .from(gameActionExecution)
        .where(eq(gameActionExecution.operationId, parsed.data.executionId));
      if (
        !execution ||
        execution.storyId !== current.id ||
        state.activeActionOperationId !== execution.operationId ||
        execution.revision !== parsed.data.expectedRevision ||
        !['running', 'paused'].includes(execution.state)
      ) {
        throw new StoryError('conflict');
      }
      if (
        (parsed.data.action === 'pause' && execution.state !== 'running') ||
        (parsed.data.action === 'resume' && execution.state !== 'paused') ||
        (parsed.data.action === 'pace' && state.locked)
      ) {
        throw new StoryError('conflict');
      }

      const now = await readDatabaseClockMs(tx, current.id);
      let clock = tickProgressSchema.parse(state.clock);
      if (execution.state === 'running') {
        const settlement = await settleActionExecution(
          tx,
          current,
          state,
          execution,
          now,
        );
        if (settlement.state === 'settled') {
          // The target boundary won the race. Preserve that authoritative
          // result and make replay of this control a no-op.
          await saveCommand(tx, current.id, args.operationId, request);
          return;
        }
        clock = settlement.projected.clock;
      }

      let nextState = execution.state;
      if (parsed.data.action === 'pause') nextState = 'paused';
      if (parsed.data.action === 'resume') nextState = 'running';
      const oldPace = paceSchema.parse(state.clockPace);
      const plan = immediateActionPlanSchema.parse(execution.plan);
      let eventKind: 'paused' | 'resumed' | 'pace-changed';
      if (parsed.data.action === 'pause') eventKind = 'paused';
      else if (parsed.data.action === 'resume') eventKind = 'resumed';
      else eventKind = 'pace-changed';
      await tx
        .update(gameActionExecution)
        .set({ state: nextState, revision: execution.revision + 1 })
        .where(eq(gameActionExecution.operationId, execution.operationId));
      await recordActionExecutionEvent(tx, {
        storyId: current.id,
        executionId: execution.operationId,
        executionRevision: execution.revision + 1,
        tick: clock.elapsedTicks,
        kind: eventKind,
        label: plan.label,
      });
      await tx
        .update(campaign)
        .set({
          clock,
          clockAnchorAt: new Date(now),
          clockPace: parsed.data.pace ?? oldPace,
        })
        .where(eq(campaign.storyId, current.id));

      if (parsed.data.pace) {
        await recordCampaignPaceChange(tx, state, parsed.data.pace);
      }
      await incrementStoryViewVersion(tx, {
        storyId: current.id,
        viewVersion: current.viewVersion + 1,
      });
      await saveCommand(tx, current.id, args.operationId, request);
      if (nextState === 'running') {
        await scheduleActionExecution(tx, execution.operationId);
      }
    });
  };
}
