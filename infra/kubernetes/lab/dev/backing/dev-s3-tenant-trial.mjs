import { spawn } from 'node:child_process';
import http from 'node:http';
import { createDevS3LiveAdapter } from './dev-s3-tenant-live-adapter.mjs';
import { ensureDevS3Tenant } from './dev-s3-tenant.mjs';
import { signS3Request } from './dev-object-store-s3-proof.mjs';
import { DEV_S3_CONTEXT, DEV_S3_NAMESPACE } from './dev-object-store-bootstrap.mjs';

const TOKEN = 'kind-offscreen-dev-s3-tenant-live';
const HOST = '127.0.0.1:18334';

function kubectlJson(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('kubectl', ['--context', DEV_S3_CONTEXT, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error('kubectl failed'))));
  });
}

function request(method, path, body, headers) {
  return new Promise((resolve) => {
    const req = http.request({ hostname: '127.0.0.1', port: 18334, method, path, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', () => resolve({ status: 0, body: '' }));
    if (body) req.write(body);
    req.end();
  });
}

async function signed(credentials, method, path, body) {
  const headers = signS3Request({ ...credentials, method, path, body, host: HOST });
  return request(method, path, body, headers);
}

async function readSecret(name) {
  const raw = await kubectlJson(['-n', DEV_S3_NAMESPACE, 'get', 'secret', name, '-o', 'json']);
  const body = JSON.parse(raw);
  return {
    uid: body.metadata.uid,
    accessKeyId: Buffer.from(body.data['access-key-id'], 'base64').toString('utf8'),
    secretAccessKey: Buffer.from(body.data['secret-access-key'], 'base64').toString('utf8'),
  };
}

async function matrix(label, left, right, admin) {
  const own = await signed(left.credentials, 'PUT', `/${left.bucket}/marker-${label}.txt`, label);
  const read = await signed(left.credentials, 'GET', `/${left.bucket}/marker-${label}.txt`);
  const cross = await signed(left.credentials, 'GET', `/${right.bucket}/marker-${label}.txt`);
  const proof = await signed(left.credentials, 'GET', '/dev-s3-proof/kept.txt');
  const otherOwn = await signed(right.credentials, 'PUT', `/${right.bucket}/marker-${label}.txt`, label);
  const otherCross = await signed(right.credentials, 'PUT', `/${left.bucket}/foreign-${label}.txt`, 'no');
  const adminRead = await signed(admin, 'GET', '/dev-s3-proof/kept.txt');
  return {
    [`${left.user} own put`]: own.status,
    [`${left.user} own get`]: read.status,
    [`${left.user} cross get`]: cross.status,
    [`${left.user} proof get`]: proof.status,
    [`${right.user} own put`]: otherOwn.status,
    [`${right.user} cross put`]: otherCross.status,
    'admin proof get': adminRead.status,
  };
}

const adapter = createDevS3LiveAdapter();
const first = await ensureDevS3Tenant({ slotId: 'dev-1', authorizeLive: TOKEN, adapter });
const second = await ensureDevS3Tenant({ slotId: 'dev-2', authorizeLive: TOKEN, adapter });
if (!first.ok || !second.ok) {
  console.log(JSON.stringify({ first, second }));
  process.exit(1);
}
const forward = spawn('kubectl', ['--context', DEV_S3_CONTEXT, '-n', DEV_S3_NAMESPACE, 'port-forward', 'svc/object-store', '18334:8333'], { stdio: 'ignore' });
await new Promise((resolve) => setTimeout(resolve, 800));
const dev1 = await readSecret('dev-1-s3');
const dev2 = await readSecret('dev-2-s3');
const adminSecret = await readSecret('object-store-s3');
const beforeUid = JSON.parse(await kubectlJson(['-n', DEV_S3_NAMESPACE, 'get', 'pvc', 'object-store-data', '-o', 'json'])).metadata.uid;
const before = await matrix('before', { user: 'dev-1', bucket: 'offscreen-dev-1', credentials: dev1 }, { user: 'dev-2', bucket: 'offscreen-dev-2', credentials: dev2 }, adminSecret);
const pod = JSON.parse(await kubectlJson(['-n', DEV_S3_NAMESPACE, 'get', 'pod', '-l', 'app=object-store', '-o', 'json'])).items[0].metadata.name;
await kubectlJson(['-n', DEV_S3_NAMESPACE, 'delete', 'pod', pod, '--wait=true']);
for (let attempt = 0; attempt < 30; attempt += 1) {
  const ready = JSON.parse(await kubectlJson(['-n', DEV_S3_NAMESPACE, 'get', 'deploy', 'object-store', '-o', 'json'])).status.readyReplicas;
  if (ready === 1) break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
await new Promise((resolve) => setTimeout(resolve, 1000));
const after = await matrix('before', { user: 'dev-1', bucket: 'offscreen-dev-1', credentials: dev1 }, { user: 'dev-2', bucket: 'offscreen-dev-2', credentials: dev2 }, adminSecret);
const kept = await signed(dev1, 'GET', '/offscreen-dev-1/marker-before.txt');
const again = await ensureDevS3Tenant({ slotId: 'dev-1', authorizeLive: TOKEN, adapter: createDevS3LiveAdapter() });
const afterUid = JSON.parse(await kubectlJson(['-n', DEV_S3_NAMESPACE, 'get', 'pvc', 'object-store-data', '-o', 'json'])).metadata.uid;
const receipt = { before, after, kept: kept.status, secretUid: again.retained?.[0]?.uid, firstUid: first.retained?.[0]?.uid, pvcBefore: beforeUid, pvcAfter: afterUid };
const serialized = JSON.stringify(receipt);
if (serialized.includes(dev1.secretAccessKey) || serialized.includes(dev1.accessKeyId)) {
  console.log(JSON.stringify({ ok: false, reason: 'receipt leaked' }));
  process.exit(1);
}
console.log(serialized);
forward.kill();
