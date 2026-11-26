import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFreshTenantWrites,
  classifyTenantObservation,
  deriveObjectStorageTenant,
  ensureObjectStorageTenant,
  expectedTenantPolicy,
  parsePolicyDocumentStrict,
  policyMatchesExpected,
} from '../providers/seaweedfs/provision.mjs';

function absentObservation(tenant, overrides = {}) {
  return {
    bucket: null,
    user: null,
    policyInventory: [],
    policyDocument: null,
    groupsEmpty: true,
    secret: null,
    bucketPolicies: [],
    headBucket: null,
    unreadable: false,
    ...overrides,
  };
}

function completeObservation(tenant, accessKeyId = 'AK-TEST') {
  return {
    bucket: { name: tenant.bucket, owner: tenant.user },
    user: {
      name: tenant.user,
      enabled: true,
      source: 'dynamic',
      policies: [tenant.policyName],
      actions: [],
      serviceAccounts: [],
      credentials: [{ accessKey: accessKeyId, status: 'Active' }],
    },
    policyInventory: [tenant.policyName],
    policyDocument: expectedTenantPolicy(tenant.bucket),
    groupsEmpty: true,
    secret: { name: tenant.secret, uid: 'uid-1', accessKeyId },
    bucketPolicies: [],
    headBucket: 'ok',
    unreadable: false,
  };
}

test('release tenant names match frozen contract', () => {
  const tenant = deriveObjectStorageTenant('release');
  assert.equal(tenant.bucket, 'lab-objects');
  assert.equal(tenant.user, 'release-game');
  assert.equal(tenant.secret, 'game-s3');
  assert.equal(tenant.policyName, 'lab-objects-release-game-readwrite');
  assert.equal(tenant.context, 'kind-offscreen-release');
  assert.equal(tenant.namespace, 'lab-objects');
});

test('dev-1 and dev-10 policy names do not prefix-collide', () => {
  const dev1 = deriveObjectStorageTenant('dev', 'dev-1');
  const dev10 = deriveObjectStorageTenant('dev', 'dev-10');
  assert.equal(dev1.policyName, 'offscreen-dev-1-dev-1-readwrite');
  assert.equal(dev10.policyName, 'offscreen-dev-10-dev-10-readwrite');
  assert.equal(
    policyMatchesExpected(expectedTenantPolicy(dev1.bucket), dev1.bucket),
    true,
  );
  assert.equal(
    policyMatchesExpected(expectedTenantPolicy(dev1.bucket), dev10.bucket),
    false,
  );
});

test('expectedTenantPolicy matches strict validator', () => {
  const bucket = 'offscreen-dev-1';
  const doc = expectedTenantPolicy(bucket);
  assert.equal(policyMatchesExpected(doc, bucket), true);
});

test('wildcard resource document refuses', () => {
  const bucket = 'offscreen-dev-1';
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  const wildcard = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
        Resource: `arn:aws:s3:::${bucket}*`,
      },
      {
        Effect: 'Allow',
        Action: 's3:ListBucket',
        Resource: `arn:aws:s3:::${bucket}`,
      },
    ],
  };
  assert.equal(policyMatchesExpected(wildcard, bucket), false);
  const observation = completeObservation(tenant);
  observation.policyDocument = wildcard;
  assert.equal(classifyTenantObservation(tenant, observation).state, 'refused');
});

test('all absent classifies absent', () => {
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  assert.deepEqual(
    classifyTenantObservation(tenant, absentObservation(tenant)),
    {
      state: 'absent',
      reason: 'tuple-absent',
    },
  );
});

test('complete exact tuple classifies reuse', () => {
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  assert.deepEqual(
    classifyTenantObservation(tenant, completeObservation(tenant)),
    { state: 'reuse', reason: 'tuple-exact' },
  );
});

test('wrong access key refuses reuse', () => {
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  const observation = completeObservation(tenant, 'AK-EXPECTED');
  observation.secret.accessKeyId = 'AK-OTHER';
  assert.equal(classifyTenantObservation(tenant, observation).state, 'refused');
});

test('orphan policy inventory refuses', () => {
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  const observation = absentObservation(tenant, {
    policyInventory: [tenant.policyName],
    policyDocument: expectedTenantPolicy(tenant.bucket),
  });
  assert.equal(classifyTenantObservation(tenant, observation).state, 'refused');
});

test('disabled user, groups, and service accounts refuse', () => {
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  const base = completeObservation(tenant);
  assert.equal(
    classifyTenantObservation(tenant, {
      ...base,
      user: { ...base.user, enabled: false },
    }).state,
    'refused',
  );
  assert.equal(
    classifyTenantObservation(tenant, { ...base, groupsEmpty: false }).state,
    'refused',
  );
  assert.equal(
    classifyTenantObservation(tenant, {
      ...base,
      user: { ...base.user, serviceAccounts: ['extra'] },
    }).state,
    'refused',
  );
});

