import { Buffer } from 'node:buffer';
import { createHash, X509Certificate } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, parseAllDocuments } from 'yaml';
import { readPlatformProfile } from '../common/profile.mjs';
import { runObservabilityReadCommand } from './identity.mjs';

const observabilityRoot = dirname(fileURLToPath(import.meta.url));
const valuesRoot = join(observabilityRoot, 'values');
const locksRoot = join(observabilityRoot, 'locks');
const vendorRoot = join(observabilityRoot, 'vendor');
const DEV_COLLECTOR_OVERLAY = join(
  valuesRoot,
  'profiles',
  'dev',
  'collector.yaml',
);

const HELM_TIMEOUT_MS = 60_000;

const LOCK_HEADER = 'role\timmutable-reference';
const LOCK_ROLES = Object.freeze([
  'collector',
  'prometheus',
  'loki',
  'tempo',
  'grafana',
]);

/** @type {Readonly<Record<string, string>>} */
const FROZEN_ROLE_REPOSITORY = Object.freeze({
  collector:
    'ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib',
  prometheus: 'quay.io/prometheus/prometheus',
  loki: 'docker.io/grafana/loki',
  tempo: 'docker.io/grafana/tempo',
  grafana: 'docker.io/grafana/grafana',
});

const PRIMARY_CONTAINER_NAME = Object.freeze({
  collector: 'opentelemetry-collector',
  prometheus: 'prometheus-server',
  loki: 'loki',
  tempo: 'tempo',
  grafana: 'grafana',
});

const GRAFANA_DISTROLESS_TAG = '13.3.2-distroless';
const TEMPO_PINNED_APP_VERSION = '3.1.1';

/** @typedef {'dev' | 'release'} ObservabilityProfileId */

/** @typedef {(command: string, args: string[], options?: { timeoutMs?: number }) => { ok: boolean, status: number, stdout: string, stderr: string, timedOut: boolean, missing: boolean }} PlatformRun */

/** @type {readonly { name: string, role: string, valuesFile: string }[]} */
export const OBSERVABILITY_RELEASE_ORDER = Object.freeze([
  { name: 'obs-prometheus', role: 'prometheus', valuesFile: 'prometheus.yaml' },
  { name: 'obs-loki', role: 'loki', valuesFile: 'loki.yaml' },
  { name: 'obs-tempo', role: 'tempo', valuesFile: 'tempo.yaml' },
  { name: 'obs-collector', role: 'collector', valuesFile: 'collector.yaml' },
  { name: 'obs-grafana', role: 'grafana', valuesFile: 'grafana.yaml' },
]);

const PRIMARY_WORKLOAD = Object.freeze({
  collector: { kind: 'Deployment', name: 'obs-collector' },
  prometheus: { kind: 'Deployment', name: 'obs-prometheus' },
  loki: { kind: 'StatefulSet', name: 'obs-loki' },
  tempo: { kind: 'StatefulSet', name: 'obs-tempo' },
  grafana: { kind: 'Deployment', name: 'obs-grafana' },
});

const ALLOWED_INVENTORY_KINDS = new Set([
  'ServiceAccount',
  'ConfigMap',
  'Service',
  'Deployment',
  'StatefulSet',
  'PersistentVolumeClaim',
]);

const GRAFANA_ADMIN_SECRET = 'obs-grafana-admin';

const E2_ARTIFACT_ID = 'dev-e2';
const E2_INVENTORY_KEY = 'dev-e2';
const E2_HELPER_LOCK_HEADER = LOCK_HEADER;
/** Selected helper roles, their frozen repositories and rendered tags. */
const E2_HELPER_ROLES = Object.freeze({
  'kube-state-metrics': Object.freeze({
    repository: 'registry.k8s.io/kube-state-metrics/kube-state-metrics',
    renderedTag: 'v2.20.0',
  }),
  'redis-exporter': Object.freeze({
    repository: 'docker.io/oliver006/redis_exporter',
    renderedTag: null,
  }),
});
const KUBELET_TRUST_CONFIGMAP = 'obs-kubelet-trust';
const KUBELET_TRUST_MOUNT = '/etc/offscreen/kubelet-trust';
const KUBELET_TRUST_OWNER_LABEL = 'offscreen.dev/owner';
const KUBELET_TRUST_OWNER_VALUE = 'offscreen-dev';
const KUBELET_TRUST_ANNOTATION = 'offscreen.dev/kubelet-trust-binding-sha256';
const KUBELET_NODES = Object.freeze([
  'offscreen-dev-control-plane',
  'offscreen-dev-worker',
]);
export const KUBELET_TRUST_UNAVAILABLE_REASON = 'kubelet-trust-unavailable';

const DASHBOARD_CONFIGMAP = 'obs-grafana-dashboards-offscreen';
const DASHBOARD_MOUNT_PATH = '/var/lib/grafana/dashboards/offscreen';
const DASHBOARD_VOLUME = 'dashboards-offscreen';
const DASHBOARD_DIGEST_ANNOTATION = 'checksum/offscreen-dashboard-files';
const DASHBOARD_FILES = Object.freeze([
  'kubernetes.json',
  'messaging-cache.json',
  'nodes.json',
  'observability.json',
  'overview.json',
  'postgres.json',
  'storage.json',
  'temporal.json',
]);
/** Fixed literal; only this string is interpreted by the chart's tpl call. */
const DASHBOARD_EXTRA_OBJECT_TEMPLATE = `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${DASHBOARD_CONFIGMAP}
  namespace: {{ .Release.Namespace | quote }}
  labels:{{ include "grafana.labels" . | nindent 4 }}
    dashboard-provider: offscreen
data:{{ toYaml .Values.offscreenDashboardFiles | nindent 2 }}
`;

const E2_CLUSTER_KINDS = new Set(['ClusterRole', 'ClusterRoleBinding']);

/** Exact selected E2 cluster-scoped RBAC (compared order-insensitively). */
const E2_RBAC = Object.freeze({
  'obs-kube-state-metrics': {
    rules: [
      ['apps', 'daemonsets', 'list,watch'],
      ['apps', 'deployments', 'list,watch'],
      ['batch', 'jobs', 'list,watch'],
      ['', 'namespaces', 'list,watch'],
      ['', 'nodes', 'list,watch'],
      ['', 'persistentvolumeclaims', 'list,watch'],
      ['', 'persistentvolumes', 'list,watch'],
      ['', 'pods', 'list,watch'],
      ['apps', 'replicasets', 'list,watch'],
      ['apps', 'statefulsets', 'list,watch'],
    ],
    serviceAccount: 'obs-kube-state-metrics',
  },
  'obs-prometheus-kubelet': {
    rules: [
      ['', 'nodes', 'get,list,watch'],
      ['', 'nodes/metrics', 'get'],
      ['', 'pods', 'get,list,watch'],
    ],
    serviceAccount: 'obs-prometheus',
  },
});

/** Pod-bearing kinds; any not declared by the selected artifact is refused. */
const POD_BEARING_KINDS = new Set([
  'Pod',
  'Deployment',
  'StatefulSet',
  'DaemonSet',
  'ReplicaSet',
  'ReplicationController',
  'Job',
  'CronJob',
]);

/**
 * @param {string} message
 */
function throwArtifactInvalid(message) {
  throw new Error(`artifact-invalid: ${message}`);
}

/**
 * @param {string} filePath
 */
