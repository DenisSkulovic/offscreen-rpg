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
import { canConnect, quoteSqlIdent } from './dev-sql-tenant-reconciler.mjs';

const LIVE_TOKEN = 'kind-offscreen-dev-sql-tenant-live';
const BASELINE = new Set(['postgres', 'dev', 'template0', 'template1']);

function refusal(id, detail) {
  return { id, detail };
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

function aclsMatch(database, names) {
  return (
    database.publicConnect === false &&
    database.publicTemporary === false &&
    database.connect.includes(names.migrationRole) &&
    database.connect.includes(names.runtimeRole) &&
    !database.connect.includes('dev')
  );
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
          !Array.isArray(db.connect) || db.connect.some(role => role !== 'temporal');
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
    if (database.allowConnections === true && !aclsMatch(database, names)) {
      return stopped('opened-before-grants', names.database);
    }
  }
  for (const left of knownSlots) {
    for (const right of knownSlots) {
      if (left === right) continue;
      const source = deriveDevSqlTenant(left);
      const target = deriveDevSqlTenant(right);
      if (canConnect(catalog, source.runtimeRole, target.database)) {
        return stopped(
          'cross-tenant',
          `${source.runtimeRole}->${target.database}`,
        );
      }
      if (canConnect(catalog, source.migrationRole, target.database)) {
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
      if (canConnect(catalog, source.runtimeRole, target.database)) {
        return stopped(
          'cross-tenant',
          `${source.runtimeRole}->${target.database}`,
        );
      }
      if (canConnect(catalog, source.migrationRole, target.database)) {
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
  if (canConnect(catalog, 'dev', 'dev') !== true)
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
  }
  if (
    canConnect(catalog, 'fixture', 'postgres') ||
    canConnect(catalog, 'dev', 'dev') !== true
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
    if (database.owner === names.migrationRole && aclsMatch(database, names)) {
      const cross = proveCrossTenantAfterWrites(catalog, knownSlots);
      if (cross) return { ...cross, retained };
      return {
        ok: true,
        mutated,
        refusals: [],
        retained,
        devLogin: canConnect(catalog, 'dev', 'dev'),
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

  catalog = adapter.readCatalog();
  if (
    failAt === `acl:${selectedSlot}` ||
    !aclsMatch(catalog.databases[names.database], names)
  ) {
    return stopped('acl-verification-failed', names.database, { retained });
  }

  adapter.permitConnections(names);
  const after = adapter.waitFor(names);
  if (after?.allowConnections !== true)
    return stopped('cnpg-reconcile-failed', names.database, { retained });

  catalog = adapter.readCatalog();
  if (!aclsMatch(catalog.databases[names.database], names)) {
    return stopped('acl-verification-failed', names.database, { retained });
  }
  if (canConnect(catalog, names.runtimeRole, names.database) !== true) {
    return stopped('acl-verification-failed', names.database, { retained });
  }

  const cross = proveCrossTenantAfterWrites(catalog, knownSlots);
  if (cross) return { ...cross, retained };

  return {
    ok: true,
    mutated: true,
    refusals: [],
    retained,
    devLogin: canConnect(catalog, 'dev', 'dev'),
    ambientContext: adapter.identity().ambientContext ?? null,
  };
}
