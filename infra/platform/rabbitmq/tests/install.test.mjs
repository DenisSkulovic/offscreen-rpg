import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  BROKER_IMAGE,
  BROKER_NAME,
  CLIENT_USER,
  DEFINITIONS_CONFIGMAP,
  NAMESPACE,
  OPERATOR_IMAGE,
  POD_NAME,
  SECRET_NAME,
  brokerMatchesExpected,
  readDefinitionsBytes,
  readExpectedQueues,
  runRabbitmqReleaseInstall,
} from '../release-install.mjs';

const definitionsBytes = readDefinitionsBytes();
const expectedQueues = readExpectedQueues();

/** @param {Record<string, object | 'absent' | 'unreadable'>} inventory */
function inventoryRead(inventory) {
  return ({ resource, name, namespace }) => {
    const key = namespace
      ? `${resource}/${namespace}/${name}`
      : `${resource}//${name}`;
    const entry = inventory[key];
    if (entry === 'unreadable') {
      return { state: 'unreadable', reason: 'kubectl get failed' };
    }
    if (!entry || entry === 'absent') {
      return { state: 'absent' };
    }
    return { state: 'present', object: entry };
  };
}

function okBroker(overrides = {}) {
  return {
    apiVersion: 'rabbitmq.com/v1beta1',
    kind: 'RabbitmqCluster',
    metadata: { name: BROKER_NAME, namespace: NAMESPACE },
    spec: {
      replicas: 1,
      image: BROKER_IMAGE,
      persistence: { storageClassName: 'local-path', storage: '1Gi' },
    },
    status: {
      conditions: [{ type: 'AllReplicasReady', status: 'True' }],
    },
    ...overrides,
  };
}

const readyInventory = {
  'deployment/rabbitmq-system/rabbitmq-cluster-operator': {
    spec: { template: { spec: { containers: [{ image: OPERATOR_IMAGE }] } } },
  },
  'namespace//messaging': {
    metadata: {
      name: NAMESPACE,
      labels: { 'offscreen.rpg/lab': 'disposable' },
    },
  },
  [`configmap/${NAMESPACE}/${DEFINITIONS_CONFIGMAP}`]: {
    data: { 'definitions.json': definitionsBytes.toString('utf8') },
  },
  [`secret/${NAMESPACE}/${SECRET_NAME}`]: { metadata: { name: SECRET_NAME } },
  [`rabbitmqcluster/${NAMESPACE}/${BROKER_NAME}`]: okBroker(),
  [`pod/${NAMESPACE}/${POD_NAME}`]: { metadata: { name: POD_NAME } },
};

function queueStdout() {
  return {
    ok: true,
    stdout: expectedQueues
      .map((q) => `${q.name}\t${q.durable}\t${q.type}`)
      .join('\n'),
    stderr: '',
  };
}

test('reentry performs no delete and no import', async () => {
  const calls = [];
  const result = await runRabbitmqReleaseInstall({
    authorize: true,
    skipVendorVerify: true,
    readObject: inventoryRead(readyInventory),
    renderDocuments: (section) => {
      if (section === 'namespace') {
        return [{ kind: 'Namespace', metadata: { name: NAMESPACE } }];
      }
      return [
        {
          kind: 'RabbitmqCluster',
          metadata: { name: BROKER_NAME, namespace: NAMESPACE },
        },
      ];
    },
    run: (command, args, options) => {
      calls.push({ command, args, input: options?.input ?? '' });
      const joined = args.join(' ');
      if (joined.includes('list_queues')) return queueStdout();
      if (joined.includes('list_users')) {
        return { ok: true, stdout: `${CLIENT_USER}\t[administrator]\n` };
      }
      if (joined.includes('definitions import')) {
        return { ok: false, stderr: 'import should not run on reentry' };
      }
      return { ok: true, stdout: '', stderr: '' };
    },
    waitReplicas: () => true,
  });
  assert.equal(result.ok, true);
  assert.equal(
    calls.some((call) => call.args.includes('delete')),
    false,
  );
  assert.equal(
    calls.some((call) => JSON.stringify(call.args).includes('import')),
    false,
  );
  assert.equal(
    result.actions.some((action) => action.op === 'reentry-verify-queues'),
    true,
  );
  assert.equal(result.mutated, false);
});

