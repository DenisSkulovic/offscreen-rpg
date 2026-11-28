import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import test from 'node:test';
import { resolveObjectStorageLockPaths } from '../providers/seaweedfs/mutation-guard.mjs';
import { RELEASE_API_PORT } from '../../../clusters/kind/manager/config.mjs';
import { RELEASE_BASELINE_NAMESPACE } from '../../common/commands.mjs';
import {
  renderPlatformDocuments,
  renderPlatformYaml,
  resolvePlatformProfilePath,
} from '../../common/render.mjs';
import { DEV_S3_PVC, DEV_S3_SECRET } from '../dev-bootstrap.mjs';
import {
  RELEASE_S3_CONTEXT,
  RELEASE_S3_NAMESPACE,
  RELEASE_S3_OWNER,
  collectReleaseObjectStorageProbe,
  ensureReleaseObjectStorageInstall,
  executeReleaseObjectStorageInstall,
} from '../release-install.mjs';
import {
  ensureObjectStorage,
  isObjectStorageMutatingInvocation,
  statusObjectStorage,
} from '../providers/seaweedfs/install.mjs';

const DEPLOYMENT_NAME = 'object-store';
function loadNativeProfileValuesYaml(profileId) {
  const overlay = parse(
    readFileSync(
      resolvePlatformProfilePath('object-storage', profileId),
      'utf8',
    ),
  );
  return stringify(overlay);
}

const RELEASE_VALUES_YAML = loadNativeProfileValuesYaml('release');
const RELEASE_MANIFEST_YAML = renderPlatformYaml(
  renderPlatformDocuments({
    service: 'object-storage',
    profile: 'release',
    section: 'workloads',
  }),
);

/**
 * @param {string} contextName
 */
function buildMinifiedKubeConfig(contextName) {
  return {
    contexts: [
      { name: contextName, context: { cluster: 'kind-offscreen-release' } },
    ],
    clusters: [
      {
        name: 'kind-offscreen-release',
        cluster: { server: `https://127.0.0.1:${RELEASE_API_PORT}` },
      },
    ],
  };
}

/**
 * @param {object} options
 */
