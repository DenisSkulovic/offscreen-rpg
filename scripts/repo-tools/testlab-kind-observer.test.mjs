import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestlabKindObservation, refusedKindReadArgv } from './testlab-kind-observer.mjs';
import { LAB_OWNED_APP_IDENTITY } from './testlab-target-guard.mjs';

const id = LAB_OWNED_APP_IDENTITY;

function deploy(name, image) {
  return {
    metadata: { uid: `${name}-uid`, name },
    spec: {
      template: {
        spec: {
          containers: [
            {
              image,
              env: [{ name: 'OFFSCREEN_WRITER_EXECUTION_MODE', value: 'scripted-offline-lab' }],
            },
          ],
        },
      },
    },
  };
}

function pods(name, image, ready = true) {
  return {
    items: [
      {
        metadata: { name: `${name}-pod`, ownerReferences: [{ kind: 'ReplicaSet', name: `${name}-abc` }] },
        spec: { containers: [{ image, env: [{ name: 'OFFSCREEN_WRITER_EXECUTION_MODE', value: 'scripted-offline-lab' }] }] },
        status: { phase: 'Running', containerStatuses: [{ ready, image }] },
      },
    ],
  };
}

function happyExec(overrides = {}) {
  const files = {
    'namespace kube-system': { metadata: { uid: 'cluster-uid' } },
    'cluster.postgresql.cnpg.io lab-pg': { metadata: { uid: 'db-uid' }, status: { currentPrimary: 'lab-pg-1' } },
    'service lab-pg-rw': { metadata: { name: 'lab-pg-rw' } },
    'endpoints lab-pg-rw': { subsets: [{ addresses: [{ targetRef: { name: 'lab-pg-1' } }] }] },
    [`deployment ${id.gameAuthorityDeployment}`]: deploy(id.gameAuthorityDeployment, 'ga:scripted'),
    [`deployment ${id.gameExecutorDeployment}`]: deploy(id.gameExecutorDeployment, 'ex:scripted'),
    ...overrides,
  };
  return async (argv) => {
    const joined = argv.join(' ');
    if (joined === 'kind get clusters') return { code: 0, stdout: 'offscreen-lab\n' };
    if (joined === 'kubectl config current-context') return { code: 0, stdout: 'kind-offscreen-lab\n' };
    if (joined.includes('pods')) {
      const namespace = argv[argv.indexOf('-n') + 1];
      const name = namespace === id.authorityNamespace ? id.gameAuthorityDeployment : id.gameExecutorDeployment;
      return { code: 0, stdout: JSON.stringify(pods(name, namespace === id.authorityNamespace ? 'ga:scripted' : 'ex:scripted')) };
    }
    for (const [needle, value] of Object.entries(files)) {
      if (joined.includes(needle)) return { code: 0, stdout: JSON.stringify(value) };
    }
    return { code: 1, stdout: '', stderr: 'missing' };
  };
}

test('refuses mutating kubectl verbs', () => {
  assert.ok(refusedKindReadArgv(['kubectl', '--context', 'kind-offscreen-lab', 'delete', 'pod', 'x']));
});

test('positive observation reads the pinned lab', async () => {
  const result = await createTestlabKindObservation({ exec: happyExec() });
  assert.equal(result.ok, true);
  assert.equal(result.observation.cluster.uid, 'cluster-uid');
  assert.equal(result.observation.dbInstance.uid, 'db-uid');
  assert.equal(result.observation.expectedClusterUid, undefined);
});

test('negative wrong cluster name', async () => {
  const result = await createTestlabKindObservation({
    exec: async (argv) => argv.join(' ') === 'kind get clusters'
      ? { code: 0, stdout: 'other\n' }
      : happyExec()(argv),
  });
  assert.equal(result.ok, false);
  assert.equal(result.id, 'wrong-cluster-name');
});

test('negative empty endpoint', async () => {
  const result = await createTestlabKindObservation({
    exec: happyExec({
      'endpoints lab-pg-rw': { subsets: [{ addresses: [] }] },
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.id, 'ambiguous-db-endpoint');
});

test('negative provider secret ref is recorded without the secret value', async () => {
  const exec = happyExec();
  const wrapped = async (argv) => {
    const result = await exec(argv);
    if (argv.join(' ').includes(`deployment ${id.gameAuthorityDeployment}`)) {
      const body = JSON.parse(result.stdout);
      body.spec.template.spec.containers[0].env.push({
        name: 'OPENROUTER_API_KEY',
        valueFrom: { secretKeyRef: { name: 'provider', key: 'token' } },
      });
      return { code: 0, stdout: JSON.stringify(body) };
    }
    return result;
  };
  const result = await createTestlabKindObservation({ exec: wrapped });
  assert.equal(result.ok, true);
  assert.equal(result.observation.gameAuthority.env.OPENROUTER_API_KEY, 'secret-ref');
  assert.equal(JSON.stringify(result).includes('token'), false);
});

test('negative kubectl timeout', async () => {
  const result = await createTestlabKindObservation({
    exec: async () => ({ code: 1, stdout: '', stderr: '', timedOut: true }),
  });
  assert.equal(result.id, 'kind-clusters-unreadable');
});
