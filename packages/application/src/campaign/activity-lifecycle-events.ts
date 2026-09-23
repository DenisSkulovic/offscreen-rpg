import type { Transaction } from '../outbox/index';
import {
  recordActivityEvent,
  type ActivityEventKind,
} from './persistence';

/** Maps a terminal or transitional activity state to its player-visible ledger kind. */
export function transitionEventKind(state: string): ActivityEventKind | null {
  switch (state) {
    case 'blocked':
      return 'blocked';
    case 'encounter':
      return 'interrupted';
    case 'complete':
      return 'completed';
    case 'abandoned':
    case 'failed':
    case 'expired':
    case 'invalidated':
      return state;
    default:
      return null;
  }
}

type ActivityEventArgs = {
  storyId: string;
  activityId: string;
  activityRevision: number;
  tick: number;
  kind: ActivityEventKind;
  causeKey: string;
  label: string;
  summary: string;
};

export async function recordActivityLifecycleEvent(
  tx: Transaction,
  args: ActivityEventArgs,
) {
  await recordActivityEvent(tx, args);
}

/** Records state transition and completion-pending events after a boundary settles. */
export async function recordBoundarySettlementEvents(
  tx: Transaction,
  args: {
    storyId: string;
    activityId: string;
    activityRevision: number;
    tick: number;
    previousState: string;
    nextState: string;
    boundaryCause: string;
    label: string;
    transitionSummary: string;
    completionPending: boolean;
    wasCompletionPending: boolean;
  },
) {
  const transitionKind =
    args.previousState === args.nextState
      ? null
      : transitionEventKind(args.nextState);
  if (transitionKind) {
    await recordActivityEvent(tx, {
      storyId: args.storyId,
      activityId: args.activityId,
      activityRevision: args.activityRevision,
      tick: args.tick,
      kind: transitionKind,
      causeKey: args.boundaryCause,
      label: args.label,
      summary: args.transitionSummary,
    });
  }
  if (!args.wasCompletionPending && args.completionPending) {
    await recordActivityEvent(tx, {
      storyId: args.storyId,
      activityId: args.activityId,
      activityRevision: args.activityRevision,
      tick: args.tick,
      kind: 'completion-pending',
      causeKey: args.boundaryCause,
      label: args.label,
      summary: `${args.label} reached its goal, but completion is waiting for the interruption or blocker to be resolved.`,
    });
  }
}