function buildReleaseChainState(options = {}) {
  const uids = {
    kubeSystem: 'uid-kube-system',
    namespace: 'uid-ns',
    deployment: 'uid-deploy',
    replicaSet: 'uid-rs',
    pod: 'uid-pod',
    pvc: 'uid-pvc',
    pv: 'uid-pv',
    ...options.uids,
  };
  const mode = options.mode ?? 'native';
  const env = [
    {
      name: 'AWS_ACCESS_KEY_ID',
      valueFrom: {
        secretKeyRef: { name: 'object-store-s3', key: 'access-key-id' },
      },
    },
    {
      name: 'AWS_SECRET_ACCESS_KEY',
      valueFrom: {
        secretKeyRef: { name: 'object-store-s3', key: 'secret-access-key' },
      },
    },
  ];
  if (mode === 'legacy-release') {
    env.push({ name: 'S3_BUCKET', value: 'lab-objects' });
  }
  const hostPath =
    '/opt/local-path-provisioner/pvc-e67c2f18-205f-41ff-95cb-b37026f567e3_lab-objects_object-store-data';
  const mountinfo = `99 1 0:1 ${hostPath} / rw rw - ext4 /dev/sda1 rw\n99 2 0:2 ${hostPath} /data rw rw - ext4 /dev/sda1 rw`;
  const podSpec = {
    automountServiceAccountToken: false,
    enableServiceLinks: false,
    securityContext: {
      runAsNonRoot: true,
      runAsUser: 1000,
      runAsGroup: 1000,
      fsGroup: 1000,
      seccompProfile: { type: 'RuntimeDefault' },
    },
    containers: [
      {
        name: 'seaweedfs',
        image: 'docker.io/chrislusf/seaweedfs:4.54',
        args: ['mini', '-dir=/data'],
        ports: [{ name: 's3', containerPort: 8333, protocol: 'TCP' }],
        env,
        securityContext: {
          allowPrivilegeEscalation: false,
          capabilities: { drop: ['ALL'] },
        },
        resources: {
          requests: { cpu: '50m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '768Mi' },
        },
        volumeMounts: [{ name: 'data', mountPath: '/data' }],
      },
    ],
    volumes: [
      {
        name: 'data',
        persistentVolumeClaim: { claimName: DEV_S3_PVC },
      },
    ],
  };

  return {
    namespace: RELEASE_S3_NAMESPACE,
    deployment: {
      metadata: {
        name: DEPLOYMENT_NAME,
        namespace: RELEASE_S3_NAMESPACE,
        uid: uids.deployment,
        generation: 2,
        labels: { app: 'object-store', 'offscreen.rpg/lab': RELEASE_S3_OWNER },
      },
      spec: {
        replicas: 1,
        strategy: { type: 'Recreate' },
        selector: { matchLabels: { app: 'object-store' } },
        template: {
          metadata: {
            labels: {
              app: 'object-store',
              'offscreen.rpg/lab': RELEASE_S3_OWNER,
            },
          },
          spec: podSpec,
        },
      },
      status: {
        observedGeneration: 2,
        availableReplicas: 1,
        readyReplicas: 1,
      },
    },
    replicaSet: {
      metadata: {
        name: 'object-store-rs',
        namespace: RELEASE_S3_NAMESPACE,
        uid: uids.replicaSet,
        labels: { app: 'object-store' },
        ownerReferences: [
          {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            name: DEPLOYMENT_NAME,
            uid: uids.deployment,
            controller: true,
          },
        ],
      },
      status: { readyReplicas: 1 },
    },
    pod: {
      metadata: {
        name: 'object-store-pod',
        namespace: RELEASE_S3_NAMESPACE,
        uid: uids.pod,
        ownerReferences: [
          {
            apiVersion: 'apps/v1',
            kind: 'ReplicaSet',
            name: 'object-store-rs',
            uid: uids.replicaSet,
            controller: true,
          },
        ],
      },
      spec: podSpec,
      status: {
        phase: 'Running',
        podIP: '10.42.0.55',
        conditions: [{ type: 'Ready', status: 'True' }],
      },
    },
    service: {
      metadata: {
        name: DEPLOYMENT_NAME,
        namespace: RELEASE_S3_NAMESPACE,
        labels: { app: 'object-store', 'offscreen.rpg/lab': RELEASE_S3_OWNER },
      },
      spec: {
        type: 'ClusterIP',
        selector: { app: 'object-store' },
        ports: [{ name: 's3', port: 8333, targetPort: 's3' }],
      },
    },
    endpointSlice: {
      metadata: {
        name: 'object-store-slice',
        namespace: RELEASE_S3_NAMESPACE,
        labels: { 'kubernetes.io/service-name': 'object-store' },
      },
      endpoints: [
        {
          addresses: ['10.42.0.55'],
          conditions: { ready: true, serving: true, terminating: false },
          targetRef: {
            kind: 'Pod',
            name: 'object-store-pod',
            uid: uids.pod,
          },
        },
      ],
    },
    pvc: {
      metadata: {
        name: DEV_S3_PVC,
        namespace: RELEASE_S3_NAMESPACE,
        uid: uids.pvc,
        labels: { app: 'object-store', 'offscreen.rpg/lab': RELEASE_S3_OWNER },
      },
      spec: {
        accessModes: ['ReadWriteOnce'],
        volumeMode: 'Filesystem',
        storageClassName: 'local-path',
        resources: { requests: { storage: '2Gi' } },
        volumeName: 'pv-uid-pv',
      },
      status: { phase: 'Bound' },
    },
    pv: {
      metadata: { name: 'pv-uid-pv', uid: uids.pv },
      spec: {
        capacity: { storage: '2Gi' },
        accessModes: ['ReadWriteOnce'],
        volumeMode: 'Filesystem',
        hostPath: { path: hostPath },
        claimRef: {
          namespace: RELEASE_S3_NAMESPACE,
          name: DEV_S3_PVC,
          uid: uids.pvc,
        },
      },
      status: { phase: 'Bound' },
    },
    secret: {
      metadata: {
        name: DEV_S3_SECRET,
        namespace: RELEASE_S3_NAMESPACE,
        labels: options.unlabeledSecret
          ? {}
          : { app: 'object-store', 'offscreen.rpg/lab': RELEASE_S3_OWNER },
      },
      data: {
        'access-key-id': 'c3VwZXItc2VjcmV0',
        'secret-access-key': 'c3VwZXItc2VjcmV0',
      },
    },
    kubeSystem: {
      metadata: { name: 'kube-system', uid: uids.kubeSystem },
    },
    targetNamespace: {
      metadata: { name: RELEASE_S3_NAMESPACE, uid: uids.namespace },
    },
    mountinfo,
    pvName: 'pv-uid-pv',
  };
}

/**
 * @param {string[]} args
 * @param {ReturnType<typeof buildReleaseChainState>} chain
 */
function answerChainKubectl(args, chain) {
  const getIndex = args.indexOf('get');
  if (getIndex < 0) {
    return null;
  }
  const resource = args[getIndex + 1];
  const name =
    args[getIndex + 2] === '-n' ? args[getIndex + 4] : args[getIndex + 2];
  if (resource === 'namespace' && name === 'kube-system') {
    return { ok: true, status: 0, stdout: JSON.stringify(chain.kubeSystem) };
  }
  if (resource === 'namespace' && name === RELEASE_S3_NAMESPACE) {
    return {
      ok: true,
      status: 0,
      stdout: JSON.stringify(chain.targetNamespace),
    };
  }
  if (resource === 'namespace' && name === RELEASE_BASELINE_NAMESPACE) {
    return {
      ok: true,
      status: 0,
      stdout: JSON.stringify({
        metadata: {
          name: RELEASE_BASELINE_NAMESPACE,
          uid: 'release-baseline-uid',
          labels: { 'offscreen.rpg/lab': RELEASE_S3_OWNER },
        },
      }),
    };
  }
  if (resource === 'deployment' && name === DEPLOYMENT_NAME) {
    return { ok: true, status: 0, stdout: JSON.stringify(chain.deployment) };
  }
  if (resource === 'replicaset') {
    return {
      ok: true,
      status: 0,
      stdout: JSON.stringify({ items: [chain.replicaSet] }),
    };
  }
  if (resource === 'pods') {
    return {
      ok: true,
      status: 0,
      stdout: JSON.stringify({ items: [chain.pod] }),
    };
  }
  if (resource === 'service' && name === DEPLOYMENT_NAME) {
    return { ok: true, status: 0, stdout: JSON.stringify(chain.service) };
  }
  if (resource === 'endpointslices.discovery.k8s.io') {
    return {
      ok: true,
      status: 0,
      stdout: JSON.stringify({ items: [chain.endpointSlice] }),
    };
  }
  if (resource === 'pvc' && name === DEV_S3_PVC) {
    return { ok: true, status: 0, stdout: JSON.stringify(chain.pvc) };
  }
  if (resource === 'pv' && name === chain.pvName) {
    return { ok: true, status: 0, stdout: JSON.stringify(chain.pv) };
  }
  if (resource === 'secret' && name === DEV_S3_SECRET) {
    return { ok: true, status: 0, stdout: JSON.stringify(chain.secret) };
  }
  return null;
}

/**
 * @param {object} [options]
 */
function createReleaseObserveRun(options = {}) {
  const {
    historyAbsent = false,
    targetNamespaceAbsent = true,
    nativeCompatible = false,
    chainEnabled = false,
    chainState = buildReleaseChainState(),
    helmListFail = false,
    objectNamespacePresent = !targetNamespaceAbsent,
  } = options;
  const calls = [];
  const helmRelease = [
    {
      name: DEPLOYMENT_NAME,
      namespace: RELEASE_S3_NAMESPACE,
      revision: '1',
      status: 'deployed',
      chart: 'seaweedfs-object-store-0.1.0',
    },
  ];

  const ok = (stdout = '') => ({ ok: true, status: 0, stdout });

  /** @type {import('../../common/commands.mjs').runPlatformCommand} */
  const run = (command, args) => {
    calls.push({ command, args });

    if (command === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
      return ok('offscreen-release\n');
    }

    if (
      command === 'kubectl' &&
      args.includes('config') &&
      args.includes('view')
    ) {
      return ok(JSON.stringify(buildMinifiedKubeConfig(RELEASE_S3_CONTEXT)));
    }

    if (command === 'kubectl' && args.includes('exec') && chainEnabled) {
      return ok(chainState.mountinfo);
    }

    if (command === 'kubectl' && args.includes('get')) {
      if (chainEnabled) {
        const chainAnswer = answerChainKubectl(args, chainState);
        if (chainAnswer) {
          return chainAnswer;
        }
      }
      const getIndex = args.indexOf('get');
      const resource = args[getIndex + 1];
      const name =
        args[getIndex + 2] === '-n' ? args[getIndex + 4] : args[getIndex + 2];
      if (resource === 'namespace' && name === RELEASE_S3_NAMESPACE) {
        if (objectNamespacePresent) {
          return ok(
            JSON.stringify({
              metadata: { name: RELEASE_S3_NAMESPACE, uid: 'objects-ns-uid' },
            }),
          );
        }
        return ok('');
      }
      if (resource === 'secret' && name === DEV_S3_SECRET) {
        if (options.adminSecretPresent) {
          return ok(JSON.stringify(chainState.secret));
        }
        return ok('');
      }
      if (resource === 'secrets') {
        return ok(JSON.stringify({ items: [] }));
      }
      if (resource === 'configmaps') {
        return ok(JSON.stringify({ items: [] }));
      }
      if (resource === 'namespace' && name === RELEASE_BASELINE_NAMESPACE) {
        return ok(
          JSON.stringify({
            metadata: {
              name: RELEASE_BASELINE_NAMESPACE,
              uid: 'release-baseline-uid',
              labels: { 'offscreen.rpg/lab': RELEASE_S3_OWNER },
            },
          }),
        );
      }
      return ok('');
    }

    if (command === 'helm' && args[0] === 'list') {
      if (helmListFail) {
        return { ok: false, status: 1, stdout: '' };
      }
      if (historyAbsent) {
        return ok('[]');
      }
      return ok(JSON.stringify(helmRelease));
    }

    if (command === 'helm' && args[0] === 'get' && args[1] === 'values') {
      return ok(RELEASE_VALUES_YAML);
    }
    if (command === 'helm' && args[0] === 'get' && args[1] === 'manifest') {
      return ok(RELEASE_MANIFEST_YAML);
    }
    if (command === 'helm' && args[0] === 'template') {
      return ok(RELEASE_MANIFEST_YAML);
    }

    return ok('');
  };

  return { run, calls };
}

/**
 * @param {object} [options]
 */
function releaseGuardDeps(options = {}) {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-install-guard-'));
  const identity = {
    contextName: RELEASE_S3_CONTEXT,
    loopbackEndpoint: `127.0.0.1:${RELEASE_API_PORT}`,
    kubeSystemUid: 'kube-1',
    baselineNamespaceUid: 'base-1',
    targetNamespaceName: RELEASE_S3_NAMESPACE,
    targetNamespaceUid: null,
    targetNamespaceNonce: null,
    podName: null,
    podUid: null,
    pvcName: null,
    pvcUid: null,
    pvName: null,
    pvUid: null,
    ...options.identity,
  };
  return {
    stateRoot,
    readIdentity: async () => ({ state: 'known', identity }),
    mutationCommands: options.mutationCommands,
  };
}

/**
 * @param {{ failSecretCreate?: boolean }} [options]
 */
function installMockBin(options = {}) {
  const binDir = mkdtempSync(join(tmpdir(), 'os-install-bin-'));
  const stateFile = join(binDir, 'state.json');
  const logFile = join(binDir, 'mutations.log');
  writeFileSync(
    stateFile,
    JSON.stringify({
      namespaceCreated: false,
      secretCreated: false,
      failSecretCreate: options.failSecretCreate === true,
      helmInstalled: false,
    }),
  );
  writeFileSync(logFile, '');

  const kubectl = `#!/usr/bin/env node
import fs from 'node:fs';
const stateFile = ${JSON.stringify(stateFile)};
const logFile = ${JSON.stringify(logFile)};
const args = process.argv.slice(2);
fs.appendFileSync(logFile, JSON.stringify({ tool: 'kubectl', args }) + '\\n');
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
if (args.includes('create') && args.includes('namespace')) {
  state.namespaceCreated = true;
  fs.writeFileSync(stateFile, JSON.stringify(state));
  process.exit(0);
}
if (args.includes('create') && args.includes('-f') && args.includes('-')) {
  if (state.failSecretCreate) process.exit(1);
  state.secretCreated = true;
  fs.writeFileSync(stateFile, JSON.stringify(state));
  process.exit(0);
}
process.exit(0);
`;

  const helm = `#!/usr/bin/env node
import fs from 'node:fs';
const stateFile = ${JSON.stringify(stateFile)};
const logFile = ${JSON.stringify(logFile)};
const args = process.argv.slice(2);
fs.appendFileSync(logFile, JSON.stringify({ tool: 'helm', args }) + '\\n');
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
if (args[0] === 'install') {
  state.helmInstalled = true;
  fs.writeFileSync(stateFile, JSON.stringify(state));
}
process.exit(0);
`;

  writeFileSync(join(binDir, 'kubectl'), kubectl);
  writeFileSync(join(binDir, 'helm'), helm);
  chmodSync(join(binDir, 'kubectl'), 0o755);
  chmodSync(join(binDir, 'helm'), 0o755);

  return {
    binDir,
    stateFile,
    logFile,
    readState() {
      return JSON.parse(readFileSync(stateFile, 'utf8'));
    },
    readLog() {
      return readFileSync(logFile, 'utf8');
    },
  };
}

function assertNoMutations(calls) {
  assert.equal(
    calls.some((call) =>
      isObjectStorageMutatingInvocation(call.command, call.args),
    ),
    false,
  );
}

test('release reentry performs no kubectl writes', async () => {
  const { run, calls } = createReleaseObserveRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState: buildReleaseChainState({ mode: 'native' }),
    objectNamespacePresent: true,
  });
  const result = await ensureObjectStorage('release', { authorize: true, run });
  assert.equal(result.state, 'native-noop', result.reason);
  assert.equal(result.ok, true);
  assert.equal(result.mutated, false);
  assertNoMutations(calls);
});

