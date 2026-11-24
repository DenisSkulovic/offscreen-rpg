import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  DEV_BASELINE_NAMESPACE,
  DEV_CLUSTER_OWNER,
  DEV_KIND_CLUSTER_NAME,
  DEV_KIND_CONTEXT_NAME,
  RELEASE_KIND_CLUSTER_NAME,
} from './dev-cluster-bootstrap.mjs';

export const HOST_PROBE_TIMEOUT_MS = 8000;

/**
 * @param {string} command
 * @param {string[]} args
 * @param {number} [timeoutMs]
 */
export function runReadOnlyCommand(command, args, timeoutMs = HOST_PROBE_TIMEOUT_MS) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: timeoutMs,
    windowsHide: true,
  });
  const timedOut = result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM';
  return {
    command,
    ok: !timedOut && !result.error && result.status === 0,
    missing: result.error?.code === 'ENOENT',
    timedOut,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * Listening loopback ports from /proc/net/tcp. State 0A is LISTEN.
 * @param {string} text
 * @returns {number[]}
 */
export function parseLoopbackListenPorts(text) {
  const ports = new Set();
  for (const line of text.split('\n').slice(1)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length < 4 || fields[3] !== '0A') continue;
    const [address, portHex] = fields[1].split(':');
    if (address !== '0100007F' || !portHex) continue;
    ports.add(Number.parseInt(portHex, 16));
  }
  return [...ports];
}

/**
 * @param {string} text
 */
export function parseMeminfoMiB(text) {
  const available = text.match(/^MemAvailable:\s+(\d+)\s+kB/m);
  const total = text.match(/^MemTotal:\s+(\d+)\s+kB/m);
  return {
    memAvailableMiB: available ? Math.floor(Number(available[1]) / 1024) : null,
    memTotalMiB: total ? Math.floor(Number(total[1]) / 1024) : null,
  };
}

/**
 * @param {{
 *   run?: typeof runReadOnlyCommand,
 *   readMeminfo?: () => string,
 *   readTcp?: () => string,
 * }} [deps]
 */
export function collectDevClusterProbe(deps = {}) {
  const run = deps.run ?? runReadOnlyCommand;
  const timedOutCommands = [];
  const noteTimeout = (result) => {
    if (result.timedOut) timedOutCommands.push(result.command);
    return result;
  };

  const docker = noteTimeout(run('docker', ['version', '--format', '{{.Server.Version}}']));
  const kind = noteTimeout(run('kind', ['get', 'clusters']));
  const contexts = noteTimeout(run('kubectl', ['config', 'get-contexts', '-o', 'name']));
  const current = noteTimeout(run('kubectl', ['config', 'current-context']));

  let meminfo = '';
  try {
    meminfo = deps.readMeminfo ? deps.readMeminfo() : readFileSync('/proc/meminfo', 'utf8');
  } catch {
    meminfo = '';
  }
  const capacity = parseMeminfoMiB(meminfo);

  let tcp = '';
  try {
    tcp = deps.readTcp ? deps.readTcp() : readFileSync('/proc/net/tcp', 'utf8');
  } catch {
    tcp = '';
  }

  const clusterNames = kind.ok
    ? kind.stdout.split('\n').map((line) => line.trim()).filter(Boolean)
    : [];
  const contextNames = contexts.ok
    ? contexts.stdout.split('\n').map((line) => line.trim()).filter(Boolean)
    : [];
  const devListed = clusterNames.includes(DEV_KIND_CLUSTER_NAME);
  const devContext = contextNames.includes(DEV_KIND_CONTEXT_NAME);
  const ownership = devListed ? readDevOwnership(run, devContext, noteTimeout) : null;

  /** @type {object[]} */
  const clusters = clusterNames.map((name) => {
    if (name !== DEV_KIND_CLUSTER_NAME) {
      return { name, owner: null, uid: null, ownership: 'unknown' };
    }
    return ownership?.cluster ?? { name, owner: null, uid: null, ownership: 'unknown' };
  });

  return {
    dockerAvailable: docker.ok,
    kindAvailable: kind.ok || (!kind.missing && !kind.timedOut && kind.stdout.length > 0),
    memoryMiB: capacity.memAvailableMiB ?? 0,
    capacity,
    clusters,
    contexts: contextNames.map((name) => ({
      name,
      cluster: name === DEV_KIND_CONTEXT_NAME ? DEV_KIND_CLUSTER_NAME : null,
      owner: name === DEV_KIND_CONTEXT_NAME ? ownership?.cluster.owner ?? null : null,
      uid: name === DEV_KIND_CONTEXT_NAME ? ownership?.cluster.uid ?? null : null,
      ownership: name === DEV_KIND_CONTEXT_NAME ? ownership?.cluster.ownership ?? 'unknown' : 'unknown',
    })),
    namespaces: ownership?.namespace ? [ownership.namespace] : [],
    listeningPorts: parseLoopbackListenPorts(tcp),
    currentContext: current.ok ? current.stdout.trim() : null,
    timedOutCommands,
    releaseClusterObserved: kind.ok ? clusterNames.includes(RELEASE_KIND_CLUSTER_NAME) : null,
  };
}

/**
 * Reads the baseline namespace only through the explicit dev context.
 * A missing context or label leaves ownership unknown.
 * @param {typeof runReadOnlyCommand} run
 * @param {boolean} devContext
 * @param {(result: ReturnType<typeof runReadOnlyCommand>) => ReturnType<typeof runReadOnlyCommand>} noteTimeout
 */
function readDevOwnership(run, devContext, noteTimeout) {
  if (!devContext) {
    return {
      cluster: {
        name: DEV_KIND_CLUSTER_NAME,
        owner: null,
        uid: null,
        ownership: 'unknown',
      },
      namespace: null,
    };
  }
  const listed = noteTimeout(run('kubectl', [
    '--context',
    DEV_KIND_CONTEXT_NAME,
    'get',
    'namespace',
    DEV_BASELINE_NAMESPACE,
    '-o',
    'json',
  ]));
  if (!listed.ok) {
    return {
      cluster: {
        name: DEV_KIND_CLUSTER_NAME,
        owner: null,
        uid: null,
        ownership: 'unknown',
      },
      namespace: null,
    };
  }
  let body;
  try {
    body = JSON.parse(listed.stdout);
  } catch {
    return {
      cluster: {
        name: DEV_KIND_CLUSTER_NAME,
        owner: null,
        uid: null,
        ownership: 'unknown',
      },
      namespace: null,
    };
  }
  const owner = body?.metadata?.labels?.['offscreen.dev/owner'] ?? null;
  const uid = body?.metadata?.uid ?? null;
  const verified = owner === DEV_CLUSTER_OWNER && typeof uid === 'string' && uid.length > 0;
  return {
    cluster: {
      name: DEV_KIND_CLUSTER_NAME,
      owner: verified ? owner : owner,
      uid: verified ? uid : null,
      ownership: verified ? 'owned' : owner ? 'foreign' : 'unknown',
    },
    namespace: {
      cluster: DEV_KIND_CLUSTER_NAME,
      name: DEV_BASELINE_NAMESPACE,
      owner: verified ? owner : owner,
      uid: verified ? uid : null,
      ownership: verified ? 'owned' : owner ? 'foreign' : 'unknown',
    },
  };
}
