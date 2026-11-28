import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readPlatformProfile } from '../../../common/profile.mjs';

const requireSdk = createRequire(new URL('../../../../../packages/object-storage/package.json', import.meta.url));

function credentials(profile, name, slotId, expected) {
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
  if (expected && (secret.metadata.uid !== expected.uid || accessKeyId !== expected.accessKeyId)) throw new Error('credential observation changed');
  return { accessKeyId, secretAccessKey };
}

async function withForward(profile, action, remotePort = 8333) {
  const child = spawn('kubectl', ['--context', profile.contextName, '-n',
    profile.namespaces.objectStorage, 'port-forward', '--address', '127.0.0.1',
    'service/object-store', ':' + remotePort], { stdio: ['ignore', 'pipe', 'pipe'] });
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
        const match = new RegExp('Forwarding from 127\\.0\\.0\\.1:(\\d+) -> ' + remotePort).exec(output);
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

export async function observeDevS3Sdk(tenant, observation, expectedBucketNames) {
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
    const deadline = performance.now() + 60_000;
    const send = (client, command) => {
      const remaining = Math.floor(deadline - performance.now());
      if (remaining < 1) throw new Error('S3 observation budget exhausted');
      return client.send(command, { abortSignal: AbortSignal.timeout(Math.min(10_000, remaining)) });
    };
    try {
      const admin = makeClient(credentials(profile, 'object-store-s3'));
      const bucketPolicies = [];
      const names = new Set();
      let token;
      const tokens = new Set();
      let pages = 0;
      do {
        if (++pages > 256) throw new Error('bucket inventory page limit');
        const page = await send(admin, new sdk.ListBucketsCommand(token ? { ContinuationToken: token } : {}));
        if (!Array.isArray(page.Buckets)) throw new Error('bucket inventory missing');
        for (const bucket of page.Buckets) {
          if (typeof bucket.Name !== 'string' || !bucket.Name || names.has(bucket.Name) || names.size >= 256) throw new Error('bucket inventory invalid');
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
        if (token != null && typeof token !== 'string') throw new Error('invalid continuation token');
        if (token && tokens.has(token)) throw new Error('bucket inventory pagination loop');
        if (token) tokens.add(token);
      } while (token);
      if (!Array.isArray(expectedBucketNames) || names.size !== expectedBucketNames.length ||
          expectedBucketNames.some(name => !names.has(name)) ||
          names.has(tenant.bucket) !== Boolean(observation.bucket)) throw new Error('bucket inventories disagree');
      let headBucket = null;
      if (observation.secret && observation.bucket && observation.user) {
        const scoped = makeClient(credentials(profile, tenant.secret, tenant.slotId, observation.secret));
        await send(scoped, new sdk.HeadBucketCommand({ Bucket: tenant.bucket }));
        headBucket = 'ok';
      }
      return { bucketPolicies, headBucket };
    } finally {
      for (const client of clients) client.destroy();
    }
  });
}

const MARKER_MAX_BYTES = 4096;
const MARKER_REQUEST_MS = 10_000;
const FORWARD_MS = 15_000;
/** Minimum custody budget for one marker read (forward + GET + stream). */
export const MARKER_READ_MIN_BUDGET_MS = FORWARD_MS + MARKER_REQUEST_MS;
/** Minimum custody budget for the bounded marker writes (forward + create + put). */
export const MARKER_WRITE_MIN_BUDGET_MS = FORWARD_MS + 2 * MARKER_REQUEST_MS;

/**
 * Custody-budget clock for one marker SDK operation. Refuses (before any
 * credential use or network call) when the supplied remaining budget is
 * missing or smaller than the operation minimum.
 * @param {unknown} budgetMs remaining custody budget
 * @param {number} minimumMs
 */
function markerClock(budgetMs, minimumMs) {
  if (!Number.isFinite(budgetMs) || budgetMs < minimumMs) throw new Error('marker budget insufficient');
  const deadline = performance.now() + budgetMs;
  return {
    /** Per-request bound: 10s capped by what the custody budget has left. */
    requestMs() {
      const left = Math.floor(deadline - performance.now());
      if (left < 1) throw new Error('marker budget exhausted');
      return Math.min(MARKER_REQUEST_MS, left);
    },
  };
}

