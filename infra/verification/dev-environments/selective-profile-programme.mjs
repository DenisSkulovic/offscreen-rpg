import { parseDevCliArgs } from '../../../tools/dev-environments/src/domain/dev-environment-session.mjs';
import {
  DEV_LIFECYCLE_LIVE_TOKEN,
  LIFECYCLE_BOUNDS,
  SIX_SLOT_DEPLOYMENTS,
  assessLifecycleActivationPreconditions,
  captureOwnerRegistryIdentity,
  createDefaultLifecyclePorts,
  refuseUnlessLiveAuthorized,
} from './lifecycle-programme.mjs';

export { DEV_LIFECYCLE_LIVE_TOKEN };

export const SELECTIVE_PROFILE_BLOCKED_REASON = 'selective-profiles-unimplemented';

export const DEV_SELECTIVE_SCENARIO_IDS = Object.freeze([
  'DEV-04',
  'DEV-05',
  'DEV-14',
]);

export const DEV_SELECTIVE_OPTIONAL_SCENARIO_IDS = Object.freeze(['DEV-12']);

/** @typedef {'PASS' | 'FAIL' | 'BLOCKED' | 'NOT-RUN'} ProgrammeStatus */

/**
 * Frozen INF38-aligned profile shapes used only for verification oracles.
 * Product CLI activation remains gated on joined INF38 source.
 */
export const APPLICATION_PROFILES = Object.freeze({
  api: Object.freeze({
    name: 'api',
    activeRoles: Object.freeze(['game-api', 'game-authority']),
    inactiveRoles: Object.freeze([
      'game-web',
      'game-control',
      'game-executor',
      'game-relay',
    ]),
    hostEndpoint: 'api',
    provisionsTemporal: false,
  }),
  web: Object.freeze({
    name: 'web',
    activeRoles: Object.freeze(['game-web', 'game-api', 'game-authority']),
    inactiveRoles: Object.freeze([
      'game-control',
      'game-executor',
      'game-relay',
    ]),
    hostEndpoint: 'web',
    provisionsTemporal: false,
  }),
  full: Object.freeze({
    name: 'full',
    activeRoles: SIX_SLOT_DEPLOYMENTS,
    inactiveRoles: Object.freeze([]),
    hostEndpoint: 'web',
    provisionsTemporal: true,
  }),
});

/**
 * @param {(argv: string[]) => object} [parseCli]
 */
export function probeSelectiveProfileCliSupport(parseCli = parseDevCliArgs) {
  const probes = [
    ['node', 'dev-tilt.mjs', 'up', '--profile', 'api'],
    ['node', 'dev-tilt.mjs', 'new', '--profile', 'web'],
    ['node', 'dev-tilt.mjs', 'up', '--profile', 'full', '--instance', 'dev-1'],
  ];
  for (const argv of probes) {
    try {
      const parsed = parseCli(argv);
      if (
        parsed &&
        typeof parsed === 'object' &&
        'profile' in parsed &&
        typeof parsed.profile === 'string'
      ) {
        return { supported: true };
      }
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        error.id === 'invalid-arguments' &&
        String(error.message).includes('--profile')
      ) {
        return {
          supported: false,
          reason: SELECTIVE_PROFILE_BLOCKED_REASON,
        };
      }
    }
  }
  return {
    supported: false,
    reason: SELECTIVE_PROFILE_BLOCKED_REASON,
  };
}

/**
 * @param {string} scenarioId
 */
export function resolveSelectiveProfilesForScenario(scenarioId) {
  if (scenarioId === 'DEV-04') return ['api'];
  if (scenarioId === 'DEV-05') return ['web'];
  if (scenarioId === 'DEV-14') return ['api', 'web'];
  if (scenarioId === 'DEV-12') return [];
  return null;
}

/**
 * @param {Record<string, number>} replicasByDeploy
 * @param {readonly string[]} inactiveRoles
 */
export function verifyInactiveReplicasZero(replicasByDeploy, inactiveRoles) {
  for (const role of inactiveRoles) {
    const count = replicasByDeploy[role];
    if (typeof count !== 'number' || count !== 0) {
      return { ok: false, reason: 'inactive-replicas-nonzero' };
    }
  }
  return { ok: true };
}

/**
 * @param {{
 *   readiness: Record<string, boolean>,
 *   runtimeReady: boolean,
 *   hostHttpStatus: number | null,
 * }} readiness
 * @param {keyof typeof APPLICATION_PROFILES} profileName
 */
