#!/usr/bin/env node
// Explicit occupied-owner maintenance: grant the CNPG collector role exact CONNECT
// on an explicitly named, already-provisioned dev database. Dev only, never
// reachable from observability ensure, no role/password/Secret/schema/table change.
import { pathToFileURL } from 'node:url';
import { runPlatformCommand, assertPlatformTarget, readPlatformObject } from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import { assessCnpgClusterTopologyReadiness } from './cluster-readiness.mjs';
import { baselineCnpgClusterName } from './config.mjs';
import { createBaselineCustody } from './bootstrap/custody.mjs';
import { verifyExistingTemporalPersistence } from './temporal-persistence/prepare.mjs';
import { deriveDevSqlTenant } from '../../../tools/dev-environments/src/rendering/dev-sql-tenant-contract.mjs';
import { CATALOG_SQL, parseCatalogProjection } from '../../../tools/dev-environments/src/adapters/dev-sql-tenant-live-adapter.mjs';
import { assessMonitoringRole, monitorGrantState, MONITOR_ROLE } from '../../../tools/dev-environments/src/adapters/dev-sql-tenant-executor.mjs';

export const MAINTENANCE_ENV = 'OFFSCREEN_POSTGRES_MAINTENANCE';
export const MONITORING_ENV = 'OFFSCREEN_POSTGRES_MONITORING_ACCESS';
export const REQUIRED_CONTEXT = 'kind-offscreen-dev';
export const MUTATION_TIMEOUT_MS = 60_000;
const COMMITTED = 'monitoring-access-committed';
const ELEVATED = ['superuser', 'createdb', 'createrole', 'replication', 'bypassrls'];
const NAME = /^[a-z][a-z0-9_]{0,62}$/;
const SLOT_DB = /^dev_([1-9][0-9]*)$/;

class Refusal extends Error {
  constructor(id) { super(id); this.id = id; }
}
const refuse = (id) => { throw new Refusal(id); };

// ---- argument and authorization parsing ----

export function parseArguments(argv) {
  const [command, ...rest] = argv;
  if (command !== 'status' && command !== 'apply') refuse('unknown-command');
  let context = null;
  const databases = [];
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i];
    const value = rest[i + 1];
    if (typeof value !== 'string' || value.startsWith('--')) refuse('missing-flag-value');
    if (flag === '--confirm-context') {
      if (context !== null) refuse('duplicate-context');
      context = value;
    } else if (flag === '--database') {
      databases.push(value);
    } else refuse('unknown-argument');
  }
  if (context !== REQUIRED_CONTEXT) refuse('context-not-confirmed');
  if (databases.length === 0) refuse('no-database-selected');
  if (new Set(databases).size !== databases.length) refuse('duplicate-database');
  return { command, databases };
}

export function assertAuthorized(command, env) {
  if (command !== 'apply') return;
  if (env?.[MAINTENANCE_ENV] !== 'authorized') refuse('maintenance-not-authorized');
  if (env?.[MONITORING_ENV] !== 'authorized') refuse('monitoring-access-not-authorized');
}

/** Exact finite allowlist; never a pattern match against the live catalog. */
export function resolveSelection(databases) {
  const selected = [];
  for (const name of databases) {
    if (!NAME.test(name)) refuse('invalid-database-name');
    if (name === 'postgres') selected.push({ name, owner: 'postgres', kind: 'baseline' });
    else if (name === 'dev') selected.push({ name, owner: 'dev', kind: 'baseline' });
    else if (name === 'temporal' || name === 'temporal_visibility') {
      selected.push({ name, owner: 'temporal', kind: 'temporal' });
    } else {
      const match = SLOT_DB.exec(name);
      if (!match) refuse('database-not-allowed');
      let names;
      try { names = deriveDevSqlTenant(`dev-${match[1]}`); } catch { refuse('database-not-allowed'); }
      if (names.database !== name) refuse('database-not-allowed');
      selected.push({ name, owner: names.migrationRole, kind: 'tenant', names });
    }
  }
  const temporal = selected.filter((entry) => entry.kind === 'temporal').length;
  if (temporal !== 0 && temporal !== 2) refuse('temporal-pair-incomplete');
  return selected;
}

