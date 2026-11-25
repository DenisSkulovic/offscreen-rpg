import {
  readPlatformObject,
  runPlatformCommand,
} from '../../common/commands.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import {
  DEV_CNPG_MIN_MEMORY_MIB,
  RELEASE_CNPG_MIN_MEMORY_MIB,
} from '../config.mjs';
import {
  assessCnpgClusterTopologyReadiness,
  waitForCnpgClusterReadiness,
} from '../cluster-readiness.mjs';
import {
  buildInstancesCasPatch,
  buildOwnedCnpgEndpoints,
  parseKubernetesMemoryToMib,
  assessTopologyMemoryPreflight,
  renderOwnedPostgresCluster,
  summarizeTopologyResources,
} from './model.mjs';
import {
  assessOwnedTopologyObservation,
  collectOwnedCnpgTopologyObservation,
} from './observation.mjs';

/** @typedef {import('./arguments.mjs').ParsedTopologyCli} ParsedTopologyCli */

/**
 * @param {object} createResult
 */
export function parseCreatedObjectUid(createResult) {
  if (!createResult.stdout?.trim()) {
    return null;
  }
  try {
    const object = JSON.parse(createResult.stdout);
    const uid = object?.metadata?.uid;
    return typeof uid === 'string' && uid.length > 0 ? uid : null;
  } catch {
    return null;
  }
}

/**
 * @param {ParsedTopologyCli} request
 * @param {ReturnType<typeof collectOwnedCnpgTopologyObservation>} observation
 */
export function planOwnedCnpgTopology(request, observation) {
  if (observation.targetError) {
    return {
      command: 'plan',
      ok: false,
      readOnly: true,
      refusals: [{ id: 'target-unverified', detail: observation.targetError }],
    };
  }
  const refusals = assessOwnedTopologyObservation(observation);
  const currentInstances = observation.cluster?.spec?.instances ?? 0;
  let resources = null;
  if (observation.expectedCluster) {
    const scaled = globalThis.structuredClone(observation.expectedCluster);
    scaled.spec.instances = request.instances;
    resources = summarizeTopologyResources(
      scaled,
      currentInstances,
      request.instances,
    );
  }
  return {
    command: 'plan',
    ok: refusals.length === 0,
    readOnly: true,
    mode: 'owned',
    env: request.env,
    ownerId: request.ownerId,
    clusterName: request.clusterName,
    namespace: observation.namespaceName,
    currentInstances,
    targetInstances: request.instances,
    resources,
    refusals,
    mutated: false,
    complete: refusals.length === 0,
  };
}

/**
 * @param {ParsedTopologyCli} request
 * @param {ReturnType<typeof collectOwnedCnpgTopologyObservation>} observation
 */
export function statusOwnedCnpgTopology(request, observation) {
  const plan = planOwnedCnpgTopology(request, observation);
  const endpoints = buildOwnedCnpgEndpoints(
    request.clusterName,
    observation.namespaceName,
  );
  return {
    ...plan,
    command: 'status',
    endpoints,
    clusterUid: observation.cluster?.metadata?.uid ?? null,
    instances: observation.cluster?.spec?.instances ?? null,
  };
}

/**
 * @param {ParsedTopologyCli} request
 * @param {ReturnType<typeof collectOwnedCnpgTopologyObservation>} observation
 * @param {typeof renderOwnedPostgresCluster} renderOwned
 * @param {typeof runPlatformCommand} run
 */
function assessOwnedEnsurePreflight(request, observation, renderOwned, run) {
  const currentInstances = observation.cluster?.spec?.instances ?? 0;
  const targetInstances = request.instances;
  const minHeadroom =
    request.env === 'dev'
      ? DEV_CNPG_MIN_MEMORY_MIB
      : RELEASE_CNPG_MIN_MEMORY_MIB;

  const { namespace: namespaceManifest, cluster: expectedCluster } =
    renderOwned(
      {
        profileId: request.env,
        ownerId: request.ownerId,
        clusterName: request.clusterName,
        instances: targetInstances,
      },
      { run },
    );

  let liveLimitMiB;
  try {
    liveLimitMiB = parseKubernetesMemoryToMib(
      (observation.cluster ?? expectedCluster).spec?.resources?.limits?.memory,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      receipt: {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: [{ id: 'live-memory-limit-unreadable', detail: message }],
        mutated: false,
        complete: false,
      },
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
      ok: false,
      receipt: {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: [{ id: 'insufficient-memory', detail: memory.detail }],
        mutated: false,
        complete: false,
      },
    };
  }

  const resources = summarizeTopologyResources(
    expectedCluster,
    currentInstances,
    targetInstances,
  );

  if (observation.cluster && targetInstances !== currentInstances) {
    const starting = assessCnpgClusterTopologyReadiness(
      observation.cluster,
      currentInstances,
    );
    if (!starting.ok) {
      return {
        ok: false,
        receipt: {
          command: 'ensure',
          ok: false,
          readOnly: false,
          mode: 'owned',
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
        },
      };
    }
  }

  return {
    ok: true,
    currentInstances,
    targetInstances,
    namespaceManifest,
    expectedCluster,
    resources,
  };
}