test('malformed and duplicate-key policy JSON', () => {
  assert.throws(() => parsePolicyDocumentStrict('{'), /malformed/);
  assert.throws(
    () => parsePolicyDocumentStrict('{"Version":"2012-10-17","Version":"x"}'),
    /duplicate/,
  );
});

test('filtered bucket list unknown refuses writes', () => {
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  const observation = absentObservation(tenant, {
    policyInventory: [],
    bucketPolicies: [{ name: 'other-bucket', state: 'unknown' }],
  });
  assert.equal(classifyTenantObservation(tenant, observation).state, 'unknown');
});

test('headBucket denied refuses reuse', () => {
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  const observation = completeObservation(tenant);
  observation.headBucket = 'denied';
  assert.equal(classifyTenantObservation(tenant, observation).state, 'refused');
});

test('ensureObjectStorageTenant all absent calls writeFresh once', async () => {
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  let writes = 0;
  const result = await ensureObjectStorageTenant('dev', {
    authorize: true,
    slotId: 'dev-1',
    readObservation: async () => absentObservation(tenant),
    writeFresh: async () => {
      writes += 1;
      return { ok: true, mutated: true };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.mutated, true);
  assert.equal(writes, 1);
});

test('ensureObjectStorageTenant complete tuple reuses without writeFresh', async () => {
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  let writes = 0;
  const result = await ensureObjectStorageTenant('dev', {
    authorize: true,
    slotId: 'dev-1',
    readObservation: async () => completeObservation(tenant),
    writeFresh: async () => {
      writes += 1;
      return { ok: true, mutated: true };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.mutated, false);
  assert.equal(writes, 0);
});

test('ensureObjectStorageTenant refused and unknown do not write', async () => {
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  let writes = 0;
  const refused = await ensureObjectStorageTenant('dev', {
    authorize: true,
    slotId: 'dev-1',
    readObservation: async () =>
      absentObservation(tenant, {
        policyInventory: [tenant.policyName],
      }),
    writeFresh: async () => {
      writes += 1;
      return { ok: true };
    },
  });
  assert.equal(refused.ok, false);
  const unknown = await ensureObjectStorageTenant('dev', {
    authorize: true,
    slotId: 'dev-1',
    readObservation: async () =>
      absentObservation(tenant, { policyInventory: null }),
    writeFresh: async () => {
      writes += 1;
      return { ok: true };
    },
  });
  assert.equal(unknown.ok, false);
  assert.equal(writes, 0);
});

test('ensureObjectStorageTenant authorize false does not write', async () => {
  let writes = 0;
  const result = await ensureObjectStorageTenant('dev', {
    authorize: false,
    slotId: 'dev-1',
    readObservation: async () =>
      absentObservation(deriveObjectStorageTenant('dev', 'dev-1')),
    writeFresh: async () => {
      writes += 1;
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not-authorized');
  assert.equal(writes, 0);
});

test('writeFresh ambiguous does not retry', async () => {
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  let writes = 0;
  const result = await ensureObjectStorageTenant('dev', {
    authorize: true,
    slotId: 'dev-1',
    readObservation: async () => absentObservation(tenant),
    writeFresh: async () => {
      writes += 1;
      return { ambiguous: true, mutated: true };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, true);
  assert.equal(writes, 1);
});

test('buildFreshTenantWrites plans create commands without secret bytes in argv', () => {
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  const planned = buildFreshTenantWrites(tenant, {
    accessKeyId: 'AK',
    secretAccessKey: 'SK',
  });
  assert.equal(planned.commands.length, 3);
  assert.equal(planned.commands[0], `s3.bucket.create -name ${tenant.bucket}`);
  const argv = JSON.stringify(planned.commands);
  assert.equal(argv.includes('SK'), false);
  assert.equal(planned.secretStdin.includes('access-key-id'), true);
  assert.equal(planned.secretStdin.includes('SK'), true);
  assert.equal(argv.includes('iam.export'), false);
});

test('present bucket policy on inventory entry refuses reuse', () => {
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  const observation = completeObservation(tenant);
  observation.bucketPolicies = [{ name: 'other', state: 'present' }];
  assert.equal(classifyTenantObservation(tenant, observation).state, 'refused');
});

test('unreadable observation is unknown', () => {
  const tenant = deriveObjectStorageTenant('dev', 'dev-1');
  assert.equal(
    classifyTenantObservation(tenant, {
      ...absentObservation(tenant),
      unreadable: true,
    }).state,
    'unknown',
  );
});
