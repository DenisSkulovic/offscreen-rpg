import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveDevS3Tenant,
  ensureDevS3Tenant,
  mockObservationForStore,
  planDevS3Tenant,
} from '../src/adapters/dev-s3-tenant.mjs';
import { expectedTenantPolicy } from '../../../infra/platform/object-storage/providers/seaweedfs/provision.mjs';

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
  const state = {
    buckets: { 'dev-s3-proof': { owner: 'admin-d0e0666e' } },
    users: {},
    secrets: {},
    policyInventory: [],
    accessKeyId: 'AK-DEV-MOCK',
    log: [],
  };
  return {
    state,
    identity: host,
    bucket: (name) => state.buckets[name] ?? null,
    user: (name) => state.users[name] ?? null,
    secret: (name) => state.secrets[name] ?? null,
    readObservation(names) {
      return mockObservationForStore(state, names);
    },
    createBucket(names) {
      state.buckets[names.bucket] = { owner: names.user };
      state.log.push(`create ${names.bucket}`);
    },
    provisionUser(names) {
      state.users[names.user] = {
        owner: names.user,
        bucket: names.bucket,
        role: 'readwrite',
        policies: [names.policyName],
        source: 'dynamic',
        enabled: true,
        credentials: [{ accessKey: state.accessKeyId, status: 'Active' }],
      };
      if (!state.policyInventory.includes(names.policyName)) {
        state.policyInventory.push(names.policyName);
      }
      const secret = {
        name: names.secret,
        uid: `uid-${names.secret}`,
        owner: 'offscreen-dev',
        accessKeyId: state.accessKeyId,
      };
      state.secrets[names.secret] = secret;
      state.log.push(`provision ${names.user}`);
      return { secret: secret.name, uid: secret.uid };
    },
    access(names) {
      const mine = state.users[names.user];
      return {
        ownWrite: mine?.bucket === names.bucket && mine.role === 'readwrite',
        otherWrite: false,
        adminDistributed: false,
      };
    },
  };
}

function completeStore(names, state, overrides = {}) {
  state.buckets[names.bucket] = { owner: names.user };
  state.users[names.user] = {
    policies: [names.policyName],
    source: 'dynamic',
    enabled: true,
    bucket: names.bucket,
    role: 'readwrite',
    credentials: [{ accessKey: state.accessKeyId, status: 'Active' }],
  };
  state.secrets[names.secret] = {
    name: names.secret,
    uid: `uid-${names.secret}`,
    owner: 'offscreen-dev',
    accessKeyId: state.accessKeyId,
  };
  state.policyInventory = [names.policyName];
  return mockObservationForStore(state, names, {
    headBucket: 'ok',
    ...overrides,
  });
}

test('slot identity is bucket-scoped and the plan does not expose credentials', () => {
  const names = deriveDevS3Tenant('dev-1');
  assert.equal(names.bucket, 'offscreen-dev-1');
  assert.equal(names.user, 'dev-1');
  assert.equal(names.secret, 'dev-1-s3');
  assert.equal(names.policyName, 'offscreen-dev-1-dev-1-readwrite');
  const plan = planDevS3Tenant('dev-1');
  assert.equal(plan.readOnly, true);
  assert.equal(JSON.stringify(plan).includes('secret-access-key'), false);
});

test('two tenants stay scoped and re-entry keeps the secret uid', async () => {
  const store = adapter();
  const first = await ensureDevS3Tenant({
    slotId: 'dev-1',
    authorizeLive: TOKEN,
    adapter: store,
  });
  const secondTenant = await ensureDevS3Tenant({
    slotId: 'dev-2',
    authorizeLive: TOKEN,
    adapter: store,
  });
  const again = await ensureDevS3Tenant({
    slotId: 'dev-1',
    authorizeLive: TOKEN,
    adapter: store,
  });
  assert.equal(first.ok && secondTenant.ok && again.ok, true);
  assert.equal(first.mutated, true);
  assert.equal(secondTenant.mutated, true);
  assert.equal(again.mutated, false);
  assert.equal(again.accessEvidence, 'exercised');
  assert.equal(again.retained[0].uid, first.retained[0].uid);
  assert.equal(store.state.buckets['dev-s3-proof'].owner, 'admin-d0e0666e');
  assert.equal(
    store.state.log.filter((line) => line === 'provision dev-1').length,
    1,
  );
});

