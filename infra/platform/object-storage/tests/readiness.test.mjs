import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEV_S3_CONTEXT,
  DEV_S3_NAMESPACE,
  DEV_S3_OWNER,
  DEV_S3_PVC,
} from '../dev-bootstrap.mjs';
import { observeObjectStorageHistory } from '../providers/seaweedfs/observe.mjs';
import { observeDevObjectStoreReady } from '../readiness.mjs';

const BASELINE_NAMESPACE = 'offscreen-dev-system';
const DEV_CLUSTER_NAME = 'offscreen-dev';
const DEPLOYMENT_NAME = 'object-store';
const WRITE_PATTERN = /\b(apply|create|delete|patch|replace)\b/i;

const NATIVE_DEV_VALUES_YAML = `mode: development
namespace: offscreen-dev-objects
storageClass: standard
image: docker.io/chrislusf/seaweedfs:4.54
`;

const HELM_HISTORY_ANNOTATIONS = {
  'meta.helm.sh/release-name': 'object-store',
  'meta.helm.sh/release-namespace': DEV_S3_NAMESPACE,
  'helm.sh/resource-policy': 'keep',
};

/**
 * @param {string} [image]
 */
function buildNativeManifest(image = 'docker.io/chrislusf/seaweedfs:4.54') {
  const docs = [
    {
      apiVersion: 'v1',
      kind: 'PersistentVolumeClaim',
      metadata: {
        name: 'object-store-data',
        namespace: DEV_S3_NAMESPACE,
        labels: {
          'offscreen.dev/owner': DEV_S3_OWNER,
          'app.kubernetes.io/managed-by': 'Helm',
        },
        annotations: { ...HELM_HISTORY_ANNOTATIONS },
      },
      spec: {
        accessModes: ['ReadWriteOnce'],
        volumeMode: 'Filesystem',
        storageClassName: 'standard',
        resources: { requests: { storage: '2Gi' } },
      },
    },
    {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: DEPLOYMENT_NAME,
        namespace: DEV_S3_NAMESPACE,
        labels: {
          'offscreen.dev/owner': DEV_S3_OWNER,
          'app.kubernetes.io/managed-by': 'Helm',
        },
        annotations: {
          'meta.helm.sh/release-name': 'object-store',
          'meta.helm.sh/release-namespace': DEV_S3_NAMESPACE,
        },
      },
      spec: {
        replicas: 1,
        strategy: { type: 'Recreate' },
        selector: { matchLabels: { app: 'object-store' } },
        template: {
          metadata: {
            labels: {
              app: 'object-store',
              'offscreen.dev/owner': DEV_S3_OWNER,
            },
          },
          spec: {
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
                image,
                imagePullPolicy: 'IfNotPresent',
                args: ['mini', '-dir=/data'],
                ports: [{ name: 's3', containerPort: 8333 }],
                env: [
                  {
                    name: 'AWS_ACCESS_KEY_ID',
                    valueFrom: {
                      secretKeyRef: {
                        name: 'object-store-s3',
                        key: 'access-key-id',
                      },
                    },
                  },
                  {
                    name: 'AWS_SECRET_ACCESS_KEY',
                    valueFrom: {
                      secretKeyRef: {
                        name: 'object-store-s3',
                        key: 'secret-access-key',
                      },
                    },
                  },
                ],
                securityContext: {
                  allowPrivilegeEscalation: false,
                  capabilities: { drop: ['ALL'] },
                },
                resources: {
                  requests: { cpu: '50m', memory: '128Mi' },
                  limits: { cpu: '500m', memory: '768Mi' },
                },
                readinessProbe: {
                  exec: {
                    command: [
                      '/bin/sh',
                      '-c',
                      'code=$(/usr/bin/curl -s -o /dev/null -w \'%{http_code}\' http://127.0.0.1:8333/); [ "$code" = "200" ] || [ "$code" = "403" ]',
                    ],
                  },
                  initialDelaySeconds: 3,
                  periodSeconds: 5,
                  timeoutSeconds: 2,
                  failureThreshold: 36,
                },
                volumeMounts: [{ name: 'data', mountPath: '/data' }],
              },
            ],
            volumes: [
              {
                name: 'data',
                persistentVolumeClaim: { claimName: 'object-store-data' },
              },
            ],
          },
        },
      },
    },
    {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: DEPLOYMENT_NAME,
        namespace: DEV_S3_NAMESPACE,
        labels: {
          'offscreen.dev/owner': DEV_S3_OWNER,
          'app.kubernetes.io/managed-by': 'Helm',
        },
        annotations: {
          'meta.helm.sh/release-name': 'object-store',
          'meta.helm.sh/release-namespace': DEV_S3_NAMESPACE,
        },
      },
      spec: {
        type: 'ClusterIP',
        selector: { app: 'object-store' },
        ports: [{ name: 's3', port: 8333, targetPort: 's3' }],
      },
    },
  ];
  return docs.map((doc) => JSON.stringify(doc)).join('\n---\n');
}

