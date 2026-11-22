import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRuntimeDatabaseUrl } from './dev-slot-runtime-url.mjs';

test('runtime url uses the slot role and rejects migration or shared dev', () => {
  const url = buildRuntimeDatabaseUrl({
    username: 'dev_1_run',
    password: 'a b',
    database: 'dev_1',
    host: 'dev-pg-rw.offscreen-dev-postgres.svc.cluster.local:5432',
  });
  assert.equal(url, 'postgresql://dev_1_run:a%20b@dev-pg-rw.offscreen-dev-postgres.svc.cluster.local:5432/dev_1');
  assert.throws(() => buildRuntimeDatabaseUrl({ username: 'dev_1_mig', password: 'x', database: 'dev_1', host: 'dev-pg-rw.offscreen-dev-postgres.svc.cluster.local:5432' }), /runtime role/);
  assert.throws(() => buildRuntimeDatabaseUrl({ username: 'dev_1_run', password: 'x', database: 'dev', host: 'dev-pg-rw.offscreen-dev-postgres.svc.cluster.local:5432' }), /slot database/);
});
