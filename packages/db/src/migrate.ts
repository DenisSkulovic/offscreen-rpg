import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { MigrationConfig, MigrationMeta } from 'drizzle-orm/migrator';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres/session';
import type { PgDialect } from 'drizzle-orm/pg-core/dialect';
import type { PgSession } from 'drizzle-orm/pg-core/session';
import type { DatabaseConfig } from './config';
import {
  assertAppliedPrefix,
  validateMigrationJournal,
  type AppliedMigrationLedgerRow,
} from './migrations/journal';
import {
  runMigrationWithOps,
  type MigrationRunnerOps,
} from './migrations/runner';

const migrationLock = 683291351;

type NodePgDatabaseMigrationAccess = {
  dialect: PgDialect;
  session: PgSession<
    NodePgQueryResultHKT,
    Record<string, never>,
    Record<string, never>
  >;
};

function stripManagedConfig(
  config: DatabaseConfig & { managed?: unknown },
): DatabaseConfig {
  if (!('managed' in config)) {
    return config;
  }
  const clientConfig: DatabaseConfig & { managed?: unknown } = { ...config };
  delete clientConfig.managed;
  return clientConfig;
}

async function drizzleMigrateVerified(
  client: Client,
  entries: MigrationMeta[],
  migrationsFolder: string,
): Promise<void> {
  const db = drizzle(client) as unknown as NodePgDatabaseMigrationAccess;
  const migrateConfig: MigrationConfig = {
    migrationsFolder,
    migrationsSchema: 'drizzle',
    migrationsTable: '__drizzle_migrations',
  };
  await db.dialect.migrate(entries, db.session, migrateConfig);
}

export async function applyMigrations(
  config: DatabaseConfig & { managed?: unknown },
  migrationsFolder: string,
): Promise<void> {
  const verifiedEntries = validateMigrationJournal(migrationsFolder);
  const clientConfig = stripManagedConfig(config);

  const client = new Client(clientConfig);
  let connectionError: Error | undefined;
  client.on('error', (error: Error) => {
    connectionError = error;
  });

  const lockTimeoutMs = Math.min(2000, clientConfig.statement_timeout);

  const ops: MigrationRunnerOps = {
    async connect() {
      await client.connect();
    },
    async tryLock() {
      const lock = await client.query<{ acquired: boolean }>(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [migrationLock],
      );
      return lock.rows[0]?.acquired === true;
    },
    async setLockTimeout() {
      await client.query('SELECT set_config($1, $2, false)', [
        'lock_timeout',
        `${lockTimeoutMs}ms`,
      ]);
    },
    async readLedger() {
      const exists = await client.query<{ ledger: string | null }>(
        "SELECT to_regclass('drizzle.__drizzle_migrations') AS ledger",
      );
      if (!exists.rows[0]?.ledger) {
        return [];
      }
      const result = await client.query<AppliedMigrationLedgerRow>(
        'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id ASC',
      );
      return result.rows;
    },
    async migrateVerified(entries: MigrationMeta[]) {
      await drizzleMigrateVerified(client, entries, migrationsFolder);
    },
    async close() {
      await client.end();
    },
    get connectionError(): Error | undefined {
      return connectionError;
    },
  };

  await runMigrationWithOps(ops, verifiedEntries, (rows) => {
    assertAppliedPrefix(verifiedEntries, rows);
  });
}
