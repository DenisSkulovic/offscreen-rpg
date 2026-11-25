import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  rmdir,
  readFile,
  copyFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { AppliedMigrationPrefixError } from '../src/migrations/journal';
import { sql } from 'drizzle-orm';
import { Client, type PoolClient, type QueryResult } from 'pg';
import { createDatabase, readDatabaseConfig, DatabaseTransactionError } from '../src';
import { applyMigrations } from '../src/migrate';
import { createManagedClientRuntime } from '../src/connection/managed-client';
import { executeManagedTransaction } from '../src/transaction/execute';
import type { TransactionPolicy } from '../src/transaction/policy';

const url = process.env['DATABASE_TEST_URL'];
if (!url) {
  throw new Error(
    'DATABASE_TEST_URL is required. Use an operator-confirmed dedicated disposable offscreen_db_test on loopback only; never a shared tenant or production database.',
  );
}
const parsedTestUrl = new URL(url);
if (parsedTestUrl.pathname !== '/offscreen_db_test') {
  throw new Error(
    'DATABASE_TEST_URL must explicitly target the disposable offscreen_db_test database.',
  );
}
const testHost = parsedTestUrl.hostname;
if (testHost !== '127.0.0.1' && testHost !== 'localhost') {
  throw new Error(
    'DATABASE_TEST_URL must use loopback host 127.0.0.1 or localhost.',
  );
}
const config = readDatabaseConfig({ DATABASE_URL: url });
const fixtures = resolve(__dirname, '../../test/fixtures/migrations');

function componentPolicy(
  overrides: Partial<TransactionPolicy> = {},
): TransactionPolicy {
  return {
    name: 'worker.batch',
    workload: 'worker',
    isolation: 'read committed',
    readOnly: false,
    retry: 'none',
    timeoutMs: 10_000,
    statementTimeoutMs: 8_000,
    lockTimeoutMs: 2_000,
    ...overrides,
  };
}

function okQueryResult(command: string): QueryResult {
  return { command, rowCount: 0, rows: [], oid: 0, fields: [] };
}

function findSqlStateCode(error: unknown, code: string): boolean {
  let current: unknown = error;
  while (current instanceof Error) {
    const withCode = current as Error & { code?: string };
    if (withCode.code === code) {
      return true;
    }
    current = current.cause;
  }
  return false;
}

