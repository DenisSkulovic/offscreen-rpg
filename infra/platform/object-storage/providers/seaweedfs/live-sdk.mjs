import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readPlatformProfile } from '../../../common/profile.mjs';

const requireSdk = createRequire(new URL('../../../../../packages/object-storage/package.json', import.meta.url));

function credentials(profile, name, slotId) {
  const raw = execFileSync('kubectl', ['--context', profile.contextName, '-n',
    profile.namespaces.objectStorage, 'get', 'secret', name, '-o', 'json'],
  { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
  const secret = JSON.parse(raw);
  const labels = secret.metadata?.labels ?? {};
  if (secret.kind !== 'Secret' || secret.metadata?.name !== name ||
      secret.metadata?.namespace !== profile.namespaces.objectStorage ||
      !secret.metadata?.uid || secret.metadata?.deletionTimestamp ||
      labels['offscreen.dev/owner'] !== profile.ownerValue ||
      (slotId && labels['offscreen.dev/slot'] !== slotId)) throw new Error('credential identity');
  const accessKeyId = Buffer.from(secret.data?.['access-key-id'] ?? '', 'base64').toString('utf8');
  const secretAccessKey = Buffer.from(secret.data?.['secret-access-key'] ?? '', 'base64').toString('utf8');
  if (!accessKeyId || !secretAccessKey) throw new Error('credential missing');
  return { accessKeyId, secretAccessKey };
}

async function withForward(profile, action) {
  const child = spawn('kubectl', ['--context', profile.contextName, '-n',
    profile.namespaces.objectStorage, 'port-forward', '--address', '127.0.0.1',
    'service/object-store', ':8333'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let closed = false;
  const exited = new Promise(resolve => {
    child.once('close', () => { closed = true; resolve(); });
  });
  try {
    const port = await new Promise((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error('forward timeout')), 15000);
      const finish = (fn, value) => { clearTimeout(timer); fn(value); };
      child.on('error', () => finish(reject, new Error('forward failed')));
      child.on('close', () => finish(reject, new Error('forward closed')));
      const data = chunk => {
        output = (output + chunk.toString()).slice(-4096);
        const match = /Forwarding from 127\.0\.0\.1:(\d+) -> 8333/.exec(output);
        if (match) finish(resolve, Number(match[1]));
      };
      child.stdout.on('data', data);
      child.stderr.on('data', data);
    });
    return await action('http://127.0.0.1:' + port);
  } finally {
    if (!closed) {
      child.kill('SIGTERM');
      let timer;
      await Promise.race([exited, new Promise(resolve => { timer = setTimeout(resolve, 2000); })]);
      clearTimeout(timer);
      if (!closed) {
        child.kill('SIGKILL');
        let killTimer;
        await Promise.race([exited, new Promise(resolve => { killTimer = setTimeout(resolve, 2000); })]);
        clearTimeout(killTimer);
      }
      if (!closed) throw new Error('forward cleanup unverified');
    }
  }
}

export async function observeDevS3Sdk(tenant, observation) {
  const profile = readPlatformProfile('dev');
  if (tenant.context !== profile.contextName || tenant.namespace !== profile.namespaces.objectStorage)
    throw new Error('wrong S3 target');
  const sdk = requireSdk('@aws-sdk/client-s3');
  return withForward(profile, async endpoint => {
    const clients = [];
    const makeClient = keys => {
      const client = new sdk.S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true,
        credentials: keys, maxAttempts: 1 });
      clients.push(client);
      return client;
    };
    const send = (client, command) => client.send(command, { abortSignal: AbortSignal.timeout(10000) });
    try {
      const admin = makeClient(credentials(profile, 'object-store-s3'));
      const bucketPolicies = [];
      const names = new Set();
      let token;
      const tokens = new Set();
      do {
        const page = await send(admin, new sdk.ListBucketsCommand(token ? { ContinuationToken: token } : {}));
        if (!Array.isArray(page.Buckets)) throw new Error('bucket inventory missing');
        for (const bucket of page.Buckets) {
          if (!bucket.Name || names.has(bucket.Name) || names.size >= 256) throw new Error('bucket inventory invalid');
          names.add(bucket.Name);
          try {
            await send(admin, new sdk.GetBucketPolicyCommand({ Bucket: bucket.Name }));
            bucketPolicies.push({ name: bucket.Name, state: 'present' });
          } catch (error) {
            if (error.name !== 'NoSuchBucketPolicy' || error.$metadata?.httpStatusCode !== 404) throw error;
            bucketPolicies.push({ name: bucket.Name, state: 'absent' });
          }
        }
        token = page.ContinuationToken;
        if (token && tokens.has(token)) throw new Error('bucket inventory pagination loop');
        if (token) tokens.add(token);
      } while (token);
      if (names.has(tenant.bucket) !== Boolean(observation.bucket)) throw new Error('bucket inventories disagree');
      let headBucket = null;
      if (observation.secret && observation.bucket && observation.user) {
        const scoped = makeClient(credentials(profile, tenant.secret, tenant.slotId));
        await send(scoped, new sdk.HeadBucketCommand({ Bucket: tenant.bucket }));
        headBucket = 'ok';
      }
      return { bucketPolicies, headBucket };
    } finally {
      for (const client of clients) client.destroy();
    }
  });
}
