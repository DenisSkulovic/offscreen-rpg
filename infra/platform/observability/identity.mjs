import { spawnSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  fsyncSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { parse as parseYaml } from 'yaml';
import {
  DEV_API_PORT_RANGE,
  LOOPBACK_API_ADDRESS,
  RELEASE_API_PORT,
} from '../../clusters/kind/manager/config.mjs';
import {
  DEV_BASELINE_NAMESPACE,
  DEV_CLUSTER_OWNER,
} from '../../clusters/kind/manager/dev-bootstrap.mjs';
import {
  assertPlatformTarget,
  kindKubeconfigClusterName,
  RELEASE_BASELINE_NAMESPACE,
} from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';

/** @typedef {typeof runObservabilityReadCommand} ObservabilityRun */

export const OBSERVABILITY_ARTIFACT_BUDGET_MS = 390_000;
export const PREFLIGHT_BUDGET_MS = 210_000;
export const INVENTORY_BUDGET_MS = 120_000;
export const CLEANUP_BUDGET_MS = 15_000;
export const OBSERVATION_BUDGET_MS =
  PREFLIGHT_BUDGET_MS + INVENTORY_BUDGET_MS + CLEANUP_BUDGET_MS;
export const OBSERVABILITY_OBSERVATION_WORKER_MS = 1_000_000;
export const OBSERVABILITY_OBSERVATION_SUPERVISOR_MS = 1_060_000;
export const OBSERVABILITY_ENSURE_WORKER_MS = 5_880_000;
export const OBSERVABILITY_ENSURE_SUPERVISOR_MS = 6_000_000;
export const PREFLIGHT_COMMAND_TIMEOUT_MS = 15_000;

const MAX_BUFFER_BYTES = 8 * 1024 * 1024;
const MAX_READ_TIMEOUT_MS = 60_000;

const REFUSED_ENV_EXACT = [
  'KUBECONFIG',
  'DOCKER_HOST',
  'DOCKER_CONTEXT',
  'DOCKER_TLS_VERIFY',
  'DOCKER_CERT_PATH',
  'DOCKER_TLS',
  'HELM_KUBEAPISERVER',
  'HELM_KUBETOKEN',
  'HELM_BEARER_TOKEN',
];

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ input?: string, timeoutMs?: number }} [options]
 */
export function runObservabilityReadCommand(
  command,
  args,
  { input, timeoutMs = PREFLIGHT_COMMAND_TIMEOUT_MS } = {},
) {
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > MAX_READ_TIMEOUT_MS
  ) {
    throw new Error('invalid observability read timeout');
  }
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    input,
    timeout: timeoutMs,
    maxBuffer: MAX_BUFFER_BYTES,
    windowsHide: true,
    shell: false,
    detached: false,
    killSignal: 'SIGKILL',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const timedOut =
    result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGKILL';
  const missing = result.error?.code === 'ENOENT';
  const status = result.status ?? null;
  const ok = !timedOut && !missing && !result.error && status === 0;
  return {
    ok,
    status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    timedOut,
    missing,
  };
}

/**
 * @param {ReturnType<ObservabilityRun>} result
 */
function refuseCommand(result, label) {
  if (result.missing) {
    throw new Error(`unreadable: ${label}-missing`);
  }
  if (result.timedOut) {
    throw new Error('unreadable: timeout');
  }
  if (result.stderr && result.stderr.trim().length > 0) {
    throw new Error(`unreadable: ${label}-stderr`);
  }
  if (!result.ok) {
    throw new Error(`unreadable: ${label}`);
  }
}

function assertRefusedEnv() {
  for (const key of REFUSED_ENV_EXACT) {
    const value = process.env[key];
    if (value != null && String(value).length > 0) {
      throw new Error(`refused env: ${key}`);
    }
  }
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('HELM_KUBE')) {
      const value = process.env[key];
      if (value != null && String(value).length > 0) {
        throw new Error(`refused env: ${key}`);
      }
    }
  }
  const helmDriver = process.env.HELM_DRIVER;
  if (
    helmDriver != null &&
    String(helmDriver).length > 0 &&
    helmDriver !== 'secret'
  ) {
    throw new Error('refused env: HELM_DRIVER');
  }
}

