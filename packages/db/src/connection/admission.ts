export type DatabaseAdmissionErrorCategory =
  | 'saturated'
  | 'timeout'
  | 'cancelled'
  | 'closed';

const ADMISSION_MESSAGES: Record<DatabaseAdmissionErrorCategory, string> = {
  saturated: 'Database admission queue is saturated.',
  timeout: 'Database admission timeout while waiting for a connection.',
  cancelled: 'Database admission was cancelled.',
  closed: 'Database admission controller is closed.',
};

export class DatabaseAdmissionError extends Error {
  readonly category: DatabaseAdmissionErrorCategory;

  constructor(category: DatabaseAdmissionErrorCategory) {
    super(ADMISSION_MESSAGES[category]);
    this.name = 'DatabaseAdmissionError';
    this.category = category;
  }
}

export interface ReleasableClient {
  release(err?: Error | boolean): void;
}

export interface AdmissionClock {
  now: () => number;
  setTimeout: (fn: () => void, delayMs: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export interface AdmissionControllerOptions<
  C extends ReleasableClient = ReleasableClient,
> {
  maxActive: number;
  maxQueued: number;
  acquireTimeoutMs: number;
  connect: () => Promise<C>;
  clock?: AdmissionClock;
}

export interface AcquireOptions {
  timeoutMs: number;
  signal?: AbortSignal;
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
}

const MIN_TIMEOUT_MS = 1;
const MAX_TIMEOUT_MS = 300_000;

function defaultClock(): AdmissionClock {
  return {
    now: () => performance.now(),
    setTimeout: (fn, delayMs) => setTimeout(fn, delayMs),
    clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
}

function validateAcquireTimeout(timeoutMs: number): void {
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

type QueuedWaiter = {
  options: AcquireOptions;
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
  const clock = options.clock ?? defaultClock();
  const maxActive = options.maxActive;
  const maxQueued = options.maxQueued;
  const acquireTimeoutMs = options.acquireTimeoutMs;
  const connect = options.connect;

  let active = 0;
  let closed = false;
  const queue: QueuedWaiter[] = [];
  const pendingAcquisitions = new Set<PendingAcquisition>();

  const remainingMs = (totalDeadline: number) =>
    Math.max(0, totalDeadline - clock.now());

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

  const tryDrainQueue = () => {
    if (closed) {
      return;
    }
    while (queue.length > 0 && active < maxActive) {
      const waiter = queue.shift()!;
      clearWaiterTimers(waiter);
      void beginAcquire(waiter.options, waiter.run as never)
        .then(waiter.resolve, waiter.reject)
        .catch(waiter.reject);
    }
  };

  const releaseActivePermit = () => {
    active -= 1;
    tryDrainQueue();
  };

  const beginAcquire = <T>(
    acquireOptions: AcquireOptions,
    run: (
      client: C,
      remainingMs: () => number,
      discard: () => void,
    ) => Promise<T>,
  ): Promise<T> => {
    const totalDeadline = clock.now() + acquireOptions.timeoutMs;
    const acquisitionDeadline = Math.min(
      totalDeadline,
      clock.now() + acquireTimeoutMs,
    );

    active += 1;

    return new Promise<T>((resolve, reject) => {
      let admissionRejected = false;
      let admissionError: DatabaseAdmissionError | undefined;
      let acquisitionTimer: unknown;
      let abortListener: (() => void) | undefined;
      let callbackStarted = false;

      const pending: PendingAcquisition = {
        rejectAdmission: (error: DatabaseAdmissionError) => {
          if (admissionRejected || callbackStarted) {
            return;
          }
          admissionRejected = true;
          admissionError = error;
          clearGuards();
          reject(error);
        },
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

      const acquisitionDelayMs = Math.max(0, acquisitionDeadline - clock.now());
      acquisitionTimer = clock.setTimeout(() => {
        pending.rejectAdmission(new DatabaseAdmissionError('timeout'));
      }, acquisitionDelayMs);

      if (acquireOptions.signal) {
        if (acquireOptions.signal.aborted) {
          pending.rejectAdmission(new DatabaseAdmissionError('cancelled'));
        } else {
          abortListener = () => {
            pending.rejectAdmission(new DatabaseAdmissionError('cancelled'));
          };
          acquireOptions.signal.addEventListener('abort', abortListener, {
            once: true,
          });
        }
      }

      void connect()
        .then(async (client) => {
          clearGuards();

          if (admissionRejected) {
            try {
              client.release();
            } catch {
              // Admission failure is preserved when release also fails.
            }
            releaseActivePermit();
            return;
          }

          if (closed) {
            try {
              client.release();
            } catch {
              // Closed refusal still releases once.
            }
            releaseActivePermit();
            reject(new DatabaseAdmissionError('closed'));
            return;
          }

          callbackStarted = true;
          let discarded = false;
          let callbackSettled = false;
          let callbackResult: T;
          let callbackError: unknown;

          try {
            callbackResult = await run(
              client,
              () => remainingMs(totalDeadline),
              () => {
                discarded = true;
              },
            );
            callbackSettled = true;
          } catch (error) {
            callbackSettled = true;
            callbackError = error;
          }

          let releaseError: unknown;
          try {
            client.release(discarded ? true : undefined);
          } catch (error) {
            releaseError = error;
          }

          releaseActivePermit();

          if (!callbackSettled) {
            reject(new Error('Admission callback did not settle.'));
            return;
          }
          if (callbackError !== undefined) {
            reject(releaseError ?? callbackError);
            return;
          }
          if (releaseError !== undefined) {
            reject(releaseError);
            return;
          }
          resolve(callbackResult!);
        })
        .catch((error) => {
          clearGuards();
          releaseActivePermit();
          if (!admissionRejected) {
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

    if (acquireOptions.signal?.aborted) {
      throw new DatabaseAdmissionError('cancelled');
    }
    if (closed) {
      throw new DatabaseAdmissionError('closed');
    }

    const canGrantImmediately = active < maxActive && queue.length === 0;
    if (canGrantImmediately) {
      return beginAcquire(acquireOptions, run);
    }

    if (queue.length >= maxQueued) {
      throw new DatabaseAdmissionError('saturated');
    }

    const totalDeadline = clock.now() + acquireOptions.timeoutMs;

    return new Promise<T>((resolve, reject) => {
      const waiter: QueuedWaiter = {
        options: acquireOptions,
        run: run as QueuedWaiter['run'],
        resolve: resolve as (value: unknown) => void,
        reject,
      };

      const queueDelayMs = Math.max(0, totalDeadline - clock.now());
      waiter.queueTimer = clock.setTimeout(() => {
        removeQueuedWaiter(waiter);
        reject(new DatabaseAdmissionError('timeout'));
      }, queueDelayMs);

      if (acquireOptions.signal) {
        waiter.abortListener = () => {
          removeQueuedWaiter(waiter);
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

    while (queue.length > 0) {
      const waiter = queue.shift()!;
      rejectWaiter(waiter, new DatabaseAdmissionError('closed'));
    }

    for (const pending of pendingAcquisitions) {
      pending.rejectAdmission(new DatabaseAdmissionError('closed'));
    }
  };

  return { acquire, close };
}