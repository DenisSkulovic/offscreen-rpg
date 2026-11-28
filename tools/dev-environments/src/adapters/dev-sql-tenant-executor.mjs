import {
  DEV_CNPG_CLUSTER,
  DEV_CNPG_CONTEXT,
  DEV_CNPG_NAMESPACE,
  DEV_CNPG_OWNER,
} from '../../../../infra/platform/postgres/config.mjs';
import {
  deriveDevSqlTenant,
  renderDevSqlTenant,
} from '../rendering/dev-sql-tenant-contract.mjs';
import { quoteSqlIdent } from './dev-sql-tenant-reconciler.mjs';

const LIVE_TOKEN = 'kind-offscreen-dev-sql-tenant-live';
const BASELINE = new Set(['postgres', 'dev', 'template0', 'template1']);

export const MONITOR_ROLE = 'cnpg_metrics_exporter';
const ELEVATED_FLAGS = ['superuser', 'createdb', 'createrole', 'replication', 'bypassrls'];
const PRIVILEGES = new Set(['CONNECT', 'TEMPORARY', 'CREATE']);

function refusal(id, detail) {
  return { id, detail };
}

// ---- Exact monitoring-access predicates (shared with the live adapter) ----
// The catalog is the real OID/ACL/effective-privilege projection. Absent or
// malformed evidence is a refusal, never an absent grant.

const isOid = (value) => Number.isSafeInteger(value) && value > 0;

function derivedRoleNames(knownSlots) {
  return knownSlots.flatMap((slotId) => {
    const names = deriveDevSqlTenant(slotId);
    return [names.migrationRole, names.runtimeRole];
  });
}

/** Roles whose effective CONNECT matrix and non-elevation the catalog must prove. */
function subjectRoles(catalog, knownSlots) {
  return ['dev', 'temporal', ...derivedRoleNames(knownSlots)].filter((name) =>
    Object.hasOwn(catalog.roles, name),
  );
}

function projectionShapeFault(catalog) {
  const { databases, roles, monitor, effectiveConnect } = catalog ?? {};
  if (!databases || !roles || !effectiveConnect || typeof monitor !== 'object' || monitor === null) {
    return 'projection missing';
  }
  if (!Array.isArray(monitor.assumers) ||
      (monitor.exporterOid !== null && !isOid(monitor.exporterOid))) {
    return 'monitor projection invalid';
  }
  for (const [name, role] of Object.entries(roles)) {
    if (!isOid(role?.oid)) return `role ${name} lacks a real OID`;
  }
  for (const [name, database] of Object.entries(databases)) {
    if (!isOid(database?.oid) || !isOid(database.ownerOid) || !Array.isArray(database.aclEntries)) {
      return `database ${name} lacks OID/owner/ACL evidence`;
    }
    for (const row of database.aclEntries) {
      if (!Number.isSafeInteger(row?.granteeOid) || row.granteeOid < 0 ||
          !isOid(row.grantorOid) || !PRIVILEGES.has(row.privilegeType) ||
          typeof row.isGrantable !== 'boolean') {
        return `database ${name} has an invalid ACL row`;
      }
    }
  }
  return null;
}

/**
 * State of the CNPG collector role. "safe" requires the real catalog OID, LOGIN,
 * no elevated flag, pg_monitor membership and no non-superuser path to the role
 * (direct, transitive or NOINHERIT; the projection uses pg_has_role MEMBER).
 * @returns {{state: 'absent'} | {state: 'safe', oid: number} | {state: 'unsafe', detail: string}}
 */
export function assessMonitoringRole(catalog) {
  const { monitor } = catalog;
  const role = Object.hasOwn(catalog.roles, MONITOR_ROLE) ? catalog.roles[MONITOR_ROLE] : null;
  if (monitor.exporterOid === null && role === null) {
    return monitor.assumers.length === 0
      ? { state: 'absent' }
      : { state: 'unsafe', detail: 'membership without role' };
  }
  if (role === null || role.oid !== monitor.exporterOid) {
    return { state: 'unsafe', detail: 'role identity mismatch' };
  }
  if (role.login !== true || ELEVATED_FLAGS.some((flag) => role[flag] !== false)) {
    return { state: 'unsafe', detail: 'role flags' };
  }
  if (monitor.monitorMember !== true) return { state: 'unsafe', detail: 'not a pg_monitor member' };
  if (monitor.assumers.length > 0) return { state: 'unsafe', detail: 'role can be assumed' };
  return { state: 'safe', oid: role.oid };
}

