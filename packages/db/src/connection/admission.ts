import type { DatabaseRegisteredOperationName } from '../telemetry/types.js';
import type { AdmissionInstrumentation } from '../telemetry/runtime.js';
import type {
  DatabaseErrorCategory,
  DatabaseWorkload,
} from '../transaction/policy.js';
import {
  DatabaseAdmissionError,
  type DatabaseAdmissionErrorCategory,
} from './admission-error.js';
import {
  admissionExpired,
  defaultClock,
  type AdmissionClock,
  validateAcquireTimeout,
} from './admission-deadline.js';

export { DatabaseAdmissionError, type DatabaseAdmissionErrorCategory };
export type { AdmissionClock };

export interface ReleasableClient {
  release(err?: Error | boolean): void;
}

export interface AdmissionControllerOptions<
  C extends ReleasableClient = ReleasableClient,
> {
  maxActive: number;
  maxQueued: number;
  acquireTimeoutMs: number;
  connect: () => Promise<C>;
  clock?: AdmissionClock;
  instrumentation?: AdmissionInstrumentation;
}

export interface AcquireOptions {
  timeoutMs: number;
  signal?: AbortSignal;
  workload?: DatabaseWorkload;
  operationName?: DatabaseRegisteredOperationName;
}

export interface AdmissionController<C extends ReleasableClient> {
  acquire<T>(
    options: AcquireOptions,
    run: (
      client: C,
      remainingMs: () => number,
      discard: () => void,
    ) => Promise<T>,
  ): Promise<T>;
  close(): void;
  whenDrained(): Promise<void>;
}

function admissionCategoryForTelemetry(
  category: DatabaseAdmissionErrorCategory,
): DatabaseErrorCategory {
  return category;
}

function telemetryWorkload(options: AcquireOptions): DatabaseWorkload {
  return options.workload ?? 'interactive';
}

type AcquireSettlement = {
  startedAt: number;
  queuedAt?: number;
};

type QueuedWaiter = {
  options: AcquireOptions;
  totalDeadline: number;
  acquisitionDeadline: number;
  settlement: AcquireSettlement;
  run: (
    client: ReleasableClient,
    remainingMs: () => number,
    discard: () => void,
  ) => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  queueTimer?: unknown;
  abortListener?: () => void;
};

type PendingAcquisition = {
  rejectAdmission: (error: DatabaseAdmissionError) => void;
  clearGuards: () => void;
};

