import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { allocateDevWorktreeOwner } from '../domain/dev-worktree-allocator.mjs';
import { DEV_CNPG_NAMESPACE } from '../adapters/dev-cnpg-bootstrap.mjs';
import { DEV_S3_NAMESPACE } from '../adapters/dev-object-store-bootstrap.mjs';
import { deriveDevS3Tenant } from '../adapters/dev-s3-tenant.mjs';
import { deriveDevSqlTenant } from './dev-sql-tenant-contract.mjs';
import { buildRuntimeDatabaseUrl } from './dev-slot-runtime-url.mjs';
import { renderDevSlotAppGraph } from './dev-slot-app-graph.mjs';

const CONTEXT = 'kind-offscreen-dev';
const HOST = 'dev-pg-rw.offscreen-dev-postgres.svc.cluster.local:5432';
const OWNER = 'offscreen-dev';
const EXPECTED_MIGRATION_COUNT = '25';

function kubectl(args, input) {
  return execFileSync('kubectl', ['--context', CONTEXT, ...args], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

/**
 * @param {(args: string[], input?: string) => string} kubectlFn
 * @param {string} namespace
 * @param {string} name
 * @param {string} slotId
 */
export function readOwnedBackingSecret(kubectlFn, namespace, name, slotId) {
  const raw = kubectlFn(['-n', namespace, 'get', 'secret', name, '-o', 'json']);
  const secret = JSON.parse(raw);
  if (secret.metadata?.name !== name) {
    throw new Error(`backing secret name mismatch for ${name}`);
  }
  const observedSlot = secret.metadata?.labels?.['offscreen.dev/slot'];
  const observedOwner = secret.metadata?.labels?.['offscreen.dev/owner'];
  if (observedSlot !== slotId || observedOwner !== OWNER) {
    throw new Error(`backing secret ${name} belongs to another slot`);
  }
  return { uid: secret.metadata.uid, data: secret.data ?? {} };
}

function decode(data, key) {
  const value = data[key];
  if (!value) throw new Error(`missing ${key}`);
  return Buffer.from(value, 'base64').toString();
}

function approvedOauthFromText(text) {
  const found = {};
  for (const line of text.split('\n')) {
    const match = /^(GITHUB_CLIENT_ID|GITHUB_CLIENT_SECRET|BETTER_AUTH_SECRET)=(.*)$/.exec(line);
    if (match) found[match[1]] = match[2];
  }
  if (!found.GITHUB_CLIENT_ID || !found.GITHUB_CLIENT_SECRET || (found.BETTER_AUTH_SECRET ?? '').length < 32) {
    throw new Error('approved local OAuth configuration is missing');
  }
  return found;
}

/**
 * Same key and length contract as projectDevSlot. Unreadable files and
 * parser failures stay redacted: the thrown message never includes file text.
 * @param {string} path
 */
export function assertApprovedOauthFile(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new Error('approved local OAuth configuration is unreadable');
  }
  try {
    return approvedOauthFromText(text);
  } catch (error) {
    if (error instanceof Error && error.message === 'approved local OAuth configuration is missing') throw error;
    throw new Error('approved local OAuth configuration is missing');
  }
}

/**
 * @param {(args: string[], input?: string) => string} kubectlFn
 * @param {string} namespace
 * @param {string} name
 * @param {Record<string, string>} stringData
 * @param {{ 'offscreen.dev/slot': string, 'offscreen.dev/owner': string }} labels
 */
export function applyDevSlotSecret(kubectlFn, namespace, name, stringData, labels) {
  /** @type {{ metadata?: { uid?: string, name?: string, labels?: Record<string, string> } } | undefined} */
  let existing;
  try {
    const raw = kubectlFn(['-n', namespace, 'get', 'secret', name, '-o', 'json']);
    existing = JSON.parse(raw);
  } catch {
    existing = undefined;
  }
  if (existing?.metadata?.uid) {
    if (existing.metadata.name !== name) {
      throw new Error(`secret ${name} name mismatch`);
    }
    const observedSlot = existing.metadata.labels?.['offscreen.dev/slot'];
    const observedOwner = existing.metadata.labels?.['offscreen.dev/owner'];
    if (observedSlot !== labels['offscreen.dev/slot'] || observedOwner !== labels['offscreen.dev/owner']) {
      throw new Error(`secret ${name} belongs to another slot`);
    }
    return existing.metadata.uid;
  }
  const body = {
    apiVersion: 'v1', kind: 'Secret', type: 'Opaque',
    metadata: { name, namespace, labels },
    stringData,
  };
  kubectlFn(['apply', '-f', '-'], JSON.stringify(body));
  return kubectlFn(['-n', namespace, 'get', 'secret', name, '-o', 'jsonpath={.metadata.uid}']).trim();
}

/**
 * @param {{
 *   worktree?: string,
 *   registryRoot?: string,
 *   oauthFile?: string,
 *   record?: import('../domain/dev-worktree-registry.mjs').DevWorktreeOwnerRecord,
 *   oauth?: { GITHUB_CLIENT_ID: string, GITHUB_CLIENT_SECRET: string, BETTER_AUTH_SECRET: string },
 *   deps?: {
 *     kubectl?: (args: string[], input?: string) => string,
 *     randomBytes?: (size: number) => Buffer,
 *   },
 * }} options
 */
export function projectDevSlot(options) {
  const kubectlFn = options.deps?.kubectl ?? kubectl;
  const record = options.record ?? allocateDevWorktreeOwner(options.worktree, options.registryRoot);
  const sql = deriveDevSqlTenant(record.slotId);
  const s3 = deriveDevS3Tenant(record.slotId);
  if (record.namespace !== sql.appNamespace) {
    throw new Error(`allocator namespace ${record.namespace} does not match slot ${record.slotId}`);
  }

  const migrations = kubectlFn([
    '-n', DEV_CNPG_NAMESPACE, 'exec', 'dev-pg-1', '--', 'psql', '-U', 'postgres', '-d', sql.database,
    '-tAc', 'SELECT count(*) FROM drizzle.__drizzle_migrations',
  ]).trim();
  if (migrations !== EXPECTED_MIGRATION_COUNT) throw new Error(`schema gate ${migrations}`);

  const run = readOwnedBackingSecret(kubectlFn, DEV_CNPG_NAMESPACE, sql.runtimeSecret, record.slotId);
  const username = decode(run.data, 'username');
  if (username !== sql.runtimeRole) throw new Error('runtime secret username');

  const backingS3 = readOwnedBackingSecret(kubectlFn, DEV_S3_NAMESPACE, s3.secret, record.slotId);
  for (const key of ['access-key-id', 'secret-access-key']) if (!backingS3.data[key]) throw new Error(`s3 key ${key}`);

  const oauth = options.oauth ?? assertApprovedOauthFile(options.oauthFile);
  const graph = renderDevSlotAppGraph(record.slotId, { schemaReady: true, ports: record.ports });
  kubectlFn(['apply', '-f', '-'], JSON.stringify(graph.documents[0]));

  const labels = { 'offscreen.dev/slot': record.slotId, 'offscreen.dev/owner': OWNER };
  const uri = buildRuntimeDatabaseUrl({
    username,
    password: decode(run.data, 'password'),
    database: sql.database,
    host: HOST,
  });
  const rand = options.deps?.randomBytes ?? randomBytes;
  const runSecret = `${record.slotId}-run-auth`;
  const s3Secret = `${record.slotId}-s3`;
  const appSecret = `${record.slotId}-app`;

  const dbUid = applyDevSlotSecret(kubectlFn, record.namespace, runSecret, { uri }, labels);
  const s3Uid = applyDevSlotSecret(kubectlFn, record.namespace, s3Secret, {
    'access-key-id': decode(backingS3.data, 'access-key-id'),
    'secret-access-key': decode(backingS3.data, 'secret-access-key'),
  }, labels);
  const authSecret = createHash('sha256').update(`${oauth.BETTER_AUTH_SECRET}:${record.slotId}`).digest('hex');
  const appUid = applyDevSlotSecret(kubectlFn, record.namespace, appSecret, {
    'better-auth-secret': authSecret,
    'github-client-id': oauth.GITHUB_CLIENT_ID,
    'github-client-secret': oauth.GITHUB_CLIENT_SECRET,
    'game-authority-service-token': rand(24).toString('hex'),
    'game-authority-control-token': rand(24).toString('hex'),
    'game-authority-executor-token': rand(24).toString('hex'),
  }, labels);

  return { record, dbUid, s3Uid, appUid, images: graph.images, documents: graph.documents };
}