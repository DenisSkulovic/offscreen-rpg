import { spawnSync } from 'node:child_process';
import {
  DEV_API_PORT_RANGE,
  LOOPBACK_API_ADDRESS,
  RELEASE_API_PORT,
} from '../../clusters/kind/manager/config.mjs';
import {
  DEV_BASELINE_NAMESPACE,
  DEV_CLUSTER_OWNER,
} from '../../clusters/kind/manager/dev-bootstrap.mjs';
import { readPlatformProfile } from './profile.mjs';

export const PLATFORM_COMMAND_TIMEOUT_MS = 15_000;
const MAX_BUFFER_BYTES = 8 * 1024 * 1024;

const DNS_LABEL =
  /^[a-z0-9](?:[-a-z0-9]*[a-z0-9])?(?:\.[a-z0-9](?:[-a-z0-9]*[a-z0-9])?)*$/;
const RESOURCE_NAME = /^[a-z0-9][a-z0-9.\-/]*$/;

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ input?: string, timeoutMs?: number }} [options]
 */
export function runPlatformCommand(
  command,
  args,
  { input, timeoutMs = PLATFORM_COMMAND_TIMEOUT_MS } = {},
) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    input,
    timeout: timeoutMs,
    maxBuffer: MAX_BUFFER_BYTES,
    windowsHide: true,
  });
  const timedOut =
    result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM';
  const missing = result.error?.code === 'ENOENT';
  const status = result.status ?? null;
  return {
    ok: !timedOut && !missing && !result.error && status === 0,
    status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    timedOut,
    missing,
  };
}

/**
 * @param {string} value
 * @param {string} field
 * @param {number} [maxLen=253]
 */
function assertIdentifier(value, field, maxLen = 253) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maxLen
  ) {
    throw new Error(`invalid ${field}`);
  }
  if (!DNS_LABEL.test(value)) {
    throw new Error(`invalid ${field}`);
  }
}

/**
 * @param {string} value
 * @param {string} field
 */
function assertResourceType(value, field) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 253) {
    throw new Error(`invalid ${field}`);
  }
  if (!RESOURCE_NAME.test(value)) {
    throw new Error(`invalid ${field}`);
  }
}

/**
 * @param {string} resource
 */
function isClusterScopedRead(resource) {
  const lower = resource.toLowerCase();
  return ['namespace', 'namespaces', 'ns', 'customresourcedefinition', 'customresourcedefinitions', 'crd', 'crds'].includes(lower);
}

/**
 * @param {{ profileId: 'dev' | 'release', resource: string, name: string, namespace?: string }} spec
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function readPlatformObject(
  { profileId, resource, name, namespace },
  { run = runPlatformCommand } = {},
) {
  const profile = readPlatformProfile(profileId);
  assertResourceType(resource, 'resource');
  assertIdentifier(name, 'name');

  const clusterScoped = isClusterScopedRead(resource);
  if (!clusterScoped) {
    if (typeof namespace !== 'string') {
      throw new Error('namespace is required for namespaced resources');
    }
    assertIdentifier(namespace, 'namespace');
  } else if (namespace != null && namespace !== '') {
    throw new Error('namespace must not be set for cluster-scoped reads');
  }

  /** @type {string[]} */
  const args = [
    '--context',
    profile.contextName,
    'get',
    resource,
    name,
    '--ignore-not-found',
    '-o',
    'json',
  ];
  if (!clusterScoped) {
    args.splice(4, 0, '-n', namespace);
  }

  const result = run('kubectl', args);
  if (result.missing) {
    return { state: 'unreadable', reason: 'kubectl missing' };
  }
  if (result.timedOut) {
    return { state: 'unreadable', reason: 'kubectl timed out' };
  }
  if (!result.ok) {
    return { state: 'unreadable', reason: 'kubectl get failed' };
  }

  const trimmed = result.stdout.trim();
  if (trimmed.length === 0) {
    return { state: 'absent' };
  }

  /** @type {object} */
  let object;
  try {
    object = JSON.parse(trimmed);
  } catch {
    return { state: 'unreadable', reason: 'malformed json' };
  }

  if (object?.metadata?.name !== name) {
    return { state: 'unreadable', reason: 'name mismatch' };
  }
  if (!clusterScoped && object?.metadata?.namespace !== namespace) {
    return { state: 'unreadable', reason: 'namespace mismatch' };
  }

  return { state: 'present', object };
}