/**
 * @param {string} field
 * @param {unknown} encoded
 * @returns {Buffer}
 */
function decodeCanonicalBase64(field, encoded) {
  if (typeof encoded !== 'string' || encoded.length === 0) {
    throw new Error(`invalid ${field}`);
  }
  const decoded = Buffer.from(encoded, 'base64');
  if (decoded.length === 0) {
    throw new Error(`empty ${field}`);
  }
  if (decoded.toString('base64') !== encoded) {
    throw new Error(`noncanonical ${field} base64`);
  }
  return decoded;
}

/**
 * @param {object} configBody
 * @param {string} expectedContextName
 * @param {string} expectedKubeconfigClusterName
 */
function assertSnapshotConfigBinding(
  configBody,
  expectedContextName,
  expectedKubeconfigClusterName,
) {
  const contexts = Array.isArray(configBody.contexts)
    ? configBody.contexts
    : [];
  const clusters = Array.isArray(configBody.clusters)
    ? configBody.clusters
    : [];
  const users = Array.isArray(configBody.users) ? configBody.users : [];
  if (contexts.length !== 1 || clusters.length !== 1) {
    throw new Error('kubeconfig must minify to one context and cluster');
  }
  const contextEntry = contexts[0];
  const contextName = contextEntry?.name;
  const contextRef = contextEntry?.context ?? {};
  if (contextName !== expectedContextName) {
    throw new Error('context name mismatch');
  }
  if (contextRef.cluster !== expectedKubeconfigClusterName) {
    throw new Error('selected context cluster mismatch');
  }
  const userName = contextRef.user;
  if (typeof userName !== 'string' || userName.length === 0) {
    throw new Error('context user reference missing');
  }
  const clusterEntry = clusters.find((c) => c?.name === contextRef.cluster);
  const userEntry = users.find((u) => u?.name === userName);
  if (!clusterEntry || !userEntry) {
    throw new Error('referenced cluster or user missing');
  }
  const cluster = clusterEntry.cluster ?? {};
  const user = userEntry.user ?? {};
  if (user.exec || user['auth-provider']) {
    throw new Error('exec or auth-provider kube user refused');
  }
  if (cluster['insecure-skip-tls-verify'] === true) {
    throw new Error('insecure TLS refused');
  }
  if (cluster['proxy-url']) {
    throw new Error('proxy kubeconfig refused');
  }
  if (
    cluster['certificate-authority'] ||
    user['client-certificate'] ||
    user['client-key'] ||
    user.token ||
    user.username ||
    user.password
  ) {
    throw new Error('external credential path refused');
  }
  const server = cluster.server;
  if (
    typeof server !== 'string' ||
    !/^https:\/\/127\.0\.0\.1:\d+$/.test(server)
  ) {
    throw new Error('cluster server must be explicit loopback https');
  }
  const caBytes = decodeCanonicalBase64(
    'certificate-authority-data',
    cluster['certificate-authority-data'],
  );
  decodeCanonicalBase64(
    'client-certificate-data',
    user['client-certificate-data'],
  );
  decodeCanonicalBase64('client-key-data', user['client-key-data']);
  const caSha256 = createHash('sha256').update(caBytes).digest('hex');
  return { server, caSha256, caBytes };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {number} port
 */
function assertLoopbackPortForProfile(profileId, port) {
  if (profileId === 'release') {
    if (port !== RELEASE_API_PORT) {
      throw new Error(
        `release profile requires loopback port ${RELEASE_API_PORT}`,
      );
    }
    return;
  }
  if (port === RELEASE_API_PORT) {
    throw new Error('dev profile must not use release loopback port');
  }
  if (
    !Number.isInteger(port) ||
    port < DEV_API_PORT_RANGE.start ||
    port > DEV_API_PORT_RANGE.end
  ) {
    throw new Error('dev loopback port out of range');
  }
}

/**
 * @param {ObservabilityRun} run
 * @param {string} profileId
 * @param {string} clusterName
 * @param {Buffer} caBytes
 * @param {string} server
 */
function assertKindKubeconfigMatch(
  run,
  profileId,
  clusterName,
  caBytes,
  server,
) {
  const profile = readPlatformProfile(profileId);
  const expectedCluster = kindKubeconfigClusterName(clusterName);
  const kindConfig = run('kind', ['get', 'kubeconfig', '--name', clusterName]);
  refuseCommand(kindConfig, 'kind-kubeconfig');
  let documents;
  try {
    documents = parseYaml(kindConfig.stdout);
  } catch {
    throw new Error('kind kubeconfig yaml malformed');
  }
  const body = Array.isArray(documents) ? documents[0] : documents;
  if (!body || typeof body !== 'object') {
    throw new Error('kind kubeconfig empty');
  }
  const contexts = Array.isArray(body.contexts) ? body.contexts : [];
  const clusters = Array.isArray(body.clusters) ? body.clusters : [];
  const selected = contexts.find(
    (entry) =>
      entry?.name === profile.contextName ||
      entry?.context?.cluster === expectedCluster,
  );
  if (!selected?.context?.cluster) {
    throw new Error('kind kubeconfig context missing');
  }
  const clusterRef = selected.context.cluster;
  const clusterEntry = clusters.find((c) => c?.name === clusterRef);
  if (!clusterEntry?.cluster) {
    throw new Error('kind kubeconfig cluster missing');
  }
  const kindCluster = clusterEntry.cluster;
  if (kindCluster.server !== server) {
    throw new Error('kind kubeconfig server mismatch');
  }
  const kindCaBytes = decodeCanonicalBase64(
    'kind certificate-authority-data',
    kindCluster['certificate-authority-data'],
  );
  if (!kindCaBytes.equals(caBytes)) {
    throw new Error('kind kubeconfig CA mismatch');
  }
}

/**
 * @param {ObservabilityRun} run
 * @param {string} clusterName
 * @param {number} port
 */
function readControlPlaneTuple(run, clusterName, port) {
  const context = run('docker', ['context', 'show']);
  refuseCommand(context, 'docker-context');
  const dockerContext = context.stdout.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(dockerContext)) {
    throw new Error('docker context unreadable');
  }
  const endpoint = run('docker', [
    'context',
    'inspect',
    dockerContext,
    '--format',
    '{{json .Endpoints.docker.Host}}',
  ]);
  refuseCommand(endpoint, 'docker-endpoint');
  let host;
  try {
    host = JSON.parse(endpoint.stdout);
  } catch {
    throw new Error('docker endpoint malformed');
  }
  if (
    typeof host !== 'string' ||
    !(
      host.startsWith('unix:///') ||
      host === 'npipe:////./pipe/dockerDesktopLinuxEngine'
    )
  ) {
    throw new Error('nonlocal Docker endpoint');
  }
  const inspect = run('docker', ['inspect', `${clusterName}-control-plane`]);
  refuseCommand(inspect, 'docker-control-plane');
  /** @type {unknown[]} */
  let containers;
  try {
    containers = JSON.parse(inspect.stdout);
  } catch {
    throw new Error('docker control-plane malformed');
  }
  if (!Array.isArray(containers) || containers.length !== 1) {
    throw new Error('control-plane container count mismatch');
  }
  const cp = containers[0];
  const id = cp?.Id;
  const labels = cp?.Config?.Labels ?? {};
  const running = cp?.State?.Running === true;
  const bindings = cp?.NetworkSettings?.Ports?.['6443/tcp'] ?? [];
  const matches = bindings.filter(
    (b) =>
      b.HostIp === LOOPBACK_API_ADDRESS && String(b.HostPort) === String(port),
  );
  if (
    typeof id !== 'string' ||
    id.length === 0 ||
    !running ||
    labels['io.x-k8s.kind.cluster'] !== clusterName ||
    labels['io.x-k8s.kind.role'] !== 'control-plane' ||
    matches.length !== 1
  ) {
    throw new Error('control-plane identity mismatch');
  }
  return { dockerContext, dockerControlPlaneId: id, dockerEndpointHost: host };
}

