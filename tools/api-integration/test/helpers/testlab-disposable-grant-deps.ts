import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Database } from '@offscreen/db';

const repoRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../..',
);
const {
  OFFSCREEN_WRITER_EXECUTION_MODE_ENV,
  WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
} = await import(
  pathToFileURL(join(repoRoot, 'scripts/repo-tools/testlab-target-guard.mjs'))
    .href
);
/** Drizzle transaction hook expected by `ensureTestlabGrant`. */
export function createTestlabGrantStore(database: Database): {
  withTransaction: (
    fn: (tx: {
      query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    }) => Promise<unknown>,
  ) => Promise<unknown>;
} {
  const client = database.db.$client;
  return {
    async withTransaction(fn) {
      await client.query('BEGIN');
      try {
        const result = await fn({
          query: (sql: string, params?: unknown[]) => client.query(sql, params),
        });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    },
  };
}

export function createTestlabFundingDeps(
  database: Database,
  options: { now?: () => number } = {},
) {
  const client = database.db.$client;
  const grantStore = createTestlabGrantStore(database);
  return {
    grantStore,
    queryReadOnly: (sql: string, params?: unknown[]) =>
      client.query(sql, params),
    observeDisposableTarget: async () => ({
      target: 'disposable' as const,
      runtimeMode: 'test-container' as const,
      localEnv: {
        [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]:
          WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
      },
    }),
    now: options.now ?? (() => Date.now()),
    logError: () => {},
  };
}
