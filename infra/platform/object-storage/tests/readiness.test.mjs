import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEV_S3_CONTEXT,
  DEV_S3_NAMESPACE,
  DEV_S3_OWNER,
  DEV_S3_PVC,
  RELEASE_S3_NAMESPACE,
} from '../dev-bootstrap.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import { RELEASE_API_PORT } from '../../../clusters/kind/manager/config.mjs';
import { RELEASE_BASELINE_NAMESPACE } from '../../common/commands.mjs';
import {
  classifyObjectStorageObservation,
  observeObjectStorageChain,
  observeObjectStorageHistory,
} from '../providers/seaweedfs/observe.mjs';
import { observeDevObjectStoreReady } from '../readiness.mjs';

const BASELINE_NAMESPACE = 'offscreen-dev-system';
const DEV_CLUSTER_NAME = 'offscreen-dev';
const DEPLOYMENT_NAME = 'object-store';
const WRITE_PATTERN = /\b(apply|create|delete|patch|replace)\b/i;
const RELEASE_S3_CONTEXT = readPlatformProfile('release').contextName;

const CHAIN_HOST_PATH = '/var/lib/kind/offscreen/pv-uid-pv';
const CHAIN_PV_NAME = 'pv-uid-pv';
const CHAIN_POD_IP = '10.42.0.55';
const CHAIN_SECRET_VALUE = 'c3VwZXItc2VjcmV0LWJ5dGVz';

const DEFAULT_CHAIN_UIDS = {
  kubeSystem: 'uid-kube-system',
  namespace: 'uid-ns',
  deployment: 'uid-deploy',
  replicaSet: 'uid-rs',
  pod: 'uid-pod',
  pvc: 'uid-pvc',
  pv: 'uid-pv',
};

/**
 * @param {{
 *   contextName: string,
 *   namespaceUid: string,
 *   deploymentUid: string,
 *   replicaSetUid: string,
 *   podUid: string,
 *   pvcUid: string,
 *   pvUid: string,
 * }} uids
 */
function buildMatchingPriorReceipt(uids) {
  return {
    contextName: DEV_S3_CONTEXT,
    kubeSystemUid: uids.kubeSystem,
    namespaceUid: uids.namespace,
    deploymentUid: uids.deployment,
    replicaSetUid: uids.replicaSet,
    podUid: uids.pod,
    pvcUid: uids.pvc,
    pvUid: uids.pv,
  };
}

/**
 * @param {'native' | 'legacy-dev' | 'legacy-release'} mode
 */
function buildChainContainerEnv(mode) {
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
  return env;
}

/**
 * @param {object} [options]
 */
