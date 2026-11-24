import { z } from 'zod';

export const redisConnectionEnvSchema = z.strictObject({
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

export type RedisConnectionEnv = z.infer<typeof redisConnectionEnvSchema>;

export type RedisConnectionSettings = Readonly<{
  url: string;
  keyPrefix: string;
  connectTimeoutMs: number;
  operationTimeoutMs: number;
}>;

export const REDIS_RECONNECT_MIN_MS = 250;
export const REDIS_RECONNECT_MAX_MS = 15_000;

function redisEnvSlice(env: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => key.startsWith('REDIS_')),
  );
}

/**
 * Invalid configuration rejects explicitly so optional Redis cannot start half-configured.
 */
export function parseRedisConnectionEnv(
  env: Record<string, string | undefined>,
): RedisConnectionEnv {
  return redisConnectionEnvSchema.parse(redisEnvSlice(env));
}

export function resolveRedisConnectionSettings(
  parsed: RedisConnectionEnv,
): RedisConnectionSettings | null {
  if (!parsed.REDIS_URL) {
    return null;
  }
  return {
    url: parsed.REDIS_URL,
    keyPrefix: parsed.REDIS_KEY_PREFIX,
    connectTimeoutMs: parsed.REDIS_CONNECT_TIMEOUT_MS,
    operationTimeoutMs: parsed.REDIS_OPERATION_TIMEOUT_MS,
  };
}

export function computeReconnectDelayMs(
  attempt: number,
  random: () => number = Math.random,
): number {
  const cappedAttempt = Math.min(attempt, 16);
  const exponential = Math.min(
    REDIS_RECONNECT_MAX_MS,
    REDIS_RECONNECT_MIN_MS * 2 ** cappedAttempt,
  );
  const span = exponential - REDIS_RECONNECT_MIN_MS;
  const jitter = span > 0 ? random() * span : 0;
  return Math.min(
    REDIS_RECONNECT_MAX_MS,
    Math.floor(REDIS_RECONNECT_MIN_MS + jitter),
  );
}