test('PostgreSQL persistence component', async (t) => {
  const admin = new Client(config);
  await admin.connect();
  const backgroundErrors: Error[] = [];
  const database = createDatabase(config, (error) =>
    backgroundErrors.push(error),
  );
  try {
    // The command targets a dedicated disposable database, never the development data.
    await admin.query(
      'DROP TABLE IF EXISTS db_component_fixture, db_failed_fixture',
    );
    await admin.query('DROP SCHEMA IF EXISTS drizzle CASCADE');

    await t.test('migration commits once and reruns safely', async () => {
      await applyMigrations(config, fixtures);
      await database.db.execute(
        sql`INSERT INTO db_component_fixture VALUES (1, 10)`,
      );
      await applyMigrations(config, fixtures);
      const result = await admin.query(
        'SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations',
      );
      assert.equal(result.rows[0].count, 1);
    });

    await t.test(
      'competing migration runner is rejected without changing state',
      async () => {
        await admin.query('SELECT pg_advisory_lock(683291351)');
        try {
          await assert.rejects(
            applyMigrations(config, fixtures),
            /Another database migration/,
          );
        } finally {
          await admin.query('SELECT pg_advisory_unlock(683291351)');
        }
        await applyMigrations(config, fixtures);
      },
    );

    await t.test(
      'failed SQL rolls back migration DDL and releases the lock',
      async () => {
        const folder = await mkdtemp(resolve(tmpdir(), 'offscreen-migration-'));
        const fixtureJournal = JSON.parse(
          await readFile(resolve(fixtures, 'meta/_journal.json'), 'utf8'),
        ) as {
          version: string;
          dialect: string;
          entries: Array<Record<string, unknown>>;
        };
        try {
          await mkdir(resolve(folder, 'meta'));
          await copyFile(
            resolve(fixtures, '0000_fixture.sql'),
            resolve(folder, '0000_fixture.sql'),
          );
          await writeFile(
            resolve(folder, '0001_fail.sql'),
            'CREATE TABLE db_failed_fixture (id integer);\n--> statement-breakpoint\nSELECT 1 / 0;',
          );
          await writeFile(
            resolve(folder, 'meta/_journal.json'),
            JSON.stringify({
              version: fixtureJournal.version,
              dialect: fixtureJournal.dialect,
              entries: [
                ...fixtureJournal.entries,
                {
                  idx: 1,
                  version: '7',
                  when: 2,
                  tag: '0001_fail',
                  breakpoints: true,
                },
              ],
            }),
          );
          await assert.rejects(
            applyMigrations(config, folder),
            (error: unknown) => {
              assert.ok(
                findSqlStateCode(error, '22012'),
                'expected divide-by-zero SQLSTATE 22012',
              );
              return true;
            },
          );
          const failedTable = await admin.query(
            "SELECT to_regclass('db_failed_fixture') AS table_name",
          );
          assert.equal(failedTable.rows[0].table_name, null);
          const allLedger = await admin.query<{
            id: number;
            created_at: string;
          }>(
            'SELECT id, created_at FROM drizzle.__drizzle_migrations ORDER BY id ASC',
          );
          assert.equal(allLedger.rows.length, 1);
          const applied = allLedger.rows[0];
          if (applied === undefined) {
            throw new Error('expected the original fixture ledger row');
          }
          assert.equal(applied.created_at, '1');
          await applyMigrations(config, fixtures);
        } finally {
          await rm(resolve(folder, '0000_fixture.sql'), { force: true });
          await rm(resolve(folder, '0001_fail.sql'), { force: true });
          await rm(resolve(folder, 'meta/_journal.json'), { force: true });
          await rmdir(resolve(folder, 'meta'));
          await rmdir(folder);
        }
      },
    );

    await t.test('tampered applied hash is refused before DDL', async () => {
      const before = await admin.query(
        'SELECT * FROM db_component_fixture ORDER BY id',
      );
      const row = await admin.query<{ id: number; hash: string }>(
        'SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY id ASC LIMIT 1',
      );
        const original = row.rows[0];
        if (original === undefined) {
          throw new Error('expected the fixture ledger row');
        }
        const originalHash = original.hash;
        try {
          await admin.query(
            'UPDATE drizzle.__drizzle_migrations SET hash = $1 WHERE id = $2',
            ['0'.repeat(64), original.id],
          );
        await assert.rejects(
          applyMigrations(config, fixtures),
          AppliedMigrationPrefixError,
        );
        const after = await admin.query(
          'SELECT * FROM db_component_fixture ORDER BY id',
        );
        assert.deepEqual(after.rows, before.rows);
        const stillOne = await admin.query<{ count: number }>(
          'SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations',
        );
          const stillOneCount = stillOne.rows[0];
          if (stillOneCount === undefined) {
            throw new Error('expected a ledger count');
          }
          assert.equal(stillOneCount.count, 1);
        } finally {
          await admin.query(
            'UPDATE drizzle.__drizzle_migrations SET hash = $1 WHERE id = $2',
            [originalHash, original.id],
          );
      }
    });

    await t.test('unknown extra ledger row is refused before DDL', async () => {
      const before = await admin.query(
        'SELECT * FROM db_component_fixture ORDER BY id',
      );
      let insertedId: number | undefined;
      try {
        const inserted = await admin.query<{ id: number }>(
          `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
             VALUES ($1, $2)
             RETURNING id`,
          ['f'.repeat(64), '999'],
        );
          const insertedRow = inserted.rows[0];
          if (insertedRow === undefined) {
            throw new Error('expected the inserted ledger id');
          }
          insertedId = insertedRow.id;
        await assert.rejects(
          applyMigrations(config, fixtures),
          AppliedMigrationPrefixError,
        );
        const after = await admin.query(
          'SELECT * FROM db_component_fixture ORDER BY id',
        );
        assert.deepEqual(after.rows, before.rows);
      } finally {
        if (insertedId !== undefined) {
          await admin.query(
            'DELETE FROM drizzle.__drizzle_migrations WHERE id = $1',
            [insertedId],
          );
        }
      }
    });

    await t.test('managed transaction commits a successful update', async () => {
      await admin.query('UPDATE db_component_fixture SET amount = 10 WHERE id = 1');
      await database.transaction(componentPolicy(), async (tx) => {
        await tx.execute(
          sql`UPDATE db_component_fixture SET amount = 20 WHERE id = 1`,
        );
      });
      const result = await admin.query(
        'SELECT amount FROM db_component_fixture WHERE id = 1',
      );
      assert.equal(result.rows[0]?.amount, 20);
    });

    await t.test(
      'managed transaction rolls back when the callback rejects',
      async () => {
        await admin.query(
          'UPDATE db_component_fixture SET amount = 10 WHERE id = 1',
        );
        const rejection = new Error('managed callback rejection');
        await assert.rejects(
          database.transaction(componentPolicy(), async (tx) => {
            await tx.execute(
              sql`UPDATE db_component_fixture SET amount = 30 WHERE id = 1`,
            );
            throw rejection;
          }),
          (error: unknown) => {
            assert.ok(error instanceof DatabaseTransactionError);
            assert.equal(error.cause, rejection);
            return true;
          },
        );
        const result = await admin.query(
          'SELECT amount FROM db_component_fixture WHERE id = 1',
        );
        assert.equal(result.rows[0]?.amount, 10);
      },
    );

    await t.test(
      'managed read-only transaction refuses writes and leaves rows unchanged',
      async () => {
        await admin.query(
          'UPDATE db_component_fixture SET amount = 10 WHERE id = 1',
        );
        await assert.rejects(
          database.transaction(
            componentPolicy({ readOnly: true }),
            async (tx) => {
              await tx.execute(
                sql`UPDATE db_component_fixture SET amount = 99 WHERE id = 1`,
              );
            },
          ),
        );
        const result = await admin.query(
          'SELECT amount FROM db_component_fixture WHERE id = 1',
        );
        assert.equal(result.rows[0]?.amount, 10);
      },
    );

    await t.test(
      'managed lock timeout is typed and the pool recovers on the next lease',
      async () => {
        const holder = new Client(config);
        await holder.connect();
        try {
          await holder.query('BEGIN');
          await holder.query(
            'SELECT * FROM db_component_fixture WHERE id = 1 FOR UPDATE',
          );
          await assert.rejects(
            database.transaction(
              componentPolicy({ lockTimeoutMs: 50 }),
              async (tx) => {
                await tx.execute(
                  sql`UPDATE db_component_fixture SET amount = 40 WHERE id = 1`,
                );
              },
            ),
            (error: unknown) => {
              assert.ok(error instanceof DatabaseTransactionError);
              assert.equal(error.category, 'lock-timeout');
              return true;
            },
          );
        } finally {
          await holder.query('ROLLBACK');
          await holder.end();
        }
        await database.transaction(
          componentPolicy({ lockTimeoutMs: 2_000 }),
          async (tx) => {
            await tx.execute(
              sql`UPDATE db_component_fixture SET amount = 41 WHERE id = 1`,
            );
          },
        );
        const result = await admin.query(
          'SELECT amount FROM db_component_fixture WHERE id = 1',
        );
        assert.equal(result.rows[0]?.amount, 41);
        await database.checkConnection();
      },
    );

    await t.test(
      'serializable concurrent updates retry once and increment exactly twice',
      async () => {
        await admin.query(
          'UPDATE db_component_fixture SET amount = 10 WHERE id = 1',
        );
        const pair = createDatabase(
          { ...config, max: 2 },
          (error) => backgroundErrors.push(error),
        );
        let readsDone = 0;
        let releaseReads!: () => void;
        const bothRead = new Promise<void>((resolve) => {
          releaseReads = resolve;
        });
        let attemptA = 0;
        let attemptB = 0;
        try {
          const runSide = async (side: 'a' | 'b') => {
            await pair.transaction(
              componentPolicy({
                isolation: 'serializable',
                retry: 'sql-only-conflicts',
                timeoutMs: 30_000,
              }),
              async (tx) => {
                const attempts = side === 'a' ? attemptA : attemptB;
                if (side === 'a') {
                  attemptA += 1;
                } else {
                  attemptB += 1;
                }
                await tx.execute(
                  sql`SELECT amount FROM db_component_fixture WHERE id = 1`,
                );
                readsDone += 1;
                if (readsDone === 2) {
                  releaseReads();
                }
                if (attempts === 0) {
                  await bothRead;
                }
                await tx.execute(
                  sql`UPDATE db_component_fixture SET amount = amount + 1 WHERE id = 1`,
                );
              },
            );
          };
          await Promise.all([runSide('a'), runSide('b')]);
          const result = await admin.query(
            'SELECT amount FROM db_component_fixture WHERE id = 1',
          );
          assert.equal(result.rows[0]?.amount, 12);
          assert.equal(attemptA + attemptB, 3);
        } finally {
          await pair.close();
        }
      },
    );

    await t.test(
      'managed admission saturates a third waiter while one active and one queued complete',
      async () => {
        const limited = createDatabase(
          {
            ...config,
            max: 1,
            managed: { queueLimit: 1, acquireTimeoutMs: 5_000 },
          },
          (error) => backgroundErrors.push(error),
        );
        let releaseActive!: () => void;
        const holdActive = new Promise<void>((resolve) => {
          releaseActive = resolve;
        });
        let activeEntered!: () => void;
        const activeReady = new Promise<void>((resolve) => {
          activeEntered = resolve;
        });
        const activeTx = limited.transaction(
          componentPolicy({ timeoutMs: 60_000 }),
          async () => {
            activeEntered();
            await holdActive;
          },
        );
        await activeReady;

        let queuedEntered!: () => void;
        const queuedReady = new Promise<void>((resolve) => {
          queuedEntered = resolve;
        });
        const queuedTx = limited.transaction(
          componentPolicy({ timeoutMs: 60_000 }),
          async (tx) => {
            queuedEntered();
            await tx.execute(sql`SELECT 1`);
          },
        );
        await queuedReady;

        await assert.rejects(
          limited.transaction(componentPolicy(), async (tx) => {
            await tx.execute(sql`SELECT 1`);
          }),
          (error: unknown) => {
            assert.ok(error instanceof DatabaseTransactionError);
            assert.equal(error.category, 'saturated');
            return true;
          },
        );

        releaseActive();
        await Promise.all([activeTx, queuedTx]);
        await limited.checkConnection();
        await limited.close();
      },
    );

    await t.test(
      'deterministic commit-unknown fixture discards client without killing live connections',
      async () => {
        const transportError = new Error('fixture commit transport loss');
        const recordingClient = {
          queries: [] as string[],
          releases: 0,
          discardCalls: 0,
          async query(text: string): Promise<QueryResult> {
            this.queries.push(text);
            if (text === 'BEGIN ISOLATION LEVEL READ COMMITTED') {
              return okQueryResult('BEGIN');
            }
            if (text.startsWith('SELECT set_config')) {
              return okQueryResult('SELECT');
            }
            if (text === 'COMMIT') {
              throw transportError;
            }
            if (text === 'ROLLBACK') {
              return okQueryResult('ROLLBACK');
            }
            return okQueryResult('SELECT');
          },
          release(err?: Error | boolean) {
            this.releases += 1;
            if (err === true) {
              this.discardCalls += 1;
            }
          },
        } as PoolClient & {
          queries: string[];
          releases: number;
          discardCalls: number;
        };

        const runtime = createManagedClientRuntime<PoolClient>({
          maxActive: 1,
          maxQueued: 0,
          acquireTimeoutMs: 5_000,
          connect: async () => recordingClient,
          end: async () => {},
        });

        await assert.rejects(
          executeManagedTransaction(
            {
              withClient: runtime.withClient.bind(runtime),
              onBackgroundError: () => {},
            },
            componentPolicy(),
            async () => 'done',
          ),
          (error: unknown) => {
            assert.ok(error instanceof DatabaseTransactionError);
            assert.equal(error.category, 'commit-unknown');
            return true;
          },
        );
        assert.equal(recordingClient.discardCalls, 1);
        assert.equal(
          recordingClient.queries.filter((text) => text === 'ROLLBACK').length,
          0,
        );
      },
    );

    await t.test(
      'transaction constraint failure rolls back all preceding writes',
      async () => {
        await assert.rejects(
          database.db.transaction(async (tx) => {
            await tx.execute(
              sql`UPDATE db_component_fixture SET amount = 5 WHERE id = 1`,
            );
            await tx.execute(
              sql`INSERT INTO db_component_fixture VALUES (2, -1)`,
            );
          }),
        );
        const result = await admin.query(
          'SELECT * FROM db_component_fixture ORDER BY id',
        );
        assert.deepEqual(result.rows, [{ id: 1, amount: 10 }]);
        await database.checkConnection();
      },
    );

    await t.test(
      'server statement timeout cancels work and leaves the pool usable',
      async () => {
        const limited = createDatabase(
          { ...config, statement_timeout: 50 },
          (error) => backgroundErrors.push(error),
        );
        try {
          await assert.rejects(
            limited.db.execute(sql`SELECT pg_sleep(1)`),
            (error: unknown) => {
              assert.ok(error instanceof Error);
              assert.ok(error.cause instanceof Error && 'code' in error.cause);
              assert.equal(error.cause.code, '57014');
              return true;
            },
          );
          await limited.checkConnection();
        } finally {
          await limited.close();
        }
      },
    );

    await t.test(
      'one-client pool bounds waiting and recovers when a transaction releases it',
      async () => {
        const limited = createDatabase(
          { ...config, max: 1, connectionTimeoutMillis: 100 },
          (error) => backgroundErrors.push(error),
        );
        let release!: () => void;
        let entered!: () => void;
        const held = new Promise<void>((resolve) => {
          release = resolve;
        });
        const acquired = new Promise<void>((resolve) => {
          entered = resolve;
        });
        const transaction = limited.db.transaction(async () => {
          entered();
          await held;
        });
        try {
          await Promise.race([acquired, transaction]);
          await assert.rejects(limited.checkConnection(), /timeout/);
        } finally {
          release();
          await transaction;
          await limited.checkConnection();
          await limited.close();
        }
      },
    );

    await t.test(
      'an idle connection failure is reported and the pool reconnects',
      async () => {
        let report!: (error: Error) => void;
        const reported = new Promise<Error>((resolve) => {
          report = resolve;
        });
        const recovering = createDatabase(config, report);
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          const result = await recovering.db.execute<{ pid: number }>(
            sql`SELECT pg_backend_pid() AS pid`,
          );
          await admin.query('SELECT pg_terminate_backend($1)', [
            result.rows[0]?.pid,
          ]);
          const error = await Promise.race([
            reported,
            new Promise<never>((_, reject) => {
              timeout = setTimeout(
                () => reject(new Error('Idle failure was not reported')),
                5000,
              );
            }),
          ]);
          assert.ok(error instanceof Error);
          await recovering.checkConnection();
        } finally {
          clearTimeout(timeout);
          await recovering.close();
        }
      },
    );

    await t.test(
      'close is repeatable and subsequent queries fail',
      async () => {
        await Promise.all([database.close(), database.close()]);
        await assert.rejects(database.checkConnection());
      },
    );
    assert.deepEqual(backgroundErrors, []);
  } finally {
    await database.close();
    await admin.query(
      'DROP TABLE IF EXISTS db_component_fixture, db_failed_fixture',
    );
    await admin.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
    await admin.end();
  }
});
