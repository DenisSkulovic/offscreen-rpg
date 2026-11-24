export class CacheOverloadError extends Error {
  override readonly name = 'CacheOverloadError';

  constructor(message = 'Cache overload') {
    super(message);
  }
}

type WaiterResult<T> = { value: T; coalesced: boolean };

type WaiterEntry<T> = {
  coalesced: boolean;
  detached: boolean;
  resolve: (result: WaiterResult<T>) => void;
  reject: (error: unknown) => void;
  abortCleanup?: () => void;
};

type InFlightGeneration<T> = {
  key: string;
  generation: number;
  waiters: WaiterEntry<T>[];
};

export type SingleFlight<T> = {
  run(
    key: string,
    load: (canPublish: () => boolean) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<WaiterResult<T>>;
  invalidate(key: string): void;
  clear(): void;
};

function abortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) {
    return signal.reason;
  }
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}

function detachWaiter<T>(entry: WaiterEntry<T>, signal: AbortSignal): void {
  if (entry.detached) {
    return;
  }
  entry.detached = true;
  entry.abortCleanup?.();
  entry.reject(abortError(signal));
}

function attachWaiter<T>(
  generation: InFlightGeneration<T>,
  coalesced: boolean,
  signal?: AbortSignal,
): Promise<WaiterResult<T>> {
  return new Promise<WaiterResult<T>>((resolve, reject) => {
    const entry: WaiterEntry<T> = {
      coalesced,
      detached: false,
      resolve,
      reject,
    };

    if (signal) {
      if (signal.aborted) {
        detachWaiter(entry, signal);
        return;
      }
      const onAbort = () => {
        detachWaiter(entry, signal);
      };
      signal.addEventListener('abort', onAbort, { once: true });
      entry.abortCleanup = () => {
        signal.removeEventListener('abort', onAbort);
      };
    }

    generation.waiters.push(entry);
  });
}

function settleGeneration<T>(
  generation: InFlightGeneration<T>,
  outcome:
    | { kind: 'fulfilled'; value: T }
    | { kind: 'rejected'; error: unknown },
): void {
  for (const waiter of generation.waiters) {
    if (waiter.detached) {
      continue;
    }
    waiter.abortCleanup?.();
    if (outcome.kind === 'fulfilled') {
      waiter.resolve({ value: outcome.value, coalesced: waiter.coalesced });
    } else {
      waiter.reject(outcome.error);
    }
  }
}

export function createSingleFlight<T>(options: {
  maxActiveKeys: number;
  maxWaitersPerKey: number;
}): SingleFlight<T> {
  const { maxActiveKeys, maxWaitersPerKey } = options;
  const mappedByKey = new Map<string, InFlightGeneration<T>>();
  const inFlightCountByKey = new Map<string, number>();
  const generationCounterByKey = new Map<string, number>();

  function countDistinctInFlightKeys(): number {
    return inFlightCountByKey.size;
  }

  function beginInFlightGeneration(key: string): void {
    const current = inFlightCountByKey.get(key) ?? 0;
    if (current === 0 && countDistinctInFlightKeys() >= maxActiveKeys) {
      throw new CacheOverloadError();
    }
    inFlightCountByKey.set(key, current + 1);
  }

  function endInFlightGeneration(key: string, generation: InFlightGeneration<T>): void {
    if (mappedByKey.get(key) === generation) {
      mappedByKey.delete(key);
    }
    const next = (inFlightCountByKey.get(key) ?? 1) - 1;
    if (next <= 0) {
      inFlightCountByKey.delete(key);
    } else {
      inFlightCountByKey.set(key, next);
    }
  }

  function nextGenerationNumber(key: string): number {
    const next = (generationCounterByKey.get(key) ?? 0) + 1;
    generationCounterByKey.set(key, next);
    return next;
  }

  async function executeLoader(
    generation: InFlightGeneration<T>,
    load: (canPublish: () => boolean) => Promise<T>,
  ): Promise<void> {
    const canPublish = () => mappedByKey.get(generation.key) === generation;
    try {
      const value = await load(canPublish);
      settleGeneration(generation, { kind: 'fulfilled', value });
    } catch (error) {
      settleGeneration(generation, { kind: 'rejected', error });
    } finally {
      endInFlightGeneration(generation.key, generation);
    }
  }

  function run(
    key: string,
    load: (canPublish: () => boolean) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<WaiterResult<T>> {
    const mapped = mappedByKey.get(key);
    if (mapped) {
      const attachedCoalesced = mapped.waiters.filter(
        (waiter) => waiter.coalesced && !waiter.detached,
      ).length;
      if (attachedCoalesced >= maxWaitersPerKey) {
        throw new CacheOverloadError();
      }
      return attachWaiter(mapped, true, signal);
    }

    beginInFlightGeneration(key);
    const generation: InFlightGeneration<T> = {
      key,
      generation: nextGenerationNumber(key),
      waiters: [],
    };
    mappedByKey.set(key, generation);

    const leader = attachWaiter(generation, false, signal);
    void executeLoader(generation, load);
    return leader;
  }

  function invalidate(key: string): void {
    mappedByKey.delete(key);
  }

  function clear(): void {
    mappedByKey.clear();
  }

  return { run, invalidate, clear };
}