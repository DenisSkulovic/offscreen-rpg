export type RedisCircuitBreakerSnapshot = Readonly<{
  state: 'closed' | 'open' | 'half-open';
  consecutiveConnectivityFailures: number;
}>;

export type RedisCircuitAdmission = 'allow' | 'deny' | 'probe';

export type RedisCircuitBreaker = Readonly<{
  admit(): RedisCircuitAdmission;
  startProbe(): void;
  recordConnectivitySuccess(): void;
  recordConnectivityFailure(): void;
  snapshot(): RedisCircuitBreakerSnapshot;
}>;

export type RedisCircuitBreakerOptions = Readonly<{
  failureThreshold?: number;
  cooldownMs?: number;
  now?: () => number;
}>;

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_COOLDOWN_MS = 5_000;

export function createRedisCircuitBreaker(
  options: RedisCircuitBreakerOptions = {},
): RedisCircuitBreaker {
  const failureThreshold =
    options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
  const cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const now = options.now ?? Date.now;

  let state: 'closed' | 'open' | 'half-open' = 'closed';
  let consecutiveConnectivityFailures = 0;
  let openedAtMs = 0;
  let halfOpenProbeInFlight = false;

  function tryEnterHalfOpen(): void {
    if (state !== 'open') {
      return;
    }
    if (now() < openedAtMs + cooldownMs) {
      return;
    }
    state = 'half-open';
    halfOpenProbeInFlight = false;
  }

  return {
    admit() {
      if (state === 'closed') {
        return 'allow';
      }
      if (state === 'open') {
        tryEnterHalfOpen();
        if (state === 'open') {
          return 'deny';
        }
      }
      if (state === 'half-open') {
        if (halfOpenProbeInFlight) {
          return 'deny';
        }
        return 'probe';
      }
      return 'allow';
    },
    startProbe() {
      if (state === 'half-open') {
        halfOpenProbeInFlight = true;
      }
    },
    recordConnectivitySuccess() {
      consecutiveConnectivityFailures = 0;
      state = 'closed';
      halfOpenProbeInFlight = false;
    },
    recordConnectivityFailure() {
      if (state === 'half-open') {
        state = 'open';
        openedAtMs = now();
        halfOpenProbeInFlight = false;
        return;
      }
      consecutiveConnectivityFailures += 1;
      if (consecutiveConnectivityFailures >= failureThreshold) {
        state = 'open';
        openedAtMs = now();
      }
    },
    snapshot() {
      return {
        state,
        consecutiveConnectivityFailures,
      };
    },
  };
}
