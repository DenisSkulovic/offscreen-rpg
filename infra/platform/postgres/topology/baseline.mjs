import {
  readPlatformObject,
  runPlatformCommand,
} from '../../common/commands.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import {
  DEV_CNPG_MIN_MEMORY_MIB,
  RELEASE_CNPG_MIN_MEMORY_MIB,
  baselineCnpgClusterName,
} from '../config.mjs';
import {
  assessCnpgClusterTopologyReadiness,
  waitForCnpgTopologyReadiness,
} from '../cluster-readiness.mjs';
import {
  buildInstancesCasPatch,
  parseKubernetesMemoryToMib,
  assessTopologyMemoryPreflight,
  summarizeTopologyResources,
} from './model.mjs';
import {
  assessTopologyObservation,
  collectCnpgTopologyObservation,
} from './observation.mjs';

/** @typedef {import('./arguments.mjs').ParsedTopologyCli} ParsedTopologyCli */

/**
 * @param {ParsedTopologyCli} request
 * @param {ReturnType<typeof collectCnpgTopologyObservation>} observation
 */
export function planCnpgTopology(request, observation) {
  if (observation.targetError) {
    return {
      command: 'plan',
      ok: false,
      readOnly: true,
      refusals: [{ id: 'target-unverified', detail: observation.targetError }],
    };
  }
  const refusals = assessTopologyObservation(observation);
  const currentInstances = observation.cluster?.spec?.instances ?? null;
  return {
    command: 'plan',
    ok: refusals.length === 0,
    readOnly: true,
    env: request.env,
    baselineCluster: baselineCnpgClusterName(request.env),
    currentInstances,
    targetInstances: request.instances,
    resources:
      observation.expectedCluster && Number.isInteger(currentInstances)
        ? summarizeTopologyResources(
            observation.expectedCluster,
            currentInstances,
            request.instances,
          )
        : null,
    refusals,
    mutated: false,
    complete: refusals.length === 0,
  };
}

/**
 * @param {ParsedTopologyCli} request
 * @param {ReturnType<typeof collectCnpgTopologyObservation>} observation
 */
export function statusCnpgTopology(request, observation) {
  const plan = planCnpgTopology(request, observation);
  return { ...plan, command: 'status' };
}

/**
 * @param {ParsedTopologyCli} request
 * @param {ReturnType<typeof collectCnpgTopologyObservation>} observation
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   sleep?: (ms: number) => void,
 *   now?: () => number,
 *   assertTarget?: import('../../common/commands.mjs').assertPlatformTarget,
 *   collect?: typeof collectCnpgTopologyObservation,
 * }} deps
 */
