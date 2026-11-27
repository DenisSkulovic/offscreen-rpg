import { parseAllDocuments } from 'yaml';
import { runPlatformCommand } from '../common/commands.mjs';
import {
  INVENTORY_BUDGET_MS,
  PREFLIGHT_COMMAND_TIMEOUT_MS,
} from './identity.mjs';
import { OBSERVABILITY_RELEASE_ORDER } from './artifacts.mjs';
import { readPending as custodyReadPending } from './custody.mjs';

export const INVENTORY_KINDS = Object.freeze([
  'serviceaccount',
  'configmap',
  'secret',
  'service',
  'deployment',
  'statefulset',
  'persistentvolumeclaim',
  'replicaset',
  'pod',
  'endpointslice',
  'resourcequota',
  'limitrange',
]);

export const HELM_RELEASE_PREFIX = 'sh.helm.release.v1.';
export const EXPECTED_HELM_RELEASES = Object.freeze(
  OBSERVABILITY_RELEASE_ORDER.map((release) => release.name),
);
export const DEFENSIVE_HELM_RELEASES = Object.freeze([
  'observability',
  'otel-collector',
]);

/** @type {readonly { kind: string, name: string, namespace?: string }[]} */
export const LEGACY_DIRECT_OBJECTS = Object.freeze([
  { kind: 'ConfigMap', name: 'otel-collector-config' },
  { kind: 'Deployment', name: 'otel-collector' },
  { kind: 'Service', name: 'otel-collector' },
  { kind: 'ConfigMap', name: 'synthetic-hop' },
  { kind: 'Deployment', name: 'hop-a' },
  { kind: 'Service', name: 'hop-a' },
  { kind: 'Deployment', name: 'hop-b' },
  { kind: 'Service', name: 'hop-b' },
]);

export const GRAFANA_ADMIN_SECRET = 'obs-grafana-admin';
export const GRAFANA_ADMIN_REQUIRED_KEYS = Object.freeze([
  'admin-user',
  'admin-password',
]);

const PER_KIND_LIMIT = 100;
const TOTAL_OBJECT_LIMIT = 500;
const READ_TIMEOUT_MS = 10_000;
const MAX_READ_BYTES = 8 * 1024 * 1024;

const INVENTORY_LIST_KINDS = Object.freeze([
  ...INVENTORY_KINDS,
  'job',
  'cronjob',
  'daemonset',
  'role',
  'rolebinding',
  'ingress',
  'networkpolicy',
]);

/**
 * Production pending reader; tests may inject an alternate readPending seam.
 * @param {string} contextName
 * @param {{ stateRoot?: string }} [deps]
 */
export function defaultReadPending(contextName, deps = {}) {
  return custodyReadPending(contextName, deps);
}

/**
 * @param {string} message
 */
function throwUnreadable(message) {
  throw new Error(`unreadable: ${message}`);
}

/**
 * @param {number} deadline
 * @param {() => number} now
 */
function remainingMs(deadline, now) {
  return Math.max(1, Math.min(READ_TIMEOUT_MS, deadline - now()));
}

/**
 * @param {ReturnType<typeof runPlatformCommand>} result
 * @param {string} label
 */
function refuseRead(result, label) {
  if (result.missing) {
    throwUnreadable(`${label}-missing`);
  }
  if (result.timedOut) {
    throwUnreadable('timeout');
  }
  if ((result.stdout ?? '').length > MAX_READ_BYTES) {
    throwUnreadable('overflow');
  }
  if (result.stderr && result.stderr.trim().length > 0) {
    throwUnreadable(`${label}-stderr`);
  }
  if (!result.ok) {
    throwUnreadable(label);
  }
}

/**
 * @param {string} kind
 * @param {string} name
 */
function objectKey(kind, name) {
  return `${kind}/${name}`;
}

/**
 * @param {object} secret
 */
