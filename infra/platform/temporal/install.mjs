import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { parse, parseAllDocuments } from 'yaml';
import { assertPlatformTarget, readPlatformObject, runPlatformCommand } from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import { parsePins, verifyManifestBytes, TEMPORAL_CHART_PIN_KEYS } from '../common/pins.mjs';
import { MIN_HOST_MEMORY_MIB, parseMeminfoMiB } from '../../clusters/kind/manager/host-probe.mjs';
import { baselineCnpgClusterName } from '../postgres/config.mjs';
import { prepareFreshTemporalPersistence } from '../postgres/temporal-persistence/prepare.mjs';
import { observeTemporalRelease, observeTemporalReady } from './readiness.mjs';

const RELEASE = 'temporal';
const SECRET = 'temporal-db';
const HERE = fileURLToPath(new URL('./', import.meta.url));
const STORES = ['default', 'visibility'];

function resolveConfiguration(profile) {
  const pin = parsePins(readFileSync(join(HERE, 'chart.pin'), 'utf8'), TEMPORAL_CHART_PIN_KEYS);
  const version = pin.CHART_VERSION;
  if (!/^\d+\.\d+\.\d+$/.test(version) ||
      pin.CHART_URL !== `https://github.com/temporalio/helm-charts/releases/download/temporal-${version}/temporal-${version}.tgz`) {
    throw new Error('unexpected Temporal chart artifact identity');
  }
  const commonPath = join(HERE, 'values.yaml');
  const profilePath = join(HERE, 'profiles', profile.id === 'dev' ? 'development.yaml' : 'release.yaml');
  const desired = parse(readFileSync(commonPath, 'utf8'));
  const overlay = parse(readFileSync(profilePath, 'utf8'));
  const endpoint = `${baselineCnpgClusterName(profile.id)}-rw.${profile.namespaces.postgres}.svc:5432`;
  const expectedOverlay = {
    server: { config: { persistence: { datastores: {
      default: { sql: { connectAddr: endpoint } },
      visibility: { sql: { connectAddr: endpoint } },
    } } } },
  };
  if (!isDeepStrictEqual(overlay, expectedOverlay)) {
    throw new Error('Temporal profile must contain only the two expected PostgreSQL endpoints');
  }
  for (const store of STORES) {
    desired.server.config.persistence.datastores[store].sql.connectAddr = endpoint;
  }
  return { pin, commonPath, profilePath, desired };
}

function assertAdmission(profile, run) {
  assertPlatformTarget(profile.id, { run });
  const memory = run('cat', ['/proc/meminfo'], { timeoutMs: 3000 });
  const available = memory.ok ? parseMeminfoMiB(memory.stdout).memAvailableMiB : null;
  if (!Number.isFinite(available) || available < MIN_HOST_MEMORY_MIB) {
    throw new Error('Temporal installation refused by host memory admission');
  }
}

function acquireChart(pin, directory, run) {
  const archive = join(directory, 'temporal.tgz');
  const download = run('curl', [
    '--fail', '--silent', '--show-error', '--location',
    '--proto', '=https', '--proto-redir', '=https',
    '--connect-timeout', '10', '--max-time', '90', '--max-filesize', '20971520',
    '--output', archive, pin.CHART_URL,
  ], { timeoutMs: 100_000 });
  if (!download.ok || statSync(archive).size > 20 * 1024 * 1024) {
    throw new Error('Temporal chart download failed or exceeded size limit');
  }
  verifyManifestBytes(readFileSync(archive), pin.CHART_SHA256);
  return archive;
}

