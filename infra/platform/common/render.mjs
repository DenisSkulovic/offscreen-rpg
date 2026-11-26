import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAllDocuments } from 'yaml';
import { runPlatformCommand } from './commands.mjs';
import { POSTGRES_OPERATOR_PIN_KEYS, parsePins } from './pins.mjs';
import { readPlatformProfile } from './profile.mjs';

const commonRoot = dirname(fileURLToPath(import.meta.url));
const platformRoot = join(commonRoot, '..');

const HELM_TIMEOUT_MS = 30_000;
const DIAGNOSTIC_LIMIT = 1000;

export const PLATFORM_SERVICES = new Set([
  'postgres',
  'object-storage',
  'redis',
  'rabbitmq',
  'observability',
]);

const RELEASE_ONLY_SERVICES = new Set(['observability']);

/** @type {Record<string, Set<string>>} */
const SERVICE_SECTIONS = {
  postgres: new Set(['all', 'namespace', 'cluster']),
  'object-storage': new Set(['all', 'namespace', 'workloads']),
  redis: new Set(['all']),
  rabbitmq: new Set(['all', 'namespace', 'broker']),
  observability: new Set(['all']),
};

const ALLOWED_KINDS = new Set([
  'Namespace',
  'Service',
  'Deployment',
  'StatefulSet',
  'Job',
  'ConfigMap',
  'Cluster',
  'PersistentVolumeClaim',
  'RabbitmqCluster',
]);

/**
 * @param {string} service
 * @param {'dev' | 'release'} profileId
 */
export function allowedNamespacesForService(service, profileId) {
  const profile = readPlatformProfile(profileId);
  if (service === 'postgres') return new Set([profile.namespaces.postgres]);
  if (service === 'object-storage')
    return new Set([profile.namespaces.objectStorage]);
  if (service === 'redis') {
    const ns = profileId === 'release' ? 'lab-a' : profile.namespaces.redis;
    if (typeof ns === 'string' && ns.length > 0) return new Set([ns]);
  }
  if (service === 'rabbitmq') return new Set([profile.namespaces.rabbitmq]);
  if (service === 'observability' && profileId === 'release')
    return new Set(['lab-a']);
  return new Set();
}

/**
 * @param {object} doc
 */
export function documentIdentity(doc) {
  const ns = doc.metadata?.namespace ?? '-';
  const name = doc.metadata?.name ?? '-';
  return `${doc.kind}/${ns}/${name}`;
}

/**
 * @param {string} output
 * @param {{ service: string, profile: 'dev' | 'release' }} context
 */
export function parsePlatformDocuments(output, context) {
  const allowedNs = allowedNamespacesForService(
    context.service,
    context.profile,
  );
  const docs = [];
  const seen = new Set();
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line === '---' || line.startsWith('#')) continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error('malformed platform document');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('malformed platform document');
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'Error')) {
      throw new Error(
        `helm emitted Error field: ${String(parsed.Error).slice(0, 200)}`,
      );
    }
    const kind = parsed.kind;
    if (kind === 'Secret') {
      throw new Error('secret documents are not allowed');
    }
    if (typeof kind !== 'string' || !ALLOWED_KINDS.has(kind)) {
      throw new Error(`unknown resource kind: ${kind ?? 'missing'}`);
    }
    if (parsed.metadata?.clusterName != null) {
      throw new Error('cluster metadata is not allowed');
    }
    const name = parsed.metadata?.name;
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('metadata.name is required');
    }
    if (kind === 'Namespace') {
      if (parsed.metadata?.namespace != null) {
        throw new Error('namespace documents must not set metadata.namespace');
      }
      if (!allowedNs.has(name)) {
        throw new Error(
          `namespace ${name} is not allowed for ${context.service}/${context.profile}`,
        );
      }
    } else {
      const ns = parsed.metadata?.namespace;
      if (typeof ns !== 'string' || !allowedNs.has(ns)) {
        throw new Error(
          `namespace ${ns ?? 'missing'} is not allowed for ${context.service}/${context.profile}`,
        );
      }
    }
    const key = documentIdentity(parsed);
    if (seen.has(key)) throw new Error(`duplicate platform identity: ${key}`);
    seen.add(key);
    docs.push(parsed);
  }
  if (docs.length === 0) throw new Error('helm produced no platform documents');
  return docs;
}