export function sanitizeSecretObservation(secret) {
  const data = secret?.data ?? {};
  const keys = Object.keys(data);
  const presentKeys = keys.filter(
    (key) => typeof data[key] === 'string' && data[key].length > 0,
  );
  return {
    apiVersion: secret.apiVersion,
    kind: secret.kind,
    metadata: {
      name: secret.metadata?.name,
      namespace: secret.metadata?.namespace,
      uid: secret.metadata?.uid,
      resourceVersion: secret.metadata?.resourceVersion,
      labels: secret.metadata?.labels,
      annotations: secret.metadata?.annotations,
      ownerReferences: secret.metadata?.ownerReferences,
      deletionTimestamp: secret.metadata?.deletionTimestamp,
    },
    type: secret.type,
    dataKeys: presentKeys.sort(),
    hasValues: presentKeys.length > 0,
  };
}

/**
 * @param {ReturnType<typeof import('./artifacts.mjs').loadArtifacts>} artifacts
 */
function resolveCollectorConfigMapName(artifacts) {
  const release = artifacts.releases?.find((row) => row.role === 'collector');
  const doc = release?.documents?.find((row) => row.kind === 'ConfigMap');
  return typeof doc?.metadata?.name === 'string' ? doc.metadata.name : null;
}

/**
 * @param {object} doc
 * @param {string | null} collectorConfigMapName
 */
function sanitizeListedObject(doc, collectorConfigMapName) {
  const kind = doc.kind;
  const name = doc.metadata?.name;
  if (kind === 'Secret') {
    return sanitizeSecretObservation(doc);
  }
  const base = {
    apiVersion: doc.apiVersion,
    kind,
    metadata: {
      name,
      namespace: doc.metadata?.namespace,
      uid: doc.metadata?.uid,
      resourceVersion: doc.metadata?.resourceVersion,
      generation: doc.metadata?.generation,
      labels: doc.metadata?.labels,
      annotations: doc.metadata?.annotations,
      ownerReferences: doc.metadata?.ownerReferences,
      deletionTimestamp: doc.metadata?.deletionTimestamp,
    },
    spec: doc.spec,
    status: doc.status,
  };
  if (
    kind === 'ConfigMap' &&
    collectorConfigMapName &&
    name === collectorConfigMapName
  ) {
    return {
      ...base,
      data: doc.data,
      binaryData: doc.binaryData,
    };
  }
  return base;
}

/**
 * @param {import('./identity.mjs').captureIdentity extends (...args: any[]) => infer R ? R : never} identity
 * @param {typeof runPlatformCommand} run
 * @param {number} deadline
 * @param {() => number} now
 */
function readNamespaceObservation(identity, run, deadline, now) {
  const result = run(
    'kubectl',
    [
      '--kubeconfig',
      identity.snapshotPath,
      '--context',
      identity.contextName,
      'get',
      'namespace',
      identity.namespace,
      '--ignore-not-found',
      '-o',
      'json',
    ],
    { timeoutMs: remainingMs(deadline, now) },
  );
  refuseRead(result, 'namespace');
  const trimmed = (result.stdout ?? '').trim();
  if (trimmed.length === 0) {
    return { absent: true };
  }
  try {
    const object = JSON.parse(trimmed);
    if (object?.kind !== 'Namespace') {
      throwUnreadable('namespace-shape');
    }
    return {
      absent: false,
      uid: object.metadata?.uid ?? null,
      object,
    };
  } catch {
    throwUnreadable('namespace-json');
  }
}

/**
 * @param {import('./identity.mjs').captureIdentity extends (...args: any[]) => infer R ? R : never} identity
 * @param {string} resource
 * @param {typeof runPlatformCommand} run
 * @param {number} deadline
 * @param {() => number} now
 */
