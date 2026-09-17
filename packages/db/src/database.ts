import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { DatabaseConfig } from './config';

export function createDatabase(
  config: DatabaseConfig,
  onBackgroundError: (error: Error) => void,
) {
  const pool = new Pool(config);
  // Idle sockets can fail outside a query. The process owner supplies logging/metrics.
  pool.on('error', onBackgroundError);
  let closing: Promise<void> | undefined;

  return {
    db: drizzle(pool),
    async checkConnection(): Promise<void> {
      await pool.query('SELECT 1');
    },
    close(): Promise<void> {
      closing ??= pool.end();
      return closing;
    },
  };
}

export type Database = ReturnType<typeof createDatabase>;