function fileSha256Hex(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

/**
 * @param {string} reference
 */
function parseCanonicalReference(reference) {
  const digestIndex = reference.indexOf('@sha256:');
  if (digestIndex < 1) throwArtifactInvalid('image lock missing digest');
  const repository = reference.slice(0, digestIndex);
  const hex = reference.slice(digestIndex + '@sha256:'.length);
  if (repository.length === 0 || repository.includes('@')) {
    throwArtifactInvalid('malformed image lock');
  }
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throwArtifactInvalid('image lock digest malformed');
  }
  const digest = `sha256:${hex}`;
  return { repository, hex, digest, canonicalReference: reference };
}

/**
 * @param {string} role
 * @param {string} reference
 */
function assertFrozenRepository(role, reference) {
  const { repository } = parseCanonicalReference(reference);
  const expected = FROZEN_ROLE_REPOSITORY[role];
  if (repository !== expected) {
    throwArtifactInvalid('image lock repository mismatch');
  }
}

/**
 * @param {string} tsvText
 */
function parseImageLock(tsvText) {
  const normalized = tsvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  if (lines.length === 0 || lines[0].trim() !== LOCK_HEADER) {
    throwArtifactInvalid('malformed image lock header');
  }
  /** @type {Record<string, string>} */
  const locks = {};
  let dataRows = 0;
  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    dataRows += 1;
    const tab = trimmed.indexOf('\t');
    if (tab < 1) throwArtifactInvalid('malformed image lock');
    const role = trimmed.slice(0, tab);
    const reference = trimmed.slice(tab + 1);
    if (!LOCK_ROLES.includes(role))
      throwArtifactInvalid('unknown image lock role');
    if (locks[role]) throwArtifactInvalid('duplicate image lock role');
    assertFrozenRepository(role, reference);
    locks[role] = reference;
  }
  if (dataRows !== LOCK_ROLES.length) {
    throwArtifactInvalid('image lock row count mismatch');
  }
  for (const role of LOCK_ROLES) {
    if (!locks[role]) throwArtifactInvalid('missing image lock role');
  }
  return locks;
}

/**
 * @param {Record<string, string>} locks
 */
function validateImageLockRecord(locks) {
  const keys = Object.keys(locks);
  for (const role of keys) {
    if (!LOCK_ROLES.includes(role))
      throwArtifactInvalid('unknown image lock role');
  }
  if (keys.length !== LOCK_ROLES.length) {
    throwArtifactInvalid('image lock row count mismatch');
  }
  for (const role of LOCK_ROLES) {
    const reference = locks[role];
    if (typeof reference !== 'string' || reference.length === 0) {
      throwArtifactInvalid('missing image lock role');
    }
    assertFrozenRepository(role, reference);
  }
}

function loadPins() {
  const text = readFileSync(join(locksRoot, 'charts.yaml'), 'utf8');
  /** @type {unknown} */
  let parsed;
  try {
    parsed = parseYaml(text);
  } catch {
    throwArtifactInvalid('malformed pins yaml');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('charts' in parsed) ||
    typeof (/** @type {{ charts?: unknown }} */ (parsed).charts) !== 'object'
  ) {
    throwArtifactInvalid('malformed pins document');
  }
  const charts =
    /** @type {Record<string, { name: string, version: string, sha256: string, appVersion?: string }>} */ (
      /** @type {{ charts: Record<string, unknown> }} */ (parsed).charts
    );
  return charts;
}

/**
 * @param {string} role
 * @param {Record<string, { name: string, version: string, sha256: string, appVersion?: string }>} pins
 * @param {string} canonicalReference
 */
function buildExpectedImage(role, pins, canonicalReference) {
  const { repository, hex, digest } =
    parseCanonicalReference(canonicalReference);
  const containerName =
    PRIMARY_CONTAINER_NAME[
      /** @type {keyof typeof PRIMARY_CONTAINER_NAME} */ (role)
    ];
  /** @type {string} */
  let renderedReference;
  /** @type {string[]} */
  const imageArgs = [];
  switch (role) {
    case 'collector':
      renderedReference = `${repository}@${digest}`;
      imageArgs.push('--set-string', `image.digest=${digest}`);
      break;
    case 'prometheus':
      renderedReference = `${repository}@${digest}`;
      imageArgs.push('--set-string', `server.image.digest=${digest}`);
      break;
    case 'loki':
      renderedReference = `${repository}@${digest}`;
      imageArgs.push('--set-string', `singleBinary.image.digest=${digest}`);
      break;
    case 'tempo': {
      const appVersion = pins.tempo?.appVersion;
      if (appVersion !== TEMPO_PINNED_APP_VERSION) {
        throwArtifactInvalid('tempo appVersion pin mismatch');
      }
      const tag = `${TEMPO_PINNED_APP_VERSION}@${digest}`;
      renderedReference = `${repository}:${TEMPO_PINNED_APP_VERSION}@${digest}`;
      imageArgs.push('--set-string', `tempo.tag=${tag}`);
      break;
    }
    case 'grafana':
      renderedReference = `${repository}:${GRAFANA_DISTROLESS_TAG}@${digest}`;
      imageArgs.push(
        '--set-string',
        `image.tag=${GRAFANA_DISTROLESS_TAG}`,
        '--set-string',
        `image.sha=${hex}`,
      );
      break;
    default:
      throwArtifactInvalid('unknown observability role');
  }
  return {
    containerName,
    renderedReference,
    canonicalReference,
    imageArgs,
  };
}

/**
 * @param {string} role
 * @param {string} storageClass
 */
function storageSubstitutionArgs(role, storageClass) {
  if (role === 'prometheus') {
    return [
      '--set-string',
      `server.persistentVolume.storageClass=${storageClass}`,
    ];
  }
  if (role === 'loki') {
    return [
      '--set-string',
      `singleBinary.persistence.storageClass=${storageClass}`,
    ];
  }
  if (role === 'tempo') {
    return ['--set-string', `persistence.storageClassName=${storageClass}`];
  }
  return [];
}

/**
 * @param {string} output
 */
function parseHelmDocuments(output) {
  if (!output.trim()) throwArtifactInvalid('empty helm render');
  /** @type {Record<string, unknown>[]} */
  const documents = [];
  try {
    for (const document of parseAllDocuments(output)) {
      if (document.errors.length > 0)
        throwArtifactInvalid('malformed helm render');
      const value = document.toJS();
      if (value != null) documents.push(value);
    }
  } catch {
    throwArtifactInvalid('malformed helm render');
  }
  return documents;
}

/**
 * @param {Record<string, unknown>[]} documents
 * @param {string} namespace
 */
function rejectForbiddenDocuments(documents, namespace) {
  for (const doc of documents) {
    const kind = doc.kind;
    const meta =
      /** @type {{ metadata?: { namespace?: string, name?: string, annotations?: Record<string, string> } }} */ (
        doc
      ).metadata;
    if (typeof kind !== 'string' || !meta)
      throwArtifactInvalid('malformed manifest');
    if (meta.namespace && meta.namespace !== namespace) {
      throwArtifactInvalid('unexpected manifest namespace');
    }
    const hook = meta.annotations?.['helm.sh/hook'];
    if (hook) throwArtifactInvalid('unexpected helm hook');
    if (kind === 'Secret' && meta.name === GRAFANA_ADMIN_SECRET) {
      throwArtifactInvalid('grafana admin secret in render output');
    }
  }
}

/**
 * @param {Record<string, unknown>[]} documents
 * @param {string} role
 * @param {{ containerName: string, renderedReference: string, canonicalReference: string }} expectedImage
 */