function listNamespacedObjects(identity, resource, run, deadline, now) {
  const endpoints = {
    serviceaccount: ['/api/v1', 'serviceaccounts', 'ServiceAccount'],
    configmap: ['/api/v1', 'configmaps', 'ConfigMap'],
    secret: ['/api/v1', 'secrets', 'Secret'],
    service: ['/api/v1', 'services', 'Service'],
    deployment: ['/apis/apps/v1', 'deployments', 'Deployment'],
    statefulset: ['/apis/apps/v1', 'statefulsets', 'StatefulSet'],
    persistentvolumeclaim: [
      '/api/v1',
      'persistentvolumeclaims',
      'PersistentVolumeClaim',
    ],
    replicaset: ['/apis/apps/v1', 'replicasets', 'ReplicaSet'],
    pod: ['/api/v1', 'pods', 'Pod'],
    endpointslice: [
      '/apis/discovery.k8s.io/v1',
      'endpointslices',
      'EndpointSlice',
    ],
    resourcequota: ['/api/v1', 'resourcequotas', 'ResourceQuota'],
    limitrange: ['/api/v1', 'limitranges', 'LimitRange'],
    job: ['/apis/batch/v1', 'jobs', 'Job'],
    cronjob: ['/apis/batch/v1', 'cronjobs', 'CronJob'],
    daemonset: ['/apis/apps/v1', 'daemonsets', 'DaemonSet'],
    role: ['/apis/rbac.authorization.k8s.io/v1', 'roles', 'Role'],
    rolebinding: [
      '/apis/rbac.authorization.k8s.io/v1',
      'rolebindings',
      'RoleBinding',
    ],
    ingress: ['/apis/networking.k8s.io/v1', 'ingresses', 'Ingress'],
    networkpolicy: [
      '/apis/networking.k8s.io/v1',
      'networkpolicies',
      'NetworkPolicy',
    ],
  };
  const endpoint = endpoints[resource];
  if (!endpoint) throwUnreadable('unknown-resource');
  const [api, plural, kind] = endpoint;
  const apiVersion = api.replace(/^\/apis?\//, '');
  const path = `${api}/namespaces/${encodeURIComponent(identity.namespace)}/${plural}`;
  const items = [];
  const seenTokens = new Set();
  let continueToken = '';
  do {
    assertDeadline(deadline, now);
    const query = new URLSearchParams({ limit: String(PER_KIND_LIMIT) });
    if (continueToken) query.set('continue', continueToken);
    const result = run(
      'kubectl',
      [
        '--kubeconfig',
        identity.snapshotPath,
        '--context',
        identity.contextName,
        '--request-timeout=10s',
        'get',
        '--raw',
        `${path}?${query}`,
      ],
      { timeoutMs: remainingMs(deadline, now) },
    );
    refuseRead(result, resource);
    assertDeadline(deadline, now);
    let body;
    try {
      body = JSON.parse(result.stdout);
    } catch {
      throwUnreadable(`${resource}-json`);
    }
    if (!Array.isArray(body?.items) || body.items.length > PER_KIND_LIMIT) {
      throwUnreadable('pagination-invalid');
    }
    if (items.length + body.items.length > TOTAL_OBJECT_LIMIT) {
      throwUnreadable('pagination-overflow');
    }
    for (const item of body.items) {
      if (
        !item ||
        typeof item !== 'object' ||
        (item.kind != null && item.kind !== kind) ||
        (item.apiVersion != null && item.apiVersion !== apiVersion) ||
        typeof item.metadata?.name !== 'string' ||
        item.metadata.namespace !== identity.namespace
      ) {
        throwUnreadable('inventory-item-shape');
      }
      items.push({ ...item, kind, apiVersion });
    }
    continueToken = body.metadata?.continue ?? '';
    if (typeof continueToken !== 'string' || seenTokens.has(continueToken)) {
      throwUnreadable('pagination-invalid');
    }
    if (continueToken) {
      if (
        items.length >= TOTAL_OBJECT_LIMIT ||
        seenTokens.size >= TOTAL_OBJECT_LIMIT
      ) {
        throwUnreadable('pagination-overflow');
      }
      seenTokens.add(continueToken);
    }
  } while (continueToken);
  return items;
}

/**
 * @param {import('./identity.mjs').captureIdentity extends (...args: any[]) => infer R ? R : never} identity
 * @param {string} volumeName
 * @param {object} claim
 * @param {typeof runPlatformCommand} run
 * @param {number} deadline
 * @param {() => number} now
 */
function readBoundPersistentVolume(
  identity,
  volumeName,
  claim,
  run,
  deadline,
  now,
) {
  assertDeadline(deadline, now);
  const result = run(
    'kubectl',
    [
      '--kubeconfig',
      identity.snapshotPath,
      '--context',
      identity.contextName,
      '--request-timeout=10s',
      'get',
      'pv',
      volumeName,
      '-o',
      'json',
    ],
    { timeoutMs: remainingMs(deadline, now) },
  );
  assertDeadline(deadline, now);
  refuseRead(result, `pv-${volumeName}`);
  /** @type {object} */
  let pv;
  try {
    pv = JSON.parse(result.stdout);
  } catch {
    throwUnreadable(`pv-json-${volumeName}`);
  }
  if (pv?.kind !== 'PersistentVolume') {
    throwUnreadable(`pv-shape-${volumeName}`);
  }
  const uid = pv.metadata?.uid;
  if (typeof uid !== 'string' || uid.length === 0) {
    throwUnreadable(`pv-uid-${volumeName}`);
  }
  if (pv.status?.phase !== 'Bound') {
    throwUnreadable(`pv-phase-${volumeName}`);
  }
  const claimRef = pv.spec?.claimRef;
  const claimName = claim.metadata?.name;
  const claimNamespace = claim.metadata?.namespace;
  const claimUid = claim.metadata?.uid;
  if (
    !claimRef ||
    claimRef.name !== claimName ||
    claimRef.namespace !== claimNamespace ||
    claimRef.uid !== claimUid
  ) {
    throwUnreadable(`pv-claimref-${volumeName}`);
  }
  return {
    apiVersion: pv.apiVersion,
    kind: pv.kind,
    metadata: {
      name: pv.metadata?.name,
      uid,
    },
    spec: {
      claimRef: {
        name: claimRef.name,
        namespace: claimRef.namespace,
        uid: claimRef.uid,
      },
      storageClassName: pv.spec?.storageClassName,
      accessModes: pv.spec?.accessModes,
      volumeMode: pv.spec?.volumeMode,
      capacity: pv.spec?.capacity,
    },
    status: {
      phase: pv.status?.phase,
      capacity: pv.status?.capacity,
    },
  };
}

/**
 * @param {Record<string, object>} objects
 * @param {import('./identity.mjs').captureIdentity extends (...args: any[]) => infer R ? R : never} identity
 * @param {typeof runPlatformCommand} run
 * @param {number} deadline
 * @param {() => number} now
 */
function projectPersistentVolumes(objects, identity, run, deadline, now) {
  /** @type {object[]} */
  const persistentVolumes = [];
  const fetched = new Set();
  for (const object of Object.values(objects)) {
    if (object.kind !== 'PersistentVolumeClaim') {
      continue;
    }
    const volumeName = object.spec?.volumeName;
    if (typeof volumeName !== 'string' || volumeName.length === 0) {
      throwUnreadable('pvc-volume-name');
    }
    if (fetched.has(volumeName)) {
      throwUnreadable('duplicate-pv-fetch');
    }
    fetched.add(volumeName);
    persistentVolumes.push(
      readBoundPersistentVolume(
        identity,
        volumeName,
        object,
        run,
        deadline,
        now,
      ),
    );
  }
  return persistentVolumes;
}

/**
 * @param {import('./identity.mjs').captureIdentity extends (...args: any[]) => infer R ? R : never} identity
 * @param {string} namespace
 * @param {typeof runPlatformCommand} run
 * @param {number} deadline
 * @param {() => number} now
 */
function readLegacyInNamespace(identity, namespace, run, deadline, now) {
  /** @type {{ kind: string, name: string, namespace: string, uid?: string }[]} */
  const found = [];
  for (const spec of LEGACY_DIRECT_OBJECTS) {
    const resource = spec.kind.toLowerCase();
    const result = run(
      'kubectl',
      [
        '--kubeconfig',
        identity.snapshotPath,
        '--context',
        identity.contextName,
        '-n',
        namespace,
        'get',
        resource,
        spec.name,
        '--ignore-not-found',
        '-o',
        'json',
      ],
      { timeoutMs: remainingMs(deadline, now) },
    );
    refuseRead(result, `legacy-${spec.name}`);
    const trimmed = (result.stdout ?? '').trim();
    if (trimmed.length === 0) {
      continue;
    }
    try {
      const object = JSON.parse(trimmed);
      if (object?.metadata?.name === spec.name) {
        found.push({
          kind: spec.kind,
          name: spec.name,
          namespace,
          uid: object.metadata?.uid,
        });
      }
    } catch {
      throwUnreadable('legacy-json');
    }
  }
  return found;
}

const CLUSTER_SCOPED_MANIFEST_KINDS = new Set([
  'PersistentVolume',
  'ClusterRole',
  'ClusterRoleBinding',
  'StorageClass',
]);

const COLLECTOR_RELEASE_NAME = 'obs-collector';

/**
 * @param {import('./identity.mjs').captureIdentity extends (...args: any[]) => infer R ? R : never} identity
 */
export function buildHelmListArgv(identity) {
  return [
    '--kubeconfig',
    identity.snapshotPath,
    '--kube-context',
    identity.contextName,
    'list',
    '-n',
    identity.namespace,
    '--all',
    '--max',
    '6',
    '--output',
    'json',
  ];
}

/**
 * @param {import('./identity.mjs').captureIdentity extends (...args: any[]) => infer R ? R : never} identity
 * @param {string} releaseName
 */
export function buildHelmHistoryArgv(identity, releaseName) {
  return [
    '--kubeconfig',
    identity.snapshotPath,
    '--kube-context',
    identity.contextName,
    'history',
    releaseName,
    '-n',
    identity.namespace,
    '--max',
    '6',
    '--output',
    'json',
  ];
}

/**
 * @param {import('./identity.mjs').captureIdentity extends (...args: any[]) => infer R ? R : never} identity
 * @param {string} releaseName
 * @param {number | string} revision
 */
export function buildHelmManifestArgv(identity, releaseName, revision) {
  return [
    '--kubeconfig',
    identity.snapshotPath,
    '--kube-context',
    identity.contextName,
    'get',
    'manifest',
    releaseName,
    '-n',
    identity.namespace,
    '--revision',
    String(revision),
  ];
}

/**
 * @param {unknown} value
 */
function canonicalRevisionString(value) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return String(value);
  }
  if (typeof value !== 'string' || value.length === 0) {
    throwUnreadable('helm-revision');
  }
  if (!/^(?:[1-9]\d*)$/.test(value)) {
    throwUnreadable('helm-revision');
  }
  return value;
}

