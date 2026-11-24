import { CacheOverloadError } from './single-flight.js';

type QueueEntry<T> = {
  work: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  clearTimeout: () => void;
};

type ScheduledDeadline = {
  fireAt: number;
  fn: () => void;
  cancelled: boolean;
};

export type OriginBulkhead = {
  run<T>(work: () => Promise<T>): Promise<T>;
  /** When `clock` is injected at construction, advances simulated time and runs due queue timeouts. */
  advance?(ms: number): void;
};

export function createOriginBulkhead(options: {
  concurrency: number;
  queueLimit: number;
  queueTimeoutMs: number;
  clock?: () => number;
}): OriginBulkhead {
  const { concurrency, queueLimit, queueTimeoutMs } = options;
  const useManualClock = options.clock !== undefined;
  let simulatedNow = useManualClock ? options.clock!() : 0;
  const deadlines: ScheduledDeadline[] = [];

  let running = 0;
  const queue: QueueEntry<unknown>[] = [];

  function now(): number {
    return useManualClock ? simulatedNow : Date.now();
  }

  function scheduleQueueTimeout(onTimeout: () => void): () => void {
    if (!useManualClock) {
      const handle = setTimeout(onTimeout, queueTimeoutMs);
      return () => {
        clearTimeout(handle);
      };
    }
    const deadline: ScheduledDeadline = {
      fireAt: simulatedNow + queueTimeoutMs,
      fn: onTimeout,
      cancelled: false,
    };
    deadlines.push(deadline);
    return () => {
      deadline.cancelled = true;
    };
  }

  function flushDeadlines(): void {
    if (!useManualClock) {
      return;
    }
    for (const deadline of deadlines) {
      if (deadline.cancelled || deadline.fireAt > simulatedNow) {
        continue;
      }
      deadline.cancelled = true;
      deadline.fn();
    }
  }

  function removeFromQueue<T>(entry: QueueEntry<T>): void {
    const index = queue.indexOf(entry as QueueEntry<unknown>);
    if (index >= 0) {
      queue.splice(index, 1);
    }
  }

  async function startWork<T>(
    entry: QueueEntry<T>,
    work: () => Promise<T>,
  ): Promise<void> {
    running += 1;
    entry.clearTimeout();
    try {
      const value = await work();
      entry.resolve(value);
    } catch (error) {
      entry.reject(error);
    } finally {
      running -= 1;
      drainQueue();
    }
  }

  function drainQueue(): void {
    while (running < concurrency && queue.length > 0) {
      const entry = queue.shift() as QueueEntry<unknown>;
      void startWork(entry, entry.work);
    }
  }

  function run<T>(work: () => Promise<T>): Promise<T> {
    if (running < concurrency) {
      return new Promise<T>((resolve, reject) => {
        const entry: QueueEntry<T> = {
          work,
          resolve,
          reject,
          clearTimeout: () => {},
        };
        void startWork(entry, work);
      });
    }

    if (queue.length >= queueLimit) {
      throw new CacheOverloadError();
    }

    return new Promise<T>((resolve, reject) => {
      const entry: QueueEntry<T> = {
        work,
        resolve,
        reject,
        clearTimeout: () => {},
      };

      const clearTimeout = scheduleQueueTimeout(() => {
        removeFromQueue(entry);
        reject(new CacheOverloadError());
      });
      entry.clearTimeout = clearTimeout;

      queue.push(entry as QueueEntry<unknown>);
    });
  }

  function advance(ms: number): void {
    if (!useManualClock) {
      throw new Error('advance is only available when clock is injected');
    }
    simulatedNow += ms;
    flushDeadlines();
    drainQueue();
  }

  const bulkhead: OriginBulkhead = { run };
  if (useManualClock) {
    bulkhead.advance = advance;
  }
  return bulkhead;
}