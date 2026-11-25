import {
  createRedisCircuitBreaker,
  type RedisCircuitAdmission,
  type RedisCircuitBreaker,
} from './redis-circuit-breaker.js';
import type { RedisConnection } from './redis-connection.js';

const DEFAULT_OPERATION_TIMEOUT_MS = 100;
const DEFAULT_MAX_OUTSTANDING_COMMANDS = 256;

export type RedisCommandBypassReason =
  'unavailable' | 'circuit-open' | 'saturated' | 'timeout';

export type RedisCommandResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'bypass'; reason: RedisCommandBypassReason };

export type RedisCommandExecutor = Readonly<{
  execute<T>(
    dispatch: (signal: AbortSignal) => Promise<T>,
  ): Promise<RedisCommandResult<T>>;
  outstandingCount(): number;
}>;

export type RedisCommandExecutorOptions = Readonly<{
  connection: RedisConnection;
  breaker?: RedisCircuitBreaker;
  operationTimeoutMs?: number;
  maxOutstandingCommands?: number;
}>;

function createOperationTimeout(timeoutMs: number): {
  signal: AbortSignal;
  dispose: () => void;
  onTimeout: (handler: () => void) => void;
} {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timeoutHandler: (() => void) | undefined;

  timer = setTimeout(() => {
    controller.abort();
    timeoutHandler?.();
  }, timeoutMs);
  timer.unref?.();

  return {
    signal: controller.signal,
    dispose() {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    },
    onTimeout(handler) {
      timeoutHandler = handler;
    },
  };
}

function preflightBypass(
  connection: RedisConnection,
  admission: RedisCircuitAdmission,
  outstanding: number,
  maxOutstandingCommands: number,
): RedisCommandBypassReason | null {
  if (!connection.admitsTraffic()) {
    return 'unavailable';
  }
  if (admission === 'deny') {
    return 'circuit-open';
  }
  if (outstanding >= maxOutstandingCommands) {
    return 'saturated';
  }
  return null;
}

export function createRedisCommandExecutor(
  options: RedisCommandExecutorOptions,
): RedisCommandExecutor {
  const {
    connection,
    breaker = createRedisCircuitBreaker(),
    operationTimeoutMs = DEFAULT_OPERATION_TIMEOUT_MS,
    maxOutstandingCommands = DEFAULT_MAX_OUTSTANDING_COMMANDS,
  } = options;

  let outstanding = 0;

  async function execute<T>(
    dispatch: (signal: AbortSignal) => Promise<T>,
  ): Promise<RedisCommandResult<T>> {
    const admission = breaker.admit();
    const blocked = preflightBypass(
      connection,
      admission,
      outstanding,
      maxOutstandingCommands,
    );
    if (blocked !== null) {
      return { kind: 'bypass', reason: blocked };
    }
    if (admission === 'probe') {
      breaker.startProbe();
    }

    outstanding += 1;
    let breakerSettled = false;
    const timeoutCtl = createOperationTimeout(operationTimeoutMs);
    let timedOut = false;

    const settleConnectivity = (success: boolean): void => {
      if (breakerSettled) {
        return;
      }
      if (success) {
        breaker.recordConnectivitySuccess();
      } else {
        breaker.recordConnectivityFailure();
      }
      breakerSettled = true;
    };

    const command = (async (): Promise<RedisCommandResult<T>> => {
      try {
        let sdkPromise: Promise<T>;
        try {
          sdkPromise = dispatch(timeoutCtl.signal);
        } catch {
          settleConnectivity(false);
          return { kind: 'bypass', reason: 'unavailable' };
        }

        const value = await sdkPromise;
        settleConnectivity(true);
        if (timedOut) {
          return { kind: 'bypass', reason: 'timeout' };
        }
        return { kind: 'ok', value };
      } catch {
        settleConnectivity(false);
        if (timedOut) {
          return { kind: 'bypass', reason: 'timeout' };
        }
        return { kind: 'bypass', reason: 'unavailable' };
      } finally {
        timeoutCtl.dispose();
        outstanding -= 1;
      }
    })();

    const timeout = new Promise<RedisCommandResult<T>>((resolve) => {
      timeoutCtl.onTimeout(() => {
        timedOut = true;
        settleConnectivity(false);
        resolve({ kind: 'bypass', reason: 'timeout' });
      });
    });

    return Promise.race([command, timeout]);
  }

  return {
    execute,
    outstandingCount() {
      return outstanding;
    },
  };
}
