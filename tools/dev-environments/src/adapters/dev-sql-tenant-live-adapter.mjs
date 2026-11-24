import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { DEV_CNPG_CLUSTER, DEV_CNPG_CONTEXT, DEV_CNPG_NAMESPACE, DEV_CNPG_OWNER } from '../../../../infra/platform/postgres/dev-bootstrap.mjs';
import { quoteSqlIdent } from './dev-sql-tenant-reconciler.mjs';

const ALLOWED_SQL = /^((REVOKE CONNECT, TEMPORARY ON DATABASE "[a-z_][a-z0-9_]*" FROM PUBLIC)|(GRANT CONNECT, TEMPORARY ON DATABASE "dev" TO "dev")|(GRANT CONNECT ON DATABASE "[a-z_][a-z0-9_]*" TO "[a-z_][a-z0-9_]*", "[a-z_][a-z0-9_]*"))$/;

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

function psql(sql, exec = run) {
  if (!ALLOWED_SQL.test(sql) && !sql.startsWith('SELECT ')) {
    const error = new Error('refusing SQL outside the tenant vocabulary');
    error.code = 'unexpected-sql';
    throw error;
  }
  return kubectl(['-n', DEV_CNPG_NAMESPACE, 'exec', `${DEV_CNPG_CLUSTER}-1`, '-c', 'postgres', '--', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-A', '-F', '|', '-c', sql], undefined, exec);
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
  let catalog = null;
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
    readCatalog() {
      const sql = `SELECT datname, pg_get_userbyid(datdba), datallowconn, COALESCE(array_to_string(datacl, ','), '<default-public>') FROM pg_database WHERE datname <> 'template0' OR true ORDER BY datname`;
      const text = psql(sql, exec);
      const databases = catalogFromRows(text);
      const rolesText = psql(`SELECT rolname FROM pg_roles WHERE rolname NOT LIKE 'pg_%' ORDER BY rolname`, exec);
      const roles = {};
      for (const line of rolesText.trim().split('\n').slice(1)) {
        if (line && !line.startsWith('(')) roles[line] = { login: true };
      }
      catalog = { databases, roles, statements: [] };
      return catalog;
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
      if (catalog) catalog.databases[names.database] = database;
      for (const roleName of [names.migrationRole, names.runtimeRole]) {
        if (catalog) catalog.roles[roleName] = { login: true };
      }
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

function quoteLiteral(value) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('refusing SQL literal');
  return `'${value}'`;
}

export { quoteSqlIdent };
