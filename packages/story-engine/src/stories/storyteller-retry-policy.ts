/**
 * SA10: pure Storyteller failure/retry gates. The database remains authority;
 * these helpers encode the same rules the recovery and memory runtimes enforce.
 */

export type StorytellerGenerationLifecycleState =
  'pending' | 'running' | 'succeeded' | 'failed' | 'uncertain';

export type StorytellerAttemptLifecycleState =
  'reserved' | 'dispatched' | 'settled' | 'uncertain' | 'unsent';

export type StorytellerRetryDecision =
  | {
      allowed: true;
      reason: 'publication-blocked' | 'confirmed-unsent' | 'captured-repair';
    }
  | {
      allowed: false;
      reason:
        | 'idempotent-retry-already-recorded'
        | 'uncertain-requires-operator'
        | 'not-retryable-state'
        | 'missing-attempt'
        | 'settled-without-repair'
        | 'round-budget-exhausted'
        | 'pending-consequence-not-settled';
    };

/**
 * Exact retry gate used by `retryStoryteller` for provider generations.
 * Uncertain attempts never auto-replay; confirmed-unsent may; repair only when
 * a captured invalid candidate and open round budget remain.
 */
export function evaluateStorytellerRetryGate(input: {
  priorRetryRecorded: boolean;
  generationState: StorytellerGenerationLifecycleState;
  publicationState: string | null | undefined;
  executionMode: 'provider' | 'scripted';
  attemptState: StorytellerAttemptLifecycleState | null | undefined;
  failureCode: string | null;
  recipeVersion: string;
  hasRepairCandidate: boolean;
  hasRepairDiagnostic: boolean;
  operationState: string | null | undefined;
  dispatchedRounds: number | null | undefined;
  maxModelRounds: number | null | undefined;
  pendingConsequenceSettled?: boolean;
}): StorytellerRetryDecision {
  if (input.priorRetryRecorded) {
    return { allowed: false, reason: 'idempotent-retry-already-recorded' };
  }
  if (input.generationState === 'uncertain') {
    return { allowed: false, reason: 'uncertain-requires-operator' };
  }
  if (
    input.generationState === 'succeeded' &&
    input.publicationState === 'blocked'
  ) {
    return { allowed: true, reason: 'publication-blocked' };
  }
  if (input.generationState !== 'failed') {
    return { allowed: false, reason: 'not-retryable-state' };
  }
  if (input.pendingConsequenceSettled === false) {
    return { allowed: false, reason: 'pending-consequence-not-settled' };
  }
  if (input.executionMode !== 'provider') {
    return { allowed: true, reason: 'confirmed-unsent' };
  }
  if (!input.attemptState) {
    return { allowed: false, reason: 'missing-attempt' };
  }
  if (input.attemptState === 'unsent') {
    return { allowed: true, reason: 'confirmed-unsent' };
  }
  const repairEligible =
    input.attemptState === 'settled' &&
    input.failureCode === 'invalid_output' &&
    input.recipeVersion === 'repairable-turn.v1' &&
    input.hasRepairCandidate &&
    input.hasRepairDiagnostic &&
    input.operationState === 'open' &&
    typeof input.dispatchedRounds === 'number' &&
    typeof input.maxModelRounds === 'number' &&
    input.dispatchedRounds < input.maxModelRounds;
  if (repairEligible) {
    return { allowed: true, reason: 'captured-repair' };
  }
  if (
    input.attemptState === 'settled' &&
    input.failureCode === 'invalid_output' &&
    input.recipeVersion === 'repairable-turn.v1' &&
    (input.operationState !== 'open' ||
      (typeof input.dispatchedRounds === 'number' &&
        typeof input.maxModelRounds === 'number' &&
        input.dispatchedRounds >= input.maxModelRounds))
  ) {
    return { allowed: false, reason: 'round-budget-exhausted' };
  }
  if (
    input.attemptState === 'uncertain' ||
    input.attemptState === 'dispatched'
  ) {
    return { allowed: false, reason: 'uncertain-requires-operator' };
  }
  return { allowed: false, reason: 'settled-without-repair' };
}
