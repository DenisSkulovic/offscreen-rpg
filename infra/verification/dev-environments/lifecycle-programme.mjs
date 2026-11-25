import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { readKindProfile } from '../../../infra/clusters/kind/manager/config.mjs';
import { MIN_HOST_MEMORY_MIB } from '../../../infra/clusters/kind/manager/host-probe.mjs';
import {
  environmentSessionRoot,
  readEnvironmentSession,
} from '../../../tools/dev-environments/src/domain/dev-environment-session.mjs';
import {
  getDefaultEnvironment,
  getEnvironment,
  listIndependentEnvironments,
} from '../../../tools/dev-environments/src/domain/dev-worktree-allocator.mjs';
import { liveDevRegistryRoot } from '../../../tools/dev-environments/src/domain/dev-worktree-registry.mjs';

export const SIX_SLOT_DEPLOYMENTS = Object.freeze([
  'game-web',
  'game-api',
  'game-authority',
  'game-control',
  'game-executor',
  'game-relay',
]);

/**
 * @returns {string}
 */
export function defaultDevRegistryRoot() {
  return liveDevRegistryRoot();
}

export const DEV_LIFECYCLE_LIVE_TOKEN = 'offscreen-dev-lifecycle-live';
export const DEV_LIFECYCLE_SCENARIO_IDS = Object.freeze([
  'DEV-02',
  'DEV-03',
  'DEV-10',
]);
const DEV_KIND = readKindProfile('dev');
export const DEV_KIND_CONTEXT = DEV_KIND.contextName;
export const REQUIRED_MEM_KIB = MIN_HOST_MEMORY_MIB * 1024;

export const LIFECYCLE_BOUNDS = Object.freeze({
  activationMs: 12 * 60 * 1000,
  parkMs: 3 * 60 * 1000,
  overallMs: 40 * 60 * 1000,
});

/** @typedef {'PASS' | 'FAIL' | 'BLOCKED' | 'NOT-RUN'} ProgrammeStatus */

/**
 * @typedef {{
 *   runPnpm: (
 *     args: string[],
 *     options?: { cwd?: string, timeoutMs?: number },
 *   ) => Promise<{
 *     code: number,
 *     stdout: string,
 *     stderr: string,
 *     timedOut?: boolean,
 *   }>,
 *   listEnvironments: (registryRoot: string) => import('../../../tools/dev-environments/src/domain/dev-worktree-allocator.mjs').DevWorktreeOwnerRecord[],
 *   getEnvironment: typeof getEnvironment,
 *   getDefaultEnvironment: typeof getDefaultEnvironment,
 *   readEnvironmentSession: typeof readEnvironmentSession,
 *   collectReadiness: (input: object) => {
 *     runtimeReady: boolean,
 *     readiness: Record<string, boolean>,
 *     hostHttpStatus: number | null,
 *   },
 *   gitWorktreeState: (
 *     worktree: string,
 *   ) => { ok: boolean, head?: string | null, dirty?: boolean, reason?: string },
 *   readKubeContext: () => string | null,
 *   readMemAvailableKib: () => number | null,
 *   listActiveSlotIds: (
 *     registryRoot: string,
 *     sessionRoot: string,
 *   ) => string[],
 *   readParkedState: (input: {
 *     slotId: string,
 *     registryRoot: string,
 *   }) => {
 *     slotId: string,
 *     replicasByDeploy: Record<string, number>,
 *     ownedListeners: number[],
 *     ownedProcesses: number[],
 *     reservationRetained: boolean,
 *   },
 *   registryRoot: string,
 *   sessionRoot: string,
 *   now: () => number,
 * }} DevLifecycleCommandPort
 */

/**
 * @param {boolean} live
 * @param {{ authorizeToken?: string | null }} [options]
 */
export function refuseUnlessLiveAuthorized(live, options = {}) {
  if (!live) {
    return {
      status: /** @type {ProgrammeStatus} */ ('NOT-RUN'),
      reason: 'live-not-authorized',
      reasonCode: 'live-not-authorized',
    };
  }
  if (
    options.authorizeToken !== undefined &&
    options.authorizeToken !== DEV_LIFECYCLE_LIVE_TOKEN
  ) {
    return {
      status: /** @type {ProgrammeStatus} */ ('NOT-RUN'),
      reason: 'live-not-authorized',
      reasonCode: 'live-not-authorized',
    };
  }
  return null;
}