const NATIVE_DEV_MANIFEST = buildNativeManifest();

/**
 * @param {{
 *   historyAbsent?: boolean,
 *   targetNamespaceAbsent?: boolean,
 *   helmListFail?: boolean,
 *   helmListEmptyStdout?: boolean,
 *   helmListMalformed?: boolean,
 *   helmStorageNames?: string[],
 *   nativeCompatible?: boolean,
 *   revision?: number,
 *   releaseStatus?: string,
 *   manifestYaml?: string,
 *   deployReady?: boolean,
 * }} [options]
 */
function createHistoryMockRun(options = {}) {
  const {
    historyAbsent = false,
    targetNamespaceAbsent = true,
    helmListFail = false,
    helmListEmptyStdout = false,
    helmListMalformed = false,
    helmStorageNames = [],
    nativeCompatible = false,
    revision = 1,
    releaseStatus = 'deployed',
    manifestYaml = NATIVE_DEV_MANIFEST,
    deployReady = false,
  } = options;
  const calls = [];
  const deployBody = {
    metadata: {
      name: DEPLOYMENT_NAME,
      namespace: DEV_S3_NAMESPACE,
      labels: { 'offscreen.dev/owner': DEV_S3_OWNER },
    },
    status: { availableReplicas: 1, readyReplicas: 1 },
  };

  const helmRelease = [
    {
      name: DEPLOYMENT_NAME,
      namespace: DEV_S3_NAMESPACE,
      revision: String(revision),
      status: releaseStatus,
      chart: 'seaweedfs-object-store-0.1.0',
    },
  ];

  /** @type {import('../../common/commands.mjs').runPlatformCommand} */
  const run = (command, args, runOptions = {}) => {
    calls.push({ command, args, runOptions });

    if (command === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
      return { ok: true, status: 0, stdout: `${DEV_CLUSTER_NAME}\n` };
    }

    if (
      command === 'kubectl' &&
      args.includes('config') &&
      args.includes('view')
    ) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          contexts: [
            {
              name: DEV_S3_CONTEXT,
              context: { cluster: `kind-${DEV_CLUSTER_NAME}` },
            },
          ],
          clusters: [
            {
              name: `kind-${DEV_CLUSTER_NAME}`,
              cluster: { server: 'https://127.0.0.1:24443' },
            },
          ],
        }),
      };
    }

    if (command === 'kubectl' && args.includes('get')) {
      const getIndex = args.indexOf('get');
      const resource = args[getIndex + 1];
      const name =
        args[getIndex + 2] === '-n' ? args[getIndex + 4] : args[getIndex + 2];
      if (resource === 'namespace' && name === BASELINE_NAMESPACE) {
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            metadata: {
              name: BASELINE_NAMESPACE,
              uid: 'baseline-uid',
              labels: { 'offscreen.dev/owner': DEV_S3_OWNER },
            },
          }),
        };
      }
      if (resource === 'namespace' && name === DEV_S3_NAMESPACE) {
        if (targetNamespaceAbsent) {
          return { ok: true, status: 0, stdout: '' };
        }
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            metadata: { name: DEV_S3_NAMESPACE, uid: 'objects-ns-uid' },
          }),
        };
      }
      if (resource === 'secrets') {
        const items = helmStorageNames
          .filter((entry) => entry.startsWith('sh.helm.release'))
          .map((secretName) => ({ metadata: { name: secretName } }));
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({ items }),
        };
      }
      if (resource === 'configmaps') {
        const items = helmStorageNames
          .filter((entry) => !entry.startsWith('sh.helm.release'))
          .map((configName) => ({ metadata: { name: configName } }));
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({ items }),
        };
      }
      if (
        resource === 'deployment' &&
        name === DEPLOYMENT_NAME &&
        deployReady
      ) {
        return { ok: true, status: 0, stdout: JSON.stringify(deployBody) };
      }
      if (resource === 'pods' && deployReady) {
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            items: [
              {
                metadata: {
                  name: 'object-store-ready',
                  namespace: DEV_S3_NAMESPACE,
                },
                status: { phase: 'Running' },
              },
            ],
          }),
        };
      }
      return { ok: true, status: 0, stdout: '' };
    }

    if (command === 'helm' && args[0] === 'list') {
      if (helmListFail) {
        return {
          ok: false,
          status: 1,
          stdout: helmListEmptyStdout ? '' : '[]',
        };
      }
      if (helmListMalformed) {
        return { ok: true, status: 0, stdout: 'not-json' };
      }
      if (historyAbsent) {
        return { ok: true, status: 0, stdout: '[]' };
      }
      return { ok: true, status: 0, stdout: JSON.stringify(helmRelease) };
    }

    if (command === 'helm' && args[0] === 'get' && args[1] === 'values') {
      return { ok: true, status: 0, stdout: NATIVE_DEV_VALUES_YAML };
    }

    if (command === 'helm' && args[0] === 'get' && args[1] === 'manifest') {
      return { ok: true, status: 0, stdout: manifestYaml };
    }

    if (command === 'helm' && args[0] === 'template') {
      return { ok: true, status: 0, stdout: NATIVE_DEV_MANIFEST };
    }

    if (command === 'helm' && args[0] === 'version') {
      return { ok: true, status: 0, stdout: 'v3.14.0+gc9b559d\n' };
    }

    if (nativeCompatible || !historyAbsent) {
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: `unexpected: ${command}`,
      };
    }

    return { ok: false, status: 1, stdout: '', stderr: 'unexpected command' };
  };

  return { run, calls };
}

