import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { createFakeSqlCatalog } from '../src/adapters/dev-sql-tenant-reconciler.mjs';
import {
  executeDevSqlTenants,
  planDevSqlChanges,
} from '../src/adapters/dev-sql-tenant-executor.mjs';
import {
  CATALOG_SQL,
  createLiveDevSqlAdapter,
  parseCatalogProjection,
} from '../src/adapters/dev-sql-tenant-live-adapter.mjs';
import {
  createDevSqlKubectlAdapter,
  holdLiveTenantMutation,
} from '../../../infra/verification/dev-environments/dev-sql-tenant-negative-helpers.mjs';
import { deriveDevSqlTenant } from '../src/rendering/dev-sql-tenant-contract.mjs';

const TOKEN = 'kind-offscreen-dev-sql-tenant-live';
const EXPORTER = 'cnpg_metrics_exporter';

// ---------------------------------------------------------------------------
// Fake PostgreSQL catalog. It models real OIDs, explicit ACL rows (the
// aclexplode shape), role flags, role membership and effective CONNECT, and
// every simulated write updates the rows. The executor sees it only through the
// real projection parser, exactly like the live adapter.
// ---------------------------------------------------------------------------

function addRole(model, name, flags = {}) {
  model.roles[name] = {
    oid: model.nextOid++,
    login: true,
    inherit: false,
    superuser: false,
    createdb: false,
    createrole: false,
    replication: false,
    bypassrls: false,
    ...flags,
  };
}

const oidOf = (model, name) => (name === 'PUBLIC' ? 0 : model.roles[name].oid);

function aclRow(model, grantee, grantor, privilegeType, isGrantable = false) {
  return {
    granteeOid: oidOf(model, grantee),
    grantorOid: oidOf(model, grantor),
    privilegeType,
    isGrantable,
  };
}

function addDatabase(model, name, owner, { open = true, publicAccess = true } = {}) {
  const acl = ['CONNECT', 'TEMPORARY', 'CREATE'].map((privilege) =>
    aclRow(model, owner, owner, privilege),
  );
  if (publicAccess) {
    acl.push(aclRow(model, 'PUBLIC', owner, 'CONNECT'), aclRow(model, 'PUBLIC', owner, 'TEMPORARY'));
  }
  model.databases[name] = {
    oid: model.nextOid++,
    ownerOid: oidOf(model, owner),
    allowConnections: open,
    acl,
  };
}

function createModel({ exporter = false } = {}) {
  const model = { nextOid: 16400, roles: {}, members: [], databases: {} };
  addRole(model, 'postgres', { oid: 10, superuser: true, createdb: true, createrole: true, replication: true, bypassrls: true });
  addRole(model, 'pg_monitor', { login: false });
  addRole(model, 'dev');
  addDatabase(model, 'postgres', 'postgres');
  addDatabase(model, 'dev', 'dev');
  addDatabase(model, 'template1', 'postgres');
  addDatabase(model, 'template0', 'postgres', { open: false, publicAccess: false });
  if (exporter) addExporter(model);
  return model;
}

function addExporter(model) {
  addRole(model, EXPORTER);
  model.members.push({ member: EXPORTER, role: 'pg_monitor' });
}

const ownerName = (model, database) =>
  Object.keys(model.roles).find((name) => model.roles[name].oid === model.databases[database].ownerOid);

function monitorRow(model, database, overrides = {}) {
  return {
    ...aclRow(model, EXPORTER, ownerName(model, database), 'CONNECT'),
    ...overrides,
  };
}

const exporterRows = (model, database) =>
  model.databases[database].acl.filter((row) => row.granteeOid === model.roles[EXPORTER]?.oid);

function grantMonitor(model, database, overrides = {}) {
  model.databases[database].acl.push(monitorRow(model, database, overrides));
}

// pg_has_role(member, role, 'MEMBER'): any path, regardless of INHERIT.
function memberOf(model, member, role) {
  const seen = new Set([member]);
  const queue = [member];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === role) return true;
    for (const edge of model.members) {
      if (edge.member === current && !seen.has(edge.role)) {
        seen.add(edge.role);
        queue.push(edge.role);
      }
    }
  }
  return false;
}

// Privileges flow only through memberships of roles that have INHERIT.
function inheritedRoles(model, name) {
  const seen = new Set([name]);
  const queue = [name];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!model.roles[current].inherit) continue;
    for (const edge of model.members) {
      if (edge.member === current && !seen.has(edge.role)) {
        seen.add(edge.role);
        queue.push(edge.role);
      }
    }
  }
  return seen;
}

function effectiveConnect(model, role, database) {
  if (model.roles[role].superuser) return true;
  const held = inheritedRoles(model, role);
  const db = model.databases[database];
  const owner = ownerName(model, database);
  return (
    held.has(owner) ||
    db.acl.some(
      (row) =>
        row.privilegeType === 'CONNECT' &&
        (row.granteeOid === 0 || [...held].some((name) => model.roles[name].oid === row.granteeOid)),
    )
  );
}

const SUBJECT = /^(dev|temporal|dev_[0-9]+_(mig|run))$/;

// Same JSON as the fixed catalog SELECT returns.
function projectRaw(model) {
  const roleNames = Object.keys(model.roles);
  const databases = Object.entries(model.databases);
  const exporter = model.roles[EXPORTER];
  return {
    databases: databases.map(([name, db]) => ({
      oid: db.oid,
      name,
      ownerOid: db.ownerOid,
      allowConnections: db.allowConnections,
      acl: structuredClone(db.acl),
    })),
    roles: roleNames
      .filter((name) => !name.startsWith('pg_') || name === 'pg_monitor')
      .map((name) => ({ name, ...model.roles[name] })),
    monitor: exporter
      ? {
          exporterOid: exporter.oid,
          monitorMember: memberOf(model, EXPORTER, 'pg_monitor'),
          assumers: roleNames
            .filter((name) => name !== EXPORTER && !model.roles[name].superuser && memberOf(model, name, EXPORTER))
            .map((name) => model.roles[name].oid),
        }
      : null,
    effective: roleNames
      .filter((name) => SUBJECT.test(name))
      .flatMap((name) =>
        databases.map(([database, db]) => ({
          roleOid: model.roles[name].oid,
          databaseOid: db.oid,
          connect: effectiveConnect(model, name, database),
        })),
      ),
  };
}