/**
 * Bounded streaming read of a marker body: rejects a missing, negative or
 * oversize length, bytes beyond the declared length, and any stall past
 * `deadlineMs`. The stream is destroyed on every failure path.
 * @param {AsyncIterable<Buffer> & { destroy?: (error?: Error) => void }} body
 * @param {unknown} length declared ContentLength
 * @param {number} deadlineMs
 */
export async function readBoundedMarkerBody(body, length, deadlineMs) {
  const { createHash } = await import('node:crypto');
  if (!Number.isInteger(length) || length < 0 || length > MARKER_MAX_BYTES) {
    body?.destroy?.();
    throw new Error('marker length invalid');
  }
  let timer;
  const hash = createHash('sha256');
  let size = 0;
  const consume = (async () => {
    for await (const chunk of body) {
      size += chunk.length;
      if (size > length || size > MARKER_MAX_BYTES) throw new Error('marker too large');
      hash.update(chunk);
    }
    if (size !== length) throw new Error('marker length mismatch');
    return { size, sha256: hash.digest('hex') };
  })();
  consume.catch(() => {});
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('marker stream deadline')), Math.max(1, deadlineMs));
  });
  try {
    return await Promise.race([consume, deadline]);
  } catch (error) {
    body?.destroy?.();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
const METRICS_MAX_BYTES = 2 * 1024 * 1024;

function adminSecretIdentity(profile) {
  const raw = execFileSync('kubectl', ['--context', profile.contextName, '-n',
    profile.namespaces.objectStorage, 'get', 'secret', 'object-store-s3', '-o', 'json'],
  { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
  const meta = JSON.parse(raw).metadata ?? {};
  return { uid: meta.uid, resourceVersion: meta.resourceVersion };
}

/**
 * Bounded GET of the retained synthetic marker. Credentials stay in memory;
 * returns only size and SHA-256. The admin Secret UID/resourceVersion must
 * equal `expectedSecret` before and after the read.
 * @param {{ bucket: string, key: string }} descriptor
 * @param {{ uid: string, resourceVersion: string }} expectedSecret
 * @param {{ budgetMs: number }} options remaining custody budget (required)
 */
export async function readMarkerObject(descriptor, expectedSecret, options = {}) {
  const clock = markerClock(options.budgetMs, MARKER_READ_MIN_BUDGET_MS);
  const profile = readPlatformProfile('dev');
  const same = (id) => id.uid === expectedSecret.uid && id.resourceVersion === expectedSecret.resourceVersion;
  if (!same(adminSecretIdentity(profile))) throw new Error('marker admin Secret changed');
  const sdk = requireSdk('@aws-sdk/client-s3');
  const result = await withForward(profile, async endpoint => {
    const client = new sdk.S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true,
      credentials: credentials(profile, 'object-store-s3'), maxAttempts: 1 });
    try {
      const response = await client.send(new sdk.GetObjectCommand({ Bucket: descriptor.bucket, Key: descriptor.key }),
        { abortSignal: AbortSignal.timeout(clock.requestMs()) });
      return await readBoundedMarkerBody(response.Body, response.ContentLength, clock.requestMs());
    } finally {
      client.destroy();
    }
  });
  if (!same(adminSecretIdentity(profile))) throw new Error('marker admin Secret changed');
  return result;
}

const sameSecret = (a, b) => a.uid === b.uid && a.resourceVersion === b.resourceVersion;
const MARKER_BUCKET_NAME = /^offscreen-e2-marker-[0-9a-f]{32}$/;

/**
 * Read-only: the marker bucket must be absent (HeadBucket 404). Credentials
 * stay in memory; the admin Secret UID/resourceVersion must match before and
 * after. Resolves true only for a definite absence.
 * @param {string} bucket
 * @param {{ uid: string, resourceVersion: string }} expectedSecret
 * @param {{ budgetMs: number }} options remaining custody budget (required)
 */
export async function markerBucketAbsent(bucket, expectedSecret, options = {}) {
  const clock = markerClock(options.budgetMs, MARKER_READ_MIN_BUDGET_MS);
  if (!MARKER_BUCKET_NAME.test(bucket)) throw new Error('marker bucket name invalid');
  const profile = readPlatformProfile('dev');
  if (!sameSecret(adminSecretIdentity(profile), expectedSecret)) throw new Error('marker admin Secret changed');
  const sdk = requireSdk('@aws-sdk/client-s3');
  const absent = await withForward(profile, async endpoint => {
    const client = new sdk.S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true,
      credentials: credentials(profile, 'object-store-s3'), maxAttempts: 1 });
    try {
      await client.send(new sdk.HeadBucketCommand({ Bucket: bucket }),
        { abortSignal: AbortSignal.timeout(clock.requestMs()) });
      return false;
    } catch (error) {
      if (error?.$metadata?.httpStatusCode === 404) return true;
      throw new Error('marker bucket probe failed');
    } finally {
      client.destroy();
    }
  });
  if (!sameSecret(adminSecretIdentity(profile), expectedSecret)) throw new Error('marker admin Secret changed');
  return absent;
}

