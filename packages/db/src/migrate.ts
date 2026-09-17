import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { DatabaseConfig } from './config';

// One stable, database-scoped session lock for this application's migration runner.
const migrationLock = 683291351;

export async function applyMigrations(
  config: DatabaseConfig,
  migrationsFolder: string,
) {
  const client = new Client(config);
  let connectionError: Error | undefined;
  client.on('error', (error: Error) => {
    connectionError = error;
  });
  try {
    await client.connect();
    const lock = await client.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [migrationLock],
    );
    if (!lock.rows[0]?.acquired) {
      throw new Error(
        'Another database migration is running; retry after it finishes.',
      );
    }
    await migrate(drizzle(client), { migrationsFolder });
    if (connectionError) throw connectionError;
  } finally {
    // Disconnect also releases the session lock after failure or successful commit.
    await client.end();
  }
}