export function ensureCnpgTopology(request, observation, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const collect = deps.collect ?? collectCnpgTopologyObservation;
  const profile = readPlatformProfile(request.env);
  const baselineName = baselineCnpgClusterName(request.env);

  // --confirm-context is operational authorization to mutate local topology, not
  // proof of Kubernetes RBAC identity. Shared dev scaling is reserved for the
  // human owner, not ordinary agent stack commands.
  if (request.confirmContext !== profile.contextName) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      refusals: [
        {
          id: 'confirm-context-mismatch',
          detail: `confirm-context must equal ${profile.contextName}`,
        },
      ],
      mutated: false,
      complete: false,
    };
  }

  const preliminary = planCnpgTopology(request, observation);
  if (!preliminary.ok) {
    return {
      ...preliminary,
      command: 'ensure',
      readOnly: false,
      mutated: false,
      complete: false,
    };
  }

  const currentInstances = observation.cluster.spec.instances;
  const targetInstances = request.instances;
  const minHeadroom =
    request.env === 'dev'
      ? DEV_CNPG_MIN_MEMORY_MIB
      : RELEASE_CNPG_MIN_MEMORY_MIB;

  if (targetInstances < currentInstances && !request.allowScaleDown) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      env: request.env,
      currentInstances,
      targetInstances,
      refusals: [
        {
          id: 'scale-down-not-allowed',
          detail: 'scale-down requires --allow-scale-down',
        },
      ],
      mutated: false,
      complete: false,
    };
  }

  let liveLimitMiB;
  try {
    liveLimitMiB = parseKubernetesMemoryToMib(
      observation.cluster.spec?.resources?.limits?.memory,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      refusals: [{ id: 'live-memory-limit-unreadable', detail: message }],
      mutated: false,
      complete: false,
    };
  }

  const memory = assessTopologyMemoryPreflight(
    currentInstances,
    targetInstances,
    observation.memoryMiB,
    liveLimitMiB,
    minHeadroom,
  );
  if (!memory.ok) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      refusals: [{ id: 'insufficient-memory', detail: memory.detail }],
      mutated: false,
      complete: false,
    };
  }

  const resources = summarizeTopologyResources(
    observation.expectedCluster,
    currentInstances,
    targetInstances,
  );

  if (targetInstances !== currentInstances) {
    const starting = assessCnpgClusterTopologyReadiness(
      observation.cluster,
      currentInstances,
    );
    if (!starting.ok) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        currentInstances,
        targetInstances,
        resources,
        refusals: [
          {
            id: 'unhealthy-starting-topology',
            detail: starting.detail,
          },
        ],
        mutated: false,
        complete: false,
      };
    }
  }

  let mutated = false;
  if (targetInstances !== currentInstances) {
    const fence = {
      postgresNamespaceUid: observation.postgresNamespace.metadata.uid,
      clusterUid: observation.cluster.metadata.uid,
      clusterResourceVersion: observation.cluster.metadata.resourceVersion,
    };

    const beforePatch = collect(request.env, deps);
    if (
      beforePatch.postgresNamespace?.metadata?.uid !==
        fence.postgresNamespaceUid ||
      beforePatch.cluster?.metadata?.uid !== fence.clusterUid ||
      beforePatch.cluster?.metadata?.resourceVersion !==
        fence.clusterResourceVersion
    ) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        refusals: [
          {
            id: 'fence-changed-before-patch',
            detail: 'target namespace or cluster identity changed before patch',
          },
        ],
        mutated: false,
        complete: false,
      };
    }

    const patchBody = buildInstancesCasPatch(
      fence.clusterUid,
      fence.clusterResourceVersion,
      currentInstances,
      targetInstances,
    );
    const patch = run('kubectl', [
      '--context',
      profile.contextName,
      '-n',
      profile.namespaces.postgres,
      'patch',
      'cluster.postgresql.cnpg.io',
      baselineName,
      '--type=json',
      '-p',
      JSON.stringify(patchBody),
    ]);

    if (!patch.ok) {
      const after = readPlatformObject(
        {
          profileId: request.env,
          resource: 'cluster.postgresql.cnpg.io',
          name: baselineName,
          namespace: profile.namespaces.postgres,
        },
        { run },
      );
      const observedInstances =
        after.state === 'present' ? after.object?.spec?.instances : 'unknown';
      const uncertain = observedInstances === targetInstances;
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        refusals: [
          {
            id: uncertain ? 'patch-result-uncertain' : 'patch-failed',
            detail:
              patch.stderr?.trim() ||
              `patch failed; observed instances ${String(observedInstances)}`,
          },
        ],
        mutated: uncertain,
        complete: false,
      };
    }
    mutated = true;
  }

  const readiness = waitForCnpgTopologyReadiness(request.env, targetInstances, {
    run,
    sleep: deps.sleep,
    now: deps.now,
  });
  if (!readiness.ok) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      env: request.env,
      currentInstances,
      targetInstances,
      resources,
      refusals: [{ id: 'readiness-timeout', detail: readiness.detail }],
      mutated,
      complete: false,
    };
  }

  return {
    command: 'ensure',
    ok: true,
    readOnly: false,
    env: request.env,
    baselineCluster: baselineName,
    currentInstances,
    targetInstances,
    currentPrimary: readiness.currentPrimary,
    resources,
    refusals: [],
    mutated,
    complete: true,
  };
}