/**
 * @param {ParsedTopologyCli} request
 * @param {typeof collectOwnedCnpgTopologyObservation} collect
 * @param {Record<string, unknown>} deps
 * @param {string | null} ownedNamespaceUid
 * @param {string | null} clusterUid
 * @param {string | null} clusterResourceVersion
 */
function recheckOwnedTopologyBeforeWrite(
  request,
  collect,
  deps,
  ownedNamespaceUid,
  clusterUid,
  clusterResourceVersion,
) {
  const fresh = collect(
    request.env,
    request.ownerId,
    request.clusterName,
    deps,
  );
  if (fresh.targetError) {
    return {
      ok: false,
      refusals: [{ id: 'target-unverified', detail: fresh.targetError }],
    };
  }
  const ownedLabelsOk =
    fresh.namespaceOwnership === 'absent' ||
    fresh.namespaceOwnership === 'owned';
  if (!ownedLabelsOk) {
    return {
      ok: false,
      refusals: [
        {
          id: 'fence-owned-namespace-drift',
          detail: 'owned namespace owner labels changed before write',
        },
      ],
    };
  }
  if (
    ownedNamespaceUid != null &&
    fresh.ownedNamespace?.metadata?.uid !== ownedNamespaceUid
  ) {
    return {
      ok: false,
      refusals: [
        {
          id: 'fence-owned-namespace-drift',
          detail: 'owned namespace uid changed before write',
        },
      ],
    };
  }
  if (
    clusterUid != null &&
    (fresh.cluster?.metadata?.uid !== clusterUid ||
      fresh.cluster?.metadata?.resourceVersion !== clusterResourceVersion)
  ) {
    return {
      ok: false,
      refusals: [
        {
          id: 'fence-changed-before-patch',
          detail: 'target cluster identity changed before write',
        },
      ],
    };
  }
  return { ok: true, observation: fresh };
}

/**
 * @param {ParsedTopologyCli} request
 * @param {ReturnType<typeof collectOwnedCnpgTopologyObservation>} observation
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   sleep?: (ms: number) => void,
 *   now?: () => number,
 *   assertTarget?: import('../../common/commands.mjs').assertPlatformTarget,
 *   collect?: typeof collectOwnedCnpgTopologyObservation,
 *   renderOwned?: typeof renderOwnedPostgresCluster,
 * }} deps
 */
