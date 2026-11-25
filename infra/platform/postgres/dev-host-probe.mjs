import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPlatformCommand } from '../common/commands.mjs';
import {
  observeState,
  platformRead,
  readMemoryMiB,
} from './bootstrap/observation-helpers.mjs';
import {
  DEV_CNPG_CLUSTER,
  DEV_CNPG_CONTEXT,
  DEV_CNPG_NAMESPACE,
  parseCnpgPin,
} from './config.mjs';

const postgresRoot = dirname(fileURLToPath(import.meta.url));
const operatorPinPath = join(postgresRoot, 'operator.pin');

/**
 * @param {string} command
 * @param {string[]} args
 * @param {number} [timeoutMs]
 */
export function runCnpgReadOnly(command, args, timeoutMs = 15000) {
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

/**
 * @param {{ run?: typeof runCnpgReadOnly | typeof runPlatformCommand, readMeminfo?: () => string, readPin?: () => string }} [deps]
 */
export function collectDevCnpgProbe(deps = {}) {
  const timedOutCommands = [];
  const note = (result) => {
    if (result.timedOut)
      timedOutCommands.push(
        result.command ?? result.stderr?.slice(0, 20) ?? 'command',
      );
    return result;
  };
  const shellRun = (command, args, options = {}) => {
    const timeoutMs = options.timeoutMs ?? 15000;
    if (deps.run) {
      const fromDeps = deps.run(command, args, timeoutMs);
      return note({
        command,
        ok: fromDeps.ok,
        timedOut: fromDeps.timedOut ?? false,
        stdout: fromDeps.stdout ?? '',
        stderr: fromDeps.stderr ?? '',
        missing: fromDeps.missing ?? false,
      });
    }
    return note(runCnpgReadOnly(command, args, timeoutMs));
  };
  const kubectlRun = (command, args, options = {}) => {
    const result = deps.run
      ? deps.run(command, args, options.timeoutMs ?? 15000)
      : runPlatformCommand(command, args, {
          timeoutMs: options.timeoutMs ?? 15000,
        });
    if (result.timedOut) timedOutCommands.push(command);
    return result;
  };
  const read = platformRead(kubectlRun);

  const docker = shellRun(
    'docker',
    ['version', '--format', '{{.Server.Version}}'],
    { timeoutMs: 8000 },
  );
  const kind = shellRun('kind', ['get', 'clusters'], { timeoutMs: 8000 });
  const current = shellRun('kubectl', ['config', 'current-context'], {
    timeoutMs: 8000,
  });
  const info = shellRun(
    'kubectl',
    ['--context', DEV_CNPG_CONTEXT, 'cluster-info'],
    { timeoutMs: 15000 },
  );

  /** @type {{ id: string, reason: string }[]} */
  const unreadableReads = [];

  const baselineObservation = read({
    profileId: 'dev',
    resource: 'namespace',
    name: 'offscreen-dev-system',
  });
  const baselineState = observeState(
    baselineObservation,
    'baseline-namespace',
    unreadableReads,
  );

  const namespaceObservation = read({
    profileId: 'dev',
    resource: 'namespace',
    name: DEV_CNPG_NAMESPACE,
  });
  const namespaceState = observeState(
    namespaceObservation,
    'postgres-namespace',
    unreadableReads,
  );

  const operatorObservation = read({
    profileId: 'dev',
    resource: 'deployment',
    name: 'cnpg-controller-manager',
    namespace: 'cnpg-system',
  });
  const operatorState = observeState(
    operatorObservation,
    'cnpg-operator',
    unreadableReads,
  );

  const clusterObservation = read({
    profileId: 'dev',
    resource: 'cluster.postgresql.cnpg.io',
    name: DEV_CNPG_CLUSTER,
    namespace: DEV_CNPG_NAMESPACE,
  });
  const clusterState = observeState(
    clusterObservation,
    'postgres-cluster',
    unreadableReads,
  );

  const crdObservation = read({
    profileId: 'dev',
    resource: 'crd',
    name: 'clusters.postgresql.cnpg.io',
  });
  const crdState = observeState(
    crdObservation,
    'postgres-crd',
    unreadableReads,
  );

  const memoryMiB = readMemoryMiB(deps);

  let pin;
  try {
    pin = parseCnpgPin(
      deps.readPin ? deps.readPin() : readFileSync(operatorPinPath, 'utf8'),
    );
  } catch {
    pin = null;
  }

  const apiServer =
    info.stdout.match(/https:\/\/127\.0\.0\.1:\d+/)?.[0] ?? null;
  /** @type {object[]} */
  const resources = [];
  if (namespaceState === 'present') {
    const namespaceBody = namespaceObservation.object;
    resources.push({
      kind: 'Namespace',
      name: DEV_CNPG_NAMESPACE,
      owner: namespaceBody.metadata.labels?.['offscreen.dev/owner'] ?? null,
      uid: namespaceBody.metadata.uid ?? null,
    });
  }
  if (operatorState === 'present') {
    const operatorBody = operatorObservation.object;
    const operatorImage =
      operatorBody?.spec?.template?.spec?.containers?.[0]?.image ?? null;
    if (operatorImage) {
      resources.push({
        kind: 'Deployment',
        name: 'cnpg-controller-manager',
        namespace: 'cnpg-system',
        image: operatorImage,
      });
    }
  }
  if (clusterState === 'present') {
    const clusterBody = clusterObservation.object;
    resources.push({
      kind: 'Cluster',
      name: DEV_CNPG_CLUSTER,
      namespace: DEV_CNPG_NAMESPACE,
      owner: clusterBody.metadata.labels?.['offscreen.dev/owner'] ?? null,
      uid: clusterBody.metadata.uid ?? null,
      storageClass: clusterBody.spec?.storage?.storageClass ?? null,
    });
  }

  let baselineOwner = null;
  if (baselineState === 'present') {
    baselineOwner =
      baselineObservation.object.metadata.labels?.['offscreen.dev/owner'] ??
      null;
  }

  return {
    context: info.ok && apiServer ? DEV_CNPG_CONTEXT : current.stdout.trim(),
    currentContext: current.ok ? current.stdout.trim() : null,
    clusterName:
      kind.ok && kind.stdout.split('\n').includes('offscreen-dev')
        ? 'offscreen-dev'
        : null,
    apiServer,
    baselineOwner,
    memoryMiB,
    dockerAvailable: docker.ok,
    kindAvailable: kind.ok,
    timedOutCommands,
    pin,
    resources,
    unreadableReads,
    crdState: crdState === 'unreadable' ? 'unreadable' : crdState,
  };
}
