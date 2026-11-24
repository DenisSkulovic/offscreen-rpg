import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { applyDevTenantMigration } from '../rendering/dev-sql-tenant-grants.mjs';
import { applyMigrations } from '../../../../packages/db/dist/src/migrate.js';

const require = createRequire(resolve('packages/db/package.json'));
const { Client } = require('pg');
const TOKEN = 'dev-1-migration-live';
const migrationsFolder = resolve('packages/db/migrations');

function kubectl(args, input) {
  return execFileSync('kubectl', ['--context', 'kind-offscreen-dev', ...args], { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] });
}

function password(secret) {
  const body = JSON.parse(kubectl(['-n', 'offscreen-dev-postgres', 'get', 'secret', secret, '-o', 'json']));
  return Buffer.from(body.data.password, 'base64').toString();
}

async function connect(user, database, secret) {
  const client = new Client({ connectionString: `postgresql://${user}:${encodeURIComponent(password(secret))}@127.0.0.1:15432/${database}?sslmode=disable`, connectionTimeoutMillis: 5000 });
  await client.connect();
  return client;
}

async function login(user, database, secret, sql) {
  try {
    const client = await connect(user, database, secret);
    try {
      const result = await client.query(sql);
      return { user, database, ok: true, rows: result.rows };
    } finally {
      await client.end();
    }
  } catch (error) {
    return { user, database, ok: false, code: error.code ?? 'failed' };
  }
}

if (process.env.OFFSCREEN_DEV_SQL_MIGRATE_LIVE !== TOKEN) {
  process.stderr.write('refusing live dev_1 migration without authorization\n');
  process.exit(2);
}

const forward = spawn('kubectl', ['--context', 'kind-offscreen-dev', '-n', 'offscreen-dev-postgres', 'port-forward', 'pod/dev-pg-1', '15432:5432'], { stdio: 'ignore' });
await new Promise((resolvePromise, reject) => {
  const timer = setTimeout(() => reject(new Error('port-forward timeout')), 10000);
  const probe = setInterval(async () => {
    try {
      const client = await connect('dev_1_mig', 'dev_1', 'dev-1-mig-auth');
      await client.end();
      clearInterval(probe);
      clearTimeout(timer);
      resolvePromise();
    } catch {
      // The forward is not accepting connections yet.
    }
  }, 300);
});

try {
  const admin = await connect('dev_1_mig', 'dev_1', 'dev-1-mig-auth');
  const before = await admin.query(`SELECT current_user AS role, has_schema_privilege(current_user, 'public', 'USAGE') AS usage, has_schema_privilege(current_user, 'public', 'CREATE') AS create`);
  process.stdout.write(`${JSON.stringify({ phase: 'before', privilege: before.rows[0] })}\n`);
  if (before.rows[0].usage !== true || before.rows[0].create !== true) throw new Error('migration role lacks public schema privileges');
  const runOnce = () => applyDevTenantMigration({
    slotId: 'dev-1',
    currentUser: 'dev_1_mig',
    authorizeLive: TOKEN,
    async applyMigrations() {
      await applyMigrations({
        connectionString: `postgresql://dev_1_mig:${encodeURIComponent(password('dev-1-mig-auth'))}@127.0.0.1:15432/dev_1?sslmode=disable`,
        max: 1,
        connectionTimeoutMillis: 5000,
        statement_timeout: 60000,
        idle_in_transaction_session_timeout: 60000,
        idleTimeoutMillis: 30000,
      }, migrationsFolder);
    },
    async execSql(sql) {
      await admin.query(sql);
    },
    async verify() {
      const count = await admin.query('SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations');
      const privileges = await admin.query(`SELECT has_schema_privilege('dev_1_run', 'public', 'CREATE') AS runtime_create, to_regclass('public.account') IS NOT NULL AS account`);
      const appliedMigrations = count.rows[0].count;
      return { ok: appliedMigrations === 25 && privileges.rows[0].runtime_create === false && privileges.rows[0].account === true, appliedMigrations };
    },
  });
  const first = await runOnce();
  const second = await runOnce();
  await admin.end();
  const dml = await login('dev_1_run', 'dev_1', 'dev-1-run-auth', `INSERT INTO rate_limit (id, key, count, last_request) VALUES ('dxk09-proof', 'dxk09-proof', 1, 1) ON CONFLICT (id) DO UPDATE SET count = 1 RETURNING id`);
  const cleanup = await login('dev_1_run', 'dev_1', 'dev-1-run-auth', `DELETE FROM rate_limit WHERE id = 'dxk09-proof' RETURNING id`);
  const ddl = await login('dev_1_run', 'dev_1', 'dev-1-run-auth', 'CREATE TABLE public.dev_runtime_ddl_probe (id integer)');
  const cross = await login('dev_1_run', 'dev_2', 'dev-1-run-auth', 'SELECT 1');
  const other = await login('dev_2_run', 'dev_1', 'dev-2-run-auth', 'SELECT 1');
  const gate = await login('dev_1_run', 'dev_1', 'dev-1-run-auth', 'SELECT migrations FROM offscreen_dev_schema_gate');
  process.stdout.write(`${JSON.stringify({ phase: 'proof', firstOk: first.ok, secondOk: second.ok, applied: second.appliedMigrations, dml: dml.ok && cleanup.ok, ddl: ddl.code ?? ddl.ok, cross: cross.ok, other: other.ok, gate: gate.rows?.[0]?.migrations ?? null })}\n`);
  if (!first.ok || !second.ok || !dml.ok || !cleanup.ok || ddl.ok || cross.ok || other.ok || gate.rows?.[0]?.migrations !== 25) process.exitCode = 2;
} finally {
  forward.kill();
}