function buildChainPodSpec(options = {}) {
  const {
    mode = 'native',
    envFrom = false,
    initContainer = false,
    extraContainer = false,
    extraEnv = false,
  } = options;
  const env = buildChainContainerEnv(mode);
  if (extraEnv) {
    env.push({ name: 'S3_BUCKET', value: 'lab-objects' });
  }
  const containers = [
    {
      name: 'seaweedfs',
      image: 'docker.io/chrislusf/seaweedfs:4.54',
      args: ['mini', '-dir=/data'],
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
  ];
  if (extraContainer) {
    containers.push({ name: 'sidecar', image: 'busybox:latest' });
  }
  return {
    automountServiceAccountToken: false,
    enableServiceLinks: false,
    envFrom: envFrom ? [{ secretRef: { name: 'object-store-s3' } }] : undefined,
    securityContext: {
      runAsNonRoot: true,
      runAsUser: 1000,
      runAsGroup: 1000,
      fsGroup: 1000,
      seccompProfile: { type: 'RuntimeDefault' },
    },
    initContainers: initContainer
      ? [{ name: 'init', image: 'busybox:latest' }]
      : [],
    containers,
    volumes: [
      {
        name: 'data',
        persistentVolumeClaim: { claimName: 'object-store-data' },
      },
    ],
  };
}

/**
 * @param {string} mountRoot
 * @param {string} mountPoint
 * @param {string} options
 */
function mountinfoLine(mountRoot, mountPoint = '/data', options = 'rw') {
  return `99 1 0:1 ${mountRoot} ${mountPoint} ${options} - ext4 /dev/sda1 rw`;
}

/**
 * @param {object} [options]
 */
function buildChainState(options = {}) {
  const profileId = options.profileId ?? 'dev';
  const mode = options.mode ?? 'native';
  const uids = { ...DEFAULT_CHAIN_UIDS, ...options.uids };
  const namespace =
    profileId === 'dev' ? DEV_S3_NAMESPACE : RELEASE_S3_NAMESPACE;
  const storageClass = profileId === 'dev' ? 'standard' : 'local-path';
  const hostPath = options.hostPath ?? CHAIN_HOST_PATH;
  const pvName = options.pvName ?? CHAIN_PV_NAME;
  const podIp = options.podIp ?? CHAIN_POD_IP;
  const deploymentLabels =
    profileId === 'dev'
      ? { 'offscreen.dev/owner': DEV_S3_OWNER }
      : { app: 'object-store', 'offscreen.rpg/lab': 'disposable' };
  const podTemplateLabels =
    profileId === 'dev'
      ? { app: 'object-store', 'offscreen.dev/owner': DEV_S3_OWNER }
      : { app: 'object-store', 'offscreen.rpg/lab': 'disposable' };
  const podSpec = buildChainPodSpec({
    mode,
    envFrom: options.envFrom,
    initContainer: options.initContainer,
    extraContainer: options.extraContainer,
    extraEnv: options.extraEnv,
  });
  const pvcUid = options.pvcClaimRefUid ?? uids.pvc;
  const endpointTargetUid = options.endpointTargetUid ?? uids.pod;
  const secretKeys = options.secretKeys ?? {
    'access-key-id': CHAIN_SECRET_VALUE,
    'secret-access-key': CHAIN_SECRET_VALUE,
  };
  const mountRoot = options.mountRoot ?? hostPath;
  const mountOptions = options.mountOptions ?? 'rw';
  const mountinfo = options.onlyRootMount
    ? mountinfoLine('/', '/', mountOptions)
    : (options.mountinfo ??
      [
        mountinfoLine('/', '/', 'rw'),
        mountinfoLine(mountRoot, '/data', mountOptions),
      ].join('\n'));

  const deployment = {
    metadata: {
      name: DEPLOYMENT_NAME,
      namespace,
      uid: uids.deployment,
      generation: 2,
      labels: deploymentLabels,
    },
    spec: {
      replicas: 1,
      strategy: { type: 'Recreate' },
      selector: { matchLabels: { app: 'object-store' } },
      template: {
        metadata: { labels: podTemplateLabels },
        spec: podSpec,
      },
    },
    status: {
      observedGeneration: 2,
      readyReplicas: 1,
      availableReplicas: 1,
    },
  };

  const podOwner =
    options.podOwnerKind === 'Deployment'
      ? {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name: DEPLOYMENT_NAME,
          uid: uids.deployment,
          controller: true,
        }
      : {
          apiVersion: 'apps/v1',
          kind: 'ReplicaSet',
          name: 'object-store-rs',
          uid: uids.replicaSet,
          controller: true,
        };

  return {
    namespace,
    profileId,
    uids,
    hostPath,
    pvName,
    mountinfo,
    deployment,
    replicaSet: {
      metadata: {
        name: 'object-store-rs',
        namespace,
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
        namespace,
        uid: uids.pod,
        ownerReferences: [podOwner],
      },
      spec: podSpec,
      status: {
        phase: 'Running',
        podIP: podIp,
        conditions: [{ type: 'Ready', status: 'True' }],
      },
    },
    service: {
      metadata: { name: DEPLOYMENT_NAME, namespace },
      spec: {
        type: 'ClusterIP',
        selector: { app: 'object-store' },
        ports: [{ name: 's3', port: 8333, targetPort: 's3' }],
      },
    },
    endpointSlice: {
      metadata: {
        name: 'object-store-slice',
        namespace,
        labels: { 'kubernetes.io/service-name': 'object-store' },
      },
      endpoints: [
        {
          addresses: [podIp],
          conditions: {
            ready: options.endpointReady !== false,
            serving: options.endpointReady !== false,
            terminating: false,
          },
          targetRef: {
            kind: 'Pod',
            name: 'object-store-pod',
            uid: endpointTargetUid,
          },
        },
      ],
    },
    pvc: {
      metadata: {
        name: DEV_S3_PVC,
        namespace,
        uid: uids.pvc,
        labels: deploymentLabels,
      },
      spec: {
        accessModes: ['ReadWriteOnce'],
        volumeMode: 'Filesystem',
        storageClassName: storageClass,
        resources: { requests: { storage: '2Gi' } },
        volumeName: pvName,
      },
      status: { phase: 'Bound' },
    },
    pv: {
      metadata: { name: pvName, uid: uids.pv },
      spec: {
        capacity: { storage: '2Gi' },
        accessModes: ['ReadWriteOnce'],
        volumeMode: 'Filesystem',
        hostPath: { path: hostPath },
        claimRef: {
          namespace,
          name: DEV_S3_PVC,
          uid: pvcUid,
        },
      },
      status: { phase: 'Bound' },
    },
    secret: {
      metadata: {
        name: 'object-store-s3',
        namespace,
        labels: deploymentLabels,
      },
      data: { ...secretKeys },
    },
    kubeSystem: {
      metadata: { name: 'kube-system', uid: uids.kubeSystem },
    },
    targetNamespace: {
      metadata: { name: namespace, uid: uids.namespace },
    },
  };
}

/**
 * @param {string[]} args
 * @param {ReturnType<typeof buildChainState>} chain
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
  if (resource === 'namespace' && name === chain.namespace) {
    return {
      ok: true,
      status: 0,
      stdout: JSON.stringify(chain.targetNamespace),
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
  if (resource === 'secret' && name === 'object-store-s3') {
    return { ok: true, status: 0, stdout: JSON.stringify(chain.secret) };
  }
  return null;
}

const NATIVE_DEV_VALUES_YAML = `mode: development
namespace: offscreen-dev-objects
storageClass: standard
`;
const NATIVE_DEV_METRICS_VALUES_YAML = `${NATIVE_DEV_VALUES_YAML}metricsEnabled: true
`;
const NATIVE_CHART_ID = 'platform-object-storage-seaweedfs-0.1.0';

const HELM_HISTORY_ANNOTATIONS = {
  'meta.helm.sh/release-name': 'object-store',
  'meta.helm.sh/release-namespace': DEV_S3_NAMESPACE,
  'helm.sh/resource-policy': 'keep',
};

/**
 * @param {string} [image]
 * @param {boolean} [metrics]
 */
function buildNativeManifest(
  image = 'docker.io/chrislusf/seaweedfs:4.54',
  metrics = false,
) {
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
                args: metrics
                  ? ['mini', '-dir=/data', '-metricsPort=9327']
                  : ['mini', '-dir=/data'],
                ports: metrics
                  ? [
                      { name: 's3', containerPort: 8333 },
                      { name: 'metrics', containerPort: 9327 },
                    ]
                  : [{ name: 's3', containerPort: 8333 }],
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
        ports: metrics
          ? [
              { name: 's3', port: 8333, targetPort: 's3' },
              { name: 'metrics', port: 9327, targetPort: 'metrics' },
            ]
          : [{ name: 's3', port: 8333, targetPort: 's3' }],
      },
    },
  ];
  return docs.map((doc) => JSON.stringify(doc)).join('\n---\n');
}

