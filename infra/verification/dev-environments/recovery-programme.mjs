import { evaluateDevLoadedRuntimeReadiness } from '../../../tools/dev-environments/runtime/generation.mjs';
import {
  DEV_LIFECYCLE_LIVE_TOKEN,
  LIFECYCLE_BOUNDS,
  assessLifecycleActivationPreconditions,
  captureOwnerRegistryIdentity,
  refuseUnlessLiveAuthorized,
} from './lifecycle-programme.mjs';
import {
  pollWithDeadline,
  withDisposableWorktreeEdit,
} from './worktree-fixture.mjs';

export { DEV_LIFECYCLE_LIVE_TOKEN };

export const DEV_RECOVERY_SCENARIO_IDS = Object.freeze([
  'DEV-07',
  'DEV-08',
  'DEV-09',
]);

export const RECOVERY_POLL_DEADLINE_MS = 120_000;
export const RECOVERY_POLL_INTERVAL_MS = 250;

export const WEB_SIGN_IN_RELATIVE = 'apps/web/app/sign-in/page.tsx';
export const API_HEALTH_RELATIVE = 'apps/api/src/bootstrap/api-controllers.ts';
export const SHARED_MARKER_HOOK_RELATIVE =
  'apps/api/src/bootstrap/dev-verification-shared-marker.ts';

export const WEB_SIGN_IN_DEFAULT_MARKER = 'A life beyond';
export const API_HEALTH_LIVE_MARKER = 'inf52-dev-live-marker';
export const API_SHARED_PACKAGE_MARKER = 'inf52-shared-package-marker';

/** @typedef {'PASS' | 'FAIL' | 'BLOCKED' | 'NOT-RUN'} ProgrammeStatus */

/**
 * @typedef {{
 *   registryRoot: string,
 *   sessionRoot: string,
 *   getEnvironment: (registryRoot: string, slotId: string) => object | null,
 *   readWorktreeBytes: (relativePath: string) => Promise<Buffer | null>,
 *   writeWorktreeBytes: (relativePath: string, bytes: Buffer) => Promise<void>,
 *   fetchOwnedHttp: (
 *     input: { slotId: string, path: string, proxy?: 'web' | 'api' },
 *   ) => Promise<{ status: number | null, body: string }>,
 *   pollApiCompileReadiness: (
 *     slotId: string,
 *   ) => Promise<{ ready: boolean, reason: string | null, runtimeCount: number }>,
 *   pollSharedPackageMarker: (
 *     slotId: string,
 *   ) => Promise<{ generationId: string | null, marker: string | null }>,
 *   installSharedPackageHook: (
 *     worktree: string,
 *   ) => Promise<{ ok: boolean, reason?: string }>,
 *   gitWorktreeState: (worktree: string) => { ok: boolean, dirty?: boolean, reason?: string },
 *   readKubeContext: () => string | null,
 *   readMemAvailableKib: () => number | null,
 *   listActiveSlotIds: (registryRoot: string, sessionRoot: string) => string[],
 *   getDefaultEnvironment: (registryRoot: string, worktree: string) => object | null,
 *   runPnpm: (
 *     args: string[],
 *     options?: { cwd?: string, timeoutMs?: number },
 *   ) => Promise<{ code: number, timedOut?: boolean }>,
 *   now: () => number,
 *   sleep?: (ms: number) => Promise<void>,
 * }} DevRecoveryCommandPort
 */

/**
 * @param {Buffer} source
 * @param {string} marker
 */
export function patchWebSignInMarker(source, marker) {
  const text = source.toString('utf8');
  if (!text.includes(WEB_SIGN_IN_DEFAULT_MARKER)) {
    throw new Error('web-sign-in-marker-missing');
  }
  return Buffer.from(text.replace(WEB_SIGN_IN_DEFAULT_MARKER, marker), 'utf8');
}

/**
 * @param {Buffer} source
 * @param {string} marker
 */
export function patchApiHealthLiveMarker(source, marker) {
  const text = source.toString('utf8');
  const needle = "return { status: 'ok' };";
  if (!text.includes(needle)) {
    throw new Error('api-health-live-return-missing');
  }
  const replacement = `return { status: 'ok', verificationMarker: '${marker}' };`;
  return Buffer.from(text.replace(needle, replacement), 'utf8');
}

/**
 * @param {Buffer} source
 */
export function appendInvalidApiTypeScript(source) {
  return Buffer.concat([
    source,
    Buffer.from('\nconst __inf52InvalidType: number = "blocked";\n', 'utf8'),
  ]);
}

