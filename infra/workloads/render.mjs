import { spawnSync } from 'node:child_process';
import { accessSync, constants, lstatSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { formatManifestDocuments } from '../platform/common/manifest-output.mjs';

const workloadsRoot = join(dirname(fileURLToPath(import.meta.url)));
const chartPath = join(workloadsRoot, 'chart');
const profilesRoot = join(workloadsRoot, 'profiles');

const ALLOWED_KINDS = new Set(['Namespace', 'Service', 'Deployment', 'Job']);
const RELEASE_SECTIONS = new Set([
  'all',
  'deployments',
  'namespaces',
  'services',
  'migration',
  'edge',
  'authority',
  'workers',
]);
const ROLES = ['web', 'api', 'authority', 'control', 'executor', 'relay'];
const VALUES_ALLOWED_TOP_KEYS = new Set([
  'replicas',
  'replicasByRole',
  'resources',
]);
const HELM_TIMEOUT_MS = 30_000;
const HELM_MAX_BUFFER = 4 * 1024 * 1024;
const DIAGNOSTIC_LIMIT = 1000;
const ACCEPTED_MANIFEST_FORMATS = new Set(['yaml', 'json', 'legacy']);

/**
 * Allowed Helm values overrides (see profiles/*.yaml resources block):
 * - resources.requests.cpu (shared across roles)
 * - resources.requests.<role>.memory
 * - resources.limits.<role>.memory (release profile)
 * - replicas / replicasByRole
 * Per-role CPU overrides are not supported.
 */
const CPU_QUANTITY = /^(?:\d+m|\d+(?:\.\d+)?)$/;
const MEMORY_QUANTITY = /^(?:\d+(?:Ki|Mi|Gi)|\d+)$/;

/**
 * @param {import('node:child_process').ChildProcess['spawnargs']} command
 * @param {Parameters<typeof spawnSync>[2]} options
 */
function runCommand(command, options) {
  const [executable, ...args] = command;
  return spawnSync(executable, args, options);
}

/**
 * @param {ReturnType<typeof spawnSync>} result
 */
function boundedHelmDiagnostic(result) {
  const parts = [];
  if (result.signal) parts.push(`signal=${result.signal}`);
  if (result.status != null) parts.push(`exit=${result.status}`);
  const stderr = (result.stderr ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-5)
    .join(' | ');
  if (stderr) parts.push(stderr.slice(0, 800));
  return parts.join('; ').slice(0, DIAGNOSTIC_LIMIT);
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
 */
export function parseWorkloadDocuments(output) {
  const docs = [];
  const seen = new Set();
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line === '---' || line.startsWith('#')) continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error('malformed workload document');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('malformed workload document');
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'Error')) {
      throw new Error(
        `helm emitted Error field: ${String(parsed.Error).slice(0, 200)}`,
      );
    }
    const kind = parsed.kind;
    if (typeof kind !== 'string' || !ALLOWED_KINDS.has(kind)) {
      throw new Error(`unknown resource kind: ${kind ?? 'missing'}`);
    }
    const key = documentIdentity(parsed);
    if (seen.has(key)) throw new Error(`duplicate workload identity: ${key}`);
    seen.add(key);
    docs.push(parsed);
  }
  if (docs.length === 0) throw new Error('helm produced no workload documents');
  return docs;
}

/**
 * @param {{ run?: typeof spawnSync }} [options]
 */
export function assertHelmAvailable({ run = spawnSync } = {}) {
  const result = run('helm', ['version', '--short'], {
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 64 * 1024,
  });
  if (result.error || result.status !== 0 || result.signal) {
    throw new Error('helm is not available');
  }
  const short = (result.stdout ?? '').trim().split(/\r?\n/)[0] ?? '';
  if (!/^v[34]\./.test(short)) {
    throw new Error(`unsupported helm version: ${short || 'unknown'}`);
  }
  return short;
}

/**
 * @param {string} userPath
 */
