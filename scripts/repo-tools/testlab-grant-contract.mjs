/** Pure testlab launch-grant plan; no I/O. */

export const LAUNCH_MIN_MICROUSD = 250_000n;
export const LAUNCH_MIN_MICROUSD_SQL = 250_000;
export const TESTLAB_GRANT_EXPIRY_MS = 24 * 60 * 60 * 1000;
export const TESTLAB_LAUNCH_ROUTE = 'writer:launch';
export const TESTLAB_FUNDING_MODE = 'prepaid';
export const TESTLAB_RUN_MAX_ATTEMPTS = 4;
export const TESTLAB_ENTITLEMENT_PROFILE_ID = 'p3c-launch-entitlement.v1';
export const TESTLAB_GRANT_REVISION = 1;
export const TESTLAB_ALLOWED_TARGETS = Object.freeze([
  'disposable',
  'kind-offscreen-release',
]);

/**
 * @param {number} revision
 * @returns {Readonly<Record<string, unknown>>}
 */
export function buildTestlabEntitlementProfile(
  revision = TESTLAB_GRANT_REVISION,
) {
  return Object.freeze({
    schemaVersion: 1,
    id: TESTLAB_ENTITLEMENT_PROFILE_ID,
    revision,
    enabled: true,
    allowedRoutes: Object.freeze([TESTLAB_LAUNCH_ROUTE]),
    defaultRoute: TESTLAB_LAUNCH_ROUTE,
    fundingModes: Object.freeze([TESTLAB_FUNDING_MODE]),
    recovery: 'explicit-resume',
    limits: Object.freeze({
      maxInputTokensPerRequest: 8_000,
      maxSerializedBytesPerRequest: 65_536,
      maxGeneratedTokensPerRequest: 2_000,
      maxReasoningTokensPerRequest: 0,
      maxInputTokensPerOperation: 8_000,
      maxGeneratedTokensPerOperation: 2_000,
      maxModelRoundsPerOperation: 4,
      maxReadsPerOperation: 0,
      maxRetainedReadBytes: 0,
      maxMicrousdPerOperation: String(LAUNCH_MIN_MICROUSD_SQL),
      maxInFlightDispatches: 1,
      maxBackgroundJobsPerWindow: 0,
    }),
    windows: Object.freeze([]),
  });
}

/**
 * @typedef {{ id: string, message: string }} TestlabGrantRefusal
 */

/**
 * @typedef {{
 *   ownerId: string,
 *   suiteId: string,
 *   operatorId: string,
 *   approvalIdentity: string,
 *   targetIdentity: string,
 *   now: Date | number,
 *   noExpiry?: boolean,
 *   expiresAt?: Date | number | null,
 *   requestedRoute?: string,
 *   entitlementProfile?: unknown,
 * }} TestlabGrantPlanInput
 */

/** @param {unknown} value */
function nonEmptyString(value, field, refusals) {
  if (typeof value !== 'string' || value.trim() === '') {
    refusals.push({
      id: `missing-${field}`,
      message: `${field} must be a non-empty string.`,
    });
    return null;
  }
  return value.trim();
}

