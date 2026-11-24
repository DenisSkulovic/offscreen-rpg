import { DEV_CLUSTER_NAME } from '../domain/dev-worktree-allocator.mjs';
import { DEV_CNPG_CLUSTER, DEV_CNPG_CONTEXT, DEV_CNPG_NAMESPACE } from '../../../../infra/platform/postgres/dev-bootstrap.mjs';

const SLOT_ID = /^dev-([1-9][0-9]*)$/;
const SQL_NAME_LIMIT = 63;

export const DEV_SQL_RUNTIME_CONNECTION_LIMIT = 8;
export const DEV_SQL_MIGRATION_CONNECTION_LIMIT = 2;
export const DEV_SQL_POOL_MAX = 2;

function refusal(id, detail) {
  const error = new Error(detail);
  error.code = id;
  return error;
}

export function deriveDevSqlTenant(slotId) {
  const match = SLOT_ID.exec(slotId ?? '');
  if (!match) throw refusal('invalid-slot-id', `slot id ${slotId} is not dev-<positive integer>`);
  const digits = match[1];
  const names = {
    slotId: `dev-${digits}`,
    digits,
    database: `dev_${digits}`,
    migrationRole: `dev_${digits}_mig`,
    runtimeRole: `dev_${digits}_run`,
    databaseCr: `dev-${digits}`,
    migrationRoleCr: `dev-${digits}-mig`,
    runtimeRoleCr: `dev-${digits}-run`,
    migrationSecret: `dev-${digits}-mig-auth`,
    runtimeSecret: `dev-${digits}-run-auth`,
    namespace: DEV_CNPG_NAMESPACE,
    appNamespace: `offscreen-dev-${digits}`,
    cluster: DEV_CNPG_CLUSTER,
    context: DEV_CNPG_CONTEXT,
  };
  for (const name of [names.database, names.migrationRole, names.runtimeRole]) {
    if (Buffer.byteLength(name) > SQL_NAME_LIMIT) {
      throw refusal('identifier-overflow', `${name} exceeds ${SQL_NAME_LIMIT} bytes`);
    }
  }
  return names;
}

export function assertDevSqlTenantBinding(record, slotId) {
  const names = deriveDevSqlTenant(slotId);
  if (!record || record.slotId !== names.slotId || record.namespace !== names.appNamespace || record.cluster !== DEV_CLUSTER_NAME) {
    throw refusal('owner-binding', 'worktree owner record does not match the SQL tenant slot');
  }
  return names;
}

function roleManifest(names, kind) {
  const migration = kind === 'migration';
  const name = migration ? names.migrationRoleCr : names.runtimeRoleCr;
  const secret = migration ? names.migrationSecret : names.runtimeSecret;
  const role = migration ? names.migrationRole : names.runtimeRole;
  const limit = migration ? DEV_SQL_MIGRATION_CONNECTION_LIMIT : DEV_SQL_RUNTIME_CONNECTION_LIMIT;
  return [
    'apiVersion: postgresql.cnpg.io/v1',
    'kind: DatabaseRole',
    'metadata:',
    `  name: ${name}`,
    `  namespace: ${names.namespace}`,
    '  labels:',
    '    offscreen.dev/owner: offscreen-dev',
    `    offscreen.dev/slot: ${names.slotId}`,
    'spec:',
    '  cluster:',
    `    name: ${names.cluster}`,
    `  name: ${role}`,
    '  login: true',
    '  superuser: false',
    '  createdb: false',
    '  createrole: false',
    '  replication: false',
    '  bypassrls: false',
    '  inherit: false',
    '  inRoles: []',
    '  databaseRoleReclaimPolicy: retain',
    `  connectionLimit: ${limit}`,
    '  passwordSecret:',
    `    name: ${secret}`,
  ].join('\n');
}

function secretManifest(names, kind) {
  const migration = kind === 'migration';
  return [
    'apiVersion: v1',
    'kind: Secret',
    'metadata:',
    `  name: ${migration ? names.migrationSecret : names.runtimeSecret}`,
    `  namespace: ${names.namespace}`,
    '  labels:',
    '    offscreen.dev/owner: offscreen-dev',
    `    offscreen.dev/slot: ${names.slotId}`,
    '    cnpg.io/reload: "true"',
    'type: kubernetes.io/basic-auth',
    'stringData:',
    `  username: ${migration ? names.migrationRole : names.runtimeRole}`,
  ].join('\n');
}

export function renderDevSqlTenant(slotId) {
  const names = deriveDevSqlTenant(slotId);
  const database = [
    'apiVersion: postgresql.cnpg.io/v1',
    'kind: Database',
    'metadata:',
    `  name: ${names.databaseCr}`,
    `  namespace: ${names.namespace}`,
    '  labels:',
    '    offscreen.dev/owner: offscreen-dev',
    `    offscreen.dev/slot: ${names.slotId}`,
    'spec:',
    '  cluster:',
    `    name: ${names.cluster}`,
    `  name: ${names.database}`,
    `  owner: ${names.migrationRole}`,
    '  allowConnections: false',
    '  databaseReclaimPolicy: retain',
  ].join('\n');
  return {
    names,
    manifest: [secretManifest(names, 'migration'), secretManifest(names, 'runtime'), roleManifest(names, 'migration'), roleManifest(names, 'runtime'), database].join('\n---\n'),
  };
}
