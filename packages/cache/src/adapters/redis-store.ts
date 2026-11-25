import {
  type CacheClock,
  type CacheEntry,
  type CacheLookup,
  type CacheStore,
  type CacheWriteResult,
  isCacheEntryLive,
} from '../core/cache-store.js';
import {
  createRedisCircuitBreaker,
  type RedisCircuitBreaker,
  type RedisCircuitAdmission,
} from '../resilience/redis-circuit-breaker.js';
import type { RedisConnection } from '../runtime/redis-connection.js';

export const REDIS_ENTRY_MAX_BYTES = 1_048_576;
const REDIS_ENTRY_MAX_ENCODED_BASE64_LENGTH =
  Math.ceil(REDIS_ENTRY_MAX_BYTES / 3) * 4;
const REDIS_ENVELOPE_RAW_MAX_LENGTH =
  REDIS_ENTRY_MAX_ENCODED_BASE64_LENGTH + 256;
const CANONICAL_BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;

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

type EnvelopeV1 = Readonly<{
  v: 1;
  p: string;
  o: number;
  e: number;
}>;

function encodeEnvelope(entry: CacheEntry): string {
  const envelope: EnvelopeV1 = {
    v: 1,
    p: Buffer.from(entry.bytes).toString('base64'),
    o: entry.observedAtMs,
    e: entry.expiresAtMs,
  };
  return JSON.stringify(envelope);
}

function isCanonicalBase64Payload(encoded: string): boolean {
  if (
    encoded.length === 0 ||
    encoded.length > REDIS_ENTRY_MAX_ENCODED_BASE64_LENGTH
  ) {
    return false;
  }
  return CANONICAL_BASE64_PATTERN.test(encoded);
}

function decodeEnvelope(
  raw: string,
  nowMs: number,
):
  | { kind: 'hit'; entry: CacheEntry }
  | { kind: 'bypass'; reason: 'invalid' | 'expired' | 'oversize' } {
  if (raw.length > REDIS_ENVELOPE_RAW_MAX_LENGTH) {
    return { kind: 'bypass', reason: 'invalid' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'bypass', reason: 'invalid' };
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as EnvelopeV1).v !== 1
  ) {
    return { kind: 'bypass', reason: 'invalid' };
  }
  const envelope = parsed as EnvelopeV1;
  if (typeof envelope.p !== 'string') {
    return { kind: 'bypass', reason: 'invalid' };
  }
  if (envelope.p.length > 0 && !isCanonicalBase64Payload(envelope.p)) {
    return { kind: 'bypass', reason: 'invalid' };
  }
  if (!Number.isSafeInteger(envelope.o) || !Number.isSafeInteger(envelope.e)) {
    return { kind: 'bypass', reason: 'invalid' };
  }
  if (envelope.o > envelope.e) {
    return { kind: 'bypass', reason: 'invalid' };
  }
  if (envelope.e <= nowMs) {
    return { kind: 'bypass', reason: 'expired' };
  }
  let bytes: Uint8Array;
  if (envelope.p.length === 0) {
    bytes = new Uint8Array(0);
  } else {
    try {
      const buf = Buffer.from(envelope.p, 'base64');
      if (buf.length > REDIS_ENTRY_MAX_BYTES) {
        return { kind: 'bypass', reason: 'oversize' };
      }
      bytes = new Uint8Array(buf);
    } catch {
      return { kind: 'bypass', reason: 'invalid' };
    }
  }
  const entry: CacheEntry = {
    bytes,
    observedAtMs: envelope.o,
    expiresAtMs: envelope.e,
  };
  if (!isCacheEntryLive(entry, nowMs)) {
    return { kind: 'bypass', reason: 'expired' };
  }
  return {
    kind: 'hit',
    entry: {
      bytes: new Uint8Array(entry.bytes),
      observedAtMs: entry.observedAtMs,
      expiresAtMs: entry.expiresAtMs,
    },
  };
}

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