/**
 * @param {{
 *   pvcPhase?: string,
 *   availableReplicas?: number,
 *   httpCode?: string,
 *   pvcUnreadable?: boolean,
 *   pvcNonzeroJson?: boolean,
 *   foreignOwner?: boolean,
 * }} [options]
 */
function createMockRun(options = {}) {
  const {
    pvcPhase = 'Bound',
    availableReplicas = 1,
    httpCode = '403',
    pvcUnreadable = false,
    pvcNonzeroJson = false,
    foreignOwner = false,
  } = options;
  const calls = [];
  const owner = foreignOwner ? 'foreign-owner' : DEV_S3_OWNER;

  const pvcBody = {
    metadata: {
      name: DEV_S3_PVC,
      namespace: DEV_S3_NAMESPACE,
      labels: { 'offscreen.dev/owner': owner },
    },
    status: { phase: pvcPhase },
  };
  const deployBody = {
    metadata: {
      name: DEPLOYMENT_NAME,
      namespace: DEV_S3_NAMESPACE,
      labels: { 'offscreen.dev/owner': owner },
    },
    status: { availableReplicas },
  };

  /** @type {import('../../common/commands.mjs').runPlatformCommand} */
  const run = (command, args, runOptions = {}) => {
    calls.push({ command, args, runOptions });

    if (command === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
      return { ok: true, status: 0, stdout: `${DEV_CLUSTER_NAME}\n` };
    }

    if (
      command === 'kubectl' &&
      args.includes('config') &&
      args.includes('view')
    ) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          contexts: [
            {
              name: DEV_S3_CONTEXT,
              context: { cluster: `kind-${DEV_CLUSTER_NAME}` },
            },
          ],
          clusters: [
            {
              name: `kind-${DEV_CLUSTER_NAME}`,
              cluster: { server: 'https://127.0.0.1:24443' },
            },
          ],
        }),
      };
    }

    if (command === 'kubectl' && args.includes('get')) {
      const getIndex = args.indexOf('get');
      const resource = args[getIndex + 1];
      const name =
        args[getIndex + 2] === '-n' ? args[getIndex + 4] : args[getIndex + 2];
      if (resource === 'namespace' && name === BASELINE_NAMESPACE) {
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            metadata: {
              name: BASELINE_NAMESPACE,
              uid: 'baseline-uid',
              labels: { 'offscreen.dev/owner': DEV_S3_OWNER },
            },
          }),
        };
      }
      if (resource === 'persistentvolumeclaim' && name === DEV_S3_PVC) {
        if (pvcUnreadable) {
          return { ok: false, status: 1, stdout: '', stderr: 'forbidden' };
        }
        if (pvcNonzeroJson) {
          return {
            ok: false,
            status: 1,
            stdout: JSON.stringify(pvcBody),
            stderr: 'nonzero',
          };
        }
        return { ok: true, status: 0, stdout: JSON.stringify(pvcBody) };
      }
      if (resource === 'deployment' && name === DEPLOYMENT_NAME) {
        return { ok: true, status: 0, stdout: JSON.stringify(deployBody) };
      }
      return { ok: true, status: 0, stdout: '' };
    }

    if (command === 'kubectl' && args.includes('exec')) {
      return { ok: true, status: 0, stdout: httpCode, stderr: '' };
    }

    return { ok: false, status: 1, stdout: '', stderr: 'unexpected command' };
  };

  return { run, calls };
}

function assertNoWrites(calls) {
  for (const call of calls) {
    const joined = call.args.join(' ');
    assert.equal(WRITE_PATTERN.test(joined), false, joined);
  }
}

