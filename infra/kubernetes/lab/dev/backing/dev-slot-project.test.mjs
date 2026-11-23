import assert from 'node:assert/strict';
import test from 'node:test';
import { Buffer } from 'node:buffer';
import { DEV_CNPG_NAMESPACE } from './dev-cnpg-bootstrap.mjs';
import { DEV_S3_NAMESPACE } from './dev-object-store-bootstrap.mjs';
import { applyDevSlotSecret, projectDevSlot } from './dev-slot-project.mjs';

const oauth = {
  GITHUB_CLIENT_ID: 'client',
  GITHUB_CLIENT_SECRET: 'secret',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
};

/** @param {string} value */
function b64(value) {
  return Buffer.from(value).toString('base64');
}

/**
 * @param {string} slotId
 * @param {{ appSecrets?: Record<string, { uid: string, labels: Record<string, string> }> }} options
 */
function stubKubectl(slotId, options = {}) {
  const digits = slotId.replace(/^dev-/, '');
  const database = `dev_${digits}`;
  const runtimeRole = `dev_${digits}_run`;
  const namespace = `offscreen-${slotId}`;
  const appSecrets = options.appSecrets ?? {};

  /** @type {Array<{ args: string[], input?: string }>} */
  const calls = [];

  /**
   * @param {string[]} args
   * @param {string} [input]
   */
  const kubectl = (args, input) => {
    calls.push({ args, input });
    const joined = args.join(' ');
    if (joined.includes('SELECT count(*) FROM drizzle.__drizzle_migrations')) {
      return '25\n';
    }
    if (joined.includes(`-n ${DEV_CNPG_NAMESPACE}`) && joined.includes(`-d ${database}`)) {
      return '25';
    }
    if (joined.includes(`secret dev-${digits}-run-auth`) && joined.includes('-o json') && !joined.includes(namespace)) {
      return JSON.stringify({
        metadata: {
          uid: `backing-run-${digits}`,
          name: `dev-${digits}-run-auth`,
          labels: { 'offscreen.dev/slot': slotId, 'offscreen.dev/owner': 'offscreen-dev' },
        },
        data: { username: b64(runtimeRole), password: b64('pw') },
      });
    }
    if (joined.includes(`secret dev-${digits}-s3`) && joined.includes('-o json') && joined.includes(DEV_S3_NAMESPACE)) {
      return JSON.stringify({
        metadata: {
          uid: `backing-s3-${digits}`,
          name: `dev-${digits}-s3`,
          labels: { 'offscreen.dev/slot': slotId, 'offscreen.dev/owner': 'offscreen-dev' },
        },
        data: { 'access-key-id': b64('key'), 'secret-access-key': b64('sek') },
      });
    }
    for (const [name, secret] of Object.entries(appSecrets)) {
      if (joined.includes(`-n ${namespace}`) && joined.includes(`secret ${name}`) && joined.includes('-o json')) {
        return JSON.stringify({
          metadata: { uid: secret.uid, name, labels: secret.labels },
        });
      }
    }
    if (joined.includes('jsonpath={.metadata.uid}')) {
      const match = /secret (\S+)/.exec(joined);
      return match ? `uid-${match[1]}` : 'uid-new';
    }
    if (joined.includes('apply') && joined.includes('-f')) {
      const body = JSON.parse(input ?? '{}');
      return JSON.stringify(body);
    }
    return '';
  };
  return { kubectl, calls, namespace, digits };
}

test('dev-2 projection uses allocator namespace and dev-2 secret names', () => {
  const { kubectl, calls, namespace } = stubKubectl('dev-2');
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: 'kind-offscreen-dev',
    namespace,
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  const result = projectDevSlot({
    record,
    oauth,
    deps: { kubectl, randomBytes: () => Buffer.alloc(24, 1) },
  });
  assert.equal(result.record.namespace, 'offscreen-dev-2');
  assert.match(JSON.stringify(result.documents), /"namespace":"offscreen-dev-2"/);
  assert.match(JSON.stringify(result.documents), /dev-2-s3/);
  assert.match(JSON.stringify(result.documents), /dev-2-run-auth/);
  const secretGets = calls.filter((item) => item.args.includes('get') && item.args.includes('secret'));
  assert.equal(secretGets.some((item) => item.args.includes('dev-2-run-auth')), true);
  assert.equal(secretGets.some((item) => item.args.includes('dev-2-s3')), true);
  assert.equal(secretGets.some((item) => item.args.includes('dev-2-app')), true);
  const migration = calls.find((item) => item.args.join(' ').includes('dev_2'));
  assert.ok(migration);
  assert.equal(migration.args.includes('-d'), true);
  assert.equal(migration.args[migration.args.indexOf('-d') + 1], 'dev_2');
});

test('an existing app Secret labeled dev-1 is refused when projecting dev-2', () => {
  const { kubectl, namespace } = stubKubectl('dev-2');
  const kubectlWithForeign = (args, input) => {
    const joined = args.join(' ');
    if (joined.includes(`-n ${namespace}`) && joined.includes('dev-2-run-auth') && joined.includes('-o json')) {
      return JSON.stringify({
        metadata: {
          uid: 'foreign',
          name: 'dev-2-run-auth',
          labels: { 'offscreen.dev/slot': 'dev-1', 'offscreen.dev/owner': 'offscreen-dev' },
        },
      });
    }
    return kubectl(args, input);
  };
  const record = {
    slotId: 'dev-2',
    worktreePath: '/tmp/wt-2',
    cluster: 'kind-offscreen-dev',
    namespace,
    ports: { game: 13104, control: 13105, tilt: 13106, spare: 13107 },
    processIdentity: null,
    resourceUids: {},
    lease: null,
  };
  assert.throws(
    () => projectDevSlot({
      record,
      oauth,
      deps: {
        kubectl: kubectlWithForeign,
        randomBytes: () => Buffer.alloc(24, 1),
      },
    }),
    /belongs to another slot/,
  );
});

test('an existing owned app Secret is adopted without re-applying stringData', () => {
  const { kubectl, namespace } = stubKubectl('dev-2', {
    appSecrets: {
      'dev-2-run-auth': {
        uid: 'kept-db',
        labels: { 'offscreen.dev/slot': 'dev-2', 'offscreen.dev/owner': 'offscreen-dev' },
      },
    },
  });
  const uid = applyDevSlotSecret(
    kubectl,
    namespace,
    'dev-2-run-auth',
    { uri: 'postgresql://dev_2_run:x@host/dev_2' },
    { 'offscreen.dev/slot': 'dev-2', 'offscreen.dev/owner': 'offscreen-dev' },
  );
  assert.equal(uid, 'kept-db');
});