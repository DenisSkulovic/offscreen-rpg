import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDevTenantMigration, assertDevRuntimeReady, devTenantMigrationPrep } from '../src/rendering/dev-sql-tenant-grants.mjs';

function execSqlWithGatePrivileges(applied, migrationRole = 'dev_1_mig') {
  return (sql) => {
    applied.push(sql);
    if (sql.includes('has_table_privilege')) {
      return {
        rows: [{ writer: migrationRole, runtime_insert: false, runtime_select: true }],
      };
    }
    return undefined;
  };
}

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
    execSql: execSqlWithGatePrivileges(applied),
    verify: () => ({ ok: true, appliedMigrations: 25 }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.appliedMigrations, 25);
  const migrateAt = applied.indexOf('migrate');
  assert.ok(applied.slice(0, migrateAt).every((sql) => sql.includes('dev_1_mig') || sql.includes('PUBLIC')));
  assert.equal(applied.slice(0, migrateAt).some((sql) => sql.includes('dev_1_run')), false);
  assert.ok(applied.some((sql) => sql.includes('offscreen_dev_schema_gate')));
  assert.ok(applied.some((sql) => /migrations\) VALUES \('dev-1', 25\)/.test(sql)));
  assert.ok(
    applied.some((sql) =>
      sql.includes('REVOKE INSERT, UPDATE, DELETE ON public."offscreen_dev_schema_gate"'),
    ),
  );
  const again = await applyDevTenantMigration({
    slotId: 'dev-1',
    currentUser: 'dev_1_mig',
    authorizeLive: 'dev-1-migration-live',
    applyMigrations() {},
    execSql: execSqlWithGatePrivileges([]),
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
    execSql: execSqlWithGatePrivileges(applied),
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
    execSql: execSqlWithGatePrivileges([], 'dev_2_mig'),
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
    execSql: execSqlWithGatePrivileges([], 'dev_3_mig'),
    verify: async () => ({ ok: true, appliedMigrations: 26 }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.owner, 'dev_3_mig');
  assert.equal(result.appliedMigrations, 26);
});

test('runtime gate read verification refuses a foreign runtime role', async () => {
  const result = await applyDevTenantMigration({
    slotId: 'dev-1',
    currentUser: 'dev_1_mig',
    authorizeLive: 'dev-1-migration-live',
    applyMigrations() {},
    execSql: execSqlWithGatePrivileges([]),
    verify: async () => ({ ok: true, appliedMigrations: 25 }),
    verifyRuntimeGate: async () => ({ ok: true, currentUser: 'dev_2_run' }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'gate-runtime-role');
});
