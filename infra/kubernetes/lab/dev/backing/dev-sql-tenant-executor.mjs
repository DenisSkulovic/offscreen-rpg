import { DEV_CNPG_CLUSTER, DEV_CNPG_CONTEXT, DEV_CNPG_NAMESPACE, DEV_CNPG_OWNER } from './dev-cnpg-bootstrap.mjs';
import { deriveDevSqlTenant, renderDevSqlTenant } from './dev-sql-tenant-contract.mjs';
import { canConnect, quoteSqlIdent } from './dev-sql-tenant-reconciler.mjs';

const LIVE_TOKEN = 'kind-offscreen-dev-sql-tenant-live';
const BASELINE = new Set(['postgres', 'dev', 'template0', 'template1']);

function refusal(id, detail) {
  return { id, detail };
}

function stopped(id, detail, extra = {}) {
  return { ok: false, mutated: Boolean(extra.retained?.length), refusals: [refusal(id, detail)], ...extra };
}

export function planDevSqlChanges(catalog, slots) {
  const actions = [];
  for (const name of ['postgres', 'dev', 'template1']) {
    const database = catalog.databases[name];
    if (database?.publicConnect || database?.publicTemporary) {
      actions.push(`REVOKE CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent(name)} FROM PUBLIC`);
    }
  }
  if (!catalog.databases.dev?.connect.includes('dev')) {
    actions.push(`GRANT CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent('dev')} TO ${quoteSqlIdent('dev')}`);
  }
  for (const slotId of slots) {
    const names = deriveDevSqlTenant(slotId);
    actions.push(`APPLY closed Database ${names.database} owner ${names.migrationRole}`);
    actions.push(`REVOKE CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent(names.database)} FROM PUBLIC`);
    actions.push(`GRANT CONNECT ON DATABASE ${quoteSqlIdent(names.database)} TO ${quoteSqlIdent(names.migrationRole)}, ${quoteSqlIdent(names.runtimeRole)}`);
    actions.push(`ALLOW CONNECTIONS ${names.database} after ACL proof`);
  }
  return { context: DEV_CNPG_CONTEXT, namespace: DEV_CNPG_NAMESPACE, cluster: DEV_CNPG_CLUSTER, readOnly: true, actions };
}

function assertIdentity(identity) {
  if (!identity || identity.context !== DEV_CNPG_CONTEXT || identity.namespace !== DEV_CNPG_NAMESPACE || identity.cluster !== DEV_CNPG_CLUSTER) {
    return stopped('wrong-binding', 'executor is bound to kind-offscreen-dev/offscreen-dev-postgres/dev-pg');
  }
  if (identity.owner !== DEV_CNPG_OWNER) return stopped('foreign-owner', identity.owner ?? 'missing');
  if (identity.ready !== true) return stopped('cnpg-not-ready', DEV_CNPG_CLUSTER);
  if (identity.changedContext === true) return stopped('ambient-context', 'kubectl context must stay unchanged');
  return null;
}

function applyKnownStatement(catalog, sql) {
  const identifiers = [...sql.matchAll(/"([a-z_][a-z0-9_]*)"/g)].map((match) => match[1]);
  if (sql.startsWith('REVOKE CONNECT, TEMPORARY ON DATABASE')) {
    const database = catalog.databases[identifiers[0]];
    if (!database) return refusal('unknown-database', identifiers[0]);
    database.publicConnect = false;
    database.publicTemporary = false;
    catalog.statements.push(sql);
    return null;
  }
  if (sql.startsWith('GRANT CONNECT, TEMPORARY ON DATABASE "dev" TO "dev"')) {
    catalog.databases.dev.connect = [...new Set([...catalog.databases.dev.connect, 'dev'])];
    catalog.statements.push(sql);
    return null;
  }
  if (sql.startsWith('GRANT CONNECT ON DATABASE')) {
    const [databaseName, ...roles] = identifiers;
    const database = catalog.databases[databaseName];
    if (!database) return refusal('unknown-database', databaseName);
    for (const role of roles) {
      if (!catalog.roles[role]) return refusal('unknown-role', role);
    }
    database.connect = [...new Set([...database.connect, ...roles])];
    catalog.statements.push(sql);
    return null;
  }
  return refusal('unexpected-sql', 'statement is outside the tenant executor vocabulary');
}

function baselineStatements(catalog) {
  const statements = [];
  for (const name of ['postgres', 'dev', 'template1']) {
    const database = catalog.databases[name];
    if (!database) return { refusals: [refusal('unknown-database', name)] };
    if (database.publicConnect || database.publicTemporary) {
      statements.push(`REVOKE CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent(name)} FROM PUBLIC`);
    }
  }
  if (!catalog.databases.dev.connect.includes('dev')) {
    statements.push(`GRANT CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent('dev')} TO ${quoteSqlIdent('dev')}`);
  }
  return { statements, refusals: [] };
}

function aclsMatch(database, names) {
  return database.publicConnect === false
    && database.publicTemporary === false
    && database.connect.includes(names.migrationRole)
    && database.connect.includes(names.runtimeRole)
    && !database.connect.includes('dev');
}