/**
 * Exact exporter ACL rows on one database: 'none' (predecessor) or 'exact'
 * (CONNECT, no grant option, granted by the owner); anything else is 'invalid'.
 */
export function monitorGrantState(catalog, databaseName) {
  const database = catalog.databases[databaseName];
  const rows = database.aclEntries.filter((row) => row.granteeOid === catalog.monitor.exporterOid);
  if (catalog.monitor.exporterOid === null || rows.length === 0) return 'none';
  const [row] = rows;
  return rows.length === 1 && row.privilegeType === 'CONNECT' &&
    row.isGrantable === false && row.grantorOid === database.ownerOid
    ? 'exact'
    : 'invalid';
}

function roleNameByOid(catalog, oid) {
  return Object.keys(catalog.roles).find((name) => catalog.roles[name].oid === oid) ?? null;
}

/** Databases that may carry the exporter CONNECT row, with their required owner. */
function approvedMonitorDatabases(knownSlots) {
  const approved = new Map([
    ['postgres', 'postgres'],
    ['dev', 'dev'],
    ['temporal', 'temporal'],
    ['temporal_visibility', 'temporal'],
  ]);
  for (const slotId of knownSlots) {
    const names = deriveDevSqlTenant(slotId);
    approved.set(names.database, names.migrationRole);
  }
  return approved;
}

/**
 * Whole-catalog checkpoint: complete real projection, safe-or-absent exporter,
 * non-elevated application identities, full effective-CONNECT evidence, and zero
 * or one exact exporter row on every approved database and none elsewhere.
 */
function validateMonitoringCatalog(catalog, knownSlots, extra = {}) {
  const shape = projectionShapeFault(catalog);
  if (shape) return stopped('monitoring-catalog-incomplete', shape, extra);
  const role = assessMonitoringRole(catalog);
  if (role.state === 'unsafe') return stopped('monitoring-role-unsafe', role.detail, extra);
  for (const name of subjectRoles(catalog, knownSlots)) {
    if (ELEVATED_FLAGS.some((flag) => catalog.roles[name][flag] !== false)) {
      return stopped('elevated-role', name, extra);
    }
    for (const database of Object.keys(catalog.databases)) {
      if (typeof catalog.effectiveConnect[name]?.[database] !== 'boolean') {
        return stopped('monitoring-catalog-incomplete', `effective CONNECT ${name}->${database}`, extra);
      }
    }
  }
  const approved = approvedMonitorDatabases(knownSlots);
  for (const [name, database] of Object.entries(catalog.databases)) {
    const grant = monitorGrantState(catalog, name);
    if (grant === 'none') continue;
    if (grant !== 'exact' || roleNameByOid(catalog, database.ownerOid) !== approved.get(name)) {
      return stopped('monitor-acl-unapproved', name, extra);
    }
  }
  return null;
}

/** ACL-only effective CONNECT (inheritance included), regardless of datallowconn. */
function effectiveAclConnect(catalog, role, databaseName) {
  const database = catalog.databases[databaseName];
  if (!database) return false;
  if (Object.hasOwn(catalog.roles, role)) {
    const value = catalog.effectiveConnect[role]?.[databaseName];
    if (typeof value !== 'boolean') throw new Error(`missing effective CONNECT evidence for ${role}`);
    return value;
  }
  // Hypothetical role with no catalog entry: only PUBLIC can reach it.
  return database.publicConnect === true;
}

function canConnectEffective(catalog, role, databaseName) {
  return catalog.databases[databaseName]?.allowConnections === true &&
    effectiveAclConnect(catalog, role, databaseName);
}

function stopped(id, detail, extra = {}) {
  return {
    ok: false,
    mutated: Boolean(extra.retained?.length),
    refusals: [refusal(id, detail)],
    ...extra,
  };
}