const NATIVE_DEV_MANIFEST = buildNativeManifest();
const NATIVE_DEV_METRICS_MANIFEST = buildNativeManifest(
  'docker.io/chrislusf/seaweedfs:4.54',
  true,
);

/**
 * @param {number} revision
 * @param {string} status
 * @param {{ uid?: string, type?: string, labels?: object, terminating?: boolean }} [over]
 */
function buildStorageSecret(revision, status, over = {}) {
  return {
    type: over.type ?? 'helm.sh/release.v1',
    metadata: {
      name: `sh.helm.release.v1.object-store.v${revision}`,
      uid: over.uid ?? `helm-storage-uid-${revision}`,
      labels: over.labels ?? {
        owner: 'helm',
        name: 'object-store',
        version: String(revision),
        status,
      },
      ...(over.terminating
        ? { deletionTimestamp: '2026-11-28T00:00:00Z' }
        : {}),
    },
  };
}

/**
 * @param {string} contextName
 */
function buildMinifiedKubeConfig(contextName) {
  if (contextName === RELEASE_S3_CONTEXT) {
    return {
      contexts: [
        {
          name: RELEASE_S3_CONTEXT,
          context: { cluster: 'kind-offscreen-release' },
        },
      ],
      clusters: [
        {
          name: 'kind-offscreen-release',
          cluster: { server: `https://127.0.0.1:${RELEASE_API_PORT}` },
        },
      ],
    };
  }
  return {
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
  };
}

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
 *   chainEnabled?: boolean,
 *   chainState?: ReturnType<typeof buildChainState>,
 *   profileId?: 'dev' | 'release',
 *   variant?: 'base' | 'metrics' | 'upgrade',
 *   historyRows?: object[],
 *   storageSecrets?: object[],
 *   revisionValues?: Record<number, string>,
 *   revisionManifests?: Record<number, string>,
 *   listChart?: string,
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
    chainEnabled = false,
    chainState = buildChainState(),
    profileId = 'dev',
    variant = 'base',
    historyRows,
    storageSecrets,
    revisionValues = {},
    revisionManifests = {},
    listChart = NATIVE_CHART_ID,
  } = options;
  const effectiveRevision = options.revision ?? (variant === 'upgrade' ? 2 : 1);
  const variantByRevision =
    variant === 'upgrade'
      ? { 1: 'base', 2: 'metrics' }
      : { 1: variant, 2: variant };
  const defaultRows = Array.from({ length: effectiveRevision }, (_, index) => ({
    revision: index + 1,
    status: index + 1 === effectiveRevision ? 'deployed' : 'superseded',
    chart: NATIVE_CHART_ID,
  }));
  const defaultSecrets = defaultRows.map((row) =>
    buildStorageSecret(row.revision, row.status),
  );
  const profileContext =
    profileId === 'release' ? RELEASE_S3_CONTEXT : DEV_S3_CONTEXT;
  const profileCluster =
    profileId === 'release' ? 'offscreen-release' : DEV_CLUSTER_NAME;
  const objectNamespace =
    profileId === 'release' ? RELEASE_S3_NAMESPACE : DEV_S3_NAMESPACE;
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
      namespace: objectNamespace,
      revision: String(effectiveRevision),
      status: releaseStatus,
      chart: listChart,
    },
  ];

  /** @type {import('../../common/commands.mjs').runPlatformCommand} */
  const run = (command, args, runOptions = {}) => {
    calls.push({ command, args, runOptions });

    if (command === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
      return {
        ok: true,
        status: 0,
        stdout: `${DEV_CLUSTER_NAME}\noffscreen-release\n`,
      };
    }

    if (
      command === 'kubectl' &&
      args.includes('config') &&
      args.includes('view')
    ) {
      const contextIndex = args.indexOf('--context');
      const selectedContext =
        contextIndex >= 0 ? args[contextIndex + 1] : profileContext;
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify(buildMinifiedKubeConfig(selectedContext)),
      };
    }

    if (command === 'kubectl' && args.includes('exec') && chainEnabled) {
      return { ok: true, status: 0, stdout: chainState.mountinfo };
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
      if (resource === 'namespace' && name === RELEASE_BASELINE_NAMESPACE) {
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            metadata: {
              name: RELEASE_BASELINE_NAMESPACE,
              uid: 'release-baseline-uid',
              labels: { 'offscreen.rpg/lab': 'disposable' },
            },
          }),
        };
      }
      if (resource === 'namespace' && name === objectNamespace) {
        if (targetNamespaceAbsent) {
          return { ok: true, status: 0, stdout: '' };
        }
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            metadata: { name: objectNamespace, uid: 'objects-ns-uid' },
          }),
        };
      }
      if (resource === 'secrets') {
        const namedItems = helmStorageNames
          .filter((entry) => entry.startsWith('sh.helm.release'))
          .map((secretName) => ({ metadata: { name: secretName } }));
        const items =
          helmStorageNames.length > 0 || historyAbsent
            ? namedItems
            : (storageSecrets ?? defaultSecrets);
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

    if (command === 'helm' && args[0] === 'history') {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify(historyRows ?? defaultRows),
      };
    }

    const revisionIndex = args.indexOf('--revision');
    const askedRevision =
      revisionIndex >= 0 ? Number(args[revisionIndex + 1]) : effectiveRevision;
    const askedMetrics = variantByRevision[askedRevision] === 'metrics';

    if (command === 'helm' && args[0] === 'get' && args[1] === 'values') {
      return {
        ok: true,
        status: 0,
        stdout:
          revisionValues[askedRevision] ??
          (askedMetrics
            ? NATIVE_DEV_METRICS_VALUES_YAML
            : NATIVE_DEV_VALUES_YAML),
      };
    }

    if (command === 'helm' && args[0] === 'get' && args[1] === 'manifest') {
      return {
        ok: true,
        status: 0,
        stdout:
          revisionManifests[askedRevision] ??
          (options.manifestYaml
            ? manifestYaml
            : askedMetrics
              ? NATIVE_DEV_METRICS_MANIFEST
              : NATIVE_DEV_MANIFEST),
      };
    }

    if (command === 'helm' && args[0] === 'template') {
      const fixedFalse = /"metricsEnabled":false/.test(runOptions.input ?? '');
      return {
        ok: true,
        status: 0,
        stdout: fixedFalse ? NATIVE_DEV_MANIFEST : NATIVE_DEV_METRICS_MANIFEST,
      };
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
      const contextIndex = args.indexOf('--context');
      const selectedContext =
        contextIndex >= 0 ? args[contextIndex + 1] : DEV_S3_CONTEXT;
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify(buildMinifiedKubeConfig(selectedContext)),
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
  assert.equal(result.artifactId, 'dev-s3-base');
  assert.equal(result.historyId, 'dev-base-r1');
  assert.equal(result.metricsEnabled, false);
  assertNoWrites(calls);
});