export function executeDevSqlTenants({ slots, authorizeLive, adapter, failAt }) {
  if (authorizeLive !== LIVE_TOKEN) return stopped('ensure-not-authorized', 'live SQL tenant ensure remains held');
  if (!adapter || adapter.injectedProbe === true) return stopped('injected-probe', 'an injected probe cannot authorize mutation');
  const binding = assertIdentity(adapter.identity());
  if (binding) return binding;
  const catalog = adapter.readCatalog();
  if (canConnect(catalog, 'dev', 'dev') !== true) return stopped('dev-login-unusable', 'database dev');
  const allowed = new Set(BASELINE);
  for (const slotId of slots) allowed.add(deriveDevSqlTenant(slotId).database);
  const unexpected = Object.keys(catalog.databases).filter((name) => !allowed.has(name));
  if (unexpected.length > 0) return stopped('unexpected-database', unexpected.join(','));
  const baseline = baselineStatements(catalog);
  if (baseline.refusals.length > 0) return { ok: false, mutated: false, refusals: baseline.refusals };
  if (failAt === 'baseline') return stopped('baseline-leak', 'PUBLIC CONNECT remains');
  for (const sql of baseline.statements) {
    const problem = applyKnownStatement(catalog, sql);
    if (problem) return { ok: false, mutated: false, refusals: [problem] };
    adapter.execSql(sql);
  }
  if (canConnect(catalog, 'fixture', 'postgres') || canConnect(catalog, 'dev', 'dev') !== true) {
    return stopped('baseline-leak', 'baseline CONNECT does not match the selected fence');
  }
  const retained = [];
  for (const slotId of slots) {
    const names = deriveDevSqlTenant(slotId);
    const rendered = renderDevSqlTenant(slotId);
    const existing = adapter.resources(names);
    if (existing.some((resource) => resource.owner !== DEV_CNPG_OWNER)) return stopped('foreign-resource', names.slotId, { retained });
    const secrets = existing.filter((resource) => resource.kind === 'Secret');
    if (secrets.length === 0) {
      const created = adapter.createSecrets(names);
      retained.push(...created.map(({ name, uid }) => ({ name, uid })));
    } else {
      retained.push(...secrets.map(({ name, uid }) => ({ name, uid })));
    }
    if (failAt === `before-database:${slotId}`) return stopped('partial-create', names.database, { retained });
    const database = catalog.databases[names.database];
    const alreadyOpen = database?.allowConnections === true && database.owner === names.migrationRole && aclsMatch(database, names);
    if (alreadyOpen) continue;
    adapter.applyClosedDatabase(rendered, names);
    const observed = adapter.waitFor(names);
    if (!observed || observed.ready !== true) return stopped('cnpg-reconcile-failed', names.database, { retained });
    if (observed.allowConnections !== false) return stopped('cnpg-allow-connections', names.database, { retained });
    if (observed.owner !== names.migrationRole) return stopped('foreign-database-owner', observed.owner ?? 'missing', { retained });
    if (!catalog.databases[names.database]) return stopped('unknown-database', names.database, { retained });
    if (!catalog.roles[names.migrationRole] || !catalog.roles[names.runtimeRole]) return stopped('unknown-role', names.slotId, { retained });
    for (const sql of [
      `REVOKE CONNECT, TEMPORARY ON DATABASE ${quoteSqlIdent(names.database)} FROM PUBLIC`,
      `GRANT CONNECT ON DATABASE ${quoteSqlIdent(names.database)} TO ${quoteSqlIdent(names.migrationRole)}, ${quoteSqlIdent(names.runtimeRole)}`,
    ]) {
      const problem = applyKnownStatement(catalog, sql);
      if (problem) return { ok: false, mutated: true, refusals: [problem], retained };
      adapter.execSql(sql);
    }
    if (failAt === `acl:${slotId}` || !aclsMatch(catalog.databases[names.database], names)) {
      return stopped('acl-verification-failed', names.database, { retained });
    }
    catalog.databases[names.database].allowConnections = true;
    adapter.permitConnections(names);
    const after = adapter.waitFor(names);
    if (after?.allowConnections !== true) return stopped('cnpg-reconcile-failed', names.database, { retained });
    if (canConnect(catalog, names.runtimeRole, names.database) !== true) return stopped('acl-verification-failed', names.database, { retained });
  }
  for (const left of slots) {
    for (const right of slots) {
      if (left === right) continue;
      const source = deriveDevSqlTenant(left);
      const target = deriveDevSqlTenant(right);
      if (canConnect(catalog, source.runtimeRole, target.database)) return stopped('cross-tenant', `${source.runtimeRole}->${target.database}`, { retained });
    }
  }
  return { ok: true, mutated: true, refusals: [], retained, devLogin: canConnect(catalog, 'dev', 'dev'), ambientContext: adapter.identity().ambientContext ?? null };
}

export function holdLiveTenantMutation() {
  return stopped('ensure-not-authorized', 'host CLI mutation remains disabled');
}

export function createDevSqlKubectlAdapter() {
  return {
    injectedProbe: false,
    identity() {
      throw Object.assign(new Error('live SQL adapter transport is disabled'), { code: 'live-adapter-disabled' });
    },
  };
}