/**
 * @param {unknown} row
 */
function readHelmAppVersion(row) {
  if (row && typeof row === 'object') {
    const object = /** @type {Record<string, unknown>} */ (row);
    if (typeof object.appVersion === 'string' && object.appVersion.length > 0) {
      return object.appVersion;
    }
    if (
      typeof object.app_version === 'string' &&
      object.app_version.length > 0
    ) {
      return object.app_version;
    }
  }
  throwUnreadable('helm-app-version');
}

/**
 * @param {unknown} body
 * @param {string} namespace
 */
function parseHelmListRows(body, namespace) {
  if (!Array.isArray(body)) {
    throwUnreadable('helm-list-not-array');
  }
  if (body.length > 5) {
    throwUnreadable('helm-list-overflow');
  }
  /** @type {{ name: string, namespace: string, revision: string, status: string, chart: string, appVersion: string }[]} */
  const rows = [];
  const seenNames = new Set();
  for (const row of body) {
    if (!row || typeof row !== 'object') {
      throwUnreadable('helm-list-row');
    }
    const entry = /** @type {Record<string, unknown>} */ (row);
    const name = entry.name;
    const rowNamespace = entry.namespace;
    const status = entry.status;
    const chart = entry.chart;
    if (
      typeof name !== 'string' ||
      name.length === 0 ||
      typeof rowNamespace !== 'string' ||
      rowNamespace.length === 0 ||
      typeof status !== 'string' ||
      status.length === 0 ||
      typeof chart !== 'string' ||
      chart.length === 0
    ) {
      throwUnreadable('helm-list-row');
    }
    if (rowNamespace !== namespace) {
      throwUnreadable('helm-list-namespace');
    }
    if (seenNames.has(name)) {
      throwUnreadable('helm-list-duplicate');
    }
    seenNames.add(name);
    const revision = canonicalRevisionString(entry.revision);
    const appVersion = readHelmAppVersion(entry);
    rows.push({
      name,
      namespace: rowNamespace,
      revision,
      status,
      chart,
      appVersion,
    });
  }
  return rows;
}

