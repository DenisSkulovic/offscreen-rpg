import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { createFakeSqlCatalog } from '../src/adapters/dev-sql-tenant-reconciler.mjs';
import {
  executeDevSqlTenants,
  planDevSqlChanges,
} from '../src/adapters/dev-sql-tenant-executor.mjs';
import {
  createDevSqlKubectlAdapter,
  holdLiveTenantMutation,
} from '../../../infra/verification/dev-environments/dev-sql-tenant-negative-helpers.mjs';
import { deriveDevSqlTenant } from '../src/rendering/dev-sql-tenant-contract.mjs';

const TOKEN = 'kind-offscreen-dev-sql-tenant-live';

function applySql(catalog, sql) {
  const identifiers = [...sql.matchAll(/"([a-z_][a-z0-9_]*)"/g)].map(
    (match) => match[1],
  );
  if (sql.startsWith('REVOKE CONNECT, TEMPORARY ON DATABASE')) {
    const database = catalog.databases[identifiers[0]];
    if (!database) throw new Error(`unknown database ${identifiers[0]}`);
    database.publicConnect = false;
    database.publicTemporary = false;
    catalog.statements.push(sql);
    return;
  }
  if (sql.startsWith('GRANT CONNECT, TEMPORARY ON DATABASE "dev" TO "dev"')) {
    catalog.databases.dev.connect = [
      ...new Set([...catalog.databases.dev.connect, 'dev']),
    ];
    catalog.statements.push(sql);
    return;
  }
  if (sql.startsWith('GRANT CONNECT ON DATABASE')) {
    const [databaseName, ...roles] = identifiers;
    const database = catalog.databases[databaseName];
    if (!database) throw new Error(`unknown database ${databaseName}`);
    database.connect = [...new Set([...database.connect, ...roles])];
    catalog.statements.push(sql);
  }
}

function adapterFor(catalog, options = {}) {
  const store = [];
  const sql = [];
  let phase = 'closed';
  const namesFor = (slotId) => deriveDevSqlTenant(slotId);
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
      ambientContext: 'kind-offscreen-release',
    }),
    readCatalog: () => catalog,
    execSql: (statement) => {
      sql.push(statement);
      applySql(catalog, statement);
    },
    resources: (names) => {
      const exact = [
        names.migrationSecret,
        names.runtimeSecret,
        names.migrationRoleCr,
        names.runtimeRoleCr,
        names.databaseCr,
      ];
      return exact
        .map((name) => store.find((resource) => resource.name === name))
        .filter(Boolean);
    },
    createSecrets: (names, opts = {}) => {
      const keys = opts.only?.length
        ? ['migrationSecret', 'runtimeSecret'].filter((key) =>
            opts.only.includes(names[key]),
          )
        : ['migrationSecret', 'runtimeSecret'];
      const created = keys.map((key) => ({
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
        catalog.roles[names.migrationRole] = {
          login: true,
          createdb: false,
          superuser: false,
          inherit: false,
        };
        catalog.roles[names.runtimeRole] = {
          login: true,
          createdb: false,
          superuser: false,
          inherit: false,
        };
      }
      phase = options.observeOpen === true ? 'open' : 'closed';
    },
    waitFor: (names) => {
      if (options.reconcileFails) return { ready: false };
      const database = catalog.databases[names.database];
      return {
        ready: true,
        allowConnections:
          database?.allowConnections === true || phase === 'open',
        owner: database?.owner,
      };
    },
    permitConnections: (names) => {
      phase = 'open';
      catalog.databases[names.database].allowConnections = true;
    },
  };
}

function openTenant(catalog, slotId, broken = false) {
  const names = deriveDevSqlTenant(slotId);
  catalog.databases[names.database] = {
    oid: 200 + Number(names.digits),
    allowConnections: true,
    owner: names.migrationRole,
    publicConnect: broken,
    publicTemporary: broken,
    connect: broken
      ? ['dev', names.migrationRole, names.runtimeRole]
      : [names.migrationRole, names.runtimeRole],
  };
  catalog.roles[names.migrationRole] = { login: true };
  catalog.roles[names.runtimeRole] = { login: true };
}

function seedSecrets(adapter, slotId, which = 'both') {
  const names = deriveDevSqlTenant(slotId);
  const items = [];
  if (which === 'both' || which === 'migration') {
    items.push({
      kind: 'Secret',
      name: names.migrationSecret,
      uid: `seed-${names.migrationSecret}`,
      owner: 'offscreen-dev',
      slot: slotId,
    });
  }
  if (which === 'both' || which === 'runtime') {
    items.push({
      kind: 'Secret',
      name: names.runtimeSecret,
      uid: `seed-${names.runtimeSecret}`,
      owner: 'offscreen-dev',
      slot: slotId,
    });
  }
  adapter.store.push(...items);
}