/**
 * @param {string} path
 */
function assertOwnedPrivatePath(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    throw new Error('snapshot path symlink refused');
  }
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  if (uid != null && stat.uid !== uid) {
    throw new Error('snapshot path owner mismatch');
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new Error('snapshot path permissions too open');
  }
  return stat;
}

/**
 * @param {string} root
 */
function assertSnapshotRoot(root) {
  const stat = assertOwnedPrivatePath(root);
  if (!stat.isDirectory()) {
    throw new Error('snapshot root must be directory');
  }
  return { snapshotDirDev: stat.dev, snapshotDirIno: stat.ino };
}

/**
 * @param {string} root
 * @param {string} rawBytes
 */
function writePrivateSnapshot(root, rawBytes) {
  const snapshotPath = join(root, 'snapshot.json');
  const fd = openSync(
    snapshotPath,
    fsConstants.O_WRONLY |
      fsConstants.O_CREAT |
      fsConstants.O_EXCL |
      fsConstants.O_NOFOLLOW,
    0o600,
  );
  try {
    writeSync(fd, rawBytes);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  const stat = lstatSync(snapshotPath);
  if (!stat.isFile() || stat.nlink !== 1) {
    throw new Error('snapshot file invalid');
  }
  if ((stat.mode & 0o777) !== 0o600) {
    throw new Error('snapshot permissions invalid');
  }
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  if (uid != null && stat.uid !== uid) {
    throw new Error('snapshot owner invalid');
  }
  const snapshotSha256 = createHash('sha256').update(rawBytes).digest('hex');
  return {
    snapshotPath,
    snapshotSha256,
    snapshotDev: stat.dev,
    snapshotIno: stat.ino,
  };
}

/**
 * @param {object | null} object
 * @param {string} name
 */
function assertNamespaceObject(object, name) {
  if (object == null) {
    return null;
  }
  if (object.kind !== 'Namespace') {
    throw new Error('namespace kind mismatch');
  }
  if (object.metadata?.name !== name) {
    throw new Error('namespace name mismatch');
  }
  const uid = object.metadata?.uid;
  if (typeof uid !== 'string' || uid.length === 0) {
    throw new Error('namespace uid missing');
  }
  if (object.status?.phase === 'Terminating') {
    throw new Error('namespace terminating');
  }
  return uid;
}

/**
 * @param {ObservabilityRun} run
 * @param {string} snapshotPath
 * @param {string} contextName
 * @param {string} name
 */
function readFrozenNamespaceUid(run, snapshotPath, contextName, name) {
  const result = run('kubectl', [
    '--kubeconfig',
    snapshotPath,
    '--context',
    contextName,
    'get',
    'namespace',
    name,
    '--ignore-not-found',
    '-o',
    'json',
  ]);
  refuseCommand(result, 'namespace');
  const trimmed = (result.stdout ?? '').trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    const object = JSON.parse(trimmed);
    return assertNamespaceObject(object, name);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('namespace')) {
      throw error;
    }
    throw new Error('namespace json malformed', { cause: error });
  }
}

