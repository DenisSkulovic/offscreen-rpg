import { createHash, randomUUID } from 'node:crypto';
import {
  LAUNCH_MIN_MICROUSD_SQL,
  TESTLAB_FUNDING_MODE,
  TESTLAB_LAUNCH_ROUTE,
  TESTLAB_RUN_MAX_ATTEMPTS,
  buildTestlabEntitlementProfile,
  planTestlabGrant,
} from './testlab-grant-contract.mjs';

/** Stable operator identity for testlab-provisioned grants. */
export const TESTLAB_PROVISIONER_OPERATOR_ID = 'testlab:provisioner';

const TESTLAB_SUITE_APPROVAL_PREFIX = 'testlab:suite:';

/**
 * @param {string} suiteId
 * @returns {string}
 */
export function buildTestlabSuiteApprovalIdentity(suiteId) {
  return `${TESTLAB_SUITE_APPROVAL_PREFIX}${suiteId}`;
}

/**
 * @param {string} approvalIdentity
 * @returns {string | null}
 */
export function parseTestlabSuiteIdFromApproval(approvalIdentity) {
  if (
    typeof approvalIdentity !== 'string' ||
    !approvalIdentity.startsWith(TESTLAB_SUITE_APPROVAL_PREFIX)
  ) {
    return null;
  }
  const suiteId = approvalIdentity.slice(TESTLAB_SUITE_APPROVAL_PREFIX.length);
  return suiteId.length > 0 ? suiteId : null;
}

/**
 * @param {string} ownerUserId
 * @param {string} suiteId
 * @returns {[number, number]}
 */
export function testlabGrantAdvisoryLockKeys(ownerUserId, suiteId) {
  const digest = createHash('sha256')
    .update(`testlab-grant-store:v1:${ownerUserId}\0${suiteId}`)
    .digest();
  return [digest.readInt32BE(0), digest.readInt32BE(4)];
}

/**
 * @typedef {{
 *   query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>,
 * }} TestlabGrantQueryRunner
 */

/**
 * @typedef {{
 *   withTransaction: (
 *     fn: (tx: TestlabGrantQueryRunner) => Promise<unknown>,
 *   ) => Promise<unknown>,
 * }} TestlabGrantStoreDeps
 */

/**
 * @typedef {{
 *   ownerId: string,
 *   suiteId: string,
 *   operatorId?: string,
 *   approvalIdentity?: string,
 *   targetIdentity: string,
 *   now: Date | number,
 * }} TestlabGrantEnsureInput
 */

/**
 * @param {unknown} value
 */
function epochMs(value) {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

/**
 * @param {unknown} row
 */
function readMicrousd(value) {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return BigInt(value);
  }
  return null;
}

/**
 * @param {Record<string, unknown>} profile
 */
function profilesMatchCanonical(profile) {
  const canonical = buildTestlabEntitlementProfile(1);
  return (
    profile?.defaultRoute === canonical.defaultRoute &&
    profile?.limits?.maxMicrousdPerOperation ===
      canonical.limits.maxMicrousdPerOperation &&
    profile?.id === canonical.id &&
    profile?.revision === 1
  );
}

/**
 * @param {Record<string, unknown>} row
 * @param {Date} now
 */
function isGrantRowExpired(row, now) {
  if (row.no_expiry === true) {
    return false;
  }
  const expiresAt = row.expires_at;
  if (expiresAt instanceof Date) {
    return expiresAt.getTime() <= now.getTime();
  }
  if (typeof expiresAt === 'string') {
    const parsed = Date.parse(expiresAt);
    return Number.isFinite(parsed) && parsed <= now.getTime();
  }
  return true;
}

/**
 * @param {Record<string, unknown>} row
 * @param {Date} now
 */
function isActiveAdmissibleRow(row, now) {
  if (row.enabled !== true || row.revoked_at != null) {
    return false;
  }
  if (isGrantRowExpired(row, now)) {
    return false;
  }
  if (row.stopped === true || row.run_enabled !== true) {
    return false;
  }
  const fundingLimit = readMicrousd(row.funding_limit_microusd);
  const runLimit = readMicrousd(row.run_limit_microusd);
  if (
    fundingLimit === null ||
    runLimit === null ||
    fundingLimit < BigInt(LAUNCH_MIN_MICROUSD_SQL) ||
    runLimit < BigInt(LAUNCH_MIN_MICROUSD_SQL)
  ) {
    return false;
  }
  return true;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} suiteId
 */
