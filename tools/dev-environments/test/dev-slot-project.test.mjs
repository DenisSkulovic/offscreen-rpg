import assert from 'node:assert/strict';
import test from 'node:test';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { DEV_CNPG_NAMESPACE } from '../../../infra/platform/postgres/dev-bootstrap.mjs';
import { DEV_S3_NAMESPACE } from '../../../infra/platform/object-storage/dev-bootstrap.mjs';
import { validateObjectStorageBinding } from '../../../infra/platform/object-storage/binding.mjs';
import {
  applyDevSlotSecret,
  assertDevSchemaProjectionProof,
  assertDevSlotProjectionRedacted,
  decodeSecretStringData,
  makeRunFromKubectl,
  projectDevSlot,
  readOwnedBackingSecret,
} from '../src/rendering/dev-slot-project.mjs';
import { readPlatformObject } from '../../../infra/platform/common/commands.mjs';
import { readPlatformProfile } from '../../../infra/platform/common/profile.mjs';

const oauth = {
  GITHUB_CLIENT_ID: 'client',
  GITHUB_CLIENT_SECRET: 'secret',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
};

const PROFILE = readPlatformProfile('dev');

/** @param {string} value */
function b64(value) {
  return Buffer.from(value).toString('base64');
}

/**
 * @param {string} slotId
 * @param {{
 *   appSecrets?: Record<string, { uid: string, labels: Record<string, string>, data?: Record<string, string> }>,
 *   namespaceAbsent?: boolean,
 *   namespaceSlot?: string | null,
 *   createFailures?: Set<string>,
 *   raceSecrets?: Record<string, { uid: string, labels: Record<string, string>, data?: Record<string, string> }>,
 *   denyRead?: Set<string>,
 *   malformed?: Set<string>,
 * }} [options]
 */