const DEV_METRICS_STATES = [
  ['base', 'dev-s3-base', 'dev-base-r1', false],
  ['metrics', 'dev-s3-metrics', 'dev-metrics-r1', true],
  ['upgrade', 'dev-s3-metrics', 'dev-metrics-r1-r2', true],
];
for (const [
  variant,
  artifactId,
  historyId,
  metricsEnabled,
] of DEV_METRICS_STATES) {
  test(`exact ${variant} dev history matches ${historyId} with additive fields`, () => {
    const { run, calls } = createHistoryMockRun({ variant });
    const result = observeObjectStorageHistory('dev', { run });
    assert.equal(result.state, 'native-compatible', result.reason);
    assert.equal(result.artifactId, artifactId);
    assert.equal(result.historyId, historyId);
    assert.equal(result.metricsEnabled, metricsEnabled);
    assertNoWrites(calls);
    assert.ok(
      calls.some(
        (call) => call.command === 'helm' && call.args[0] === 'history',
      ),
    );
    const getCalls = calls.filter(
      (call) => call.command === 'helm' && call.args[0] === 'get',
    );
    assert.ok(getCalls.every((call) => call.args.includes('--revision')));
    assert.ok(
      getCalls
        .filter((call) => call.args[1] === 'values')
        .every((call) => !call.args.includes('--all')),
    );
  });
}

