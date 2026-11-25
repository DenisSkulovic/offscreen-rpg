import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPlatformCommand } from '../../common/commands.mjs';
import {
  RELEASE_CNPG_CLUSTER,
  RELEASE_CNPG_NAMESPACE,
  parseCnpgPin,
  RELEASE_CNPG_CONTEXT,
  RELEASE_CNPG_CLUSTER_NAME,
  RELEASE_LAB_LABEL_KEY,
} from '../config.mjs';
import {
  observeState,
  platformRead,
  readMemoryMiB,
} from './observation-helpers.mjs';

const postgresRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const operatorPinPath = join(postgresRoot, 'operator.pin');

export function collectReleaseCnpgProbe(deps = {}) {
  const timedOutCommands = [];
  const kubectlRun = (command, args, options = {}) => {
    const result = deps.run
      ? deps.run(command, args, { timeoutMs: options.timeoutMs ?? 15000 })
      : runPlatformCommand(command, args, {
          timeoutMs: options.timeoutMs ?? 15000,
        });
    if (result.timedOut) timedOutCommands.push(command);
    return result;
  };
  const read = platformRead(kubectlRun);

  const kind = kubectlRun('kind', ['get', 'clusters'], { timeoutMs: 8000 });
  const current = kubectlRun('kubectl', ['config', 'current-context'], {
    timeoutMs: 8000,
  });
  const info = kubectlRun(
    'kubectl',
    ['--context', RELEASE_CNPG_CONTEXT, 'cluster-info'],
    { timeoutMs: 15000 },
  );

  /** @type {{ id: string, reason: string }[]} */
  const unreadableReads = [];

  const namespaceObservation = read({
    profileId: 'release',
    resource: 'namespace',
    name: RELEASE_CNPG_NAMESPACE,
  });
  const namespaceState = observeState(
    namespaceObservation,
    'postgres-namespace',
    unreadableReads,
  );

  const operatorObservation = read({
    profileId: 'release',
    resource: 'deployment',
    name: 'cnpg-controller-manager',
    namespace: 'cnpg-system',
  });
  const operatorState = observeState(
    operatorObservation,
    'cnpg-operator',
    unreadableReads,
  );

  const crdObservation = read({
    profileId: 'release',
    resource: 'crd',
    name: 'clusters.postgresql.cnpg.io',
  });
  const crdProbeState = observeState(
    crdObservation,
    'postgres-crd',
    unreadableReads,
  );

  const clusterObservation =
    crdProbeState === 'absent'
      ? { state: 'absent' }
      : crdProbeState === 'present'
        ? read({
            profileId: 'release',
            resource: 'cluster.postgresql.cnpg.io',
            name: RELEASE_CNPG_CLUSTER,
            namespace: RELEASE_CNPG_NAMESPACE,
          })
        : { state: 'unreadable', reason: 'CRD inventory unreadable' };
  const clusterState = observeState(
    clusterObservation,
    'postgres-cluster',
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
      name: RELEASE_CNPG_NAMESPACE,
      labLabel: namespaceBody.metadata?.labels?.[RELEASE_LAB_LABEL_KEY] ?? null,
      uid: namespaceBody.metadata?.uid ?? null,
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
    const initdb = clusterBody.spec?.bootstrap?.initdb ?? {};
    resources.push({
      kind: 'Cluster',
      name: RELEASE_CNPG_CLUSTER,
      namespace: RELEASE_CNPG_NAMESPACE,
      uid: clusterBody.metadata?.uid ?? null,
      image: clusterBody.spec?.imageName ?? null,
      instances: clusterBody.spec?.instances ?? null,
      storageClass: clusterBody.spec?.storage?.storageClass ?? null,
      storageSize: clusterBody.spec?.storage?.size ?? null,
      bootstrap: {
        database: initdb.database ?? null,
        owner: initdb.owner ?? null,
        localeCType: initdb.localeCType ?? null,
        localeCollate: initdb.localeCollate ?? null,
      },
    });
  }

  return {
    context:
      info.ok && apiServer ? RELEASE_CNPG_CONTEXT : current.stdout.trim(),
    clusterName:
      kind.ok && kind.stdout.split('\n').includes(RELEASE_CNPG_CLUSTER_NAME)
        ? RELEASE_CNPG_CLUSTER_NAME
        : null,
    apiServer,
    memoryMiB,
    timedOutCommands,
    pin,
    resources,
    unreadableReads,
    crdState: crdProbeState === 'unreadable' ? 'unreadable' : crdProbeState,
  };
}