function applySql(model, sql) {
  const identifiers = [...sql.matchAll(/"([a-z_][a-z0-9_]*)"/g)].map((match) => match[1]);
  const addRows = (database, roles, privileges) => {
    const db = model.databases[database];
    if (!db) throw new Error(`unknown database ${database}`);
    const owner = ownerName(model, database);
    for (const role of roles) {
      for (const privilege of privileges) {
        const exists = db.acl.some(
          (row) => row.granteeOid === oidOf(model, role) && row.privilegeType === privilege,
        );
        if (!exists) db.acl.push(aclRow(model, role, owner, privilege));
      }
    }
  };
  if (sql.startsWith('REVOKE CONNECT, TEMPORARY ON DATABASE')) {
    const db = model.databases[identifiers[0]];
    if (!db) throw new Error(`unknown database ${identifiers[0]}`);
    db.acl = db.acl.filter((row) => row.granteeOid !== 0);
    return;
  }
  if (sql.startsWith('GRANT CONNECT, TEMPORARY ON DATABASE "dev" TO "dev"')) {
    addRows('dev', ['dev'], ['CONNECT', 'TEMPORARY']);
    return;
  }
  if (sql.startsWith('GRANT CONNECT ON DATABASE')) {
    const [database, ...roles] = identifiers;
    addRows(database, roles, ['CONNECT']);
  }
}

function adapterFor(model, options = {}) {
  const store = [];
  const sql = [];
  const events = [];
  const monitorGrants = [];
  let phase = 'closed';
  let reads = 0;
  const adapter = {
    sql,
    store,
    events,
    monitorGrants,
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
    readCatalog: () => {
      reads += 1;
      const catalog = parseCatalogProjection(JSON.stringify(projectRaw(model)));
      return options.tamper ? options.tamper(catalog, reads) : catalog;
    },
    execSql: (statement) => {
      sql.push(statement);
      applySql(model, statement);
      options.afterExec?.(model, statement);
    },
    resources: (names) => {
      const exact = [names.migrationSecret, names.runtimeSecret, names.migrationRoleCr, names.runtimeRoleCr, names.databaseCr];
      return exact.map((name) => store.find((resource) => resource.name === name)).filter(Boolean);
    },
    createSecrets: (names, opts = {}) => {
      const keys = opts.only?.length
        ? ['migrationSecret', 'runtimeSecret'].filter((key) => opts.only.includes(names[key]))
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
      events.push('apply');
      if (options.skipDatabase) return;
      for (const role of [names.migrationRole, names.runtimeRole]) {
        if (!model.roles[role]) addRole(model, role);
      }
      addDatabase(model, names.database, options.databaseOwner ?? names.migrationRole, { open: false });
      phase = options.observeOpen === true ? 'open' : 'closed';
      options.afterApply?.(model);
    },
    waitFor: (names) => {
      if (options.reconcileFails) return { ready: false };
      const database = model.databases[names.database];
      return {
        ready: true,
        allowConnections: database?.allowConnections === true || phase === 'open',
        owner: database && ownerName(model, names.database),
      };
    },
    permitConnections: (names) => {
      events.push('permit');
      phase = 'open';
      model.databases[names.database].allowConnections = true;
      options.afterPermit?.(model);
    },
  };
  if (options.monitorGrant !== false) {
    adapter.grantMonitoringConnect = (names) => {
      events.push('monitor-grant');
      monitorGrants.push(names.database);
      if (options.monitorGrantLands === false) return;
      applySql(model, `GRANT CONNECT ON DATABASE "${names.database}" TO "${EXPORTER}"`);
    };
  }
  return adapter;
}

function execute(model, { known = ['dev-1'], selected = 'dev-1', adapter, options, failAt } = {}) {
  const used = adapter ?? adapterFor(model, options);
  const result = executeDevSqlTenants({
    knownSlots: known,
    selectedSlot: selected,
    authorizeLive: TOKEN,
    adapter: used,
    failAt,
  });
  return { result, adapter: used };
}

function openTenant(model, slotId, { broken = false } = {}) {
  const names = deriveDevSqlTenant(slotId);
  for (const role of [names.migrationRole, names.runtimeRole]) {
    if (!model.roles[role]) addRole(model, role);
  }
  addDatabase(model, names.database, names.migrationRole, { open: true, publicAccess: broken });
  applySql(model, `GRANT CONNECT ON DATABASE "${names.database}" TO "${names.migrationRole}", "${names.runtimeRole}"`);
  if (broken) applySql(model, `GRANT CONNECT ON DATABASE "${names.database}" TO "dev"`);
  return names;
}

function seedSecrets(adapter, slotId, which = 'both') {
  const names = deriveDevSqlTenant(slotId);
  const items = [];
  if (which === 'both' || which === 'migration') {
    items.push({ kind: 'Secret', name: names.migrationSecret, uid: `seed-${names.migrationSecret}`, owner: 'offscreen-dev', slot: slotId });
  }
  if (which === 'both' || which === 'runtime') {
    items.push({ kind: 'Secret', name: names.runtimeSecret, uid: `seed-${names.runtimeSecret}`, owner: 'offscreen-dev', slot: slotId });
  }
  adapter.store.push(...items);
}

const untouched = (adapter) =>
  adapter.sql.length === 0 &&
  adapter.store.length === 0 &&
  adapter.events.length === 0 &&
  adapter.monitorGrants.length === 0;

// ---------------------------------------------------------------------------
// Preserved executor behaviour
// ---------------------------------------------------------------------------