export function resolveValuesPath(userPath) {
  if (typeof userPath !== 'string' || !userPath.trim()) {
    throw new Error('values path is required');
  }
  const absolute = resolve(userPath);
  let stat;
  try {
    stat = lstatSync(absolute);
  } catch {
    throw new Error('values file is not readable');
  }
  if (!stat.isFile()) {
    throw new Error('values path must be a regular file');
  }
  try {
    accessSync(absolute, constants.R_OK);
  } catch {
    throw new Error('values file is not readable');
  }
  return absolute;
}

/**
 * @param {string} filePath
 */
function parseValuesYamlFile(filePath) {
  const script = `import json,sys,yaml
try:
  data = yaml.safe_load(open(sys.argv[1])) or {}
except Exception:
  sys.exit(2)
if not isinstance(data, dict):
  sys.exit(3)
print(json.dumps(data))`;
  const result = spawnSync('python3', ['-c', script, filePath], {
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 256 * 1024,
  });
  if (result.status === 2) throw new Error('values file is not valid YAML');
  if (result.status === 3)
    throw new Error('values file must be a YAML mapping');
  if (result.status !== 0) throw new Error('values file could not be parsed');
  return JSON.parse(result.stdout);
}

/**
 * @param {string} quantity
 * @param {'cpu' | 'memory'} kind
 */
export function validateKubernetesQuantity(quantity, kind) {
  if (typeof quantity !== 'string' || !quantity.trim()) {
    throw new Error(`invalid ${kind} quantity`);
  }
  const pattern = kind === 'cpu' ? CPU_QUANTITY : MEMORY_QUANTITY;
  if (!pattern.test(quantity)) {
    throw new Error(`invalid ${kind} quantity: ${quantity}`);
  }
  const numeric =
    kind === 'cpu'
      ? parseCpuToMillicores(quantity)
      : parseMemoryToBytes(quantity);
  if (!(numeric > 0)) {
    throw new Error(`invalid ${kind} quantity: ${quantity}`);
  }
}

/**
 * @param {string} cpu
 */
function parseCpuToMillicores(cpu) {
  if (cpu.endsWith('m')) return Number.parseInt(cpu.slice(0, -1), 10);
  return Math.round(Number.parseFloat(cpu) * 1000);
}

/**
 * @param {string} memory
 */
function parseMemoryToBytes(memory) {
  const suffix = memory.match(/(Ki|Mi|Gi)$/);
  const digits = suffix ? memory.slice(0, -suffix[1].length) : memory;
  const value = Number.parseInt(digits, 10);
  if (!suffix) return value;
  const scale = { Ki: 1024, Mi: 1024 ** 2, Gi: 1024 ** 3 }[suffix[1]];
  return value * scale;
}

/**
 * @param {Record<string, string | undefined>} requests
 * @param {Record<string, string | undefined>} limits
 */
function assertRequestsWithinLimits(requests, limits) {
  for (const key of ['cpu', 'memory']) {
    const req = requests?.[key];
    const lim = limits?.[key];
    if (!req || !lim) continue;
    const reqVal =
      key === 'cpu' ? parseCpuToMillicores(req) : parseMemoryToBytes(req);
    const limVal =
      key === 'cpu' ? parseCpuToMillicores(lim) : parseMemoryToBytes(lim);
    if (reqVal > limVal) {
      throw new Error('resource requests exceed limits');
    }
  }
}

/**
 * @param {unknown} values
 * @param {'development' | 'release'} profile
 */
export function validateValuesFileContents(values, profile) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new Error('values file must be a YAML mapping');
  }
  for (const key of Object.keys(values)) {
    if (!VALUES_ALLOWED_TOP_KEYS.has(key)) {
      throw new Error(`values override not permitted: ${key}`);
    }
  }
  if ('replicas' in values) {
    const replicas = values.replicas;
    if (!Number.isInteger(replicas) || replicas < 1) {
      throw new Error('invalid replica count');
    }
    if (profile === 'development' && replicas !== 1) {
      throw new Error('development requires replicas=1');
    }
  }
  if ('replicasByRole' in values) {
    const map = values.replicasByRole;
    if (!map || typeof map !== 'object' || Array.isArray(map)) {
      throw new Error('invalid replicasByRole');
    }
    for (const [role, count] of Object.entries(map)) {
      if (!ROLES.includes(role)) {
        throw new Error(`invalid replicasByRole role: ${role}`);
      }
      if (!Number.isInteger(count) || count < 1) {
        throw new Error('invalid replica count');
      }
      if (profile === 'development' && count !== 1) {
        throw new Error('development requires one replica per role');
      }
    }
  }
  if ('resources' in values) {
    validateResourcesValues(values.resources, profile);
  }
}