/** Render the pinned upstream chart without access to a Kubernetes cluster. */
export function renderTemporalChart(profileId, { run = runPlatformCommand } = {}) {
  const profile = readPlatformProfile(profileId);
  const configuration = resolveConfiguration(profile);
  const directory = mkdtempSync(join(tmpdir(), 'offscreen-temporal-render-'));
  try {
    const archive = acquireChart(configuration.pin, directory, run);
    const rendered = run('helm', [
      'template', RELEASE, archive, '--namespace', profile.namespaces.temporal,
      '-f', configuration.commonPath, '-f', configuration.profilePath,
    ], { timeoutMs: 30_000 });
    if (!rendered.ok) throw new Error('Temporal Helm template failed');
    const parsed = parseAllDocuments(rendered.stdout);
    const documents = parsed.map((doc) => {
      if (doc.errors.length) throw new Error('malformed Temporal Helm YAML');
      return doc.toJS();
    }).filter((doc) => doc !== null);
    const identities = new Set();
    const allowedKinds = new Set(['Deployment', 'Service', 'Job', 'Pod', 'ConfigMap']);
    for (const doc of documents) {
      const identity = doc.kind + '/' + doc.metadata?.name;
      if (!allowedKinds.has(doc.kind) || !doc.metadata?.name ||
          doc.metadata.namespace !== profile.namespaces.temporal || identities.has(identity)) {
        throw new Error('unexpected Temporal Helm resource identity');
      }
      identities.add(identity);
    }
    if (!identities.has('Deployment/temporal-frontend') ||
        !identities.has('Service/temporal-frontend')) {
      throw new Error('Temporal render is incomplete');
    }
    return documents;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function namespaceLabels(profile) {
  return {
    [profile.id === 'dev' ? 'offscreen.dev/owner' : 'offscreen.rpg/lab']: profile.ownerValue,
    'app.kubernetes.io/part-of': 'temporal',
  };
}

function freshNamespace(profile, run) {
  const namespace = profile.namespaces.temporal;
  const observation = readPlatformObject({
    profileId: profile.id, resource: 'namespace', name: namespace,
  }, { run });
  if (observation.state !== 'absent') {
    // Fresh-only installer: even an empty existing namespace requires explicit review.
    throw new Error('Temporal namespace already exists or is unreadable; inspect legacy or partial installation');
  }
}

function createNamespaceAndSecret(profile, prepared, run) {
  const namespace = profile.namespaces.temporal;
  const source = readPlatformObject({
    profileId: profile.id, resource: 'secret', name: prepared.secretName,
    namespace: prepared.namespace,
  }, { run });
  if (
    source.state !== 'present' ||
    source.object.metadata?.resourceVersion !== prepared.secretVersion ||
    source.object.type !== 'kubernetes.io/basic-auth' ||
    source.object.data?.username !== Buffer.from('temporal').toString('base64') ||
    typeof source.object.data?.password !== 'string' ||
    !source.object.data.password
  ) {
    throw new Error('prepared Temporal credential is missing or changed');
  }
  const labels = namespaceLabels(profile);
  const manifests = [
    { apiVersion: 'v1', kind: 'Namespace', metadata: { name: namespace, labels } },
    {
      apiVersion: 'v1', kind: 'Secret', type: 'kubernetes.io/basic-auth',
      metadata: { name: SECRET, namespace, labels },
      data: { username: source.object.data.username, password: source.object.data.password },
    },
  ];
  for (const manifest of manifests) {
    const result = run('kubectl', [
      '--context', profile.contextName, 'create', '-f', '-',
    ], { input: JSON.stringify(manifest) });
    if (!result.ok) throw new Error(`Temporal ${manifest.kind} creation failed; preserve partial state`);
  }
}

function helmScope(profile) {
  return ['--kube-context', profile.contextName, '--namespace', profile.namespaces.temporal];
}

function observeUnchanged(profile, configuration, release, run) {
  if (release.chartVersion !== configuration.pin.CHART_VERSION) {
    throw new Error('Temporal chart version differs; explicit maintenance required');
  }
  const values = run('helm', ['get', 'values', RELEASE, ...helmScope(profile), '-o', 'json']);
  if (!values.ok) throw new Error('installed Temporal values unreadable');
  let installed;
  try {
    installed = JSON.parse(values.stdout);
  } catch {
    throw new Error('installed Temporal values malformed');
  }
  if (!isDeepStrictEqual(installed, configuration.desired)) {
    throw new Error('installed Temporal values differ; explicit maintenance required');
  }
  const readiness = observeTemporalReady(profile.id, { run });
  if (!readiness.ok || !readiness.webReady) {
    throw new Error('existing Temporal release is unhealthy; explicit maintenance required');
  }
  return { ok: true, detail: 'Temporal release unchanged and ready', mutated: false };
}

/**
 * Internal worker. The platform phase starts this under the shared flock.
 * Fresh installation only: no implicit adoption, retry, upgrade or deletion.
 * @param {'dev' | 'release'} profileId
 * @param {{ confirmContext: string }} authorization
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function ensureTemporal(profileId, authorization, { run = runPlatformCommand } = {}) {
  const profile = readPlatformProfile(profileId);
  if (authorization?.confirmContext !== profile.contextName) {
    throw new Error('Temporal installation requires exact context confirmation');
  }
  assertAdmission(profile, run);
  const configuration = resolveConfiguration(profile);
  const release = observeTemporalRelease(profileId, { run });
  if (release.state === 'deployed') {
    return observeUnchanged(profile, configuration, release, run);
  }
  if (release.state !== 'absent') throw new Error(release.detail);

  freshNamespace(profile, run);
  const directory = mkdtempSync(join(tmpdir(), 'offscreen-temporal-'));
  try {
    // Verify vendor bytes before creating any durable prerequisites.
    const archive = acquireChart(configuration.pin, directory, run);
    assertAdmission(profile, run);
    const prepared = prepareFreshTemporalPersistence(profileId, authorization, { run });
    assertAdmission(profile, run);
    freshNamespace(profile, run);
    createNamespaceAndSecret(profile, prepared, run);

    const install = run('helm', [
      'install', RELEASE, archive, ...helmScope(profile),
      '-f', configuration.commonPath, '-f', configuration.profilePath,
      '--wait', '--wait-for-jobs', '--timeout', '5m',
    ], { timeoutMs: 620_000 });
    if (!install.ok) {
      throw new Error('Temporal Helm installation failed; inspect release and schema hook, preserve persistence');
    }
    const ready = observeTemporalReady(profileId, { run });
    if (!ready.ok || !ready.webReady) {
      throw new Error('Temporal installed but readiness failed; inspect release without retrying');
    }
    return { ok: true, detail: 'Temporal installed and ready', mutated: true };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// Internal process boundary: the existing platform plan is the public entrypoint.
// flock stays in the supervisor process until the worker exits. The wrapper does
// not impose a second timeout that could prematurely terminate that supervisor.
function main(args) {
  const [command, profileId, confirmContext, extra] = args;
  if (extra || !['plan', 'ensure', 'locked-ensure'].includes(command)) {
    throw new Error('invalid internal Temporal platform invocation');
  }
  const profile = readPlatformProfile(profileId);
  if (command === 'plan') {
    resolveConfiguration(profile);
    process.stdout.write(JSON.stringify({ context: profile.contextName, namespace: profile.namespaces.temporal, release: RELEASE, mutation: false }) + '\n');
    return;
  }
  if (process.env.OFFSCREEN_TEMPORAL_ENSURE !== 'authorized' ||
      confirmContext !== profile.contextName) {
    throw new Error('Temporal ensure must be authorized by the platform preflight');
  }
  if (command === 'locked-ensure') {
    const result = ensureTemporal(profileId, { confirmContext });
    process.stdout.write(JSON.stringify(result) + '\n');
    return;
  }
  assertAdmission(profile, runPlatformCommand);
  const lockDirectory = join(homedir(), '.local', 'state', 'offscreen-rpg', 'platform-locks');
  mkdirSync(lockDirectory, { recursive: true, mode: 0o700 });
  const lock = join(lockDirectory, `${profile.contextName}-temporal.lock`);
  const result = spawnSync('flock', [
    '--exclusive', '--wait', '30', lock, process.execPath,
    fileURLToPath(import.meta.url), 'locked-ensure', profileId, confirmContext,
  ], { stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) {
    throw new Error('Temporal locked operation failed; inspect prior state before retrying');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write((error instanceof Error ? error.message : 'Temporal operation failed') + '\n');
    process.exitCode = 1;
  }
}