function rowSuiteId(row, suiteId) {
  const parsed = parseTestlabSuiteIdFromApproval(
    String(row.approval_identity ?? ''),
  );
  return parsed ?? suiteId;
}

/**
 * @param {Record<string, unknown>} row
 * @param {Readonly<Record<string, unknown>>} plan
 * @param {string} suiteId
 */
function grantFingerprintMatches(row, plan, suiteId) {
  const grant = plan.grant;
  if (rowSuiteId(row, suiteId) !== suiteId) {
    return false;
  }
  if (row.requested_route !== TESTLAB_LAUNCH_ROUTE) {
    return false;
  }
  if (row.requested_funding_mode !== TESTLAB_FUNDING_MODE) {
    return false;
  }
  if (row.operator_id !== grant.operatorId) {
    return false;
  }
  if (row.approval_identity !== grant.approvalIdentity) {
    return false;
  }
  if (Number(row.revision) !== Number(grant.revision)) {
    return false;
  }
  const fundingLimit = readMicrousd(row.funding_limit_microusd);
  const runLimit = readMicrousd(row.run_limit_microusd);
  if (
    fundingLimit !== BigInt(LAUNCH_MIN_MICROUSD_SQL) ||
    runLimit !== BigInt(LAUNCH_MIN_MICROUSD_SQL)
  ) {
    return false;
  }
  if (Number(row.max_attempts) !== TESTLAB_RUN_MAX_ATTEMPTS) {
    return false;
  }
  const admitted = Number(row.admitted_attempts ?? 0);
  if (!Number.isFinite(admitted) || admitted >= TESTLAB_RUN_MAX_ATTEMPTS) {
    return false;
  }
  let profile = row.entitlement_profile;
  if (typeof profile === 'string') {
    try {
      profile = JSON.parse(profile);
    } catch {
      return false;
    }
  }
  return profilesMatchCanonical(profile);
}

const GRANTS_FOR_OWNER_SQL = `
  SELECT
    g.id AS grant_id,
    g.account_id,
    g.run_id,
    g.revision,
    g.enabled,
    g.revoked_at,
    g.no_expiry,
    g.expires_at,
    g.requested_route,
    g.requested_funding_mode,
    g.operator_id,
    g.approval_identity,
    g.entitlement_profile,
    f.limit_microusd AS funding_limit_microusd,
    f.stopped,
    r.limit_microusd AS run_limit_microusd,
    r.max_attempts,
    r.admitted_attempts,
    r.enabled AS run_enabled
  FROM storyteller_current_owner_grant g
  INNER JOIN storyteller_funding f ON g.account_id = f.id
  INNER JOIN storyteller_run r
    ON g.run_id = r.id
   AND r.account_id = f.id
  WHERE g.user_id = $1
`;

/**
 * @param {TestlabGrantStoreDeps} deps
 * @param {TestlabGrantEnsureInput} rawInput
 */