export function planDevSqlChanges(catalog, slots) {
  const actions = [];
  for (const name of ['postgres', 'dev', 'template1']) {
    const database = catalog.databases[name];
    if (database?.publicConnect || database?.publicTemporary) {
      actions.push(
        `REVOKE CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent(name)} FROM PUBLIC`,
      );
    }
  }
  if (!catalog.databases.dev?.connect.includes('dev')) {
    actions.push(
      `GRANT CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent('dev')} TO ${quoteSqlIdent('dev')}`,
    );
  }
  for (const slotId of slots) {
    const names = deriveDevSqlTenant(slotId);
    actions.push(
      `APPLY closed Database ${names.database} owner ${names.migrationRole}`,
    );
    actions.push(
      `REVOKE CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent(names.database)} FROM PUBLIC`,
    );
    actions.push(
      `GRANT CONNECT ON DATABASE ${quoteSqlIdent(names.database)} TO ${quoteSqlIdent(names.migrationRole)}, ${quoteSqlIdent(names.runtimeRole)}`,
    );
    actions.push(`ALLOW CONNECTIONS ${names.database} after ACL proof`);
  }
  return {
    context: DEV_CNPG_CONTEXT,
    namespace: DEV_CNPG_NAMESPACE,
    cluster: DEV_CNPG_CLUSTER,
    readOnly: true,
    actions,
  };
}

function assertIdentity(identity) {
  if (
    !identity ||
    identity.context !== DEV_CNPG_CONTEXT ||
    identity.namespace !== DEV_CNPG_NAMESPACE ||
    identity.cluster !== DEV_CNPG_CLUSTER
  ) {
    return stopped(
      'wrong-binding',
      'executor is bound to kind-offscreen-dev/offscreen-dev-postgres/dev-pg',
    );
  }
  if (identity.owner !== DEV_CNPG_OWNER)
    return stopped('foreign-owner', identity.owner ?? 'missing');
  if (identity.ready !== true)
    return stopped('cnpg-not-ready', DEV_CNPG_CLUSTER);
  if (identity.changedContext === true)
    return stopped('ambient-context', 'kubectl context must stay unchanged');
  return null;
}

function baselineStatements(catalog) {
  const statements = [];
  for (const name of ['postgres', 'dev', 'template1']) {
    const database = catalog.databases[name];
    if (!database) return { refusals: [refusal('unknown-database', name)] };
    if (database.publicConnect || database.publicTemporary) {
      statements.push(
        `REVOKE CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent(name)} FROM PUBLIC`,
      );
    }
  }
  if (!catalog.databases.dev.connect.includes('dev')) {
    statements.push(
      `GRANT CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent('dev')} TO ${quoteSqlIdent('dev')}`,
    );
  }
  return { statements, refusals: [] };
}

function aclsMatch(catalog, database, names) {
  return (
    database.publicConnect === false &&
    database.publicTemporary === false &&
    database.connect.includes(names.migrationRole) &&
    database.connect.includes(names.runtimeRole) &&
    !database.connect.includes('dev') &&
    !effectiveAclConnect(catalog, 'dev', names.database) &&
    monitorGrantState(catalog, names.database) !== 'invalid'
  );
}

// Before opening, no other tenant, dev or Temporal identity may reach the
// selected database through any direct or inherited CONNECT.
function proveSelectedClosedFence(catalog, names, knownSlots) {
  const own = new Set([names.migrationRole, names.runtimeRole]);
  for (const role of subjectRoles(catalog, knownSlots)) {
    if (!own.has(role) && effectiveAclConnect(catalog, role, names.database)) {
      return stopped('cross-tenant', `${role}->${names.database}`);
    }
  }
  return null;
}

function catalogAllowlist(knownSlots) {
  const allowed = new Set(BASELINE);
  for (const slotId of knownSlots)
    allowed.add(deriveDevSqlTenant(slotId).database);
  return allowed;
}

function admitPlatformDatabases(catalog, adapter, allowed) {
  const names = ['temporal', 'temporal_visibility'];
  const present = names.filter(name => Object.hasOwn(catalog.databases, name));
  if (present.length === 0 && !Object.hasOwn(catalog.roles, 'temporal')) return null;
  if (present.length !== names.length ||
      !Object.hasOwn(catalog.roles, 'temporal') ||
      names.some(name => {
        const db = catalog.databases[name];
        return db.owner !== 'temporal' || db.allowConnections !== true ||
          db.publicConnect !== false || db.publicTemporary !== false ||
          !Array.isArray(db.connect) ||
          monitorGrantState(catalog, name) === 'invalid' ||
          db.connect.some(role => role !== 'temporal' && role !== MONITOR_ROLE);
      })) return stopped('temporal-persistence-unverified', 'partial or unsafe SQL inventory');
  const proof = adapter.verifyTemporalPersistence?.();
  if (proof?.ok !== true) return stopped('temporal-persistence-unverified', 'platform ownership or isolation not proven');
  for (const name of names) allowed.add(name);
  return null;
}

