import type { ReadCache } from '@offscreen/cache-port/read-cache';

import { createRedisStore } from './redis/redis-store.js';
import type { CacheStore } from './core/cache-store.js';
import { createDisabledStore } from './core/disabled-store.js';
import {
  parseRedisConnectionEnv,
  resolveRedisConnectionSettings,
} from './redis/redis-config.js';
import {
  createCommandCapturingClientFactory,
  createRedisStoreCommands,
  type CacheAdapterRedisCommands,
} from './redis/adapter-commands.js';
import { createLegacyCache, noopLegacyCache } from './legacy-read-cache.js';
import {
  createRedisConnectionFromRedisEnv,
  type RedisClientFactory,
  type RedisConnection,
} from './redis/redis-connection.js';

export type { CacheAdapterRedisCommands };

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
