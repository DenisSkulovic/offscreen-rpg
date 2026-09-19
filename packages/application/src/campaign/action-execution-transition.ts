import type { gameActionExecution } from '@offscreen/db/campaign-schema';
import {
  immediateActionPlanSchema,
  resolveImmediateAction,
} from '@offscreen/game/immediate-actions';
import { realMsUntilTick } from '@offscreen/game/time';
import { campaignClockHeld } from './holds';
import { projectCampaignClock } from './clock';
import {
  campaignCharacter,
  campaignStoryFacts,
  type CampaignRecord,
} from './persistence';
import type { CampaignFollowUpIntent } from './follow-up-intents';

type ActionExecutionRecord = typeof gameActionExecution.$inferSelect;

export type ActionExecutionTransition =
  | {
      state: 'waiting';
      projected: ReturnType<typeof projectCampaignClock>;
      remainingRealMs: number;
    }
  | {
      state: 'settled';
      campaign: CampaignRecord;
      receipt: ReturnType<typeof resolveImmediateAction>;
      fact: {
        kind: 'settled';
        executionRevision: number;
        tick: number;
        label: string;
      };
      followUps: readonly CampaignFollowUpIntent[];
    };

/**
 * Decides a finite action transition without persistence or workflow calls.
 * The application boundary later commits every returned part atomically.
 */
export function decideActionExecutionTransition(args: {
  state: CampaignRecord;
  execution: ActionExecutionRecord;
  now: number;
  rollDie: () => number;
}): ActionExecutionTransition {
  const { state, execution, now } = args;
  const plan = immediateActionPlanSchema.parse(execution.plan);
  if (plan.resolution.kind === 'process' || plan.resolution.kind === 'resume') {
    throw new Error('Finite action execution contains an activity plan');
  }
  const projected = projectCampaignClock(
    state,
    now,
    { kind: 'accepted-action', operationId: execution.operationId },
    campaignClockHeld(state),
    execution.targetTick,
  );
  if (projected.clock.elapsedTicks < execution.targetTick) {
    return {
      state: 'waiting',
      projected,
      remainingRealMs: realMsUntilTick(
        projected.clock,
        execution.targetTick,
        projected.pace,
      ),
    };
  }

  const receipt = resolveImmediateAction(
    campaignCharacter(state),
    campaignStoryFacts(state),
    plan,
    execution.operationId,
    args.rollDie,
  );
  return {
    state: 'settled',
    campaign: {
      ...state,
      character: receipt.character,
      storyFacts: receipt.storyFacts,
      tick: execution.targetTick,
      clock: projected.clock,
      clockAnchorAt: new Date(now),
      activeActionOperationId: null,
    },
    receipt,
    fact: {
      kind: 'settled',
      executionRevision: execution.revision + 1,
      tick: execution.targetTick,
      label: plan.label,
    },
    followUps: [
      {
        kind: 'prepare-action-consequence',
        operationId: execution.operationId,
      },
    ],
  };
}