test('deferred or missing HeadBucket refuses reuse instead of succeeding', async () => {
  const store = adapter();
  const names = deriveDevS3Tenant('dev-1');
  completeStore(names, store.state);
  store.readObservation = () =>
    mockObservationForStore(store.state, names, { headBucket: 'unknown' });
  store.access = () => ({ status: 'deferred' });
  const result = await ensureDevS3Tenant({
    slotId: 'dev-1',
    authorizeLive: TOKEN,
    adapter: store,
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'scope-not-enforced');
});

test('a supplied negative access check refuses instead of succeeding', async () => {
  const store = adapter();
  const names = deriveDevS3Tenant('dev-1');
  completeStore(names, store.state);
  store.access = () => ({
    ownWrite: true,
    otherWrite: true,
    adminDistributed: false,
  });
  const result = await ensureDevS3Tenant({
    slotId: 'dev-1',
    authorizeLive: TOKEN,
    adapter: store,
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'scope-not-enforced');
});

test('warm tenant reuse does not count as mutation', async () => {
  const store = adapter();
  const names = deriveDevS3Tenant('dev-1');
  const first = await ensureDevS3Tenant({
    slotId: 'dev-1',
    authorizeLive: TOKEN,
    adapter: store,
  });
  const again = await ensureDevS3Tenant({
    slotId: 'dev-1',
    authorizeLive: TOKEN,
    adapter: store,
  });
  assert.equal(first.mutated, true);
  assert.equal(again.mutated, false);
});

test('foreign objects, missing commands, partial state and probes do not continue', async () => {
  const foreign = adapter();
  foreign.state.buckets['offscreen-dev-1'] = { owner: 'other' };
  assert.equal(
    (
      await ensureDevS3Tenant({
        slotId: 'dev-1',
        authorizeLive: TOKEN,
        adapter: foreign,
      })
    ).refusals[0].id,
    'foreign-bucket',
  );
  const partial = adapter();
  partial.state.buckets['offscreen-dev-1'] = { owner: 'dev-1' };
  partial.state.secrets['dev-1-s3'] = {
    name: 'dev-1-s3',
    uid: 'kept',
    owner: 'offscreen-dev',
    accessKeyId: 'AK',
  };
  const recovered = await ensureDevS3Tenant({
    slotId: 'dev-1',
    authorizeLive: TOKEN,
    adapter: partial,
  });
  assert.equal(recovered.refusals[0].id, 'partial-secret');
  assert.equal(partial.state.log.length, 0);
  const missing = adapter();
  missing.identity = () => ({ ...host(), commands: ['s3.bucket.create'] });
  assert.equal(
    (
      await ensureDevS3Tenant({
        slotId: 'dev-1',
        authorizeLive: TOKEN,
        adapter: missing,
      })
    ).refusals[0].id,
    'weed-command-missing',
  );
  assert.equal(
    (
      await ensureDevS3Tenant({
        slotId: 'dev-1',
        authorizeLive: TOKEN,
        adapter: { injectedProbe: true },
      })
    ).refusals[0].id,
    'injected-probe',
  );
});

test('orphan policy inventory refuses without writes', async () => {
  const store = adapter();
  const names = deriveDevS3Tenant('dev-1');
  store.readObservation = () =>
    mockObservationForStore(store.state, names, {
      policyInventory: [names.policyName],
      policyDocument: expectedTenantPolicy(names.bucket),
      headBucket: null,
    });
  const result = await ensureDevS3Tenant({
    slotId: 'dev-1',
    authorizeLive: TOKEN,
    adapter: store,
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(result.refusals[0].id, 'tenant-refused');
  assert.equal(store.state.log.length, 0);
});

test('wrong access key refuses reuse', async () => {
  const store = adapter();
  const names = deriveDevS3Tenant('dev-1');
  completeStore(names, store.state);
  store.state.secrets[names.secret].accessKeyId = 'AK-WRONG';
  const result = await ensureDevS3Tenant({
    slotId: 'dev-1',
    authorizeLive: TOKEN,
    adapter: store,
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'tenant-refused');
  assert.equal(result.mutated, false);
});

test('dev-10 policy name does not satisfy dev-1 tenant', () => {
  const dev1 = deriveDevS3Tenant('dev-1');
  const dev10 = deriveDevS3Tenant('dev-10');
  assert.notEqual(dev1.policyName, dev10.policyName);
  assert.equal(dev1.policyName, 'offscreen-dev-1-dev-1-readwrite');
  assert.equal(dev10.policyName, 'offscreen-dev-10-dev-10-readwrite');
});