function stubKubectl(slotId, options = {}) {
  const digits = slotId.replace(/^dev-/, '');
  const runtimeRole = `dev_${digits}_run`;
  const namespace = `offscreen-${slotId}`;
  const appSecrets = { ...options.appSecrets };
  /** @type {Map<string, { metadata: object, data?: Record<string, string>, stringData?: Record<string, string> }>} */
  const created = new Map();
  /** @type {Set<string>} */
  const surfacedRaceSecrets = new Set();

  /** @type {Array<{ args: string[], input?: string }>} */
  const calls = [];

  /**
   * @param {string[]} args
   * @param {string} [input]
   */
  const kubectl = (args, input) => {
    calls.push({ args, input });
    const joined = args.join(' ');
    const key = (name) => `${namespace}/${name}`;

    if (options.denyRead?.has('namespace')) {
      throw Object.assign(new Error('denied'), {
        status: 1,
        stdout: '',
        stderr: 'forbidden',
      });
    }
    if (joined.includes('get namespace') && joined.includes(namespace)) {
      if (options.denyRead?.has('namespace-json')) {
        return '{not-json';
      }
      if (options.namespaceAbsent) {
        return '';
      }
      const slotLabel = options.namespaceSlot ?? slotId;
      return JSON.stringify({
        metadata: {
          name: namespace,
          labels: slotLabel == null ? {} : { 'offscreen.dev/slot': slotLabel },
        },
      });
    }

    if (
      joined.includes('get secret') &&
      joined.includes('-o json') &&
      joined.includes(DEV_CNPG_NAMESPACE) &&
      joined.includes(`dev-${digits}-run-auth`)
    ) {
      if (options.denyRead?.has('backing-db')) {
        throw Object.assign(new Error('denied'), {
          status: 1,
          stderr: 'forbidden',
        });
      }
      return JSON.stringify({
        metadata: {
          uid: `backing-run-${digits}`,
          name: `dev-${digits}-run-auth`,
          namespace: DEV_CNPG_NAMESPACE,
          labels: {
            'offscreen.dev/slot': slotId,
            'offscreen.dev/owner': 'offscreen-dev',
          },
        },
        data: { username: b64(runtimeRole), password: b64('pw') },
      });
    }
    if (
      joined.includes('get secret') &&
      joined.includes('-o json') &&
      joined.includes(DEV_S3_NAMESPACE) &&
      joined.includes(`dev-${digits}-s3`)
    ) {
      return JSON.stringify({
        metadata: {
          uid: `backing-s3-${digits}`,
          name: `dev-${digits}-s3`,
          namespace: DEV_S3_NAMESPACE,
          labels: {
            'offscreen.dev/slot': slotId,
            'offscreen.dev/owner': 'offscreen-dev',
          },
        },
        data: { 'access-key-id': b64('key'), 'secret-access-key': b64('sek') },
      });
    }

    for (const resourceKey of [
      key(`dev-${digits}-run-auth`),
      key(`dev-${digits}-s3`),
      key(`dev-${digits}-app`),
    ]) {
      const name = resourceKey.split('/')[1];
      if (
        !joined.includes(`-n ${namespace}`) ||
        !joined.includes('get secret') ||
        !joined.includes(name) ||
        !joined.includes('-o json')
      ) {
        continue;
      }
      if (options.denyRead?.has(name)) {
        throw Object.assign(new Error('denied'), {
          status: 1,
          stderr: 'forbidden',
        });
      }
      if (options.malformed?.has(name)) {
        return '{bad-json';
      }
      const stored = created.get(resourceKey);
      const preset =
        appSecrets[name] ??
        (surfacedRaceSecrets.has(name)
          ? options.raceSecrets?.[name]
          : undefined);
      if (stored) {
        return JSON.stringify(stored);
      }
      if (preset) {
        const encoded = {};
        for (const [k, v] of Object.entries(preset.data ?? {})) {
          encoded[k] = b64(v);
        }
        return JSON.stringify({
          metadata: { uid: preset.uid, name, namespace, labels: preset.labels },
          data: encoded,
          stringData: preset.data,
        });
      }
      return '';
    }

    if (joined.includes('create') && joined.includes('-f')) {
      const body = JSON.parse(input ?? '{}');
      const name = body.metadata?.name;
      if (options.createFailures?.has(name)) {
        if (options.raceSecrets?.[name]) {
          surfacedRaceSecrets.add(name);
        }
        throw Object.assign(new Error('exists'), {
          status: 1,
          stderr: 'AlreadyExists',
        });
      }
      created.set(key(name), {
        ...body,
        metadata: {
          ...body.metadata,
          uid: `uid-${name}`,
        },
      });
      return '';
    }
    if (joined.includes('apply') && joined.includes('-f')) {
      const body = JSON.parse(input ?? '{}');
      return JSON.stringify(body);
    }
    return '';
  };

  const run = makeRunFromKubectl(kubectl);
  const readObject = (spec) => readPlatformObject(spec, { run });
  return { kubectl, calls, namespace, digits, created, readObject };
}

/** @param {string} slotId @param {number} count */
function schemaProof(slotId, count) {
  return {
    ok: /** @type {const} */ (true),
    slotId,
    appliedMigrations: count,
    expectedMigrations: count,
  };
}

function expectedAppTokens() {
  return {
    'game-authority-service-token': Buffer.alloc(24, 1).toString('hex'),
    'game-authority-control-token': Buffer.alloc(24, 1).toString('hex'),
    'game-authority-executor-token': Buffer.alloc(24, 1).toString('hex'),
  };
}

function expectedAuthSecret(slotId) {
  return createHash('sha256')
    .update(`${oauth.BETTER_AUTH_SECRET}:${slotId}`)
    .digest('hex');
}

test('projection refuses missing selected owner before cluster mutation', () => {
  const { kubectl, calls } = stubKubectl('dev-2');
  assert.throws(
    () =>
      projectDevSlot({
        worktree: '/tmp/wt',
        registryRoot: '/tmp/reg',
        oauth,
        schemaProof: schemaProof('dev-2', 25),
        deps: { kubectl, randomBytes: () => Buffer.alloc(24, 1) },
      }),
    /selected owner is missing/,
  );
  assert.equal(calls.length, 0);
});

