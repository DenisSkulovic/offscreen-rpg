/** Fixture policy for generated intervals. Not campaign pace or player-facing duration design. */
export const scriptedGeneratedIntervalRealMs = 2000;

export function scriptedRealDurationMs(gameDurationMs: number) {
  if (!Number.isInteger(gameDurationMs) || gameDurationMs < 1) {
    throw new Error('Generated interval needs a positive fictional duration');
  }
  return scriptedGeneratedIntervalRealMs;
}
