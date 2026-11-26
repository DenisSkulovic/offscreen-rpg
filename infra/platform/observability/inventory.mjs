import { parseAllDocuments } from 'yaml';
import { runPlatformCommand } from '../common/commands.mjs';
import {
  CLEANUP_BUDGET_MS,
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
 * @param {object} doc
 */
function sanitizeListedObject(doc) {
  const kind = doc.kind;
  const name = doc.metadata?.name;
  if (kind === 'Secret') {
    return sanitizeSecretObservation(doc);
  }
  return {
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
    serviceaccount: ['/api/v1', 'serviceaccounts'],
    configmap: ['/api/v1', 'configmaps'],
    secret: ['/api/v1', 'secrets'],
    service: ['/api/v1', 'services'],
    deployment: ['/apis/apps/v1', 'deployments'],
    statefulset: ['/apis/apps/v1', 'statefulsets'],
    persistentvolumeclaim: ['/api/v1', 'persistentvolumeclaims'],
    replicaset: ['/apis/apps/v1', 'replicasets'],
    pod: ['/api/v1', 'pods'],
    endpointslice: ['/apis/discovery.k8s.io/v1', 'endpointslices'],
    resourcequota: ['/api/v1', 'resourcequotas'],
    limitrange: ['/api/v1', 'limitranges'],
    job: ['/apis/batch/v1', 'jobs'],
    cronjob: ['/apis/batch/v1', 'cronjobs'],
    daemonset: ['/apis/apps/v1', 'daemonsets'],
    role: ['/apis/rbac.authorization.k8s.io/v1', 'roles'],
    rolebinding: ['/apis/rbac.authorization.k8s.io/v1', 'rolebindings'],
    ingress: ['/apis/networking.k8s.io/v1', 'ingresses'],
    networkpolicy: ['/apis/networking.k8s.io/v1', 'networkpolicies'],
  };
  const endpoint = endpoints[resource];
  if (!endpoint) throwUnreadable('unknown-resource');
  const [api, plural] = endpoint;
  const path = `${api}/namespaces/${encodeURIComponent(identity.namespace)}/${plural}`;
  const items = [];
  const seenTokens = new Set();
  let continueToken = '';
  do {
    assertDeadline(deadline, now);
    const query = new URLSearchParams({ limit: String(PER_KIND_LIMIT) });
    if (continueToken) query.set('continue', continueToken);
    const result = run('kubectl', [
      '--kubeconfig',
      identity.snapshotPath,
      '--context',
      identity.contextName,
      '--request-timeout=10s',
      'get',
      '--raw',
      `${path}?${query}`,
    ], { timeoutMs: remainingMs(deadline, now) });
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
    items.push(...body.items);
    continueToken = body.metadata?.continue ?? '';
    if (typeof continueToken !== 'string' || seenTokens.has(continueToken)) {
      throwUnreadable('pagination-invalid');
    }
    if (continueToken) {
      if (items.length >= TOTAL_OBJECT_LIMIT || seenTokens.size >= TOTAL_OBJECT_LIMIT) {
        throwUnreadable('pagination-overflow');
      }
      seenTokens.add(continueToken);
    }
  } while (continueToken);
  return items;
}

/**
 * @param {import('./identity.mjs').captureIdentity extends (...args: any[]) => infer R ? R : never} identity
 * @param {typeof runPlatformCommand} run
 * @param {number} deadline
 * @param {() => number} now
 */
function listPersistentVolumes(identity, run, deadline, now) {
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
      '-o',
      'json',
    ],
    { timeoutMs: remainingMs(deadline, now) },
  );
  refuseRead(result, 'pv');
  try {
    const body = JSON.parse(result.stdout);
    return Array.isArray(body.items) ? body.items : [];
  } catch {
    throwUnreadable('pv-json');
  }
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

/**
 * @param {import('./identity.mjs').captureIdentity extends (...args: any[]) => infer R ? R : never} identity
 * @param {typeof runPlatformCommand} run
 * @param {number} deadline
 * @param {() => number} now
 */
function listHelmReleases(identity, run, deadline, now) {
  const result = run(
    'helm',
    [
      '--kubeconfig',
      identity.snapshotPath,
      '--kube-context',
      identity.contextName,
      'list',
      '-n',
      identity.namespace,
      '--output',
      'json',
    ],
    { timeoutMs: remainingMs(deadline, now) },
  );
  refuseRead(result, 'helm-list');
  try {
    return JSON.parse(result.stdout);
  } catch {
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
function fetchHelmManifest(identity, releaseName, run, deadline, now) {
  const result = run(
    'helm',
    [
      '--kubeconfig',
      identity.snapshotPath,
      '--kube-context',
      identity.contextName,
      'get',
      'manifest',
      releaseName,
      '-n',
      identity.namespace,
    ],
    { timeoutMs: remainingMs(deadline, now) },
  );
  refuseRead(result, `helm-manifest-${releaseName}`);
  return result.stdout ?? '';
}

/**
 * @param {string} manifest
 */
export function parseHelmManifestDocuments(manifest) {
  const docs = parseAllDocuments(manifest);
  /** @type {object[]} */
  const objects = [];
  for (const doc of docs) {
    if (doc.errors.length > 0) {
      throwUnreadable('helm-manifest-malformed');
    }
    const value = doc.toJS();
    if (value != null) {
      objects.push(value);
    }
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
  const deadline =
    deps.deadline ?? now() + INVENTORY_BUDGET_MS + CLEANUP_BUDGET_MS;
  const readPending =
    deps.readPending ??
    ((contextName) =>
      defaultReadPending(contextName, { stateRoot: deps.stateRoot }));

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
        objects[key] = sanitizeListedObject(item);
      }
    }
  }

  /** @type {object[]} */
  let helmReleases = [];
  /** @type {Record<string, { manifest: string, documents: object[] }>} */
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
      const name = row?.name;
      if (typeof name !== 'string') {
        continue;
      }
      if (
        ![...EXPECTED_HELM_RELEASES, ...DEFENSIVE_HELM_RELEASES].includes(name)
      ) {
        continue;
      }
      const manifest = fetchHelmManifest(identity, name, run, deadline, now);
      helmManifests[name] = {
        manifest,
        documents: parseHelmManifestDocuments(manifest),
      };
    }
  }

  const persistentVolumes = listPersistentVolumes(identity, run, deadline, now);
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
