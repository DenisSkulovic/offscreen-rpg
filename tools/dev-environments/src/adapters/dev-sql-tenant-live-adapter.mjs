import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { DEV_CNPG_CLUSTER, DEV_CNPG_CONTEXT, DEV_CNPG_NAMESPACE, DEV_CNPG_OWNER } from '../../../../infra/platform/postgres/config.mjs';
import { verifyExistingTemporalPersistence } from '../../../../infra/platform/postgres/temporal-persistence/prepare.mjs';
import { deriveDevSqlTenant } from '../rendering/dev-sql-tenant-contract.mjs';
import { quoteSqlIdent } from './dev-sql-tenant-reconciler.mjs';
import { MONITOR_ROLE, assessMonitoringRole, monitorGrantState } from './dev-sql-tenant-executor.mjs';

// The tenant grant is narrowed to the derived tenant shape so this vocabulary can
// never name the collector role or any other grantee.
const ALLOWED_SQL = /^((REVOKE CONNECT, TEMPORARY ON DATABASE "[a-z_][a-z0-9_]*" FROM PUBLIC)|(GRANT CONNECT, TEMPORARY ON DATABASE "dev" TO "dev")|(GRANT CONNECT ON DATABASE "dev_[1-9][0-9]*" TO "dev_[1-9][0-9]*_mig", "dev_[1-9][0-9]*_run"))$/;

// The one statement the monitoring operation may issue. It is deliberately not
// part of ALLOWED_SQL, so execSql can never grant to the collector role.
const MONITORING_GRANT = /^GRANT CONNECT ON DATABASE "dev_[1-9][0-9]*" TO "cnpg_metrics_exporter"$/;

function run(file, args, input) {
  return execFileSync(file, args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] });
}

function kubectl(args, input, exec = run) {
  try {
    return exec('kubectl', ['--context', DEV_CNPG_CONTEXT, ...args], input);
  } catch (error) {
    const redacted = String(error.stderr ?? error.message ?? '').replace(/password[^,\n]*/gi, 'password=[redacted]');
    const wrapped = new Error(redacted.slice(0, 500) || 'kubectl failed');
    wrapped.code = 'kubectl-failed';
    throw wrapped;
  }
}

function poll(read, attempts = 45) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = read();
    if (value) return value;
    execFileSync('sleep', ['1']);
  }
  return null;
}

function refuseSql() {
  const error = new Error('refusing SQL outside the tenant vocabulary');
  error.code = 'unexpected-sql';
  throw error;
}