/**
 * Kind writes the kubeconfig cluster entry as `kind-<cluster name>`.
 * That entry name is not the `kind get clusters` name.
 * @param {string} kindClusterName
 */
export function kindKubeconfigClusterName(kindClusterName) {
  return `kind-${kindClusterName}`;
}

/**
 * @param {object} configView
 * @param {string} expectedKubeconfigClusterName
 */
function readExplicitContextCluster(configView, expectedKubeconfigClusterName) {
  const contexts = Array.isArray(configView.contexts)
    ? configView.contexts
    : [];
  const clusters = Array.isArray(configView.clusters)
    ? configView.clusters
    : [];
  if (contexts.length !== 1) {
    throw new Error('expected exactly one selected context');
  }
  const selected = contexts[0];
  const clusterRef = selected?.context?.cluster;
  if (
    typeof clusterRef !== 'string' ||
    clusterRef !== expectedKubeconfigClusterName
  ) {
    throw new Error('selected context cluster mismatch');
  }
  const clusterEntry = clusters.find((entry) => entry?.name === clusterRef);
  const server = clusterEntry?.cluster?.server;
  if (typeof server !== 'string') {
    throw new Error('cluster server missing');
  }
  const match = server.match(/^https:\/\/([^:]+):(\d+)$/);
  if (!match) {
    throw new Error('cluster server is not explicit loopback https');
  }
  const host = match[1];
  const port = Number.parseInt(match[2], 10);
  if (host !== LOOPBACK_API_ADDRESS) {
    throw new Error('cluster server must use loopback address');
  }
  return port;
}

/**
 * @param {number} port
 * @param {'dev' | 'release'} profileId
 */
function assertLoopbackPort(port, profileId) {
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
    throw new Error(
      `dev loopback port ${port} is outside ${DEV_API_PORT_RANGE.start}-${DEV_API_PORT_RANGE.end}`,
    );
  }
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
function assertTargetIdentity(profileId, run) {
  const profile = readPlatformProfile(profileId);

  const kindList = run('kind', ['get', 'clusters']);
  if (!kindList.ok) {
    throw new Error('kind cluster list unreadable');
  }
  const clusterNames = kindList.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!clusterNames.includes(profile.clusterName)) {
    throw new Error(`kind cluster ${profile.clusterName} not found`);
  }

  const configView = run('kubectl', [
    '--context',
    profile.contextName,
    'config',
    'view',
    '--minify',
    '-o',
    'json',
  ]);
  if (!configView.ok) {
    throw new Error('kubectl config view unreadable');
  }
  let configBody;
  try {
    configBody = JSON.parse(configView.stdout);
  } catch {
    throw new Error('kubectl config view malformed');
  }

  const port = readExplicitContextCluster(
    configBody,
    kindKubeconfigClusterName(profile.clusterName),
  );
  assertLoopbackPort(port, profileId);

  return { profile, port };
}