test('healthy object store observation accepts Bound, available, and HTTP 403', () => {
  const { run, calls } = createMockRun();
  const result = observeDevObjectStoreReady({ run });
  assert.equal(result.ok, true);
  assert.equal(result.s3Status, '403');
  assertNoWrites(calls);
});

test('nonzero kubectl exit with stdout still refuses unreadable PVC', () => {
  const { run, calls } = createMockRun({ pvcNonzeroJson: true });
  const result = observeDevObjectStoreReady({ run });
  assert.equal(result.ok, false);
  assert.match(result.detail ?? '', /unreadable/);
  assert.equal(
    calls.some((call) => call.args.includes('exec')),
    false,
  );
  assertNoWrites(calls);
});

test('malformed PVC absence refuses before HTTP probe', () => {
  const { run, calls } = createMockRun({ pvcPhase: 'Pending' });
  const result = observeDevObjectStoreReady({ run });
  assert.equal(result.ok, false);
  assert.match(result.detail ?? '', /HTTP-ready|Bound/);
  assertNoWrites(calls);
});

test('foreign PVC owner refuses', () => {
  const { run, calls } = createMockRun({ foreignOwner: true });
  const result = observeDevObjectStoreReady({ run });
  assert.equal(result.ok, false);
  assert.match(result.detail ?? '', /foreign ownership/);
  assertNoWrites(calls);
});

test('empty successful inventories classify object-store history absent', () => {
  const { run, calls } = createHistoryMockRun({ historyAbsent: true });
  const result = observeObjectStorageHistory('dev', { run });
  assert.equal(result.state, 'absent');
  assert.equal(result.namespace, DEV_S3_NAMESPACE);
  assertNoWrites(calls);
});

test('helm list failure classifies object-store history unknown', () => {
  const { run } = createHistoryMockRun({ helmListFail: true });
  const result = observeObjectStorageHistory('dev', { run });
  assert.equal(result.state, 'unknown');
  assert.notEqual(result.state, 'absent');
});

test('helm list empty stdout classifies object-store history unknown', () => {
  const { run } = createHistoryMockRun({
    historyAbsent: true,
    helmListFail: true,
    helmListEmptyStdout: true,
  });
  const result = observeObjectStorageHistory('dev', { run });
  assert.equal(result.state, 'unknown');
});

test('malformed helm list json classifies object-store history unknown', () => {
  const { run } = createHistoryMockRun({ helmListMalformed: true });
  const result = observeObjectStorageHistory('dev', { run });
  assert.equal(result.state, 'unknown');
});

test('helm storage secret with failed helm list is unknown', () => {
  const { run } = createHistoryMockRun({
    helmListFail: true,
    helmStorageNames: ['sh.helm.release.v1.object-store.v1'],
  });
  const result = observeObjectStorageHistory('dev', { run });
  assert.equal(result.state, 'unknown');
  assert.notEqual(result.state, 'absent');
});

test('revision 1 deployed values and manifest is native-compatible', () => {
  const { run, calls } = createHistoryMockRun({ nativeCompatible: true });
  const result = observeObjectStorageHistory('dev', { run });
  assert.equal(result.state, 'native-compatible');
  assert.equal(result.releaseName, DEPLOYMENT_NAME);
  assertNoWrites(calls);
});

test('helm revision 2 refuses native object-store history', () => {
  const { run } = createHistoryMockRun({
    nativeCompatible: true,
    revision: 2,
  });
  const result = observeObjectStorageHistory('dev', { run });
  assert.equal(result.state, 'refused');
  assert.match(result.reason, /revision/);
});

test('failed helm status refuses native object-store history', () => {
  const { run } = createHistoryMockRun({
    nativeCompatible: true,
    releaseStatus: 'failed',
  });
  const result = observeObjectStorageHistory('dev', { run });
  assert.equal(result.state, 'refused');
  assert.match(result.reason, /status/);
});

test('foreign deployment image refuses native object-store history', () => {
  const { run } = createHistoryMockRun({
    nativeCompatible: true,
    manifestYaml: buildNativeManifest('docker.io/chrislusf/seaweedfs:9.99'),
  });
  const result = observeObjectStorageHistory('dev', { run });
  assert.equal(result.state, 'refused');
  assert.match(result.reason, /manifest/i);
});

test('ready pod fixture alone does not classify absent or native history', () => {
  const { run, calls } = createHistoryMockRun({
    historyAbsent: true,
    deployReady: true,
    targetNamespaceAbsent: false,
  });
  const history = observeObjectStorageHistory('dev', { run });
  assert.equal(history.state, 'refused');
  assert.notEqual(history.state, 'absent');
  assert.notEqual(history.state, 'native-compatible');
  assert.equal(
    calls.some((call) => call.command === 'helm' && call.args[0] === 'get'),
    false,
  );
});
