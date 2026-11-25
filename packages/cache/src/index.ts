import type { ReadCache } from '@offscreen/cache-port/read-cache';

import {
  createRedisStore,
  type RedisStoreCommands,
} from './adapters/redis-store.js';
import type { CacheStore } from './core/cache-store.js';
import { createDisabledStore } from './core/test-stores.js';
import {
  parseRedisConnectionEnv,
  resolveRedisConnectionSettings,
} from './runtime/redis-config.js';
import {
  createLazyRedisLifecycleClient,
  createRedisConnectionFromRedisEnv,
  type RedisClientFactory,
  type RedisConnection,
} from './runtime/redis-connection.js';

export type CacheAdapterIncident = Readonly<{
  operation: 'connect' | 'get' | 'set' | 'close';
  errorKind: string;
}>;

export type CacheAdapter = Readonly<{
  cache: ReadCache;
  enabled: boolean;
  store: CacheStore;
  close(): Promise<void>;
}>;

export type CacheAdapterRedisCommands = Readonly<{
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: Readonly<{ EX?: number; PX?: number }>,
  ): Promise<string | null>;
}>;

export type CreateCacheAdapterTestOptions = Readonly<{
  clientFactory?: RedisClientFactory;
  getCommands?: () => CacheAdapterRedisCommands | null;
  random?: () => number;
  setTimer?: (
    handler: () => void,
    delayMs: number,
  ) => ReturnType<typeof setTimeout>;
  clearTimer?: (handle: ReturnType<typeof setTimeout>) => void;
}>;

function errorKind(error: unknown) {
  return error instanceof Error && error.name ? error.name : 'UnknownError';
}

function safeIncident(
  onIncident: ((incident: CacheAdapterIncident) => void) | undefined,
  incident: CacheAdapterIncident,
) {
  try {
    onIncident?.(incident);
  } catch {
    // Incident sinks must not reject cache operations.
  }
}