function proveKnownTenantsBeforeWrites(catalog, knownSlots) {
  for (const slotId of knownSlots) {
    const names = deriveDevSqlTenant(slotId);
    const database = catalog.databases[names.database];
    if (!database) continue;
    if (database.owner !== names.migrationRole) {
      return stopped('foreign-database-owner', database.owner ?? 'missing');
    }
    if (database.allowConnections === true && !aclsMatch(catalog, database, names)) {
      return stopped('opened-before-grants', names.database);
    }
  }
  for (const left of knownSlots) {
    for (const right of knownSlots) {
      if (left === right) continue;
      const source = deriveDevSqlTenant(left);
      const target = deriveDevSqlTenant(right);
      if (effectiveAclConnect(catalog, source.runtimeRole, target.database)) {
        return stopped(
          'cross-tenant',
          `${source.runtimeRole}->${target.database}`,
        );
      }
      if (effectiveAclConnect(catalog, source.migrationRole, target.database)) {
        return stopped(
          'cross-tenant',
          `${source.migrationRole}->${target.database}`,
        );
      }
    }
  }
  return null;
}

function resourceByName(resources, name) {
  return resources.find((resource) => resource?.name === name) ?? null;
}

function validateSelectedResources(catalog, names, resources) {
  const expected = [names.migrationSecret, names.runtimeSecret];
  for (const secretName of expected) {
    const item = resourceByName(resources, secretName);
    if (item?.unreadable === true)
      return stopped('unreadable-resource', secretName);
    if (item && item.owner !== DEV_CNPG_OWNER)
      return stopped('foreign-resource', secretName);
    if (item && item.slot !== names.slotId)
      return stopped('foreign-resource', secretName);
  }
  for (const crName of [
    names.migrationRoleCr,
    names.runtimeRoleCr,
    names.databaseCr,
  ]) {
    const item = resourceByName(resources, crName);
    if (item?.unreadable === true)
      return stopped('unreadable-resource', crName);
    if (item && item.owner !== DEV_CNPG_OWNER)
      return stopped('foreign-resource', crName);
    if (item && item.slot !== names.slotId)
      return stopped('foreign-resource', crName);
  }

  const database = catalog.databases[names.database];
  const hasRoles = Boolean(
    catalog.roles[names.migrationRole] && catalog.roles[names.runtimeRole],
  );
  const persistent = Boolean(database || hasRoles);
  const presentSecrets = expected.filter((name) => {
    const item = resourceByName(resources, name);
    return item && item.unreadable !== true;
  });
  if (
    presentSecrets.length === 1 &&
    presentSecrets.length < expected.length &&
    persistent
  ) {
    return stopped('partial-identity', names.slotId);
  }
  const presentCrs = [
    names.migrationRoleCr,
    names.runtimeRoleCr,
    names.databaseCr,
  ].filter((name) => {
    const item = resourceByName(resources, name);
    return item && item.unreadable !== true;
  });
  if (presentCrs.length > 0 && presentCrs.length < 3 && persistent) {
    return stopped('partial-identity', names.slotId);
  }
  if (presentCrs.length > 0 && presentSecrets.length === 0 && persistent) {
    return stopped('missing-credential', names.slotId);
  }
  return null;
}

function ensureSecrets(adapter, names, resources, retained) {
  const expected = [names.migrationSecret, names.runtimeSecret];
  const missing = expected.filter((secretName) => {
    const item = resourceByName(resources, secretName);
    return !item || item.unreadable === true;
  });
  if (missing.length === 0) {
    for (const secretName of expected) {
      const item = resourceByName(resources, secretName);
      retained.push({ name: item.name, uid: item.uid });
    }
    return null;
  }
  if (missing.length === 1 && missing.length < expected.length) {
    const created = adapter.createSecrets(names, { only: missing });
    retained.push(...created.map(({ name, uid }) => ({ name, uid })));
    for (const secretName of expected) {
      if (!missing.includes(secretName)) {
        const item = resourceByName(resources, secretName);
        retained.push({ name: item.name, uid: item.uid });
      }
    }
    return null;
  }
  if (missing.length === 2) {
    const created = adapter.createSecrets(names);
    retained.push(...created.map(({ name, uid }) => ({ name, uid })));
    return null;
  }
  return stopped('missing-credential', names.slotId);
}