export async function ensureTestlabGrant(deps, rawInput) {
  const planInput = {
    ...rawInput,
    operatorId: rawInput.operatorId ?? TESTLAB_PROVISIONER_OPERATOR_ID,
    approvalIdentity:
      rawInput.approvalIdentity ??
      buildTestlabSuiteApprovalIdentity(rawInput.suiteId),
  };

  const planned = planTestlabGrant(planInput);
  if (!planned.ok) {
    return Object.freeze({
      ok: false,
      outcome: 'blocked',
      refusals: planned.refusals,
    });
  }

  const plan = planned.plan;
  const nowMs = epochMs(rawInput.now);
  const now = new Date(nowMs);

  return deps.withTransaction(async (tx) => {
    const [lockKey1, lockKey2] = testlabGrantAdvisoryLockKeys(
      plan.ownerId,
      plan.suiteId,
    );
    await tx.query('SELECT pg_advisory_xact_lock($1::int, $2::int)', [
      lockKey1,
      lockKey2,
    ]);

    const userRows = await tx.query('SELECT id FROM "user" WHERE id = $1', [
      plan.ownerId,
    ]);
    if (userRows.rows.length === 0) {
      return Object.freeze({
        ok: false,
        outcome: 'refused',
        refusals: Object.freeze([
          {
            id: 'missing-auth-user',
            message: 'Better Auth user must exist before grant provisioning.',
          },
        ]),
      });
    }

    const grantRows = await tx.query(GRANTS_FOR_OWNER_SQL, [plan.ownerId]);
    /** @type {Record<string, unknown>[]} */
    const rows = grantRows.rows;

    /** @type {Record<string, unknown>[]} */
    const activeRows = rows.filter((row) => isActiveAdmissibleRow(row, now));

    /** @type {Record<string, unknown>[]} */
    const matchingActive = activeRows.filter((row) =>
      grantFingerprintMatches(row, plan, plan.suiteId),
    );

    if (matchingActive.length === 1) {
      const row = matchingActive[0];
      return Object.freeze({
        ok: true,
        outcome: 'reused',
        fundingId: String(row.account_id),
        runId: String(row.run_id),
        grantId: String(row.grant_id),
      });
    }

    if (matchingActive.length > 1) {
      return Object.freeze({
        ok: false,
        outcome: 'refused',
        refusals: Object.freeze([
          {
            id: 'duplicate-conflicting-grant',
            message:
              'Multiple active grants match the testlab fingerprint for this owner and suite.',
          },
        ]),
      });
    }

    for (const row of activeRows) {
      if (grantFingerprintMatches(row, plan, plan.suiteId)) {
        continue;
      }
      const suiteInRow = rowSuiteId(row, plan.suiteId);
      if (suiteInRow !== plan.suiteId) {
        return Object.freeze({
          ok: false,
          outcome: 'refused',
          refusals: Object.freeze([
            {
              id: 'foreign-suite-grant',
              message:
                'Owner has an active grant bound to a different test suite.',
            },
          ]),
        });
      }
      if (Number(row.admitted_attempts ?? 0) >= TESTLAB_RUN_MAX_ATTEMPTS) {
        return Object.freeze({
          ok: false,
          outcome: 'refused',
          refusals: Object.freeze([
            {
              id: 'exhausted-attempts',
              message: 'Active grant attempt budget is exhausted.',
            },
          ]),
        });
      }
      if (isGrantRowExpired(row, now)) {
        return Object.freeze({
          ok: false,
          outcome: 'refused',
          refusals: Object.freeze([
            {
              id: 'expired-grant',
              message: 'Active grant is expired.',
            },
          ]),
        });
      }
      return Object.freeze({
        ok: false,
        outcome: 'refused',
        refusals: Object.freeze([
          {
            id: 'incompatible-grant',
            message:
              'Active grant exists with an incompatible testlab profile or limits.',
          },
        ]),
      });
    }

    const fundingId = randomUUID();
    const runId = randomUUID();
    const grantId = randomUUID();
    const expiresAt = plan.grant.expiresAt;

    await tx.query(
      `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
       VALUES ($1::uuid, $2::bigint, false, now())`,
      [fundingId, String(LAUNCH_MIN_MICROUSD_SQL)],
    );
    await tx.query(
      `INSERT INTO storyteller_run (
         id, account_id, limit_microusd, max_attempts, enabled
       ) VALUES ($1::uuid, $2::uuid, $3::bigint, $4::integer, true)`,
      [
        runId,
        fundingId,
        String(LAUNCH_MIN_MICROUSD_SQL),
        TESTLAB_RUN_MAX_ATTEMPTS,
      ],
    );
    await tx.query(
      `INSERT INTO storyteller_current_owner_grant (
         id, revision, user_id, account_id, run_id, entitlement_profile, restrictions,
         enabled, revoked_at, no_expiry, expires_at, requested_route, requested_funding_mode,
         operator_id, approval_identity
       ) VALUES (
         $1::uuid, $2::integer, $3, $4::uuid, $5::uuid, $6::jsonb, '[]'::jsonb,
         true, NULL, false, $7::timestamptz, $8, $9, $10, $11
       )`,
      [
        grantId,
        plan.grant.revision,
        plan.ownerId,
        fundingId,
        runId,
        JSON.stringify(plan.grant.entitlementProfile),
        expiresAt,
        plan.grant.requestedRoute,
        plan.grant.requestedFundingMode,
        plan.grant.operatorId,
        plan.grant.approvalIdentity,
      ],
    );

    return Object.freeze({
      ok: true,
      outcome: 'created',
      fundingId,
      runId,
      grantId,
    });
  });
}