function assertPrimaryWorkloadImage(documents, role, expectedImage) {
  const spec =
    PRIMARY_WORKLOAD[/** @type {keyof typeof PRIMARY_WORKLOAD} */ (role)];
  const workload = documents.find(
    (doc) => doc.kind === spec.kind && doc.metadata?.name === spec.name,
  );
  if (!workload) throwArtifactInvalid('missing primary workload');
  const podSpec =
    /** @type {{ spec?: { template?: { spec?: { containers?: { name?: string, image?: string }[], initContainers?: unknown[], ephemeralContainers?: unknown[] } } } }} */ (
      workload
    ).spec?.template?.spec;
  if (!podSpec) throwArtifactInvalid('missing primary workload pod spec');
  const initContainers = podSpec.initContainers ?? [];
  const ephemeralContainers = podSpec.ephemeralContainers ?? [];
  if (initContainers.length > 0) {
    throwArtifactInvalid('unexpected init container');
  }
  if (ephemeralContainers.length > 0) {
    throwArtifactInvalid('unexpected ephemeral container');
  }
  const containers = podSpec.containers ?? [];
  if (containers.length !== 1) {
    throwArtifactInvalid('unexpected regular container count');
  }
  const container = containers[0];
  if (container?.name !== expectedImage.containerName) {
    throwArtifactInvalid('primary workload container name mismatch');
  }
  const image = container?.image;
  if (typeof image !== 'string' || image.length === 0) {
    throwArtifactInvalid('missing primary workload image');
  }
  if (image !== expectedImage.renderedReference) {
    throwArtifactInvalid('primary workload image reference mismatch');
  }
}

/**
 * @param {Record<string, unknown>[]} documents
 * @param {string} role
 * @param {string} releaseName
 * @param {string} namespace
 */
function collectReleaseInventoryRows(
  documents,
  role,
  releaseName,
  namespace,
  allowClusterKinds = false,
) {
  /** @type {[string, string, string, string, string][]} */
  const direct = [];
  /** @type {[string, string, string, string, string][]} */
  const generated = [];
  const seen = new Set();
  for (const doc of documents) {
    const kind = doc.kind;
    const meta =
      /** @type {{ apiVersion?: string, metadata?: { namespace?: string, name?: string } }} */ (
        doc
      );
    const apiVersion = meta.apiVersion;
    const name = meta.metadata?.name;
    const docNs = meta.metadata?.namespace;
    if (
      typeof kind !== 'string' ||
      typeof apiVersion !== 'string' ||
      typeof name !== 'string'
    ) {
      throwArtifactInvalid('malformed manifest identity');
    }
    const clusterScoped = allowClusterKinds && E2_CLUSTER_KINDS.has(kind);
    if (clusterScoped) {
      if (docNs !== undefined) {
        throwArtifactInvalid('cluster-scoped manifest carries a namespace');
      }
    } else {
      if (docNs !== namespace)
        throwArtifactInvalid('manifest namespace mismatch');
      if (!ALLOWED_INVENTORY_KINDS.has(kind)) {
        throwArtifactInvalid('unexpected manifest kind');
      }
    }
    const key = `${kind}/${name}`;
    if (seen.has(key)) throwArtifactInvalid('duplicate manifest identity');
    seen.add(key);
    direct.push([
      apiVersion,
      kind,
      clusterScoped ? '' : namespace,
      name,
      releaseName,
    ]);
    if (kind === 'StatefulSet') {
      const claims =
        /** @type {{ spec?: { volumeClaimTemplates?: { metadata?: { name?: string } }[] } }} */ (
          doc
        ).spec?.volumeClaimTemplates ?? [];
      const stsName = name;
      for (const claim of claims) {
        const claimName = claim.metadata?.name;
        if (typeof claimName !== 'string' || claimName.length === 0) {
          throwArtifactInvalid('malformed volume claim template');
        }
        generated.push([
          'v1',
          'PersistentVolumeClaim',
          namespace,
          `${claimName}-${stsName}-0`,
          releaseName,
        ]);
      }
    }
  }
  return { direct, generated };
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {{ direct: [string, string, string, string, string][], generatedClaims: [string, string, string, string, string][] }} expected
 * @param {[string, string, string, string, string][]} direct
 * @param {[string, string, string, string, string][]} generated
 */
function assertInventoryMatch(profileId, expected, direct, generated) {
  const sortRows = (rows) =>
    rows
      .map((row) => JSON.stringify(row))
      .sort()
      .map(
        (text) =>
          /** @type {[string, string, string, string, string]} */ (
            JSON.parse(text)
          ),
      );
  const actualDirect = sortRows(direct);
  const actualGenerated = sortRows(generated);
  const expectedDirect = sortRows(expected.direct);
  const expectedGenerated = sortRows(expected.generatedClaims);
  if (
    JSON.stringify(actualDirect) !== JSON.stringify(expectedDirect) ||
    JSON.stringify(actualGenerated) !== JSON.stringify(expectedGenerated)
  ) {
    throwArtifactInvalid(`inventory mismatch for profile ${profileId}`);
  }
}

/**
 * Parse the separate E2 helper lock: exactly one row for each selected helper
 * role, frozen repositories, canonical digests.
 * @param {string} tsvText
 * @returns {Record<string, string>}
 */
export function parseHelperImageLock(tsvText) {
  const lines = String(tsvText)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');
  if (lines[0]?.trim() !== E2_HELPER_LOCK_HEADER) {
    throwArtifactInvalid('malformed helper lock header');
  }
  /** @type {Record<string, string>} */
  const locks = {};
  let rows = 0;
  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    rows += 1;
    const tab = trimmed.indexOf('\t');
    if (tab < 1) throwArtifactInvalid('malformed helper lock');
    const role = trimmed.slice(0, tab);
    const reference = trimmed.slice(tab + 1);
    if (!Object.hasOwn(E2_HELPER_ROLES, role)) {
      throwArtifactInvalid('unknown helper lock role');
    }
    if (locks[role]) throwArtifactInvalid('duplicate helper lock role');
    locks[role] = reference;
  }
  validateHelperLockRecord(locks);
  if (rows !== Object.keys(E2_HELPER_ROLES).length) {
    throwArtifactInvalid('helper lock row count mismatch');
  }
  return locks;
}

/** @param {Record<string, string>} locks */
function validateHelperLockRecord(locks) {
  const keys = Object.keys(locks);
  for (const role of keys) {
    if (!Object.hasOwn(E2_HELPER_ROLES, role)) {
      throwArtifactInvalid('unknown helper lock role');
    }
  }
  for (const role of Object.keys(E2_HELPER_ROLES)) {
    const reference = locks[role];
    if (typeof reference !== 'string' || reference.length === 0) {
      throwArtifactInvalid('missing helper lock role');
    }
    const { repository } = parseCanonicalReference(reference);
    if (repository !== E2_HELPER_ROLES[role].repository) {
      throwArtifactInvalid('helper lock repository mismatch');
    }
  }
  if (keys.length !== Object.keys(E2_HELPER_ROLES).length) {
    throwArtifactInvalid('helper lock row count mismatch');
  }
}

/**
 * @param {string} role
 * @param {string} canonicalReference
 */
function helperRenderedReference(role, canonicalReference) {
  const { repository, digest } = parseCanonicalReference(canonicalReference);
  const tag = E2_HELPER_ROLES[role].renderedTag;
  return tag ? `${repository}:${tag}@${digest}` : `${repository}@${digest}`;
}