// ---- observation ----

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

const sortAcl = (rows) => rows.map(({ granteeOid, grantorOid, privilegeType, isGrantable }) =>
  ({ granteeOid, grantorOid, privilegeType, isGrantable }))
  .sort((a, b) => a.granteeOid - b.granteeOid || a.grantorOid - b.grantorOid ||
    (a.privilegeType < b.privilegeType ? -1 : a.privilegeType > b.privilegeType ? 1 : 0));

const aclCanon = (rows) => sortAcl(rows)
  .map((r) => `${r.granteeOid}:${r.grantorOid}:${r.privilegeType}:${r.isGrantable ? 1 : 0}`).join(',');

function readOne(run, spec) {
  const result = readPlatformObject(spec, { run });
  if (result.state !== 'present') refuse(`native-object-${result.state}`);
  const uid = result.object.metadata?.uid;
  if (typeof uid !== 'string' || !uid || result.object.metadata?.deletionTimestamp) refuse('native-object-identity');
  return result.object;
}

function podReady(pod) {
  return Array.isArray(pod.status?.conditions) &&
    pod.status.conditions.some((c) => c?.type === 'Ready' && c.status === 'True');
}

function observeTenantDeclarations(run, profile, entry) {
  const { names } = entry;
  const cluster = baselineCnpgClusterName('dev');
  const ns = profile.namespaces.postgres;
  const labelsOk = (object) => object.metadata?.labels?.['offscreen.dev/owner'] === 'offscreen-dev' &&
    object.metadata?.labels?.['offscreen.dev/slot'] === names.slotId;
  const database = readOne(run, { profileId: 'dev', resource: 'database.postgresql.cnpg.io', name: names.databaseCr, namespace: ns });
  if (database.spec?.cluster?.name !== cluster || database.spec?.name !== names.database ||
      database.spec?.owner !== names.migrationRole || database.status?.applied !== true ||
      !labelsOk(database)) refuse('tenant-database-declaration');
  const roles = [[names.migrationRoleCr, names.migrationRole], [names.runtimeRoleCr, names.runtimeRole]].map(([crName, role]) => {
    const cr = readOne(run, { profileId: 'dev', resource: 'databaserole.postgresql.cnpg.io', name: crName, namespace: ns });
    if (cr.spec?.cluster?.name !== cluster || cr.spec?.name !== role || cr.status?.applied !== true ||
        cr.spec?.superuser === true || !labelsOk(cr)) refuse('tenant-role-declaration');
    return cr.metadata.uid;
  });
  return { database: database.metadata.uid, migration: roles[0], runtime: roles[1] };
}