test('plan lists the fence and closed tenant grants without mutating', () => {
  const catalog = createFakeSqlCatalog();
  const plan = planDevSqlChanges(catalog, ['dev-1', 'dev-2']);
  assert.equal(plan.readOnly, true);
  assert.match(
    plan.actions[0],
    /REVOKE CONNECT, TEMPORARY ON DATABASE "postgres"/,
  );
  assert.match(
    plan.actions.join('\n'),
    /GRANT CONNECT, TEMPORARY ON DATABASE "dev" TO "dev"/,
  );
  assert.equal(catalog.databases.dev.owner, 'dev');
  assert.equal(catalog.databases.postgres.publicConnect, true);
});

test('selected slot fences baseline, reuses secrets, and denies cross-tenant access', () => {
  const catalog = createFakeSqlCatalog();
  const first = adapterFor(catalog);
  const result = executeDevSqlTenants({
    knownSlots: ['dev-1', 'dev-2'],
    selectedSlot: 'dev-1',
    authorizeLive: TOKEN,
    adapter: first,
  });
  assert.equal(result.ok, true);
  assert.equal(result.devLogin, true);
  assert.equal(result.ambientContext, 'kind-offscreen-release');
  assert.equal(JSON.stringify(result).includes('password'), false);
  const second = executeDevSqlTenants({
    knownSlots: ['dev-1', 'dev-2'],
    selectedSlot: 'dev-2',
    authorizeLive: TOKEN,
    adapter: first,
  });
  assert.equal(second.ok, true);
  const rerun = executeDevSqlTenants({
    knownSlots: ['dev-1', 'dev-2'],
    selectedSlot: 'dev-1',
    authorizeLive: TOKEN,
    adapter: first,
  });
  assert.equal(rerun.ok, true);
  assert.deepEqual(
    rerun.retained.map((secret) => secret.uid),
    result.retained.map((secret) => secret.uid),
  );
});

