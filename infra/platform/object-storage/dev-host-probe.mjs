import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  DEV_S3_CONTEXT,
  DEV_S3_NAMESPACE,
  DEV_S3_PVC,
  DEV_S3_SECRET,
  DEV_S3_STORAGE_CLASS,
} from './dev-bootstrap.mjs';

const devProfile = readPlatformProfile('dev');
const DEV_OWNER_KEY = `${devProfile.ownerLabel}/owner`;

/**
 * @param {string} command
 * @param {string[]} args
 * @param {number} [timeoutMs]
 */
export function runObjectStoreReadOnly(command, args, timeoutMs = 15000) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: timeoutMs,
  });
  const timedOut =
    result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM';
  return {
    command,
    ok: !timedOut && !result.error && result.status === 0,
    timedOut,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function ownerFromLabels(labels = {}) {
  return labels[DEV_OWNER_KEY] ?? labels['offscreen.rpg/lab'] ?? null;
}

function resourceFrom(body, kind) {
  if (!body?.metadata?.name) return null;
  return {
    kind,
    name: body.metadata.name,
    namespace: body.metadata.namespace,
    owner: ownerFromLabels(body.metadata.labels),
    uid: body.metadata.uid ?? null,
    image: body.spec?.template?.spec?.containers?.[0]?.image,
    serviceType: body.spec?.type,
    storageClass: body.spec?.storageClassName,
  };
}

/**
 * Read-only inventory of the dev cluster. Secret data is not requested.
 * @param {{ run?: typeof runObjectStoreReadOnly, readMeminfo?: () => string }} [deps]
 */
export function collectDevObjectStoreProbe(deps = {}) {
  const run = deps.run ?? runObjectStoreReadOnly;
  const timedOutCommands = [];
  /** @type {{ kind: string, name: string, reason: string }[]} */
  const unreadables = [];
  const note = (result) => {
    if (result.timedOut) timedOutCommands.push(result.command);
    return result;
  };
  const docker = note(
    run('docker', ['version', '--format', '{{.Server.Version}}'], 8000),
  );
  const kind = note(run('kind', ['get', 'clusters'], 8000));
  const current = note(run('kubectl', ['config', 'current-context'], 8000));
  const info = note(
    run('kubectl', ['--context', DEV_S3_CONTEXT, 'cluster-info'], 15000),
  );
  const baseline = note(
    run(
      'kubectl',
      [
        '--context',
        DEV_S3_CONTEXT,
        'get',
        'namespace',
        'offscreen-dev-system',
        '-o',
        'json',
      ],
      15000,
    ),
  );
  const storage = note(
    run(
      'kubectl',
      [
        '--context',
        DEV_S3_CONTEXT,
        'get',
        'storageclass',
        DEV_S3_STORAGE_CLASS,
        '-o',
        'jsonpath={.metadata.name}',
      ],
      15000,
    ),
  );
  const names = [
    ['namespace', DEV_S3_NAMESPACE, false],
    ['secret', DEV_S3_SECRET, true],
    ['pvc', DEV_S3_PVC, true],
    ['deploy', 'object-store', true],
    ['svc', 'object-store', true],
  ];
  const resources = [];
  for (const [kind, name, namespaced] of names) {
    const args = ['--context', DEV_S3_CONTEXT, '--ignore-not-found'];
    if (namespaced) args.push('-n', DEV_S3_NAMESPACE);
    args.push('get', kind, name, '-o', 'json');
    const listed = note(run('kubectl', args, 15000));
    if (!listed.ok) {
      unreadables.push({
        kind:
          kind === 'namespace'
            ? 'Namespace'
            : kind === 'secret'
              ? 'Secret'
              : kind === 'pvc'
                ? 'PersistentVolumeClaim'
                : kind === 'deploy'
                  ? 'Deployment'
                  : 'Service',
        name,
        reason: 'kubectl get failed',
      });
      continue;
    }
    const body = parseJson(listed.stdout);
    const resource = resourceFrom(
      body,
      kind === 'namespace'
        ? 'Namespace'
        : kind === 'secret'
          ? 'Secret'
          : kind === 'pvc'
            ? 'PersistentVolumeClaim'
            : kind === 'deploy'
              ? 'Deployment'
              : 'Service',
    );
    if (resource) resources.push(resource);
  }
  let memoryMiB;
  try {
    const text = deps.readMeminfo
      ? deps.readMeminfo()
      : readFileSync('/proc/meminfo', 'utf8');
    const available = text.match(/^MemAvailable:\s+(\d+)\s+kB/m);
    memoryMiB = available ? Math.floor(Number(available[1]) / 1024) : 0;
  } catch {
    memoryMiB = 0;
  }
  const apiServer =
    info.stdout.match(/https:\/\/127\.0\.0\.1:\d+/)?.[0] ?? null;
  const baselineBody = parseJson(baseline.stdout);
  return {
    context: info.ok && apiServer ? DEV_S3_CONTEXT : current.stdout.trim(),
    currentContext: current.ok ? current.stdout.trim() : null,
    clusterName:
      kind.ok && kind.stdout.split('\n').includes('offscreen-dev')
        ? 'offscreen-dev'
        : null,
    baselineOwner: baselineBody?.metadata?.labels?.[DEV_OWNER_KEY] ?? null,
    storageClass: storage.ok ? storage.stdout.trim() : null,
    memoryMiB,
    dockerAvailable: docker.ok,
    kindAvailable: kind.ok,
    timedOutCommands,
    unreadables,
    resources,
  };
}

/**
 * @param {string} text
 */
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