function psqlArgs(profile, primary) {
  return ['--context', profile.contextName, '-n', profile.namespaces.postgres, 'exec', '-i', primary, '-c', 'postgres', '--',
    'psql', '-X', '-w', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'];
}

function approvedDatabaseName(name) {
  return name === 'postgres' || name === 'dev' || name === 'temporal' || name === 'temporal_visibility' || SLOT_DB.test(name);
}

/** One complete observation; every field is compared across checkpoints. */
function observe(run, selection, deps) {
  const profile = readPlatformProfile('dev');
  if (profile.contextName !== REQUIRED_CONTEXT) refuse('context-profile-mismatch');
  let target;
  try { target = deps.assertTarget('dev', { run }); } catch { refuse('target-unverified'); }
  const ns = profile.namespaces.postgres;
  const clusterName = baselineCnpgClusterName('dev');
  const kubeSystem = readOne(run, { profileId: 'dev', resource: 'namespace', name: 'kube-system' });
  const namespace = readOne(run, { profileId: 'dev', resource: 'namespace', name: ns });
  if (namespace.metadata?.labels?.[`${profile.ownerLabel}/owner`] !== profile.ownerValue) refuse('namespace-foreign');
  const cluster = readOne(run, { profileId: 'dev', resource: 'cluster.postgresql.cnpg.io', name: clusterName, namespace: ns });
  const readiness = assessCnpgClusterTopologyReadiness(cluster, cluster.spec?.instances);
  if (!readiness.ok) refuse('cluster-not-ready');
  const primary = readiness.currentPrimary;
  const pod = readOne(run, { profileId: 'dev', resource: 'pod', name: primary, namespace: ns });
  const owner = pod.metadata?.ownerReferences?.find((ref) => ref?.kind === 'Cluster' && ref.uid === cluster.metadata.uid);
  if (!podReady(pod) || pod.metadata.labels?.['cnpg.io/cluster'] !== clusterName ||
      pod.metadata.labels?.['cnpg.io/instanceRole'] !== 'primary' || !owner) refuse('primary-identity');
  const image = pod.spec?.containers?.find((c) => c?.name === 'postgres')?.image;
  if (typeof image !== 'string' || !image) refuse('primary-image-unpinned');

  if (selection.some((entry) => entry.kind === 'temporal')) {
    const temporal = deps.verifyTemporal('dev', { run });
    if (temporal?.ok !== true) refuse('temporal-persistence-unverified');
  }
  const declarations = {};
  for (const entry of selection.filter((item) => item.kind === 'tenant')) {
    declarations[entry.name] = observeTenantDeclarations(run, profile, entry);
  }

  const sql = run('kubectl', psqlArgs(profile, primary).concat('-At'), { input: CATALOG_SQL, timeoutMs: 30_000 });
  if (!sql.ok) refuse('catalog-unreadable');
  let catalog;
  try { catalog = parseCatalogProjection(sql.stdout); } catch { refuse('catalog-projection-invalid'); }

  const role = assessMonitoringRole(catalog);
  if (role.state === 'absent') refuse('monitor-role-absent');
  if (role.state !== 'safe') refuse('monitor-role-unsafe');
  const grants = {};
  for (const [name, database] of Object.entries(catalog.databases)) {
    const state = monitorGrantState(catalog, name);
    if (state === 'invalid') refuse('monitor-acl-invalid');
    if (state === 'exact' && (!approvedDatabaseName(name) || database.owner === undefined)) refuse('monitor-acl-unapproved');
    grants[name] = state;
  }
  const states = [];
  for (const entry of selection) {
    const database = catalog.databases[entry.name];
    if (!database) refuse('database-missing');
    if (database.owner !== entry.owner) refuse('database-owner-mismatch');
    const ownerRole = catalog.roles[entry.owner];
    if (!ownerRole || (entry.owner !== 'postgres' && ELEVATED.some((flag) => ownerRole[flag] !== false))) refuse('owner-role-unsafe');
    if (entry.kind === 'tenant') {
      for (const roleName of [entry.names.migrationRole, entry.names.runtimeRole]) {
        const tenantRole = catalog.roles[roleName];
        if (!tenantRole || ELEVATED.some((flag) => tenantRole[flag] !== false)) refuse('tenant-role-unsafe');
      }
    }
    states.push({ name: entry.name, state: grants[entry.name], oid: database.oid, ownerOid: database.ownerOid });
  }

  const fingerprint = {
    baselineUid: target?.baselineUid ?? null,
    kubeSystemUid: kubeSystem.metadata.uid,
    namespaceUid: namespace.metadata.uid,
    clusterUid: cluster.metadata.uid,
    primary,
    primaryUid: pod.metadata.uid,
    image,
    exporterOid: role.oid,
    declarations,
    databases: Object.fromEntries(Object.entries(catalog.databases).map(([name, d]) =>
      [name, { oid: d.oid, ownerOid: d.ownerOid, allowConnections: d.allowConnections, acl: sortAcl(d.aclEntries) }])),
    roles: catalog.roles,
    monitor: catalog.monitor,
    effectiveConnect: catalog.effectiveConnect,
  };
  return { fingerprint, states, primary, profile, exporterOid: role.oid };
}

// ---- mutation SQL (fixed vocabulary; identifiers only from the exact allowlist) ----

const ident = (name) => {
  if (!NAME.test(name)) refuse('invalid-database-name');
  return `"${name}"`;
};
const literal = (name) => `'${ident(name).slice(1, -1)}'`;

function databaseCanonSql(name, oid, ownerOid) {
  return `(SELECT COALESCE(string_agg(a.grantee::bigint || ':' || a.grantor::bigint || ':' || a.privilege_type || ':' || ` +
    `(CASE WHEN a.is_grantable THEN 1 ELSE 0 END)::text, ',' ORDER BY a.grantee, a.grantor, a.privilege_type COLLATE "C"), '') ` +
    `FROM pg_database d CROSS JOIN LATERAL aclexplode(COALESCE(d.datacl, acldefault('d', d.datdba))) a ` +
    `WHERE d.datname = ${literal(name)} AND d.oid = ${Number(oid)} AND d.datdba = ${Number(ownerOid)})`;
}

const assertBlock = (condition) =>
  `DO $monitoring$ BEGIN IF NOT (${condition}) THEN RAISE EXCEPTION 'monitoring-access-drift'; END IF; END $monitoring$;`;

export function buildApplySql(snapshot, grantNames) {
  const { fingerprint, exporterOid } = snapshot;
  const exporter = Number(exporterOid);
  const lines = [
    'BEGIN;',
    "SET LOCAL lock_timeout = '5s';",
    "SET LOCAL statement_timeout = '20s';",
    "SET LOCAL transaction_timeout = '45s';",
    assertBlock(`(SELECT count(*) FROM pg_roles r WHERE r.rolname = '${MONITOR_ROLE}' AND r.oid = ${exporter} AND r.rolcanlogin ` +
      'AND NOT (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls) ' +
      "AND pg_has_role(r.oid, 'pg_monitor', 'MEMBER')) = 1 " +
      `AND NOT EXISTS (SELECT 1 FROM pg_roles o WHERE o.oid <> ${exporter} AND NOT o.rolsuper AND pg_has_role(o.oid, ${exporter}, 'MEMBER'))`),
  ];
  for (const name of grantNames) {
    const { oid, ownerOid, acl } = fingerprint.databases[name];
    lines.push(assertBlock(`${databaseCanonSql(name, oid, ownerOid)} = '${aclCanon(acl)}' ` +
      `AND EXISTS (SELECT 1 FROM pg_database WHERE datname = ${literal(name)} AND oid = ${Number(oid)} AND datdba = ${Number(ownerOid)})`));
  }
  for (const name of grantNames) lines.push(`GRANT CONNECT ON DATABASE ${ident(name)} TO ${MONITOR_ROLE};`);
  for (const name of grantNames) {
    const { oid, ownerOid, acl } = fingerprint.databases[name];
    const after = aclCanon([...acl, { granteeOid: exporter, grantorOid: ownerOid, privilegeType: 'CONNECT', isGrantable: false }]);
    lines.push(assertBlock(`${databaseCanonSql(name, oid, ownerOid)} = '${after}'`));
  }
  lines.push('COMMIT;', `SELECT '${COMMITTED}';`);
  return `${lines.join('\n')}\n`;
}

// ---- command ----

const report = (command, ok, outcome, extra = {}) => ({ ok, command, outcome, ...extra });
const summary = (states) => states.map(({ name, state }) => ({ name, state }));

function expectedAfter(before, grantNames) {
  const next = JSON.parse(JSON.stringify(before));
  for (const name of grantNames) {
    next.databases[name].acl = sortAcl([...next.databases[name].acl,
      { granteeOid: next.exporterOid, grantorOid: next.databases[name].ownerOid, privilegeType: 'CONNECT', isGrantable: false }]);
  }
  return next;
}

export function runMonitoringAccess(argv, deps = {}) {
  const env = deps.env ?? process.env;
  const full = {
    run: deps.run ?? runPlatformCommand,
    createCustody: deps.createCustody ?? (() => createBaselineCustody()),
    assertTarget: deps.assertTarget ?? assertPlatformTarget,
    verifyTemporal: deps.verifyTemporal ?? verifyExistingTemporalPersistence,
  };
  let command = argv?.[0];
  let custody;
  let dispatched = false;
  try {
    const parsed = parseArguments(argv);
    command = parsed.command;
    assertAuthorized(command, env);
    const selection = resolveSelection(parsed.databases);

    if (command === 'status') {
      const view = observe(full.run, selection, full);
      return report(command, true, 'observed', {
        databases: summary(view.states.map((s) => ({ ...s, state: s.state === 'exact' ? 'granted' : 'missing' }))),
        pending: view.states.filter((s) => s.state === 'none').length,
      });
    }

    custody = full.createCustody();
    custody.acquire();
    const first = observe(custody.run, selection, full);
    const grantNames = first.states.filter((s) => s.state === 'none').map((s) => s.name);
    if (grantNames.length === 0) {
      return report(command, true, 'unchanged', {
        databases: summary(first.states.map((s) => ({ ...s, state: 'granted' }))), changed: 0,
      });
    }
    if (custody.remaining() < MUTATION_TIMEOUT_MS) refuse('custody-budget-insufficient');
    const second = observe(custody.run, selection, full);
    if (stable(second.fingerprint) !== stable(first.fingerprint)) refuse('observation-drift');
    if (custody.remaining() < MUTATION_TIMEOUT_MS) refuse('custody-budget-insufficient');

    const sql = buildApplySql(second, grantNames);
    dispatched = true;
    const result = custody.run('kubectl', psqlArgs(second.profile, second.primary), {
      input: sql, timeoutMs: MUTATION_TIMEOUT_MS, mutation: true,
    });
    const acknowledged = result.ok === true && String(result.stdout).split('\n').some((line) => line.trim() === COMMITTED);
    if (!acknowledged) {
      return report(command, false, 'unknown-outcome', {
        refusals: [{ id: 'unknown-commit-outcome' }], retried: false,
        note: 'Outcome unknown; no retry and no automatic rollback. Inspect status before any further action.',
      });
    }
    let readback;
    try { readback = observe(custody.run, selection, full); } catch {
      return report(command, false, 'committed-readback-unavailable', {
        refusals: [{ id: 'readback-unavailable' }], changed: grantNames.length,
      });
    }
    const exact = stable(readback.fingerprint) === stable(expectedAfter(second.fingerprint, grantNames)) &&
      readback.states.every((s) => s.state === 'exact');
    if (!exact) {
      return report(command, false, 'postcheck-mismatch', {
        refusals: [{ id: 'postcheck-mismatch' }], changed: grantNames.length,
        note: 'Committed ACLs are not rolled back automatically.',
      });
    }
    return report(command, true, 'applied', {
      databases: summary(readback.states.map((s) => ({ ...s, state: grantNames.includes(s.name) ? 'granted-now' : 'granted' }))),
      changed: grantNames.length,
    });
  } catch (error) {
    const id = error instanceof Refusal ? error.id : 'unexpected-failure';
    return report(command, false, dispatched ? 'unknown-outcome' : 'refused', { refusals: [{ id }], retried: false });
  } finally {
    custody?.close();
  }
}

export function main(argv = process.argv.slice(2), deps = {}) {
  const result = runMonitoringAccess(argv, deps);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
