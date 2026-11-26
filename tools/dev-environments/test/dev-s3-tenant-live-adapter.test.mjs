import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveDevS3Tenant,
  ensureDevS3Tenant,
} from '../src/adapters/dev-s3-tenant.mjs';
import {
  WEED_BUCKET_LIST_FIXTURE,
  WEED_USER_LIST_FIXTURE,
  createDevS3LiveAdapter,
  parseCredentials,
  parseWeedBucketList,
  parseWeedPolicyInventory,
  parseWeedUserList,
  parseWeedUserShow,
} from '../src/adapters/dev-s3-tenant-live-adapter.mjs';
import { expectedTenantPolicy } from '../../../infra/platform/object-storage/providers/seaweedfs/provision.mjs';

const TOKEN = 'kind-offscreen-dev-s3-tenant-live';

test('credential lines parse the SeaweedFS provision format', () => {
  const parsed = parseCredentials(
    'Created user "dev-1"\n\nAccess Key: AKEXAMPLE\nSecret Key: SECRETVALUE\n',
  );
  assert.equal(parsed.accessKeyId, 'AKEXAMPLE');
  assert.equal(parsed.secretAccessKey, 'SECRETVALUE');
  const split = parseCredentials('Access Key: AKERR\nSecret Key: SKERR\n');
  assert.equal(split.secretAccessKey, 'SKERR');
  const exported = parseCredentials(
    'noise {"identities":[{"name":"dev-1","credentials":[{"accessKey":"AKJSON","secretKey":"SKJSON"}]}]}',
  );
  assert.equal(exported.accessKeyId, 'AKJSON');
  assert.equal(parseCredentials('Created user without keys'), null);
});

test('weed list fixtures parse exact names without prefix collision', () => {
  const buckets = parseWeedBucketList(WEED_BUCKET_LIST_FIXTURE);
  const users = parseWeedUserList(WEED_USER_LIST_FIXTURE);
  assert.deepEqual(
    buckets.map((entry) => entry.name),
    ['offscreen-dev-1', 'offscreen-dev-10'],
  );
  assert.deepEqual(users, ['dev-1', 'dev-10']);
  assert.equal(
    buckets.some((entry) => entry.name === 'offscreen-dev-1'),
    true,
  );
  assert.equal(users.includes('dev-1'), true);
});

test('unknown weed list formats refuse instead of inferring absence', () => {
  assert.throws(
    () => parseWeedBucketList(' stray-bucket\towner:dev-1\n'),
    /not recognized/,
  );
  assert.throws(() => parseWeedUserList('not json at all'), /not recognized/);
});

test('denied secret reads throw instead of implying absence', () => {
  const exec = (command, args) => {
    const joined = args.join(' ');
    if (joined.includes('--ignore-not-found')) {
      const error = new Error('s3 transport failed');
      error.code = 's3-transport-failed';
      throw error;
    }
    return '';
  };
  const adapter = createDevS3LiveAdapter({ exec });
  assert.throws(() => adapter.secret('dev-1-s3'), /s3 transport failed/);
});

test('malformed secret responses throw instead of implying absence', () => {
  const exec = (command, args) => {
    if (args.join(' ').includes('--ignore-not-found')) return '{not json';
    return '';
  };
  const adapter = createDevS3LiveAdapter({ exec });
  assert.throws(() => adapter.secret('dev-1-s3'), /malformed/);
});

test('prefix collision keeps dev-1 distinct from dev-10', () => {
  const exec = (command, args, input) => {
    if (String(input).includes('s3.bucket.list'))
      return WEED_BUCKET_LIST_FIXTURE;
    if (String(input).includes('s3.user.list')) return WEED_USER_LIST_FIXTURE;
    if (String(input).includes('s3.user.show -name dev-1')) {
      return JSON.stringify({
        name: 'dev-1',
        status: 'enabled',
        source: 'dynamic',
        policies: ['offscreen-dev-1-dev-1-readwrite'],
        credentials: [{ accessKey: 'AK1', status: 'Active' }],
      });
    }
    if (String(input).includes('s3.user.show')) return '';
    return '';
  };
  const adapter = createDevS3LiveAdapter({ exec });
  assert.equal(adapter.bucket('offscreen-dev-1')?.name, 'offscreen-dev-1');
  assert.equal(adapter.bucket('offscreen-dev-2'), null);
  assert.equal(adapter.user('dev-1')?.name, 'dev-1');
  assert.equal(adapter.user('dev-2'), null);
});

