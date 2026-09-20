import {
  immediateActionPlanSchema,
  resolveImmediateAction,
} from '@offscreen/game/immediate-actions';
import { characterSchema, storyFactsSchema } from '@offscreen/game/state';
import { realMsUntilTick } from '@offscreen/game/time';
import { projectCampaignClock } from './clock';
import type { CampaignRecord } from './persistence';
import type { CampaignFollowUpIntent } from './follow-up-intents';

type ActionExecutionTransitionInput = {
  operationId: string;
  plan: unknown;
  revision: number;
  targetTick: number;
  controllingTick?: number;
};

export type ActionExecutionTransition =
  | {
      state: 'waiting';
      projected: ReturnType<typeof projectCampaignClock>;
      remainingRealMs: number;
    }
  | {
      state: 'interrupted';
      campaign: CampaignRecord;
      fact: {
        kind: 'interrupted';
        executionRevision: number;
        tick: number;
        label: string;
      };
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
  execution: ActionExecutionTransitionInput;
  clockHeld: boolean;
  now: number;
  rollDie: () => number;
}): ActionExecutionTransition {
  const { state, execution, now } = args;
  const plan = immediateActionPlanSchema.parse(execution.plan);
  if (plan.resolution.kind === 'process' || plan.resolution.kind === 'resume') {
    throw new Error('Finite action execution contains an activity plan');
  }
  const nextBoundaryTick = Math.min(
    execution.targetTick,
    execution.controllingTick ?? execution.targetTick,
  );
  const projected = projectCampaignClock(
    state,
    now,
    { kind: 'accepted-action', operationId: execution.operationId },
    args.clockHeld,
    nextBoundaryTick,
  );
  if (
    execution.controllingTick !== undefined &&
    execution.controllingTick <= execution.targetTick &&
    projected.clock.elapsedTicks >= execution.controllingTick
  ) {
    return {
      state: 'interrupted',
      campaign: {
        ...state,
        tick: execution.controllingTick,
        clock: projected.clock,
        clockAnchorAt: new Date(now),
        activeActionOperationId: null,
      },
      fact: {
        kind: 'interrupted',
        executionRevision: execution.revision + 1,
        tick: execution.controllingTick,
        label: plan.label,
      },
    };
  }
  if (projected.clock.elapsedTicks < nextBoundaryTick) {
    return {
      state: 'waiting',
      projected,
      remainingRealMs: realMsUntilTick(
        projected.clock,
        nextBoundaryTick,
        projected.pace,
      ),
    };
  }

  const receipt = resolveImmediateAction(
    characterSchema.parse(state.character),
    storyFactsSchema.parse(state.storyFacts),
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
