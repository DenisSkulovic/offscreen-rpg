import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveDevSqlTenant } from '../src/rendering/dev-sql-tenant-contract.mjs';
import {
  canConnect,
  createFakeSqlCatalog,
  enableTenantConnections,
  ensureDevSqlTenant,
  fenceBaseline,
  quoteSqlIdent,
  reconcileTenantPrivileges,
} from '../src/adapters/dev-sql-tenant-reconciler.mjs';

function closedTenant(catalog, slotId) {
  const names = deriveDevSqlTenant(slotId);
  catalog.databases[names.database] = {
    oid: 100 + Number(names.digits),
    allowConnections: false,
    owner: names.migrationRole,
    publicConnect: true,
    publicTemporary: true,
    connect: [],
  };
  catalog.roles[names.runtimeRole] = { login: true, createdb: false, superuser: false };
  catalog.roles[names.migrationRole] = { login: true, createdb: false, superuser: false };
  catalog.secrets.push({ name: names.runtimeSecret, uid: `run-${names.digits}` }, { name: names.migrationSecret, uid: `mig-${names.digits}` });
}

test('the baseline fence removes PUBLIC CONNECT and keeps the dev login', () => {
  const catalog = createFakeSqlCatalog();
  const fenced = fenceBaseline(catalog);
  assert.equal(fenced.ok, true);
  assert.equal(canConnect(catalog, 'fixture', 'postgres'), false);
  assert.equal(canConnect(catalog, 'fixture', 'template1'), false);
  assert.equal(canConnect(catalog, 'dev', 'dev'), true);
  assert.equal(catalog.databases.template0.allowConnections, false);
});

test('tenant A can connect only to its own database after grants and reopen', () => {
  const catalog = createFakeSqlCatalog();
  fenceBaseline(catalog);
  closedTenant(catalog, 'dev-1');
  closedTenant(catalog, 'dev-2');
  const early = enableTenantConnections(catalog, 'dev-1');
  assert.equal(early.ok, false);
  assert.equal(catalog.databases.dev_1.allowConnections, false);
  assert.equal(reconcileTenantPrivileges(catalog, 'dev-1').ok, true);
  assert.equal(reconcileTenantPrivileges(catalog, 'dev-2').ok, true);
  assert.equal(enableTenantConnections(catalog, 'dev-1').ok, true);
  assert.equal(enableTenantConnections(catalog, 'dev-2').ok, true);
  const a = deriveDevSqlTenant('dev-1');
  assert.equal(canConnect(catalog, a.runtimeRole, a.database), true);
  assert.equal(canConnect(catalog, a.runtimeRole, 'dev_2'), false);
  assert.equal(canConnect(catalog, a.runtimeRole, 'postgres'), false);
  assert.equal(canConnect(catalog, a.runtimeRole, 'dev'), false);
  assert.equal(canConnect(catalog, a.runtimeRole, 'template1'), false);
  assert.equal(catalog.roles[a.runtimeRole].createdb, false);
  assert.equal(catalog.databases.dev_1.owner, a.migrationRole);
});

test('unknown databases, foreign owners, bad identifiers and unauthorized ensure do not mutate', () => {
  const unknown = createFakeSqlCatalog({ stray: { oid: 9, allowConnections: true, owner: 'postgres', publicConnect: true, publicTemporary: true, connect: [] } });
  assert.equal(fenceBaseline(unknown).ok, false);
  assert.equal(unknown.databases.postgres.publicConnect, true);
  const catalog = createFakeSqlCatalog();
  fenceBaseline(catalog);
  catalog.databases.dev_1 = { oid: 8, allowConnections: false, owner: 'someone', publicConnect: true, publicTemporary: true, connect: [] };
  const foreign = reconcileTenantPrivileges(catalog, 'dev-1');
  assert.equal(foreign.ok, false);
  assert.equal(catalog.databases.dev_1.publicConnect, true);
  assert.throws(() => quoteSqlIdent('dev-1'), /interpolate/);
  const held = ensureDevSqlTenant({ authorize: true });
  assert.equal(held.mutated, false);
  assert.equal(catalog.secrets.length, 0);
});