test('provision stores the secret with create and the receipt has only a uid', () => {
  const calls = [];
  const exec = (command, args, input) => {
    calls.push({ command, args, input });
    const joined = args.join(' ');
    if (String(input).includes('s3.user.provision'))
      return 'Access Key: AK\nSecret Key: SK\n';
    if (
      joined.includes('get secret dev-1-s3') &&
      joined.includes('--ignore-not-found')
    ) {
      return JSON.stringify({
        metadata: {
          name: 'dev-1-s3',
          namespace: 'offscreen-dev-objects',
          uid: 'uid-1',
          labels: {
            'offscreen.dev/owner': 'offscreen-dev',
            'offscreen.dev/slot': 'dev-1',
          },
        },
        data: { 'access-key-id': 'YWs=', 'secret-access-key': 'U0s=' },
      });
    }
    if (joined.includes('create')) {
      assert.equal(args.includes('SK'), false);
      assert.equal(String(input).includes('SK'), true);
      return '';
    }
    return '';
  };
  const adapter = createDevS3LiveAdapter({ exec });
  const created = adapter.provisionUser({
    slotId: 'dev-1',
    bucket: 'offscreen-dev-1',
    user: 'dev-1',
    secret: 'dev-1-s3',
  });
  assert.deepEqual(created, { secret: 'dev-1-s3', uid: 'uid-1' });
  assert.equal(
    calls.some((call) => call.args.includes('create')),
    true,
  );
  assert.equal(
    calls.some((call) => call.args.includes('apply')),
    false,
  );
  assert.equal(
    JSON.stringify(calls.map((call) => call.args)).includes('SK'),
    false,
  );
  assert.equal(
    JSON.stringify(calls.map((call) => call.args)).includes('iam.export'),
    false,
  );
});

test('credential create conflicts refuse with an actionable retry message', () => {
  const exec = (command, args, input) => {
    const joined = args.join(' ');
    if (String(input).includes('s3.user.provision'))
      return 'Access Key: AK\nSecret Key: SK\n';
    if (joined.includes('create')) {
      const error = new Error('s3 transport failed');
      error.code = 's3-transport-failed';
      error.stderr =
        'Error from server (AlreadyExists): secrets "dev-1-s3" already exists';
      throw error;
    }
    return '';
  };
  const adapter = createDevS3LiveAdapter({ exec });
  assert.throws(
    () =>
      adapter.provisionUser({
        slotId: 'dev-1',
        bucket: 'offscreen-dev-1',
        user: 'dev-1',
        secret: 'dev-1-s3',
      }),
    (error) => error.code === 'secret-create-conflict',
  );
});

test('existing tenant reuse retains the secret uid without recreating credentials', async () => {
  const calls = [];
  const names = deriveDevS3Tenant('dev-1');
  const policyDoc = JSON.stringify(expectedTenantPolicy(names.bucket));
  const exec = (command, args, input) => {
    calls.push({ args, input });
    const joined = args.join(' ');
    if (String(input).includes('s3.bucket.list')) {
      return ` ${names.bucket}\tsize:0\tlogical:0\tchunk:0\towner:"${names.user}"\n`;
    }
    if (String(input).includes('s3.user.list')) return JSON.stringify([{ name: names.user }]);
    if (String(input).includes(`s3.user.show -name ${names.user}`)) {
      return JSON.stringify({
        name: names.user,
        status: 'enabled',
        source: 'dynamic',
        policies: [names.policyName],
        actions: [],
        serviceAccounts: [],
        credentials: [{ accessKey: 'AK', status: 'Active' }],
      });
    }
    if (String(input).includes('s3.policy -list')) {
      return `Name: ${names.policyName}\nContent: ${policyDoc}\n---\n`;
    }
    if (String(input).includes('s3.policy -get')) return policyDoc;
    if (String(input).includes('s3.group.list')) return '[]';
    if (
      joined.includes(`get secret ${names.secret}`) &&
      joined.includes('--ignore-not-found')
    ) {
      return JSON.stringify({
        metadata: {
          name: names.secret,
          namespace: 'offscreen-dev-objects',
          uid: 'uid-kept',
          labels: {
            'offscreen.dev/owner': 'offscreen-dev',
            'offscreen.dev/slot': 'dev-1',
          },
        },
        data: { 'access-key-id': 'QUs=', 'secret-access-key': 'U0s=' },
      });
    }
    if (joined.includes('get deploy')) {
      return JSON.stringify({
        metadata: { labels: { 'offscreen.dev/owner': 'offscreen-dev' } },
        spec: {
          template: {
            spec: {
              containers: [{ image: 'docker.io/chrislusf/seaweedfs:4.54' }],
            },
          },
        },
      });
    }
    if (joined.includes('get pvc')) {
      return JSON.stringify({
        metadata: { name: 'object-store-data', uid: 'pvc-1' },
      });
    }
    if (String(input).includes('help'))
      return 's3.bucket.create s3.user.provision';
    return '';
  };
  const adapter = createDevS3LiveAdapter({
    exec,
    headBucket: () => 'ok',
    bucketPolicies: () => [],
  });
  const result = await ensureDevS3Tenant({
    slotId: 'dev-1',
    authorizeLive: TOKEN,
    adapter,
  });
  assert.equal(result.ok, true);
  assert.equal(result.mutated, false);
  assert.equal(result.accessEvidence, 'exercised');
  assert.deepEqual(result.retained, [{ name: names.secret, uid: 'uid-kept' }]);
  assert.equal(
    calls.some((call) => String(call.args).includes('create')),
    false,
  );
  assert.equal(
    calls.some((call) =>
      String(call.input ?? '').includes('s3.user.provision'),
    ),
    false,
  );
  assert.equal(JSON.stringify(result).includes('secret-access-key'), false);
});

