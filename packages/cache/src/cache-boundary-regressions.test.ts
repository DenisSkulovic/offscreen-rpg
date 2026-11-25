import assert from 'node:assert/strict';
import test from 'node:test';

import { jsonCodec } from './codecs/json-codec.js';
import { defineCache } from './core/index.js';
import { createFakeStore } from './core/test-stores.js';
import {
  buildCacheAdapterFromConnection,
  type CacheAdapterRedisCommands,
} from './index.js';
import type { RedisConnection } from './runtime/redis-connection.js';
import type { RedisConnectionSettings } from './runtime/redis-config.js';
import { bindCache } from './strategies/index.js';

function readyConnection(operationTimeoutMs: number): RedisConnection {
  const settings: RedisConnectionSettings = {
    url: 'redis://127.0.0.1:6379',
    keyPrefix: 'offscreen',
    connectTimeoutMs: 500,
    operationTimeoutMs,
  };
  return {
    state: 'ready',
    settings,
    async start() {},
    async close() {},
    admitsTraffic: () => true,
    getClient: () => null,
  };
}

test('production Redis transport keeps the outstanding slot until the SDK command settles', async () => {
  let releaseSdk: (value: string | null) => void = () => {};
  const sdkCall = new Promise<string | null>((resolve) => {
    releaseSdk = resolve;
  });
  let sdkSettled = false;
  sdkCall.then(() => {
    sdkSettled = true;
  });

  const commands: CacheAdapterRedisCommands = {
    get: () => sdkCall,
    set: async () => 'OK',
  };
  const adapter = buildCacheAdapterFromConnection({
    connection: readyConnection(20),
    getCommands: () => commands,
    startupReady: true,
  });
  const store = adapter.store as typeof adapter.store & {
    __outstanding?: () => number;
  };

  const lookup = await store.get('canonical-key');
  assert.equal(lookup.kind, 'bypass');
  if (lookup.kind === 'bypass') {
    assert.equal(lookup.reason, 'timeout');
  }
  assert.equal(sdkSettled, false);
  assert.equal(store.__outstanding?.(), 1);

  releaseSdk(null);
  await sdkCall;
  await Promise.resolve();
  assert.equal(sdkSettled, true);
  assert.equal(store.__outstanding?.(), 0);
});

test('encode and publication-key failures still return the origin value', async () => {
  const now = 1_000;
  const store = createFakeStore(() => now);
  const policy = {
    ttlMs: 60_000,
    maxEntryBytes: 4096,
    jitterRatio: 0,
    maxActiveKeys: 8,
    maxWaitersPerKey: 4,
    originConcurrency: 2,
    originQueueLimit: 4,
    originQueueTimeoutMs: 1_000,
  } as const;

  const encodeBound = bindCache(
    defineCache({
      namespace: 'story',
      version: 1,
      consistency: 'versioned',
      codec: {
        encode() {
          throw new Error('encode failed');
        },
        decode(bytes: Uint8Array) {
          return jsonCodec((value: unknown) => value).decode(bytes);
        },
      },
      policy,
    }),
    {
      store,
      environment: 'dev',
      clock: () => now,
      random: () => 0,
    },
  );
  const encoded = await encodeBound.getOrLoad(['chapter'], async () => ({
    value: 'authoritative',
    identity: ['chapter'],
    observedAtMs: now,
  }));
  assert.equal(encoded, 'authoritative');

  const keyBound = bindCache(
    defineCache({
      namespace: 'story',
      version: 1,
      consistency: 'versioned',
      codec: jsonCodec((value: unknown) => value as string),
      policy,
    }),
    {
      store,
      environment: 'dev',
      clock: () => now,
      random: () => 0,
    },
  );
  const keyed = await keyBound.getOrLoad(['chapter'], async () => ({
    value: 'authoritative',
    identity: ['bad\uD800'],
    observedAtMs: now,
  }));
  assert.equal(keyed, 'authoritative');
});
