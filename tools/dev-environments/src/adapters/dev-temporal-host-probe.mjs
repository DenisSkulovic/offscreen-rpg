import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  DEV_TEMPORAL_CONTEXT,
  DEV_TEMPORAL_DYNAMIC_CONFIGMAP,
  DEV_TEMPORAL_NAMESPACE,
  DEV_TEMPORAL_PVC,
  DEV_TEMPORAL_SCHEMA_JOB,
  DEV_TEMPORAL_SCRIPTS_CONFIGMAP,
  DEV_TEMPORAL_SECRET,
  DEV_TEMPORAL_STORAGE_CLASS,
} from './dev-temporal-bootstrap.mjs';

/**
 * @param {string} command
 * @param {string[]} args
 * @param {number} [timeoutMs]
 */
export function runTemporalReadOnly(command, args, timeoutMs = 15000) {
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

function publicResource(body, kind) {
  if (!body?.metadata?.name) return null;
  const succeeded = Number(body.status?.succeeded ?? 0) >= 1;
  return {
    kind,
    name: body.metadata.name,
    namespace: body.metadata.namespace ?? null,
    owner: body.metadata.labels?.['offscreen.dev/owner'] ?? null,
    uid: body.metadata.uid ?? null,
    image: body.spec?.template?.spec?.containers?.[0]?.image ?? null,
    serviceType: body.spec?.type ?? null,
    succeeded,
    failed: Number(body.status?.failed ?? 0) > 0 && !succeeded,
  };
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Read-only inventory. Secret values are dropped before the probe is returned.
 * @param {{ run?: typeof runTemporalReadOnly, readMeminfo?: () => string }} [deps]
 */
export function collectDevTemporalProbe(deps = {}) {
  const run = deps.run ?? runTemporalReadOnly;
  const timedOutCommands = [];
  const note = (result) => {
    if (result.timedOut) timedOutCommands.push(result.command);
    return result;
  };
  const docker = note(run('docker', ['version', '--format', '{{.Server.Version}}'], 8000));
  const kind = note(run('kind', ['get', 'clusters'], 8000));
  const current = note(run('kubectl', ['config', 'current-context'], 8000));
  const info = note(run('kubectl', ['--context', DEV_TEMPORAL_CONTEXT, 'cluster-info'], 15000));
  const baseline = note(run('kubectl', ['--context', DEV_TEMPORAL_CONTEXT, 'get', 'namespace', 'offscreen-dev-system', '-o', 'json'], 15000));
  const storage = note(run('kubectl', ['--context', DEV_TEMPORAL_CONTEXT, 'get', 'storageclass', DEV_TEMPORAL_STORAGE_CLASS, '-o', 'jsonpath={.metadata.name}'], 15000));
  const names = [
    ['namespace', DEV_TEMPORAL_NAMESPACE, 'Namespace', false],
    ['secret', DEV_TEMPORAL_SECRET, 'Secret', true],
    ['pvc', DEV_TEMPORAL_PVC, 'PersistentVolumeClaim', true],
    ['job', DEV_TEMPORAL_SCHEMA_JOB, 'Job', true],
    ['deploy', 'temporal-postgres', 'Deployment', true],
    ['deploy', 'temporal-server', 'Deployment', true],
    ['svc', 'temporal-postgres', 'Service', true],
    ['svc', 'temporal-server', 'Service', true],
    ['configmap', DEV_TEMPORAL_SCRIPTS_CONFIGMAP, 'ConfigMap', true],
    ['configmap', DEV_TEMPORAL_DYNAMIC_CONFIGMAP, 'ConfigMap', true],
  ];
  const resources = [];
  for (const [kind, name, apiKind, namespaced] of names) {
    const args = ['--context', DEV_TEMPORAL_CONTEXT];
    if (namespaced) args.push('-n', DEV_TEMPORAL_NAMESPACE);
    args.push('get', kind, name, '-o', 'json');
    const listed = note(run('kubectl', args, 15000));
    const body = parseJson(listed.stdout);
    if (body?.data) delete body.data;
    if (body?.stringData) delete body.stringData;
    const resource = publicResource(body, apiKind);
    if (resource) resources.push(resource);
  }
  let memoryMiB = 0;
  try {
    const text = deps.readMeminfo ? deps.readMeminfo() : readFileSync('/proc/meminfo', 'utf8');
    const available = text.match(/^MemAvailable:\s+(\d+)\s+kB/m);
    memoryMiB = available ? Math.floor(Number(available[1]) / 1024) : 0;
  } catch {
    memoryMiB = 0;
  }
  const apiServer = info.stdout.match(/https:\/\/127\.0\.0\.1:\d+/)?.[0] ?? null;
  const baselineBody = parseJson(baseline.stdout);
  return {
    context: info.ok && apiServer ? DEV_TEMPORAL_CONTEXT : current.stdout.trim(),
    currentContext: current.ok ? current.stdout.trim() : null,
    clusterName: kind.ok && kind.stdout.split('\n').includes('offscreen-dev') ? 'offscreen-dev' : null,
    baselineOwner: baselineBody?.metadata?.labels?.['offscreen.dev/owner'] ?? null,
    storageClass: storage.ok ? storage.stdout.trim() : null,
    memoryMiB,
    dockerAvailable: docker.ok,
    kindAvailable: kind.ok,
    timedOutCommands,
    resources,
  };
}