/** @param {Date | number | undefined | null} value */
function toEpochMs(value) {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

/**
 * @param {TestlabGrantPlanInput} input
 * @returns {{ ok: true, plan: Readonly<Record<string, unknown>> } | { ok: false, refusals: readonly TestlabGrantRefusal[] }}
 */
export function planTestlabGrant(input) {
  /** @type {TestlabGrantRefusal[]} */
  const refusals = [];

  const ownerId = nonEmptyString(input?.ownerId, 'ownerId', refusals);
  const suiteId = nonEmptyString(input?.suiteId, 'suiteId', refusals);
  const operatorId = nonEmptyString(input?.operatorId, 'operatorId', refusals);
  const approvalIdentity = nonEmptyString(
    input?.approvalIdentity,
    'approvalIdentity',
    refusals,
  );
  const targetIdentity = nonEmptyString(
    input?.targetIdentity,
    'targetIdentity',
    refusals,
  );

  if (targetIdentity && !TESTLAB_ALLOWED_TARGETS.includes(targetIdentity)) {
    refusals.push({
      id: 'invalid-target',
      message: `targetIdentity must be one of: ${TESTLAB_ALLOWED_TARGETS.join(', ')}.`,
    });
  }

  const nowMs = toEpochMs(input?.now);
  if (nowMs === null) {
    refusals.push({
      id: 'invalid-now',
      message: 'now must be a Date or finite epoch milliseconds.',
    });
  }

  if (input?.noExpiry === true) {
    refusals.push({
      id: 'no-expiry',
      message: 'noExpiry grants are not allowed for testlab fixtures.',
    });
  }

  if (
    input?.requestedRoute !== undefined &&
    input.requestedRoute !== TESTLAB_LAUNCH_ROUTE
  ) {
    refusals.push({
      id: 'invalid-route',
      message: `requestedRoute must be ${TESTLAB_LAUNCH_ROUTE}.`,
    });
  }

  if (input?.entitlementProfile !== undefined) {
    const canonical = buildTestlabEntitlementProfile(TESTLAB_GRANT_REVISION);
    const given = input.entitlementProfile;
    if (
      typeof given !== 'object' ||
      given === null ||
      given.defaultRoute !== canonical.defaultRoute ||
      given.limits?.maxMicrousdPerOperation !==
        canonical.limits.maxMicrousdPerOperation
    ) {
      refusals.push({
        id: 'invalid-profile',
        message:
          'entitlementProfile must match the canonical testlab launch profile.',
      });
    }
  }

  if (Object.prototype.hasOwnProperty.call(input ?? {}, 'expiresAt')) {
    const explicit = input.expiresAt;
    if (explicit === null || explicit === undefined) {
      refusals.push({
        id: 'missing-expiry',
        message: 'expiresAt is required when noExpiry is false.',
      });
    } else if (nowMs !== null) {
      const expiresMs = toEpochMs(explicit);
      if (expiresMs === null || expiresMs <= 0) {
        refusals.push({
          id: 'expiry-invalid',
          message: 'expiresAt must be a positive future instant.',
        });
      } else if (expiresMs <= nowMs) {
        refusals.push({
          id: 'expiry-past',
          message: 'expiresAt must be after now.',
        });
      } else if (expiresMs > nowMs + TESTLAB_GRANT_EXPIRY_MS) {
        refusals.push({
          id: 'expiry-beyond-max',
          message: `expiresAt must be at most ${TESTLAB_GRANT_EXPIRY_MS}ms after now.`,
        });
      }
    }
  }

  if (!operatorId || !approvalIdentity) {
    refusals.push({
      id: 'unauthorized',
      message:
        'operatorId and approvalIdentity are required authorization fields.',
    });
  }

  if (refusals.length > 0) {
    return Object.freeze({ ok: false, refusals: Object.freeze([...refusals]) });
  }

  const expiresAtMs = nowMs + TESTLAB_GRANT_EXPIRY_MS;
  const expiresAt = new Date(expiresAtMs);
  const entitlementProfile = buildTestlabEntitlementProfile(
    TESTLAB_GRANT_REVISION,
  );

  const plan = Object.freeze({
    ownerId,
    suiteId,
    targetIdentity,
    operatorId,
    approvalIdentity,
    funding: Object.freeze({
      limitMicrousd: LAUNCH_MIN_MICROUSD,
      limitMicrousdSql: LAUNCH_MIN_MICROUSD_SQL,
      stopped: false,
    }),
    run: Object.freeze({
      limitMicrousd: LAUNCH_MIN_MICROUSD,
      limitMicrousdSql: LAUNCH_MIN_MICROUSD_SQL,
      maxAttempts: TESTLAB_RUN_MAX_ATTEMPTS,
      enabled: true,
    }),
    grant: Object.freeze({
      revision: TESTLAB_GRANT_REVISION,
      userId: ownerId,
      entitlementProfile,
      restrictions: Object.freeze([]),
      enabled: true,
      revokedAt: null,
      noExpiry: false,
      expiresAt,
      expiresAtMs,
      requestedRoute: TESTLAB_LAUNCH_ROUTE,
      requestedFundingMode: TESTLAB_FUNDING_MODE,
      operatorId,
      approvalIdentity,
      suiteId,
    }),
  });

  return Object.freeze({ ok: true, plan });
}