test('plan lists the fence and closed tenant grants without mutating', () => {
  const catalog = createFakeSqlCatalog();
  const plan = planDevSqlChanges(catalog, ['dev-1', 'dev-2']);
  assert.equal(plan.readOnly, true);
  assert.match(plan.actions[0], /REVOKE CONNECT, TEMPORARY ON DATABASE "postgres"/);
  assert.match(plan.actions.join('\n'), /GRANT CONNECT, TEMPORARY ON DATABASE "dev" TO "dev"/);
  assert.equal(catalog.databases.dev.owner, 'dev');
  assert.equal(catalog.databases.postgres.publicConnect, true);
});

test('selected slot fences baseline, reuses secrets, and denies cross-tenant access', () => {
  const model = createModel();
  const adapter = adapterFor(model);
  const known = ['dev-1', 'dev-2'];
  const first = execute(model, { known, adapter }).result;
  assert.equal(first.ok, true);
  assert.equal(first.devLogin, true);
  assert.equal(first.ambientContext, 'kind-offscreen-release');
  assert.equal(JSON.stringify(first).includes('password'), false);
  assert.equal(execute(model, { known, selected: 'dev-2', adapter }).result.ok, true);
  const rerun = execute(model, { known, adapter }).result;
  assert.equal(rerun.ok, true);
  assert.deepEqual(rerun.retained.map((secret) => secret.uid), first.retained.map((secret) => secret.uid));
});

test('starting A leaves an existing B tenant untouched', () => {
  const model = createModel();
  openTenant(model, 'dev-2');
  const adapter = adapterFor(model);
  seedSecrets(adapter, 'dev-2');
  const before = structuredClone(model.databases.dev_2);
  const { result } = execute(model, { known: ['dev-1', 'dev-2'], adapter });
  assert.equal(result.ok, true);
  assert.deepEqual(model.databases.dev_2, before);
  assert.equal(adapter.sql.some((line) => line.includes('"dev_2"') && line.startsWith('GRANT CONNECT ON DATABASE')), false);
});

test('B absent from catalog while known still allows A provisioning', () => {
  const model = createModel();
  const { result } = execute(model, { known: ['dev-1', 'dev-2'] });
  assert.equal(result.ok, true);
  assert.equal(model.databases.dev_2, undefined);
});

test('warm selected path reuses an already open tenant', () => {
  const model = createModel();
  openTenant(model, 'dev-1');
  const adapter = adapterFor(model);
  seedSecrets(adapter, 'dev-1');
  const { result } = execute(model, { adapter });
  assert.equal(result.ok, true);
  assert.equal(adapter.sql.some((line) => line.includes('"dev_1"') && line.startsWith('GRANT CONNECT ON DATABASE')), false);
});

test('missing live token, injected probes, invalid selection, and foreign resources stop', () => {
  const model = createModel();
  assert.equal(
    executeDevSqlTenants({ knownSlots: ['dev-1'], selectedSlot: 'dev-1', authorizeLive: true, adapter: adapterFor(model) }).ok,
    false,
  );
  assert.equal(holdLiveTenantMutation().ok, false);
  assert.equal(execute(model, { options: { injectedProbe: true } }).result.refusals[0].id, 'injected-probe');
  assert.equal(execute(model, { selected: 'dev-2' }).result.refusals[0].id, 'invalid-selection');
  const foreign = adapterFor(model);
  foreign.resources = () => [{ kind: 'Secret', name: 'dev-1-mig-auth', owner: 'other', slot: 'dev-1' }];
  assert.equal(execute(model, { adapter: foreign }).result.refusals[0].id, 'foreign-resource');
});

test('unknown database, stage failures, opened drift, and partial identity stop', () => {
  const rogue = createModel();
  addDatabase(rogue, 'rogue', 'postgres', { open: false });
  assert.equal(execute(rogue).result.refusals[0].id, 'unexpected-database');

  // A database always has an owner role in PostgreSQL; model the executor's
  // defensive check by hiding the tenant roles from the observed projection.
  const hideRoles = (catalog) => {
    delete catalog.roles.dev_1_mig;
    delete catalog.roles.dev_1_run;
    return catalog;
  };
  assert.equal(execute(createModel(), { options: { tamper: hideRoles } }).result.refusals[0].id, 'unknown-role');
  assert.equal(execute(createModel(), { failAt: 'baseline' }).result.refusals[0].id, 'baseline-leak');
  assert.equal(execute(createModel(), { options: { reconcileFails: true } }).result.refusals[0].id, 'cnpg-reconcile-failed');

  const opened = createModel();
  openTenant(opened, 'dev-1', { broken: true });
  const openedAdapter = adapterFor(opened);
  seedSecrets(openedAdapter, 'dev-1');
  assert.equal(execute(opened, { adapter: openedAdapter }).result.refusals[0].id, 'opened-before-grants');

  assert.equal(execute(createModel(), { options: { observeOpen: true } }).result.refusals[0].id, 'cnpg-allow-connections');
  assert.equal(execute(createModel(), { failAt: 'acl:dev-1' }).result.refusals[0].id, 'acl-verification-failed');

  const partial = createModel();
  openTenant(partial, 'dev-1');
  const partialAdapter = adapterFor(partial);
  seedSecrets(partialAdapter, 'dev-1', 'migration');
  assert.equal(execute(partial, { adapter: partialAdapter }).result.refusals[0].id, 'partial-identity');

  const unreadable = adapterFor(createModel());
  unreadable.resources = () => [{ name: 'dev-1-mig-auth', unreadable: true }];
  assert.equal(execute(createModel(), { adapter: unreadable }).result.refusals[0].id, 'unreadable-resource');
});