test('dev-2 projection uses allocator namespace and dev-2 secret names', () => {
  const { kubectl, calls, namespace } = stubKubectl('dev-2');
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: PROFILE.clusterName,
    namespace,
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  const result = projectDevSlot({
    record,
    oauth,
    schemaProof: schemaProof('dev-2', 25),
    deps: { kubectl, randomBytes: () => Buffer.alloc(24, 1) },
  });
  assert.equal(result.record.namespace, 'offscreen-dev-2');
  assert.match(
    JSON.stringify(result.documents),
    /"namespace":"offscreen-dev-2"/,
  );
  assert.match(JSON.stringify(result.documents), /dev-2-s3/);
  assert.match(JSON.stringify(result.documents), /dev-2-run-auth/);
  const secretGets = calls.filter(
    (item) => item.args.includes('get') && item.args.includes('secret'),
  );
  assert.equal(
    secretGets.some((item) => item.args.includes('dev-2-run-auth')),
    true,
  );
  assert.equal(
    secretGets.some((item) => item.args.includes('dev-2-s3')),
    true,
  );
  assert.equal(
    secretGets.some((item) => item.args.includes('dev-2-app')),
    true,
  );
  assert.equal(
    calls.some((item) => item.args.join(' ').includes('__drizzle_migrations')),
    false,
  );
  const creates = calls.filter((item) => item.args.includes('create'));
  assert.equal(creates.length, 3);
});

test('projection report omits credential material', () => {
  const { kubectl } = stubKubectl('dev-2');
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: PROFILE.clusterName,
    namespace: 'offscreen-dev-2',
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  const result = projectDevSlot({
    record,
    oauth,
    schemaProof: schemaProof('dev-2', 25),
    deps: { kubectl, randomBytes: () => Buffer.alloc(24, 1) },
  });
  assert.doesNotThrow(() => assertDevSlotProjectionRedacted(result));
  const serialized = JSON.stringify(result);
  assert.equal(
    serialized.includes(
      'postgresql://dev_2_run:pw@dev-pg-rw.offscreen-dev-postgres.svc.cluster.local:5432/dev_2',
    ),
    false,
  );
  assert.throws(
    () =>
      assertDevSlotProjectionRedacted({
        record,
        dbUid: 'db',
        s3Uid: 's3',
        appUid: 'app',
        images: {},
        documents: [
          {
            metadata: { name: 'x' },
            data: { uri: 'postgresql://role:pw@host/db' },
          },
        ],
      }),
    /projection report included a credential/,
  );
});

test('projection accepts a non-25 count when journal proof counts match', () => {
  const { kubectl } = stubKubectl('dev-2');
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: PROFILE.clusterName,
    namespace: 'offscreen-dev-2',
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  projectDevSlot({
    record,
    oauth,
    schemaProof: schemaProof('dev-2', 26),
    deps: { kubectl, randomBytes: () => Buffer.alloc(24, 1) },
  });
});

test('bad schema proof refuses before secret or workload writes', () => {
  const { kubectl, calls } = stubKubectl('dev-2');
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: PROFILE.clusterName,
    namespace: 'offscreen-dev-2',
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  const cases = [
    { proof: undefined, message: /schema proof missing/ },
    {
      proof: {
        ok: true,
        slotId: 'dev-1',
        appliedMigrations: 25,
        expectedMigrations: 25,
      },
      message: /schema proof slot/,
    },
    {
      proof: {
        ok: true,
        slotId: 'dev-2',
        appliedMigrations: 24,
        expectedMigrations: 25,
      },
      message: /schema gate 24/,
    },
    {
      proof: {
        ok: true,
        slotId: 'dev-2',
        appliedMigrations: '25',
        expectedMigrations: 25,
      },
      message: /schema proof count/,
    },
  ];
  for (const item of cases) {
    assert.throws(
      () =>
        projectDevSlot({
          record,
          oauth,
          schemaProof: item.proof,
          deps: { kubectl, randomBytes: () => Buffer.alloc(24, 1) },
        }),
      item.message,
    );
  }
  assert.equal(
    calls.some((item) => item.args.includes('apply')),
    false,
  );
  assert.equal(
    assertDevSchemaProjectionProof(record, schemaProof('dev-2', 25)),
    undefined,
  );
});