/**
 * @param {ReturnType<typeof runPlatformCommand>} result
 */
function boundedHelmDiagnostic(result) {
  const parts = [];
  if (result.timedOut) parts.push('timedOut=true');
  if (result.status != null) parts.push(`exit=${result.status}`);
  const stderr = (result.stderr ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-5)
    .join(' | ');
  if (stderr) parts.push(stderr.slice(-800));
  return parts.join('; ').slice(0, DIAGNOSTIC_LIMIT);
}

/**
 * @param {{ run?: typeof runPlatformCommand }} [options]
 */
export function assertHelmAvailable({ run = runPlatformCommand } = {}) {
  const result = run('helm', ['version', '--short'], { timeoutMs: 5000 });
  if (!result.ok || result.timedOut || result.missing) {
    throw new Error('helm is not available');
  }
  const short = (result.stdout ?? '').trim().split(/\r?\n/)[0] ?? '';
  if (!/^v[34]\./.test(short)) {
    throw new Error(`unsupported helm version: ${short || 'unknown'}`);
  }
  return short;
}

/**
 * @param {'dev' | 'release'} profile
 */
function profileFileName(profile) {
  return profile === 'dev' ? 'development.yaml' : 'release.yaml';
}

/**
 * @param {string} service
 * @param {{ chartRoot?: string }} [deps]
 */
export function resolvePlatformChartPath(service, deps = {}) {
  if (deps.chartRoot) {
    return deps.chartRoot;
  }
  if (service === 'object-storage') {
    return join(platformRoot, service, 'providers', 'seaweedfs', 'chart');
  }
  return join(platformRoot, service, 'chart');
}

/**
 * @param {string} service
 * @param {'dev' | 'release'} profile
 * @param {{ chartRoot?: string }} [deps]
 */
export function resolvePlatformProfilePath(service, profile, deps = {}) {
  const chartPath = resolvePlatformChartPath(service, deps);
  return join(chartPath, 'profiles', profileFileName(profile));
}

/**
 * @param {string} service
 */
function readPinOverlay(service) {
  if (service === 'postgres') {
    const text = readFileSync(
      join(platformRoot, 'postgres', 'operator.pin'),
      'utf8',
    );
    const pins = parsePins(text, POSTGRES_OPERATOR_PIN_KEYS);
    return { images: { postgres: pins.POSTGRES_IMAGE } };
  }
  return {};
}

/**
 * @param {string} service
 * @param {'dev' | 'release'} profile
 * @param {string} section
 */
export function assertPlatformRenderRequest(service, profile, section) {
  if (!PLATFORM_SERVICES.has(service)) {
    throw new Error(`unsupported service: ${service}`);
  }
  if (profile !== 'dev' && profile !== 'release') {
    throw new Error(`unsupported profile: ${profile}`);
  }
  if (RELEASE_ONLY_SERVICES.has(service) && profile === 'dev') {
    throw new Error(`${service} is release-only`);
  }
  const sections = SERVICE_SECTIONS[service];
  if (!sections?.has(section)) {
    throw new Error(`unsupported section: ${section}`);
  }
}

/**
 * @param {string} service
 * @param {'dev' | 'release'} profile
 * @param {string} section
 * @param {{ run?: typeof runPlatformCommand, chartRoot?: string, stdinOverlay?: Record<string, unknown> }} [deps]
 */
export function helmPlatformStdin(service, profile, section, deps = {}) {
  assertPlatformRenderRequest(service, profile, section);
  if (service === 'object-storage') {
    const overlay = { ...(deps.stdinOverlay ?? {}) };
    if (Object.keys(overlay).length === 0) {
      return undefined;
    }
    return `${JSON.stringify(overlay)}\n`;
  }
  const overlay = {
    section,
    ...readPinOverlay(service),
    ...(deps.stdinOverlay ?? {}),
  };
  return `${JSON.stringify(overlay)}\n`;
}

/**
 * @param {string} service
 * @param {'dev' | 'release'} profile
 * @param {string} section
 * @param {{ run?: typeof runPlatformCommand, chartRoot?: string }} [deps]
 */
