import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPlatformCommand } from './commands.mjs';
import {
  POSTGRES_OPERATOR_PIN_KEYS,
  TEMPORAL_IMAGE_PIN_KEYS,
  parsePins,
} from './pins.mjs';
import { readPlatformProfile } from './profile.mjs';

const commonRoot = dirname(fileURLToPath(import.meta.url));
const platformRoot = join(commonRoot, '..');

const HELM_TIMEOUT_MS = 30_000;
const DIAGNOSTIC_LIMIT = 1000;

export const PLATFORM_SERVICES = new Set([
  'postgres',
  'temporal',
  'object-storage',
  'redis',
  'rabbitmq',
  'observability',
]);

const RELEASE_ONLY_SERVICES = new Set(['rabbitmq', 'observability']);

/** @type {Record<string, Set<string>>} */
const SERVICE_SECTIONS = {
  postgres: new Set(['all', 'namespace', 'cluster']),
  temporal: new Set([
    'all',
    'namespace',
    'postgres',
    'schema',
    'server',
    'admin',
    'namespace-job',
  ]),
  'object-storage': new Set(['all', 'namespace', 'workloads']),
  redis: new Set(['all']),
  rabbitmq: new Set(['all', 'namespace', 'broker']),
  observability: new Set(['all']),
};

const TEMPORAL_RELEASE_ONLY_SECTIONS = new Set(['admin', 'namespace-job']);

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
  if (service === 'temporal') return new Set([profile.namespaces.temporal]);
  if (service === 'object-storage')
    return new Set([profile.namespaces.objectStorage]);
  if (service === 'redis') {
    const ns = profileId === 'release' ? 'lab-a' : profile.namespaces.redis;
    if (typeof ns === 'string' && ns.length > 0) return new Set([ns]);
  }
  if (service === 'rabbitmq' && profileId === 'release')
    return new Set(['messaging']);
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
  if (service === 'temporal') {
    const text = readFileSync(
      join(platformRoot, 'temporal', 'images.pin'),
      'utf8',
    );
    const pins = parsePins(text, TEMPORAL_IMAGE_PIN_KEYS);
    return {
      images: {
        server: pins.SERVER_IMAGE,
        admin: pins.ADMIN_IMAGE,
        postgres: pins.POSTGRES_IMAGE,
      },
    };
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
  if (
    service === 'temporal' &&
    TEMPORAL_RELEASE_ONLY_SECTIONS.has(section) &&
    profile === 'dev'
  ) {
    throw new Error(`section ${section} is release-only`);
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
  const result = run(
    'helm',
    ['lint', helm.chartPath, '-f', helm.profilePath, '-f', '-', '--strict'],
    { input: helm.stdin, timeoutMs: HELM_TIMEOUT_MS },
  );
  if (!result.ok || result.timedOut || result.missing) {
    throw new Error(`helm lint failed: ${boundedHelmDiagnostic(result)}`);
  }
  return { ok: true };
}