/**
 * @param {unknown} resources
 * @param {'development' | 'release'} profile
 */
function validateResourcesValues(resources, profile) {
  if (!resources || typeof resources !== 'object' || Array.isArray(resources)) {
    throw new Error('invalid resources block');
  }
  const requests = resources.requests;
  const limits = profile === 'release' ? resources.limits : undefined;
  if (!requests || typeof requests !== 'object' || Array.isArray(requests)) {
    throw new Error('resources.requests is required when resources are set');
  }
  if ('cpu' in requests) {
    validateKubernetesQuantity(String(requests.cpu), 'cpu');
  }
  for (const role of ROLES) {
    if (role in requests && requests[role] != null) {
      const block = requests[role];
      if (typeof block !== 'object' || Array.isArray(block) || block === null) {
        throw new Error(`invalid resources.requests.${role}`);
      }
      if ('cpu' in block) {
        throw new Error('per-role CPU overrides are not supported');
      }
      if ('memory' in block) {
        validateKubernetesQuantity(String(block.memory), 'memory');
      }
    }
  }
  if (limits != null) {
    if (typeof limits !== 'object' || Array.isArray(limits)) {
      throw new Error('invalid resources.limits');
    }
    for (const role of ROLES) {
      if (role in limits && limits[role] != null) {
        const block = limits[role];
        if (
          typeof block !== 'object' ||
          Array.isArray(block) ||
          block === null
        ) {
          throw new Error(`invalid resources.limits.${role}`);
        }
        if ('cpu' in block) {
          throw new Error('per-role CPU overrides are not supported');
        }
        if ('memory' in block) {
          validateKubernetesQuantity(String(block.memory), 'memory');
        }
      }
    }
  }
  const rolesWithRequests = ROLES.filter((role) => requests[role]?.memory);
  for (const role of rolesWithRequests) {
    const reqMem = requests[role].memory;
    const limMem = limits?.[role]?.memory;
    const reqCpu = requests.cpu;
    const limCpu = undefined;
    assertRequestsWithinLimits(
      {
        cpu: reqCpu != null ? String(reqCpu) : undefined,
        memory: String(reqMem),
      },
      { cpu: limCpu, memory: limMem != null ? String(limMem) : undefined },
    );
  }
}

/**
 * @param {object} doc
 */
export function stripComparableWorkloadFields(doc) {
  const clone = structuredClone(doc);
  if (clone.kind === 'Deployment') {
    if (clone.spec && typeof clone.spec === 'object') {
      delete clone.spec.replicas;
      const containers = clone.spec.template?.spec?.containers;
      if (
        Array.isArray(containers) &&
        containers.length > 0 &&
        containers[0] &&
        typeof containers[0] === 'object'
      ) {
        delete containers[0].resources;
      }
    }
  }
  return clone;
}

/**
 * @param {object} baseline
 * @param {object} candidate
 */
function assertReplicaInteger(doc, label) {
  const replicas = doc.spec?.replicas;
  if (!Number.isInteger(replicas) || replicas < 1) {
    throw new Error(`invalid replica count on ${label}`);
  }
}

/**
 * @param {object | undefined} resources
 * @param {string} label
 */
function validateRenderedContainerResources(resources, label) {
  if (!resources) return;
  const requests = resources.requests;
  const limits = resources.limits;
  if (requests?.cpu) validateKubernetesQuantity(String(requests.cpu), 'cpu');
  if (requests?.memory)
    validateKubernetesQuantity(String(requests.memory), 'memory');
  if (limits?.cpu) validateKubernetesQuantity(String(limits.cpu), 'cpu');
  if (limits?.memory)
    validateKubernetesQuantity(String(limits.memory), 'memory');
  assertRequestsWithinLimits(
    requests
      ? {
          cpu: requests.cpu != null ? String(requests.cpu) : undefined,
          memory: requests.memory != null ? String(requests.memory) : undefined,
        }
      : {},
    limits
      ? {
          cpu: limits.cpu != null ? String(limits.cpu) : undefined,
          memory: limits.memory != null ? String(limits.memory) : undefined,
        }
      : {},
  );
  if (!requests && !limits) {
    throw new Error(`missing container resources on ${label}`);
  }
}