test('bad vendor digest refuses with zero mutations', async () => {
  const calls = [];
  const result = await runRabbitmqReleaseInstall({
    authorize: true,
    verifyVendor: () => {
      throw new Error('manifest sha256 mismatch');
    },
    readObject: inventoryRead({}),
    run: (command, args) => {
      calls.push({ command, args });
      return { ok: true, stdout: '', stderr: '' };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'vendor-digest-mismatch');
  assert.equal(result.mutated, false);
  assert.equal(calls.length, 0);
});

test('foreign broker refuses', async () => {
  const inventory = {
    ...readyInventory,
    [`rabbitmqcluster/${NAMESPACE}/${BROKER_NAME}`]: okBroker({
      spec: {
        replicas: 1,
        image: 'docker.io/library/rabbitmq:3.13-management',
        persistence: { storageClassName: 'local-path', storage: '1Gi' },
      },
    }),
  };
  const calls = [];
  const result = await runRabbitmqReleaseInstall({
    authorize: true,
    skipVendorVerify: true,
    readObject: inventoryRead(inventory),
    renderDocuments: (section) =>
      section === 'namespace'
        ? [{ kind: 'Namespace', metadata: { name: NAMESPACE } }]
        : [
            {
              kind: 'RabbitmqCluster',
              metadata: { name: BROKER_NAME, namespace: NAMESPACE },
            },
          ],
    run: (command, args) => {
      calls.push({ command, args });
      return { ok: true, stdout: '', stderr: '' };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals.at(-1)?.id, 'foreign-broker');
  assert.equal(
    calls.some((call) => JSON.stringify(call.args).includes('apply')),
    false,
  );
});

test('unreadable broker read refuses without mutation', async () => {
  const inventory = {
    ...readyInventory,
    [`rabbitmqcluster/${NAMESPACE}/${BROKER_NAME}`]: 'unreadable',
  };
  const calls = [];
  const result = await runRabbitmqReleaseInstall({
    authorize: true,
    skipVendorVerify: true,
    readObject: inventoryRead(inventory),
    renderDocuments: (section) =>
      section === 'namespace'
        ? [{ kind: 'Namespace', metadata: { name: NAMESPACE } }]
        : [
            {
              kind: 'RabbitmqCluster',
              metadata: { name: BROKER_NAME, namespace: NAMESPACE },
            },
          ],
    run: (command, args) => {
      calls.push({ command, args });
      return { ok: true, stdout: '', stderr: '' };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'broker-unreadable');
  assert.equal(calls.length, 0);
});

test('missing secret when broker data exists refuses', async () => {
  const inventory = {
    ...readyInventory,
    [`secret/${NAMESPACE}/${SECRET_NAME}`]: 'absent',
  };
  const calls = [];
  const result = await runRabbitmqReleaseInstall({
    authorize: true,
    skipVendorVerify: true,
    readObject: inventoryRead(inventory),
    renderDocuments: (section) =>
      section === 'namespace'
        ? [{ kind: 'Namespace', metadata: { name: NAMESPACE } }]
        : [
            {
              kind: 'RabbitmqCluster',
              metadata: { name: BROKER_NAME, namespace: NAMESPACE },
            },
          ],
    run: (command, args) => {
      calls.push({ command, args });
      return { ok: true, stdout: '', stderr: '' };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'missing-secret-with-data');
  assert.equal(
    calls.some((call) => call.args.includes('create')),
    false,
  );
});

test('changed definitions bytes refuse with migration-needed', async () => {
  const inventory = {
    ...readyInventory,
    [`configmap/${NAMESPACE}/${DEFINITIONS_CONFIGMAP}`]: {
      data: { 'definitions.json': '{"vhosts":[], "queues":[]}' },
    },
  };
  const calls = [];
  const result = await runRabbitmqReleaseInstall({
    authorize: true,
    skipVendorVerify: true,
    readObject: inventoryRead(inventory),
    renderDocuments: (section) =>
      section === 'namespace'
        ? [{ kind: 'Namespace', metadata: { name: NAMESPACE } }]
        : [
            {
              kind: 'RabbitmqCluster',
              metadata: { name: BROKER_NAME, namespace: NAMESPACE },
            },
          ],
    run: (command, args) => {
      calls.push({ command, args });
      return { ok: true, stdout: '', stderr: '' };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'definitions-migration-needed');
  assert.equal(
    calls.some((call) => JSON.stringify(call.args).includes('apply')),
    false,
  );
});

test('failed broker webhook means no broker apply', async () => {
  const inventory = {
    ...readyInventory,
    [`rabbitmqcluster/${NAMESPACE}/${BROKER_NAME}`]: 'absent',
    [`pod/${NAMESPACE}/${POD_NAME}`]: 'absent',
  };
  const calls = [];
  const result = await runRabbitmqReleaseInstall({
    authorize: true,
    skipVendorVerify: true,
    brokerWebhookAlwaysFails: true,
    readObject: inventoryRead(inventory),
    renderDocuments: (section) =>
      section === 'namespace'
        ? [{ kind: 'Namespace', metadata: { name: NAMESPACE } }]
        : [
            {
              kind: 'RabbitmqCluster',
              metadata: { name: BROKER_NAME, namespace: NAMESPACE },
            },
          ],
    run: (command, args) => {
      calls.push({ command, args });
      return { ok: true, stdout: '', stderr: '' };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0]?.id, 'broker-webhook-failed');
  assert.equal(calls.filter((call) => call.args[0] === 'apply').length, 0);
});

test('brokerMatchesExpected accepts pinned lab broker fields', () => {
  assert.equal(brokerMatchesExpected(okBroker()), true);
  assert.equal(
    createHash('sha256').update(definitionsBytes).digest('hex').length,
    64,
  );
});


test('fresh operator installation waits for cert-manager before applying operator', async () => {
  const calls = [];
  const result = await runRabbitmqReleaseInstall({
    authorize: true,
    skipVendorVerify: true,
    readObject: inventoryRead({}),
    run(command, args) {
      calls.push(args.join(' '));
      if (args.includes('rollout') && args.includes('deployment/cert-manager-webhook')) return { ok: false };
      return { ok: true, stdout: '' };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, true);
  assert.equal(result.refusals[0].id, 'cert-manager-not-ready');
  assert.ok(calls.some(line => line.includes('certificates.cert-manager.io')));
  assert.ok(!calls.some(line => line.includes('cluster-operator-v2.23.3.yml')));
});