test('partial create resumes and catalog readback mismatch refuses', () => {
  const model = createModel();
  const adapter = adapterFor(model);
  const stopped = execute(model, { adapter, failAt: 'before-database:dev-1' }).result;
  assert.equal(stopped.refusals[0].id, 'partial-create');
  const again = execute(model, { adapter }).result;
  assert.equal(again.ok, true);
  assert.equal(again.retained[0].uid, stopped.retained[0].uid);
  assert.throws(() => createDevSqlKubectlAdapter().identity(), { code: 'live-adapter-disabled' });

  const mismatch = createModel();
  const mismatchAdapter = adapterFor(mismatch);
  mismatchAdapter.execSql = (statement) => {
    mismatchAdapter.sql.push(statement);
    if (!statement.startsWith('GRANT CONNECT ON DATABASE')) applySql(mismatch, statement);
  };
  assert.equal(execute(mismatch, { adapter: mismatchAdapter }).result.refusals[0].id, 'acl-verification-failed');
});

test('cross-tenant proof refuses an already bridged known database', () => {
  const model = createModel();
  openTenant(model, 'dev-2');
  addRole(model, 'dev_1_run');
  applySql(model, 'GRANT CONNECT ON DATABASE "dev_2" TO "dev_1_run"');
  const adapter = adapterFor(model);
  seedSecrets(adapter, 'dev-2');
  assert.equal(execute(model, { known: ['dev-1', 'dev-2'], adapter }).result.refusals[0].id, 'cross-tenant');
});

function temporalModel({ exporter = false } = {}) {
  const model = createModel({ exporter });
  addRole(model, 'temporal');
  for (const name of ['temporal', 'temporal_visibility']) {
    addDatabase(model, name, 'temporal', { publicAccess: false });
  }
  return model;
}

for (const scenario of ['verified', 'missing-proof', 'failed-proof', 'partial', 'foreign-owner', 'public-connect', 'public-temp', 'foreign-grant', 'rogue']) {
  test(`Temporal persistence admission: ${scenario}`, () => {
    const model = temporalModel();
    if (scenario === 'partial') delete model.databases.temporal_visibility;
    if (scenario === 'foreign-owner') model.databases.temporal.ownerOid = model.roles.postgres.oid;
    if (scenario === 'public-connect') model.databases.temporal.acl.push(aclRow(model, 'PUBLIC', 'temporal', 'CONNECT'));
    if (scenario === 'public-temp') model.databases.temporal.acl.push(aclRow(model, 'PUBLIC', 'temporal', 'TEMPORARY'));
    if (scenario === 'foreign-grant') {
      addRole(model, 'dev_1_run');
      applySql(model, 'GRANT CONNECT ON DATABASE "temporal" TO "dev_1_run"');
    }
    if (scenario === 'rogue') addDatabase(model, 'rogue', 'temporal', { publicAccess: false });
    const adapter = adapterFor(model);
    if (scenario !== 'missing-proof') adapter.verifyTemporalPersistence = () => ({ ok: scenario !== 'failed-proof' });
    const before = structuredClone(model.databases.temporal);
    const { result } = execute(model, { adapter });
    assert.equal(result.ok, scenario === 'verified');
    assert.deepEqual(model.databases.temporal, before);
    assert.equal(adapter.sql.some((line) => line.includes('"temporal')), false);
    if (scenario !== 'verified') {
      assert.equal(result.refusals[0].id, scenario === 'rogue' ? 'unexpected-database' : 'temporal-persistence-unverified');
      assert.equal(adapter.sql.length, 0);
      assert.equal(adapter.store.length, 0);
    }
  });
}

// ---------------------------------------------------------------------------
// Exact monitoring CONNECT exception (OBS-E2-PG01 T01)
// ---------------------------------------------------------------------------

test('absent collector role keeps the owner-only predecessor and never grants', () => {
  const model = createModel();
  const { result, adapter } = execute(model);
  assert.equal(result.ok, true);
  assert.deepEqual(adapter.monitorGrants, []);
  assert.equal(model.roles[EXPORTER], undefined);
  assert.equal(adapter.sql.some((line) => line.includes(EXPORTER)), false);
});

test('fresh selected tenant gets exact monitor CONNECT after tenant grants and before opening', () => {
  const model = createModel({ exporter: true });
  openTenant(model, 'dev-2'); // already-open peer: predecessor, must not be granted
  const adapter = adapterFor(model);
  seedSecrets(adapter, 'dev-2');
  const before = structuredClone(model.databases.dev_2);
  const { result } = execute(model, { known: ['dev-1', 'dev-2'], adapter });
  assert.equal(result.ok, true);
  assert.deepEqual(adapter.monitorGrants, ['dev_1']);
  assert.deepEqual(model.databases.dev_2, before);
  assert.equal(exporterRows(model, 'dev_2').length, 0);
  const rows = exporterRows(model, 'dev_1');
  assert.deepEqual(rows, [monitorRow(model, 'dev_1')]);
  assert.equal(rows[0].grantorOid, model.roles.dev_1_mig.oid);
  assert.equal(rows[0].isGrantable, false);
  // Order: closed DB -> PUBLIC revoke -> tenant grants -> monitor grant -> open.
  assert.equal(adapter.sql.at(-1).startsWith('GRANT CONNECT ON DATABASE "dev_1"'), true);
  assert.deepEqual(adapter.events, ['apply', 'monitor-grant', 'permit']);
  for (const name of ['postgres', 'dev', 'template0', 'template1', 'dev_2']) {
    assert.equal(exporterRows(model, name).length, 0, name);
  }
});

test('exact successor rows on baseline, tenants and the Temporal pair stay admitted without grants', () => {
  const model = temporalModel({ exporter: true });
  openTenant(model, 'dev-1');
  openTenant(model, 'dev-2');
  for (const name of ['postgres', 'dev', 'temporal', 'temporal_visibility', 'dev_1', 'dev_2']) grantMonitor(model, name);
  // A superuser path to the exporter is not a non-superuser path.
  model.members.push({ member: 'postgres', role: EXPORTER });
  const adapter = adapterFor(model);
  adapter.verifyTemporalPersistence = () => ({ ok: true });
  seedSecrets(adapter, 'dev-1');
  const before = structuredClone(model.databases);
  const { result } = execute(model, { known: ['dev-1', 'dev-2'], adapter });
  assert.equal(result.ok, true);
  assert.deepEqual(model.databases.temporal, before.temporal);
  assert.deepEqual(adapter.monitorGrants, []);
  assert.equal(adapter.sql.some((line) => line.includes(EXPORTER)), false);
});

