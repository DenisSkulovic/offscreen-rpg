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
  waiters: Set<WaiterEntry<T>>;
  attachedCoalesced: number;
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

function detachWaiter<T>(
  generation: InFlightGeneration<T>,
  entry: WaiterEntry<T>,
  signal: AbortSignal,
): void {
  if (entry.detached) {
    return;
  }
  entry.detached = true;
  entry.abortCleanup?.();
  entry.reject(abortError(signal));
  if (generation.waiters.delete(entry) && entry.coalesced) {
    generation.attachedCoalesced -= 1;
  }
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
        detachWaiter(generation, entry, signal);
        return;
      }
      const onAbort = () => {
        detachWaiter(generation, entry, signal);
      };
      signal.addEventListener('abort', onAbort, { once: true });
      entry.abortCleanup = () => {
        signal.removeEventListener('abort', onAbort);
      };
    }

    generation.waiters.add(entry);
    if (coalesced) {
      generation.attachedCoalesced += 1;
    }
  });
}

function settleGeneration<T>(
  generation: InFlightGeneration<T>,
  outcome:
    { kind: 'fulfilled'; value: T } | { kind: 'rejected'; error: unknown },
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
  generation.waiters.clear();
  generation.attachedCoalesced = 0;
}

export function createSingleFlight<T>(options: {
  maxActiveKeys: number;
  maxWaitersPerKey: number;
}): SingleFlight<T> {
  const { maxActiveKeys, maxWaitersPerKey } = options;
  const mappedByKey = new Map<string, InFlightGeneration<T>>();
  let activeGenerations = 0;

  function beginInFlightGeneration(): void {
    if (activeGenerations >= maxActiveKeys) {
      throw new CacheOverloadError();
    }
    activeGenerations += 1;
  }

  function endInFlightGeneration(
    key: string,
    generation: InFlightGeneration<T>,
  ): void {
    if (mappedByKey.get(key) === generation) {
      mappedByKey.delete(key);
    }
    activeGenerations -= 1;
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

  function joinMappedGeneration(
    generation: InFlightGeneration<T>,
    signal?: AbortSignal,
  ): Promise<WaiterResult<T>> {
    if (generation.attachedCoalesced >= maxWaitersPerKey) {
      throw new CacheOverloadError();
    }
    return attachWaiter(generation, true, signal);
  }

  function startLoaderWhenLeaderActive(
    key: string,
    generation: InFlightGeneration<T>,
    load: (canPublish: () => boolean) => Promise<T>,
    leader: Promise<WaiterResult<T>>,
  ): Promise<WaiterResult<T>> {
    const hasActiveLeader = [...generation.waiters].some(
      (waiter) => !waiter.coalesced && !waiter.detached,
    );
    if (!hasActiveLeader) {
      if (mappedByKey.get(key) === generation) {
        mappedByKey.delete(key);
      }
      endInFlightGeneration(key, generation);
      return leader;
    }

    void executeLoader(generation, load);
    return leader;
  }

  function run(
    key: string,
    load: (canPublish: () => boolean) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<WaiterResult<T>> {
    const mapped = mappedByKey.get(key);
    if (mapped) {
      return joinMappedGeneration(mapped, signal);
    }

    beginInFlightGeneration();
    const generation: InFlightGeneration<T> = {
      key,
      waiters: new Set(),
      attachedCoalesced: 0,
    };
    mappedByKey.set(key, generation);

    const leader = attachWaiter(generation, false, signal);
    return startLoaderWhenLeaderActive(key, generation, load, leader);
  }

  function invalidate(key: string): void {
    mappedByKey.delete(key);
  }

  function clear(): void {
    mappedByKey.clear();
  }

  return { run, invalidate, clear };
}