test('release refuses when pvc exists without admin secret', () => {
  const { run } = createReleaseObserveRun({
    historyAbsent: true,
    targetNamespaceAbsent: false,
    objectNamespacePresent: true,
    chainEnabled: true,
    chainState: buildReleaseChainState({
      mode: 'legacy-release',
      uids: { pvc: 'uid-pvc' },
    }),
    adminSecretPresent: false,
  });
  const result = ensureReleaseObjectStorageInstall({}, { run });
  assert.equal(result.ok, false);
  assert.equal(result.state, 'refused');
});

test('unreadable release state causes no mutation', async () => {
  const { run, calls } = createReleaseObserveRun({ helmListFail: true });
  const result = await executeReleaseObjectStorageInstall({ run });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assertNoMutations(calls);
});

test('failed release secret creation does not apply workloads', async () => {
  const bin = installMockBin({ failSecretCreate: true });
  const { run } = createReleaseObserveRun({ historyAbsent: true });
  const previousPath = process.env.PATH;
  process.env.PATH = `${bin.binDir}:${process.env.PATH ?? ''}`;
  try {
    const result = await executeReleaseObjectStorageInstall({
      run,
      ...releaseGuardDeps({ mutationCommands: ['kubectl', 'helm'] }),
      generateCredentials: () => ({
        accessKeyId: 'kept-access',
        secretAccessKey: 'kept-secret',
      }),
      mutationCommands: ['kubectl', 'helm'],
    });
    assert.equal(result.ok, false);
    assert.equal(result.refusals?.[0]?.id, 'create-secret-failed');
    const log = bin.readLog();
    assert.ok(log.includes('"create"'));
    assert.equal(log.includes('install'), false);
    assert.equal(log.includes('apply'), false);
    assert.equal(log.includes('upgrade'), false);
  } finally {
    process.env.PATH = previousPath;
  }
});