function deadline<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('CacheTimeout')), timeoutMs);
    timer.unref();
  });
  return Promise.race([operation, timeout]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

const noopLegacyCache: ReadCache = {
  async get() {
    return null;
  },
  async set() {},
};

function createCommandCapturingClientFactory(): Readonly<{
  factory: RedisClientFactory;
  getCommands: () => CacheAdapterRedisCommands | null;
}> {
  let commands: CacheAdapterRedisCommands | null = null;
  const factory: RedisClientFactory = (settings) =>
    createLazyRedisLifecycleClient(settings, {
      onSdkCreated(client) {
        const active = client;
        commands = {
          get: (key) => active.get(key),
          set: (key, value, options) => active.set(key, value, options),
        };
      },
      onSdkClosed() {
        commands = null;
      },
    });
  return {
    factory,
    getCommands: () => commands,
  };
}

function createRedisStoreCommands(
  getCommands: () => CacheAdapterRedisCommands | null,
): RedisStoreCommands {
  return {
    get(key, signal) {
      if (signal?.aborted) {
        return Promise.reject(new Error('Aborted'));
      }
      const client = getCommands();
      if (!client) {
        return Promise.reject(new Error('RedisUnavailable'));
      }
      // Return the SDK promise itself. A Promise.race deadline would settle
      // this method while the command is still in flight, and the store would
      // release its outstanding slot before Redis actually finishes.
      return client.get(key);
    },
    set(key, value, pxMs, signal) {
      if (signal?.aborted) {
        return Promise.reject(new Error('Aborted'));
      }
      const client = getCommands();
      if (!client) {
        return Promise.reject(new Error('RedisUnavailable'));
      }
      return client.set(key, value, { PX: pxMs }).then(() => undefined);
    },
  };
}

function createLegacyCache(
  getCommands: () => CacheAdapterRedisCommands | null,
  qualified: (key: string) => string,
  operationTimeoutMs: number,
): ReadCache {
  return {
    async get(key) {
      const client = getCommands();
      if (!client) {
        return null;
      }
      const serialized = await deadline(
        client.get(qualified(key)),
        operationTimeoutMs,
      );
      if (serialized === null) {
        return null;
      }
      const text = String(serialized);
      if (Buffer.byteLength(text, 'utf8') > 512 * 1024) {
        throw new Error('CacheValueTooLarge');
      }
      return JSON.parse(text) as unknown;
    },
    async set(key, value, options) {
      const client = getCommands();
      if (!client) {
        return;
      }
      const serialized = JSON.stringify(value);
      if (serialized === undefined) {
        throw new Error('CacheValueInvalid');
      }
      if (Buffer.byteLength(serialized, 'utf8') > options.maxBytes) {
        throw new Error('CacheValueTooLarge');
      }
      await deadline(
        client.set(qualified(key), serialized, { EX: options.ttlSeconds }),
        operationTimeoutMs,
      );
    },
  };
}

function buildDisabledCacheAdapter(): CacheAdapter {
  return {
    enabled: false,
    cache: noopLegacyCache,
    store: createDisabledStore(),
    async close() {},
  };
}

export type BuildCacheAdapterFromConnectionOptions = Readonly<{
  connection: RedisConnection;
  getCommands: () => CacheAdapterRedisCommands | null;
  onIncident?: (incident: CacheAdapterIncident) => void;
  startupReady: boolean;
}>;

/**
 * @internal Test and adapter wiring helper.
 */
export function buildCacheAdapterFromConnection(
  options: BuildCacheAdapterFromConnectionOptions,
): CacheAdapter {
  const { connection, getCommands, onIncident, startupReady } = options;
  const settings = connection.settings;
  if (!settings) {
    return buildDisabledCacheAdapter();
  }

  const qualified = (key: string) => `${settings.keyPrefix}:${key}`;
  const store = createRedisStore({
    connection,
    clock: () => Date.now(),
    commands: createRedisStoreCommands(getCommands),
    operationTimeoutMs: settings.operationTimeoutMs,
  });

  return {
    enabled: startupReady,
    cache: startupReady
      ? createLegacyCache(getCommands, qualified, settings.operationTimeoutMs)
      : noopLegacyCache,
    store,
    async close() {
      try {
        await connection.close();
      } catch (error) {
        safeIncident(onIncident, {
          operation: 'close',
          errorKind: errorKind(error),
        });
      }
    },
  };
}

/**
 * Redis is loaded only when explicitly configured. Connection failure selects
 * the disabled adapter so an optional accelerator cannot stop the API.
 */
export async function createCacheAdapter(
  env: Record<string, string | undefined>,
  onIncident?: (incident: CacheAdapterIncident) => void,
  testOptions?: CreateCacheAdapterTestOptions,
): Promise<CacheAdapter> {
  const parsed = parseRedisConnectionEnv(env);
  if (!resolveRedisConnectionSettings(parsed)) {
    return buildDisabledCacheAdapter();
  }

  const commandFactory = testOptions?.clientFactory
    ? {
        factory: testOptions.clientFactory,
        getCommands:
          testOptions.getCommands ??
          (() => null as CacheAdapterRedisCommands | null),
      }
    : createCommandCapturingClientFactory();

  const connection = createRedisConnectionFromRedisEnv(env, {
    clientFactory: commandFactory.factory,
    ...(testOptions?.random ? { random: testOptions.random } : {}),
    ...(testOptions?.setTimer ? { setTimer: testOptions.setTimer } : {}),
    ...(testOptions?.clearTimer ? { clearTimer: testOptions.clearTimer } : {}),
  });

  await connection.start();
  const startupReady = connection.admitsTraffic();
  if (!startupReady) {
    safeIncident(onIncident, {
      operation: 'connect',
      errorKind: 'RedisConnectFailed',
    });
  }

  return buildCacheAdapterFromConnection({
    connection,
    getCommands: commandFactory.getCommands,
    startupReady,
    ...(onIncident ? { onIncident } : {}),
  });
}
