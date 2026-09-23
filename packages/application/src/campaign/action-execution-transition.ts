import {
  immediateActionPlanSchema,
  resolveImmediateAction,
} from '@offscreen/game/immediate-actions';
import { characterSchema, storyFactsSchema } from '@offscreen/game/state';
import { realMsUntilGameSecond } from '@offscreen/game/time';
import { projectCampaignClock } from './clock';
import type { CampaignRecord } from './persistence';
import type { CampaignFollowUpIntent } from './follow-up-intents';
import {
  actionResolutionProjectedDigest,
  actionResolutionSourceDigest,
  pendingImmediateActionResolutionSchema,
} from './action-overlap';

type ActionExecutionTransitionInput = {
  operationId: string;
  plan: unknown;
  revision: number;
  startGameSecond: number;
  targetGameSecond: number;
  controllingGameSecond?: number;
  pendingResolution?: unknown;
  preparationGenerationId?: string | null;
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
        gameSecond: number;
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
        gameSecond: number;
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
  const nextBoundaryGameSecond = Math.min(
    execution.targetGameSecond,
    execution.controllingGameSecond ?? execution.targetGameSecond,
  );
  const projected = projectCampaignClock(
    state,
    now,
    { kind: 'accepted-action', operationId: execution.operationId },
    args.clockHeld,
    nextBoundaryGameSecond,
  );
  if (
    execution.controllingGameSecond !== undefined &&
    execution.controllingGameSecond <= execution.targetGameSecond &&
    projected.clock.elapsedGameSeconds >= execution.controllingGameSecond
  ) {
    return {
      state: 'interrupted',
      campaign: {
        ...state,
        gameSecond: execution.controllingGameSecond,
        clock: projected.clock,
        clockAnchorAt: new Date(now),
        activeActionOperationId: null,
      },
      fact: {
        kind: 'interrupted',
        executionRevision: execution.revision + 1,
        gameSecond: execution.controllingGameSecond,
        label: plan.label,
      },
    };
  }
  if (projected.clock.elapsedGameSeconds < nextBoundaryGameSecond) {
    return {
      state: 'waiting',
      projected,
      remainingRealMs: realMsUntilGameSecond(
        projected.clock,
        nextBoundaryGameSecond,
        projected.pace,
      ),
    };
  }

  const pending = execution.pendingResolution
    ? pendingImmediateActionResolutionSchema.parse(execution.pendingResolution)
    : null;
  if (
    pending &&
    pending.sourceStateDigest !==
      actionResolutionSourceDigest({
        character: state.character,
        storyFacts: state.storyFacts,
        startGameSecond: execution.startGameSecond,
      })
  ) {
    throw new Error('Pending action resolution source fence changed');
  }
  if (
    pending &&
    pending.projectedStateDigest !==
      actionResolutionProjectedDigest({
        resolution: pending.resolution,
        targetGameSecond: execution.targetGameSecond,
      })
  ) {
    throw new Error('Pending action resolution projection is invalid');
  }
  const receipt =
    pending?.resolution ??
    resolveImmediateAction(
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
      gameSecond: execution.targetGameSecond,
      clock: projected.clock,
      clockAnchorAt: new Date(now),
      activeActionOperationId: null,
    },
    receipt,
    fact: {
      kind: 'settled',
      executionRevision: execution.revision + 1,
      gameSecond: execution.targetGameSecond,
      label: plan.label,
    },
    followUps: execution.preparationGenerationId
      ? [
          {
            kind: 'publish-prepared-action-consequence' as const,
            operationId: execution.operationId,
            generationId: execution.preparationGenerationId,
          },
        ]
      : [
          {
            kind: 'prepare-action-consequence' as const,
            operationId: execution.operationId,
          },
        ],
  };
}