/**
 * @param {unknown} body
 */
function parseHelmHistoryRows(body) {
  if (!Array.isArray(body)) {
    throwUnreadable('helm-history-not-array');
  }
  if (body.length >= 6) {
    throwUnreadable('helm-history-overflow');
  }
  if (body.length === 0) {
    throwUnreadable('helm-history-empty');
  }
  /** @type {{ revision: string, status: string, chart: string, appVersion: string }[]} */
  const rows = [];
  const seenRevisions = new Set();
  for (const row of body) {
    if (!row || typeof row !== 'object') {
      throwUnreadable('helm-history-row');
    }
    const entry = /** @type {Record<string, unknown>} */ (row);
    const status = entry.status;
    const chart = entry.chart;
    const description = entry.description;
    if (
      typeof status !== 'string' ||
      status.length === 0 ||
      typeof chart !== 'string' ||
      chart.length === 0
    ) {
      throwUnreadable('helm-history-row');
    }
    void description;
    const revision = canonicalRevisionString(entry.revision ?? entry.version);
    if (seenRevisions.has(revision)) {
      throwUnreadable('helm-history-duplicate');
    }
    seenRevisions.add(revision);
    const appVersion = readHelmAppVersion(entry);
    rows.push({ revision, status, chart, appVersion });
  }
  rows.sort(
    (left, right) =>
      Number.parseInt(left.revision, 10) - Number.parseInt(right.revision, 10),
  );
  return rows;
}