test('release probe collector maps readPlatformObject shapes', () => {
  const probe = collectReleaseObjectStorageProbe({
    run(command, args) {
      const joined = args.join(' ');
      if (joined.includes('storageclass local-path')) {
        return { ok: true, stdout: 'local-path' };
      }
      return { ok: true, stdout: '' };
    },
  });
  assert.equal(probe.context, RELEASE_S3_CONTEXT);
  assert.equal(probe.storageClass, 'local-path');
});

test('fresh release creates one owned credential Secret before workloads', async () => {
  const bin = installMockBin();
  const { run } = createReleaseObserveRun({
    historyAbsent: true,
    targetNamespaceAbsent: true,
    objectNamespacePresent: false,
  });
  const previousPath = process.env.PATH;
  process.env.PATH = `${bin.binDir}:${process.env.PATH ?? ''}`;
  try {
    const result = await executeReleaseObjectStorageInstall({
      run,
      ...releaseGuardDeps(),
      mutationCommands: ['kubectl', 'helm'],
      generateCredentials: () => ({
        accessKeyId: 'fixture-access',
        secretAccessKey: 'fixture-secret',
      }),
    });
    assert.equal(result.ok, true);
    const log = bin.readLog();
    const entries = log
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const secretCreate = entries.find(
      (entry) =>
        entry.tool === 'kubectl' &&
        entry.args.includes('create') &&
        entry.args.includes('-f') &&
        entry.args.includes('-'),
    );
    const helmInstall = entries.find(
      (entry) => entry.tool === 'helm' && entry.args[0] === 'install',
    );
    assert.ok(secretCreate);
    assert.ok(helmInstall);
    assert.equal(
      secretCreate.args.includes('apply') || helmInstall.args.includes('apply'),
      false,
    );
    assert.equal(
      helmInstall.args.includes('upgrade') ||
        helmInstall.args.includes('--take-ownership'),
      false,
    );
    assert.equal(JSON.stringify(result).includes('fixture-access'), false);
    assert.equal(JSON.stringify(result).includes('fixture-secret'), false);
    assert.equal(log.includes('fixture-access'), false);
    assert.equal(log.includes('fixture-secret'), false);
    assert.equal(
      secretCreate.args.some((arg) => String(arg).includes('fixture-access')),
      false,
    );
    const state = bin.readState();
    assert.equal(state.secretCreated, true);
    assert.equal(state.helmInstalled, true);
    const secretIndex = entries.indexOf(secretCreate);
    const helmIndex = entries.indexOf(helmInstall);
    assert.ok(helmIndex > secretIndex);
  } finally {
    process.env.PATH = previousPath;
  }
});

