import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDevTenantMigration, assertDevRuntimeReady, devTenantMigrationPrep } from './dev-sql-tenant-grants.mjs';

test('migration CREATE is granted before Drizzle and the gate follows verification', async () => {
  const applied = [];
  const result = await applyDevTenantMigration({
    slotId: 'dev-1',
    currentUser: 'dev_1_mig',
    authorizeLive: 'dev-1-migration-live',
    applyMigrations(options) {
      assert.equal(options.role, 'dev_1_mig');
      assert.equal(options.lock, 683291351);
      assert.deepEqual(applied, devTenantMigrationPrep('dev-1'));
      applied.push('migrate');
    },
    execSql(sql) {
      applied.push(sql);
    },
    verify: () => ({ ok: true, appliedMigrations: 25 }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.appliedMigrations, 25);
  const migrateAt = applied.indexOf('migrate');
  assert.ok(applied.slice(0, migrateAt).every((sql) => sql.includes('dev_1_mig') || sql.includes('PUBLIC')));
  assert.equal(applied.slice(0, migrateAt).some((sql) => sql.includes('dev_1_run')), false);
  assert.ok(applied.at(-3).includes('offscreen_dev_schema_gate'));
  assert.match(applied.at(-2), /migrations\) VALUES \('dev-1', 25\)/);
  const again = await applyDevTenantMigration({
    slotId: 'dev-1',
    currentUser: 'dev_1_mig',
    authorizeLive: 'dev-1-migration-live',
    applyMigrations() {},
    execSql() {},
    verify: () => ({ ok: true, appliedMigrations: 25 }),
  });
  assert.equal(again.ok, true);
});

test('a failed verification does not mark the schema ready', async () => {
  const applied = [];
  const result = await applyDevTenantMigration({
    slotId: 'dev-1',
    currentUser: 'dev_1_mig',
    authorizeLive: 'dev-1-migration-live',
    applyMigrations() {},
    execSql(sql) {
      applied.push(sql);
    },
    verify: () => ({ ok: false, appliedMigrations: 0 }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'schema-not-verified');
  assert.equal(applied.some((sql) => sql.includes('offscreen_dev_schema_gate')), false);
  assert.equal(assertDevRuntimeReady({ slotId: 'dev-1', currentUser: 'dev_1_run', gatePresent: true, schemaCreate: false, appliedMigrations: 24, expectedMigrations: 25 }).refusals[0].id, 'migrations-incomplete');
});

test('runtime startup waits for a complete gate and rejects DDL-capable or foreign roles', () => {
  assert.equal(assertDevRuntimeReady({ slotId: 'dev-1', currentUser: 'dev_1_run', gatePresent: false, schemaCreate: false, appliedMigrations: 25, expectedMigrations: 25 }).ok, false);
  assert.equal(assertDevRuntimeReady({ slotId: 'dev-1', currentUser: 'dev_1_run', gatePresent: true, schemaCreate: true, appliedMigrations: 25, expectedMigrations: 25 }).refusals[0].id, 'runtime-can-create');
  assert.equal(assertDevRuntimeReady({ slotId: 'dev-1', currentUser: 'dev_2_run', gatePresent: true, schemaCreate: false, appliedMigrations: 25, expectedMigrations: 25 }).refusals[0].id, 'runtime-role');
  assert.equal(assertDevRuntimeReady({ slotId: 'dev-1', currentUser: 'dev_1_run', gatePresent: true, schemaCreate: false, appliedMigrations: 25, expectedMigrations: 25 }).ok, true);
});

test('superuser, runtime login, and missing authorization do not migrate', async () => {
  const calls = [];
  const exec = () => calls.push('sql');
  assert.equal((await applyDevTenantMigration({ slotId: 'dev-1', currentUser: 'postgres', authorizeLive: 'dev-1-migration-live', applyMigrations() {}, execSql: exec })).refusals[0].id, 'migration-role');
  assert.equal((await applyDevTenantMigration({ slotId: 'dev-1', currentUser: 'dev_1_run', authorizeLive: 'dev-1-migration-live', applyMigrations() {}, execSql: exec })).refusals[0].id, 'migration-role');
  assert.equal((await applyDevTenantMigration({ slotId: 'dev-1', currentUser: 'dev_1_mig', authorizeLive: true, applyMigrations() {}, execSql: exec })).refusals[0].id, 'migration-not-authorized');
  assert.equal(calls.length, 0);
});

test('an allocated slot migrates under its own migration role', async () => {
  let migrated = 0;
  const result = await applyDevTenantMigration({
    slotId: 'dev-2',
    currentUser: 'dev_2_mig',
    authorizeLive: 'dev-1-migration-live',
    applyMigrations() { migrated += 1; },
    execSql() {},
    verify: async () => ({ ok: true, appliedMigrations: 25 }),
  });
  assert.equal(result.ok, true);
  assert.equal(migrated, 1);
  assert.equal(result.appliedMigrations, 25);
});

test('a non-dev-1 slot uses the dev-cluster migration authorization', async () => {
  const result = await applyDevTenantMigration({
    slotId: 'dev-3',
    currentUser: 'dev_3_mig',
    authorizeLive: 'kind-offscreen-dev-sql-migration-live',
    applyMigrations() {},
    execSql() {},
    verify: async () => ({ ok: true, appliedMigrations: 25 }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.owner, 'dev_3_mig');
});