export function verifyActiveRoleReadiness(readiness, profileName) {
  const profile = APPLICATION_PROFILES[profileName];
  if (!profile) return { ok: false, reason: 'unknown-profile' };
  if (!readiness.runtimeReady) {
    return { ok: false, reason: 'missing-receipts' };
  }
  for (const role of profile.activeRoles) {
    if (readiness.readiness[role] !== true) {
      return { ok: false, reason: 'selected-role-not-ready' };
    }
  }
  return { ok: true };
}

/**
 * @param {{
 *   status: number | null,
 *   body: string,
 * }} http
 * @param {'api' | 'web'} endpoint
 */
export function verifyProfileHostReadiness(http, endpoint) {
  if (endpoint === 'api') {
    if (http.status !== 200) {
      return { ok: false, reason: 'api-ready-http-failed' };
    }
    try {
      const json = JSON.parse(http.body);
      if (json?.status !== 'ok') {
        return { ok: false, reason: 'api-ready-body-invalid' };
      }
    } catch {
      return { ok: false, reason: 'api-ready-body-invalid' };
    }
    return { ok: true };
  }
  if (http.status === null || http.status < 200 || http.status >= 300) {
    return { ok: false, reason: 'web-http-not-ready' };
  }
  return { ok: true };
}

/**
 * @param {{
 *   readiness: Record<string, boolean>,
 *   runtimeReady: boolean,
 *   hostHttpStatus: number | null,
 * }} readiness
 * @param {Record<string, number>} replicasByDeploy
 * @param {keyof typeof APPLICATION_PROFILES} profileName
 * @param {{ status: number | null, body: string }} hostHttp
 * }} input
 */
export function verifySelectiveProfileRuntime(input) {
  const profile = APPLICATION_PROFILES[input.profileName];
  const active = verifyActiveRoleReadiness(input.readiness, input.profileName);
  if (!active.ok) return active;
  const inactive = verifyInactiveReplicasZero(
    input.replicasByDeploy,
    profile.inactiveRoles,
  );
  if (!inactive.ok) return inactive;
  const host = verifyProfileHostReadiness(input.hostHttp, profile.hostEndpoint);
  if (!host.ok) return host;
  return { ok: true };
}

/**
 * @typedef {import('./lifecycle-programme.mjs').DevLifecycleCommandPort & {
 *   probeCliProfileSupport?: () => { supported: boolean, reason?: string },
 *   parseCliArgs?: typeof parseDevCliArgs,
 *   readReplicaCounts?: (input: {
 *     slotId: string,
 *     namespace: string,
 *   }) => Record<string, number>,
 *   fetchOwnedHttp?: (
 *     input: { slotId: string, path: string, mode: 'api' | 'web' },
 *   ) => Promise<{ status: number | null, body: string }>,
 *   readTemporalIdentity?: (
 *     slotId: string,
 *   ) => Promise<{ namespace: string } | null>,
 *   listTemporalNamespaces?: () => Promise<string[]>,
 * }} DevSelectiveProfileCommandPort
 */

/**
 * @param {string} worktree
 * @param {Partial<DevSelectiveProfileCommandPort>} [overrides]
 */
export async function createDefaultSelectiveProfilePorts(worktree, overrides = {}) {
  const base = await createDefaultLifecyclePorts(worktree, overrides);
  return /** @type {DevSelectiveProfileCommandPort} */ ({
    ...base,
    probeCliProfileSupport:
      overrides.probeCliProfileSupport ??
      (() => probeSelectiveProfileCliSupport(overrides.parseCliArgs)),
    parseCliArgs: overrides.parseCliArgs ?? parseDevCliArgs,
    readReplicaCounts:
      overrides.readReplicaCounts ??
      (() =>
        Object.fromEntries(SIX_SLOT_DEPLOYMENTS.map((name) => [name, 0]))),
    fetchOwnedHttp:
      overrides.fetchOwnedHttp ??
      (async () => ({ status: null, body: '' })),
    readTemporalIdentity: overrides.readTemporalIdentity ?? (async () => null),
    listTemporalNamespaces:
      overrides.listTemporalNamespaces ?? (async () => []),
  });
}

/**
 * @param {{
 *   scenarioId: string,
 *   live: boolean,
 *   worktree: string,
 *   ports: DevSelectiveProfileCommandPort,
 *   ownedSlotId?: string | null,
 *   authorizeToken?: string | null,
 *   mixedSlotExplicit?: boolean,
 *   measuredCapacity?: boolean,
 * }} input
 */
