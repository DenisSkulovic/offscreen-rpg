import { createOriginBulkhead } from '../resilience/bulkhead.js';
import {
  CacheOverloadError,
  createSingleFlight,
} from '../resilience/single-flight.js';
import { emitCacheTelemetry } from '../core/cache-telemetry.js';
import { makeCacheKey } from '../core/cache-key.js';
import type {
  CacheDefinition,
  CacheIdentity,
  CacheStore,
  CacheTelemetry,
} from '../core/index.js';

type LoaderResult<T> = {
  value: T;
  identity: CacheIdentity;
  observedAtMs: number;
};

type BindCacheRuntime = {
  store: CacheStore;
  environment: string;
  clock?: () => number;
  random?: () => number;
  telemetry?: CacheTelemetry;
};

function effectiveTtlMs(
  ttlMs: number,
  jitterRatio: number,
  random: () => number,
): number {
  const factor = 1 - random() * jitterRatio;
  return Math.max(1, Math.floor(ttlMs * factor));
}

export function bindCache<T>(
  definition: CacheDefinition<T>,
  runtime: BindCacheRuntime,
): {
  getOrLoad(
    identity: CacheIdentity,
    load: () => Promise<LoaderResult<T>>,
    options?: { signal?: AbortSignal },
  ): Promise<T>;
} {
  const clock = runtime.clock ?? Date.now;
  const random = runtime.random ?? Math.random;
  const { store } = runtime;
  const telemetry = runtime.telemetry;
  const { policy } = definition;

  const singleFlight = createSingleFlight<T>({
    maxActiveKeys: policy.maxActiveKeys,
    maxWaitersPerKey: policy.maxWaitersPerKey,
  });

  const bulkheadOptions = {
    concurrency: policy.originConcurrency,
    queueLimit: policy.originQueueLimit,
    queueTimeoutMs: policy.originQueueTimeoutMs,
    ...(runtime.clock !== undefined ? { clock: runtime.clock } : {}),
  };
  const bulkhead = createOriginBulkhead(bulkheadOptions);

  function telemetryEvent(
    partial: Omit<Parameters<CacheTelemetry>[0], 'namespace'>,
  ): void {
    if (!telemetry) {
      return;
    }
    emitCacheTelemetry(telemetry, {
      namespace: definition.namespace,
      ...partial,
    });
  }

  type CacheRead = { kind: 'hit'; value: T } | { kind: 'miss' };

  async function readCache(key: string): Promise<CacheRead> {
    let lookup;
    try {
      lookup = await store.get(key);
    } catch {
      telemetryEvent({ tier: 'l2', operation: 'get', outcome: 'bypass' });
      return { kind: 'miss' };
    }

    if (lookup.kind === 'miss') {
      telemetryEvent({ tier: 'l2', operation: 'get', outcome: 'miss' });
      return { kind: 'miss' };
    }

    if (lookup.kind === 'bypass') {
      telemetryEvent({ tier: 'l2', operation: 'get', outcome: 'bypass' });
      return { kind: 'miss' };
    }

    try {
      const value = definition.codec.decode(lookup.entry.bytes);
      telemetryEvent({ tier: 'l2', operation: 'get', outcome: 'hit' });
      return { kind: 'hit', value };
    } catch {
      telemetryEvent({ tier: 'l2', operation: 'get', outcome: 'bypass' });
      return { kind: 'miss' };
    }
  }

  async function populateCache(
    loaded: LoaderResult<T>,
    canPublish: () => boolean,
  ): Promise<void> {
    if (definition.consistency === 'expiring') {
      telemetryEvent({ tier: 'l2', operation: 'set', outcome: 'skipped' });
      return;
    }

    if (!canPublish()) {
      telemetryEvent({ tier: 'l2', operation: 'set', outcome: 'skipped' });
      return;
    }

    const expiresAtMs =
      loaded.observedAtMs +
      effectiveTtlMs(policy.ttlMs, policy.jitterRatio, random);

    if (expiresAtMs <= clock()) {
      telemetryEvent({ tier: 'l2', operation: 'set', outcome: 'skipped' });
      return;
    }

    try {
      const bytes = definition.codec.encode(loaded.value);
      if (bytes.byteLength > policy.maxEntryBytes) {
        telemetryEvent({ tier: 'l2', operation: 'set', outcome: 'skipped' });
        return;
      }

      const publishKey = makeCacheKey(
        runtime.environment,
        definition.namespace,
        definition.version,
        loaded.identity,
      );
      const writeResult = await store.set(publishKey, {
        bytes,
        expiresAtMs,
        observedAtMs: loaded.observedAtMs,
      });
      if (writeResult.kind === 'stored') {
        telemetryEvent({ tier: 'l2', operation: 'set', outcome: 'stored' });
      } else {
        telemetryEvent({ tier: 'l2', operation: 'set', outcome: 'skipped' });
      }
    } catch {
      // Encoding and publication-key failures are cache failures. They must
      // not reject getOrLoad after the authoritative loader has succeeded.
      telemetryEvent({ tier: 'l2', operation: 'set', outcome: 'skipped' });
    }
  }

  async function getOrLoad(
    identity: CacheIdentity,
    load: () => Promise<LoaderResult<T>>,
    options?: { signal?: AbortSignal },
  ): Promise<T> {
    const key = makeCacheKey(
      runtime.environment,
      definition.namespace,
      definition.version,
      identity,
    );

    let runPromise: ReturnType<typeof singleFlight.run>;
    try {
      runPromise = singleFlight.run(
        key,
        async (canPublish) => {
          const cached = await readCache(key);
          if (cached.kind === 'hit') {
            return cached.value;
          }

          const originStart = clock();
          let loaded: LoaderResult<T>;
          try {
            loaded = await bulkhead.run(load);
            telemetryEvent({
              tier: 'origin',
              operation: 'load',
              outcome: 'ok',
              durationMs: Math.max(0, clock() - originStart),
            });
          } catch (error) {
            if (error instanceof CacheOverloadError) {
              telemetryEvent({
                tier: 'origin',
                operation: 'load',
                outcome: 'overload',
              });
            } else {
              telemetryEvent({
                tier: 'origin',
                operation: 'load',
                outcome: 'error',
                durationMs: clock() - originStart,
              });
            }
            throw error;
          }

          await populateCache(loaded, canPublish);
          return loaded.value;
        },
        options?.signal,
      );
    } catch (error) {
      if (error instanceof CacheOverloadError) {
        telemetryEvent({
          tier: 'runtime',
          operation: 'coalesce',
          outcome: 'overload',
        });
      }
      throw error;
    }

    const result = await runPromise;

    if (result.coalesced) {
      telemetryEvent({
        tier: 'runtime',
        operation: 'coalesce',
        outcome: 'coalesced',
      });
    }

    return result.value;
  }

  return { getOrLoad };
}