/**
 * @param {import('./identity.mjs').captureIdentity extends (...args: any[]) => infer R ? R : never} identity
 * @param {typeof runPlatformCommand} run
 * @param {number} deadline
 * @param {() => number} now
 */
export function listHelmReleases(identity, run, deadline, now) {
  assertDeadline(deadline, now);
  const result = run('helm', buildHelmListArgv(identity), {
    timeoutMs: remainingMs(deadline, now),
  });
  assertDeadline(deadline, now);
  refuseRead(result, 'helm-list');
  try {
    const body = JSON.parse(result.stdout);
    return parseHelmListRows(body, identity.namespace);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('unreadable:')) {
      throw error;
    }
    throwUnreadable('helm-list-json');
  }
}

/**
 * @param {import('./identity.mjs').captureIdentity extends (...args: any[]) => infer R ? R : never} identity
 * @param {string} releaseName
 * @param {typeof runPlatformCommand} run
 * @param {number} deadline
 * @param {() => number} now
 */
function fetchHelmHistory(identity, releaseName, run, deadline, now) {
  assertDeadline(deadline, now);
  const result = run('helm', buildHelmHistoryArgv(identity, releaseName), {
    timeoutMs: remainingMs(deadline, now),
  });
  assertDeadline(deadline, now);
  refuseRead(result, `helm-history-${releaseName}`);
  try {
    const body = JSON.parse(result.stdout);
    return parseHelmHistoryRows(body);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('unreadable:')) {
      throw error;
    }
    throwUnreadable(`helm-history-json-${releaseName}`);
  }
}