function psql(sql, exec = run) {
  if (!ALLOWED_SQL.test(sql) && !sql.startsWith('SELECT ')) refuseSql();
  return kubectl(['-n', DEV_CNPG_NAMESPACE, 'exec', `${DEV_CNPG_CLUSTER}-1`, '-c', 'postgres', '--', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-A', '-F', '|', '-c', sql], undefined, exec);
}

function psqlFixed(sql, allowed, exec = run) {
  if (sql !== allowed && !(allowed instanceof RegExp && allowed.test(sql))) refuseSql();
  return kubectl(['-n', DEV_CNPG_NAMESPACE, 'exec', `${DEV_CNPG_CLUSTER}-1`, '-c', 'postgres', '--', 'psql', '-X', '-w', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], undefined, exec);
}

// One snapshot, one statement, no data rows and no credential columns. PUBLIC is
// OID 0. pg_has_role(..., 'MEMBER') sees direct, transitive and NOINHERIT paths.
// Effective CONNECT is computed only for the identities the executor fences.
export const CATALOG_SQL = `SELECT json_build_object(
  'databases', (SELECT COALESCE(json_agg(json_build_object(
      'oid', d.oid::bigint, 'name', d.datname, 'ownerOid', d.datdba::bigint,
      'allowConnections', d.datallowconn,
      'acl', (SELECT COALESCE(json_agg(json_build_object(
          'granteeOid', a.grantee::bigint, 'grantorOid', a.grantor::bigint,
          'privilegeType', a.privilege_type, 'isGrantable', a.is_grantable
        ) ORDER BY a.grantee, a.grantor, a.privilege_type), '[]'::json)
        FROM aclexplode(COALESCE(d.datacl, acldefault('d', d.datdba))) a)
    ) ORDER BY d.datname), '[]'::json) FROM pg_database d),
  'roles', (SELECT COALESCE(json_agg(json_build_object(
      'oid', r.oid::bigint, 'name', r.rolname, 'login', r.rolcanlogin, 'inherit', r.rolinherit,
      'superuser', r.rolsuper, 'createdb', r.rolcreatedb, 'createrole', r.rolcreaterole,
      'replication', r.rolreplication, 'bypassrls', r.rolbypassrls
    ) ORDER BY r.rolname), '[]'::json)
    FROM pg_roles r WHERE r.rolname !~ '^pg_' OR r.rolname = 'pg_monitor'),
  'monitor', (SELECT json_build_object(
      'exporterOid', e.oid::bigint,
      'monitorMember', pg_has_role(e.oid, 'pg_monitor', 'MEMBER'),
      'assumers', (SELECT COALESCE(json_agg(o.oid::bigint ORDER BY o.oid), '[]'::json)
        FROM pg_roles o WHERE o.oid <> e.oid AND NOT o.rolsuper AND pg_has_role(o.oid, e.oid, 'MEMBER'))
    ) FROM pg_roles e WHERE e.rolname = 'cnpg_metrics_exporter'),
  'effective', (SELECT COALESCE(json_agg(json_build_object(
      'roleOid', r.oid::bigint, 'databaseOid', d.oid::bigint,
      'connect', has_database_privilege(r.oid, d.oid, 'CONNECT')
    ) ORDER BY r.oid, d.oid), '[]'::json)
    FROM pg_roles r CROSS JOIN pg_database d
    WHERE r.rolname IN ('dev', 'temporal') OR r.rolname ~ '^dev_[0-9]+_(mig|run)$')
)::text`;

const LIMITS = { bytes: 1024 * 1024, databases: 256, roles: 1024, aclRows: 8192, pairs: 8192 };
const ROLE_FLAGS = ['login', 'inherit', 'superuser', 'createdb', 'createrole', 'replication', 'bypassrls'];
const PRIVILEGES = new Set(['CONNECT', 'TEMPORARY', 'CREATE']);
const SUBJECT_ROLE = /^(dev|temporal|dev_[0-9]+_(mig|run))$/;

function projectionError(detail) {
  const error = new Error(`catalog projection rejected: ${detail}`);
  error.code = 'catalog-projection-invalid';
  return error;
}

const positive = (value) => Number.isSafeInteger(value) && value > 0;

function indexRoles(rawRoles) {
  if (!Array.isArray(rawRoles) || rawRoles.length > LIMITS.roles) throw projectionError('roles');
  const roles = {};
  const byOid = new Map();
  for (const raw of rawRoles) {
    if (!positive(raw?.oid) || typeof raw.name !== 'string' || !raw.name ||
        Object.hasOwn(roles, raw.name) || byOid.has(raw.oid) ||
        ROLE_FLAGS.some((flag) => typeof raw[flag] !== 'boolean')) {
      throw projectionError('role row');
    }
    roles[raw.name] = Object.fromEntries([['oid', raw.oid], ...ROLE_FLAGS.map((flag) => [flag, raw[flag]])]);
    byOid.set(raw.oid, raw.name);
  }
  if (!Object.hasOwn(roles, 'pg_monitor')) throw projectionError('pg_monitor missing');
  return { roles, byOid };
}

function indexDatabases(rawDatabases, roleNames) {
  if (!Array.isArray(rawDatabases) || rawDatabases.length > LIMITS.databases) throw projectionError('databases');
  const databases = {};
  const byOid = new Map();
  let aclRows = 0;
  for (const raw of rawDatabases) {
    if (!positive(raw?.oid) || typeof raw.name !== 'string' || !raw.name ||
        Object.hasOwn(databases, raw.name) || byOid.has(raw.oid) ||
        !roleNames.has(raw.ownerOid) || typeof raw.allowConnections !== 'boolean' ||
        !Array.isArray(raw.acl)) {
      throw projectionError('database row');
    }
    aclRows += raw.acl.length;
    if (aclRows > LIMITS.aclRows) throw projectionError('ACL row limit');
    const seen = new Set();
    for (const row of raw.acl) {
      const key = `${row?.granteeOid}/${row?.grantorOid}/${row?.privilegeType}`;
      if (!Number.isSafeInteger(row?.granteeOid) || row.granteeOid < 0 ||
          (row.granteeOid !== 0 && !roleNames.has(row.granteeOid)) ||
          !roleNames.has(row.grantorOid) || !PRIVILEGES.has(row.privilegeType) ||
          typeof row.isGrantable !== 'boolean' || seen.has(key)) {
        throw projectionError('ACL row');
      }
      seen.add(key);
    }
    const connectRows = raw.acl.filter((row) => row.privilegeType === 'CONNECT');
    databases[raw.name] = {
      oid: raw.oid,
      ownerOid: raw.ownerOid,
      owner: roleNames.get(raw.ownerOid),
      allowConnections: raw.allowConnections,
      aclEntries: raw.acl.map(({ granteeOid, grantorOid, privilegeType, isGrantable }) =>
        ({ granteeOid, grantorOid, privilegeType, isGrantable })),
      publicConnect: connectRows.some((row) => row.granteeOid === 0),
      publicTemporary: raw.acl.some((row) => row.granteeOid === 0 && row.privilegeType === 'TEMPORARY'),
      connect: [...new Set(connectRows.filter((row) => row.granteeOid !== 0)
        .map((row) => roleNames.get(row.granteeOid)))],
    };
    byOid.set(raw.oid, raw.name);
  }
  return { databases, byOid };
}

function indexMonitor(raw, roles, roleNames) {
  if (raw === null) {
    if (Object.hasOwn(roles, MONITOR_ROLE)) throw projectionError('monitor role without membership data');
    return { exporterOid: null, monitorMember: null, assumers: [] };
  }
  if (raw?.exporterOid !== roles[MONITOR_ROLE]?.oid || typeof raw.monitorMember !== 'boolean' ||
      !Array.isArray(raw.assumers) || raw.assumers.length > LIMITS.roles ||
      new Set(raw.assumers).size !== raw.assumers.length ||
      raw.assumers.some((oid) => !roleNames.has(oid) || oid === raw.exporterOid)) {
    throw projectionError('monitor membership');
  }
  return { exporterOid: raw.exporterOid, monitorMember: raw.monitorMember, assumers: [...raw.assumers] };
}

function indexEffective(rawEffective, roleNames, databaseNames, roles, databases) {
  if (!Array.isArray(rawEffective) || rawEffective.length > LIMITS.pairs) throw projectionError('effective pairs');
  const effectiveConnect = {};
  for (const row of rawEffective) {
    const role = roleNames.get(row?.roleOid);
    const database = databaseNames.get(row?.databaseOid);
    if (!role || !database || typeof row.connect !== 'boolean' ||
        effectiveConnect[role]?.[database] !== undefined) {
      throw projectionError('effective pair');
    }
    effectiveConnect[role] = { ...effectiveConnect[role], [database]: row.connect };
  }
  // Every fenced identity must be evidenced against every observed database.
  for (const role of Object.keys(roles).filter((name) => SUBJECT_ROLE.test(name))) {
    if (Object.keys(databases).some((database) => effectiveConnect[role]?.[database] === undefined)) {
      throw projectionError('incomplete effective matrix');
    }
  }
  return effectiveConnect;
}

/** Validate the fixed JSON catalog and derive the legacy compatibility fields. */
export function parseCatalogProjection(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > LIMITS.bytes) throw projectionError('size');
  let raw;
  try {
    raw = JSON.parse(text.trim());
  } catch {
    throw projectionError('malformed JSON');
  }
  if (raw === null || typeof raw !== 'object') throw projectionError('shape');
  const { roles, byOid: roleNames } = indexRoles(raw.roles);
  const { databases, byOid: databaseNames } = indexDatabases(raw.databases, roleNames);
  return {
    databases,
    roles,
    monitor: indexMonitor(raw.monitor, roles, roleNames),
    effectiveConnect: indexEffective(raw.effective, roleNames, databaseNames, roles, databases),
    statements: [],
  };
}

function parseAcl(text) {
  if (!text || text === '<default-public>') return { publicConnect: true, publicTemporary: true, connect: [] };
  let publicConnect = false;
  let publicTemporary = false;
  const connect = [];
  for (const entry of text.split(',')) {
    const [grantee, rest] = entry.split('=');
    const privs = (rest ?? '').split('/')[0];
    const hasConnect = privs.includes('c');
    const hasTemporary = privs.includes('T');
    if (!grantee) {
      publicConnect = hasConnect;
      publicTemporary = hasTemporary;
    } else if (hasConnect) connect.push(grantee);
  }
  return { publicConnect, publicTemporary, connect };
}

export function catalogFromRows(text) {
  const lines = text.trim().split('\n').slice(1).filter((line) => line && !line.endsWith('rows)') && !line.startsWith('('));
  const databases = {};
  for (const line of lines) {
    const [name, owner, allow, acl] = line.split('|');
    databases[name] = { oid: name, allowConnections: allow === 't', owner, ...parseAcl(acl) };
  }
  return databases;
}

export function createLiveDevSqlAdapter({ exec = run } = {}) {
  const ambientContext = kubectl(['config', 'current-context'], undefined, exec).trim();
  return {
    injectedProbe: false,
    identity() {
      const raw = kubectl(['-n', DEV_CNPG_NAMESPACE, 'get', 'cluster', DEV_CNPG_CLUSTER, '-o', 'json'], undefined, exec);
      const cluster = JSON.parse(raw);
      const later = kubectl(['config', 'current-context'], undefined, exec).trim();
      return {
        context: DEV_CNPG_CONTEXT,
        namespace: DEV_CNPG_NAMESPACE,
        cluster: DEV_CNPG_CLUSTER,
        owner: cluster.metadata?.labels?.['offscreen.dev/owner'] ?? null,
        ready: cluster.status?.phase === 'Cluster in healthy state' && cluster.status?.readyInstances >= 1,
        changedContext: later !== ambientContext,
        ambientContext,
      };
    },
    verifyTemporalPersistence() {
      return verifyExistingTemporalPersistence('dev', {
        run: (command, args, options = {}) => {
          try {
            return { ok: true, stdout: exec(command, args, options.input) };
          } catch {
            return { ok: false, stdout: '', stderr: 'Temporal persistence observation failed' };
          }
        },
      });
    },
    readCatalog() {
      return readProjectedCatalog(exec);
    },
    // Fixed monitoring operation: never reachable through execSql. It re-derives the
    // slot identity, checks owner, closed state and the verified collector role, and
    // only then issues one fixed quoted GRANT. Idempotent on the exact grant.
    grantMonitoringConnect(names) {
      const derived = deriveDevSqlTenant(names?.slotId);
      if (['database', 'migrationRole', 'runtimeRole'].some((key) => names[key] !== derived[key])) {
        const error = new Error('monitoring grant names do not match the derived slot');
        error.code = 'unexpected-monitoring-grant';
        throw error;
      }
      const current = readProjectedCatalog(exec);
      const database = current.databases[derived.database];
      if (!database || database.owner !== derived.migrationRole || database.allowConnections !== false ||
          !current.roles[derived.migrationRole] || !current.roles[derived.runtimeRole] ||
          assessMonitoringRole(current).state !== 'safe') {
        const error = new Error(`monitoring grant refused for ${derived.database}`);
        error.code = 'monitoring-grant-refused';
        throw error;
      }
      const state = monitorGrantState(current, derived.database);
      if (state === 'invalid') {
        const error = new Error(`unexpected exporter ACL on ${derived.database}`);
        error.code = 'monitoring-grant-refused';
        throw error;
      }
      if (state === 'none') {
        psqlFixed(`GRANT CONNECT ON DATABASE ${quoteSqlIdent(derived.database)} TO ${quoteSqlIdent(MONITOR_ROLE)}`, MONITORING_GRANT, exec);
      }
    },
    execSql(sql) {
      if (!ALLOWED_SQL.test(sql)) {
        const error = new Error('refusing SQL outside the tenant vocabulary');
        error.code = 'unexpected-sql';
        throw error;
      }
      psql(sql, exec);
    },
    resources(names) {
      const targets = [
        { kind: 'secret', name: names.migrationSecret },
        { kind: 'secret', name: names.runtimeSecret },
        { kind: 'databaserole.postgresql.cnpg.io', name: names.migrationRoleCr },
        { kind: 'databaserole.postgresql.cnpg.io', name: names.runtimeRoleCr },
        { kind: 'database.postgresql.cnpg.io', name: names.databaseCr },
      ];
      const resources = [];
      for (const target of targets) {
        try {
          const raw = kubectl(['-n', DEV_CNPG_NAMESPACE, 'get', target.kind, target.name, '-o', 'json', '--ignore-not-found'], undefined, exec).trim();
          if (!raw) continue;
          const item = JSON.parse(raw);
          if (item.kind === 'Status') continue;
          resources.push({
            kind: item.kind,
            name: item.metadata?.name,
            uid: item.metadata?.uid,
            owner: item.metadata?.labels?.['offscreen.dev/owner'] ?? null,
            slot: item.metadata?.labels?.['offscreen.dev/slot'] ?? null,
          });
        } catch {
          resources.push({ name: target.name, unreadable: true });
        }
      }
      return resources;
    },
    createSecrets(names, options = {}) {
      const created = [];
      const only = options.only?.length ? new Set(options.only) : null;
      for (const kind of ['migration', 'runtime']) {
        const name = kind === 'migration' ? names.migrationSecret : names.runtimeSecret;
        if (only && !only.has(name)) continue;
        const username = kind === 'migration' ? names.migrationRole : names.runtimeRole;
        const password = randomBytes(24).toString('base64url');
        const manifest = {
          apiVersion: 'v1',
          kind: 'Secret',
          type: 'kubernetes.io/basic-auth',
          metadata: { name, namespace: DEV_CNPG_NAMESPACE, labels: { 'offscreen.dev/owner': DEV_CNPG_OWNER, 'offscreen.dev/slot': names.slotId, 'cnpg.io/reload': 'true' } },
          stringData: { username, password },
        };
        kubectl(['create', '-f', '-'], JSON.stringify(manifest), exec);
        const uid = kubectl(['-n', DEV_CNPG_NAMESPACE, 'get', 'secret', name, '-o', 'jsonpath={.metadata.uid}'], undefined, exec).trim();
        created.push({ name, uid });
      }
      return created;
    },
    applyClosedDatabase(_rendered, names) {
      const role = (cr, roleName, secret) => ({
        apiVersion: 'postgresql.cnpg.io/v1',
        kind: 'DatabaseRole',
        metadata: { name: cr, namespace: DEV_CNPG_NAMESPACE, labels: { 'offscreen.dev/owner': DEV_CNPG_OWNER, 'offscreen.dev/slot': names.slotId } },
        spec: { cluster: { name: DEV_CNPG_CLUSTER }, name: roleName, login: true, superuser: false, createdb: false, createrole: false, replication: false, bypassrls: false, inherit: false, inRoles: [], databaseRoleReclaimPolicy: 'retain', connectionLimit: roleName.endsWith('_mig') ? 2 : 8, passwordSecret: { name: secret } },
      });
      kubectl(['apply', '-f', '-'], JSON.stringify(role(names.migrationRoleCr, names.migrationRole, names.migrationSecret)), exec);
      kubectl(['apply', '-f', '-'], JSON.stringify(role(names.runtimeRoleCr, names.runtimeRole, names.runtimeSecret)), exec);
      const rolesReady = poll(() => {
        const roleRow = psql(`SELECT rolname FROM pg_roles WHERE rolname IN (${quoteLiteral(names.migrationRole)}, ${quoteLiteral(names.runtimeRole)})`, exec);
        return roleRow.includes(names.migrationRole) && roleRow.includes(names.runtimeRole);
      });
      if (!rolesReady) {
        const error = new Error(`roles for ${names.slotId} were not reconciled`);
        error.code = 'cnpg-reconcile-failed';
        throw error;
      }
      const database = {
        apiVersion: 'postgresql.cnpg.io/v1',
        kind: 'Database',
        metadata: { name: names.databaseCr, namespace: DEV_CNPG_NAMESPACE, labels: { 'offscreen.dev/owner': DEV_CNPG_OWNER, 'offscreen.dev/slot': names.slotId } },
        spec: { cluster: { name: DEV_CNPG_CLUSTER }, name: names.database, owner: names.migrationRole, allowConnections: false, databaseReclaimPolicy: 'retain' },
      };
      kubectl(['apply', '-f', '-'], JSON.stringify(database), exec);
    },
    waitFor(names) {
      const row = poll(() => {
        const text = psql(`SELECT datname, pg_get_userbyid(datdba), CASE WHEN datallowconn THEN 't' ELSE 'f' END, COALESCE(array_to_string(datacl, ','), '<default-public>') FROM pg_database WHERE datname = ${quoteLiteral(names.database)}`, exec);
        return text.split('\n').find((line) => line.startsWith(`${names.database}|`)) ?? null;
      });
      if (!row) return { ready: false };
      const database = catalogFromRows(`h\n${row}`)[names.database];
      return { ready: true, allowConnections: database.allowConnections, owner: database.owner };
    },
    permitConnections(names) {
      kubectl(['-n', DEV_CNPG_NAMESPACE, 'patch', 'database.postgresql.cnpg.io', names.databaseCr, '--type', 'merge', '-p', '{"spec":{"allowConnections":true}}'], undefined, exec);
      const opened = poll(() => {
        const text = psql(`SELECT CASE WHEN datallowconn THEN 't' ELSE 'f' END FROM pg_database WHERE datname = ${quoteLiteral(names.database)}`, exec);
        const values = text.trim().split('\n').filter((line) => line === 't' || line === 'f');
        return values.at(-1) === 't';
      });
      if (!opened) {
        const error = new Error(`${names.database} stayed closed`);
        error.code = 'cnpg-reconcile-failed';
        throw error;
      }
    },
  };
}

function readProjectedCatalog(exec) {
  return parseCatalogProjection(psqlFixed(CATALOG_SQL, CATALOG_SQL, exec));
}

function quoteLiteral(value) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('refusing SQL literal');
  return `'${value}'`;
}

export { quoteSqlIdent };
