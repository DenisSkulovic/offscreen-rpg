import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { allocateDevWorktreeOwner } from '../../../../../scripts/repo-tools/dev-worktree-allocator.mjs';
import { buildRuntimeDatabaseUrl } from './dev-slot-runtime-url.mjs';
import { renderDevSlotAppGraph } from './dev-slot-app-graph.mjs';

const CONTEXT = 'kind-offscreen-dev';
const HOST = 'dev-pg-rw.offscreen-dev-postgres.svc.cluster.local:5432';

function kubectl(args, input) {
  return execFileSync('kubectl', ['--context', CONTEXT, ...args], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

function secretKeys(namespace, name) {
  const raw = kubectl(['-n', namespace, 'get', 'secret', name, '-o', 'json']);
  const secret = JSON.parse(raw);
  return { uid: secret.metadata.uid, data: secret.data };
}

function decode(data, key) {
  const value = data[key];
  if (!value) throw new Error(`missing ${key}`);
  return Buffer.from(value, 'base64').toString();
}

function approvedOauth(path) {
  const found = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^(GITHUB_CLIENT_ID|GITHUB_CLIENT_SECRET|BETTER_AUTH_SECRET)=(.*)$/.exec(line);
    if (match) found[match[1]] = match[2];
  }
  if (!found.GITHUB_CLIENT_ID || !found.GITHUB_CLIENT_SECRET || (found.BETTER_AUTH_SECRET ?? '').length < 32) {
    throw new Error('approved local OAuth configuration is missing');
  }
  return found;
}

function applySecret(namespace, name, stringData, labels) {
  try {
    const existing = kubectl(['-n', namespace, 'get', 'secret', name, '-o', 'jsonpath={.metadata.uid}']).trim();
    if (existing) return existing;
  } catch { /* create below */ }
  const body = {
    apiVersion: 'v1', kind: 'Secret', type: 'Opaque',
    metadata: { name, namespace, labels },
    stringData,
  };
  kubectl(['apply', '-f', '-'], JSON.stringify(body));
  return kubectl(['-n', namespace, 'get', 'secret', name, '-o', 'jsonpath={.metadata.uid}']).trim();
}

export function projectDevSlot(options) {
  const record = allocateDevWorktreeOwner(options.worktree, options.registryRoot);
  if (record.slotId !== 'dev-1' || record.namespace !== 'offscreen-dev-1') {
    throw new Error(`allocator bound ${record.slotId}, refusing a different slot`);
  }
  const migrations = kubectl(['-n', 'offscreen-dev-postgres', 'exec', 'dev-pg-1', '--', 'psql', '-U', 'postgres', '-d', 'dev_1', '-tAc', 'SELECT count(*) FROM drizzle.__drizzle_migrations']).trim();
  if (migrations !== '25') throw new Error(`schema gate ${migrations}`);
  const run = secretKeys('offscreen-dev-postgres', 'dev-1-run-auth');
  const username = decode(run.data, 'username');
  if (username !== 'dev_1_run') throw new Error('runtime secret username');
  const s3 = secretKeys('offscreen-dev-objects', 'dev-1-s3');
  for (const key of ['access-key-id', 'secret-access-key']) if (!s3.data[key]) throw new Error(`s3 key ${key}`);
  const oauth = approvedOauth(options.oauthFile);
  const graph = renderDevSlotAppGraph('dev-1', { schemaReady: true, ports: record.ports });
  kubectl(['apply', '-f', '-'], JSON.stringify(graph.documents[0]));
  const labels = { 'offscreen.dev/slot': 'dev-1', 'offscreen.dev/owner': 'offscreen-dev' };
  const uri = buildRuntimeDatabaseUrl({ username, password: decode(run.data, 'password'), database: 'dev_1', host: HOST });
  const dbUid = applySecret('offscreen-dev-1', 'dev-1-run-auth', { uri }, labels);
  const s3Uid = applySecret('offscreen-dev-1', 'dev-1-s3', {
    'access-key-id': decode(s3.data, 'access-key-id'),
    'secret-access-key': decode(s3.data, 'secret-access-key'),
  }, labels);
  const authSecret = createHash('sha256').update(`${oauth.BETTER_AUTH_SECRET}:dev-1`).digest('hex');
  const appUid = applySecret('offscreen-dev-1', 'dev-1-app', {
    'better-auth-secret': authSecret,
    'github-client-id': oauth.GITHUB_CLIENT_ID,
    'github-client-secret': oauth.GITHUB_CLIENT_SECRET,
    'game-authority-service-token': randomBytes(24).toString('hex'),
    'game-authority-control-token': randomBytes(24).toString('hex'),
    'game-authority-executor-token': randomBytes(24).toString('hex'),
  }, labels);
  return { record, dbUid, s3Uid, appUid, images: graph.images, documents: graph.documents };
}

if (process.argv[1]?.endsWith('dev-slot-project.mjs')) {
  const result = projectDevSlot({
    worktree: process.argv[2],
    registryRoot: process.argv[3],
    oauthFile: process.argv[4],
  });
  for (const document of result.documents.slice(1)) kubectl(['apply', '-f', '-'], JSON.stringify(document));
  process.stdout.write(`${JSON.stringify({
    slot: result.record.slotId,
    namespace: result.record.namespace,
    ports: result.record.ports,
    uids: { db: result.dbUid, s3: result.s3Uid, app: result.appUid },
    images: result.images,
  })}\n`);
}