/**
 * The only S3 writes of marker preparation: create exactly this bucket, then
 * a conditional PutObject (IfNoneMatch "*"). No retry, no delete, no policy.
 * Any failure is reported generically; the caller keeps its intent.
 * @param {{ bucket: string, key: string }} descriptor
 * @param {Buffer} bytes
 * @param {{ uid: string, resourceVersion: string }} expectedSecret
 * @param {{ budgetMs: number }} options remaining custody budget (required)
 */
export async function writeMarkerObject(descriptor, bytes, expectedSecret, options = {}) {
  const clock = markerClock(options.budgetMs, MARKER_WRITE_MIN_BUDGET_MS);
  if (!MARKER_BUCKET_NAME.test(descriptor.bucket) || descriptor.key !== 'retained-marker.bin' ||
      !Buffer.isBuffer(bytes) || bytes.length < 32 || bytes.length > MARKER_MAX_BYTES) {
    throw new Error('marker write request invalid');
  }
  const profile = readPlatformProfile('dev');
  if (!sameSecret(adminSecretIdentity(profile), expectedSecret)) throw new Error('marker admin Secret changed');
  const sdk = requireSdk('@aws-sdk/client-s3');
  await withForward(profile, async endpoint => {
    const client = new sdk.S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true,
      credentials: credentials(profile, 'object-store-s3'), maxAttempts: 1 });
    try {
      await client.send(new sdk.CreateBucketCommand({ Bucket: descriptor.bucket }),
        { abortSignal: AbortSignal.timeout(clock.requestMs()) });
      await client.send(new sdk.PutObjectCommand({ Bucket: descriptor.bucket, Key: descriptor.key,
        Body: bytes, ContentLength: bytes.length, IfNoneMatch: '*' }),
      { abortSignal: AbortSignal.timeout(clock.requestMs()) });
    } catch {
      throw new Error('marker write incomplete or unknown');
    } finally {
      client.destroy();
    }
  });
  if (!sameSecret(adminSecretIdentity(profile), expectedSecret)) throw new Error('marker admin Secret changed');
}

/**
 * Bounded loopback GET of the native metrics endpoint. Returns only family
 * names, types and label keys, never sample values.
 */
export async function scrapeMetricFamilies() {
  const profile = readPlatformProfile('dev');
  return withForward(profile, async endpoint => {
    const response = await fetch(endpoint + '/metrics', { signal: AbortSignal.timeout(10_000) });
    if (response.status !== 200) throw new Error('metrics endpoint status');
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > METRICS_MAX_BYTES) throw new Error('metrics body too large');
      chunks.push(chunk);
    }
    return parseMetricFamilies(Buffer.concat(chunks).toString('utf8'));
  }, 9327);
}

/** @param {string} text */
export function parseMetricFamilies(text) {
  const types = new Map();
  const labels = new Map();
  let samples = 0;
  for (const line of text.split('\n')) {
    if (!line) continue;
    const type = /^# TYPE ([a-zA-Z_:][a-zA-Z0-9_:]*) (counter|gauge|histogram|summary|untyped)$/.exec(line);
    if (type) { types.set(type[1], type[2]); continue; }
    if (line.startsWith('#')) continue;
    const sample = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})? [^ ]+(?: [0-9]+)?$/.exec(line);
    if (!sample) throw new Error('metrics sample malformed');
    samples += 1;
    const keys = labels.get(sample[1]) ?? new Set();
    for (const pair of (sample[2] ?? '').split(',')) {
      const key = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)=/.exec(pair)?.[1];
      if (key) keys.add(key);
    }
    labels.set(sample[1], keys);
  }
  if (samples === 0) throw new Error('metrics sample set empty');
  return [...labels.keys()].sort().map(name => ({
    name, type: types.get(name) ?? 'untyped', labelKeys: [...labels.get(name)].sort(),
  }));
}