/**
 * @param {string} registryRoot
 * @param {string} worktree
 * @param {Set<string>} beforeIds
 * @param {DevLifecycleCommandPort['listEnvironments']} listEnvironments
 */
export function resolveAllocatedSlotId(
  registryRoot,
  worktree,
  beforeIds,
  listEnvironments,
) {
  const canonical = resolve(worktree);
  const created = listEnvironments(registryRoot).filter(
    (record) =>
      !beforeIds.has(record.slotId) && resolve(String(record.worktreePath)) === canonical,
  );
  if (created.length === 0) {
    return { ok: false, reason: 'slot-id-missing', reasonCode: 'slot-id-missing' };
  }
  if (created.length > 1) {
    return {
      ok: false,
      reason: 'slot-id-ambiguous',
      reasonCode: 'slot-id-ambiguous',
    };
  }
  return { ok: true, record: created[0] };
}

/**
 * @param {{
 *   worktree: string,
 *   registryRoot: string,
 *   ports: DevLifecycleCommandPort,
 *   auditedHead?: string | null,
 *   ownedSlotId?: string | null,
 * }} input
 */
export function assessLifecycleActivationPreconditions(input) {
  const git = input.ports.gitWorktreeState(input.worktree);
  if (!git.ok) {
    return {
      ok: false,
      status: /** @type {ProgrammeStatus} */ ('BLOCKED'),
      reason: git.reason ?? 'worktree-unavailable',
      reasonCode: 'worktree-unavailable',
    };
  }
  if (git.dirty) {
    return {
      ok: false,
      status: /** @type {ProgrammeStatus} */ ('BLOCKED'),
      reason: 'dirty-worktree',
      reasonCode: 'dirty-worktree',
    };
  }
  if (input.auditedHead && git.head && git.head !== input.auditedHead) {
    return {
      ok: false,
      status: /** @type {ProgrammeStatus} */ ('BLOCKED'),
      reason: 'head-mismatch',
      reasonCode: 'head-mismatch',
    };
  }
  const defaultEnv = input.ports.getDefaultEnvironment(
    input.registryRoot,
    input.worktree,
  );
  if (defaultEnv) {
    return {
      ok: false,
      status: /** @type {ProgrammeStatus} */ ('BLOCKED'),
      reason: 'default-reservation-present',
      reasonCode: 'default-reservation-present',
    };
  }
  const ctx = input.ports.readKubeContext();
  if (ctx !== DEV_KIND_CONTEXT) {
    return {
      ok: false,
      status: /** @type {ProgrammeStatus} */ ('FAIL'),
      reason: 'foreign-kubectl-context',
      reasonCode: 'foreign-kubectl-context',
    };
  }
  const mem = input.ports.readMemAvailableKib();
  if (mem === null || mem < REQUIRED_MEM_KIB) {
    return {
      ok: false,
      status: /** @type {ProgrammeStatus} */ ('FAIL'),
      reason: 'capacity-refused',
      reasonCode: 'capacity-refused',
    };
  }
  const active = input.ports.listActiveSlotIds(
    input.registryRoot,
    input.ports.sessionRoot,
  );
  const foreignActive = active.filter(
    (slotId) => slotId !== (input.ownedSlotId ?? null),
  );
  if (foreignActive.length > 0) {
    return {
      ok: false,
      status: /** @type {ProgrammeStatus} */ ('FAIL'),
      reason: 'foreign-active-slot',
      reasonCode: 'foreign-active-slot',
    };
  }
  return { ok: true };
}

/**
 * @param {import('../../../tools/dev-environments/src/domain/dev-worktree-allocator.mjs').DevWorktreeOwnerRecord} record
 * @param {string} registryRoot
 * @param {DevLifecycleCommandPort} ports
 */
export function captureOwnerRegistryIdentity(record, registryRoot, ports) {
  const fresh = ports.getEnvironment(registryRoot, record.slotId);
  if (!fresh) {
    return { ok: false, reason: 'unknown-environment' };
  }
  const session = ports.readEnvironmentSession(
    ports.sessionRoot,
    record.slotId,
  );
  return {
    ok: true,
    identity: {
      slotId: fresh.slotId,
      namespace: fresh.namespace,
      cluster: fresh.cluster,
      ports: { ...fresh.ports },
      resourceUids: { ...(fresh.resourceUids ?? {}) },
      lease: fresh.lease ? { ...fresh.lease } : null,
      worktreePath: fresh.worktreePath,
      processIdentity: fresh.processIdentity ? { ...fresh.processIdentity } : null,
      sessionPid: session?.pid ?? null,
      sessionForwardPid: session?.forwardPid ?? null,
    },
  };
}