test('old base render uses the explicit fixed false overlay', () => {
  const { run, calls } = createHistoryMockRun({ variant: 'upgrade' });
  observeObjectStorageHistory('dev', { run });
  const templates = calls.filter(
    (call) => call.command === 'helm' && call.args[0] === 'template',
  );
  assert.equal(templates.length, 2);
  assert.ok(
    templates.some(
      (call) => call.runOptions.input === '{"metricsEnabled":false}\n',
    ),
  );
  assert.ok(templates.some((call) => call.runOptions.input == null));
});

/** @type {[string, object][]} */
const REFUSED_DEV_HISTORIES = [
  [
    'wrong retained status row',
    {
      variant: 'upgrade',
      historyRows: [
        { revision: 1, status: 'failed', chart: NATIVE_CHART_ID },
        { revision: 2, status: 'deployed', chart: NATIVE_CHART_ID },
      ],
    },
  ],
  [
    'missing retained history row',
    {
      variant: 'upgrade',
      historyRows: [
        { revision: 2, status: 'deployed', chart: NATIVE_CHART_ID },
      ],
    },
  ],
  [
    'wrong retained chart row',
    {
      variant: 'upgrade',
      historyRows: [
        { revision: 1, status: 'superseded', chart: 'other-0.1.0' },
        { revision: 2, status: 'deployed', chart: NATIVE_CHART_ID },
      ],
    },
  ],
  ['wrong list chart', { variant: 'metrics', listChart: 'other-0.1.0' }],
  [
    'missing retained storage record',
    { variant: 'upgrade', storageSecrets: [buildStorageSecret(2, 'deployed')] },
  ],
  [
    'duplicate storage UID',
    {
      variant: 'upgrade',
      storageSecrets: [
        buildStorageSecret(1, 'superseded', { uid: 'same' }),
        buildStorageSecret(2, 'deployed', { uid: 'same' }),
      ],
    },
  ],
  [
    'empty storage UID',
    {
      variant: 'metrics',
      storageSecrets: [buildStorageSecret(1, 'deployed', { uid: '' })],
    },
  ],
  [
    'terminating storage record',
    {
      variant: 'metrics',
      storageSecrets: [
        buildStorageSecret(1, 'deployed', { terminating: true }),
      ],
    },
  ],
  [
    'wrong storage type',
    {
      variant: 'metrics',
      storageSecrets: [buildStorageSecret(1, 'deployed', { type: 'Opaque' })],
    },
  ],
  [
    'wrong storage status label',
    {
      variant: 'upgrade',
      storageSecrets: [
        buildStorageSecret(1, 'deployed'),
        buildStorageSecret(2, 'deployed'),
      ],
    },
  ],
  [
    'extra storage record',
    {
      variant: 'metrics',
      storageSecrets: [
        buildStorageSecret(1, 'deployed'),
        buildStorageSecret(2, 'superseded'),
      ],
    },
  ],
  [
    'wrong retained values',
    {
      variant: 'upgrade',
      revisionValues: {
        1: NATIVE_DEV_METRICS_VALUES_YAML,
      },
    },
  ],
  [
    'extra retained value key',
    {
      variant: 'metrics',
      revisionValues: {
        1: `${NATIVE_DEV_METRICS_VALUES_YAML}extra: true\n`,
      },
    },
  ],
  [
    'wrong retained manifest',
    {
      variant: 'upgrade',
      revisionManifests: {
        1: NATIVE_DEV_METRICS_MANIFEST,
      },
    },
  ],
  [
    'target manifest with extra arg',
    {
      variant: 'metrics',
      revisionManifests: {
        1: NATIVE_DEV_METRICS_MANIFEST.replace(
          '-metricsPort=9327',
          '-metricsPort=9327","-extra=1',
        ),
      },
    },
  ],
  [
    'target manifest with wrong port',
    {
      variant: 'metrics',
      revisionManifests: {
        1: NATIVE_DEV_METRICS_MANIFEST.replaceAll('9327', '9328'),
      },
    },
  ],
  [
    'target manifest under base values',
    {
      variant: 'metrics',
      revisionValues: {
        1: NATIVE_DEV_VALUES_YAML,
      },
    },
  ],
];
for (const [label, options] of REFUSED_DEV_HISTORIES) {
  test(`dev history refuses ${label}`, () => {
    const { run } = createHistoryMockRun(options);
    const result = observeObjectStorageHistory('dev', { run });
    assert.equal(result.state, 'refused', result.reason);
    assert.equal(result.artifactId, undefined);
    assert.equal(result.historyId, undefined);
  });
}

