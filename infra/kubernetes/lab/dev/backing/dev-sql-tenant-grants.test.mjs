import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDevTenantMigration, assertDevRuntimeReady, devTenantGrantStatements } from './dev-sql-tenant-grants.mjs';

test('dev-1 grants keep ownership with the migration role and give runtime DML only', () => {
  const statements = devTenantGrantStatements('dev-1');
  assert.match(statements.join('\n'), /GRANT USAGE, CREATE ON SCHEMA public TO "dev_1_mig"/);
  assert.match(statements.join('\n'), /REVOKE CREATE ON SCHEMA public FROM "dev_1_run"/);
  assert.match(statements.join('\n'), /GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES/);
  assert.equal(statements.some((sql) => sql.includes('dev_2') || sql.includes('postgres')), false);
  const applied = [];
  const result = applyDevTenantMigration({
    slotId: 'dev-1',
    currentUser: 'dev_1_mig',
    authorizeLive: 'dev-1-migration-live',
    applyMigrations(options) {
      assert.equal(options.role, 'dev_1_mig');
      assert.equal(options.searchPath, 'public');
      assert.equal(options.lock, 683291351);
    },
    execSql(sql) {
      applied.push(sql);
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(applied, statements);
  const again = applyDevTenantMigration({
    slotId: 'dev-1',
    currentUser: 'dev_1_mig',
    authorizeLive: 'dev-1-migration-live',
    applyMigrations() {},
    execSql(sql) {
      applied.push(sql);
    },
  });
  assert.equal(again.ok, true);
  assert.equal(applied.length, statements.length * 2);
});

test('runtime startup waits for the gate and rejects DDL-capable or foreign roles', () => {
  assert.equal(assertDevRuntimeReady({ slotId: 'dev-1', currentUser: 'dev_1_run', gatePresent: false, schemaCreate: false }).ok, false);
  assert.equal(assertDevRuntimeReady({ slotId: 'dev-1', currentUser: 'dev_1_run', gatePresent: true, schemaCreate: true }).refusals[0].id, 'runtime-can-create');
  assert.equal(assertDevRuntimeReady({ slotId: 'dev-1', currentUser: 'dev_2_run', gatePresent: true, schemaCreate: false }).refusals[0].id, 'runtime-role');
  assert.equal(assertDevRuntimeReady({ slotId: 'dev-1', currentUser: 'dev_1_run', gatePresent: true, schemaCreate: false }).ok, true);
});

test('superuser, runtime login, dev-2 and missing authorization do not migrate', () => {
  const calls = [];
  const exec = () => calls.push('sql');
  assert.equal(applyDevTenantMigration({ slotId: 'dev-1', currentUser: 'postgres', authorizeLive: 'dev-1-migration-live', applyMigrations() {}, execSql: exec }).refusals[0].id, 'migration-role');
  assert.equal(applyDevTenantMigration({ slotId: 'dev-1', currentUser: 'dev_1_run', authorizeLive: 'dev-1-migration-live', applyMigrations() {}, execSql: exec }).refusals[0].id, 'migration-role');
  assert.equal(applyDevTenantMigration({ slotId: 'dev-2', currentUser: 'dev_2_mig', authorizeLive: 'dev-1-migration-live', applyMigrations() {}, execSql: exec }).refusals[0].id, 'slot-not-in-scope');
  assert.equal(applyDevTenantMigration({ slotId: 'dev-1', currentUser: 'dev_1_mig', authorizeLive: true, applyMigrations() {}, execSql: exec }).refusals[0].id, 'migration-not-authorized');
  assert.equal(calls.length, 0);
});
