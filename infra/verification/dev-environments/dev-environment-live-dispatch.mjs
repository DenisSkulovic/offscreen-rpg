import {
  DEV_LIFECYCLE_SCENARIO_IDS,
  createDefaultLifecyclePorts,
  runDevLifecycleProgramme,
} from './lifecycle-programme.mjs';
import {
  DEV_RECOVERY_SCENARIO_IDS,
  createDefaultRecoveryPorts,
  runDevRecoveryProgramme,
} from './recovery-programme.mjs';
import {
  DATA_TENANT_SCENARIO_IDS,
  runDataTenantRetentionProgramme,
} from './tenant-retention-programme.mjs';
import {
  DEV_SELECTIVE_OPTIONAL_SCENARIO_IDS,
  DEV_SELECTIVE_SCENARIO_IDS,
  createDefaultSelectiveProfilePorts,
  runDevSelectiveProfileProgramme,
} from './selective-profile-programme.mjs';

export const DEV_ENVIRONMENT_LIVE_SCENARIO_IDS = Object.freeze([
  ...DEV_LIFECYCLE_SCENARIO_IDS,
  ...DEV_RECOVERY_SCENARIO_IDS,
  ...DATA_TENANT_SCENARIO_IDS,
  ...DEV_SELECTIVE_SCENARIO_IDS,
  ...DEV_SELECTIVE_OPTIONAL_SCENARIO_IDS,
]);

export {
  DEV_LIFECYCLE_SCENARIO_IDS,
  DEV_LIFECYCLE_LIVE_TOKEN,
} from './lifecycle-programme.mjs';
export { DEV_RECOVERY_SCENARIO_IDS } from './recovery-programme.mjs';
export { DATA_TENANT_SCENARIO_IDS } from './tenant-retention-programme.mjs';
export {
  DEV_SELECTIVE_SCENARIO_IDS,
  DEV_SELECTIVE_OPTIONAL_SCENARIO_IDS,
} from './selective-profile-programme.mjs';

export { runDevLifecycleProgramme, createDefaultLifecyclePorts };
export {
  runDevSelectiveProfileProgramme,
  createDefaultSelectiveProfilePorts,
};

/**
 * @param {{
 *   scenarioId: string,
 *   live: boolean,
 *   worktree: string,
 *   ownedSlotId?: string | null,
 *   authorizeToken?: string | null,
 *   auditedHead?: string | null,
 *   mixedSlotExplicit?: boolean,
 *   measuredCapacity?: boolean,
 * }} input
 */
export async function runDevEnvironmentLiveProgramme(input) {
  if (DEV_LIFECYCLE_SCENARIO_IDS.includes(input.scenarioId)) {
    return runDevLifecycleProgramme({
      scenarioId: input.scenarioId,
      live: input.live,
      worktree: input.worktree,
      ports: await createDefaultLifecyclePorts(input.worktree),
      auditedHead: input.auditedHead ?? null,
      authorizeToken: input.authorizeToken,
    });
  }

  const ownedSlotId = input.ownedSlotId ?? null;
  if (DEV_RECOVERY_SCENARIO_IDS.includes(input.scenarioId)) {
    return runDevRecoveryProgramme({
      scenarioId: input.scenarioId,
      live: input.live,
      worktree: input.worktree,
      ownedSlotId: ownedSlotId ?? '',
      ports: createDefaultRecoveryPorts(
        input.worktree,
        ownedSlotId ?? 'dev-unspecified',
      ),
      authorizeToken: input.authorizeToken,
    });
  }

  if (
    DEV_SELECTIVE_SCENARIO_IDS.includes(input.scenarioId) ||
    DEV_SELECTIVE_OPTIONAL_SCENARIO_IDS.includes(input.scenarioId)
  ) {
    return runDevSelectiveProfileProgramme({
      scenarioId: input.scenarioId,
      live: input.live,
      worktree: input.worktree,
      ownedSlotId: ownedSlotId ?? '',
      ports: await createDefaultSelectiveProfilePorts(input.worktree),
      authorizeToken: input.authorizeToken,
      mixedSlotExplicit: input.mixedSlotExplicit ?? false,
      measuredCapacity: input.measuredCapacity ?? false,
    });
  }

  if (DATA_TENANT_SCENARIO_IDS.includes(input.scenarioId)) {
    return runDataTenantRetentionProgramme({
      scenarioId: input.scenarioId,
      live: input.live,
      worktree: input.worktree,
      ownedSlotId: ownedSlotId ?? '',
      ports: {
        registryRoot: '/tmp',
        sessionRoot: '/tmp/sessions',
        getEnvironment: () => null,
        readEnvironmentSession: () => null,
        gitWorktreeState: () => ({ ok: false, reason: 'worktree-unavailable' }),
        readKubeContext: () => null,
        readMemAvailableKib: () => null,
        listActiveSlotIds: () => [],
        getDefaultEnvironment: () => null,
        proveOwnedSqlIdentity: async () => ({ ok: false }),
        proveOwnedS3Identity: async () => ({ ok: false }),
        proveOwnedTemporalIdentity: async () => ({ ok: false }),
        writeSqlMarker: async () => {},
        readSqlMarker: async () => null,
        deleteSqlMarker: async () => {},
        writeS3Marker: async () => {},
        readS3Marker: async () => null,
        deleteS3Marker: async () => {},
        readTemporalIdentity: async () => null,
        runPnpm: async () => ({ code: 1 }),
        readParkedState: () => ({
          slotId: ownedSlotId ?? '',
          replicasByDeploy: {},
          ownedListeners: [],
          ownedProcesses: [],
          reservationRetained: false,
        }),
        now: () => Date.now(),
      },
      authorizeToken: input.authorizeToken,
    });
  }

  return {
    status: 'FAIL',
    reason: 'unknown-scenario',
    reasonCode: 'unknown-scenario',
    durationMs: 0,
    cleanup: [],
  };
}