/**
 * @param {{ runtimeReady: boolean, readiness: Record<string, boolean>, hostHttpStatus: number | null }} readiness
 */
export function verifyRuntimeReceipts(readiness) {
  if (!readiness.runtimeReady) {
    return { ok: false, reason: 'missing-receipts' };
  }
  for (const role of SIX_SLOT_DEPLOYMENTS) {
    if (readiness.readiness[role] !== true) {
      return { ok: false, reason: 'missing-receipts' };
    }
  }
  if (
    readiness.hostHttpStatus !== null &&
    (readiness.hostHttpStatus < 200 || readiness.hostHttpStatus >= 300)
  ) {
    return { ok: false, reason: 'http-not-ready' };
  }
  return { ok: true };
}

/**
 * @param {{
 *   slotId: string,
 *   replicasByDeploy: Record<string, number>,
 *   ownedListeners: number[],
 *   ownedProcesses: number[],
 *   reservationRetained: boolean,
 * }} parked
 */
export function verifyParkedState(parked) {
  const replicaValues = Object.values(parked.replicasByDeploy);
  if (replicaValues.some((count) => count !== 0)) {
    return { ok: false, reason: 'park-incomplete-replicas' };
  }
  if (parked.ownedListeners.length > 0 || parked.ownedProcesses.length > 0) {
    return { ok: false, reason: 'park-incomplete-listeners' };
  }
  if (!parked.reservationRetained) {
    return { ok: false, reason: 'reservation-released' };
  }
  return { ok: true };
}

/**
 * @param {string} worktree
 * @param {Partial<DevLifecycleCommandPort>} [overrides]
 */
export async function createDefaultLifecyclePorts(worktree, overrides = {}) {
  const registryRoot = overrides.registryRoot ?? defaultDevRegistryRoot();
  const sessionRoot =
    overrides.sessionRoot ?? environmentSessionRoot(registryRoot);
  const { collectSelectedSlotReadiness } = await import(
    '../../../tools/dev-environments/src/application/dev-status.mjs'
  );
  return /** @type {DevLifecycleCommandPort} */ ({
    registryRoot,
    sessionRoot,
    listEnvironments: (root) => listIndependentEnvironments(root),
    getEnvironment,
    getDefaultEnvironment,
    readEnvironmentSession,
    collectReadiness: collectSelectedSlotReadiness,
    gitWorktreeState: () => ({
      ok: false,
      reason: 'worktree-unavailable',
    }),
    readKubeContext: () => null,
    readMemAvailableKib: () => null,
    listActiveSlotIds: () => [],
    readParkedState: ({ slotId, registryRoot }) => ({
      slotId,
      replicasByDeploy: Object.fromEntries(
        SIX_SLOT_DEPLOYMENTS.map((name) => [name, 0]),
      ),
      ownedListeners: [],
      ownedProcesses: [],
      reservationRetained: Boolean(
        getEnvironment(registryRoot, slotId),
      ),
    }),
    runPnpm: async () => ({
      code: 1,
      stdout: '',
      stderr: 'runPnpm not configured',
    }),
    now: () => Date.now(),
    ...overrides,
    registryRoot,
    sessionRoot,
  });
}

/**
 * @param {{
 *   scenarioId: string,
 *   live: boolean,
 *   worktree: string,
 *   ports: DevLifecycleCommandPort,
 *   auditedHead?: string | null,
 *   authorizeToken?: string | null,
 * }} input
 */