export function ensureOwnedCnpgTopology(request, observation, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const collect = deps.collect ?? collectOwnedCnpgTopologyObservation;
  const renderOwned = deps.renderOwned ?? renderOwnedPostgresCluster;
  const profile = readPlatformProfile(request.env);
  const namespaceName = observation.namespaceName;

  // Phase: operational confirm-context authorization
  if (request.confirmContext !== profile.contextName) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      mode: 'owned',
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

  // Phase: read-only plan gate
  const preliminary = planOwnedCnpgTopology(request, observation);
  if (!preliminary.ok) {
    return {
      ...preliminary,
      command: 'ensure',
      readOnly: false,
      mutated: false,
      complete: false,
    };
  }

  const currentInstances = observation.cluster?.spec?.instances ?? 0;
  const targetInstances = request.instances;

  // Phase: scale-down policy
  if (targetInstances < currentInstances && !request.allowScaleDown) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      mode: 'owned',
      env: request.env,
      ownerId: request.ownerId,
      clusterName: request.clusterName,
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

  // Phase: render manifests, memory preflight, and starting topology health
  const preflight = assessOwnedEnsurePreflight(
    request,
    observation,
    renderOwned,
    run,
  );
  if (!preflight.ok) {
    return preflight.receipt;
  }
  const { namespaceManifest, expectedCluster, resources } = preflight;

  let mutated = false;
  let ownedNamespaceUid = observation.ownedNamespace?.metadata?.uid ?? null;
  let clusterUid = observation.cluster?.metadata?.uid ?? null;
  let clusterResourceVersion =
    observation.cluster?.metadata?.resourceVersion ?? null;

  const namespaceAbsent = observation.namespaceOwnership === 'absent';
  const clusterAbsent = observation.clusterIdentity === 'absent';

  // Phase: create-only namespace write when absent
  if (namespaceAbsent) {
    const fence = recheckOwnedTopologyBeforeWrite(
      request,
      collect,
      deps,
      ownedNamespaceUid,
      clusterUid,
      clusterResourceVersion,
    );
    if (!fence.ok) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: fence.refusals,
        mutated,
        complete: false,
      };
    }
    const createNs = run(
      'kubectl',
      ['--context', profile.contextName, 'create', '-f', '-', '-o', 'json'],
      { input: `${JSON.stringify(namespaceManifest)}\n` },
    );
    if (!createNs.ok) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: [
          {
            id: 'namespace-create-failed',
            detail: createNs.stderr?.trim() || 'namespace create failed',
          },
        ],
        mutated,
        complete: false,
      };
    }
    ownedNamespaceUid = parseCreatedObjectUid(createNs);
    if (!ownedNamespaceUid) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: [
          {
            id: 'namespace-create-unreadable',
            detail: 'namespace create succeeded but uid was not captured',
          },
        ],
        mutated: true,
        complete: false,
        recoveryIdentity: {
          ownerId: request.ownerId,
          clusterName: request.clusterName,
          namespace: namespaceName,
          namespaceUid: null,
        },
      };
    }
    mutated = true;
  }

  // Phase: create-only cluster write when absent
  if (clusterAbsent) {
    const fence = recheckOwnedTopologyBeforeWrite(
      request,
      collect,
      deps,
      ownedNamespaceUid,
      clusterUid,
      clusterResourceVersion,
    );
    if (!fence.ok) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: fence.refusals,
        mutated,
        complete: false,
        recoveryIdentity: ownedNamespaceUid
          ? {
              ownerId: request.ownerId,
              clusterName: request.clusterName,
              namespace: namespaceName,
              namespaceUid: ownedNamespaceUid,
            }
          : undefined,
      };
    }
    const createCluster = run(
      'kubectl',
      ['--context', profile.contextName, 'create', '-f', '-', '-o', 'json'],
      { input: `${JSON.stringify(expectedCluster)}\n` },
    );
    if (!createCluster.ok) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: [
          {
            id: createCluster.stderr?.includes('AlreadyExists')
              ? 'create-conflict'
              : 'cluster-create-failed',
            detail: createCluster.stderr?.trim() || 'cluster create failed',
          },
        ],
        mutated,
        complete: false,
        recoveryIdentity: {
          ownerId: request.ownerId,
          clusterName: request.clusterName,
          namespace: namespaceName,
          namespaceUid: ownedNamespaceUid,
        },
      };
    }
    clusterUid = parseCreatedObjectUid(createCluster);
    // Create path does not CAS-patch; resourceVersion fence stays unused here.
    if (!clusterUid) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: [
          {
            id: 'cluster-create-unreadable',
            detail: 'cluster create succeeded but uid was not captured',
          },
        ],
        mutated: true,
        complete: false,
        recoveryIdentity: {
          ownerId: request.ownerId,
          clusterName: request.clusterName,
          namespace: namespaceName,
          namespaceUid: ownedNamespaceUid,
        },
      };
    }
    mutated = true;
  } else if (targetInstances !== currentInstances) {
    const fence = recheckOwnedTopologyBeforeWrite(
      request,
      collect,
      deps,
      ownedNamespaceUid,
      clusterUid,
      clusterResourceVersion,
    );
    if (!fence.ok) {
      return {
        command: 'ensure',
        ok: false,
        readOnly: false,
        mode: 'owned',
        refusals: fence.refusals,
        mutated,
        complete: false,
      };
    }
    const patchBody = buildInstancesCasPatch(
      clusterUid,
      clusterResourceVersion,
      currentInstances,
      targetInstances,
    );
    const patch = run('kubectl', [
      '--context',
      profile.contextName,
      '-n',
      namespaceName,
      'patch',
      'cluster.postgresql.cnpg.io',
      request.clusterName,
      '--type=json',
      '-p',
      JSON.stringify(patchBody),
    ]);
    if (!patch.ok) {
      const after = readPlatformObject(
        {
          profileId: request.env,
          resource: 'cluster.postgresql.cnpg.io',
          name: request.clusterName,
          namespace: namespaceName,
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
        mode: 'owned',
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
        recoveryIdentity: {
          ownerId: request.ownerId,
          clusterName: request.clusterName,
          namespace: namespaceName,
          namespaceUid: ownedNamespaceUid,
          clusterUid,
        },
      };
    }
    mutated = true;
  }

  // Phase: post-write cluster readiness
  const readiness = waitForCnpgClusterReadiness(
    request.env,
    {
      namespace: namespaceName,
      clusterName: request.clusterName,
      expectedInstances: targetInstances,
    },
    {
      run,
      sleep: deps.sleep,
      now: deps.now,
    },
  );
  if (!readiness.ok) {
    return {
      command: 'ensure',
      ok: false,
      readOnly: false,
      mode: 'owned',
      env: request.env,
      ownerId: request.ownerId,
      clusterName: request.clusterName,
      currentInstances,
      targetInstances,
      resources,
      refusals: [{ id: 'readiness-timeout', detail: readiness.detail }],
      mutated,
      complete: false,
      recoveryIdentity: {
        ownerId: request.ownerId,
        clusterName: request.clusterName,
        namespace: namespaceName,
        namespaceUid: ownedNamespaceUid,
        clusterUid,
      },
    };
  }

  const endpoints = buildOwnedCnpgEndpoints(request.clusterName, namespaceName);
  return {
    command: 'ensure',
    ok: true,
    readOnly: false,
    mode: 'owned',
    env: request.env,
    ownerId: request.ownerId,
    clusterName: request.clusterName,
    namespace: namespaceName,
    currentInstances,
    targetInstances,
    instances: targetInstances,
    clusterUid,
    currentPrimary: readiness.currentPrimary,
    endpoints,
    resources,
    refusals: [],
    mutated,
    complete: true,
  };
}