/** Read-only ownership assertion. */
export function assertPlatformTarget(profileId, { run = runPlatformCommand } = {}) {
  const { profile, port } = assertTargetIdentity(profileId, run);
  if (profileId === 'dev') {
    const baseline = readPlatformObject(
      { profileId: 'dev', resource: 'namespace', name: DEV_BASELINE_NAMESPACE },
      { run },
    );
    if (baseline.state !== 'present') {
      throw new Error('dev baseline namespace unreadable or absent');
    }
    const owner =
      baseline.object?.metadata?.labels?.[`${profile.ownerLabel}/owner`];
    const uid = baseline.object?.metadata?.uid;
    if (
      owner !== DEV_CLUSTER_OWNER ||
      typeof uid !== 'string' ||
      uid.length === 0
    ) {
      throw new Error('dev baseline namespace owner or uid missing');
    }
    return {
      ok: true,
      profileId,
      clusterName: profile.clusterName,
      contextName: profile.contextName,
      port,
    };
  }

  const labNamespace = readPlatformObject(
    {
      profileId: 'release',
      resource: 'namespace',
      name: profile.namespaces.postgres,
    },
    { run },
  );
  if (labNamespace.state !== 'present') {
    throw new Error('release lab namespace unreadable or absent');
  }
  const lab =
    labNamespace.object?.metadata?.labels?.[`${profile.ownerLabel}/lab`];
  if (lab !== profile.ownerValue) {
    throw new Error('release lab namespace label mismatch');
  }

  return {
    ok: true,
    profileId,
    clusterName: profile.clusterName,
    contextName: profile.contextName,
    port,
  };
}

/** Explicit cluster-bootstrap action; never adopts or relabels an existing namespace. */
export function ensureReleaseOwnershipBaseline({ run = runPlatformCommand } = {}) {
  const { profile } = assertTargetIdentity('release', run);
  const spec = { profileId: 'release', resource: 'namespace', name: profile.namespaces.postgres };
  const existing = readPlatformObject(spec, { run });
  if (existing.state === 'unreadable') throw new Error('release baseline unreadable');
  if (existing.state === 'present') {
    if (existing.object.metadata?.labels?.[profile.ownerLabel + '/lab'] !== profile.ownerValue) {
      throw new Error('release baseline has foreign ownership');
    }
    return { ok: true, mutated: false };
  }
  // Bind the API endpoint to the actual local Kind control-plane container.
  if (process.env.DOCKER_HOST || process.env.DOCKER_CONTEXT || process.env.DOCKER_TLS_VERIFY) throw new Error('Docker endpoint override refused');
  const context = run('docker', ['context', 'show']);
  if (!context.ok || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(context.stdout.trim())) throw new Error('Docker context unreadable');
  const endpoint = run('docker', ['context', 'inspect', context.stdout.trim(), '--format', '{{json .Endpoints.docker.Host}}']);
  if (!endpoint.ok || !/^unix:\/\/\//.test(JSON.parse(endpoint.stdout))) throw new Error('nonlocal Docker endpoint');
  const node = run('docker', ['inspect', profile.clusterName + '-control-plane']);
  if (!node.ok) throw new Error('release control-plane unreadable');
  const containers = JSON.parse(node.stdout);
  const cp = containers[0];
  const bindings = cp?.NetworkSettings?.Ports?.['6443/tcp'] ?? [];
  if (containers.length !== 1 || cp?.Config?.Labels?.['io.x-k8s.kind.cluster'] !== profile.clusterName ||
      cp?.Config?.Labels?.['io.x-k8s.kind.role'] !== 'control-plane' || cp?.State?.Running !== true ||
      !bindings.some(b => b.HostIp === '127.0.0.1' && b.HostPort === String(RELEASE_API_PORT))) {
    throw new Error('release control-plane identity mismatch');
  }
  const config = run('kubectl', ['--context', profile.contextName, 'config', 'view', '--minify', '-o', 'json']);
  if (!config.ok) throw new Error('release kubeconfig unreadable');
  const body = JSON.parse(config.stdout);
  if (body.users?.some(u => u.user?.exec || u.user?.['auth-provider']) || body.clusters?.some(c => c.cluster?.['proxy-url'])) throw new Error('external authentication or proxy refused');
  const created = run('kubectl', ['--context', profile.contextName, 'create', '-f', '-'], {
    input: JSON.stringify({ apiVersion: 'v1', kind: 'Namespace', metadata: { name: spec.name, labels: { [profile.ownerLabel + '/lab']: profile.ownerValue } } }),
  });
  if (!created.ok) throw new Error('release baseline creation failed');
  assertPlatformTarget('release', { run });
  return { ok: true, mutated: true };
}
