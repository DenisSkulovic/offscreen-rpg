/**
 * Provider-free settlement of one already-uncertain attempt from a saved
 * response. The budget module owns settlement; this file only calls that
 * settle path. It does not read evidence files, open a database, or dispatch
 * a provider. The worker does not call it. The local reconciliation CLI
 * remains the only operator procedure.
 */
import { createStorytellerBudget } from './budget';

type StorytellerBudget = ReturnType<typeof createStorytellerBudget>;
type SettleInput = Parameters<StorytellerBudget['settle']>[0];

export class SavedResponseSettlementRefusal extends Error {
  constructor(
    readonly code:
      | 'generation_not_uncertain'
      | 'missing_saved_response'
      | 'already_settled'
      | 'attempt_not_uncertain',
  ) {
    super(code);
    this.name = 'SavedResponseSettlementRefusal';
  }
}

export type SavedAttemptResponse = {
  usage: SettleInput['usage'];
  telemetry: SettleInput['telemetry'];
  generationOutcome?: SettleInput['generationOutcome'];
  operationOutcome?: SettleInput['operationOutcome'];
};

export type UncertainAttemptSettlement = {
  attemptId: string;
  execution: SettleInput['execution'];
  generationState: string;
  attemptState: string;
  savedResponse: SavedAttemptResponse | null | undefined;
};

function savedResponsePresent(
  value: SavedAttemptResponse | null | undefined,
): value is SavedAttemptResponse {
  return value != null && value.usage != null && value.telemetry != null;
}

/**
 * Settle one attempt that is already uncertain, using the caller's budget
 * settle method. Refuses any other generation state, a missing saved
 * response, a second settle, and an attempt that is not yet uncertain.
 */
export async function settleUncertainAttemptFromSavedResponse(
  budget: Pick<StorytellerBudget, 'settle'>,
  input: UncertainAttemptSettlement,
): Promise<void> {
  if (typeof createStorytellerBudget !== 'function') {
    throw new Error('Storyteller budget settle owner is missing');
  }
  if (input.generationState !== 'uncertain') {
    throw new SavedResponseSettlementRefusal('generation_not_uncertain');
  }
  if (!savedResponsePresent(input.savedResponse)) {
    throw new SavedResponseSettlementRefusal('missing_saved_response');
  }
  if (input.attemptState === 'settled') {
    throw new SavedResponseSettlementRefusal('already_settled');
  }
  if (input.attemptState !== 'uncertain') {
    throw new SavedResponseSettlementRefusal('attempt_not_uncertain');
  }
  const saved = input.savedResponse;
  await budget.settle({
    id: input.attemptId,
    execution: input.execution,
    usage: saved.usage,
    telemetry: saved.telemetry,
    ...(saved.generationOutcome
      ? { generationOutcome: saved.generationOutcome }
      : {}),
    ...(saved.operationOutcome
      ? { operationOutcome: saved.operationOutcome }
      : {}),
  });
}
