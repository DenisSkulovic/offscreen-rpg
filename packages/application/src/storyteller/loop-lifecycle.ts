/**
 * SA10: pure Storyteller failure/retry gates. The database remains authority;
 * these helpers encode the same rules the recovery and memory runtimes enforce.
 */
import type { MemoryRoundInterruption } from './memory-exploration-controller';
import type { StorytellerAttemptLifecycleState } from '../stories/storyteller-retry-policy';

export type {
  StorytellerGenerationLifecycleState,
  StorytellerAttemptLifecycleState,
  StorytellerRetryDecision,
} from '../stories/storyteller-retry-policy';
export { evaluateStorytellerRetryGate } from '../stories/storyteller-retry-policy';

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
  const lastDecision = input.maxModelRounds - input.finalAnswerReserveRounds;
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