const ACL_FAULTS = {
  'wrong grantor': (m, db) => grantMonitor(m, db, { grantorOid: m.roles.postgres.oid }),
  'grant option': (m, db) => grantMonitor(m, db, { isGrantable: true }),
  'TEMPORARY only': (m, db) => grantMonitor(m, db, { privilegeType: 'TEMPORARY' }),
  'CREATE only': (m, db) => grantMonitor(m, db, { privilegeType: 'CREATE' }),
  'CONNECT plus TEMPORARY': (m, db) => {
    grantMonitor(m, db);
    grantMonitor(m, db, { privilegeType: 'TEMPORARY' });
  },
  'CONNECT plus CREATE': (m, db) => {
    grantMonitor(m, db);
    grantMonitor(m, db, { privilegeType: 'CREATE' });
  },
  'extra ACL entry from another grantor': (m, db) => {
    grantMonitor(m, db);
    grantMonitor(m, db, { grantorOid: m.roles.postgres.oid });
  },
};

for (const [fault, inject] of Object.entries(ACL_FAULTS)) {
  for (const placement of ['peer', 'selected-open', 'baseline']) {
    test(`monitor ACL refusal before writes: ${fault} on ${placement}`, () => {
      const model = createModel({ exporter: true });
      const peer = openTenant(model, 'dev-2');
      const selected = openTenant(model, 'dev-1');
      const target = { peer: peer.database, 'selected-open': selected.database, baseline: 'dev' }[placement];
      inject(model, target);
      const adapter = adapterFor(model);
      seedSecrets(adapter, 'dev-1');
      seedSecrets(adapter, 'dev-2');
      const sqlBefore = adapter.sql.length;
      const { result } = execute(model, { known: ['dev-1', 'dev-2'], adapter });
      assert.equal(result.ok, false);
      assert.equal(result.refusals[0].id, 'monitor-acl-unapproved');
      assert.equal(adapter.sql.length, sqlBefore);
      assert.deepEqual(adapter.events, []);
    });
  }
}

test('exporter row on template, unknown or foreign-owner databases is refused', () => {
  for (const name of ['template0', 'template1']) {
    const model = createModel({ exporter: true });
    grantMonitor(model, name);
    const { result, adapter } = execute(model);
    assert.equal(result.refusals[0].id, 'monitor-acl-unapproved', name);
    assert.equal(untouched(adapter), true);
  }
  const unknown = createModel({ exporter: true });
  addDatabase(unknown, 'rogue', 'postgres', { open: false, publicAccess: false });
  grantMonitor(unknown, 'rogue');
  const { result } = execute(unknown);
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'monitor-acl-unapproved');

  const foreignOwner = createModel({ exporter: true });
  const names = openTenant(foreignOwner, 'dev-1');
  foreignOwner.databases[names.database].ownerOid = foreignOwner.roles.postgres.oid;
  grantMonitor(foreignOwner, names.database);
  assert.equal(execute(foreignOwner).result.ok, false);

  const temporalSolo = temporalModel({ exporter: true });
  grantMonitor(temporalSolo, 'temporal');
  delete temporalSolo.databases.temporal_visibility;
  const partial = execute(temporalSolo, { adapter: Object.assign(adapterFor(temporalSolo), { verifyTemporalPersistence: () => ({ ok: true }) }) });
  assert.equal(partial.result.refusals[0].id, 'temporal-persistence-unverified');
});

test('an exporter row naming an unknown or changed OID is not a grant to the exporter', () => {
  const unknownOid = createModel({ exporter: true });
  unknownOid.databases.dev.acl.push({ granteeOid: 999999, grantorOid: unknownOid.roles.dev.oid, privilegeType: 'CONNECT', isGrantable: false });
  assert.throws(() => execute(unknownOid), /catalog projection rejected/);

  // Another role's OID in the grantee slot is an ordinary grant, never the exception.
  const changedOid = createModel({ exporter: true });
  openTenant(changedOid, 'dev-1');
  changedOid.databases.dev_1.acl.push({ ...monitorRow(changedOid, 'dev_1'), granteeOid: changedOid.roles.dev.oid });
  const adapter = adapterFor(changedOid);
  seedSecrets(adapter, 'dev-1');
  assert.equal(execute(changedOid, { adapter }).result.refusals[0].id, 'opened-before-grants');
  assert.equal(adapter.sql.length, 0);
});

test('role name spoof or tampered OID evidence is refused', () => {
  const spoof = createModel({ exporter: true });
  const tamper = (catalog) => ({ ...catalog, monitor: { ...catalog.monitor, exporterOid: catalog.monitor.exporterOid + 1 } });
  const { result, adapter } = execute(spoof, { options: { tamper } });
  assert.equal(result.refusals[0].id, 'monitoring-role-unsafe');
  assert.equal(untouched(adapter), true);
});

for (const [label, change] of [
  ['superuser', (role) => { role.superuser = true; }],
  ['createdb', (role) => { role.createdb = true; }],
  ['createrole', (role) => { role.createrole = true; }],
  ['replication', (role) => { role.replication = true; }],
  ['bypassrls', (role) => { role.bypassrls = true; }],
  ['no LOGIN', (role) => { role.login = false; }],
]) {
  test(`exporter with ${label} is refused before any write`, () => {
    const model = createModel({ exporter: true });
    change(model.roles[EXPORTER]);
    const { result, adapter } = execute(model);
    assert.equal(result.refusals[0].id, 'monitoring-role-unsafe');
    assert.equal(untouched(adapter), true);
  });
}