/** @param {Buffer} der */
function canonicalCertificatePem(der) {
  const lines = der.toString('base64').match(/.{1,64}/g) ?? [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`;
}

/**
 * Validate a cluster-bound kubelet trust binding as produced by
 * kubelet-trust.mjs and project the two literal Helm values from it.
 * The binding is never derived from rendered or live Helm data.
 * @param {unknown} binding
 */
function validateKubeletTrustBinding(binding) {
  const fail = (what) => throwArtifactInvalid(`kubelet trust binding ${what}`);
  const isHex64 = (v) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
  const nonEmpty = (v) => typeof v === 'string' && v.length > 0;
  if (typeof binding !== 'object' || binding === null || Array.isArray(binding)) {
    fail('malformed');
  }
  const b = /** @type {Record<string, any>} */ (binding);
  const TOP = [
    'schema',
    'contextName',
    'kubeSystemUid',
    'baselineUid',
    'nodes',
    'bindingSha256',
  ];
  if (JSON.stringify(Object.keys(b)) !== JSON.stringify(TOP)) {
    fail('shape mismatch');
  }
  if (b.schema !== 1) fail('schema mismatch');
  for (const key of ['contextName', 'kubeSystemUid', 'baselineUid']) {
    if (!nonEmpty(b[key])) fail('identity missing');
  }
  if (!isHex64(b.bindingSha256)) fail('digest malformed');
  if (!Array.isArray(b.nodes) || b.nodes.length !== KUBELET_NODES.length) {
    fail('node set mismatch');
  }
  const NODE_KEYS = ['name', 'nodeUid', 'dockerId', 'caSha256', 'caPem'];
  const uids = new Set();
  const dockerIds = new Set();
  b.nodes.forEach((node, index) => {
    if (
      typeof node !== 'object' ||
      node === null ||
      JSON.stringify(Object.keys(node)) !== JSON.stringify(NODE_KEYS)
    ) {
      fail('node shape mismatch');
    }
    if (node.name !== KUBELET_NODES[index]) fail('node set mismatch');
    if (!nonEmpty(node.nodeUid) || !isHex64(node.dockerId)) {
      fail('node identity malformed');
    }
    uids.add(node.nodeUid);
    dockerIds.add(node.dockerId);
    if (!isHex64(node.caSha256)) fail('root digest malformed');
    if (
      typeof node.caPem !== 'string' ||
      Buffer.byteLength(node.caPem) > 16 * 1024
    ) {
      fail('root pem malformed');
    }
    let cert;
    try {
      cert = new X509Certificate(node.caPem);
    } catch {
      fail('root pem malformed');
    }
    if (
      canonicalCertificatePem(cert.raw) !== node.caPem ||
      createHash('sha256').update(cert.raw).digest('hex') !== node.caSha256
    ) {
      fail('root pem not canonical');
    }
  });
  if (uids.size !== b.nodes.length || dockerIds.size !== b.nodes.length) {
    fail('node identity duplicated');
  }
  const { bindingSha256, ...body } = b;
  const expected = createHash('sha256')
    .update(JSON.stringify(body), 'utf8')
    .digest('hex');
  if (expected !== bindingSha256) fail('digest mismatch');
  const caPem = b.nodes.map((n) => n.caPem).join('');
  return { bindingSha256, caPem, binding: deepFreezeCopy(b) };
}

/** @template T @param {T} value @returns {T} */
function deepFreezeCopy(value) {
  const copy = JSON.parse(JSON.stringify(value));
  const freeze = (v) => {
    if (v && typeof v === 'object') {
      for (const child of Object.values(v)) freeze(child);
      Object.freeze(v);
    }
  };
  freeze(copy);
  return copy;
}

/**
 * Read the exact eight repository-owned dashboard assets as UTF-8. Refuses
 * a missing, extra, aliased or non-regular entry.
 */
function readDashboardAssets() {
  const root = join(observabilityRoot, 'dashboards');
  const entries = readdirSync(root).sort();
  if (JSON.stringify(entries) !== JSON.stringify(DASHBOARD_FILES)) {
    throwArtifactInvalid('unexpected dashboard asset set');
  }
  return DASHBOARD_FILES.map((file) => {
    const path = join(root, file);
    const stat = lstatSync(path);
    if (!stat.isFile() || realpathSync(path) !== path) {
      throwArtifactInvalid('dashboard asset is not a regular source file');
    }
    return {
      file,
      stem: file.slice(0, -'.json'.length),
      path,
      content: readFileSync(path, 'utf8'),
    };
  });
}

/** @param {{ file: string, content: string }[]} assets */
function dashboardFilesDigest(assets) {
  return createHash('sha256')
    .update(JSON.stringify(assets.map((a) => [a.file, a.content])), 'utf8')
    .digest('hex');
}

/**
 * E2 Prometheus release-specific Helm arguments (trust only).
 * @param {{ bindingSha256: string, caPem: string }} trust
 */
function e2PrometheusArgs(trust) {
  return [
    '--set-json',
    `offscreenKubeletTrust=${JSON.stringify({
      bindingSha256: trust.bindingSha256,
      caPem: trust.caPem,
    })}`,
  ];
}

/**
 * E2 Grafana local-file dashboard descriptor (TARGET.md section 4).
 * @param {ReturnType<typeof readDashboardAssets>} assets
 */
function e2GrafanaArgs(assets) {
  return [
    '--set-string',
    `dashboardsConfigMaps.offscreen=${DASHBOARD_CONFIGMAP}`,
    '--set-json',
    `extraObjects=${JSON.stringify([DASHBOARD_EXTRA_OBJECT_TEMPLATE])}`,
    ...assets.flatMap((a) => [
      '--set-file',
      `offscreenDashboardFiles.${a.stem}\\.json=${a.path}`,
    ]),
    '--set-string',
    `podAnnotations.${DASHBOARD_DIGEST_ANNOTATION}=${dashboardFilesDigest(assets)}`,
  ];
}

/**
 * @param {Record<string, unknown>} doc
 * @returns {Record<string, any> | null}
 */
function podSpecOf(doc) {
  const d = /** @type {any} */ (doc);
  switch (d.kind) {
    case 'Pod':
      return d.spec ?? null;
    case 'CronJob':
      return d.spec?.jobTemplate?.spec?.template?.spec ?? null;
    default:
      return d.spec?.template?.spec ?? null;
  }
}

/**
 * @param {string} namespace
 * @param {string} kind
 * @param {string} name
 */
function workloadKey(namespace, kind, name) {
  return `namespaced/${namespace}/${kind}/${name}`;
}

/**
 * Declared exact workloads for one E2 release.
 * @param {string} role
 * @param {string} namespace
 * @param {{ containerName: string, renderedReference: string, canonicalReference: string }} expectedImage
 * @param {Record<string, string> | null} helperLocks
 */
function declaredWorkloads(role, namespace, expectedImage, helperLocks) {
  const spec =
    PRIMARY_WORKLOAD[/** @type {keyof typeof PRIMARY_WORKLOAD} */ (role)];
  /** @type {Record<string, { name: string, renderedReference: string, canonicalReference: string }[]>} */
  const declared = {
    [workloadKey(namespace, spec.kind, spec.name)]: [
      {
        name: expectedImage.containerName,
        renderedReference: expectedImage.renderedReference,
        canonicalReference: expectedImage.canonicalReference,
      },
    ],
  };
  if (helperLocks && role === 'prometheus') {
    const ksm = helperLocks['kube-state-metrics'];
    const redis = helperLocks['redis-exporter'];
    declared[workloadKey(namespace, 'Deployment', 'obs-kube-state-metrics')] = [
      {
        name: 'kube-state-metrics',
        renderedReference: helperRenderedReference('kube-state-metrics', ksm),
        canonicalReference: ksm,
      },
    ];
    declared[workloadKey(namespace, 'Deployment', 'obs-redis-exporter')] = [
      {
        name: 'redis-exporter',
        renderedReference: helperRenderedReference('redis-exporter', redis),
        canonicalReference: redis,
      },
    ];
  }
  return declared;
}

/**
 * Exact workload and container membership for an E2 release: every pod
 * bearing object must be declared, with exactly the declared regular
 * containers, no init or ephemeral containers.
 * @param {Record<string, unknown>[]} documents
 * @param {ReturnType<typeof declaredWorkloads>} declared
 * @param {string} namespace
 */
function assertExactWorkloads(documents, declared, namespace) {
  const seen = new Set();
  for (const doc of documents) {
    const d = /** @type {any} */ (doc);
    if (!POD_BEARING_KINDS.has(d.kind)) continue;
    const key = workloadKey(namespace, d.kind, d.metadata?.name);
    const want = declared[key];
    if (!want) throwArtifactInvalid('unexpected workload');
    if (seen.has(key)) throwArtifactInvalid('duplicate workload');
    seen.add(key);
    const podSpec = podSpecOf(doc);
    if (!podSpec) throwArtifactInvalid('missing workload pod spec');
    if ((podSpec.initContainers ?? []).length > 0) {
      throwArtifactInvalid('unexpected init container');
    }
    if ((podSpec.ephemeralContainers ?? []).length > 0) {
      throwArtifactInvalid('unexpected ephemeral container');
    }
    const containers = podSpec.containers ?? [];
    if (containers.length !== want.length) {
      throwArtifactInvalid('unexpected regular container count');
    }
    want.forEach((expected, index) => {
      const actual = containers[index];
      if (actual?.name !== expected.name) {
        throwArtifactInvalid('workload container name mismatch');
      }
      if (actual.image !== expected.renderedReference) {
        throwArtifactInvalid('workload image reference mismatch');
      }
    });
    if (podSpec.hostNetwork || podSpec.hostPID || podSpec.hostIPC) {
      throwArtifactInvalid('unexpected host namespace access');
    }
    if ((podSpec.volumes ?? []).some((v) => v.hostPath)) {
      throwArtifactInvalid('unexpected host path volume');
    }
  }
  for (const key of Object.keys(declared)) {
    if (!seen.has(key)) throwArtifactInvalid('missing declared workload');
  }
}

/**
 * Exact owned cluster RBAC and its subjects.
 * @param {Record<string, unknown>[]} documents
 * @param {string} namespace
 */
function assertExactE2Rbac(documents, namespace) {
  const roles = documents.filter((d) => d.kind === 'ClusterRole');
  const bindings = documents.filter((d) => d.kind === 'ClusterRoleBinding');
  const canonRules = (rules) =>
    (rules ?? [])
      .flatMap((r) => {
        if (
          Object.keys(r).sort().join() !== 'apiGroups,resources,verbs' ||
          r.apiGroups.length !== 1 ||
          r.resources.length !== 1
        ) {
          throwArtifactInvalid('unexpected cluster role rule shape');
        }
        return [`${r.apiGroups[0]}|${r.resources[0]}|${[...r.verbs].sort().join(',')}`];
      })
      .sort();
  const expectedNames = Object.keys(E2_RBAC).sort();
  const names = (docs) => docs.map((d) => /** @type {any} */ (d).metadata.name).sort();
  if (
    JSON.stringify(names(roles)) !== JSON.stringify(expectedNames) ||
    JSON.stringify(names(bindings)) !== JSON.stringify(expectedNames)
  ) {
    throwArtifactInvalid('unexpected cluster rbac set');
  }
  for (const [name, spec] of Object.entries(E2_RBAC)) {
    const role = /** @type {any} */ (roles.find((r) => /** @type {any} */ (r).metadata.name === name));
    const want = spec.rules.map(([g, r, v]) => `${g}|${r}|${v}`).sort();
    if (JSON.stringify(canonRules(role.rules)) !== JSON.stringify(want)) {
      throwArtifactInvalid(`unexpected cluster role rules for ${name}`);
    }
    const binding = /** @type {any} */ (bindings.find((r) => /** @type {any} */ (r).metadata.name === name));
    const ref = binding.roleRef;
    if (
      JSON.stringify(ref) !==
      JSON.stringify({
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name,
      })
    ) {
      throwArtifactInvalid(`unexpected cluster role binding roleRef for ${name}`);
    }
    if (
      JSON.stringify(binding.subjects) !==
      JSON.stringify([
        { kind: 'ServiceAccount', name: spec.serviceAccount, namespace },
      ])
    ) {
      throwArtifactInvalid(`unexpected cluster role binding subjects for ${name}`);
    }
  }
}

/**
 * Exact immutable trust ConfigMap and its read-only mount (Prometheus).
 * @param {Record<string, unknown>[]} documents
 * @param {{ bindingSha256: string, caPem: string }} trust
 * @param {string} namespace
 */
function assertE2Trust(documents, trust, namespace) {
  const maps = documents.filter(
    (d) => d.kind === 'ConfigMap' && /** @type {any} */ (d).metadata.name === KUBELET_TRUST_CONFIGMAP,
  );
  if (maps.length !== 1) throwArtifactInvalid('trust configmap count mismatch');
  const cm = /** @type {any} */ (maps[0]);
  if (
    cm.apiVersion !== 'v1' ||
    cm.metadata.namespace !== namespace ||
    cm.immutable !== true ||
    JSON.stringify(cm.metadata.labels) !==
      JSON.stringify({ [KUBELET_TRUST_OWNER_LABEL]: KUBELET_TRUST_OWNER_VALUE }) ||
    JSON.stringify(cm.metadata.annotations) !==
      JSON.stringify({ [KUBELET_TRUST_ANNOTATION]: trust.bindingSha256 }) ||
    JSON.stringify(cm.data) !== JSON.stringify({ 'ca.pem': trust.caPem }) ||
    cm.binaryData !== undefined
  ) {
    throwArtifactInvalid('trust configmap content mismatch');
  }
  const deployment = /** @type {any} */ (
    documents.find((d) => d.kind === 'Deployment' && /** @type {any} */ (d).metadata.name === 'obs-prometheus')
  );
  const podSpec = deployment?.spec?.template?.spec;
  const volumes = (podSpec?.volumes ?? []).filter(
    (v) => v.configMap?.name === KUBELET_TRUST_CONFIGMAP,
  );
  const mounts = (podSpec?.containers?.[0]?.volumeMounts ?? []).filter(
    (m) => m.mountPath === KUBELET_TRUST_MOUNT,
  );
  if (
    volumes.length !== 1 ||
    mounts.length !== 1 ||
    mounts[0].name !== volumes[0].name ||
    mounts[0].readOnly !== true ||
    mounts[0].subPath
  ) {
    throwArtifactInvalid('trust mount mismatch');
  }
}

/**
 * Exact chart-owned dashboard ConfigMap, directory mount and rollout digest.
 * @param {Record<string, unknown>[]} documents
 * @param {ReturnType<typeof readDashboardAssets>} assets
 * @param {string} namespace
 */
function assertE2Dashboards(documents, assets, namespace) {
  const maps = documents.filter(
    (d) => d.kind === 'ConfigMap' && /** @type {any} */ (d).metadata.name === DASHBOARD_CONFIGMAP,
  );
  if (maps.length !== 1) throwArtifactInvalid('dashboard configmap count mismatch');
  const cm = /** @type {any} */ (maps[0]);
  if (cm.apiVersion !== 'v1' || cm.metadata.namespace !== namespace) {
    throwArtifactInvalid('dashboard configmap identity mismatch');
  }
  const labels = cm.metadata.labels ?? {};
  if (
    labels['dashboard-provider'] !== 'offscreen' ||
    labels['app.kubernetes.io/name'] !== 'grafana' ||
    labels['app.kubernetes.io/instance'] !== 'obs-grafana'
  ) {
    throwArtifactInvalid('dashboard configmap labels mismatch');
  }
  const keys = Object.keys(cm.data ?? {});
  if (JSON.stringify(keys.slice().sort()) !== JSON.stringify(DASHBOARD_FILES)) {
    throwArtifactInvalid('dashboard configmap data keys mismatch');
  }
  for (const asset of assets) {
    if (cm.data[asset.file] !== asset.content) {
      throwArtifactInvalid(`dashboard content mismatch for ${asset.file}`);
    }
  }
  if (cm.binaryData !== undefined) {
    throwArtifactInvalid('dashboard configmap binary data');
  }
  const grafanaConfig = /** @type {any} */ (
    documents.find((d) => d.kind === 'ConfigMap' && /** @type {any} */ (d).metadata.name === 'obs-grafana')
  );
  if (Object.keys(grafanaConfig?.data ?? {}).some((k) => /download/i.test(k))) {
    throwArtifactInvalid('unexpected dashboard download script');
  }
  const deployment = /** @type {any} */ (
    documents.find((d) => d.kind === 'Deployment' && /** @type {any} */ (d).metadata.name === 'obs-grafana')
  );
  const podSpec = deployment?.spec?.template?.spec;
  const volumes = (podSpec?.volumes ?? []).filter(
    (v) => v.configMap?.name === DASHBOARD_CONFIGMAP,
  );
  const mounts = (podSpec?.containers?.[0]?.volumeMounts ?? []).filter(
    (m) => m.mountPath === DASHBOARD_MOUNT_PATH,
  );
  if (
    volumes.length !== 1 ||
    volumes[0].name !== DASHBOARD_VOLUME ||
    mounts.length !== 1 ||
    mounts[0].name !== DASHBOARD_VOLUME ||
    mounts[0].subPath
  ) {
    throwArtifactInvalid('dashboard mount mismatch');
  }
  const annotations = deployment?.spec?.template?.metadata?.annotations ?? {};
  if (annotations[DASHBOARD_DIGEST_ANNOTATION] !== dashboardFilesDigest(assets)) {
    throwArtifactInvalid('dashboard rollout digest mismatch');
  }
}

/**
 * @param {PlatformRun} run
 */
function defaultHelmRun(command, args, options = {}) {
  if (command !== 'helm') {
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unexpected command',
      timedOut: false,
      missing: false,
    };
  }
  const explicit =
    typeof options.timeoutMs === 'number' ? options.timeoutMs : HELM_TIMEOUT_MS;
  const remaining =
    typeof options.remainingMs === 'number'
      ? Math.max(0, Math.floor(options.remainingMs))
      : HELM_TIMEOUT_MS;
  const timeoutMs = Math.min(HELM_TIMEOUT_MS, explicit, remaining);
  return runObservabilityReadCommand(command, args, {
    input: options.input,
    timeoutMs,
  });
}

/**
 * Ordered `-f` values paths followed by storage and image arguments.
 * @param {{ valuesPaths: readonly string[], helmValueArgs: readonly string[] }} release
 */
export function helmValuesArgv(release) {
  return release.valuesPaths
    .flatMap((path) => ['-f', path])
    .concat(release.helmValueArgs);
}

/** @typedef {'desired' | 'predecessor' | 'e2'} ObservabilityArtifactVariant */
/** @typedef {'dev-e1-base' | 'dev-e1-developer' | 'release-e1' | 'dev-e2'} ObservabilityArtifactId */

/** Internal immutable E1 artifact IDs and the profile each belongs to. */
const E1_ARTIFACT_IDS = Object.freeze({
  'dev-e1-base': { profileId: 'dev', variant: 'predecessor' },
  'dev-e1-developer': { profileId: 'dev', variant: 'desired' },
  'release-e1': { profileId: 'release', variant: 'desired' },
});


/**
 * Resolve a historical alias or a named artifact ID to the internal variant
 * and artifact ID.
 * @param {ObservabilityProfileId} profileId
 * @param {ObservabilityArtifactVariant | ObservabilityArtifactId | string | undefined} selector
 * @returns {{ artifactId: ObservabilityArtifactId, variant: ObservabilityArtifactVariant }}
 */
function assertArtifactVariantAllowed(profileId, selector) {
  const selected = selector ?? 'desired';
  if (selected === 'desired' || selected === 'predecessor') {
    if (profileId === 'release' && selected === 'predecessor') {
      throwArtifactInvalid('release predecessor refused');
    }
    const artifactId =
      profileId === 'release'
        ? 'release-e1'
        : selected === 'desired'
          ? 'dev-e1-developer'
          : 'dev-e1-base';
    return { artifactId, variant: selected };
  }
  if (selected === E2_ARTIFACT_ID) {
    if (profileId !== 'dev') {
      throwArtifactInvalid('artifact id does not belong to profile');
    }
    return { artifactId: E2_ARTIFACT_ID, variant: 'e2' };
  }
  if (
    typeof selected !== 'string' ||
    !Object.hasOwn(E1_ARTIFACT_IDS, selected)
  ) {
    throwArtifactInvalid('unknown artifact variant');
  }
  const entry = E1_ARTIFACT_IDS[/** @type {ObservabilityArtifactId} */ (selected)];
  if (entry.profileId !== profileId) {
    throwArtifactInvalid('artifact id does not belong to profile');
  }
  return {
    artifactId: /** @type {ObservabilityArtifactId} */ (selected),
    variant: entry.variant,
  };
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {ObservabilityArtifactVariant} variant
 * @param {string} role
 * @param {string} valuesFile
 */
function resolveValuesPaths(profileId, variant, role, valuesFile) {
  if (variant === 'e2') {
    const base = join(valuesRoot, valuesFile);
    if (role === 'prometheus' || role === 'grafana') {
      return [base, join(valuesRoot, 'profiles', 'dev', valuesFile)];
    }
    if (role === 'collector') return [base, DEV_COLLECTOR_OVERLAY];
    return [base];
  }
  if (role !== 'collector') {
    return [join(valuesRoot, valuesFile)];
  }
  const base = join(valuesRoot, 'collector.yaml');
  if (profileId === 'release' || variant === 'predecessor') {
    return [base];
  }
  return [base, DEV_COLLECTOR_OVERLAY];
}

/**
 * @param {readonly string[]} valuesPaths
 */
function readAndValidateValues(valuesPaths) {
  for (const valuesPath of valuesPaths) {
    let valuesText;
    try {
      valuesText = readFileSync(valuesPath, 'utf8');
    } catch {
      throwArtifactInvalid('missing values yaml');
    }
    try {
      parseYaml(valuesText);
    } catch {
      throwArtifactInvalid('malformed values yaml');
    }
  }
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {ObservabilityArtifactVariant} variant
 * @param {{ verifyArchive: boolean, pins: ReturnType<typeof loadPins>, imageLocks: Record<string, string>, e2?: ReturnType<typeof buildE2Context> | null }} context
 * @param {ReturnType<typeof readPlatformProfile>} profile
 */
function buildValidatedReleasePlans(profileId, variant, context, profile) {
  /** @type {{ release: (typeof OBSERVABILITY_RELEASE_ORDER)[number], pin: { name: string, version: string, sha256: string, appVersion: string }, chartPath: string, valuesPaths: string[], helmValueArgs: string[], expectedImage: { containerName: string, renderedReference: string, canonicalReference: string } }[]} */
  const releasePlans = [];

  for (const release of OBSERVABILITY_RELEASE_ORDER) {
    const pin = context.pins[release.role];
    if (
      typeof pin?.name !== 'string' ||
      pin.name.length === 0 ||
      typeof pin.version !== 'string' ||
      pin.version.length === 0 ||
      typeof pin.appVersion !== 'string' ||
      pin.appVersion.length === 0 ||
      typeof pin.sha256 !== 'string' ||
      pin.sha256.length === 0
    ) {
      throwArtifactInvalid(`missing pin for ${release.role}`);
    }
    const archiveName = `${pin.name}-${pin.version}.tgz`;
    const chartPath = join(vendorRoot, archiveName);
    if (context.verifyArchive) {
      const actualHex = fileSha256Hex(chartPath);
      if (actualHex.toLowerCase() !== pin.sha256.toLowerCase()) {
        throwArtifactInvalid(`archive sha256 mismatch for ${archiveName}`);
      }
    }
    const valuesPaths = resolveValuesPaths(
      profileId,
      variant,
      release.role,
      release.valuesFile,
    );
    readAndValidateValues(valuesPaths);
    const canonicalReference = context.imageLocks[release.role];
    if (!canonicalReference) {
      throwArtifactInvalid('missing image lock role');
    }
    const expectedImage = buildExpectedImage(
      release.role,
      context.pins,
      canonicalReference,
    );
    const helmValueArgs = [
      ...storageSubstitutionArgs(release.role, profile.storageClass),
      ...expectedImage.imageArgs,
      ...(context.e2 && release.role === 'prometheus'
        ? e2PrometheusArgs(context.e2.trust)
        : []),
      ...(context.e2 && release.role === 'grafana'
        ? e2GrafanaArgs(context.e2.assets)
        : []),
    ];
    releasePlans.push({
      release,
      pin,
      chartPath,
      valuesPaths,
      helmValueArgs,
      expectedImage: {
        containerName: expectedImage.containerName,
        renderedReference: expectedImage.renderedReference,
        canonicalReference: expectedImage.canonicalReference,
      },
    });
  }
  return releasePlans;
}

/**
 * @param {ReturnType<typeof buildValidatedReleasePlans>[number]} plan
 * @param {PlatformRun} run
 * @param {string} namespace
 */
function renderValidatedPlan(plan, run, namespace, e2 = null) {
  const helmArgs = [
    'template',
    plan.release.name,
    plan.chartPath,
    '--namespace',
    namespace,
    ...helmValuesArgv(plan),
  ];
  const rendered = run('helm', helmArgs, { timeoutMs: HELM_TIMEOUT_MS });
  if (!rendered.ok || rendered.timedOut || rendered.missing) {
    throwArtifactInvalid(`helm render failed for ${plan.release.name}`);
  }
  const releaseDocs = parseHelmDocuments(rendered.stdout);
  rejectForbiddenDocuments(releaseDocs, namespace);
  assertPrimaryWorkloadImage(
    releaseDocs,
    plan.release.role,
    plan.expectedImage,
  );
  /** @type {ReturnType<typeof declaredWorkloads>} */
  let expectedWorkloads;
  if (e2) {
    expectedWorkloads = declaredWorkloads(
      plan.release.role,
      namespace,
      plan.expectedImage,
      e2.helperLocks,
    );
    assertExactWorkloads(releaseDocs, expectedWorkloads, namespace);
    if (plan.release.role === 'prometheus') {
      assertExactE2Rbac(releaseDocs, namespace);
      assertE2Trust(releaseDocs, e2.trust, namespace);
    } else if (plan.release.role === 'grafana') {
      assertE2Dashboards(releaseDocs, e2.assets, namespace);
    } else if (
      releaseDocs.some((d) => E2_CLUSTER_KINDS.has(/** @type {string} */ (d.kind)))
    ) {
      throwArtifactInvalid('unexpected cluster-scoped object');
    }
  } else {
    expectedWorkloads = declaredWorkloads(
      plan.release.role,
      namespace,
      plan.expectedImage,
      null,
    );
  }
  const { direct, generated } = collectReleaseInventoryRows(
    releaseDocs,
    plan.release.role,
    plan.release.name,
    namespace,
    Boolean(e2),
  );
  return {
    name: plan.release.name,
    role: plan.release.role,
    chartPath: plan.chartPath,
    chartName: plan.pin.name,
    chartVersion: plan.pin.version,
    appVersion: plan.pin.appVersion,
    sha256: plan.pin.sha256,
    valuesPaths: plan.valuesPaths,
    helmValueArgs: plan.helmValueArgs,
    expectedImage: plan.expectedImage,
    expectedWorkloads,
    documents: releaseDocs,
    inventory: { direct, generated },
  };
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {ReturnType<typeof renderValidatedPlan>[]} renderedReleases
 * @param {ReturnType<typeof readPlatformProfile>} profile
 * @param {Record<string, unknown>} expected
 * @param {Record<string, string>} imageLocks
 * @param {ObservabilityArtifactId} artifactId
 * @param {ReturnType<typeof buildE2Context> | null} [e2]
 */
function finalizeArtifactBundle(
  profileId,
  renderedReleases,
  profile,
  expected,
  imageLocks,
  artifactId,
  e2 = null,
) {
  /** @type {Record<string, unknown>[]} */
  const documents = [];
  /** @type {[string, string, string, string, string][]} */
  const allDirect = [];
  /** @type {[string, string, string, string, string][]} */
  const allGenerated = [];
  for (const row of renderedReleases) {
    documents.push(...row.documents);
    allDirect.push(...row.inventory.direct);
    allGenerated.push(...row.inventory.generated);
  }
  assertInventoryMatch(profileId, expected, allDirect, allGenerated);

  return {
    artifactId,
    profile,
    releases: renderedReleases.map((row) => {
      const { inventory, ...rest } = row;
      void inventory;
      return rest;
    }),
    documents,
    expectedInventory: expected,
    imageLocks,
    ...(e2
      ? {
          helperImageLocks: e2.helperLocks,
          kubeletTrustBindingSha256: e2.trust.bindingSha256,
          kubeletTrust: e2.trust.binding,
          dashboardFilesSha256: dashboardFilesDigest(e2.assets),
        }
      : {}),
  };
}

/**
 * @param {{ kubeletTrust?: unknown, helperImageLocks?: Record<string, string> }} deps
 */
function buildE2Context(deps) {
  if (deps.kubeletTrust === undefined || deps.kubeletTrust === null) {
    throwArtifactInvalid(KUBELET_TRUST_UNAVAILABLE_REASON);
  }
  const trust = validateKubeletTrustBinding(deps.kubeletTrust);
  let helperLocks = deps.helperImageLocks;
  if (helperLocks) {
    validateHelperLockRecord(helperLocks);
  } else {
    helperLocks = parseHelperImageLock(
      readFileSync(join(locksRoot, 'e2-images.tsv'), 'utf8'),
    );
  }
  return { trust, helperLocks, assets: readDashboardAssets() };
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {{ run?: PlatformRun, verifyArchive?: boolean, imageLocks?: Record<string, string>, pins?: ReturnType<typeof loadPins>, variant?: ObservabilityArtifactVariant | ObservabilityArtifactId, kubeletTrust?: unknown, helperImageLocks?: Record<string, string> }} [deps]
 */
export function loadArtifacts(profileId, deps = {}) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error(`unsupported platform profile: ${profileId}`);
  }
  const run = deps.run ?? defaultHelmRun;
  const verifyArchive = deps.verifyArchive !== false;
  const { artifactId, variant } = assertArtifactVariantAllowed(
    profileId,
    deps.variant,
  );
  const profile = readPlatformProfile(profileId);
  const namespace = profile.namespaces.observability;
  if (typeof namespace !== 'string' || namespace.length === 0) {
    throwArtifactInvalid('observability namespace missing from profile');
  }
  const isE2 = artifactId === E2_ARTIFACT_ID;
  if (!isE2 && (deps.kubeletTrust !== undefined || deps.helperImageLocks)) {
    throwArtifactInvalid('e2 inputs supplied to a historical artifact');
  }
  const e2 = isE2 ? buildE2Context(deps) : null;

  const pins = deps.pins ?? loadPins();
  const canonicalImageLocks = parseImageLock(
    readFileSync(join(locksRoot, 'images.tsv'), 'utf8'),
  );
  const imageLocks = deps.imageLocks ?? canonicalImageLocks;
  if (deps.imageLocks) {
    validateImageLockRecord(imageLocks);
  }
  const expectedInventory = JSON.parse(
    readFileSync(join(observabilityRoot, 'expected-inventory.json'), 'utf8'),
  );
  const expected = expectedInventory[isE2 ? E2_INVENTORY_KEY : profileId];
  if (!expected?.direct || !expected?.generatedClaims) {
    throwArtifactInvalid('missing expected inventory profile');
  }

  const context = { verifyArchive, pins, imageLocks, e2 };
  const releasePlans = buildValidatedReleasePlans(
    profileId,
    variant,
    context,
    profile,
  );
  const renderedReleases = releasePlans.map((plan) =>
    renderValidatedPlan(plan, run, namespace, e2),
  );
  return finalizeArtifactBundle(
    profileId,
    renderedReleases,
    profile,
    expected,
    imageLocks,
    artifactId,
    e2,
  );
}

/**
 * Exact desired and admissible operational artifacts for a profile.
 * Release admits only release-e1. Dev admits the two historical E1 bundles
 * and, when a verified cluster-bound trust binding is supplied or readable,
 * the E2 bundle as desired. Without trust, desired is null with an explicit
 * reason; the historical bundles stay admissible and the static E2 inventory
 * identities stay observable. There is never an E1 fallback for desired.
 * @param {ObservabilityProfileId} profileId
 * @param {{ run?: PlatformRun, verifyArchive?: boolean, imageLocks?: Record<string, string>, pins?: ReturnType<typeof loadPins>, kubeletTrust?: unknown, readKubeletTrust?: () => unknown, helperImageLocks?: Record<string, string> }} [deps]
 */
export function loadOperationalArtifactSet(profileId, deps = {}) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error(`unsupported platform profile: ${profileId}`);
  }
  const {
    kubeletTrust: suppliedTrust,
    readKubeletTrust,
    helperImageLocks,
    ...common
  } = deps;
  if (profileId === 'release') {
    if (suppliedTrust !== undefined || readKubeletTrust || helperImageLocks) {
      throwArtifactInvalid('e2 inputs supplied to the release profile');
    }
    const { desired } = loadObservabilityVariants('release', common);
    return {
      desired,
      desiredArtifactId: 'release-e1',
      desiredUnavailableReason: null,
      admissible: [desired],
      staticInventory: null,
    };
  }
  const { desired: developer, predecessor: base } = loadObservabilityVariants(
    'dev',
    common,
  );
  /** @type {unknown} */
  let trust = suppliedTrust;
  if (trust === undefined && typeof readKubeletTrust === 'function') {
    try {
      trust = readKubeletTrust();
    } catch (error) {
      if (
        /** @type {{ code?: string }} */ (error)?.code ===
        KUBELET_TRUST_UNAVAILABLE_REASON
      ) {
        trust = undefined;
      } else {
        throw error;
      }
    }
  }
  const expectedInventory = JSON.parse(
    readFileSync(join(observabilityRoot, 'expected-inventory.json'), 'utf8'),
  );
  const staticInventory = deepFreezeCopy(expectedInventory[E2_INVENTORY_KEY]);
  if (trust === undefined || trust === null) {
    return {
      desired: null,
      desiredArtifactId: E2_ARTIFACT_ID,
      desiredUnavailableReason: KUBELET_TRUST_UNAVAILABLE_REASON,
      admissible: [base, developer],
      staticInventory,
    };
  }
  const e2 = loadArtifacts('dev', {
    ...common,
    variant: E2_ARTIFACT_ID,
    kubeletTrust: trust,
    helperImageLocks,
  });
  return {
    desired: e2,
    desiredArtifactId: E2_ARTIFACT_ID,
    desiredUnavailableReason: null,
    admissible: [base, developer, e2],
    staticInventory,
  };
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {{ run?: PlatformRun, verifyArchive?: boolean, imageLocks?: Record<string, string>, pins?: ReturnType<typeof loadPins> }} [deps]
 */
export function loadObservabilityVariants(profileId, deps = {}) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error(`unsupported platform profile: ${profileId}`);
  }
  const run = deps.run ?? defaultHelmRun;
  const verifyArchive = deps.verifyArchive !== false;
  const profile = readPlatformProfile(profileId);
  const namespace = profile.namespaces.observability;
  if (typeof namespace !== 'string' || namespace.length === 0) {
    throwArtifactInvalid('observability namespace missing from profile');
  }

  const pins = deps.pins ?? loadPins();
  const canonicalImageLocks = parseImageLock(
    readFileSync(join(locksRoot, 'images.tsv'), 'utf8'),
  );
  const imageLocks = deps.imageLocks ?? canonicalImageLocks;
  if (deps.imageLocks) {
    validateImageLockRecord(imageLocks);
  }
  const expectedInventory = JSON.parse(
    readFileSync(join(observabilityRoot, 'expected-inventory.json'), 'utf8'),
  );
  const expected = expectedInventory[profileId];
  if (!expected?.direct || !expected?.generatedClaims) {
    throwArtifactInvalid('missing expected inventory profile');
  }

  const context = { verifyArchive, pins, imageLocks };
  const desiredPlans = buildValidatedReleasePlans(
    profileId,
    'desired',
    context,
    profile,
  );
  const desiredRendered = desiredPlans.map((plan) =>
    renderValidatedPlan(plan, run, namespace),
  );
  const desired = finalizeArtifactBundle(
    profileId,
    desiredRendered,
    profile,
    expected,
    imageLocks,
    profileId === 'release' ? 'release-e1' : 'dev-e1-developer',
  );

  if (profileId === 'release') {
    return { desired, predecessor: null };
  }

  const collectorPlan = desiredPlans.find(
    (plan) => plan.release.role === 'collector',
  );
  if (!collectorPlan) {
    throwArtifactInvalid('missing collector release plan');
  }
  const baseCollectorPlan = {
    ...collectorPlan,
    valuesPaths: [join(valuesRoot, 'collector.yaml')],
  };
  const baseCollectorRendered = renderValidatedPlan(
    baseCollectorPlan,
    run,
    namespace,
  );
  const predecessorRendered = desiredRendered.map((row) =>
    row.role === 'collector' ? baseCollectorRendered : row,
  );
  const predecessor = finalizeArtifactBundle(
    profileId,
    predecessorRendered,
    profile,
    expected,
    imageLocks,
    'dev-e1-base',
  );
  return { desired, predecessor };
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {{ run?: PlatformRun }} [deps]
 */
export function renderObservabilityDocuments(profileId, deps = {}) {
  return loadArtifacts(profileId, deps).documents;
}

/**
 * @param {ObservabilityProfileId} profileId
 * @param {{ run?: PlatformRun }} [deps]
 */
export function lintObservability(profileId, deps = {}) {
  loadArtifacts(profileId, deps);
}
