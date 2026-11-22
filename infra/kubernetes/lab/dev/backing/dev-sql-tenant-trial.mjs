import { executeDevSqlTenants } from './dev-sql-tenant-executor.mjs';
import { createLiveDevSqlAdapter } from './dev-sql-tenant-live-adapter.mjs';
import { deriveDevSqlTenant } from './dev-sql-tenant-contract.mjs';
import { execFileSync } from 'node:child_process';

const TOKEN = 'kind-offscreen-dev-sql-tenant-live';

function kubectl(args, input) {
  return execFileSync('kubectl', ['--context', 'kind-offscreen-dev', ...args], { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] });
}

function password(secret) {
  const body = JSON.parse(kubectl(['-n', 'offscreen-dev-postgres', 'get', 'secret', secret, '-o', 'json']));
  return Buffer.from(body.data.password, 'base64').toString();
}

function login(user, database, secret) {
  try {
    const output = kubectl([
      '-n', 'offscreen-dev-postgres', 'exec', '-i', 'dev-pg-1', '-c', 'postgres', '--',
      'sh', '-c', `read -r PGPASSWORD; export PGPASSWORD; psql "host=127.0.0.1 user=${user} dbname=${database} sslmode=disable" -tAc "select current_user"`,
    ], `${password(secret)}\n`);
    return { user, database, ok: output.trim() === user };
  } catch {
    return { user, database, ok: false };
  }
}

if (process.env.OFFSCREEN_DEV_SQL_TENANT_LIVE !== TOKEN) {
  process.stderr.write('refusing live SQL tenant trial without authorization\n');
  process.exit(2);
}

const names = deriveDevSqlTenant('dev-1');
const adapter = createLiveDevSqlAdapter();
const preflight = adapter.readCatalog();
const identity = adapter.identity();
process.stdout.write(`${JSON.stringify({ phase: 'preflight', identity, databases: Object.keys(preflight.databases) })}\n`);
const first = executeDevSqlTenants({ slots: ['dev-1'], authorizeLive: TOKEN, adapter });
process.stdout.write(`${JSON.stringify({ phase: 'ensure', ok: first.ok, refusals: first.refusals, retained: first.retained, devLogin: first.devLogin })}\n`);
if (!first.ok) process.exit(2);
const matrix = [
  login(names.runtimeRole, names.database, names.runtimeSecret),
  login(names.migrationRole, names.database, names.migrationSecret),
  login(names.runtimeRole, 'dev', names.runtimeSecret),
  login('dev', names.database, 'dev-pg-app'),
  login(names.runtimeRole, 'postgres', names.runtimeSecret),
  login(names.runtimeRole, 'template1', names.runtimeSecret),
  login('dev', 'dev', 'dev-pg-app'),
];
const second = executeDevSqlTenants({ slots: ['dev-1'], authorizeLive: TOKEN, adapter: createLiveDevSqlAdapter() });
const ids = kubectl(['-n', 'offscreen-dev-postgres', 'exec', 'dev-pg-1', '-c', 'postgres', '--', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-F', '|', '-c', "SELECT 'db', oid::text, datname FROM pg_database WHERE datname IN ('dev','dev_1') UNION ALL SELECT 'role', oid::text, rolname FROM pg_roles WHERE rolname IN ('dev','dev_1_mig','dev_1_run')"]);
process.stdout.write(`${JSON.stringify({ phase: 'proof', matrix, secondOk: second.ok, secondRetained: second.retained, ids: ids.trim().split('\n') })}\n`);
if (!second.ok || matrix.some((item, index) => item.ok !== [true, true, false, false, false, false, true][index])) process.exit(2);
