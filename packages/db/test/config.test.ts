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