test('dev history refuses a ConfigMap Helm storage record', () => {
  const { run } = createHistoryMockRun({
    variant: 'metrics',
    helmStorageNames: ['sh.helm.release.v1.object-store.v1'],
  });
  const result = observeObjectStorageHistory('dev', { run });
  assert.notEqual(result.state, 'native-compatible');
});

test('dev history with wrong profile values for metrics is refused', () => {
  const { run } = createHistoryMockRun({
    variant: 'metrics',
    revisionValues: {
      1: NATIVE_DEV_METRICS_VALUES_YAML.replace('standard', 'other'),
    },
  });
  assert.equal(observeObjectStorageHistory('dev', { run }).state, 'refused');
});

test('helm revision 3 refuses native object-store history', () => {
  const { run } = createHistoryMockRun({
    nativeCompatible: true,
    revision: 3,
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

test('complete native dev chain with native history is native-compatible', () => {
  const chainState = buildChainState({ profileId: 'dev', mode: 'native' });
  const { run, calls } = createHistoryMockRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState,
    targetNamespaceAbsent: false,
  });
  const result = observeObjectStorageChain('dev', { run });
  assert.equal(result.state, 'native-compatible');
  assert.equal(result.admits, false);
  assert.equal(result.continuity, 'unclaimed');
  assertNoWrites(calls);
});

test('matching prior receipt on native dev chain keeps admits false', () => {
  const chainState = buildChainState({ profileId: 'dev', mode: 'native' });
  const { run, calls } = createHistoryMockRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState,
    targetNamespaceAbsent: false,
  });
  const result = observeObjectStorageChain('dev', {
    run,
    priorReceipt: buildMatchingPriorReceipt(chainState.uids),
  });
  assert.equal(result.state, 'native-compatible');
  assert.equal(result.admits, false);
  assert.equal(result.continuity, 'matched');
  assertNoWrites(calls);
});

test('legacy dev structure without Helm release is legacy-structural', () => {
  const chainState = buildChainState({ profileId: 'dev', mode: 'legacy-dev' });
  const { run, calls } = createHistoryMockRun({
    historyAbsent: true,
    targetNamespaceAbsent: false,
    chainEnabled: true,
    chainState,
  });
  const result = observeObjectStorageChain('dev', { run });
  assert.equal(result.state, 'legacy-structural');
  assert.equal(result.admits, false);
  assert.equal(result.continuity, 'unclaimed');
  assertNoWrites(calls);
});

test('legacy release structure with S3_BUCKET and matching receipt', () => {
  const chainState = buildChainState({
    profileId: 'release',
    mode: 'legacy-release',
  });
  const receipt = {
    ...buildMatchingPriorReceipt(chainState.uids),
    contextName: RELEASE_S3_CONTEXT,
  };
  const { run, calls } = createHistoryMockRun({
    profileId: 'release',
    historyAbsent: true,
    targetNamespaceAbsent: false,
    chainEnabled: true,
    chainState,
  });
  const result = observeObjectStorageChain('release', {
    run,
    priorReceipt: receipt,
  });
  assert.equal(result.state, 'legacy-structural');
  assert.equal(result.admits, false);
  assert.equal(result.continuity, 'matched');
  assertNoWrites(calls);
});

test('prior receipt namespaceUid mismatch refuses with mismatched continuity', () => {
  const chainState = buildChainState({ profileId: 'dev', mode: 'native' });
  const { run } = createHistoryMockRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState,
    targetNamespaceAbsent: false,
  });
  const badReceipt = {
    ...buildMatchingPriorReceipt(chainState.uids),
    namespaceUid: 'wrong-ns-uid',
  };
  const result = observeObjectStorageChain('dev', {
    run,
    priorReceipt: badReceipt,
  });
  assert.equal(result.state, 'refused');
  assert.equal(result.continuity, 'mismatched');
  assert.match(result.reason, /prior identity mismatch/);
  assert.equal(result.admits, false);
});

