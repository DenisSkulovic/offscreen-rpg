import {
  chmodSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DEV_API_PORT_RANGE,
  LOOPBACK_API_ADDRESS,
  RELEASE_API_PORT,
} from '../../clusters/kind/manager/config.mjs';
import {
  assertPlatformTarget,
  kindKubeconfigClusterName,
  runPlatformCommand,
} from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';

export const PREFLIGHT_BUDGET_MS = 210_000;
export const INVENTORY_BUDGET_MS = 120_000;
export const CLEANUP_BUDGET_MS = 15_000;
export const OBSERVATION_BUDGET_MS =
  PREFLIGHT_BUDGET_MS + INVENTORY_BUDGET_MS + CLEANUP_BUDGET_MS;
export const PREFLIGHT_COMMAND_TIMEOUT_MS = 15_000;

const REFUSED_ENV_KEYS = [
  'KUBECONFIG',
  'HELM_KUBEAPISERVER',
  'HELM_KUBETOKEN',
  'HELM_BEARER_TOKEN',
  'DOCKER_HOST',
  'DOCKER_CONTEXT',
  'DOCKER_TLS_VERIFY',
];

/**
 * @param {ReturnType<typeof runPlatformCommand>} result
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
  for (const key of REFUSED_ENV_KEYS) {
    const value = process.env[key];
    if (value != null && String(value).length > 0) {
      throw new Error(`refused env: ${key}`);
    }
  }
}

/**
 * @param {object} configBody
 * @param {string} expectedKubeconfigClusterName
 */
function assertSnapshotConfigBinding(
  configBody,
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
  if (contexts[0]?.name !== contexts[0]?.context?.cluster) {
    throw new Error('context name must match cluster reference');
  }
  if (contexts[0]?.context?.cluster !== expectedKubeconfigClusterName) {
    throw new Error('selected context cluster mismatch');
  }
  const cluster = clusters[0]?.cluster ?? {};
  const user = users[0]?.user ?? {};
  if (user.exec || user['auth-provider']) {
    throw new Error('exec or auth-provider kube user refused');
  }
  if (cluster['insecure-skip-tls-verify'] === true) {
    throw new Error('insecure TLS refused');
  }
  if (cluster['proxy-url']) {
    throw new Error('proxy kubeconfig refused');
  }
  const server = cluster.server;
  if (
    typeof server !== 'string' ||
    !/^https:\/\/127\.0\.0\.1:\d+$/.test(server)
  ) {
    throw new Error('cluster server must be explicit loopback https');
  }
  return server;
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
 * @param {typeof runPlatformCommand} run
 * @param {string} clusterName
 * @param {number} port
 */
function readControlPlaneTuple(run, clusterName, port) {
  const context = run('docker', ['context', 'show'], {
    timeoutMs: PREFLIGHT_COMMAND_TIMEOUT_MS,
  });
  refuseCommand(context, 'docker-context');
  const ctx = context.stdout.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(ctx)) {
    throw new Error('docker context unreadable');
  }
  const endpoint = run(
    'docker',
    ['context', 'inspect', ctx, '--format', '{{json .Endpoints.docker.Host}}'],
    { timeoutMs: PREFLIGHT_COMMAND_TIMEOUT_MS },
  );
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
  const inspect = run('docker', ['inspect', `${clusterName}-control-plane`], {
    timeoutMs: PREFLIGHT_COMMAND_TIMEOUT_MS,
  });
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
  const portOk = bindings.some(
    (b) =>
      b.HostIp === LOOPBACK_API_ADDRESS && String(b.HostPort) === String(port),
  );
  if (
    typeof id !== 'string' ||
    !running ||
    labels['io.x-k8s.kind.cluster'] !== clusterName ||
    labels['io.x-k8s.kind.role'] !== 'control-plane' ||
    !portOk
  ) {
    throw new Error('control-plane identity mismatch');
  }
  return { dockerControlPlaneId: id, dockerEndpointHost: host };
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} contextName
 * @param {string} name
 */
function readNamespaceUid(run, contextName, name) {
  const result = run(
    'kubectl',
    [
      '--context',
      contextName,
      'get',
      'namespace',
      name,
      '--ignore-not-found',
      '-o',
      'json',
    ],
    { timeoutMs: PREFLIGHT_COMMAND_TIMEOUT_MS },
  );
  refuseCommand(result, 'namespace');
  const trimmed = (result.stdout ?? '').trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    const object = JSON.parse(trimmed);
    const uid = object?.metadata?.uid;
    if (typeof uid !== 'string' || uid.length === 0) {
      throw new Error('namespace uid missing');
    }
    return uid;
  } catch (error) {
    if (error instanceof Error && error.message === 'namespace uid missing') {
      throw error;
    }
    throw new Error('namespace json malformed');
  }
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {string} contextName
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   now?: () => number,
 *   deadline?: number,
 *   snapshotRoot?: string,
 * }} [deps]
 */
