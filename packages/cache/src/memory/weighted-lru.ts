const ENTRY_OVERHEAD_BYTES = 128;

function isValidatedWeight(weight: number): boolean {
  return Number.isSafeInteger(weight) && weight >= 0;
}

function entryByteCost(weight: number): number {
  return weight + ENTRY_OVERHEAD_BYTES;
}

type GetIfOutcome<T> =
  { kind: 'missing' } | { kind: 'rejected' } | { kind: 'hit'; value: T };

export type WeightedLruHandle<T> = {
  get(key: string): T | undefined;
  getIf(key: string, predicate: (value: T) => boolean): GetIfOutcome<T>;
  peek(key: string): T | undefined;
  set(key: string, value: T): boolean;
  delete(key: string): void;
  clear(): void;
  forEach(fn: (value: T, key: string) => void): void;
};

type WeightedRecord<T> = {
  value: T;
  cost: number;
};

export function createWeightedLruHandle<T>(options: {
  maxBytes: number;
  maxEntries: number;
  weight: (value: T) => number;
  copy: (value: T) => T;
}): WeightedLruHandle<T> {
  const { maxBytes, maxEntries, weight, copy } = options;
  const entries = new Map<string, WeightedRecord<T>>();
  let totalBytes = 0;

  const touch = (key: string): void => {
    const record = entries.get(key);
    if (record === undefined) {
      return;
    }
    entries.delete(key);
    entries.set(key, record);
  };

  const removeKey = (key: string): void => {
    const record = entries.get(key);
    if (record === undefined) {
      return;
    }
    entries.delete(key);
    totalBytes -= record.cost;
  };

  const evictLeastRecent = (): void => {
    const oldest = entries.keys().next().value as string | undefined;
    if (oldest === undefined) {
      return;
    }
    removeKey(oldest);
  };

  const admit = (key: string, value: T, cost: number): boolean => {
    const replacing = entries.has(key);
    if (replacing) {
      removeKey(key);
    }
    if (!replacing) {
      while (entries.size >= maxEntries && entries.size > 0) {
        evictLeastRecent();
      }
      if (entries.size >= maxEntries) {
        return false;
      }
    }
    while (totalBytes + cost > maxBytes && entries.size > 0) {
      evictLeastRecent();
    }
    if (totalBytes + cost > maxBytes) {
      return false;
    }
    const stored = copy(value);
    entries.set(key, { value: stored, cost });
    totalBytes += cost;
    return true;
  };

  const getIf = (
    key: string,
    predicate: (value: T) => boolean,
  ): GetIfOutcome<T> => {
    const record = entries.get(key);
    if (record === undefined) {
      return { kind: 'missing' };
    }
    if (!predicate(record.value)) {
      removeKey(key);
      return { kind: 'rejected' };
    }
    const stored = copy(record.value);
    touch(key);
    return { kind: 'hit', value: stored };
  };

  return {
    get(key: string): T | undefined {
      const outcome = getIf(key, () => true);
      return outcome.kind === 'hit' ? outcome.value : undefined;
    },

    getIf,

    peek(key: string): T | undefined {
      const record = entries.get(key);
      if (record === undefined) {
        return undefined;
      }
      return copy(record.value);
    },

    set(key: string, value: T): boolean {
      const w = weight(value);
      if (!isValidatedWeight(w)) {
        return false;
      }
      const cost = entryByteCost(w);
      if (cost > maxBytes) {
        return false;
      }
      return admit(key, value, cost);
    },

    delete(key: string): void {
      removeKey(key);
    },

    clear(): void {
      entries.clear();
      totalBytes = 0;
    },

    forEach(fn: (value: T, key: string) => void): void {
      for (const [key, record] of entries) {
        fn(record.value, key);
      }
    },
  };
}

export function createWeightedLru<T>(options: {
  maxBytes: number;
  maxEntries: number;
  weight: (value: T) => number;
  copy: (value: T) => T;
}): {
  get(key: string): T | undefined;
  set(key: string, value: T): boolean;
  delete(key: string): void;
  clear(): void;
} {
  const handle = createWeightedLruHandle(options);
  return {
    get: (key) => handle.get(key),
    set: (key, value) => handle.set(key, value),
    delete: (key) => handle.delete(key),
    clear: () => handle.clear(),
  };
}

export { ENTRY_OVERHEAD_BYTES };