/**
 * @param {object[]} baseline
 * @param {object[]} candidate
 */
export function assertValuesOverlayPermitted(baseline, candidate) {
  if (baseline.length !== candidate.length) {
    throw new Error('values overlay changed document count');
  }
  const baselineById = new Map(
    baseline.map((doc) => [documentIdentity(doc), doc]),
  );
  const candidateById = new Map(
    candidate.map((doc) => [documentIdentity(doc), doc]),
  );
  for (const id of baselineById.keys()) {
    if (!candidateById.has(id)) {
      throw new Error(`values overlay removed document: ${id}`);
    }
  }
  for (const id of candidateById.keys()) {
    if (!baselineById.has(id)) {
      throw new Error(`values overlay added document: ${id}`);
    }
  }
  for (const [id, baseDoc] of baselineById) {
    const candDoc = candidateById.get(id);
    const strippedBase = stripComparableWorkloadFields(baseDoc);
    const strippedCand = stripComparableWorkloadFields(candDoc);
    if (!isDeepStrictEqual(strippedBase, strippedCand)) {
      throw new Error(`values override not permitted: ${id}`);
    }
    if (baseDoc.kind === 'Deployment') {
      assertReplicaInteger(candDoc, id);
      const container = candDoc.spec?.template?.spec?.containers?.[0];
      validateRenderedContainerResources(container?.resources, id);
    }
  }
}

/**
 * @param {string} profile
 * @param {string} profilePath
 * @param {string | undefined} valuesPath
 * @param {string} stdin
 * @param {{ run?: typeof spawnSync }} options
 */
function invokeHelmTemplate(
  profile,
  profilePath,
  valuesPath,
  stdin,
  { run = spawnSync } = {},
) {
  const args = ['template', 'offscreen-app', chartPath, '-f', profilePath];
  if (valuesPath) args.push('-f', valuesPath);
  args.push('-f', '-');
  const result = run('helm', args, {
    input: stdin,
    encoding: 'utf8',
    timeout: HELM_TIMEOUT_MS,
    maxBuffer: HELM_MAX_BUFFER,
  });
  if (result.error || result.status !== 0 || result.signal) {
    throw new Error(`helm template failed: ${boundedHelmDiagnostic(result)}`);
  }
  const output = result.stdout ?? '';
  if (!output.trim()) {
    throw new Error('helm template failed: empty output');
  }
  return parseWorkloadDocuments(output);
}

/**
 * @param {{ profile: string, section?: string, bindings?: object, valuesPath?: string }} input
 * @param {{ run?: typeof spawnSync }} [options]
 */
export function renderWorkloadDocuments(
  { profile, section = 'all', bindings, valuesPath },
  { run = spawnSync } = {},
) {
  if (profile !== 'development' && profile !== 'release') {
    throw new Error(`unsupported profile: ${profile}`);
  }
  if (!RELEASE_SECTIONS.has(section)) {
    throw new Error(`unsupported section: ${section}`);
  }
  if (profile === 'development') {
    if (!bindings || typeof bindings !== 'object') {
      throw new Error('development bindings are required');
    }
  } else if (bindings != null && Object.keys(bindings).length > 0) {
    throw new Error('release profile does not accept bindings');
  }

  const profilePath = join(profilesRoot, `${profile}.yaml`);
  /** @type {Record<string, unknown>} */
  const overlay = { section };
  if (profile === 'development') overlay.bindings = bindings;

  const stdin = `${JSON.stringify(overlay)}\n`;

  if (!valuesPath) {
    return invokeHelmTemplate(profile, profilePath, undefined, stdin, { run });
  }

  const absoluteValuesPath = resolveValuesPath(valuesPath);
  const parsedValues = parseValuesYamlFile(absoluteValuesPath);
  validateValuesFileContents(parsedValues, profile);

  const baseline = invokeHelmTemplate(profile, profilePath, undefined, stdin, {
    run,
  });
  const candidate = invokeHelmTemplate(
    profile,
    profilePath,
    absoluteValuesPath,
    stdin,
    { run },
  );
  assertValuesOverlayPermitted(baseline, candidate);
  return candidate;
}