function helmPlatformArgs(service, profile, section, deps = {}) {
  const chartPath = resolvePlatformChartPath(service, deps);
  const profilePath = resolvePlatformProfilePath(service, profile, deps);
  if (service === 'object-storage') {
    const platformProfile = readPlatformProfile(profile);
    const stdin = helmPlatformStdin(service, profile, section, deps);
    /** @type {string[]} */
    const args = [
      'template',
      `platform-${service}`,
      chartPath,
      '-f',
      profilePath,
      '--namespace',
      platformProfile.namespaces.objectStorage,
    ];
    if (stdin != null) {
      args.push('-f', '-');
    }
    return { chartPath, profilePath, args, stdin };
  }
  return {
    chartPath,
    profilePath,
    args: [
      'template',
      `platform-${service}`,
      chartPath,
      '-f',
      profilePath,
      '-f',
      '-',
    ],
    stdin: helmPlatformStdin(service, profile, section, deps),
  };
}

/** @param {'dev' | 'release'} profileId */
function syntheticObjectStorageNamespace(profileId) {
  const profile = readPlatformProfile(profileId);
  const name = profile.namespaces.objectStorage;
  const labels =
    profileId === 'dev'
      ? { 'offscreen.dev/owner': 'offscreen-dev' }
      : { 'offscreen.rpg/lab': 'disposable' };
  return {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: { name, labels },
  };
}

/**
 * @param {string} output
 * @param {'dev' | 'release'} profileId
 */
export function parseObjectStorageHelmDocuments(output, profileId) {
  const profile = readPlatformProfile(profileId);
  const expectedNs = profile.namespaces.objectStorage;
  const requiredWorkloadIdentities = [
    `Deployment/${expectedNs}/object-store`,
    `Service/${expectedNs}/object-store`,
    `PersistentVolumeClaim/${expectedNs}/object-store-data`,
  ];

  const parsed = parseAllDocuments(output);
  /** @type {object[]} */
  const workloads = [];
  const seen = new Set();
  for (const doc of parsed) {
    if (doc.errors.length > 0) {
      throw new Error('malformed platform document');
    }
    const js = doc.toJS();
    if (js === null) continue;
    if (!js || typeof js !== 'object' || Array.isArray(js)) {
      throw new Error('malformed platform document');
    }
    if (Object.prototype.hasOwnProperty.call(js, 'Error')) {
      throw new Error(
        `helm emitted Error field: ${String(js.Error).slice(0, 200)}`,
      );
    }
    const kind = js.kind;
    if (kind === 'Secret') {
      throw new Error('secret documents are not allowed');
    }
    if (typeof kind !== 'string' || kind === 'Namespace') {
      throw new Error(`unknown resource kind: ${kind ?? 'missing'}`);
    }
    if (js.metadata?.clusterName != null) {
      throw new Error('cluster metadata is not allowed');
    }
    const name = js.metadata?.name;
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('metadata.name is required');
    }
    const ns = js.metadata?.namespace;
    if (typeof ns !== 'string' || ns !== expectedNs) {
      throw new Error(
        `namespace ${ns ?? 'missing'} is not allowed for object-storage/${profileId}`,
      );
    }
    const key = documentIdentity(js);
    if (seen.has(key)) throw new Error(`duplicate platform identity: ${key}`);
    seen.add(key);
    workloads.push(js);
  }
  for (const identity of requiredWorkloadIdentities) {
    if (!seen.has(identity)) {
      throw new Error(
        `unexpected platform resource identity: missing ${identity}`,
      );
    }
  }
  const unexpected = [...seen].filter(
    (id) => !requiredWorkloadIdentities.includes(id),
  );
  if (unexpected.length > 0) {
    throw new Error(`unexpected platform resource identity: ${unexpected[0]}`);
  }
  return workloads;
}

/**
 * @param {object[]} workloads
 * @param {'dev' | 'release'} profileId
 * @param {string} section
 */
function assembleObjectStorageDocuments(workloads, profileId, section) {
  const namespaceDoc = syntheticObjectStorageNamespace(profileId);
  const byKindName = new Map(
    workloads.map((doc) => [`${doc.kind}/${doc.metadata.name}`, doc]),
  );
  const orderedWorkloads = [
    byKindName.get('PersistentVolumeClaim/object-store-data'),
    byKindName.get('Deployment/object-store'),
    byKindName.get('Service/object-store'),
  ];
  if (orderedWorkloads.some((doc) => doc == null)) {
    throw new Error('object-storage render is incomplete');
  }
  const all = [namespaceDoc, ...orderedWorkloads];
  if (section === 'all') return all;
  if (section === 'namespace') return [namespaceDoc];
  if (section === 'workloads') return orderedWorkloads;
  throw new Error(`unsupported section: ${section}`);
}

