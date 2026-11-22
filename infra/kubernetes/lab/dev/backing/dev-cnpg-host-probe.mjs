import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEV_CNPG_CLUSTER,
  DEV_CNPG_CONTEXT,
  DEV_CNPG_NAMESPACE,
  DEV_CNPG_OWNER,
  parseCnpgPin,
} from './dev-cnpg-bootstrap.mjs';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} command
 * @param {string[]} args
 * @param {number} [timeoutMs]
 */
export function runCnpgReadOnly(command, args, timeoutMs = 15000) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: timeoutMs });
  const timedOut = result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM';
  return {
    command,
    ok: !timedOut && !result.error && result.status === 0,
    timedOut,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * @param {{ run?: typeof runCnpgReadOnly, readMeminfo?: () => string, readPin?: () => string }} [deps]
 */
export function collectDevCnpgProbe(deps = {}) {
  const run = deps.run ?? runCnpgReadOnly;
  const timedOutCommands = [];
  const note = (result) => {
    if (result.timedOut) timedOutCommands.push(result.command);
    return result;
  };
  const docker = note(run('docker', ['version', '--format', '{{.Server.Version}}'], 8000));
  const kind = note(run('kind', ['get', 'clusters'], 8000));
  const current = note(run('kubectl', ['config', 'current-context'], 8000));
  const info = note(run('kubectl', ['--context', DEV_CNPG_CONTEXT, 'cluster-info'], 15000));
  const baseline = note(run('kubectl', [
    '--context', DEV_CNPG_CONTEXT, 'get', 'namespace', 'offscreen-dev-system', '-o', 'json',
  ], 15000));
  const namespace = note(run('kubectl', [
    '--context', DEV_CNPG_CONTEXT, 'get', 'namespace', DEV_CNPG_NAMESPACE, '-o', 'json',
  ], 15000));
  const operator = note(run('kubectl', [
    '--context', DEV_CNPG_CONTEXT, '-n', 'cnpg-system', 'get', 'deployment', 'cnpg-controller-manager', '-o', 'json',
  ], 15000));
  const cluster = note(run('kubectl', [
    '--context', DEV_CNPG_CONTEXT, '-n', DEV_CNPG_NAMESPACE, 'get', 'cluster.postgresql.cnpg.io', DEV_CNPG_CLUSTER, '-o', 'json',
  ], 15000));
  let memoryMiB = 0;
  try {
    const text = deps.readMeminfo ? deps.readMeminfo() : readFileSync('/proc/meminfo', 'utf8');
    const available = text.match(/^MemAvailable:\s+(\d+)\s+kB/m);
    memoryMiB = available ? Math.floor(Number(available[1]) / 1024) : 0;
  } catch {
    memoryMiB = 0;
  }
  let pin = null;
  try {
    pin = parseCnpgPin(deps.readPin ? deps.readPin() : readFileSync(join(here, '../../cnpg/operator.pin'), 'utf8'));
  } catch {
    pin = null;
  }
  const apiServer = info.stdout.match(/https:\/\/127\.0\.0\.1:\d+/)?.[0] ?? null;
  /** @type {object[]} */
  const resources = [];
  const namespaceBody = parseJson(namespace.stdout);
  if (namespaceBody?.metadata?.name === DEV_CNPG_NAMESPACE) {
    resources.push({
      kind: 'Namespace',
      name: DEV_CNPG_NAMESPACE,
      owner: namespaceBody.metadata.labels?.['offscreen.dev/owner'] ?? null,
      uid: namespaceBody.metadata.uid ?? null,
    });
  }
  const operatorBody = parseJson(operator.stdout);
  const operatorImage = operatorBody?.spec?.template?.spec?.containers?.[0]?.image ?? null;
  if (operatorImage) {
    resources.push({
      kind: 'Deployment',
      name: 'cnpg-controller-manager',
      namespace: 'cnpg-system',
      image: operatorImage,
    });
  }
  const clusterBody = parseJson(cluster.stdout);
  if (clusterBody?.metadata?.name === DEV_CNPG_CLUSTER) {
    resources.push({
      kind: 'Cluster',
      name: DEV_CNPG_CLUSTER,
      namespace: DEV_CNPG_NAMESPACE,
      owner: clusterBody.metadata.labels?.['offscreen.dev/owner'] ?? null,
      uid: clusterBody.metadata.uid ?? null,
      storageClass: clusterBody.spec?.storage?.storageClass ?? null,
    });
  }
  const baselineBody = parseJson(baseline.stdout);
  return {
    context: info.ok && apiServer ? DEV_CNPG_CONTEXT : current.stdout.trim(),
    currentContext: current.ok ? current.stdout.trim() : null,
    clusterName: kind.ok && kind.stdout.split('\n').includes('offscreen-dev') ? 'offscreen-dev' : null,
    apiServer,
    baselineOwner: baselineBody?.metadata?.labels?.['offscreen.dev/owner'] ?? null,
    memoryMiB,
    dockerAvailable: docker.ok,
    kindAvailable: kind.ok,
    timedOutCommands,
    pin,
    resources,
  };
}

/**
 * @param {string} text
 */
function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
