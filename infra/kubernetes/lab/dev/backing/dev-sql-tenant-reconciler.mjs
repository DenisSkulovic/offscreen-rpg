import { deriveDevSqlTenant } from './dev-sql-tenant-contract.mjs';

const BASELINE = ['postgres', 'dev', 'template1', 'template0'];
const FENCED = ['postgres', 'dev', 'template1'];

function refusal(id, detail) {
  return { id, detail };
}

function database(oid, allowConnections, publicConnect = true) {
  return { oid, allowConnections, owner: 'postgres', publicConnect, publicTemporary: publicConnect, connect: [] };
}

export function createFakeSqlCatalog(extraDatabases = {}) {
  return {
    databases: {
      postgres: database(1, true),
      dev: database(2, true),
      template1: database(3, true),
      template0: database(4, false, false),
      ...extraDatabases,
    },
    roles: { dev: { login: true, createdb: false, superuser: false } },
    statements: [],
    secrets: [],
  };
}

export function quoteSqlIdent(name) {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(name)) {
    const error = new Error(`refusing to interpolate SQL identifier ${name}`);
    error.code = 'invalid-sql-identifier';
    throw error;
  }
  return `"${name}"`;
}

function record(catalog, sql) {
  catalog.statements.push(sql);
}

export function fenceBaseline(catalog) {
  const unexpected = Object.keys(catalog.databases).filter((name) => !BASELINE.includes(name));
  if (unexpected.length > 0) {
    return { ok: false, mutated: false, refusals: [refusal('unexpected-database', unexpected.join(','))] };
  }
  for (const name of FENCED) {
    const sql = `REVOKE CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent(name)} FROM PUBLIC`;
    record(catalog, sql);
    catalog.databases[name].publicConnect = false;
    catalog.databases[name].publicTemporary = false;
  }
  record(catalog, `GRANT CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent('dev')} TO ${quoteSqlIdent('dev')}`);
  catalog.databases.dev.connect.push('dev');
  return { ok: true, mutated: true, refusals: [] };
}

export function canConnect(catalog, role, databaseName) {
  const database = catalog.databases[databaseName];
  if (!database?.allowConnections) return false;
  if (database.publicConnect) return true;
  return database.owner === role || database.connect.includes(role);
}

export function reconcileTenantPrivileges(catalog, slotId) {
  const names = deriveDevSqlTenant(slotId);
  const database = catalog.databases[names.database];
  if (!database) return { ok: false, mutated: false, names, refusals: [refusal('missing-database', names.database)] };
  if (database.owner !== names.migrationRole) return { ok: false, mutated: false, names, refusals: [refusal('foreign-database-owner', database.owner)] };
  if (database.allowConnections !== false) return { ok: false, mutated: false, names, refusals: [refusal('opened-before-grants', names.database)] };
  record(catalog, `REVOKE CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent(names.database)} FROM PUBLIC`);
  database.publicConnect = false;
  database.publicTemporary = false;
  record(catalog, `GRANT CONNECT ON DATABASE ${quoteSqlIdent(names.database)} TO ${quoteSqlIdent(names.migrationRole)}, ${quoteSqlIdent(names.runtimeRole)}`);
  database.connect = [names.migrationRole, names.runtimeRole];
  const fingerprint = `${database.oid}:${names.migrationRole}:${names.runtimeRole}:connect`;
  return { ok: true, mutated: true, names, fingerprint, refusals: [] };
}

export function enableTenantConnections(catalog, slotId) {
  const names = deriveDevSqlTenant(slotId);
  const database = catalog.databases[names.database];
  const granted = database?.connect.includes(names.migrationRole) && database.connect.includes(names.runtimeRole) && database.publicConnect === false;
  if (!granted) return { ok: false, mutated: false, refusals: [refusal('grants-not-proven', names.database)] };
  database.allowConnections = true;
  return { ok: true, mutated: true, refusals: [], receipt: { slotId: names.slotId, databaseOid: database.oid, fingerprint: `${database.oid}:${names.migrationRole}:${names.runtimeRole}:connect` } };
}

export function ensureDevSqlTenant(options = {}) {
  if (!options.authorize) return { ok: false, mutated: false, refusals: [refusal('ensure-not-authorized', 'live SQL tenant ensure was not authorized')] };
  return { ok: false, mutated: false, refusals: [refusal('ensure-not-authorized', 'live SQL tenant ensure remains held')] };
}
