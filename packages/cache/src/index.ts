import type { ReadCache } from '@offscreen/application/cache';
import { z } from 'zod';

const configSchema = z.strictObject({
  REDIS_URL: z.url().optional(),
  REDIS_KEY_PREFIX: z
    .string()
    .regex(/^[a-z0-9][a-z0-9:_-]{0,49}$/)
    .default('offscreen'),
  REDIS_CONNECT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(5_000)
    .default(500),
  REDIS_OPERATION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(10)
    .max(2_000)
    .default(100),
});

export type CacheAdapterIncident = Readonly<{
  operation: 'connect' | 'get' | 'set' | 'close';
  errorKind: string;
}>;

export type CacheAdapter = Readonly<{
  cache: ReadCache;
  enabled: boolean;
  close(): Promise<void>;
}>;

function errorKind(error: unknown) {
  return error instanceof Error && error.name ? error.name : 'UnknownError';
}

function deadline<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('CacheTimeout')), timeoutMs);
    timer.unref();
  });
  return Promise.race([operation, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Redis is loaded only when explicitly configured. Connection failure selects
 * the disabled adapter so an optional accelerator cannot stop the API.
 */
export async function createCacheAdapter(
  env: Record<string, string | undefined>,
  onIncident?: (incident: CacheAdapterIncident) => void,
): Promise<CacheAdapter> {
  const config = configSchema.parse(env);
  if (!config.REDIS_URL) {
    return {
      enabled: false,
      cache: {
        async get() {
          return null;
        },
        async set() {},
      },
      async close() {},
    };
  }
  const { createClient } = await import('redis');
  const client = createClient({
    url: config.REDIS_URL,
    socket: {
      connectTimeout: config.REDIS_CONNECT_TIMEOUT_MS,
      reconnectStrategy: false,
    },
  });
  // The caller owns safe structured diagnostics; never forward Redis strings
  // because they may contain topology details or configured URLs.
  client.on('error', () => {});
  try {
    await deadline(client.connect(), config.REDIS_CONNECT_TIMEOUT_MS);
  } catch (error) {
    onIncident?.({ operation: 'connect', errorKind: errorKind(error) });
    if (client.isOpen) await client.close().catch(() => undefined);
    return {
      enabled: false,
      cache: {
        async get() {
          return null;
        },
        async set() {},
      },
      async close() {},
    };
  }
  const qualified = (key: string) => `${config.REDIS_KEY_PREFIX}:${key}`;
  return {
    enabled: true,
    cache: {
      async get(key) {
        const serialized = await deadline(
          client.get(qualified(key)),
          config.REDIS_OPERATION_TIMEOUT_MS,
        );
        if (serialized === null) return null;
        const text = String(serialized);
        if (Buffer.byteLength(text, 'utf8') > 512 * 1024) {
          throw new Error('CacheValueTooLarge');
        }
        return JSON.parse(text) as unknown;
      },
      async set(key, value, options) {
        const serialized = JSON.stringify(value);
        if (serialized === undefined) throw new Error('CacheValueInvalid');
        if (Buffer.byteLength(serialized, 'utf8') > options.maxBytes) {
          throw new Error('CacheValueTooLarge');
        }
        await deadline(
          client.set(qualified(key), serialized, { EX: options.ttlSeconds }),
          config.REDIS_OPERATION_TIMEOUT_MS,
        );
      },
    },
    async close() {
      try {
        if (client.isOpen) await client.close();
      } catch (error) {
        onIncident?.({ operation: 'close', errorKind: errorKind(error) });
      }
    },
  };
}