export function createAdmissionController<C extends ReleasableClient>(
  options: AdmissionControllerOptions<C>,
): AdmissionController<C> {
  const instrumentation = options.instrumentation;
  const clock = options.clock ?? defaultClock();
  const maxActive = options.maxActive;
  const maxQueued = options.maxQueued;
  const acquireTimeoutMs = options.acquireTimeoutMs;
  const connect = options.connect;

  let active = 0;
  let closed = false;
  const queue: QueuedWaiter[] = [];
  const pendingAcquisitions = new Set<PendingAcquisition>();

  let drainPromise: Promise<void> | undefined;
  let resolveDrain: (() => void) | undefined;

  instrumentation?.registerAdmissionGauges(() => ({
    active,
    queued: queue.length,
  }));

  const emitAcquire = (
    acquireOptions: AcquireOptions,
    settlement: AcquireSettlement,
    outcome: 'ok' | 'error',
    category?: DatabaseErrorCategory,
  ): void => {
    if (!instrumentation) {
      return;
    }
    const now = clock.now();
    const durationMs = Math.max(0, Math.floor(now - settlement.startedAt));
    const queueDurationMs =
      settlement.queuedAt === undefined
        ? undefined
        : Math.max(0, Math.floor(now - settlement.queuedAt));
    instrumentation.emit({
      operation: 'acquire',
      outcome,
      workload: telemetryWorkload(acquireOptions),
      durationMs,
      ...(acquireOptions.operationName
        ? { operationName: acquireOptions.operationName }
        : {}),
      ...(queueDurationMs === undefined ? {} : { queueDurationMs }),
      ...(category === undefined ? {} : { category }),
    });
  };

  const remainingMs = (totalDeadline: number) =>
    Math.max(0, totalDeadline - clock.now());

  const maybeResolveDrain = () => {
    if (!closed || active !== 0) {
      return;
    }
    if (resolveDrain) {
      resolveDrain();
      resolveDrain = undefined;
    }
  };

  const ensureDrainPromise = (): Promise<void> => {
    if (drainPromise) {
      return drainPromise;
    }
    if (active === 0) {
      drainPromise = Promise.resolve();
      return drainPromise;
    }
    drainPromise = new Promise<void>((resolve) => {
      resolveDrain = resolve;
    });
    return drainPromise;
  };

  const clearWaiterTimers = (waiter: QueuedWaiter) => {
    if (waiter.queueTimer !== undefined) {
      clock.clearTimeout(waiter.queueTimer);
      delete waiter.queueTimer;
    }
    if (waiter.abortListener && waiter.options.signal) {
      waiter.options.signal.removeEventListener('abort', waiter.abortListener);
      delete waiter.abortListener;
    }
  };

  const rejectWaiter = (
    waiter: QueuedWaiter,
    error: DatabaseAdmissionError,
  ) => {
    clearWaiterTimers(waiter);
    waiter.reject(error);
  };

  const removeQueuedWaiter = (waiter: QueuedWaiter) => {
    const index = queue.indexOf(waiter);
    if (index >= 0) {
      queue.splice(index, 1);
    }
    clearWaiterTimers(waiter);
  };

  const queueWaitDeadline = (
    totalDeadline: number,
    acquisitionDeadline: number,
  ) => Math.min(totalDeadline, acquisitionDeadline);

  const tryDrainQueue = () => {
    if (closed) {
      return;
    }
    while (queue.length > 0 && active < maxActive) {
      const waiter = queue.shift();
      if (waiter === undefined) {
        break;
      }
      clearWaiterTimers(waiter);
      void beginAcquire(
        waiter.options,
        waiter.totalDeadline,
        waiter.acquisitionDeadline,
        waiter.settlement,
        waiter.run as never,
      )
        .then(waiter.resolve, waiter.reject)
        .catch(waiter.reject);
    }
  };

  const releaseActivePermit = () => {
    active -= 1;
    maybeResolveDrain();
    tryDrainQueue();
  };

  const beginAcquire = <T>(
    acquireOptions: AcquireOptions,
    totalDeadline: number,
    acquisitionDeadline: number,
    settlement: AcquireSettlement,
    run: (
      client: C,
      remainingMs: () => number,
      discard: () => void,
    ) => Promise<T>,
  ): Promise<T> => {
    // Reserve: consume one active permit before connect or callback work begins.
    active += 1;

    return new Promise<T>((resolve, reject) => {
      let admissionRejected = false;
      let admissionError: DatabaseAdmissionError | undefined;
      let acquisitionTimer: unknown;
      let abortListener: (() => void) | undefined;
      let callbackStarted = false;

      const failAdmission = (error: DatabaseAdmissionError) => {
        if (admissionRejected || callbackStarted) {
          return;
        }
        admissionRejected = true;
        admissionError = error;
        clearGuards();
        emitAcquire(
          acquireOptions,
          settlement,
          'error',
          admissionCategoryForTelemetry(error.category),
        );
        reject(error);
      };

      const pending: PendingAcquisition = {
        rejectAdmission: failAdmission,
        clearGuards: () => {},
      };

      const clearGuards = () => {
        if (acquisitionTimer !== undefined) {
          clock.clearTimeout(acquisitionTimer);
          acquisitionTimer = undefined;
        }
        if (abortListener && acquireOptions.signal) {
          acquireOptions.signal.removeEventListener('abort', abortListener);
          abortListener = undefined;
        }
        pendingAcquisitions.delete(pending);
      };

      pending.clearGuards = clearGuards;
      pendingAcquisitions.add(pending);

      // Pre-connect guards: caller refusal via timeout/abort before `connect()` settles.
      const scheduleAcquisitionTimeout = () => {
        const now = clock.now();
        if (admissionExpired(now, totalDeadline, acquisitionDeadline)) {
          failAdmission(new DatabaseAdmissionError('timeout'));
          return;
        }
        const acquisitionDelayMs = Math.max(0, acquisitionDeadline - now);
        acquisitionTimer = clock.setTimeout(() => {
          failAdmission(new DatabaseAdmissionError('timeout'));
        }, acquisitionDelayMs);
      };

      scheduleAcquisitionTimeout();

      if (acquireOptions.signal) {
        if (acquireOptions.signal.aborted) {
          failAdmission(new DatabaseAdmissionError('cancelled'));
        } else {
          abortListener = () => {
            failAdmission(new DatabaseAdmissionError('cancelled'));
          };
          acquireOptions.signal.addEventListener('abort', abortListener, {
            once: true,
          });
        }
      }

      // Caller refusal while reserved but connect has not started yet.
      if (admissionRejected) {
        releaseActivePermit();
        return;
      }

      if (admissionExpired(clock.now(), totalDeadline, acquisitionDeadline)) {
        clearGuards();
        releaseActivePermit();
        emitAcquire(acquireOptions, settlement, 'error', 'timeout');
        reject(new DatabaseAdmissionError('timeout'));
        return;
      }

      // Actual connect settlement: pool hands back a physical client (or rejects).
      let connectPromise: Promise<C>;
      try {
        connectPromise = connect();
      } catch (error) {
        clearGuards();
        releaseActivePermit();
        if (!admissionRejected) {
          emitAcquire(acquireOptions, settlement, 'error', 'unavailable');
          reject(error);
        }
        return;
      }

      void connectPromise
        .then(async (client) => {
          clearGuards();

          const now = clock.now();
          if (admissionRejected || admissionError) {
            try {
              client.release();
            } catch {
              // Admission failure is preserved when release also fails.
            }
            releaseActivePermit();
            return;
          }

          // Caller refusal after physical connect: release client; distinct from connect failure.
          if (
            admissionExpired(now, totalDeadline, acquisitionDeadline) ||
            (acquireOptions.signal?.aborted ?? false)
          ) {
            try {
              client.release();
            } catch {
              // Timeout refusal still releases once.
            }
            releaseActivePermit();
            const lateCategory = acquireOptions.signal?.aborted
              ? 'cancelled'
              : 'timeout';
            emitAcquire(acquireOptions, settlement, 'error', lateCategory);
            reject(
              acquireOptions.signal?.aborted
                ? new DatabaseAdmissionError('cancelled')
                : new DatabaseAdmissionError('timeout'),
            );
            return;
          }

          if (closed) {
            try {
              client.release();
            } catch {
              // Closed refusal still releases once.
            }
            releaseActivePermit();
            emitAcquire(acquireOptions, settlement, 'error', 'closed');
            reject(new DatabaseAdmissionError('closed'));
            return;
          }

          // Callback lease: caller runs while the admission slot stays reserved.
          callbackStarted = true;
          emitAcquire(acquireOptions, settlement, 'ok');
          let discarded = false;
          let callbackSucceeded = false;
          let callbackFailed = false;
          let callbackResult: T | undefined;
          let callbackError: unknown;

          try {
            callbackResult = await run(
              client,
              () => remainingMs(totalDeadline),
              () => {
                discarded = true;
              },
            );
            callbackSucceeded = true;
          } catch (error) {
            callbackFailed = true;
            callbackError = error;
          }

          if (callbackSucceeded && clock.now() >= totalDeadline) {
            callbackSucceeded = false;
            callbackFailed = true;
            callbackError = new DatabaseAdmissionError('timeout');
          }

          // Release/drain: return client to pool and free the active permit for the queue.
          try {
            client.release(discarded ? true : undefined);
          } catch (releaseError) {
            if (callbackSucceeded && instrumentation) {
              instrumentation.emit({
                operation: 'connection',
                outcome: 'error',
                workload: telemetryWorkload(acquireOptions),
                category: 'application',
                ...(acquireOptions.operationName
                  ? { operationName: acquireOptions.operationName }
                  : {}),
              });
            }
            void releaseError;
          }

          releaseActivePermit();

          if (callbackFailed) {
            // Callback rejection (including `throw undefined`) wins over release failure.
            reject(callbackError);
            return;
          }
          if (callbackSucceeded) {
            resolve(callbackResult as T);
            return;
          }
          reject(new Error('Admission callback did not settle.'));
        })
        .catch((error) => {
          clearGuards();
          releaseActivePermit();
          if (!admissionRejected) {
            const category =
              error instanceof DatabaseAdmissionError
                ? admissionCategoryForTelemetry(error.category)
                : 'unavailable';
            emitAcquire(acquireOptions, settlement, 'error', category);
            reject(error);
          }
        });
    });
  };

  const acquire = async <T>(
    acquireOptions: AcquireOptions,
    run: (
      client: C,
      remainingMs: () => number,
      discard: () => void,
    ) => Promise<T>,
  ): Promise<T> => {
    validateAcquireTimeout(acquireOptions.timeoutMs);

    const settlement: AcquireSettlement = { startedAt: clock.now() };

    // Pre-connect guards: immediate caller refusal without reserving queue capacity.
    if (acquireOptions.signal?.aborted) {
      emitAcquire(acquireOptions, settlement, 'error', 'cancelled');
      throw new DatabaseAdmissionError('cancelled');
    }
    if (closed) {
      emitAcquire(acquireOptions, settlement, 'error', 'closed');
      throw new DatabaseAdmissionError('closed');
    }

    const totalDeadline = clock.now() + acquireOptions.timeoutMs;
    const acquisitionDeadline = Math.min(
      totalDeadline,
      clock.now() + acquireTimeoutMs,
    );

    // Reserve: grant an active permit immediately or enqueue for later drain.
    const canGrantImmediately = active < maxActive && queue.length === 0;
    if (canGrantImmediately) {
      return beginAcquire(
        acquireOptions,
        totalDeadline,
        acquisitionDeadline,
        settlement,
        run,
      );
    }

    // Caller refusal: queue saturation without entering the wait list.
    if (queue.length >= maxQueued) {
      emitAcquire(acquireOptions, settlement, 'error', 'saturated');
      throw new DatabaseAdmissionError('saturated');
    }

    // Queued wait: timers/abort refuse before `beginAcquire` reserves a permit on drain.
    return new Promise<T>((resolve, reject) => {
      const queuedSettlement: AcquireSettlement = {
        startedAt: settlement.startedAt,
        queuedAt: clock.now(),
      };
      const waiter: QueuedWaiter = {
        options: acquireOptions,
        totalDeadline,
        acquisitionDeadline,
        settlement: queuedSettlement,
        run: run as QueuedWaiter['run'],
        resolve: resolve as (value: unknown) => void,
        reject,
      };

      const scheduleQueueTimeout = () => {
        const now = clock.now();
        const queueDeadline = queueWaitDeadline(
          totalDeadline,
          acquisitionDeadline,
        );
        if (now >= queueDeadline) {
          removeQueuedWaiter(waiter);
          emitAcquire(acquireOptions, queuedSettlement, 'error', 'timeout');
          reject(new DatabaseAdmissionError('timeout'));
          return;
        }
        const queueDelayMs = Math.max(0, queueDeadline - now);
        waiter.queueTimer = clock.setTimeout(() => {
          removeQueuedWaiter(waiter);
          emitAcquire(acquireOptions, queuedSettlement, 'error', 'timeout');
          reject(new DatabaseAdmissionError('timeout'));
        }, queueDelayMs);
      };

      scheduleQueueTimeout();

      if (acquireOptions.signal) {
        waiter.abortListener = () => {
          removeQueuedWaiter(waiter);
          emitAcquire(acquireOptions, queuedSettlement, 'error', 'cancelled');
          reject(new DatabaseAdmissionError('cancelled'));
        };
        acquireOptions.signal.addEventListener('abort', waiter.abortListener, {
          once: true,
        });
      }

      queue.push(waiter);
    });
  };

  const close = () => {
    if (closed) {
      return;
    }
    closed = true;
    ensureDrainPromise();

    while (queue.length > 0) {
      const waiter = queue.shift();
      if (waiter === undefined) {
        break;
      }
      rejectWaiter(waiter, new DatabaseAdmissionError('closed'));
    }

    for (const pending of pendingAcquisitions) {
      pending.rejectAdmission(new DatabaseAdmissionError('closed'));
    }

    maybeResolveDrain();
  };

  const whenDrained = (): Promise<void> => {
    if (!closed) {
      return Promise.resolve();
    }
    return ensureDrainPromise();
  };

  return { acquire, close, whenDrained };
}
