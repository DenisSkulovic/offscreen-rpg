import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { createFakeSqlCatalog } from './dev-sql-tenant-reconciler.mjs';
import { createDevSqlKubectlAdapter, executeDevSqlTenants, holdLiveTenantMutation, planDevSqlChanges } from './dev-sql-tenant-executor.mjs';

const TOKEN = 'kind-offscreen-dev-sql-tenant-live';

function adapterFor(catalog, options = {}) {
  const store = [];
  const sql = [];
  let phase = 'closed';
  return {
    sql,
    store,
    injectedProbe: options.injectedProbe === true,
    identity: () => ({
      context: 'kind-offscreen-dev',
      namespace: 'offscreen-dev-postgres',
      cluster: 'dev-pg',
      owner: options.owner ?? 'offscreen-dev',
      ready: options.ready !== false,
      changedContext: false,
      ambientContext: 'kind-offscreen-lab',
    }),
    readCatalog: () => catalog,
    execSql: (statement) => sql.push(statement),
    resources: (names) => store.filter((resource) => resource.slot === names.slotId),
    createSecrets: (names) => {
      const created = ['migrationSecret', 'runtimeSecret'].map((key) => ({
        kind: 'Secret',
        name: names[key],
        uid: `uid-${names[key]}`,
        owner: 'offscreen-dev',
        slot: names.slotId,
      }));
      randomBytes(24);
      store.push(...created);
      return created.map(({ name, uid }) => ({ name, uid }));
    },
    applyClosedDatabase: (_rendered, names) => {
      if (options.skipDatabase) return;
      catalog.databases[names.database] = {
        oid: 100 + Number(names.digits),
        allowConnections: false,
        owner: options.databaseOwner ?? names.migrationRole,
        publicConnect: true,
        publicTemporary: true,
        connect: [],
      };
      if (options.skipRoles !== true) {
        catalog.roles[names.migrationRole] = { login: true, createdb: false, superuser: false, inherit: false };
        catalog.roles[names.runtimeRole] = { login: true, createdb: false, superuser: false, inherit: false };
      }
      phase = options.observeOpen === true ? 'open' : 'closed';
    },
    waitFor: (names) => {
      if (options.reconcileFails) return { ready: false };
      const database = catalog.databases[names.database];
      return { ready: true, allowConnections: database?.allowConnections === true || phase === 'open', owner: database?.owner };
    },
    permitConnections: (names) => {
      phase = 'open';
      catalog.databases[names.database].allowConnections = true;
    },
  };
}

test('plan lists the fence and closed tenant grants without mutating', () => {
  const catalog = createFakeSqlCatalog();
  const plan = planDevSqlChanges(catalog, ['dev-1', 'dev-2']);
  assert.equal(plan.readOnly, true);
  assert.match(plan.actions[0], /REVOKE CONNECT, TEMPORARY ON DATABASE "postgres"/);
  assert.match(plan.actions.join('\n'), /GRANT CONNECT, TEMPORARY ON DATABASE "dev" TO "dev"/);
  assert.equal(catalog.databases.dev.owner, 'dev');
  assert.equal(catalog.databases.postgres.publicConnect, true);
});

test('authorized fake execution fences baseline, reuses secrets, and denies cross-tenant access', () => {
  const catalog = createFakeSqlCatalog();
  const first = adapterFor(catalog);
  const result = executeDevSqlTenants({ slots: ['dev-1', 'dev-2'], authorizeLive: TOKEN, adapter: first });
  assert.equal(result.ok, true);
  assert.equal(result.devLogin, true);
  assert.equal(result.ambientContext, 'kind-offscreen-lab');
  assert.equal(JSON.stringify(result).includes('password'), false);
  const rerun = executeDevSqlTenants({ slots: ['dev-1', 'dev-2'], authorizeLive: TOKEN, adapter: first });
  assert.equal(rerun.ok, true);
  assert.deepEqual(rerun.retained.map((secret) => secret.uid), result.retained.map((secret) => secret.uid));
});

test('missing live token, injected probes, foreign resources and stage failures stop', () => {
  const catalog = createFakeSqlCatalog();
  assert.equal(executeDevSqlTenants({ slots: ['dev-1'], authorizeLive: true, adapter: adapterFor(catalog) }).ok, false);
  assert.equal(holdLiveTenantMutation().ok, false);
  assert.equal(executeDevSqlTenants({ slots: ['dev-1'], authorizeLive: TOKEN, adapter: adapterFor(catalog, { injectedProbe: true }) }).refusals[0].id, 'injected-probe');
  const foreign = adapterFor(catalog);
  foreign.resources = () => [{ kind: 'Database', owner: 'other', slot: 'dev-1' }];
  assert.equal(executeDevSqlTenants({ slots: ['dev-1'], authorizeLive: TOKEN, adapter: foreign }).refusals[0].id, 'foreign-resource');
  const closed = createFakeSqlCatalog();
  assert.equal(executeDevSqlTenants({ slots: ['dev-1'], authorizeLive: TOKEN, adapter: adapterFor(closed, { skipRoles: true }), failAt: undefined }).refusals[0].id, 'unknown-role');
  const leaked = createFakeSqlCatalog();
  assert.equal(executeDevSqlTenants({ slots: ['dev-1'], authorizeLive: TOKEN, adapter: adapterFor(leaked), failAt: 'baseline' }).refusals[0].id, 'baseline-leak');
  const reconcile = createFakeSqlCatalog();
  assert.equal(executeDevSqlTenants({ slots: ['dev-1'], authorizeLive: TOKEN, adapter: adapterFor(reconcile, { reconcileFails: true }) }).refusals[0].id, 'cnpg-reconcile-failed');
  const opened = createFakeSqlCatalog();
  assert.equal(executeDevSqlTenants({ slots: ['dev-1'], authorizeLive: TOKEN, adapter: adapterFor(opened, { observeOpen: true }) }).refusals[0].id, 'cnpg-allow-connections');
  const acl = createFakeSqlCatalog();
  assert.equal(executeDevSqlTenants({ slots: ['dev-1'], authorizeLive: TOKEN, adapter: adapterFor(acl), failAt: 'acl:dev-1' }).refusals[0].id, 'acl-verification-failed');
  const partial = createFakeSqlCatalog();
  const partialAdapter = adapterFor(partial);
  const stopped = executeDevSqlTenants({ slots: ['dev-1'], authorizeLive: TOKEN, adapter: partialAdapter, failAt: 'before-database:dev-1' });
  assert.equal(stopped.refusals[0].id, 'partial-create');
  const again = executeDevSqlTenants({ slots: ['dev-1'], authorizeLive: TOKEN, adapter: partialAdapter });
  assert.equal(again.ok, true);
  assert.throws(() => createDevSqlKubectlAdapter().identity(), { code: 'live-adapter-disabled' });
  assert.equal(again.retained[0].uid, stopped.retained[0].uid);
});
