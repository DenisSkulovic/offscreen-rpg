import type { MissionOutcomeV1 } from '../missions/contracts.js';

/** Replay-safe counts. No prompt, arguments, model text, or exception body. */
export interface MissionRunSummary {
  readonly workflowId: string;
  readonly status: MissionOutcomeV1['status'];
  readonly code?: string;
  readonly steps: number;
  readonly toolCalls: number;
}

export function summarizeMission(
  workflowId: string,
  outcome: MissionOutcomeV1,
): MissionRunSummary {
  return {
    workflowId,
    status: outcome.status,
    ...(outcome.status === 'completed' ? {} : { code: outcome.code }),
    steps: outcome.steps,
    toolCalls: outcome.toolCalls,
  };
}
