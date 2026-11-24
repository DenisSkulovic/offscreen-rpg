import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogFromRows } from '../src/adapters/dev-sql-tenant-live-adapter.mjs';

test('live catalog rows preserve the dev owner and default PUBLIC ACL', () => {
  const databases = catalogFromRows('datname|owner|allow|acl\ndev|dev|t|<default-public>\ntemplate1|postgres|t|=c/postgres,postgres=CTc/postgres\n(2 rows)');
  assert.equal(databases.dev.owner, 'dev');
  assert.equal(databases.dev.publicConnect, true);
  assert.equal(databases.template1.publicConnect, true);
  assert.equal(databases.template1.publicTemporary, false);
});

test('explicit CONNECT grants do not keep PUBLIC', () => {
  const databases = catalogFromRows('h\ndev_1|dev_1_mig|f|dev_1_mig=c/postgres,dev_1_run=c/postgres\n');
  assert.equal(databases.dev_1.publicConnect, false);
  assert.deepEqual(databases.dev_1.connect, ['dev_1_mig', 'dev_1_run']);
  assert.equal(databases.dev_1.allowConnections, false);
});