/**
 * @param {number} deadline
 * @param {() => number} now
 * @param {ObservabilityRun} underlying
 */
function createBoundedRunner(deadline, now, underlying) {
  /**
   * @param {string} command
   * @param {string[]} args
   * @param {{ input?: string, timeoutMs?: number }} [options]
   */
  return (command, args, options = {}) => {
    const before = now();
    if (before >= deadline) {
      throw new Error('unreadable: timeout');
    }
    const remaining = Math.floor(deadline - before);
    if (remaining <= 0) {
      throw new Error('unreadable: timeout');
    }
    const timeoutMs = Math.min(PREFLIGHT_COMMAND_TIMEOUT_MS, remaining);
    const result = underlying(command, args, { ...options, timeoutMs });
    const after = now();
    if (after > deadline && result.ok) {
      return { ...result, ok: false, timedOut: true };
    }
    return result;
  };
}

/**
 * @param {string} snapshotPath
 * @param {{ snapshotDev: number, snapshotIno: number }} meta
 */
function tryRemoveOwnedSnapshot(snapshotPath, meta) {
  try {
    const stat = lstatSync(snapshotPath);
    if (stat.dev !== meta.snapshotDev || stat.ino !== meta.snapshotIno) {
      return;
    }
    const uid = typeof process.getuid === 'function' ? process.getuid() : null;
    if (uid != null && stat.uid !== uid) {
      return;
    }
    unlinkSync(snapshotPath);
  } catch {
    // best-effort error path cleanup
  }
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {string} contextName
 * @param {{
 *   run?: ObservabilityRun,
 *   now?: () => number,
 *   deadline?: number,
 *   snapshotRoot?: string,
 * }} [deps]
 */
export function captureIdentity(profileId, contextName, deps = {}) {
  assertRefusedEnv();
  const now = deps.now ?? (() => Date.now());
  const started = now();
  const deadline = deps.deadline ?? started + PREFLIGHT_BUDGET_MS;
  if (deadline <= started) {
    throw new Error('unreadable: preflight deadline');
  }
  const baseRun = deps.run ?? runObservabilityReadCommand;
  const run = createBoundedRunner(deadline, now, baseRun);

  const profile = readPlatformProfile(profileId);
  if (contextName !== profile.contextName) {
    throw new Error('context profile mismatch');
  }
  const targetNamespace = profile.namespaces.observability;
  if (typeof targetNamespace !== 'string' || targetNamespace.length === 0) {
    throw new Error('observability namespace not configured');
  }

  const current = run('kubectl', ['config', 'current-context']);
  refuseCommand(current, 'current-context');
  const selectedContext = (current.stdout ?? '').trim();
  if (selectedContext !== profile.contextName) {
    throw new Error('selected context mismatch');
  }

  const target = assertPlatformTarget(profileId, { run });
  const expectedCluster = kindKubeconfigClusterName(profile.clusterName);

  const configView = run('kubectl', [
    '--context',
    contextName,
    'config',
    'view',
    '--minify',
    '--raw',
    '--flatten',
    '-o',
    'json',
  ]);
  refuseCommand(configView, 'config-view');
  let configBody;
  try {
    configBody = JSON.parse(configView.stdout);
  } catch {
    throw new Error('unreadable: config-json');
  }
  const { server, caSha256, caBytes } = assertSnapshotConfigBinding(
    configBody,
    contextName,
    expectedCluster,
  );
  const match = /^https:\/\/127\.0\.0\.1:(\d+)$/.exec(server);
  const port = Number(match?.[1]);
  assertLoopbackPortForProfile(profileId, port);
  if (port !== target.port) {
    throw new Error('port binding mismatch');
  }

  assertKindKubeconfigMatch(
    run,
    profileId,
    profile.clusterName,
    caBytes,
    server,
  );

  const dockerTuple = readControlPlaneTuple(run, profile.clusterName, port);

  const generatedRoot = deps.snapshotRoot == null;
  const root =
    deps.snapshotRoot ??
    mkdtempSync(join(tmpdir(), 'offscreen-observability-kubeconfig-'));
  if (generatedRoot) {
    chmodSync(root, 0o700);
  }
  const dirIdentity = assertSnapshotRoot(root);

  const rawSnapshotBytes = Buffer.from(configView.stdout, 'utf8');
  let snapshotMeta;
  let snapshotPath;
  try {
    snapshotMeta = writePrivateSnapshot(root, rawSnapshotBytes);
    snapshotPath = snapshotMeta.snapshotPath;
  } catch (error) {
    if (generatedRoot) {
      try {
        rmdirSync(root);
      } catch {
        // ignore
      }
    }
    throw error;
  }

  let kubeSystemUid;
  let baselineUid;
  let targetNamespaceUid;
  try {
    kubeSystemUid = readFrozenNamespaceUid(
      run,
      snapshotPath,
      contextName,
      'kube-system',
    );
    if (kubeSystemUid == null) {
      throw new Error('kube-system namespace absent');
    }

    const baselineName =
      profileId === 'dev' ? DEV_BASELINE_NAMESPACE : RELEASE_BASELINE_NAMESPACE;
    const baselineObject = run('kubectl', [
      '--kubeconfig',
      snapshotPath,
      '--context',
      contextName,
      'get',
      'namespace',
      baselineName,
      '--ignore-not-found',
      '-o',
      'json',
    ]);
    refuseCommand(baselineObject, 'baseline-namespace');
    const baselineTrimmed = (baselineObject.stdout ?? '').trim();
    if (baselineTrimmed.length === 0) {
      throw new Error('baseline namespace absent');
    }
    let baselineBody;
    try {
      baselineBody = JSON.parse(baselineTrimmed);
    } catch {
      throw new Error('baseline namespace malformed');
    }
    baselineUid = assertNamespaceObject(baselineBody, baselineName);
    if (baselineUid !== target.baselineUid) {
      throw new Error('baseline uid mismatch');
    }
    const baselineOwnerKey =
      profileId === 'dev'
        ? `${profile.ownerLabel}/owner`
        : `${profile.ownerLabel}/lab`;
    const baselineOwner = baselineBody.metadata?.labels?.[baselineOwnerKey];
    const expectedOwner =
      profileId === 'dev' ? DEV_CLUSTER_OWNER : profile.ownerValue;
    if (baselineOwner !== expectedOwner) {
      throw new Error('baseline owner mismatch');
    }

    targetNamespaceUid = readFrozenNamespaceUid(
      run,
      snapshotPath,
      contextName,
      targetNamespace,
    );
  } catch (error) {
    if (generatedRoot) {
      tryRemoveOwnedSnapshot(snapshotPath, snapshotMeta);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }

  let cleaned = false;
  /** @type {{ ok: boolean, error?: string, retainedPath?: string } | null} */
  let firstCleanupOutcome = null;

  const cleanup = () => {
    if (cleaned) {
      return firstCleanupOutcome ?? { ok: true };
    }
    cleaned = true;
    try {
      const stat = lstatSync(snapshotPath);
      if (
        stat.dev !== snapshotMeta.snapshotDev ||
        stat.ino !== snapshotMeta.snapshotIno
      ) {
        firstCleanupOutcome = {
          ok: false,
          error: 'snapshot identity mismatch',
          retainedPath: snapshotPath,
        };
        return firstCleanupOutcome;
      }
      const uid =
        typeof process.getuid === 'function' ? process.getuid() : null;
      if (uid != null && stat.uid !== uid) {
        firstCleanupOutcome = {
          ok: false,
          error: 'snapshot owner mismatch',
          retainedPath: snapshotPath,
        };
        return firstCleanupOutcome;
      }
      unlinkSync(snapshotPath);
      if (generatedRoot) {
        const dirStat = lstatSync(root);
        if (
          dirStat.dev !== dirIdentity.snapshotDirDev ||
          dirStat.ino !== dirIdentity.snapshotDirIno
        ) {
          firstCleanupOutcome = {
            ok: false,
            error: 'snapshot directory identity mismatch',
            retainedPath: root,
          };
          return firstCleanupOutcome;
        }
        rmdirSync(root);
      }
      firstCleanupOutcome = { ok: true };
      return firstCleanupOutcome;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      firstCleanupOutcome = {
        ok: false,
        error: message,
        retainedPath: snapshotPath,
      };
      return firstCleanupOutcome;
    }
  };

  return {
    profile,
    profileId,
    contextName,
    clusterName: profile.clusterName,
    namespace: targetNamespace,
    tuple: {
      profileId,
      contextName,
      clusterName: profile.clusterName,
      port,
      dockerContext: dockerTuple.dockerContext,
      dockerControlPlaneId: dockerTuple.dockerControlPlaneId,
      dockerEndpointHost: dockerTuple.dockerEndpointHost,
      caSha256,
      kubeSystemUid,
      baselineUid,
      targetNamespaceUid,
    },
    snapshotPath,
    snapshotSha256: snapshotMeta.snapshotSha256,
    snapshotDev: snapshotMeta.snapshotDev,
    snapshotIno: snapshotMeta.snapshotIno,
    snapshotDirDev: dirIdentity.snapshotDirDev,
    snapshotDirIno: dirIdentity.snapshotDirIno,
    cleanup,
  };
}

/**
 * @param {ReturnType<typeof captureIdentity>} identity
 * @param {{
 *   run?: ObservabilityRun,
 *   now?: () => number,
 *   deadline?: number,
 *   expectedNamespaceUid?: string | null,
 * }} [deps]
 */
export function recheckIdentity(identity, deps = {}) {
  assertRefusedEnv();
  const now = deps.now ?? (() => Date.now());
  const started = now();
  const deadline = deps.deadline ?? started + PREFLIGHT_BUDGET_MS;
  if (deadline <= started) {
    return { ok: false, reason: 'deadline' };
  }
  if (deps.expectedNamespaceUid !== undefined) {
    if (deps.expectedNamespaceUid !== identity.tuple.targetNamespaceUid) {
      return { ok: false, reason: 'expected-namespace-uid-mismatch' };
    }
  }

  let initialHash;
  try {
    const stat = lstatSync(identity.snapshotPath);
    if (
      stat.dev !== identity.snapshotDev ||
      stat.ino !== identity.snapshotIno ||
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      (stat.mode & 0o777) !== 0o600
    ) {
      return { ok: false, reason: 'snapshot-identity' };
    }
    const bytes = readFileSync(identity.snapshotPath);
    initialHash = createHash('sha256').update(bytes).digest('hex');
    if (initialHash !== identity.snapshotSha256) {
      return { ok: false, reason: 'snapshot-hash' };
    }
  } catch {
    return { ok: false, reason: 'snapshot-unreadable' };
  }

  const baseRun = deps.run ?? runObservabilityReadCommand;
  const run = createBoundedRunner(deadline, now, baseRun);

  const current = run('kubectl', ['config', 'current-context']);
  if (!current.ok || current.timedOut || current.missing) {
    return { ok: false, reason: 'current-context-unreadable' };
  }
  if ((current.stdout ?? '').trim() !== identity.contextName) {
    return { ok: false, reason: 'context-changed' };
  }

  const configView = run('kubectl', [
    '--context',
    identity.contextName,
    'config',
    'view',
    '--minify',
    '--raw',
    '--flatten',
    '-o',
    'json',
  ]);
  if (!configView.ok || configView.timedOut || configView.missing) {
    return { ok: false, reason: 'live-config-unreadable' };
  }
  let configBody;
  try {
    configBody = JSON.parse(configView.stdout);
  } catch {
    return { ok: false, reason: 'live-config-invalid' };
  }
  const expectedCluster = kindKubeconfigClusterName(identity.clusterName);
  let liveBinding;
  try {
    liveBinding = assertSnapshotConfigBinding(
      configBody,
      identity.contextName,
      expectedCluster,
    );
  } catch {
    return { ok: false, reason: 'live-config-invalid' };
  }
  if (
    liveBinding.caSha256 !== identity.tuple.caSha256 ||
    liveBinding.server !== `https://127.0.0.1:${identity.tuple.port}`
  ) {
    return { ok: false, reason: 'live-config-mismatch' };
  }

  try {
    assertKindKubeconfigMatch(
      run,
      identity.profileId,
      identity.clusterName,
      liveBinding.caBytes,
      liveBinding.server,
    );
  } catch {
    return { ok: false, reason: 'kind-config-mismatch' };
  }

  let dockerTuple;
  try {
    dockerTuple = readControlPlaneTuple(
      run,
      identity.clusterName,
      identity.tuple.port,
    );
  } catch {
    return { ok: false, reason: 'docker-mismatch' };
  }
  if (
    dockerTuple.dockerContext !== identity.tuple.dockerContext ||
    dockerTuple.dockerControlPlaneId !== identity.tuple.dockerControlPlaneId ||
    dockerTuple.dockerEndpointHost !== identity.tuple.dockerEndpointHost
  ) {
    return { ok: false, reason: 'docker-tuple-mismatch' };
  }

  let kubeSystemUid;
  try {
    kubeSystemUid = readFrozenNamespaceUid(
      run,
      identity.snapshotPath,
      identity.contextName,
      'kube-system',
    );
  } catch {
    return { ok: false, reason: 'kube-system-unreadable' };
  }
  if (kubeSystemUid !== identity.tuple.kubeSystemUid) {
    return { ok: false, reason: 'kube-system-uid-changed' };
  }

  const baselineName =
    identity.profileId === 'dev'
      ? DEV_BASELINE_NAMESPACE
      : RELEASE_BASELINE_NAMESPACE;
  const baseline = run('kubectl', [
    '--kubeconfig',
    identity.snapshotPath,
    '--context',
    identity.contextName,
    'get',
    'namespace',
    baselineName,
    '--ignore-not-found',
    '-o',
    'json',
  ]);
  if (!baseline.ok || baseline.timedOut || baseline.missing) {
    return { ok: false, reason: 'baseline-unreadable' };
  }
  let baselineBody;
  try {
    baselineBody = JSON.parse((baseline.stdout ?? '').trim());
    const uid = assertNamespaceObject(baselineBody, baselineName);
    if (uid !== identity.tuple.baselineUid) {
      return { ok: false, reason: 'baseline-uid-changed' };
    }
    const baselineOwnerKey =
      identity.profileId === 'dev'
        ? `${identity.profile.ownerLabel}/owner`
        : `${identity.profile.ownerLabel}/lab`;
    const expectedOwner =
      identity.profileId === 'dev'
        ? DEV_CLUSTER_OWNER
        : identity.profile.ownerValue;
    if (baselineBody.metadata?.labels?.[baselineOwnerKey] !== expectedOwner) {
      return { ok: false, reason: 'baseline-owner-changed' };
    }
  } catch {
    return { ok: false, reason: 'baseline-invalid' };
  }

  let observedTarget;
  try {
    observedTarget = readFrozenNamespaceUid(
      run,
      identity.snapshotPath,
      identity.contextName,
      identity.namespace,
    );
  } catch {
    return { ok: false, reason: 'target-namespace-unreadable' };
  }
  if (observedTarget !== identity.tuple.targetNamespaceUid) {
    return { ok: false, reason: 'target-namespace-uid-changed' };
  }

  if (now() > deadline) {
    return { ok: false, reason: 'deadline' };
  }

  try {
    const stat = lstatSync(identity.snapshotPath);
    if (
      stat.dev !== identity.snapshotDev ||
      stat.ino !== identity.snapshotIno
    ) {
      return { ok: false, reason: 'snapshot-identity' };
    }
    const bytes = readFileSync(identity.snapshotPath);
    const finalHash = createHash('sha256').update(bytes).digest('hex');
    if (finalHash !== identity.snapshotSha256) {
      return { ok: false, reason: 'snapshot-hash' };
    }
  } catch {
    return { ok: false, reason: 'snapshot-unreadable' };
  }

  return { ok: true };
}
