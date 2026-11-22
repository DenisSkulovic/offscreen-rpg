import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveDevS3Tenant, ensureDevS3Tenant, planDevS3Tenant } from './dev-s3-tenant.mjs';

const TOKEN = 'kind-offscreen-dev-s3-tenant-live';

function host() {
  return {
    context: 'kind-offscreen-dev',
    namespace: 'offscreen-dev-objects',
    owner: 'offscreen-dev',
    image: 'docker.io/chrislusf/seaweedfs:4.54',
    pvc: 'object-store-data',
    adminSecret: 'object-store-s3',
    commands: ['s3.bucket.create', 's3.user.provision'],
  };
}

function adapter() {
  const state = { buckets: { 'dev-s3-proof': { owner: 'admin-d0e0666e' } }, users: {}, secrets: {}, log: [] };
  return {
    state,
    identity: host,
    bucket: (name) => state.buckets[name] ?? null,
    user: (name) => state.users[name] ?? null,
    secret: (name) => state.secrets[name] ?? null,
    createBucket(names) {
      state.buckets[names.bucket] = { owner: 'pending' };
      state.log.push(`create ${names.bucket}`);
    },
    provisionUser(names) {
      state.users[names.user] = { owner: names.user, bucket: names.bucket, role: 'readwrite' };
      state.buckets[names.bucket] = { owner: names.user };
      const secret = { name: names.secret, uid: `uid-${names.secret}`, owner: 'offscreen-dev' };
      state.secrets[names.secret] = secret;
      state.log.push(`provision ${names.user}`);
      return { secret: secret.name, uid: secret.uid };
    },
    access(names) {
      const mine = state.users[names.user];
      return { ownWrite: mine?.bucket === names.bucket && mine.role === 'readwrite', otherWrite: false, adminDistributed: false };
    },
  };
}

test('slot identity is bucket-scoped and the plan does not expose credentials', () => {
  const names = deriveDevS3Tenant('dev-1');
  assert.equal(names.bucket, 'offscreen-dev-1');
  assert.equal(names.user, 'dev-1');
  assert.equal(names.secret, 'dev-1-s3');
  const plan = planDevS3Tenant('dev-1');
  assert.equal(plan.readOnly, true);
  assert.equal(JSON.stringify(plan).includes('secret-access-key'), false);
});

test('two tenants stay scoped and re-entry keeps the secret uid', async () => {
  const store = adapter();
  const first = await ensureDevS3Tenant({ slotId: 'dev-1', authorizeLive: TOKEN, adapter: store });
  const secondTenant = await ensureDevS3Tenant({ slotId: 'dev-2', authorizeLive: TOKEN, adapter: store });
  const again = await ensureDevS3Tenant({ slotId: 'dev-1', authorizeLive: TOKEN, adapter: store });
  assert.equal(first.ok && secondTenant.ok && again.ok, true);
  assert.equal(again.retained[0].uid, first.retained[0].uid);
  assert.equal(store.state.buckets['dev-s3-proof'].owner, 'admin-d0e0666e');
  assert.equal(store.state.log.filter((line) => line === 'provision dev-1').length, 1);
});

test('foreign objects, missing commands, partial state and probes do not continue', async () => {
  const foreign = adapter();
  foreign.state.buckets['offscreen-dev-1'] = { owner: 'other' };
  assert.equal((await ensureDevS3Tenant({ slotId: 'dev-1', authorizeLive: TOKEN, adapter: foreign })).refusals[0].id, 'foreign-bucket');
  const partial = adapter();
  partial.createBucket(deriveDevS3Tenant('dev-1'));
  partial.state.secrets['dev-1-s3'] = { name: 'dev-1-s3', uid: 'kept', owner: 'offscreen-dev' };
  const recovered = await ensureDevS3Tenant({ slotId: 'dev-1', authorizeLive: TOKEN, adapter: partial });
  assert.equal(recovered.refusals[0].id, 'partial-secret');
  assert.equal(partial.state.buckets['offscreen-dev-1'].owner, 'pending');
  const missing = adapter();
  missing.identity = () => ({ ...host(), commands: ['s3.bucket.create'] });
  assert.equal((await ensureDevS3Tenant({ slotId: 'dev-1', authorizeLive: TOKEN, adapter: missing })).refusals[0].id, 'weed-command-missing');
  assert.equal((await ensureDevS3Tenant({ slotId: 'dev-1', authorizeLive: TOKEN, adapter: { injectedProbe: true } })).refusals[0].id, 'injected-probe');
});