/**
 * @param {object[]} documents
 */
export function renderWorkloadYaml(documents) {
  return formatManifestDocuments(documents, 'legacy');
}

function printReleaseHelp() {
  process.stdout.write(
    'Render workload manifests (release profile)\n\n' +
      'usage: node infra/workloads/render.mjs release [options] <section>\n' +
      '       node infra/workloads/render.mjs --help\n' +
      '       node infra/workloads/render.mjs release --help\n\n' +
      'Options:\n' +
      '  --format <yaml|json|legacy>  output format (default: legacy)\n' +
      '  --values PATH                additional Helm values file\n' +
      '  --help                       show this help\n\n' +
      'Examples:\n' +
      '  node infra/workloads/render.mjs release services\n' +
      '  node infra/workloads/render.mjs release --format yaml edge\n' +
      '  node infra/workloads/render.mjs release workers --format json\n' +
      '  node infra/workloads/render.mjs release all --values ./custom-values.yaml\n',
  );
}

function releaseUsageError() {
  return 'usage: node infra/workloads/render.mjs release <section> [--values PATH] [--format <yaml|json|legacy>]';
}

/**
 * @param {string[]} argv
 * @returns {{ kind: 'help' } | { kind: 'render', section: string, valuesPath?: string, format: 'yaml' | 'json' | 'legacy' }}
 */
export function parseReleaseCliArgs(argv) {
  const args = argv.slice(2);

  if (args.length === 1 && args[0] === '--help') {
    return { kind: 'help' };
  }

  if (args[0] !== 'release') {
    throw new Error(releaseUsageError());
  }

  if (args.length === 2 && args[1] === '--help') {
    return { kind: 'help' };
  }

  let format = /** @type {'yaml' | 'json' | 'legacy'} */ ('legacy');
  let valuesPath;
  let help = false;
  /** @type {string[]} */
  const positionals = [];
  const seen = new Set();

  for (let index = 1; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--help') {
      if (seen.has('--help')) {
        throw new Error('duplicate flag: --help');
      }
      seen.add('--help');
      help = true;
      continue;
    }
    if (token === '--format') {
      if (seen.has('--format')) {
        throw new Error('duplicate flag: --format');
      }
      seen.add('--format');
      const value = args[index + 1];
      if (value == null || value.startsWith('--')) {
        throw new Error('flag --format requires a value');
      }
      if (!ACCEPTED_MANIFEST_FORMATS.has(value)) {
        throw new Error(`unsupported manifest format: ${value}`);
      }
      format = /** @type {'yaml' | 'json' | 'legacy'} */ (value);
      index += 1;
      continue;
    }
    if (token === '--values') {
      if (seen.has('--values')) {
        throw new Error('duplicate flag: --values');
      }
      seen.add('--values');
      const value = args[index + 1];
      if (value == null || value.startsWith('--')) {
        throw new Error('missing path after --values');
      }
      valuesPath = value;
      index += 1;
      continue;
    }
    if (token.startsWith('--')) {
      throw new Error(`unknown flag: ${token}`);
    }
    positionals.push(token);
  }

  if (help) {
    return { kind: 'help' };
  }

  if (positionals.length !== 1) {
    throw new Error(releaseUsageError());
  }

  return { kind: 'render', section: positionals[0], valuesPath, format };
}

function runReleaseCli() {
  let parsed;
  try {
    parsed = parseReleaseCliArgs(process.argv);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'invalid arguments';
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }

  if (parsed.kind === 'help') {
    printReleaseHelp();
    return;
  }

  const { section, valuesPath, format } = parsed;
  if (!RELEASE_SECTIONS.has(section)) {
    process.stderr.write(`unsupported section: ${section}\n`);
    process.exit(1);
  }
  try {
    const documents = renderWorkloadDocuments({
      profile: 'release',
      section,
      valuesPath,
    });
    process.stdout.write(formatManifestDocuments(documents, format));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'render failed';
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runReleaseCli();
}
