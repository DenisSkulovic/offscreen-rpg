import { eq } from 'drizzle-orm';
import { narrativeIntentPlanSchema } from '@offscreen/game/narrative-intent';
import { realMsUntilGameSecond } from '@offscreen/game/time';
import type { Transaction } from '@offscreen/db';
import {
  campaign,
  gameActionExecution,
} from '@offscreen/story-persistence/campaign';
import { incrementStoryViewVersion, type StoryRecord } from '../stories/persistence';
import type { CampaignRecord } from './persistence';
import { campaignClockHeld } from './holds';
import { projectCampaignClock } from './clock';
import { recordActionExecutionEvent } from './action-executions';
import {
  resolveWriterContinuationBases,
  scheduleWriterContinuation,
  type WriterContinuationAdmission,
  WRITER_CONTINUATION_ADMISSION_SCRIPTED,
} from '../storyteller/writer-continuation';

type ActionExecutionRecord = typeof gameActionExecution.$inferSelect;

export type NarrativeActionExecutionTransition =
  | {
      state: 'waiting';
      projected: ReturnType<typeof projectCampaignClock>;
      remainingRealMs: number;
    }
  | {
      state: 'settled';
      campaign: CampaignRecord;
    };

/** Projection-only wait and terminal settle for narrative-intent executions. */
export async function settleNarrativeIntentExecution(
  tx: Transaction,
  current: StoryRecord,
  state: CampaignRecord,
  execution: ActionExecutionRecord,
  now: number,
  writerContinuationAdmission: WriterContinuationAdmission = WRITER_CONTINUATION_ADMISSION_SCRIPTED,
): Promise<NarrativeActionExecutionTransition> {
  const plan = narrativeIntentPlanSchema.parse(execution.plan);
  if (execution.state === 'settled') {
    return { state: 'settled' as const, campaign: state };
  }
  if (execution.state !== 'running') {
    throw new Error('Narrative action execution is not running');
  }
  const projected = projectCampaignClock(
    state,
    now,
    { kind: 'accepted-action', operationId: execution.operationId },
    campaignClockHeld(state),
    execution.targetGameSecond,
  );
  if (projected.clock.elapsedGameSeconds < execution.targetGameSecond) {
    return {
      state: 'waiting' as const,
      projected,
      remainingRealMs: realMsUntilGameSecond(
        projected.clock,
        execution.targetGameSecond,
        projected.pace,
      ),
    };
  }
  await tx
    .update(gameActionExecution)
    .set({
      state: 'settled',
      revision: execution.revision + 1,
      settledAt: new Date(now),
    })
    .where(eq(gameActionExecution.operationId, execution.operationId));
  await recordActionExecutionEvent(tx, {
    storyId: current.id,
    executionId: execution.operationId,
    executionRevision: execution.revision + 1,
    gameSecond: execution.targetGameSecond,
    kind: 'settled',
    label: plan.intention,
  });
  const settledCampaign: CampaignRecord = {
    ...state,
    gameSecond: execution.targetGameSecond,
    clock: projected.clock,
    clockAnchorAt: new Date(now),
    activeActionOperationId: null,
  };
  await tx
    .update(campaign)
    .set({
      gameSecond: execution.targetGameSecond,
      clock: projected.clock,
      clockAnchorAt: new Date(now),
      activeActionOperationId: null,
    })
    .where(eq(campaign.storyId, current.id));
  await incrementStoryViewVersion(tx, {
    storyId: current.id,
    viewVersion: current.viewVersion + 1,
  });
  const bases = await resolveWriterContinuationBases(tx, current, settledCampaign);
  await scheduleWriterContinuation(tx, {
    ...bases,
    operationId: execution.operationId,
    ownerId: current.ownerId,
    controllingIntentOrReceiptId: execution.operationId,
    admission: writerContinuationAdmission,
  });
  return { state: 'settled' as const, campaign: settledCampaign };
}