test('legacy unlabeled Secret refuses without writes or credential rotation', async () => {
  const { run, calls } = createReleaseObserveRun({
    historyAbsent: true,
    targetNamespaceAbsent: false,
    objectNamespacePresent: true,
    chainEnabled: true,
    chainState: buildReleaseChainState({
      mode: 'legacy-release',
      unlabeledSecret: true,
    }),
    adminSecretPresent: true,
  });
  const result = await executeReleaseObjectStorageInstall({
    run,
    ...releaseGuardDeps({ mutationCommands: ['kubectl', 'helm'] }),
    mutationCommands: ['kubectl', 'helm'],
    generateCredentials() {
      assert.fail('must not generate credentials');
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(result.state, 'refused');
  assertNoMutations(calls);
});


test('metrics pending refuses status and authorized ensure without any run or write', async () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'os-install-pend-'));
  const { pending } = resolveObjectStorageLockPaths(stateRoot, 'kind-offscreen-dev');
  writeFileSync(pending, JSON.stringify({ schema: 2, operation: 'upgrade-metrics' }), {
    mode: 0o600,
  });
  const calls = [];
  const run = (...args) => {
    calls.push(args);
    throw new Error('run must not be called');
  };
  const status = statusObjectStorage('dev', { run, stateRoot });
  assert.notEqual(status.state, 'native-noop');
  assert.equal(status.historyId, undefined);
  const ensured = await ensureObjectStorage('dev', {
    run,
    stateRoot,
    authorize: true,
    generateCredentials: () => ({ accessKeyId: 'a', secretAccessKey: 'b' }),
  });
  assert.equal(ensured.ok, false);
  assert.equal(ensured.mutated, false);
  assert.equal(calls.length, 0);
});