export function createRedisStore(options: RedisStoreOptions): CacheStore {
  const {
    connection,
    clock,
    commands,
    operationTimeoutMs = DEFAULT_OPERATION_TIMEOUT_MS,
    maxOutstandingCommands = DEFAULT_MAX_OUTSTANDING_COMMANDS,
    breaker = createRedisCircuitBreaker(),
  } = options;

  let outstanding = 0;

  function preflight(
    admission: RedisCircuitAdmission,
  ): CacheLookup | CacheWriteResult | null {
    if (!connection.admitsTraffic()) {
      return { kind: 'bypass', reason: 'unavailable' };
    }
    if (admission === 'deny') {
      return { kind: 'bypass', reason: 'circuit-open' };
    }
    if (outstanding >= maxOutstandingCommands) {
      return { kind: 'bypass', reason: 'saturated' };
    }
    return null;
  }

  async function executeGet(key: string): Promise<CacheLookup> {
    const admission = breaker.admit();
    const blocked = preflight(admission);
    if (blocked) {
      return blocked as CacheLookup;
    }
    if (admission === 'probe') {
      breaker.startProbe();
    }

    outstanding += 1;
    let breakerSettled = false;
    const timeoutCtl = createOperationTimeout(operationTimeoutMs);
    let timedOut = false;

    const command = (async () => {
      try {
        const raw = await commands.get(key, timeoutCtl.signal);
        if (!breakerSettled) {
          breaker.recordConnectivitySuccess();
          breakerSettled = true;
        }
        if (raw === null) {
          return { kind: 'miss' } as const;
        }
        return decodeEnvelope(raw, clock());
      } catch {
        if (!breakerSettled) {
          breaker.recordConnectivityFailure();
          breakerSettled = true;
        }
        if (timedOut) {
          return { kind: 'bypass', reason: 'timeout' } as const;
        }
        return { kind: 'bypass', reason: 'unavailable' } as const;
      } finally {
        timeoutCtl.dispose();
        outstanding -= 1;
      }
    })();

    const timeout = new Promise<CacheLookup>((resolve) => {
      timeoutCtl.onTimeout(() => {
        timedOut = true;
        if (!breakerSettled) {
          breaker.recordConnectivityFailure();
          breakerSettled = true;
        }
        resolve({ kind: 'bypass', reason: 'timeout' });
      });
    });

    return Promise.race([command, timeout]);
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

    const admission = breaker.admit();
    const blocked = preflight(admission);
    if (blocked) {
      return blocked as CacheWriteResult;
    }
    if (admission === 'probe') {
      breaker.startProbe();
    }

    const wire = encodeEnvelope(entry);
    outstanding += 1;
    let breakerSettled = false;
    const timeoutCtl = createOperationTimeout(operationTimeoutMs);
    let timedOut = false;

    const command = (async () => {
      try {
        await commands.set(key, wire, remainingPx, timeoutCtl.signal);
        if (!breakerSettled) {
          breaker.recordConnectivitySuccess();
          breakerSettled = true;
        }
        return { kind: 'stored' } as const;
      } catch {
        if (!breakerSettled) {
          breaker.recordConnectivityFailure();
          breakerSettled = true;
        }
        if (timedOut) {
          return { kind: 'bypass', reason: 'timeout' } as const;
        }
        return { kind: 'bypass', reason: 'unavailable' } as const;
      } finally {
        timeoutCtl.dispose();
        outstanding -= 1;
      }
    })();

    const timeout = new Promise<CacheWriteResult>((resolve) => {
      timeoutCtl.onTimeout(() => {
        timedOut = true;
        if (!breakerSettled) {
          breaker.recordConnectivityFailure();
          breakerSettled = true;
        }
        resolve({ kind: 'bypass', reason: 'timeout' });
      });
    });

    return Promise.race([command, timeout]);
  }

  const store: CacheStore & { __outstanding?: () => number } = {
    get(key: string) {
      return executeGet(key);
    },
    set(key: string, entry: CacheEntry) {
      return executeSet(key, entry);
    },
    __outstanding() {
      return outstanding;
    },
  };
  return store;
}