/**
 * @param {import('./identity.mjs').captureIdentity extends (...args: any[]) => infer R ? R : never} identity
 * @param {string} releaseName
 * @param {number | string} revision
 * @param {typeof runPlatformCommand} run
 * @param {number} deadline
 * @param {() => number} now
 */
export function fetchHelmManifest(
  identity,
  releaseName,
  revision,
  run,
  deadline,
  now,
) {
  assertDeadline(deadline, now);
  const result = run(
    'helm',
    buildHelmManifestArgv(identity, releaseName, revision),
    { timeoutMs: remainingMs(deadline, now) },
  );
  assertDeadline(deadline, now);
  refuseRead(result, `helm-manifest-${releaseName}`);
  return result.stdout ?? '';
}

/**
 * @param {string} manifest
 * @param {string} namespace
 */
export function parseHelmManifestDocuments(manifest, namespace) {
  const docs = parseAllDocuments(manifest);
  /** @type {object[]} */
  const objects = [];
  const seen = new Set();
  for (const doc of docs) {
    if (doc.errors.length > 0) {
      throwUnreadable('helm-manifest-malformed');
    }
    const value = doc.toJS();
    if (value == null) {
      continue;
    }
    if (
      typeof value !== 'object' ||
      typeof value.apiVersion !== 'string' ||
      value.apiVersion.length === 0 ||
      typeof value.kind !== 'string' ||
      value.kind.length === 0 ||
      !value.metadata ||
      typeof value.metadata !== 'object' ||
      typeof value.metadata.name !== 'string' ||
      value.metadata.name.length === 0
    ) {
      throwUnreadable('helm-manifest-object');
    }
    const kind = value.kind;
    const resolvedNamespace = CLUSTER_SCOPED_MANIFEST_KINDS.has(kind)
      ? value.metadata.namespace
      : (value.metadata.namespace ?? namespace);
    if (!CLUSTER_SCOPED_MANIFEST_KINDS.has(kind)) {
      if (
        typeof resolvedNamespace !== 'string' ||
        resolvedNamespace.length === 0
      ) {
        throwUnreadable('helm-manifest-namespace');
      }
      if (
        value.metadata.namespace != null &&
        value.metadata.namespace !== namespace
      ) {
        throwUnreadable('helm-manifest-explicit-namespace');
      }
      value.metadata = { ...value.metadata, namespace: resolvedNamespace };
    } else if (
      typeof value.metadata.namespace === 'string' &&
      value.metadata.namespace.length > 0 &&
      value.metadata.namespace !== namespace
    ) {
      throwUnreadable('helm-manifest-explicit-namespace');
    }
    const identityKey = `${value.apiVersion}\0${kind}\0${resolvedNamespace ?? ''}\0${value.metadata.name}`;
    if (seen.has(identityKey)) {
      throwUnreadable('helm-manifest-duplicate');
    }
    seen.add(identityKey);
    objects.push(value);
  }
  return objects;
}

/**
 * @param {ReturnType<typeof captureIdentity>} identity
 * @param {ReturnType<typeof import('./artifacts.mjs').loadArtifacts>} artifacts
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   now?: () => number,
 *   deadline?: number,
 *   readPending?: (contextName: string) => { pending: boolean, valid: boolean },
 *   stateRoot?: string,
 * }} [deps]
 */