test('exporter outside pg_monitor is refused', () => {
  const model = createModel({ exporter: true });
  model.members = [];
  const { result, adapter } = execute(model);
  assert.equal(result.refusals[0].id, 'monitoring-role-unsafe');
  assert.equal(untouched(adapter), true);
});

for (const [label, build] of [
  ['direct member', (model) => { model.members.push({ member: 'dev', role: EXPORTER }); }],
  ['NOINHERIT direct member', (model) => {
    addRole(model, 'dev_9', { inherit: false });
    model.members.push({ member: 'dev_9', role: EXPORTER });
  }],
  ['transitive member', (model) => {
    addRole(model, 'hop');
    addRole(model, 'outer');
    model.members.push({ member: 'outer', role: 'hop' }, { member: 'hop', role: EXPORTER });
  }],
  ['transitive NOINHERIT member', (model) => {
    addRole(model, 'hop', { inherit: true });
    addRole(model, 'outer', { inherit: false });
    model.members.push({ member: 'outer', role: 'hop' }, { member: 'hop', role: EXPORTER });
  }],
]) {
  test(`non-superuser path to the exporter is refused unconditionally: ${label}`, () => {
    const model = createModel({ exporter: true });
    build(model);
    const { result, adapter } = execute(model);
    assert.equal(result.refusals[0].id, 'monitoring-role-unsafe');
    assert.equal(untouched(adapter), true);
  });
}

test('missing or incomplete projection is a refusal, not an absent grant', () => {
  const cases = {
    'no monitor block': (catalog) => ({ ...catalog, monitor: undefined }),
    'no effective matrix': (catalog) => ({ ...catalog, effectiveConnect: undefined }),
    'missing ACL rows': (catalog) => {
      delete catalog.databases.dev.aclEntries;
      return catalog;
    },
    'missing real OID': (catalog) => {
      delete catalog.databases.postgres.oid;
      return catalog;
    },
    'role without OID': (catalog) => {
      delete catalog.roles.dev.oid;
      return catalog;
    },
    'missing effective cell': (catalog) => {
      delete catalog.effectiveConnect.dev.postgres;
      return catalog;
    },
    'legacy name-only catalog': () => createFakeSqlCatalog(),
  };
  for (const [label, tamper] of Object.entries(cases)) {
    const model = createModel({ exporter: true });
    const { result, adapter } = execute(model, { options: { tamper } });
    assert.equal(result.ok, false, label);
    assert.equal(result.refusals[0].id, 'monitoring-catalog-incomplete', label);
    assert.equal(untouched(adapter), true, label);
  }
});

test('elevated dev, temporal or derived identities are refused', () => {
  for (const flag of ['superuser', 'createdb', 'createrole', 'replication', 'bypassrls']) {
    const model = createModel();
    model.roles.dev[flag] = true;
    const { result, adapter } = execute(model);
    assert.equal(result.refusals[0].id, 'elevated-role', flag);
    assert.equal(untouched(adapter), true);
  }
  const derived = createModel();
  openTenant(derived, 'dev-2');
  derived.roles.dev_2_run.createrole = true;
  assert.equal(execute(derived, { known: ['dev-1', 'dev-2'] }).result.refusals[0].id, 'elevated-role');
});

test('effective inherited CONNECT across tenants is refused although no ACL row names the role', () => {
  const model = createModel();
  openTenant(model, 'dev-2');
  addRole(model, 'dev_1_run', { inherit: true });
  model.members.push({ member: 'dev_1_run', role: 'dev_2_run' });
  assert.equal(model.databases.dev_2.acl.some((row) => row.granteeOid === model.roles.dev_1_run.oid), false);
  const adapter = adapterFor(model);
  seedSecrets(adapter, 'dev-2');
  const { result } = execute(model, { known: ['dev-1', 'dev-2'], adapter });
  assert.equal(result.refusals[0].id, 'cross-tenant');
  assert.equal(adapter.sql.length, 0);

  // The same inheritance without INHERIT does not reach the database.
  model.roles.dev_1_run.inherit = false;
  assert.equal(execute(model, { known: ['dev-1', 'dev-2'], adapter }).result.ok, true);
});

test('dev inheriting a tenant role is refused as an open-tenant ACL mismatch', () => {
  const model = createModel();
  openTenant(model, 'dev-2');
  model.roles.dev.inherit = true;
  model.members.push({ member: 'dev', role: 'dev_2_run' });
  const adapter = adapterFor(model);
  seedSecrets(adapter, 'dev-2');
  assert.equal(execute(model, { known: ['dev-1', 'dev-2'], adapter }).result.refusals[0].id, 'opened-before-grants');
});

test('closed selected database is fenced on effective CONNECT before it opens', () => {
  const model = createModel({ exporter: true });
  openTenant(model, 'dev-2');
  // Roles for dev-1 already exist and dev_2_run inherits dev_1_run, so the new
  // closed database would be reachable from tenant 2 the moment it opens.
  addRole(model, 'dev_1_mig');
  addRole(model, 'dev_1_run');
  model.roles.dev_2_run.inherit = true;
  model.members.push({ member: 'dev_2_run', role: 'dev_1_run' });
  const adapter = adapterFor(model);
  seedSecrets(adapter, 'dev-2');
  const { result } = execute(model, { known: ['dev-1', 'dev-2'], adapter });
  assert.equal(result.refusals[0].id, 'cross-tenant');
  assert.equal(adapter.events.includes('permit'), false);
});