/**
 * @param {{ service: string, profile: 'dev' | 'release', section?: string }} input
 * @param {{ run?: typeof runPlatformCommand, chartRoot?: string, stdinOverlay?: Record<string, unknown> }} [deps]
 */
/**
 * @param {{ service: string, profile: 'dev' | 'release', section?: string }} input
 * @param {{ run?: typeof runPlatformCommand, chartRoot?: string, stdinOverlay?: Record<string, unknown> }} [deps]
 */
export function renderPlatformManifestText(
  { service, profile, section = 'all' },
  { run = runPlatformCommand, chartRoot, stdinOverlay } = {},
) {
  assertPlatformRenderRequest(service, profile, section);
  const helm = helmPlatformArgs(service, profile, section, {
    chartRoot,
    stdinOverlay,
  });
  const result = run('helm', helm.args, {
    input: helm.stdin,
    timeoutMs: HELM_TIMEOUT_MS,
  });
  if (!result.ok || result.timedOut || result.missing) {
    throw new Error(`helm template failed: ${boundedHelmDiagnostic(result)}`);
  }
  const output = result.stdout ?? '';
  if (!output.trim()) {
    throw new Error('helm template failed: empty output');
  }
  if (service === 'object-storage') {
    const workloads = parseObjectStorageHelmDocuments(output, profile);
    return renderPlatformYaml(
      assembleObjectStorageDocuments(workloads, profile, section),
    );
  }
  return output;
}

/**
 * @param {{ service: string, profile: 'dev' | 'release', section?: string }} input
 * @param {{ run?: typeof runPlatformCommand, chartRoot?: string, stdinOverlay?: Record<string, unknown> }} [deps]
 */
export function renderPlatformDocuments(
  { service, profile, section = 'all' },
  { run = runPlatformCommand, chartRoot, stdinOverlay } = {},
) {
  assertPlatformRenderRequest(service, profile, section);
  const helm = helmPlatformArgs(service, profile, section, {
    chartRoot,
    stdinOverlay,
  });
  const result = run('helm', helm.args, {
    input: helm.stdin,
    timeoutMs: HELM_TIMEOUT_MS,
  });
  if (!result.ok || result.timedOut || result.missing) {
    throw new Error(`helm template failed: ${boundedHelmDiagnostic(result)}`);
  }
  const output = result.stdout ?? '';
  if (!output.trim()) {
    throw new Error('helm template failed: empty output');
  }
  if (service === 'object-storage') {
    const workloads = parseObjectStorageHelmDocuments(output, profile);
    return assembleObjectStorageDocuments(workloads, profile, section);
  }
  return parsePlatformDocuments(output, { service, profile });
}

/**
 * @param {object[]} documents
 */
export function renderPlatformYaml(documents) {
  return documents
    .map((doc) => `---\n${JSON.stringify(doc)}`)
    .join('\n')
    .concat('\n');
}

/**
 * @param {{ service: string, profile: 'dev' | 'release' }} input
 * @param {{ run?: typeof runPlatformCommand, chartRoot?: string }} [deps]
 */
export function lintPlatformChart(
  { service, profile },
  { run = runPlatformCommand, chartRoot } = {},
) {
  assertPlatformRenderRequest(service, profile, 'all');
  const helm = helmPlatformArgs(service, profile, 'all', { chartRoot });
  /** @type {string[]} */
  const lintArgs = ['lint', helm.chartPath, '-f', helm.profilePath, '--strict'];
  if (helm.stdin != null) {
    lintArgs.push('-f', '-');
  }
  const result = run('helm', lintArgs, {
    input: helm.stdin,
    timeoutMs: HELM_TIMEOUT_MS,
  });
  if (!result.ok || result.timedOut || result.missing) {
    throw new Error(`helm lint failed: ${boundedHelmDiagnostic(result)}`);
  }
  return { ok: true };
}
