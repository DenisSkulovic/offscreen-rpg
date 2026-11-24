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
function isClusterNamespaceRead(resource) {
  const lower = resource.toLowerCase();
  return lower === 'namespace' || lower === 'namespaces' || lower === 'ns';
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

  const clusterScoped = isClusterNamespaceRead(resource);
  if (!clusterScoped) {
    if (typeof namespace !== 'string') {
      throw new Error('namespace is required for namespaced resources');
    }
    assertIdentifier(namespace, 'namespace');
  } else if (namespace != null && namespace !== '') {
    throw new Error('namespace must not be set for cluster namespace reads');
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
 * @param {object} configView
 * @param {string} expectedClusterName
 */
function readExplicitContextCluster(configView, expectedClusterName) {
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
  if (typeof clusterRef !== 'string' || clusterRef !== expectedClusterName) {
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
export function assertPlatformTarget(
  profileId,
  { run = runPlatformCommand } = {},
) {
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

  const port = readExplicitContextCluster(configBody, profile.clusterName);
  assertLoopbackPort(port, profileId);

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
