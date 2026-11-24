import { executeDevSqlTenants } from '../../../tools/dev-environments/src/adapters/dev-sql-tenant-executor.mjs';
import { createLiveDevSqlAdapter } from '../../../tools/dev-environments/src/adapters/dev-sql-tenant-live-adapter.mjs';
import { deriveDevSqlTenant } from '../../../tools/dev-environments/src/rendering/dev-sql-tenant-contract.mjs';
import { execFileSync } from 'node:child_process';

const TOKEN = 'kind-offscreen-dev-sql-tenant-live';

function kubectl(args, input) {
  return execFileSync('kubectl', ['--context', 'kind-offscreen-dev', ...args], {
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function password(secret) {
  const body = JSON.parse(
    kubectl([
      '-n',
      'offscreen-dev-postgres',
      'get',
      'secret',
      secret,
      '-o',
      'json',
    ]),
  );
  return Buffer.from(body.data.password, 'base64').toString();
}

function login(user, database, secret) {
  try {
    const output = kubectl(
      [
        '-n',
        'offscreen-dev-postgres',
        'exec',
        '-i',
        'dev-pg-1',
        '-c',
        'postgres',
        '--',
        'sh',
        '-c',
        `read -r PGPASSWORD; export PGPASSWORD; psql "host=127.0.0.1 user=${user} dbname=${database} sslmode=disable" -tAc "select current_user"`,
      ],
      `${password(secret)}\n`,
    );
    return { user, database, ok: output.trim() === user };
  } catch {
    return { user, database, ok: false };
  }
}

if (process.env.OFFSCREEN_DEV_SQL_TENANT_LIVE !== TOKEN) {
  process.stderr.write(
    'refusing live SQL tenant trial without authorization\n',
  );
  process.exit(2);
}

const slots = process.argv[2] === 'two' ? ['dev-1', 'dev-2'] : ['dev-1'];
const adapter = createLiveDevSqlAdapter();
const preflight = adapter.readCatalog();
const identity = adapter.identity();
const capacity = kubectl([
  '-n',
  'offscreen-dev-postgres',
  'exec',
  'dev-pg-1',
  '-c',
  'postgres',
  '--',
  'psql',
  '-U',
  'postgres',
  '-d',
  'postgres',
  '-At',
  '-F',
  '|',
  '-c',
  "SELECT current_setting('max_connections'), count(*)::text FROM pg_stat_activity",
]);
process.stdout.write(
  `${JSON.stringify({ phase: 'preflight', identity, databases: Object.keys(preflight.databases), capacity: capacity.trim() })}\n`,
);
const ensured = [];
for (const selectedSlot of slots) {
  ensured.push(
    executeDevSqlTenants({
      knownSlots: slots,
      selectedSlot,
      authorizeLive: TOKEN,
      adapter: createLiveDevSqlAdapter(),
    }),
  );
}
const first = ensured[0];
process.stdout.write(
  `${JSON.stringify({ phase: 'ensure', slots, ok: ensured.every((item) => item.ok), refusals: ensured.flatMap((item) => item.refusals), retained: ensured.flatMap((item) => item.retained ?? []), devLogin: first?.devLogin })}\n`,
);
if (!ensured.every((item) => item.ok)) process.exit(2);
const tenants = slots.map((slotId) => deriveDevSqlTenant(slotId));
const matrix = [];
for (const names of tenants) {
  matrix.push(login(names.runtimeRole, names.database, names.runtimeSecret));
  matrix.push(
    login(names.migrationRole, names.database, names.migrationSecret),
  );
}
if (tenants.length === 2) {
  const [left, right] = tenants;
  matrix.push(login(left.runtimeRole, right.database, left.runtimeSecret));
  matrix.push(login(right.runtimeRole, left.database, right.runtimeSecret));
  matrix.push(login(left.migrationRole, right.database, left.migrationSecret));
  matrix.push(login(right.migrationRole, left.database, right.migrationSecret));
}
for (const names of tenants) {
  for (const database of ['dev', 'postgres', 'template1'])
    matrix.push(login(names.runtimeRole, database, names.runtimeSecret));
  matrix.push(login('dev', names.database, 'dev-pg-app'));
}
matrix.push(login('dev', 'dev', 'dev-pg-app'));
const secondRuns = slots.map((selectedSlot) =>
  executeDevSqlTenants({
    knownSlots: slots,
    selectedSlot,
    authorizeLive: TOKEN,
    adapter: createLiveDevSqlAdapter(),
  }),
);
const second = {
  ok: secondRuns.every((item) => item.ok),
  retained: secondRuns.flatMap((item) => item.retained ?? []),
};
const roleList = [
  'dev',
  ...tenants.flatMap((names) => [names.migrationRole, names.runtimeRole]),
]
  .map((name) => `'${name}'`)
  .join(',');
const databaseList = ['dev', ...tenants.map((names) => names.database)]
  .map((name) => `'${name}'`)
  .join(',');
const ids = kubectl([
  '-n',
  'offscreen-dev-postgres',
  'exec',
  'dev-pg-1',
  '-c',
  'postgres',
  '--',
  'psql',
  '-U',
  'postgres',
  '-d',
  'postgres',
  '-At',
  '-F',
  '|',
  '-c',
  `SELECT 'db', oid::text, datname, COALESCE(array_to_string(datacl, ','), '<default>') FROM pg_database WHERE datname IN (${databaseList}) UNION ALL SELECT 'role', oid::text, rolname, rolinherit::text FROM pg_roles WHERE rolname IN (${roleList})`,
]);
const memberships = kubectl([
  '-n',
  'offscreen-dev-postgres',
  'exec',
  'dev-pg-1',
  '-c',
  'postgres',
  '--',
  'psql',
  '-U',
  'postgres',
  '-d',
  'postgres',
  '-At',
  '-c',
  `SELECT count(*) FROM pg_auth_members am JOIN pg_roles r ON r.oid = am.member WHERE r.rolname IN (${roleList}) AND r.rolname <> 'dev'`,
]);
process.stdout.write(
  `${JSON.stringify({ phase: 'proof', matrix, secondOk: second.ok, secondRetained: second.retained, ids: ids.trim().split('\n'), tenantMemberships: memberships.trim() })}\n`,
);
const expected =
  tenants.length === 1
    ? [true, true, false, false, false, false, true]
    : [
        true,
        true,
        true,
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
      ];
if (!second.ok || matrix.some((item, index) => item.ok !== expected[index]))
  process.exit(2);
