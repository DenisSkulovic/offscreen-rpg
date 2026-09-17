import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { mkdtemp, mkdir, writeFile, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { sql } from 'drizzle-orm';
import { Client } from 'pg';
import { createDatabase, readDatabaseConfig } from '../src';
import { applyMigrations } from '../src/migrate';

const url = process.env['DATABASE_TEST_URL'];
if (!url || new URL(url).pathname !== '/offscreen_db_test') {
  throw new Error(
    'DATABASE_TEST_URL must explicitly target the disposable offscreen_db_test database.',
  );
}
const config = readDatabaseConfig({ DATABASE_URL: url });
const fixtures = resolve(__dirname, '../../test/fixtures/migrations');

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
        try {
          await mkdir(resolve(folder, 'meta'));
          await writeFile(
            resolve(folder, 'meta/_journal.json'),
            JSON.stringify({
              version: '7',
              dialect: 'postgresql',
              entries: [
                {
                  idx: 0,
                  version: '7',
                  when: 2,
                  tag: '0001_fail',
                  breakpoints: true,
                },
              ],
            }),
          );
          await writeFile(
            resolve(folder, '0001_fail.sql'),
            'CREATE TABLE db_failed_fixture (id integer);\n--> statement-breakpoint\nSELECT 1 / 0;',
          );
          await assert.rejects(applyMigrations(config, folder));
          const result = await admin.query(
            "SELECT to_regclass('db_failed_fixture') AS table_name",
          );
          assert.equal(result.rows[0].table_name, null);
          await applyMigrations(config, fixtures);
        } finally {
          await rm(resolve(folder, '0001_fail.sql'), { force: true });
          await rm(resolve(folder, 'meta/_journal.json'), { force: true });
          await rmdir(resolve(folder, 'meta'));
          await rmdir(folder);
        }
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
          await assert.rejects(limited.db.execute(sql`SELECT pg_sleep(1)`), {
            cause: { code: '57014' },
          });
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
            result.rows[0]!.pid,
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