test('PVC claimRef uid mismatch refuses live chain', () => {
  const chainState = buildChainState({
    profileId: 'dev',
    mode: 'native',
    pvcClaimRefUid: 'wrong-pvc-uid',
  });
  const { run } = createHistoryMockRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState,
    targetNamespaceAbsent: false,
  });
  const result = observeObjectStorageChain('dev', { run });
  assert.equal(result.state, 'refused');
  assert.match(result.reason, /claimRef/);
  assert.equal(result.admits, false);
});

test('mount root component suffix and octal root escapes pass mountinfo checks', () => {
  const hostPath = '/var/lib/kind/offscreen/pv uid-pv';
  const chainState = buildChainState({
    profileId: 'dev',
    mode: 'native',
    hostPath,
    mountRoot: '/var/lib/kind/offscreen/pv\\040uid-pv',
  });
  const observation = {
    history: {
      state: 'native-compatible',
      reason: 'object-store revision 1 matches native Helm history',
      releaseName: DEPLOYMENT_NAME,
      namespace: DEV_S3_NAMESPACE,
    },
    profileId: 'dev',
    contextName: DEV_S3_CONTEXT,
    namespace: DEV_S3_NAMESPACE,
    deployment: chainState.deployment,
    replicaSet: chainState.replicaSet,
    pod: chainState.pod,
    service: chainState.service,
    endpointSlice: chainState.endpointSlice,
    pvc: chainState.pvc,
    pv: chainState.pv,
    secretDataKeys: Object.keys(chainState.secret.data),
    secretLabels: chainState.secret.metadata.labels,
    mountinfo: chainState.mountinfo,
  };
  const pass = classifyObjectStorageObservation('dev', observation);
  assert.equal(pass.state, 'native-compatible');
  assert.equal(pass.admits, false);

  const suffixHost = '/var/local-path-provisioner/pvc-uid_ns_object-store-data';
  const suffixState = buildChainState({
    profileId: 'dev',
    mode: 'native',
    hostPath: suffixHost,
    mountRoot: '/local-path-provisioner/pvc-uid_ns_object-store-data',
  });
  const suffix = classifyObjectStorageObservation('dev', {
    ...observation,
    deployment: suffixState.deployment,
    replicaSet: suffixState.replicaSet,
    pod: suffixState.pod,
    pvc: suffixState.pvc,
    pv: suffixState.pv,
    mountinfo: suffixState.mountinfo,
  });
  assert.equal(suffix.state, 'native-compatible');

  const sameLeaf = classifyObjectStorageObservation('dev', {
    ...observation,
    mountinfo: [
      mountinfoLine('/', '/', 'rw'),
      mountinfoLine('/tmp/pv\\040uid-pv', '/data', 'rw'),
    ].join('\n'),
  });
  assert.equal(sameLeaf.state, 'refused');
  assert.match(sameLeaf.reason, /mount root/);

  const bad = classifyObjectStorageObservation('dev', {
    ...observation,
    mountinfo: [
      mountinfoLine('/', '/', 'rw'),
      mountinfoLine('/var/lib/kind/offscreen/notdata', '/data', 'rw'),
    ].join('\n'),
  });
  assert.equal(bad.state, 'refused');
  assert.match(bad.reason, /mount root/);
});

test('mount options ro or only root mount refuse chain', () => {
  const chainState = buildChainState({
    profileId: 'dev',
    mode: 'native',
    mountOptions: 'ro',
  });
  const { run: roRun } = createHistoryMockRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState,
    targetNamespaceAbsent: false,
  });
  assert.equal(
    observeObjectStorageChain('dev', { run: roRun }).state,
    'refused',
  );

  const rootOnly = buildChainState({
    profileId: 'dev',
    mode: 'native',
    onlyRootMount: true,
  });
  const { run: rootRun } = createHistoryMockRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState: rootOnly,
    targetNamespaceAbsent: false,
  });
  assert.equal(
    observeObjectStorageChain('dev', { run: rootRun }).state,
    'refused',
  );
});

test('PV name mismatch or pv uid mismatch in receipt refuses', () => {
  const chainState = buildChainState({ profileId: 'dev', mode: 'native' });
  const wrongName = buildChainState({ profileId: 'dev', mode: 'native' });
  wrongName.pvc.spec.volumeName = CHAIN_PV_NAME;
  wrongName.pv.metadata.name = 'wrong-pv-name';
  const { run: nameRun } = createHistoryMockRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState: wrongName,
    targetNamespaceAbsent: false,
  });
  assert.equal(
    observeObjectStorageChain('dev', { run: nameRun }).state,
    'refused',
  );

  const { run: uidRun } = createHistoryMockRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState,
    targetNamespaceAbsent: false,
  });
  const result = observeObjectStorageChain('dev', {
    run: uidRun,
    priorReceipt: {
      ...buildMatchingPriorReceipt(chainState.uids),
      pvUid: 'wrong-pv-uid',
    },
  });
  assert.equal(result.state, 'refused');
  assert.equal(result.continuity, 'mismatched');
});