export function captureIdentity(profileId, contextName, deps = {}) {
  assertRefusedEnv();
  const run = deps.run ?? runPlatformCommand;
  const now = deps.now ?? (() => Date.now());
  const started = now();
  const deadline = deps.deadline ?? started + PREFLIGHT_BUDGET_MS;
  if (deadline <= started) {
    throw new Error('unreadable: preflight deadline');
  }

  const profile = readPlatformProfile(profileId);
  if (contextName !== profile.contextName) {
    throw new Error('context profile mismatch');
  }
  const namespace = profile.namespaces.observability;
  if (typeof namespace !== 'string' || namespace.length === 0) {
    throw new Error('observability namespace not configured');
  }

  const target = assertPlatformTarget(profileId, { run });
  const expectedCluster = kindKubeconfigClusterName(profile.clusterName);
  const configView = run(
    'kubectl',
    [
      '--context',
      contextName,
      'config',
      'view',
      '--minify',
      '--raw',
      '--flatten',
      '-o',
      'json',
    ],
    {
      timeoutMs: Math.min(
        PREFLIGHT_COMMAND_TIMEOUT_MS,
        Math.max(1, deadline - now()),
      ),
    },
  );
  refuseCommand(configView, 'config-view');
  let configBody;
  try {
    configBody = JSON.parse(configView.stdout);
  } catch {
    throw new Error('unreadable: config-json');
  }
  const server = assertSnapshotConfigBinding(configBody, expectedCluster);
  const match = /^https:\/\/127\.0\.0\.1:(\d+)$/.exec(server);
  const port = Number(match?.[1]);
  assertLoopbackPortForProfile(profileId, port);
  if (port !== target.port) {
    throw new Error('port binding mismatch');
  }

  const { dockerControlPlaneId } = readControlPlaneTuple(
    run,
    profile.clusterName,
    port,
  );
  const kubeSystemUid = readNamespaceUid(run, contextName, 'kube-system');
  const targetNamespaceUid = readNamespaceUid(run, contextName, namespace);

  const root =
    deps.snapshotRoot ??
    mkdtempSync(join(tmpdir(), 'offscreen-observability-kubeconfig-'));
  const snapshotPath = join(root, 'snapshot.json');
  const minified = JSON.stringify(configBody);
  writeFileSync(snapshotPath, `${minified}\n`, { mode: 0o600 });
  chmodSync(snapshotPath, 0o600);
  const stat = lstatSync(snapshotPath);
  if (!stat.isFile() || (stat.mode & 0o077) !== 0) {
    throw new Error('snapshot permissions invalid');
  }

  let cleaned = false;
  /** @type {Error | null} */
  let cleanupError = null;

  const cleanup = () => {
    if (cleaned) {
      return cleanupError
        ? { ok: false, error: cleanupError.message }
        : { ok: true };
    }
    cleaned = true;
    try {
      rmSync(snapshotPath, { force: true });
      if (deps.snapshotRoot == null) {
        rmSync(root, { recursive: true, force: true });
      }
      return { ok: true };
    } catch (error) {
      cleanupError =
        error instanceof Error ? error : new Error(String(error ?? 'cleanup'));
      return { ok: false, error: cleanupError.message };
    }
  };

  return {
    profile,
    profileId,
    contextName,
    clusterName: profile.clusterName,
    namespace,
    tuple: {
      profileId,
      contextName,
      clusterName: profile.clusterName,
      port,
      dockerControlPlaneId,
      kubeSystemUid,
      baselineUid: target.baselineUid,
      targetNamespaceUid,
    },
    snapshotPath,
    cleanup,
  };
}

/**
 * @param {ReturnType<typeof captureIdentity>} identity
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   now?: () => number,
 *   deadline?: number,
 *   expectedNamespaceUid?: string | null,
 * }} [deps]
 */
export function recheckIdentity(identity, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const now = deps.now ?? (() => Date.now());
  const deadline = deps.deadline ?? now() + PREFLIGHT_COMMAND_TIMEOUT_MS;
  if (deadline <= now()) {
    return { ok: false, reason: 'deadline' };
  }
  try {
    const stat = lstatSync(identity.snapshotPath);
    if (!stat.isFile() || (stat.mode & 0o077) !== 0) {
      return { ok: false, reason: 'snapshot-permissions' };
    }
    const stored = JSON.parse(readFileSync(identity.snapshotPath, 'utf8'));
    const expectedCluster = kindKubeconfigClusterName(identity.clusterName);
    assertSnapshotConfigBinding(stored, expectedCluster);
  } catch {
    return { ok: false, reason: 'snapshot-unreadable' };
  }

  const current = run(
    'kubectl',
    ['--context', identity.contextName, 'config', 'current-context'],
    {
      timeoutMs: Math.min(
        PREFLIGHT_COMMAND_TIMEOUT_MS,
        Math.max(1, deadline - now()),
      ),
    },
  );
  if (!current.ok || current.timedOut || current.missing) {
    return { ok: false, reason: 'current-context-unreadable' };
  }
  const selected = (current.stdout ?? '').trim();
  if (selected !== identity.contextName) {
    return { ok: false, reason: 'context-changed' };
  }

  const minify = run(
    'kubectl',
    [
      '--context',
      identity.contextName,
      'config',
      'view',
      '--minify',
      '-o',
      'json',
    ],
    {
      timeoutMs: Math.min(
        PREFLIGHT_COMMAND_TIMEOUT_MS,
        Math.max(1, deadline - now()),
      ),
    },
  );
  if (!minify.ok || minify.timedOut || minify.missing) {
    return { ok: false, reason: 'live-config-unreadable' };
  }
  try {
    const live = JSON.parse(minify.stdout);
    const expectedCluster = kindKubeconfigClusterName(identity.clusterName);
    assertSnapshotConfigBinding(live, expectedCluster);
    const server = live.clusters?.[0]?.cluster?.server;
    const match = /^https:\/\/127\.0\.0\.1:(\d+)$/.exec(server ?? '');
    const port = Number(match?.[1]);
    if (port !== identity.tuple.port) {
      return { ok: false, reason: 'port-changed' };
    }
  } catch {
    return { ok: false, reason: 'live-config-invalid' };
  }

  if (deps.expectedNamespaceUid !== undefined) {
    const observed = readNamespaceUid(
      run,
      identity.contextName,
      identity.namespace,
    );
    if (observed !== deps.expectedNamespaceUid) {
      return { ok: false, reason: 'namespace-uid-changed' };
    }
  }
  return { ok: true };
}