test('live adapter access defers scope proof until an explicit trial', () => {
  const adapter = createDevS3LiveAdapter({ exec: () => '' });
  assert.deepEqual(adapter.access(), { status: 'deferred' });
});

test('partial secret state refuses before bucket creation with zero writes', async () => {
  const calls = [];
  const names = deriveDevS3Tenant('dev-1');
  const exec = (command, args, input) => {
    calls.push({ args, input });
    const joined = args.join(' ');
    if (String(input).includes('s3.bucket.list')) return '';
    if (String(input).includes('s3.user.list')) return '[]';
    if (String(input).includes('s3.user.show')) return '';
    if (String(input).includes('s3.policy -list')) return '';
    if (String(input).includes('s3.group.list')) return '[]';
    if (
      joined.includes(`get secret ${names.secret}`) &&
      joined.includes('--ignore-not-found')
    ) {
      return JSON.stringify({
        metadata: {
          name: names.secret,
          namespace: 'offscreen-dev-objects',
          uid: 'uid-partial',
          labels: {
            'offscreen.dev/owner': 'offscreen-dev',
            'offscreen.dev/slot': 'dev-1',
          },
        },
        data: { 'access-key-id': 'YWs=', 'secret-access-key': 'U0s=' },
      });
    }
    if (joined.includes('get deploy')) {
      return JSON.stringify({
        metadata: { labels: { 'offscreen.dev/owner': 'offscreen-dev' } },
        spec: {
          template: {
            spec: {
              containers: [{ image: 'docker.io/chrislusf/seaweedfs:4.54' }],
            },
          },
        },
      });
    }
    if (joined.includes('get pvc')) {
      return JSON.stringify({
        metadata: { name: 'object-store-data', uid: 'pvc-1' },
      });
    }
    if (String(input).includes('help'))
      return 's3.bucket.create s3.user.provision';
    return '';
  };
  const adapter = createDevS3LiveAdapter({ exec });
  const result = await ensureDevS3Tenant({
    slotId: 'dev-1',
    authorizeLive: TOKEN,
    adapter,
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'partial-secret');
  assert.equal(
    calls.some((call) => String(call.input ?? '').includes('s3.bucket.create')),
    false,
  );
  assert.equal(
    calls.some((call) => call.args.includes('create')),
    false,
  );
});

test('live adapter does not expose recoverUser or s3.iam.export', () => {
  const adapter = createDevS3LiveAdapter({ exec: () => '' });
  assert.equal('recoverUser' in adapter, false);
  assert.equal(typeof adapter.readObservation, 'function');
  assert.equal(adapter.bucketPolicies(), null);
});

test('user show without status or source is not treated as an enabled dynamic user', () => {
  const shown = parseWeedUserShow(
    '{"name":"dev-1","policies":["offscreen-dev-1-dev-1-readwrite"]}',
  );
  assert.equal(shown.enabled, false);
  assert.equal(shown.source, '');
  assert.equal(shown.credentials[0]?.status ?? '', '');
});

 test('missing user is established by successful inventory, never targeted NotFound', () => {
  const adapter = createDevS3LiveAdapter({ exec: (_command, _args, input) => {
    if (String(input).includes('s3.user.list')) return '[]';
    throw new Error('unexpected detail call');
  } });
  assert.equal(adapter.user('dev-1'), null);
  assert.throws(() => parseWeedUserList(''));
  assert.throws(() => parseWeedUserList('[{}]'));
});

test('policy inventory reads actual Name/Content records and rejects malformed output', () => {
  const doc = JSON.stringify(expectedTenantPolicy('offscreen-dev-1'));
  const record = `Name: offscreen-dev-1-dev-1-readwrite\nContent: ${doc}\n---\n`;
  assert.deepEqual(parseWeedPolicyInventory(record), ['offscreen-dev-1-dev-1-readwrite']);
  assert.deepEqual(parseWeedPolicyInventory(''), []);
  assert.throws(() => parseWeedPolicyInventory(record + record));
  assert.throws(() => parseWeedPolicyInventory('unexpected output'));
});