test('drift is refused at every checkpoint after the initial read', () => {
  // after baseline writes
  const baseline = createModel({ exporter: true });
  const baselineAdapter = adapterFor(baseline, {
    afterExec: (model) => {
      if (exporterRows(model, 'template1').length === 0) grantMonitor(model, 'template1');
    },
  });
  assert.equal(execute(baseline, { adapter: baselineAdapter }).result.refusals[0].id, 'monitor-acl-unapproved');
  assert.equal(baselineAdapter.events.length, 0);

  // after closed database creation
  const created = createModel({ exporter: true });
  const createdAdapter = adapterFor(created, { afterApply: (model) => grantMonitor(model, 'template0') });
  assert.equal(execute(created, { adapter: createdAdapter }).result.refusals[0].id, 'monitor-acl-unapproved');
  assert.deepEqual(createdAdapter.monitorGrants, []);

  // immediately before opening: the monitor grant lands with a grant option
  const preOpen = createModel({ exporter: true });
  const preOpenAdapter = adapterFor(preOpen);
  const grant = preOpenAdapter.grantMonitoringConnect;
  preOpenAdapter.grantMonitoringConnect = (names) => {
    grant(names);
    for (const row of exporterRows(preOpen, names.database)) row.isGrantable = true;
  };
  assert.equal(execute(preOpen, { adapter: preOpenAdapter }).result.refusals[0].id, 'monitor-acl-unapproved');
  assert.equal(preOpenAdapter.events.includes('permit'), false);

  // after opening
  const opened = createModel({ exporter: true });
  const openedAdapter = adapterFor(opened, {
    afterPermit: (model) => grantMonitor(model, 'dev_1', { privilegeType: 'TEMPORARY' }),
  });
  assert.equal(execute(opened, { adapter: openedAdapter }).result.refusals[0].id, 'monitor-acl-unapproved');
});

test('monitor grant is fail-closed when the adapter cannot grant or the grant does not land', () => {
  const missing = createModel({ exporter: true });
  const noOperation = execute(missing, { options: { monitorGrant: false } });
  assert.equal(noOperation.result.refusals[0].id, 'monitoring-grant-unavailable');
  assert.equal(noOperation.adapter.events.includes('permit'), false);

  const lost = createModel({ exporter: true });
  const lostRun = execute(lost, { options: { monitorGrantLands: false } });
  assert.equal(lostRun.result.refusals[0].id, 'acl-verification-failed');
  assert.equal(lostRun.adapter.events.includes('permit'), false);
});

test('a collector role that turns unsafe between checkpoints stops before opening', () => {
  const model = createModel({ exporter: true });
  const adapter = adapterFor(model);
  const grant = adapter.grantMonitoringConnect;
  adapter.grantMonitoringConnect = (names) => {
    grant(names);
    model.roles[EXPORTER].createdb = true;
  };
  assert.equal(execute(model, { adapter }).result.refusals[0].id, 'monitoring-role-unsafe');
  assert.equal(adapter.events.includes('permit'), false);
});

// ---------------------------------------------------------------------------
// Live adapter: fixed projection and fixed monitoring operation
// ---------------------------------------------------------------------------

function liveExec(model, calls = []) {
  return (_file, args) => {
    if (args.includes('current-context')) return 'kind-offscreen-dev\n';
    const statement = args[args.lastIndexOf('-c') + 1];
    assert.ok(args.includes('ON_ERROR_STOP=1'));
    calls.push({ statement, flags: args });
    if (statement === CATALOG_SQL) {
      assert.ok(args.includes('-X') && args.includes('-w') && args.includes('-At'));
      return `${JSON.stringify(projectRaw(model))}\n`;
    }
    applySql(model, statement);
    return 'GRANT\n';
  };
}

test('catalog SQL is one fixed credential-free statement with real OID and ACL columns', () => {
  assert.equal(CATALOG_SQL.includes(';'), false);
  assert.match(CATALOG_SQL, /aclexplode\(COALESCE\(d\.datacl, acldefault\('d', d\.datdba\)\)\)/);
  assert.match(CATALOG_SQL, /pg_has_role\(o\.oid, e\.oid, 'MEMBER'\)/);
  assert.match(CATALOG_SQL, /has_database_privilege\(r\.oid, d\.oid, 'CONNECT'\)/);
  assert.doesNotMatch(CATALOG_SQL, /rolpassword|pg_authid|rolvaliduntil|passwd|FROM\s+pg_shadow/i);
});

test('live readCatalog derives legacy fields from real rows and rejects a malformed projection', () => {
  const model = createModel({ exporter: true });
  openTenant(model, 'dev-1');
  grantMonitor(model, 'dev_1');
  const adapter = createLiveDevSqlAdapter({ exec: liveExec(model) });
  const catalog = adapter.readCatalog();
  assert.equal(catalog.databases.dev_1.owner, 'dev_1_mig');
  assert.equal(catalog.databases.dev_1.publicConnect, false);
  assert.deepEqual(catalog.databases.dev_1.connect, ['dev_1_mig', 'dev_1_run', EXPORTER]);
  assert.equal(catalog.databases.dev_1.aclEntries.length, 5);
  assert.equal(catalog.roles[EXPORTER].oid, model.roles[EXPORTER].oid);
  assert.equal(catalog.databases.postgres.publicConnect, true);
  assert.equal(catalog.effectiveConnect.dev.dev, true);
  assert.equal(catalog.effectiveConnect.dev_1_run.dev_1, true);
  // dev still has default PUBLIC CONNECT here, so every role effectively reaches it.
  assert.equal(catalog.effectiveConnect.dev_1_run.dev, true);
  assert.equal(catalog.effectiveConnect.dev_1_run.template0, false);
  assert.deepEqual(catalog.monitor, { exporterOid: model.roles[EXPORTER].oid, monitorMember: true, assumers: [] });
});