test('starting A leaves an existing B tenant untouched', () => {
  const catalog = createFakeSqlCatalog();
  openTenant(catalog, 'dev-2');
  const adapter = adapterFor(catalog);
  seedSecrets(adapter, 'dev-2');
  const before = structuredClone(catalog.databases.dev_2);
  const result = executeDevSqlTenants({
    knownSlots: ['dev-1', 'dev-2'],
    selectedSlot: 'dev-1',
    authorizeLive: TOKEN,
    adapter,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(catalog.databases.dev_2, before);
  assert.equal(
    adapter.sql.some(
      (line) =>
        line.includes('"dev_2"') &&
        line.startsWith('GRANT CONNECT ON DATABASE'),
    ),
    false,
  );
});

test('B absent from catalog while known still allows A provisioning', () => {
  const catalog = createFakeSqlCatalog();
  const adapter = adapterFor(catalog);
  const result = executeDevSqlTenants({
    knownSlots: ['dev-1', 'dev-2'],
    selectedSlot: 'dev-1',
    authorizeLive: TOKEN,
    adapter,
  });
  assert.equal(result.ok, true);
  assert.equal(catalog.databases.dev_2, undefined);
});

test('warm selected path reuses an already open tenant', () => {
  const catalog = createFakeSqlCatalog();
  openTenant(catalog, 'dev-1');
  const adapter = adapterFor(catalog);
  seedSecrets(adapter, 'dev-1');
  const result = executeDevSqlTenants({
    knownSlots: ['dev-1'],
    selectedSlot: 'dev-1',
    authorizeLive: TOKEN,
    adapter,
  });
  assert.equal(result.ok, true);
  assert.equal(
    adapter.sql.some(
      (line) =>
        line.includes('"dev_1"') &&
        line.startsWith('GRANT CONNECT ON DATABASE'),
    ),
    false,
  );
});

test('missing live token, injected probes, invalid selection, and foreign resources stop', () => {
  const catalog = createFakeSqlCatalog();
  assert.equal(
    executeDevSqlTenants({
      knownSlots: ['dev-1'],
      selectedSlot: 'dev-1',
      authorizeLive: true,
      adapter: adapterFor(catalog),
    }).ok,
    false,
  );
  assert.equal(holdLiveTenantMutation().ok, false);
  assert.equal(
    executeDevSqlTenants({
      knownSlots: ['dev-1'],
      selectedSlot: 'dev-1',
      authorizeLive: TOKEN,
      adapter: adapterFor(catalog, { injectedProbe: true }),
    }).refusals[0].id,
    'injected-probe',
  );
  assert.equal(
    executeDevSqlTenants({
      knownSlots: ['dev-1'],
      selectedSlot: 'dev-2',
      authorizeLive: TOKEN,
      adapter: adapterFor(catalog),
    }).refusals[0].id,
    'invalid-selection',
  );
  const foreign = adapterFor(catalog);
  foreign.resources = () => [
    { kind: 'Secret', name: 'dev-1-mig-auth', owner: 'other', slot: 'dev-1' },
  ];
  assert.equal(
    executeDevSqlTenants({
      knownSlots: ['dev-1'],
      selectedSlot: 'dev-1',
      authorizeLive: TOKEN,
      adapter: foreign,
    }).refusals[0].id,
    'foreign-resource',
  );
});

test('unknown database, stage failures, opened drift, and partial identity stop', () => {
  const catalog = createFakeSqlCatalog({
    rogue: {
      oid: 9,
      allowConnections: false,
      owner: 'postgres',
      publicConnect: true,
      publicTemporary: true,
      connect: [],
    },
  });
  assert.equal(
    executeDevSqlTenants({
      knownSlots: ['dev-1'],
      selectedSlot: 'dev-1',
      authorizeLive: TOKEN,
      adapter: adapterFor(catalog),
    }).refusals[0].id,
    'unexpected-database',
  );

  const closed = createFakeSqlCatalog();
  assert.equal(
    executeDevSqlTenants({
      knownSlots: ['dev-1'],
      selectedSlot: 'dev-1',
      authorizeLive: TOKEN,
      adapter: adapterFor(closed, { skipRoles: true }),
    }).refusals[0].id,
    'unknown-role',
  );
  const leaked = createFakeSqlCatalog();
  assert.equal(
    executeDevSqlTenants({
      knownSlots: ['dev-1'],
      selectedSlot: 'dev-1',
      authorizeLive: TOKEN,
      adapter: adapterFor(leaked),
      failAt: 'baseline',
    }).refusals[0].id,
    'baseline-leak',
  );
  const reconcile = createFakeSqlCatalog();
  assert.equal(
    executeDevSqlTenants({
      knownSlots: ['dev-1'],
      selectedSlot: 'dev-1',
      authorizeLive: TOKEN,
      adapter: adapterFor(reconcile, { reconcileFails: true }),
    }).refusals[0].id,
    'cnpg-reconcile-failed',
  );
  const opened = createFakeSqlCatalog();
  openTenant(opened, 'dev-1', true);
  seedSecrets(adapterFor(opened), 'dev-1');
  assert.equal(
    executeDevSqlTenants({
      knownSlots: ['dev-1'],
      selectedSlot: 'dev-1',
      authorizeLive: TOKEN,
      adapter: adapterFor(opened),
    }).refusals[0].id,
    'opened-before-grants',
  );

  const observeOpen = createFakeSqlCatalog();
  assert.equal(
    executeDevSqlTenants({
      knownSlots: ['dev-1'],
      selectedSlot: 'dev-1',
      authorizeLive: TOKEN,
      adapter: adapterFor(observeOpen, { observeOpen: true }),
    }).refusals[0].id,
    'cnpg-allow-connections',
  );
  const acl = createFakeSqlCatalog();
  assert.equal(
    executeDevSqlTenants({
      knownSlots: ['dev-1'],
      selectedSlot: 'dev-1',
      authorizeLive: TOKEN,
      adapter: adapterFor(acl),
      failAt: 'acl:dev-1',
    }).refusals[0].id,
    'acl-verification-failed',
  );

  const partialIdentity = createFakeSqlCatalog();
  openTenant(partialIdentity, 'dev-1');
  const partialAdapter = adapterFor(partialIdentity);
  seedSecrets(partialAdapter, 'dev-1', 'migration');
  assert.equal(
    executeDevSqlTenants({
      knownSlots: ['dev-1'],
      selectedSlot: 'dev-1',
      authorizeLive: TOKEN,
      adapter: partialAdapter,
    }).refusals[0].id,
    'partial-identity',
  );

  const unreadable = createFakeSqlCatalog();
  const unreadableAdapter = adapterFor(unreadable);
  unreadableAdapter.resources = () => [
    { name: 'dev-1-mig-auth', unreadable: true },
  ];
  assert.equal(
    executeDevSqlTenants({
      knownSlots: ['dev-1'],
      selectedSlot: 'dev-1',
      authorizeLive: TOKEN,
      adapter: unreadableAdapter,
    }).refusals[0].id,
    'unreadable-resource',
  );
});

test('partial create resumes and catalog readback mismatch refuses', () => {
  const partial = createFakeSqlCatalog();
  const partialAdapter = adapterFor(partial);
  const stopped = executeDevSqlTenants({
    knownSlots: ['dev-1'],
    selectedSlot: 'dev-1',
    authorizeLive: TOKEN,
    adapter: partialAdapter,
    failAt: 'before-database:dev-1',
  });
  assert.equal(stopped.refusals[0].id, 'partial-create');
  const again = executeDevSqlTenants({
    knownSlots: ['dev-1'],
    selectedSlot: 'dev-1',
    authorizeLive: TOKEN,
    adapter: partialAdapter,
  });
  assert.equal(again.ok, true);
  assert.equal(again.retained[0].uid, stopped.retained[0].uid);
  assert.throws(() => createDevSqlKubectlAdapter().identity(), {
    code: 'live-adapter-disabled',
  });

  const mismatch = createFakeSqlCatalog();
  const mismatchAdapter = adapterFor(mismatch);
  mismatchAdapter.execSql = (statement) => {
    mismatchAdapter.sql.push(statement);
    if (!statement.startsWith('GRANT CONNECT ON DATABASE'))
      applySql(mismatch, statement);
  };
  assert.equal(
    executeDevSqlTenants({
      knownSlots: ['dev-1'],
      selectedSlot: 'dev-1',
      authorizeLive: TOKEN,
      adapter: mismatchAdapter,
    }).refusals[0].id,
    'acl-verification-failed',
  );
});

test('cross-tenant proof refuses an already bridged known database', () => {
  const catalog = createFakeSqlCatalog();
  openTenant(catalog, 'dev-2');
  catalog.databases.dev_2.connect.push('dev_1_run');
  const adapter = adapterFor(catalog);
  seedSecrets(adapter, 'dev-2');
  const result = executeDevSqlTenants({
    knownSlots: ['dev-1', 'dev-2'],
    selectedSlot: 'dev-1',
    authorizeLive: TOKEN,
    adapter,
  });
  assert.equal(result.refusals[0].id, 'cross-tenant');
});


function temporalCatalog() {
  const catalog = createFakeSqlCatalog();
  for (const name of ['temporal', 'temporal_visibility']) {
    catalog.databases[name] = { oid: name, owner: 'temporal', allowConnections: true,
      publicConnect: false, publicTemporary: false, connect: ['temporal'] };
  }
  catalog.roles.temporal = { login: true };
  return catalog;
}

for (const scenario of ['verified', 'missing-proof', 'failed-proof', 'partial', 'foreign-owner', 'public-connect', 'public-temp', 'foreign-grant', 'rogue']) {
  test(`Temporal persistence admission: ${scenario}`, () => {
    const catalog = temporalCatalog();
    if (scenario === 'partial') delete catalog.databases.temporal_visibility;
    if (scenario === 'foreign-owner') catalog.databases.temporal.owner = 'postgres';
    if (scenario === 'public-connect') catalog.databases.temporal.publicConnect = true;
    if (scenario === 'public-temp') catalog.databases.temporal.publicTemporary = true;
    if (scenario === 'foreign-grant') catalog.databases.temporal.connect.push('dev_1_run');
    if (scenario === 'rogue') catalog.databases.rogue = { ...catalog.databases.temporal };
    const adapter = adapterFor(catalog);
    if (scenario !== 'missing-proof') adapter.verifyTemporalPersistence = () => ({ ok: scenario !== 'failed-proof' });
    const before = structuredClone(catalog.databases.temporal);
    const result = executeDevSqlTenants({
      knownSlots: ['dev-1'], selectedSlot: 'dev-1', authorizeLive: TOKEN, adapter,
    });
    assert.equal(result.ok, scenario === 'verified');
    assert.deepEqual(catalog.databases.temporal, before);
    assert.equal(adapter.sql.some(line => line.includes('"temporal') ), false);
    if (scenario !== 'verified') {
      assert.equal(result.refusals[0].id, scenario === 'rogue' ? 'unexpected-database' : 'temporal-persistence-unverified');
      assert.equal(adapter.sql.length, 0);
      assert.equal(adapter.store.length, 0);
    }
  });
}