function proveCrossTenantAfterWrites(catalog, knownSlots) {
  for (const left of knownSlots) {
    for (const right of knownSlots) {
      if (left === right) continue;
      const source = deriveDevSqlTenant(left);
      const target = deriveDevSqlTenant(right);
      if (!catalog.databases[target.database]) continue;
      if (effectiveAclConnect(catalog, source.runtimeRole, target.database)) {
        return stopped(
          'cross-tenant',
          `${source.runtimeRole}->${target.database}`,
        );
      }
      if (effectiveAclConnect(catalog, source.migrationRole, target.database)) {
        return stopped(
          'cross-tenant',
          `${source.migrationRole}->${target.database}`,
        );
      }
    }
  }
  return null;
}

export function executeDevSqlTenants({
  knownSlots,
  selectedSlot,
  authorizeLive,
  adapter,
  failAt,
}) {
  if (authorizeLive !== LIVE_TOKEN)
    return stopped(
      'ensure-not-authorized',
      'live SQL tenant ensure remains held',
    );
  if (!adapter || adapter.injectedProbe === true)
    return stopped(
      'injected-probe',
      'an injected probe cannot authorize mutation',
    );
  if (!Array.isArray(knownSlots) || knownSlots.length === 0) {
    return stopped(
      'invalid-selection',
      'knownSlots must list reserved slot ids',
    );
  }
  if (!knownSlots.includes(selectedSlot)) {
    return stopped(
      'invalid-selection',
      `${selectedSlot} is not a known reservation`,
    );
  }
  const binding = assertIdentity(adapter.identity());
  if (binding) return binding;

  let catalog = adapter.readCatalog();
  const initialCheck = validateMonitoringCatalog(catalog, knownSlots);
  if (initialCheck) return initialCheck;
  if (canConnectEffective(catalog, 'dev', 'dev') !== true)
    return stopped('dev-login-unusable', 'database dev');

  const allowed = catalogAllowlist(knownSlots);
  const platform = admitPlatformDatabases(catalog, adapter, allowed);
  if (platform) return platform;
  const unexpected = Object.keys(catalog.databases).filter(
    (name) => !allowed.has(name),
  );
  if (unexpected.length > 0)
    return stopped('unexpected-database', unexpected.join(','));

  const preProof = proveKnownTenantsBeforeWrites(catalog, knownSlots);
  if (preProof) return preProof;

  const baseline = baselineStatements(catalog);
  if (baseline.refusals.length > 0)
    return { ok: false, mutated: false, refusals: baseline.refusals };
  if (failAt === 'baseline')
    return stopped('baseline-leak', 'PUBLIC CONNECT remains');

  let mutated = false;
  for (const sql of baseline.statements) {
    adapter.execSql(sql);
    mutated = true;
  }
  if (baseline.statements.length > 0) {
    catalog = adapter.readCatalog();
    const baselineCheck = validateMonitoringCatalog(catalog, knownSlots);
    if (baselineCheck) return baselineCheck;
  }
  if (
    canConnectEffective(catalog, 'fixture', 'postgres') ||
    canConnectEffective(catalog, 'dev', 'dev') !== true
  ) {
    return stopped(
      'baseline-leak',
      'baseline CONNECT does not match the selected fence',
    );
  }

  const names = deriveDevSqlTenant(selectedSlot);
  const rendered = renderDevSqlTenant(selectedSlot);
  const resources = adapter.resources(names);
  const resourceProof = validateSelectedResources(catalog, names, resources);
  if (resourceProof) return resourceProof;

  const retained = [];
  const secrets = ensureSecrets(adapter, names, resources, retained);
  if (secrets) return secrets;

  if (failAt === `before-database:${selectedSlot}`)
    return stopped('partial-create', names.database, { retained });

  const database = catalog.databases[names.database];
  if (database?.allowConnections === true) {
    if (database.owner === names.migrationRole && aclsMatch(catalog, database, names)) {
      const cross = proveCrossTenantAfterWrites(catalog, knownSlots);
      if (cross) return { ...cross, retained };
      return {
        ok: true,
        mutated,
        refusals: [],
        retained,
        devLogin: canConnectEffective(catalog, 'dev', 'dev'),
        ambientContext: adapter.identity().ambientContext ?? null,
      };
    }
    return stopped('opened-before-grants', names.database, { retained });
  }

  if (database && database.owner !== names.migrationRole) {
    return stopped('foreign-database-owner', database.owner ?? 'missing', {
      retained,
    });
  }

  adapter.applyClosedDatabase(rendered, names);
  mutated = true;
  const observed = adapter.waitFor(names);
  if (!observed || observed.ready !== true)
    return stopped('cnpg-reconcile-failed', names.database, { retained });
  if (observed.allowConnections !== false)
    return stopped('cnpg-allow-connections', names.database, { retained });
  if (observed.owner !== names.migrationRole)
    return stopped('foreign-database-owner', observed.owner ?? 'missing', {
      retained,
    });

  catalog = adapter.readCatalog();
  const createdCheck = validateMonitoringCatalog(catalog, knownSlots, { retained });
  if (createdCheck) return createdCheck;
  if (!catalog.databases[names.database])
    return stopped('unknown-database', names.database, { retained });
  if (
    !catalog.roles[names.migrationRole] ||
    !catalog.roles[names.runtimeRole]
  ) {
    return stopped('unknown-role', names.slotId, { retained });
  }

  for (const sql of [
    `REVOKE CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent(names.database)} FROM PUBLIC`,
    `GRANT CONNECT ON DATABASE ${quoteSqlIdent(names.database)} TO ${quoteSqlIdent(names.migrationRole)}, ${quoteSqlIdent(names.runtimeRole)}`,
  ]) {
    adapter.execSql(sql);
  }

  // Exact monitor CONNECT goes on the still-closed selected database after the
  // tenant grants. An absent collector role keeps the owner-only predecessor.
  const monitorRole = assessMonitoringRole(catalog);
  if (monitorRole.state === 'safe') {
    if (typeof adapter.grantMonitoringConnect !== 'function') {
      return stopped('monitoring-grant-unavailable', names.database, { retained });
    }
    adapter.grantMonitoringConnect(names);
  }

  // This read is the last observation before opening.
  catalog = adapter.readCatalog();
  const preOpenCheck = validateMonitoringCatalog(catalog, knownSlots, { retained });
  if (preOpenCheck) return preOpenCheck;
  const expectedMonitor = monitorRole.state === 'safe' ? 'exact' : 'none';
  if (
    failAt === `acl:${selectedSlot}` ||
    !aclsMatch(catalog, catalog.databases[names.database], names) ||
    assessMonitoringRole(catalog).state !== monitorRole.state ||
    monitorGrantState(catalog, names.database) !== expectedMonitor
  ) {
    return stopped('acl-verification-failed', names.database, { retained });
  }
  const fence = proveSelectedClosedFence(catalog, names, knownSlots);
  if (fence) return { ...fence, retained };

  adapter.permitConnections(names);
  const after = adapter.waitFor(names);
  if (after?.allowConnections !== true)
    return stopped('cnpg-reconcile-failed', names.database, { retained });

  catalog = adapter.readCatalog();
  const openedCheck = validateMonitoringCatalog(catalog, knownSlots, { retained });
  if (openedCheck) return openedCheck;
  if (
    !aclsMatch(catalog, catalog.databases[names.database], names) ||
    monitorGrantState(catalog, names.database) !== expectedMonitor
  ) {
    return stopped('acl-verification-failed', names.database, { retained });
  }
  if (canConnectEffective(catalog, names.runtimeRole, names.database) !== true) {
    return stopped('acl-verification-failed', names.database, { retained });
  }

  const cross = proveCrossTenantAfterWrites(catalog, knownSlots);
  if (cross) return { ...cross, retained };

  return {
    ok: true,
    mutated: true,
    refusals: [],
    retained,
    devLogin: canConnectEffective(catalog, 'dev', 'dev'),
    ambientContext: adapter.identity().ambientContext ?? null,
  };
}
