import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readDatabaseConfig } from '../src/config';

test('requires an explicit PostgreSQL database and never echoes its URL', () => {
  for (const value of [
    undefined,
    '',
    'https://user:secret@host/db',
    'postgres://host',
    'secret',
  ]) {
    assert.throws(() => readDatabaseConfig({ DATABASE_URL: value }), {
      message: 'Invalid database configuration: DATABASE_URL',
    });
  }
  assert.equal(
    readDatabaseConfig({
      DATABASE_URL: 'postgresql://user:password@localhost/db',
    }).max,
    5,
  );
});

test('pool and timeout limits reject unbounded or malformed settings', () => {
  const base = { DATABASE_URL: 'postgres://localhost/db' };
  for (const value of ['0', '-1', '101', '1.2', '', 'unlimited']) {
    assert.throws(() => readDatabaseConfig({ ...base, DB_POOL_MAX: value }));
  }
  for (const key of [
    'DB_CONNECT_TIMEOUT_MS',
    'DB_STATEMENT_TIMEOUT_MS',
    'DB_IDLE_TRANSACTION_TIMEOUT_MS',
  ]) {
    assert.throws(() => readDatabaseConfig({ ...base, [key]: '0' }));
  }
});

test('managed queue and acquire timeout defaults are applied from env', () => {
  const config = readDatabaseConfig({
    DATABASE_URL: 'postgres://localhost/db',
  });
  assert.deepEqual(config.managed, {
    queueLimit: 20,
    acquireTimeoutMs: 5000,
  });
});

test('managed queue and acquire timeout reject malformed values', () => {
  const base = { DATABASE_URL: 'postgres://localhost/db' };
  for (const value of ['0', '-1', '1001', '1.5', '', 'unbounded']) {
    assert.throws(() =>
      readDatabaseConfig({ ...base, DB_MANAGED_QUEUE_MAX: value }),
    );
  }
  for (const value of ['0', '-1', '60001', '1.5', '', 'unbounded']) {
    assert.throws(() =>
      readDatabaseConfig({ ...base, DB_MANAGED_ACQUIRE_TIMEOUT_MS: value }),
    );
  }
});

test('readDatabaseConfig does not echo the connection string in validation errors', () => {
  const secret = 'postgresql://user:supersecret@localhost/secret-db';
  assert.throws(
    () =>
      readDatabaseConfig({
        DATABASE_URL: secret,
        DB_POOL_MAX: '0',
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.doesNotMatch(error.message, /supersecret/);
      assert.doesNotMatch(error.message, /secret-db/);
      return true;
    },
  );
});