export async function runDevSelectiveProfileProgramme(input) {
  const started = input.ports.now();
  const refuse = refuseUnlessLiveAuthorized(input.live, {
    authorizeToken: input.authorizeToken,
  });
  if (refuse) return { ...refuse, durationMs: 0, cleanup: [] };

  const allIds = [
    ...DEV_SELECTIVE_SCENARIO_IDS,
    ...DEV_SELECTIVE_OPTIONAL_SCENARIO_IDS,
  ];
  if (!allIds.includes(input.scenarioId)) {
    return {
      status: /** @type {ProgrammeStatus} */ ('FAIL'),
      reason: 'unknown-scenario',
      reasonCode: 'unknown-scenario',
      durationMs: 0,
      cleanup: [],
    };
  }

  if (input.scenarioId === 'DEV-12') {
    if (!input.mixedSlotExplicit || !input.measuredCapacity) {
      return {
        status: /** @type {ProgrammeStatus} */ ('NOT-RUN'),
        reason: 'mixed-slot-not-authorized',
        reasonCode: 'mixed-slot-not-authorized',
        durationMs: 0,
        cleanup: [],
      };
    }
  }

  const probe =
    input.ports.probeCliProfileSupport?.() ??
    probeSelectiveProfileCliSupport(input.ports.parseCliArgs);
  if (!probe.supported) {
    return {
      status: /** @type {ProgrammeStatus} */ ('BLOCKED'),
      reason: probe.reason ?? SELECTIVE_PROFILE_BLOCKED_REASON,
      reasonCode: probe.reason ?? SELECTIVE_PROFILE_BLOCKED_REASON,
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup: [],
    };
  }

  const profileSequence = resolveSelectiveProfilesForScenario(input.scenarioId);
  if (!profileSequence || profileSequence.length === 0) {
    return {
      status: /** @type {ProgrammeStatus} */ ('NOT-RUN'),
      reason: 'mixed-slot-not-authorized',
      reasonCode: 'mixed-slot-not-authorized',
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup: [],
    };
  }

  const ownedSlotId = input.ownedSlotId ?? null;
  if (!ownedSlotId) {
    return {
      status: /** @type {ProgrammeStatus} */ ('BLOCKED'),
      reason: 'owned-slot-missing',
      reasonCode: 'owned-slot-missing',
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup: [],
    };
  }

  const owner = input.ports.getEnvironment(
    input.ports.registryRoot,
    ownedSlotId,
  );
  if (!owner) {
    return {
      status: /** @type {ProgrammeStatus} */ ('BLOCKED'),
      reason: 'unknown-environment',
      reasonCode: 'unknown-environment',
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup: [],
    };
  }

  const identityCaptured = captureOwnerRegistryIdentity(
    owner,
    input.ports.registryRoot,
    input.ports,
  );
  if (!identityCaptured.ok) {
    return {
      status: /** @type {ProgrammeStatus} */ ('BLOCKED'),
      reason: identityCaptured.reason ?? 'identity-missing',
      reasonCode: identityCaptured.reason ?? 'identity-missing',
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup: [],
    };
  }
  const baselineIdentity = identityCaptured.identity;

  const pre = assessLifecycleActivationPreconditions({
    worktree: input.worktree,
    registryRoot: input.ports.registryRoot,
    ports: input.ports,
    ownedSlotId,
  });
  if (!pre.ok) {
    return {
      status: pre.status ?? 'FAIL',
      reason: pre.reason ?? 'precondition-failed',
      reasonCode: pre.reason ?? 'precondition-failed',
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup: [],
    };
  }

  /** @type {Array<{ action: string, status: string, reason: string | null }>} */
  const cleanup = [];
  const temporalBefore =
    (await input.ports.readTemporalIdentity?.(ownedSlotId)) ?? null;
  const namespacesBefore =
    (await input.ports.listTemporalNamespaces?.()) ?? [];

  const reportCleanup = async () => {
    const stop = await input.ports.runPnpm(
      ['dev:stop', '--instance', ownedSlotId],
      { cwd: input.worktree, timeoutMs: LIFECYCLE_BOUNDS.parkMs },
    );
    cleanup.push({
      action: 'park',
      status: stop.code === 0 && !stop.timedOut ? 'PASS' : 'FAIL',
      reason: stop.timedOut ? 'park-timeout' : stop.code === 0 ? null : 'park-failed',
    });
  };

  try {
    const stop = await input.ports.runPnpm(
      ['dev:stop', '--instance', ownedSlotId],
      { cwd: input.worktree, timeoutMs: LIFECYCLE_BOUNDS.parkMs },
    );
    if (stop.code !== 0 || stop.timedOut) {
      return {
        status: 'FAIL',
        reason: stop.timedOut ? 'park-timeout' : 'park-failed',
        reasonCode: stop.timedOut ? 'park-timeout' : 'park-failed',
        durationMs: Math.max(0, input.ports.now() - started),
        cleanup,
      };
    }

    for (const profileName of profileSequence) {
      const launch = await input.ports.runPnpm(
        ['dev', '--profile', profileName, '--instance', ownedSlotId],
        { cwd: input.worktree, timeoutMs: LIFECYCLE_BOUNDS.activationMs },
      );
      if (launch.code !== 0 || launch.timedOut) {
        return {
          status: 'FAIL',
          reason: launch.timedOut
            ? 'activation-timeout'
            : 'profile-activation-failed',
          reasonCode: launch.timedOut
            ? 'activation-timeout'
            : 'profile-activation-failed',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }

      const profile = APPLICATION_PROFILES[profileName];
      const readiness = input.ports.collectReadiness({
        namespace: baselineIdentity.namespace,
        environmentId: ownedSlotId,
        useRemoteObservations: true,
        requireHostHttp: profile.hostEndpoint === 'web',
        gamePort: baselineIdentity.ports.game,
        hostHttpStatus: profile.hostEndpoint === 'web' ? 200 : null,
      });

      const replicas = input.ports.readReplicaCounts?.({
        slotId: ownedSlotId,
        namespace: baselineIdentity.namespace,
      }) ?? Object.fromEntries(SIX_SLOT_DEPLOYMENTS.map((name) => [name, 0]));

      const hostPath =
        profile.hostEndpoint === 'api' ? '/api/health/ready' : '/';
      const hostHttp = await input.ports.fetchOwnedHttp?.({
        slotId: ownedSlotId,
        path: hostPath,
        mode: profile.hostEndpoint,
      }) ?? { status: null, body: '' };

      const runtimeCheck = verifySelectiveProfileRuntime({
        readiness,
        replicasByDeploy: replicas,
        profileName,
        hostHttp,
      });
      if (!runtimeCheck.ok) {
        return {
          status: 'FAIL',
          reason: runtimeCheck.reason ?? 'profile-readiness-failed',
          reasonCode: runtimeCheck.reason ?? 'profile-readiness-failed',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }

      if (!profile.provisionsTemporal) {
        const temporalAfter =
          (await input.ports.readTemporalIdentity?.(ownedSlotId)) ?? null;
        const namespacesAfter =
          (await input.ports.listTemporalNamespaces?.()) ?? [];
        const created = namespacesAfter.filter(
          (name) => !namespacesBefore.includes(name),
        );
        if (created.length > 0 && !temporalBefore && !temporalAfter) {
          return {
            status: 'FAIL',
            reason: 'unexpected-temporal-tenant',
            reasonCode: 'unexpected-temporal-tenant',
            durationMs: Math.max(0, input.ports.now() - started),
            cleanup,
          };
        }
      }

      if (profileSequence.length > 1 && profileName !== profileSequence.at(-1)) {
        const betweenStop = await input.ports.runPnpm(
          ['dev:stop', '--instance', ownedSlotId],
          { cwd: input.worktree, timeoutMs: LIFECYCLE_BOUNDS.parkMs },
        );
        if (betweenStop.code !== 0 || betweenStop.timedOut) {
          return {
            status: 'FAIL',
            reason: 'profile-change-stop-failed',
            reasonCode: 'profile-change-stop-failed',
            durationMs: Math.max(0, input.ports.now() - started),
            cleanup,
          };
        }
      }
    }

    const afterOwner = input.ports.getEnvironment(
      input.ports.registryRoot,
      ownedSlotId,
    );
    if (
      !afterOwner ||
      afterOwner.slotId !== baselineIdentity.slotId ||
      afterOwner.namespace !== baselineIdentity.namespace
    ) {
      return {
        status: 'FAIL',
        reason: 'tenant-identity-changed',
        reasonCode: 'tenant-identity-changed',
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
        profiles: profileSequence,
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
    await reportCleanup();
  }
}