export async function runDevLifecycleProgramme(input) {
  const started = input.ports.now();
  const refuse = refuseUnlessLiveAuthorized(input.live, {
    authorizeToken: input.authorizeToken,
  });
  if (refuse) return { ...refuse, durationMs: 0, cleanup: [] };

  if (!DEV_LIFECYCLE_SCENARIO_IDS.includes(input.scenarioId)) {
    return {
      status: 'FAIL',
      reason: 'unknown-scenario',
      reasonCode: 'unknown-scenario',
      durationMs: 0,
      cleanup: [],
    };
  }

  /** @type {Array<{ action: string, status: string, reason: string | null }>} */
  const cleanup = [];
  /** @type {string | null} */
  let ownedSlotId = null;
  /** @type {object | null} */
  let baselineIdentity = null;

  const pre = assessLifecycleActivationPreconditions({
    worktree: input.worktree,
    registryRoot: input.ports.registryRoot,
    ports: input.ports,
    auditedHead: input.auditedHead ?? null,
    ownedSlotId,
  });
  if (!pre.ok) {
    return {
      status: pre.status ?? 'FAIL',
      reason: pre.reason ?? 'precondition-failed',
      reasonCode: pre.reason ?? 'precondition-failed',
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup,
    };
  }

  const beforeIds = new Set(
    input.ports
      .listEnvironments(input.ports.registryRoot)
      .map((record) => record.slotId),
  );
  const foreignBefore = new Map(
    input.ports
      .listEnvironments(input.ports.registryRoot)
      .map((record) => [record.slotId, structuredClone(record)]),
  );

  const reportCleanup = async (slotId) => {
    if (!slotId) return;
    const stop = await input.ports.runPnpm(
      ['dev:stop', '--instance', slotId],
      { cwd: input.worktree, timeoutMs: LIFECYCLE_BOUNDS.parkMs },
    );
    cleanup.push({
      action: 'park',
      status: stop.code === 0 && !stop.timedOut ? 'PASS' : 'FAIL',
      reason: stop.timedOut ? 'park-timeout' : stop.code === 0 ? null : 'park-failed',
    });
  };

  try {
    if (input.scenarioId === 'DEV-02' || input.scenarioId === 'DEV-10') {
      const created = await input.ports.runPnpm(['dev:new'], {
        cwd: input.worktree,
        timeoutMs: LIFECYCLE_BOUNDS.activationMs,
      });
      if (created.code !== 0 || created.timedOut) {
        return {
          status: 'FAIL',
          reason: created.timedOut ? 'activation-timeout' : 'activation-failed',
          reasonCode: created.timedOut ? 'activation-timeout' : 'activation-failed',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
      const allocated = resolveAllocatedSlotId(
        input.ports.registryRoot,
        input.worktree,
        beforeIds,
        input.ports.listEnvironments,
      );
      if (!allocated.ok) {
        return {
          status: 'FAIL',
          reason: allocated.reason,
          reasonCode: allocated.reasonCode,
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
      ownedSlotId = allocated.record.slotId;
      const identity = captureOwnerRegistryIdentity(
        allocated.record,
        input.ports.registryRoot,
        input.ports,
      );
      if (!identity.ok) {
        return {
          status: 'FAIL',
          reason: identity.reason ?? 'identity-missing',
          reasonCode: identity.reason ?? 'identity-missing',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
      baselineIdentity = identity.identity;
    }

    if (input.scenarioId === 'DEV-03') {
      if (!ownedSlotId) {
        const created = await input.ports.runPnpm(['dev:new'], {
          cwd: input.worktree,
          timeoutMs: LIFECYCLE_BOUNDS.activationMs,
        });
        if (created.code !== 0 || created.timedOut) {
          return {
            status: 'FAIL',
            reason: 'activation-failed',
            reasonCode: 'activation-failed',
            durationMs: Math.max(0, input.ports.now() - started),
            cleanup,
          };
        }
        const allocated = resolveAllocatedSlotId(
          input.ports.registryRoot,
          input.worktree,
          beforeIds,
          input.ports.listEnvironments,
        );
        if (!allocated.ok) {
          return {
            status: 'FAIL',
            reason: allocated.reason,
            reasonCode: allocated.reasonCode,
            durationMs: Math.max(0, input.ports.now() - started),
            cleanup,
          };
        }
        ownedSlotId = allocated.record.slotId;
        const warmIdentity = captureOwnerRegistryIdentity(
          allocated.record,
          input.ports.registryRoot,
          input.ports,
        );
        if (!warmIdentity.ok) {
          return {
            status: 'FAIL',
            reason: warmIdentity.reason ?? 'identity-missing',
            reasonCode: warmIdentity.reason ?? 'identity-missing',
            durationMs: Math.max(0, input.ports.now() - started),
            cleanup,
          };
        }
        baselineIdentity = warmIdentity.identity;
      }
      const coldStop = await input.ports.runPnpm(['dev:stop', '--instance', ownedSlotId], {
        cwd: input.worktree,
        timeoutMs: LIFECYCLE_BOUNDS.parkMs,
      });
      if (coldStop.code !== 0) {
        return {
          status: 'FAIL',
          reason: 'warm-stop-failed',
          reasonCode: 'warm-stop-failed',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
      const warmStart = await input.ports.runPnpm(['dev', '--instance', ownedSlotId], {
        cwd: input.worktree,
        timeoutMs: LIFECYCLE_BOUNDS.activationMs,
      });
      if (warmStart.code !== 0 || warmStart.timedOut) {
        return {
          status: 'FAIL',
          reason: 'warm-activation-failed',
          reasonCode: 'warm-activation-failed',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
    }

    if (!ownedSlotId || !baselineIdentity) {
      return {
        status: 'FAIL',
        reason: 'owned-slot-missing',
        reasonCode: 'owned-slot-missing',
        durationMs: Math.max(0, input.ports.now() - started),
        cleanup,
      };
    }

    const readiness = input.ports.collectReadiness({
      namespace: baselineIdentity.namespace,
      environmentId: ownedSlotId,
      useRemoteObservations: true,
      requireHostHttp: true,
      gamePort: baselineIdentity.ports.game,
      hostHttpStatus: 200,
    });
    const receiptCheck = verifyRuntimeReceipts(readiness);
    if (!receiptCheck.ok) {
      return {
        status: 'FAIL',
        reason: receiptCheck.reason ?? 'missing-receipts',
        reasonCode: receiptCheck.reason ?? 'missing-receipts',
        durationMs: Math.max(0, input.ports.now() - started),
        cleanup,
      };
    }

    if (input.scenarioId === 'DEV-10') {
      const beforeResume = input.ports.getEnvironment(
        input.ports.registryRoot,
        ownedSlotId,
      );
      if (!beforeResume) {
        return {
          status: 'FAIL',
          reason: 'identity-missing',
          reasonCode: 'identity-missing',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
      const resumeIdentityBefore = captureOwnerRegistryIdentity(
        beforeResume,
        input.ports.registryRoot,
        input.ports,
      );
      const stop = await input.ports.runPnpm(['dev:stop', '--instance', ownedSlotId], {
        cwd: input.worktree,
        timeoutMs: LIFECYCLE_BOUNDS.parkMs,
      });
      const parked = input.ports.readParkedState({
        slotId: ownedSlotId,
        registryRoot: input.ports.registryRoot,
      });
      const parkCheck = verifyParkedState(parked);
      if (stop.code !== 0 || !parkCheck.ok) {
        return {
          status: 'FAIL',
          reason: parkCheck.reason ?? 'park-failed',
          reasonCode: parkCheck.reason ?? 'park-failed',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
      const resume = await input.ports.runPnpm(['dev', '--instance', ownedSlotId], {
        cwd: input.worktree,
        timeoutMs: LIFECYCLE_BOUNDS.activationMs,
      });
      if (resume.code !== 0) {
        return {
          status: 'FAIL',
          reason: 'resume-failed',
          reasonCode: 'resume-failed',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
      const afterResume = input.ports.getEnvironment(
        input.ports.registryRoot,
        ownedSlotId,
      );
      const resumeIdentity = afterResume
        ? captureOwnerRegistryIdentity(
            afterResume,
            input.ports.registryRoot,
            input.ports,
          )
        : { ok: false };
      if (
        !resumeIdentity.ok ||
        resumeIdentity.identity?.slotId !== resumeIdentityBefore.identity?.slotId ||
        resumeIdentity.identity?.namespace !== resumeIdentityBefore.identity?.namespace
      ) {
        return {
          status: 'FAIL',
          reason: 'identity-changed-after-resume',
          reasonCode: 'identity-changed-after-resume',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
    }

    for (const [slotId, before] of foreignBefore.entries()) {
      if (slotId === ownedSlotId) continue;
      const after = input.ports.getEnvironment(input.ports.registryRoot, slotId);
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        return {
          status: 'FAIL',
          reason: 'peer-registry-mutated',
          reasonCode: 'peer-registry-mutated',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
    }

    if (input.ports.now() - started > LIFECYCLE_BOUNDS.overallMs) {
      return {
        status: 'FAIL',
        reason: 'overall-timeout',
        reasonCode: 'overall-timeout',
        durationMs: Math.max(0, input.ports.now() - started),
        cleanup,
      };
    }

    return {
      status: 'PASS',
      reason: null,
      reasonCode: null,
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup,
      measurements: {
        scenarioId: input.scenarioId,
        slotId: ownedSlotId,
        coldMs: input.scenarioId === 'DEV-02' ? input.ports.now() - started : null,
      },
    };
  } catch {
    return {
      status: 'FAIL',
      reason: 'programme-error',
      reasonCode: 'programme-error',
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup,
    };
  } finally {
    if (ownedSlotId) {
      await reportCleanup(ownedSlotId);
    }
  }
}