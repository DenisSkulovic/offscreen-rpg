import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const HELM_TIMEOUT_MS = 30_000;
const HELM_MAX_BUFFER = 4 * 1024 * 1024;
const DIAGNOSTIC_LIMIT = 1000;

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
  if (stderr) parts.push(stderr.slice(-800));
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
      throw new Error(`helm emitted Error field: ${String(parsed.Error).slice(0, 200)}`);
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
 * @param {{ profile: string, section?: string, bindings?: object }} input
 * @param {{ run?: typeof spawnSync }} [options]
 */
export function renderWorkloadDocuments(
  { profile, section = 'all', bindings },
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
  const result = run('helm', ['template', 'offscreen-app', chartPath, '-f', profilePath, '-f', '-'], {
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
 * @param {object[]} documents
 */
export function renderWorkloadYaml(documents) {
  return documents.map((doc) => `---\n${JSON.stringify(doc)}`).join('\n').concat('\n');
}

function runReleaseCli() {
  const section = process.argv[3];
  if (process.argv[2] !== 'release' || !section) {
    process.stderr.write('usage: node infra/workloads/render.mjs release <section>\n');
    process.exit(1);
  }
  if (!RELEASE_SECTIONS.has(section)) {
    process.stderr.write(`unsupported section: ${section}\n`);
    process.exit(1);
  }
  try {
    const documents = renderWorkloadDocuments({ profile: 'release', section });
    process.stdout.write(renderWorkloadYaml(documents));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'render failed';
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runReleaseCli();
}