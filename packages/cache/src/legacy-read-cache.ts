import type { ReadCache } from '@offscreen/cache-port/read-cache';

import type { CacheAdapterRedisCommands } from './redis/adapter-commands.js';

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

export const noopLegacyCache: ReadCache = {
  async get() {
    return null;
  },
  async set() {},
};

export function createLegacyCache(
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