test('projection parser fails closed on malformed, inconsistent and oversize evidence', () => {
  const model = createModel({ exporter: true });
  openTenant(model, 'dev-1');
  const good = () => structuredClone(projectRaw(model));
  const bad = {
    'not JSON': 'not json',
    oversize: ' '.repeat(1024 * 1024 + 1),
    'no roles': (raw) => { delete raw.roles; },
    'duplicate role': (raw) => { raw.roles.push(raw.roles[0]); },
    'duplicate database OID': (raw) => { raw.databases[1].oid = raw.databases[0].oid; },
    'zero database OID': (raw) => { raw.databases[0].oid = 0; },
    'owner not a role': (raw) => { raw.databases[0].ownerOid = 1; },
    'unknown privilege': (raw) => { raw.databases[0].acl[0].privilegeType = 'USAGE'; },
    'non-boolean grant option': (raw) => { raw.databases[0].acl[0].isGrantable = 'f'; },
    'unknown grantor': (raw) => { raw.databases[0].acl[0].grantorOid = 424242; },
    'duplicate ACL row': (raw) => { raw.databases[0].acl.push(raw.databases[0].acl[0]); },
    'missing role flag': (raw) => { delete raw.roles[0].bypassrls; },
    'pg_monitor missing': (raw) => { raw.roles = raw.roles.filter((role) => role.name !== 'pg_monitor'); },
    'exporter without monitor block': (raw) => { raw.monitor = null; },
    'exporter OID mismatch': (raw) => { raw.monitor.exporterOid = 7; },
    'assumer is unknown': (raw) => { raw.monitor.assumers = [31337]; },
    'incomplete effective matrix': (raw) => { raw.effective.pop(); },
    'effective row for unknown OID': (raw) => { raw.effective[0].databaseOid = 31337; },
    'database limit': (raw) => {
      raw.databases = Array.from({ length: 257 }, (_, index) => ({ ...raw.databases[0], oid: 70000 + index, name: `x${index}` }));
    },
    'ACL limit': (raw) => {
      raw.databases[0].acl = Array.from({ length: 8193 }, () => raw.databases[0].acl[0]);
    },
  };
  for (const [label, mutate] of Object.entries(bad)) {
    let text;
    if (typeof mutate === 'string') text = mutate;
    else {
      const raw = good();
      mutate(raw);
      text = JSON.stringify(raw);
    }
    assert.throws(() => parseCatalogProjection(text), { code: 'catalog-projection-invalid' }, label);
  }
  assert.doesNotThrow(() => parseCatalogProjection(JSON.stringify(good())));
});

test('grantMonitoringConnect issues one fixed GRANT on the derived closed slot only', () => {
  const model = createModel({ exporter: true });
  addRole(model, 'dev_1_mig');
  addRole(model, 'dev_1_run');
  addDatabase(model, 'dev_1', 'dev_1_mig', { open: false, publicAccess: false });
  addDatabase(model, 'dev_2', 'dev_1_mig', { open: false, publicAccess: false });
  const calls = [];
  const adapter = createLiveDevSqlAdapter({ exec: liveExec(model, calls) });
  const names = deriveDevSqlTenant('dev-1');
  adapter.grantMonitoringConnect(names);
  const writes = calls.filter((call) => call.statement !== CATALOG_SQL).map((call) => call.statement);
  assert.deepEqual(writes, [`GRANT CONNECT ON DATABASE "dev_1" TO "${EXPORTER}"`]);
  assert.deepEqual(exporterRows(model, 'dev_1'), [monitorRow(model, 'dev_1')]);
  assert.equal(exporterRows(model, 'dev_2').length, 0);
  // Idempotent on the exact grant.
  adapter.grantMonitoringConnect(names);
  assert.equal(calls.filter((call) => call.statement !== CATALOG_SQL).length, 1);
});

test('grantMonitoringConnect refuses wrong identity, open database, wrong owner, unsafe or absent role', () => {
  const names = deriveDevSqlTenant('dev-1');
  const setup = (mutate) => {
    const model = createModel({ exporter: true });
    addRole(model, 'dev_1_mig');
    addRole(model, 'dev_1_run');
    addDatabase(model, 'dev_1', 'dev_1_mig', { open: false, publicAccess: false });
    mutate?.(model);
    const calls = [];
    const adapter = createLiveDevSqlAdapter({ exec: liveExec(model, calls) });
    return { adapter, calls };
  };
  const writes = (calls) => calls.filter((call) => call.statement !== CATALOG_SQL);
  const refused = {
    'tampered database name': [{ ...names, database: 'dev_2' }, null],
    'tampered role': [{ ...names, runtimeRole: 'dev' }, null],
    'invalid slot': [{ slotId: 'dev-0' }, null],
    'open database': [names, (m) => { m.databases.dev_1.allowConnections = true; }],
    'wrong owner': [names, (m) => { m.databases.dev_1.ownerOid = m.roles.dev.oid; }],
    'missing database': [names, (m) => { delete m.databases.dev_1; }],
    'unsafe role': [names, (m) => { m.roles[EXPORTER].createrole = true; }],
    'absent role': [names, (m) => { delete m.roles[EXPORTER]; m.members = []; }],
    'non-superuser assumer': [names, (m) => { m.members.push({ member: 'dev', role: EXPORTER }); }],
    'existing odd grant': [names, (m) => grantMonitor(m, 'dev_1', { privilegeType: 'CREATE' })],
  };
  for (const [label, [request, mutate]] of Object.entries(refused)) {
    const { adapter, calls } = setup(mutate);
    assert.throws(() => adapter.grantMonitoringConnect(request), undefined, label);
    assert.equal(writes(calls).length, 0, label);
  }
});

test('execSql vocabulary does not widen: the monitor grant and arbitrary SQL are refused', () => {
  const model = createModel({ exporter: true });
  const calls = [];
  const adapter = createLiveDevSqlAdapter({ exec: liveExec(model, calls) });
  for (const statement of [
    `GRANT CONNECT ON DATABASE "dev_1" TO "${EXPORTER}"`,
    `GRANT CONNECT ON DATABASE "dev_1" TO "${EXPORTER}", "dev"`,
    `GRANT pg_monitor TO "dev"`,
    `ALTER ROLE "${EXPORTER}" SUPERUSER`,
    `REVOKE CONNECT ON DATABASE "dev_1" FROM "${EXPORTER}"`,
  ]) {
    assert.throws(() => adapter.execSql(statement), { code: 'unexpected-sql' }, statement);
  }
  assert.equal(calls.length, 0);
});