/**
 * @param {string} body
 * @param {string} marker
 */
export function verifyWebMarkerBody(body, marker) {
  return typeof body === 'string' && body.includes(marker);
}

/**
 * @param {string} body
 * @param {string} marker
 */
export function verifyApiLiveMarkerBody(body, marker) {
  try {
    const json = JSON.parse(body);
    return json?.verificationMarker === marker;
  } catch {
    return false;
  }
}

/**
 * @param {string} marker
 */
export function buildSharedPackageHookSource(marker) {
  return `export const DEV_VERIFICATION_SHARED_MARKER = '${marker}';\n`;
}

/**
 * @param {string} body
 * @param {string} marker
 */
export function verifySharedPackageMarkerBody(body, marker) {
  try {
    const json = JSON.parse(body);
    return json?.sharedPackageMarker === marker;
  } catch {
    return false;
  }
}

/**
 * @param {{
 *   scenarioId: string,
 *   live: boolean,
 *   worktree: string,
 *   ports: DevRecoveryCommandPort,
 *   ownedSlotId: string,
 *   authorizeToken?: string | null,
 * }} input
 */
export async function runDevRecoveryProgramme(input) {
  const started = input.ports.now();
  const refuse = refuseUnlessLiveAuthorized(input.live, {
    authorizeToken: input.authorizeToken,
  });
  if (refuse) {
    return { ...refuse, durationMs: 0, cleanup: [] };
  }

  if (!DEV_RECOVERY_SCENARIO_IDS.includes(input.scenarioId)) {
    return {
      status: /** @type {ProgrammeStatus} */ ('FAIL'),
      reason: 'unknown-scenario',
      reasonCode: 'unknown-scenario',
      durationMs: 0,
      cleanup: [],
    };
  }

  if (!input.ownedSlotId) {
    return {
      status: /** @type {ProgrammeStatus} */ ('BLOCKED'),
      reason: 'owned-slot-missing',
      reasonCode: 'owned-slot-missing',
      durationMs: 0,
      cleanup: [],
    };
  }

  const owner = input.ports.getEnvironment(
    input.ports.registryRoot,
    input.ownedSlotId,
  );
  if (!owner) {
    return {
      status: /** @type {ProgrammeStatus} */ ('BLOCKED'),
      reason: 'unknown-environment',
      reasonCode: 'unknown-environment',
      durationMs: 0,
      cleanup: [],
    };
  }

  const identity = captureOwnerRegistryIdentity(
    owner,
    input.ports.registryRoot,
    input.ports,
  );
  if (!identity.ok) {
    return {
      status: /** @type {ProgrammeStatus} */ ('BLOCKED'),
      reason: identity.reason ?? 'identity-missing',
      reasonCode: identity.reason ?? 'identity-missing',
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup: [],
    };
  }

  const pre = assessLifecycleActivationPreconditions({
    worktree: input.worktree,
    registryRoot: input.ports.registryRoot,
    ports: input.ports,
    ownedSlotId: input.ownedSlotId,
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
  const sleep =
    input.ports.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  try {
    if (input.scenarioId === 'DEV-07') {
      const webMarker = `${WEB_SIGN_IN_DEFAULT_MARKER}-inf52-${input.ownedSlotId}`;
      const webEdit = await withDisposableWorktreeEdit({
        readBytes: (p) => input.ports.readWorktreeBytes(p),
        writeBytes: (p, b) => input.ports.writeWorktreeBytes(p, b),
        relativePath: WEB_SIGN_IN_RELATIVE,
        transform: (bytes) => patchWebSignInMarker(bytes, webMarker),
      });
      if (!webEdit.ok) {
        return {
          status: /** @type {ProgrammeStatus} */ (webEdit.status ?? 'BLOCKED'),
          reason: webEdit.reason ?? 'web-fixture-blocked',
          reasonCode: webEdit.reason ?? 'web-fixture-blocked',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
      try {
        const polled = await pollWithDeadline(
          RECOVERY_POLL_DEADLINE_MS,
          input.ports.now,
          RECOVERY_POLL_INTERVAL_MS,
          async () => {
            const http = await input.ports.fetchOwnedHttp({
              slotId: input.ownedSlotId,
              path: '/sign-in',
              proxy: 'web',
            });
            if (http.status === 200 && verifyWebMarkerBody(http.body, webMarker)) {
              return { done: true, value: http };
            }
            return { done: false };
          },
          sleep,
        );
        if (!polled.ok) {
          return {
            status: 'FAIL',
            reason: polled.reason ?? 'web-marker-mismatch',
            reasonCode: polled.reason ?? 'web-marker-mismatch',
            durationMs: Math.max(0, input.ports.now() - started),
            cleanup,
          };
        }
      } finally {
        await webEdit.restore();
        cleanup.push({
          action: 'restore-web-sign-in',
          status: 'PASS',
          reason: null,
        });
      }

      const apiEdit = await withDisposableWorktreeEdit({
        readBytes: (p) => input.ports.readWorktreeBytes(p),
        writeBytes: (p, b) => input.ports.writeWorktreeBytes(p, b),
        relativePath: API_HEALTH_RELATIVE,
        transform: (bytes) =>
          patchApiHealthLiveMarker(bytes, API_HEALTH_LIVE_MARKER),
      });
      if (!apiEdit.ok) {
        return {
          status: /** @type {ProgrammeStatus} */ (apiEdit.status ?? 'BLOCKED'),
          reason: apiEdit.reason ?? 'api-fixture-blocked',
          reasonCode: apiEdit.reason ?? 'api-fixture-blocked',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
      try {
        const polledApi = await pollWithDeadline(
          RECOVERY_POLL_DEADLINE_MS,
          input.ports.now,
          RECOVERY_POLL_INTERVAL_MS,
          async () => {
            const http = await input.ports.fetchOwnedHttp({
              slotId: input.ownedSlotId,
              path: '/api/health/live',
              proxy: 'api',
            });
            if (
              http.status === 200 &&
              verifyApiLiveMarkerBody(http.body, API_HEALTH_LIVE_MARKER)
            ) {
              return { done: true, value: http };
            }
            return { done: false };
          },
          sleep,
        );
        if (!polledApi.ok) {
          return {
            status: 'FAIL',
            reason: polledApi.reason ?? 'api-marker-mismatch',
            reasonCode: polledApi.reason ?? 'api-marker-mismatch',
            durationMs: Math.max(0, input.ports.now() - started),
            cleanup,
          };
        }
      } finally {
        await apiEdit.restore();
        cleanup.push({
          action: 'restore-api-health',
          status: 'PASS',
          reason: null,
        });
      }
    }

    if (input.scenarioId === 'DEV-08') {
      const hook = await input.ports.installSharedPackageHook(input.worktree);
      if (!hook.ok) {
        return {
          status: 'BLOCKED',
          reason: hook.reason ?? 'shared-hook-blocked',
          reasonCode: hook.reason ?? 'shared-hook-blocked',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
      const hookEdit = await withDisposableWorktreeEdit({
        readBytes: (p) => input.ports.readWorktreeBytes(p),
        writeBytes: (p, b) => input.ports.writeWorktreeBytes(p, b),
        relativePath: SHARED_MARKER_HOOK_RELATIVE,
        transform: () =>
          Buffer.from(
            buildSharedPackageHookSource(API_SHARED_PACKAGE_MARKER),
            'utf8',
          ),
      });
      if (!hookEdit.ok) {
        return {
          status: 'BLOCKED',
          reason: hookEdit.reason ?? 'shared-marker-blocked',
          reasonCode: hookEdit.reason ?? 'shared-marker-blocked',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
      try {
        const polled = await pollWithDeadline(
          RECOVERY_POLL_DEADLINE_MS,
          input.ports.now,
          RECOVERY_POLL_INTERVAL_MS,
          async () => {
            const marker = await input.ports.pollSharedPackageMarker(
              input.ownedSlotId,
            );
            if (
              marker.marker === API_SHARED_PACKAGE_MARKER &&
              marker.generationId
            ) {
              const http = await input.ports.fetchOwnedHttp({
                slotId: input.ownedSlotId,
                path: '/api/health/live',
                proxy: 'api',
              });
              if (
                http.status === 200 &&
                verifySharedPackageMarkerBody(http.body, API_SHARED_PACKAGE_MARKER)
              ) {
                return { done: true, value: marker };
              }
            }
            return { done: false };
          },
          sleep,
        );
        if (!polled.ok) {
          return {
            status: 'FAIL',
            reason: polled.reason ?? 'shared-marker-mismatch',
            reasonCode: polled.reason ?? 'shared-marker-mismatch',
            durationMs: Math.max(0, input.ports.now() - started),
            cleanup,
          };
        }
      } finally {
        await hookEdit.restore();
        cleanup.push({
          action: 'restore-shared-marker',
          status: 'PASS',
          reason: null,
        });
      }
    }

    if (input.scenarioId === 'DEV-09') {
      const broken = await withDisposableWorktreeEdit({
        readBytes: (p) => input.ports.readWorktreeBytes(p),
        writeBytes: (p, b) => input.ports.writeWorktreeBytes(p, b),
        relativePath: API_HEALTH_RELATIVE,
        transform: (bytes) => appendInvalidApiTypeScript(bytes),
      });
      if (!broken.ok) {
        return {
          status: 'BLOCKED',
          reason: broken.reason ?? 'compile-fixture-blocked',
          reasonCode: broken.reason ?? 'compile-fixture-blocked',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
      try {
        const notReady = await pollWithDeadline(
          RECOVERY_POLL_DEADLINE_MS,
          input.ports.now,
          RECOVERY_POLL_INTERVAL_MS,
          async () => {
            const readiness = await input.ports.pollApiCompileReadiness(
              input.ownedSlotId,
            );
            if (!readiness.ready && readiness.runtimeCount <= 1) {
              return { done: true, value: readiness };
            }
            return { done: false };
          },
          sleep,
        );
        if (!notReady.ok) {
          return {
            status: 'FAIL',
            reason: notReady.reason ?? 'compile-not-blocked',
            reasonCode: notReady.reason ?? 'compile-not-blocked',
            durationMs: Math.max(0, input.ports.now() - started),
            cleanup,
          };
        }
      } finally {
        await broken.restore();
        cleanup.push({
          action: 'restore-api-typescript',
          status: 'PASS',
          reason: null,
        });
      }

      const recovered = await pollWithDeadline(
        RECOVERY_POLL_DEADLINE_MS,
        input.ports.now,
        RECOVERY_POLL_INTERVAL_MS,
        async () => {
          const readiness = await input.ports.pollApiCompileReadiness(
            input.ownedSlotId,
          );
          if (readiness.ready) {
            return { done: true, value: readiness };
          }
          return { done: false };
        },
        sleep,
      );
      if (!recovered.ok) {
        return {
          status: 'FAIL',
          reason: recovered.reason ?? 'compile-recovery-timeout',
          reasonCode: recovered.reason ?? 'compile-recovery-timeout',
          durationMs: Math.max(0, input.ports.now() - started),
          cleanup,
        };
      }
    }

    await input.ports.runPnpm(['dev:stop', '--instance', input.ownedSlotId], {
      cwd: input.worktree,
      timeoutMs: LIFECYCLE_BOUNDS.parkMs,
    });
    cleanup.push({
      action: 'park',
      status: 'PASS',
      reason: null,
    });

    return {
      status: 'PASS',
      reason: null,
      reasonCode: null,
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup,
      measurements: {
        scenarioId: input.scenarioId,
        slotId: input.ownedSlotId,
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
  }
}

/**
 * @param {string} worktree
 * @param {string} slotId
 * @param {Partial<DevRecoveryCommandPort>} [overrides]
 */
export function createDefaultRecoveryPorts(worktree, slotId, overrides = {}) {
  return /** @type {DevRecoveryCommandPort} */ ({
    registryRoot: overrides.registryRoot ?? '/tmp',
    sessionRoot: overrides.sessionRoot ?? '/tmp/sessions',
    getEnvironment: () => null,
    readWorktreeBytes: async () => null,
    writeWorktreeBytes: async () => {},
    fetchOwnedHttp: async () => ({ status: null, body: '' }),
    pollApiCompileReadiness: async () => ({
      ready: false,
      reason: 'compile_error',
      runtimeCount: 0,
    }),
    pollSharedPackageMarker: async () => ({
      generationId: null,
      marker: null,
    }),
    installSharedPackageHook: async () => ({
      ok: false,
      reason: 'hook-not-configured',
    }),
    gitWorktreeState: () => ({ ok: false, reason: 'worktree-unavailable' }),
    readKubeContext: () => null,
    readMemAvailableKib: () => null,
    listActiveSlotIds: () => [],
    getDefaultEnvironment: () => null,
    runPnpm: async () => ({ code: 0 }),
    now: () => Date.now(),
    ...overrides,
  });
}

export function assessLocalCompileReadiness(receiptRoot, role, entryRel) {
  return evaluateDevLoadedRuntimeReadiness({
    role,
    compiledEntryPath: entryRel,
    receiptRoot,
    cwd: receiptRoot,
  });
}