test('an existing app Secret labeled dev-1 is refused when projecting dev-2', () => {
  const { kubectl, namespace } = stubKubectl('dev-2', {
    appSecrets: {
      'dev-2-run-auth': {
        uid: 'foreign',
        labels: {
          'offscreen.dev/slot': 'dev-1',
          'offscreen.dev/owner': 'offscreen-dev',
        },
        data: {
          uri: 'postgresql://dev_2_run:pw@dev-pg-rw.offscreen-dev-postgres.svc.cluster.local:5432/dev_2',
        },
      },
    },
  });
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: PROFILE.clusterName,
    namespace,
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  assert.throws(
    () =>
      projectDevSlot({
        record,
        oauth,
        schemaProof: schemaProof('dev-2', 25),
        deps: { kubectl, randomBytes: () => Buffer.alloc(24, 1) },
      }),
    /belongs to another slot/,
  );
});

test('an existing owned app Secret is adopted without re-applying stringData', () => {
  const uri =
    'postgresql://dev_2_run:pw@dev-pg-rw.offscreen-dev-postgres.svc.cluster.local:5432/dev_2';
  const { kubectl, namespace, readObject, calls } = stubKubectl('dev-2', {
    appSecrets: {
      'dev-2-run-auth': {
        uid: 'kept-db',
        labels: {
          'offscreen.dev/slot': 'dev-2',
          'offscreen.dev/owner': 'offscreen-dev',
        },
        data: { uri },
      },
    },
  });
  const uid = applyDevSlotSecret(
    kubectl,
    namespace,
    'dev-2-run-auth',
    { uri },
    { 'offscreen.dev/slot': 'dev-2', 'offscreen.dev/owner': 'offscreen-dev' },
    { readObject },
  );
  assert.equal(uid, 'kept-db');
  assert.equal(calls.filter((item) => item.args.includes('create')).length, 0);
});

test('existing secrets with matching UIDs perform no secret writes during projection', () => {
  const uri =
    'postgresql://dev_2_run:pw@dev-pg-rw.offscreen-dev-postgres.svc.cluster.local:5432/dev_2';
  const tokens = expectedAppTokens();
  const { kubectl, calls } = stubKubectl('dev-2', {
    appSecrets: {
      'dev-2-run-auth': {
        uid: 'kept-db',
        labels: {
          'offscreen.dev/slot': 'dev-2',
          'offscreen.dev/owner': 'offscreen-dev',
        },
        data: { uri },
      },
      'dev-2-s3': {
        uid: 'kept-s3',
        labels: {
          'offscreen.dev/slot': 'dev-2',
          'offscreen.dev/owner': 'offscreen-dev',
        },
        data: { 'access-key-id': 'key', 'secret-access-key': 'sek' },
      },
      'dev-2-app': {
        uid: 'kept-app',
        labels: {
          'offscreen.dev/slot': 'dev-2',
          'offscreen.dev/owner': 'offscreen-dev',
        },
        data: {
          'better-auth-secret': expectedAuthSecret('dev-2'),
          'github-client-id': oauth.GITHUB_CLIENT_ID,
          'github-client-secret': oauth.GITHUB_CLIENT_SECRET,
          ...tokens,
        },
      },
    },
  });
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: PROFILE.clusterName,
    namespace: 'offscreen-dev-2',
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  const result = projectDevSlot({
    record,
    oauth,
    schemaProof: schemaProof('dev-2', 25),
    deps: { kubectl, randomBytes: () => Buffer.alloc(24, 1) },
  });
  assert.equal(result.dbUid, 'kept-db');
  assert.equal(calls.filter((item) => item.args.includes('create')).length, 0);
});

