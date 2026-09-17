import { z } from 'zod';

function positiveInteger(defaultValue: string, maximum: number) {
  return z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(maximum))
    .prefault(defaultValue);
}

const schema = z.object({
  DATABASE_URL: z.string().refine((value) => {
    try {
      const url = new URL(value);
      return (
        ['postgres:', 'postgresql:'].includes(url.protocol) &&
        url.hostname.length > 0 &&
        url.pathname.length > 1
      );
    } catch {
      return false;
    }
  }),
  DB_POOL_MAX: positiveInteger('5', 100),
  DB_CONNECT_TIMEOUT_MS: positiveInteger('5000', 60000),
  DB_STATEMENT_TIMEOUT_MS: positiveInteger('10000', 300000),
  DB_IDLE_TRANSACTION_TIMEOUT_MS: positiveInteger('10000', 300000),
});

export function readDatabaseConfig(env: Record<string, string | undefined>) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid database configuration: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  }
  return {
    connectionString: parsed.data.DATABASE_URL,
    max: parsed.data.DB_POOL_MAX,
    connectionTimeoutMillis: parsed.data.DB_CONNECT_TIMEOUT_MS,
    statement_timeout: parsed.data.DB_STATEMENT_TIMEOUT_MS,
    idle_in_transaction_session_timeout:
      parsed.data.DB_IDLE_TRANSACTION_TIMEOUT_MS,
    idleTimeoutMillis: 30000,
  };
}

export type DatabaseConfig = ReturnType<typeof readDatabaseConfig>;
