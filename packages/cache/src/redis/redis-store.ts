import {
  type CacheClock,
  type CacheEntry,
  type CacheLookup,
  type CacheStore,
  type CacheWriteResult,
} from '../core/cache-store.js';
import {
  createRedisCircuitBreaker,
  type RedisCircuitBreaker,
} from './redis-circuit-breaker.js';
import type { RedisConnection } from './redis-connection.js';
import {
  decodeEnvelope,
  encodeEnvelope,
  REDIS_ENTRY_MAX_BYTES,
} from './envelope.js';
import {
  createRedisCommandExecutor,
  type RedisCommandBypassReason,
} from './command-executor.js';

export { REDIS_ENTRY_MAX_BYTES } from './envelope.js';

const DEFAULT_OPERATION_TIMEOUT_MS = 100;
const DEFAULT_MAX_OUTSTANDING_COMMANDS = 256;

export type RedisStoreCommands = Readonly<{
  get(key: string, signal?: AbortSignal): Promise<string | null>;
  set(
    key: string,
    value: string,
    pxMs: number,
    signal?: AbortSignal,
  ): Promise<void>;
}>;

export type RedisStoreOptions = Readonly<{
  connection: RedisConnection;
  clock: CacheClock;
  commands: RedisStoreCommands;
  operationTimeoutMs?: number;
  maxOutstandingCommands?: number;
  breaker?: RedisCircuitBreaker;
}>;

function isExpiredWrite(entry: CacheEntry, nowMs: number): boolean {
  if (
    !Number.isSafeInteger(entry.expiresAtMs) ||
    !Number.isSafeInteger(entry.observedAtMs)
  ) {
    return true;
  }
  if (entry.observedAtMs > entry.expiresAtMs) {
    return true;
  }
  return entry.expiresAtMs <= nowMs;
}

function mapCommandBypass(reason: RedisCommandBypassReason): CacheLookup {
  return { kind: 'bypass', reason };
}

function mapCommandBypassWrite(
  reason: RedisCommandBypassReason,
): CacheWriteResult {
  return { kind: 'bypass', reason };
}

export function createRedisStore(options: RedisStoreOptions): CacheStore {
  const {
    connection,
    clock,
    commands,
    operationTimeoutMs = DEFAULT_OPERATION_TIMEOUT_MS,
    maxOutstandingCommands = DEFAULT_MAX_OUTSTANDING_COMMANDS,
    breaker = createRedisCircuitBreaker(),
  } = options;

  const executor = createRedisCommandExecutor({
    connection,
    breaker,
    operationTimeoutMs,
    maxOutstandingCommands,
  });

  async function executeGet(key: string): Promise<CacheLookup> {
    const result = await executor.execute((signal) =>
      commands.get(key, signal),
    );
    if (result.kind === 'bypass') {
      return mapCommandBypass(result.reason);
    }
    const raw = result.value;
    if (raw === null) {
      return { kind: 'miss' };
    }
    try {
      return decodeEnvelope(raw, clock());
    } catch {
      return { kind: 'bypass', reason: 'unavailable' };
    }
  }

  async function executeSet(
    key: string,
    entry: CacheEntry,
  ): Promise<CacheWriteResult> {
    if (entry.bytes.length > REDIS_ENTRY_MAX_BYTES) {
      return { kind: 'skipped', reason: 'oversize' };
    }
    const nowMs = clock();
    if (isExpiredWrite(entry, nowMs)) {
      return { kind: 'skipped', reason: 'expired' };
    }
    const remainingPx = entry.expiresAtMs - nowMs;
    if (remainingPx <= 0) {
      return { kind: 'skipped', reason: 'expired' };
    }

    const wire = encodeEnvelope(entry);
    const result = await executor.execute((signal) =>
      commands.set(key, wire, remainingPx, signal),
    );
    if (result.kind === 'bypass') {
      return mapCommandBypassWrite(result.reason);
    }
    return { kind: 'stored' };
  }

  const store: CacheStore & { __outstanding?: () => number } = {
    get(key: string) {
      return executeGet(key);
    },
    set(key: string, entry: CacheEntry) {
      return executeSet(key, entry);
    },
    __outstanding() {
      return executor.outstandingCount();
    },
  };
  return store;
}