test('drift on projected db uri refuses with field names only', () => {
  const { kubectl, calls } = stubKubectl('dev-2', {
    appSecrets: {
      'dev-2-run-auth': {
        uid: 'kept-db',
        labels: {
          'offscreen.dev/slot': 'dev-2',
          'offscreen.dev/owner': 'offscreen-dev',
        },
        data: { uri: 'postgresql://wrong/db' },
      },
    },
  });
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: PROFILE.clusterName,
    namespace: 'offscreen-dev-2',
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  assert.throws(
    () =>
      projectDevSlot({
        record,
        oauth,
        schemaProof: schemaProof('dev-2', 25),
        deps: { kubectl, randomBytes: () => Buffer.alloc(24, 1) },
      }),
    (error) =>
      error instanceof Error &&
      /secret field mismatch: uri/.test(error.message),
  );
  assert.equal(
    calls.some((item) => item.args.includes('create')),
    false,
  );
});

test('denied projected secret read refuses as unreadable', () => {
  const { kubectl, calls } = stubKubectl('dev-2', {
    denyRead: new Set(['dev-2-run-auth']),
  });
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: PROFILE.clusterName,
    namespace: 'offscreen-dev-2',
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  assert.throws(
    () =>
      projectDevSlot({
        record,
        oauth,
        schemaProof: schemaProof('dev-2', 25),
        deps: { kubectl, randomBytes: () => Buffer.alloc(24, 1) },
      }),
    /secret dev-2-run-auth unreadable/,
  );
  assert.equal(
    calls.some((item) => item.args.includes('create')),
    false,
  );
});

test('malformed projected secret response refuses as unreadable', () => {
  const { kubectl } = stubKubectl('dev-2', {
    malformed: new Set(['dev-2-s3']),
  });
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: PROFILE.clusterName,
    namespace: 'offscreen-dev-2',
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  assert.throws(
    () =>
      projectDevSlot({
        record,
        oauth,
        schemaProof: schemaProof('dev-2', 25),
        deps: { kubectl, randomBytes: () => Buffer.alloc(24, 1) },
      }),
    /secret dev-2-s3 unreadable/,
  );
});

test('create race accepts matching re-read secret', () => {
  const uri =
    'postgresql://dev_2_run:pw@dev-pg-rw.offscreen-dev-postgres.svc.cluster.local:5432/dev_2';
  const { kubectl, namespace, readObject } = stubKubectl('dev-2', {
    raceSecrets: {
      'dev-2-run-auth': {
        uid: 'race-uid',
        labels: {
          'offscreen.dev/slot': 'dev-2',
          'offscreen.dev/owner': 'offscreen-dev',
        },
        data: { uri },
      },
    },
    createFailures: new Set(['dev-2-run-auth']),
  });
  const uid = applyDevSlotSecret(
    kubectl,
    namespace,
    'dev-2-run-auth',
    { uri },
    { 'offscreen.dev/slot': 'dev-2', 'offscreen.dev/owner': 'offscreen-dev' },
    { readObject },
  );
  assert.equal(uid, 'race-uid');
});

test('foreign namespace slot label refuses projection', () => {
  const { kubectl } = stubKubectl('dev-2', { namespaceSlot: 'dev-9' });
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: PROFILE.clusterName,
    namespace: 'offscreen-dev-2',
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  assert.throws(
    () =>
      projectDevSlot({
        record,
        oauth,
        schemaProof: schemaProof('dev-2', 25),
        deps: { kubectl, randomBytes: () => Buffer.alloc(24, 1) },
      }),
    /namespace offscreen-dev-2 belongs to another slot/,
  );
});

test('partial app secret key refuses with field name', () => {
  const auth = expectedAuthSecret('dev-2');
  const tokens = expectedAppTokens();
  delete tokens['game-authority-control-token'];
  const { kubectl } = stubKubectl('dev-2', {
    appSecrets: {
      'dev-2-app': {
        uid: 'partial',
        labels: {
          'offscreen.dev/slot': 'dev-2',
          'offscreen.dev/owner': 'offscreen-dev',
        },
        data: {
          'better-auth-secret': auth,
          'github-client-id': oauth.GITHUB_CLIENT_ID,
          'github-client-secret': oauth.GITHUB_CLIENT_SECRET,
          ...tokens,
        },
      },
    },
  });
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: PROFILE.clusterName,
    namespace: 'offscreen-dev-2',
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  assert.throws(
    () =>
      projectDevSlot({
        record,
        oauth,
        schemaProof: schemaProof('dev-2', 25),
        deps: { kubectl, randomBytes: () => Buffer.alloc(24, 1) },
      }),
    /secret field mismatch: game-authority-control-token/,
  );
});

