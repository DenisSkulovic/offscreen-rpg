/**
 * SA10: pure Storyteller failure/retry gates. The database remains authority;
 * these helpers encode the same rules the recovery and memory runtimes enforce.
 */
import type { MemoryRoundInterruption } from './memory-exploration-controller';

export type MemoryProviderRoundStop =
  | 'review-held'
  | 'review-stopped'
  | 'authority-unavailable'
  | 'budget-unavailable'
  | 'usage-uncertain'
  | 'provider-refusal'
  | 'invalid-output'
  | 'provider-uncertain';

export class MemoryProviderRoundError extends Error {
  constructor(readonly code: MemoryProviderRoundStop) {
    super(`Memory provider round stopped: ${code}`);
  }
}

export type StorytellerGenerationLifecycleState =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'uncertain';

export type StorytellerAttemptLifecycleState =
  | 'reserved'
  | 'dispatched'
  | 'settled'
  | 'uncertain'
  | 'unsent';

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
  if (input.attemptState === 'uncertain' || input.attemptState === 'dispatched') {
    return { allowed: false, reason: 'uncertain-requires-operator' };
  }
  return { allowed: false, reason: 'settled-without-repair' };
}

/** Decision rounds stay before the reserved final-answer slot(s). */
export function memoryExplorationRoundCapability(input: {
  maxModelRounds: number;
  finalAnswerReserveRounds: number;
  round: number;
}): 'decision' | 'final' | 'exhausted' {
  if (
    !Number.isSafeInteger(input.round) ||
    input.round < 1 ||
    input.round > input.maxModelRounds
  ) {
    return 'exhausted';
  }
  const lastDecision =
    input.maxModelRounds - input.finalAnswerReserveRounds;
  if (input.round <= lastDecision) return 'decision';
  return 'final';
}

/**
 * Memory-round stop codes: uncertain keeps reservation; failed/held do not
 * invent a second automatic provider dispatch.
 */
export function classifyMemoryProviderRoundError(
  error: unknown,
): MemoryRoundInterruption | null {
  if (!(error instanceof MemoryProviderRoundError)) return null;
  if (error.code === 'review-held') {
    return { state: 'held', code: error.code };
  }
  if (error.code === 'usage-uncertain' || error.code === 'provider-uncertain') {
    return { state: 'uncertain', code: error.code };
  }
  return { state: 'failed', code: error.code };
}

/** Confirmed-unsent vs uncertain must never share the same next legal action. */
export function attemptChargeTruth(
  attemptState: StorytellerAttemptLifecycleState,
): {
  mayAutoRetrySameIntention: boolean;
  reservationHeld: boolean;
  providerChargeKnownZero: boolean;
} {
  switch (attemptState) {
    case 'unsent':
      return {
        mayAutoRetrySameIntention: true,
        reservationHeld: false,
        providerChargeKnownZero: true,
      };
    case 'uncertain':
    case 'dispatched':
      return {
        mayAutoRetrySameIntention: false,
        reservationHeld: true,
        providerChargeKnownZero: false,
      };
    case 'reserved':
      return {
        mayAutoRetrySameIntention: false,
        reservationHeld: true,
        providerChargeKnownZero: false,
      };
    case 'settled':
      return {
        mayAutoRetrySameIntention: false,
        reservationHeld: false,
        providerChargeKnownZero: false,
      };
  }
}