test('pod ownerReference not ReplicaSet refuses chain', () => {
  const chainState = buildChainState({
    profileId: 'dev',
    mode: 'native',
    podOwnerKind: 'Deployment',
  });
  const { run } = createHistoryMockRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState,
    targetNamespaceAbsent: false,
  });
  assert.equal(observeObjectStorageChain('dev', { run }).state, 'refused');
});

test('EndpointSlice targetRef uid mismatch or ready false refuses', () => {
  const chainState = buildChainState({
    profileId: 'dev',
    mode: 'native',
    endpointTargetUid: 'wrong-pod-uid',
  });
  const { run: uidRun } = createHistoryMockRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState,
    targetNamespaceAbsent: false,
  });
  assert.equal(
    observeObjectStorageChain('dev', { run: uidRun }).state,
    'refused',
  );

  const notReady = buildChainState({
    profileId: 'dev',
    mode: 'native',
    endpointReady: false,
  });
  const { run: readyRun } = createHistoryMockRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState: notReady,
    targetNamespaceAbsent: false,
  });
  assert.equal(
    observeObjectStorageChain('dev', { run: readyRun }).state,
    'refused',
  );
});

test('missing secret key refuses and secret values never appear in output', () => {
  const chainState = buildChainState({
    profileId: 'dev',
    mode: 'native',
    secretKeys: { 'secret-access-key': CHAIN_SECRET_VALUE },
  });
  const { run } = createHistoryMockRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState,
    targetNamespaceAbsent: false,
  });
  const result = observeObjectStorageChain('dev', { run });
  assert.equal(result.state, 'refused');
  assert.doesNotMatch(JSON.stringify(result), /super-secret-bytes/);
  assert.equal(result.admits, false);
});

test('malformed helm list on legacy candidate is unknown', () => {
  const chainState = buildChainState({ profileId: 'dev', mode: 'legacy-dev' });
  const { run } = createHistoryMockRun({
    historyAbsent: true,
    targetNamespaceAbsent: false,
    helmListMalformed: true,
    chainEnabled: true,
    chainState,
  });
  const result = observeObjectStorageChain('dev', { run });
  assert.equal(result.state, 'unknown');
  assert.notEqual(result.state, 'legacy-structural');
});

test('orphan Helm storage with empty helm list is refused not legacy-structural', () => {
  const chainState = buildChainState({ profileId: 'dev', mode: 'legacy-dev' });
  const { run } = createHistoryMockRun({
    historyAbsent: true,
    targetNamespaceAbsent: false,
    helmStorageNames: ['sh.helm.release.v1.object-store.v1'],
    chainEnabled: true,
    chainState,
  });
  const result = observeObjectStorageChain('dev', { run });
  assert.equal(result.state, 'refused');
  assert.notEqual(result.state, 'legacy-structural');
  assert.match(result.reason, /release count/);
});

test('native history with live S3_BUCKET env refuses chain', () => {
  const chainState = buildChainState({
    profileId: 'dev',
    mode: 'native',
    extraEnv: true,
  });
  const { run } = createHistoryMockRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState,
    targetNamespaceAbsent: false,
  });
  const result = observeObjectStorageChain('dev', { run });
  assert.equal(result.state, 'refused');
  assert.equal(result.admits, false);
});

test('extra container initContainer or envFrom refuses chain', () => {
  for (const option of [
    { extraContainer: true },
    { initContainer: true },
    { envFrom: true },
  ]) {
    const chainState = buildChainState({
      profileId: 'dev',
      mode: 'native',
      ...option,
    });
    const { run } = createHistoryMockRun({
      nativeCompatible: true,
      chainEnabled: true,
      chainState,
      targetNamespaceAbsent: false,
    });
    const result = observeObjectStorageChain('dev', { run });
    assert.equal(result.state, 'refused', JSON.stringify(option));
  }
});

test('prior receipt kubeSystemUid mismatch refuses with mismatched continuity', () => {
  const chainState = buildChainState({ profileId: 'dev', mode: 'native' });
  const { run } = createHistoryMockRun({
    nativeCompatible: true,
    chainEnabled: true,
    chainState,
    targetNamespaceAbsent: false,
  });
  const result = observeObjectStorageChain('dev', {
    run,
    priorReceipt: {
      ...buildMatchingPriorReceipt(chainState.uids),
      kubeSystemUid: 'wrong-kube-system-uid',
    },
  });
  assert.equal(result.state, 'refused');
  assert.equal(result.continuity, 'mismatched');
});