test('deterministic app comparison preserves tokens and auth hash', () => {
  const uri =
    'postgresql://dev_2_run:pw@dev-pg-rw.offscreen-dev-postgres.svc.cluster.local:5432/dev_2';
  const tokens = expectedAppTokens();
  const { kubectl } = stubKubectl('dev-2', {
    appSecrets: {
      'dev-2-run-auth': {
        uid: 'db',
        labels: {
          'offscreen.dev/slot': 'dev-2',
          'offscreen.dev/owner': 'offscreen-dev',
        },
        data: { uri },
      },
      'dev-2-s3': {
        uid: 's3',
        labels: {
          'offscreen.dev/slot': 'dev-2',
          'offscreen.dev/owner': 'offscreen-dev',
        },
        data: { 'access-key-id': 'key', 'secret-access-key': 'sek' },
      },
      'dev-2-app': {
        uid: 'app',
        labels: {
          'offscreen.dev/slot': 'dev-2',
          'offscreen.dev/owner': 'offscreen-dev',
        },
        data: {
          'better-auth-secret': 'wrong-auth',
          'github-client-id': oauth.GITHUB_CLIENT_ID,
          'github-client-secret': oauth.GITHUB_CLIENT_SECRET,
          ...tokens,
        },
      },
    },
  });
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: PROFILE.clusterName,
    namespace: 'offscreen-dev-2',
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  assert.throws(
    () =>
      projectDevSlot({
        record,
        oauth,
        schemaProof: schemaProof('dev-2', 25),
        deps: { kubectl, randomBytes: () => Buffer.alloc(24, 1) },
      }),
    /secret field mismatch: better-auth-secret/,
  );
});

test('external objectStorage does not read the local Seaweed backing secret', () => {
  const { kubectl, calls } = stubKubectl('dev-2');
  let backingS3Reads = 0;
  const trackingRead = (kubectlFn, namespace, name, slotId, deps) => {
    if (namespace === DEV_S3_NAMESPACE) backingS3Reads += 1;
    return readOwnedBackingSecret(kubectlFn, namespace, name, slotId, deps);
  };
  const external = validateObjectStorageBinding({
    bucket: 'hosted-bucket',
    region: 'eu-west-1',
    endpoint: 'https://s3.example.com',
    forcePathStyle: false,
    credentials: { mode: 'default-chain' },
  });
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: PROFILE.clusterName,
    namespace: 'offscreen-dev-2',
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  const result = projectDevSlot({
    record,
    oauth,
    schemaProof: schemaProof('dev-2', 25),
    objectStorage: external,
    deps: {
      kubectl,
      randomBytes: () => Buffer.alloc(24, 1),
      readOwnedBackingSecret: trackingRead,
    },
  });
  assert.equal(backingS3Reads, 0);
  assert.equal(
    calls.some(
      (item) =>
        item.args.includes(DEV_S3_NAMESPACE) &&
        item.args.includes('get') &&
        item.args.includes('secret'),
    ),
    false,
  );
  assert.equal(result.s3Uid, null);
  const creates = calls.filter((item) => item.args.includes('create'));
  assert.equal(creates.length, 2);
  const docText = JSON.stringify(result.documents);
  assert.equal(docText.includes('OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID'), false);
});

test('readOwnedBackingSecret refuses unreadable backing secret', () => {
  const { kubectl, readObject } = stubKubectl('dev-2', {
    denyRead: new Set(['backing-db']),
  });
  assert.throws(
    () =>
      readOwnedBackingSecret(
        kubectl,
        DEV_CNPG_NAMESPACE,
        'dev-2-run-auth',
        'dev-2',
        { readObject },
      ),
    /backing secret dev-2-run-auth unreadable/,
  );
});

test('decodeSecretStringData maps base64 secret data', () => {
  const decoded = decodeSecretStringData({
    data: { uri: b64('postgresql://x') },
  });
  assert.equal(decoded.uri, 'postgresql://x');
});