function assertDeadline(deadline, now) {
  if (deadline <= now()) {
    throwUnreadable('deadline');
  }
}

export function collectInventory(identity, artifacts, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const now = deps.now ?? (() => Date.now());
  const deadline = deps.deadline ?? now() + INVENTORY_BUDGET_MS;
  const readPending =
    deps.readPending ??
    ((contextName) =>
      defaultReadPending(contextName, { stateRoot: deps.stateRoot }));
  const collectorConfigMapName = resolveCollectorConfigMapName(artifacts);
  const knownReleaseNames = new Set(EXPECTED_HELM_RELEASES);

  assertDeadline(deadline, now);
  const namespace = readNamespaceObservation(identity, run, deadline, now);
  /** @type {Record<string, object>} */
  const objects = {};
  let totalObjects = 0;

  if (!namespace.absent) {
    for (const kind of INVENTORY_LIST_KINDS) {
      const items = listNamespacedObjects(identity, kind, run, deadline, now);
      totalObjects += items.length;
      if (totalObjects > TOTAL_OBJECT_LIMIT) {
        throwUnreadable('total-overflow');
      }
      for (const item of items) {
        const key = objectKey(item.kind, item.metadata?.name);
        if (Object.hasOwn(objects, key)) throwUnreadable('duplicate-object');
        objects[key] = sanitizeListedObject(item, collectorConfigMapName);
      }
    }
  }

  /** @type {object[]} */
  let helmReleases = [];
  /** @type {Record<string, { revision: string, status: string, chart: string, appVersion: string }[]>} */
  const helmHistory = {};
  /** @type {Record<string, { revision: string, documents: object[], previousDocuments?: object[] }>} */
  const helmManifests = {};
  if (!namespace.absent) {
    try {
      helmReleases = listHelmReleases(identity, run, deadline, now);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('unreadable:')) {
        throw error;
      }
      throwUnreadable('helm-list');
    }
    for (const row of helmReleases) {
      helmHistory[row.name] = fetchHelmHistory(
        identity,
        row.name,
        run,
        deadline,
        now,
      );
      if (!knownReleaseNames.has(row.name)) {
        continue;
      }
      const manifest = fetchHelmManifest(
        identity,
        row.name,
        row.revision,
        run,
        deadline,
        now,
      );
      const entry = {
        revision: row.revision,
        documents: parseHelmManifestDocuments(manifest, identity.namespace),
      };
      if (
        row.name === COLLECTOR_RELEASE_NAME &&
        row.revision === '2' &&
        identity.profileId === 'dev'
      ) {
        const previousManifest = fetchHelmManifest(
          identity,
          row.name,
          '1',
          run,
          deadline,
          now,
        );
        entry.previousDocuments = parseHelmManifestDocuments(
          previousManifest,
          identity.namespace,
        );
      }
      helmManifests[row.name] = entry;
    }
  }

  const persistentVolumes = namespace.absent
    ? []
    : projectPersistentVolumes(objects, identity, run, deadline, now);
  /** @type {{ kind: string, name: string, namespace: string, uid?: string }[]} */
  const legacy = readLegacyInNamespace(
    identity,
    identity.namespace,
    run,
    deadline,
    now,
  );
  if (identity.profileId === 'release') {
    legacy.push(
      ...readLegacyInNamespace(identity, 'lab-a', run, deadline, now),
    );
  }

  const pendingObservation = readPending(identity.contextName);

  return {
    profileId: identity.profileId,
    namespace,
    objects,
    helmReleases,
    helmHistory,
    helmManifests,
    persistentVolumes,
    legacy,
    pending: pendingObservation.pending,
    pendingValid: pendingObservation.valid,
    artifactsProfile: artifacts.profile,
    expectedInventory: artifacts.expectedInventory,
    releases: artifacts.releases,
  };
}
