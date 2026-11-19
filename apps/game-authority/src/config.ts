import { z } from 'zod';

const timeoutMs = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(50).max(10_000))
  .prefault('5000');

const schema = z.object({
  GAME_AUTHORITY_HOST: z.string().min(1).default('127.0.0.1'),
  GAME_AUTHORITY_PORT: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(0).max(65535))
    .prefault('3002'),
  GAME_AUTHORITY_SERVICE_TOKEN: z.string().min(16).max(256),
  GAME_AUTHORITY_TIMEOUT_MS: timeoutMs,
});

export function readGameAuthorityConfig(
  env: Record<string, string | undefined>,
) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid Game Authority configuration: ${parsed.error.issues
        .map((issue) => issue.path.join('.'))
        .join(', ')}`,
    );
  }
  return {
    host: parsed.data.GAME_AUTHORITY_HOST,
    port: parsed.data.GAME_AUTHORITY_PORT,
    token: parsed.data.GAME_AUTHORITY_SERVICE_TOKEN,
    timeoutMs: parsed.data.GAME_AUTHORITY_TIMEOUT_MS,
  };
}
