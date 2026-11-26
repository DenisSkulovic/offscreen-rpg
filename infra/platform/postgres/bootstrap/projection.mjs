import { runPlatformCommand } from '../../common/commands.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import { loadOperatorArtifact } from './operator.mjs';
import { collectBaselineObservation, assessBaselineObservation } from './observation.mjs';
import { readMemoryMiB } from './observation-helpers.mjs';

/** Compatibility projection for diagnostics, never mutation authority. */
export function collectProjectedBaseline(profileId, deps = {}) {
  const profile = readPlatformProfile(profileId);
  const timedOutCommands = [];
  const run = (command, args, options = {}) => {
    const result = (deps.run ?? runPlatformCommand)(command, args, options);
    if (result.timedOut) timedOutCommands.push(command);
    return result;
  };
  const memoryMiB = readMemoryMiB(deps);
  let artifact;
  let observation;
  let fullAssessment;
  try {
    artifact = loadOperatorArtifact({ path: deps.operatorManifestPath });
    observation = collectBaselineObservation(profileId, { artifact, run });
    fullAssessment = assessBaselineObservation(observation);
  } catch {
    fullAssessment = {
      operator: 'unknown', namespace: 'unknown', cluster: 'unknown',
      refusals: [{ id: 'observation-unavailable', detail: 'Target or pinned inventory observation unavailable' }],
    };
  }
  const resources = [];
  const unreadableReads = [];
  const ns = observation?.namespace;
  const cluster = observation?.cluster;
  const deploymentEntry = artifact?.inventory.find(entry => entry.object.kind === 'Deployment');
  const deployment = observation?.observations.get(deploymentEntry?.id);
  const crdEntry = artifact?.inventory.find(entry => entry.name === 'clusters.postgresql.cnpg.io');
  const crd = observation?.observations.get(crdEntry?.id);
  for (const [id, observed] of [['postgres-namespace', ns], ['postgres-cluster', cluster], ['cnpg-operator', deployment], ['postgres-crd', crd]]) {
    if (!observed || observed.state === 'unreadable') unreadableReads.push({ id, reason: observed?.reason ?? 'unavailable' });
  }
  if (ns?.state === 'present') {
    const object = ns.object;
    resources.push({
      kind: 'Namespace', name: object.metadata.name, uid: object.metadata.uid,
      owner: object.metadata.labels?.['offscreen.dev/owner'] ?? null,
      labLabel: object.metadata.labels?.['offscreen.rpg/lab'] ?? null,
    });
  }
  if (deployment?.state === 'present') {
    const object = deployment.object;
    resources.push({
      kind: 'Deployment', name: object.metadata.name, namespace: object.metadata.namespace,
      image: object.spec?.template?.spec?.containers?.[0]?.image ?? null,
    });
  }
  if (cluster?.state === 'present') {
    const object = cluster.object;
    const initdb = object.spec?.bootstrap?.initdb ?? {};
    resources.push({
      kind: 'Cluster', name: object.metadata.name, namespace: object.metadata.namespace,
      uid: object.metadata.uid, owner: object.metadata.labels?.['offscreen.dev/owner'] ?? null,
      image: object.spec?.imageName ?? null, instances: object.spec?.instances ?? null,
      storageClass: object.spec?.storage?.storageClass ?? null, storageSize: object.spec?.storage?.size ?? null,
      bootstrap: { database: initdb.database ?? null, owner: initdb.owner ?? null,
        localeCType: initdb.localeCType ?? null, localeCollate: initdb.localeCollate ?? null },
    });
  }
  return {
    context: observation?.target.contextName ?? null,
    currentContext: null,
    clusterName: observation?.target.clusterName ?? null,
    apiServer: observation ? 'https://127.0.0.1:' + observation.target.port : null,
    baselineOwner: observation ? profile.ownerValue : null,
    memoryMiB, dockerAvailable: Boolean(observation), kindAvailable: Boolean(observation),
    timedOutCommands, pin: artifact?.pin ?? null, resources, unreadableReads,
    crdState: crd?.state ?? 'unreadable', fullAssessment,
  };
}
