export interface AdmissionClock {
  now: () => number;
  setTimeout: (fn: () => void, delayMs: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export const MIN_TIMEOUT_MS = 1;
export const MAX_TIMEOUT_MS = 300_000;

export function defaultClock(): AdmissionClock {
  return {
    now: () => performance.now(),
    setTimeout: (fn, delayMs) => setTimeout(fn, delayMs),
    clearTimeout: (handle) =>
      clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
}

export function validateAcquireTimeout(timeoutMs: number): void {
  if (
    !Number.isFinite(timeoutMs) ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs < MIN_TIMEOUT_MS ||
    timeoutMs > MAX_TIMEOUT_MS
  ) {
    throw new RangeError(
      `Admission timeout must be a positive integer between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS}.`,
    );
  }
}

/** True when either the caller's total budget or the connect budget has elapsed. */
export function admissionExpired(
  now: number,
  totalDeadline: number,
  acquisitionDeadline: number,
): boolean {
  return now >= totalDeadline || now >= acquisitionDeadline;
}
