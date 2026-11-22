import {
  LAUNCH_MIN_MICROUSD_SQL,
  TESTLAB_GRANT_EXPIRY_MS,
  planTestlabGrant,
} from './testlab-grant-contract.mjs';
import {
  buildTestlabSuiteApprovalIdentity,
  ensureTestlabGrant,
} from './testlab-grant-store.mjs';
import {
  verifyTestlabTarget,
  WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
  OFFSCREEN_WRITER_EXECUTION_MODE_ENV,
} from './testlab-target-guard.mjs';

/** CLI flag separate from packet approval identity; required for kind-offscreen-lab ensure. */
export const TESTLAB_OPERATOR_GRANT_CLI_FLAG = '--operator-grant-authorized';

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

const SECRET_PATTERNS = [
  /postgres(?:ql)?:\/\/[^\s"']+/gi,
  /(?:password|passwd|token|api[_-]?key|secret)\s*[=:]\s*\S+/gi,
  /\bsk-[a-zA-Z0-9]{20,}\b/g,
  /\bBearer\s+[A-Za-z0-9._-]+\b/gi,
];

/**
 * @param {string} text
 * @returns {string}
 */
export function redactSecrets(text) {
  let out = String(text ?? '');
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, '[REDACTED]');
  }
  return out;
}

/**
 * @param {string[]} argv
 * @returns {Record<string, string | boolean>}
 */
export function parseTestlabFundingFlags(argv) {
  /** @type {Record<string, string | boolean>} */
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === TESTLAB_OPERATOR_GRANT_CLI_FLAG) {
      flags.operatorGrantAuthorized = true;
      continue;
    }
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token
      .slice(2)
      .replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i += 1;
  }
  return flags;
}

/**
 * @param {string[]} argv
 * @returns {{ command: string | null, flags: Record<string, string | boolean> }}
 */
export function parseTestlabFundingArgv(argv) {
  const command = argv[0] ?? null;
  const flags = parseTestlabFundingFlags(argv.slice(1));
  return { command, flags };
}

/**
 * @typedef {{
 *   queryReadOnly?: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>,
 *   grantStore?: import('./testlab-grant-store.mjs').TestlabGrantStoreDeps,
 *   observeDisposableTarget?: () => import('./testlab-target-guard.mjs').TestlabTargetObservation | Promise<import('./testlab-target-guard.mjs').TestlabTargetObservation>,
 *   observeKindTarget?: () => import('./testlab-target-guard.mjs').TestlabTargetObservation | Promise<import('./testlab-target-guard.mjs').TestlabTargetObservation>,
 *   now?: () => number,
 *   logError?: (message: string) => void,
 * }} TestlabFundingDeps
 */

/**
 * @param {Record<string, string | boolean>} flags
 * @param {TestlabFundingDeps} [deps]
 */
function resolveNow(flags, deps) {
  if (typeof flags.now === 'string' && flags.now.trim() !== '') {
    const parsed = Number(flags.now);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return deps?.now?.() ?? Date.now();
}

/**
 * @param {Record<string, string | boolean>} flags
 * @returns {string | null}
 */
function stringFlag(flags, name) {
  const value = flags[name];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * @param {readonly { id: string, message: string }[]} refusals
 * @param {string | null} targetIdentity
 */
function blockedReceipt(refusals, targetIdentity) {
  return Object.freeze({
    outcome: 'blocked',
    targetIdentity,
    refusals: Object.freeze(refusals.map((r) => Object.freeze({ ...r }))),
  });
}

/**
 * @param {unknown} row
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
  const fundingLimit = row.funding_limit_microusd;
  const runLimit = row.run_limit_microusd;
  const min = BigInt(LAUNCH_MIN_MICROUSD_SQL);
  const readLimit = (value) => {
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
  };
  const f = readLimit(fundingLimit);
  const r = readLimit(runLimit);
  if (f === null || r === null || f < min || r < min) {
    return false;
  }
  return true;
}

/**
 * @param {Record<string, string | boolean>} flags
 * @param {TestlabFundingDeps} [deps]
 */
export function runTestlabFundingPlan(flags, deps = {}) {
  const targetIdentity = stringFlag(flags, 'target');
  const ownerId = stringFlag(flags, 'owner');
  const suiteId = stringFlag(flags, 'suite');
  const operatorId = stringFlag(flags, 'operator');
  const approvalIdentity = stringFlag(flags, 'approval');
  const now = resolveNow(flags, deps);

  const planned = planTestlabGrant({
    ownerId: ownerId ?? '',
    suiteId: suiteId ?? '',
    operatorId: operatorId ?? '',
    approvalIdentity: approvalIdentity ?? '',
    targetIdentity: targetIdentity ?? '',
    now,
  });

  if (!planned.ok) {
    return blockedReceipt(planned.refusals, targetIdentity);
  }

  return Object.freeze({
    ok: true,
    plan: planned.plan,
  });
}

/**
 * @param {Record<string, string | boolean>} flags
 * @param {TestlabFundingDeps} deps
 */
async function buildTargetObservation(flags, deps, command) {
  const target = stringFlag(flags, 'target');
  if (target === 'disposable') {
    if (
      command === 'ensure' &&
      typeof deps.observeDisposableTarget !== 'function'
    ) {
      return {
        observation: null,
        refusal: {
          id: 'missing-disposable-runner',
          message:
            'ensure --target disposable requires an injected disposable target observation hook.',
        },
      };
    }
    if (typeof deps.observeDisposableTarget === 'function') {
      const observation = await deps.observeDisposableTarget();
      return { observation: { target: 'disposable', ...observation } };
    }
    return {
      observation: {
        target: 'disposable',
        runtimeMode: 'test-container',
        localEnv: {
          [OFFSCREEN_WRITER_EXECUTION_MODE_ENV]:
            WRITER_EXECUTION_MODE_SCRIPTED_OFFLINE_LAB,
        },
      },
    };
  }

  if (target === 'kind-offscreen-lab') {
    if (command === 'ensure' && flags.operatorGrantAuthorized !== true) {
      return {
        observation: null,
        refusal: {
          id: 'operator-grant-cli-missing',
          message: `${TESTLAB_OPERATOR_GRANT_CLI_FLAG} is required for kind-offscreen-lab ensure.`,
        },
      };
    }
    if (typeof deps.observeKindTarget !== 'function') {
      return {
        observation: null,
        refusal: {
          id: 'missing-kind-observer',
          message:
            'kind-offscreen-lab requires an injected or CLI kind observer; refusing an empty cluster observation.',
        },
      };
    }
    const observation = await deps.observeKindTarget();
    const expectClusterUid = stringFlag(flags, 'expectClusterUid');
    const expectDbUid = stringFlag(flags, 'expectDbUid');
    return {
      observation: {
        ...observation,
        target: 'kind-offscreen-lab',
        operatorGrantAuthorized: flags.operatorGrantAuthorized === true,
        ...(expectClusterUid ? { expectedClusterUid: expectClusterUid } : {}),
        ...(expectDbUid ? { expectedDbInstanceUid: expectDbUid } : {}),
      },
    };
  }

  return {
    observation: target ? { target } : null,
    refusal: {
      id: 'unknown-target',
      message: 'target must be disposable or kind-offscreen-lab.',
    },
  };
}

/**
 * @param {Record<string, string | boolean>} flags
 * @param {TestlabFundingDeps} deps
 */
export async function runTestlabFundingStatus(flags, deps = {}) {
  const targetIdentity = stringFlag(flags, 'target');
  const ownerId = stringFlag(flags, 'owner');
  const nowMs = resolveNow(flags, deps);
  const now = new Date(nowMs);

  const built = await buildTargetObservation(flags, deps, 'status');
  if (built.refusal) {
    return blockedReceipt([built.refusal], targetIdentity);
  }

  const verified = verifyTestlabTarget(built.observation, { intent: 'read' });
  if (!verified.ok) {
    return blockedReceipt(verified.refusals, targetIdentity);
  }

  const suiteId = stringFlag(flags, 'suite');
  const expectedApproval =
    stringFlag(flags, 'approval') ??
    (suiteId ? buildTestlabSuiteApprovalIdentity(suiteId) : null);

  if (!ownerId) {
    return blockedReceipt(
      [{ id: 'missing-owner', message: '--owner is required for status.' }],
      targetIdentity,
    );
  }

  if (typeof deps.queryReadOnly !== 'function') {
    return blockedReceipt(
      [
        {
          id: 'missing-read-query',
          message: 'status requires an injected read-only query hook.',
        },
      ],
      targetIdentity,
    );
  }

  const grantRows = await deps.queryReadOnly(GRANTS_FOR_OWNER_SQL, [ownerId]);
  /** @type {Record<string, unknown>[]} */
  const rows = grantRows.rows;

  const activeRows = rows.filter((row) => isActiveAdmissibleRow(row, now));

  /** @type {Record<string, unknown> | null} */
  let matched = null;
  if (expectedApproval) {
    matched =
      activeRows.find(
        (row) => String(row.approval_identity ?? '') === expectedApproval,
      ) ?? null;
  } else if (activeRows.length === 1) {
    matched = activeRows[0];
  }

  if (activeRows.length > 0 && expectedApproval && !matched) {
    return blockedReceipt(
      [
        {
          id: 'foreign-suite-grant',
          message:
            'Owner has an active grant for a different approval identity.',
        },
      ],
      targetIdentity,
    );
  }

  if (activeRows.length > 1 && !expectedApproval) {
    return blockedReceipt(
      [
        {
          id: 'ambiguous-grant',
          message: 'Multiple active grants; supply --suite or --approval.',
        },
      ],
      targetIdentity,
    );
  }

  if (!matched) {
    return Object.freeze({
      outcome: 'blocked',
      targetIdentity: verified.target,
      ready: false,
      refusals: Object.freeze([
        {
          id: 'missing-active-grant',
          message: 'No active admissible grant for this owner and suite.',
        },
      ]),
    });
  }

  const expiresAt = matched.expires_at;
  const expiresAtMs =
    expiresAt instanceof Date
      ? expiresAt.getTime()
      : typeof expiresAt === 'string'
        ? Date.parse(expiresAt)
        : null;

  return Object.freeze({
    outcome: 'reused',
    targetIdentity: verified.target,
    ready: true,
    ownerId,
    suiteId: suiteId ?? null,
    fundingId: String(matched.account_id),
    runId: String(matched.run_id),
    grantId: String(matched.grant_id),
    expiresAtMs,
  });
}

/**
 * @param {Record<string, string | boolean>} flags
 * @param {TestlabFundingDeps} deps
 */
export async function runTestlabFundingEnsure(flags, deps = {}) {
  const logError =
    deps.logError ??
    ((message) => {
      console.error(redactSecrets(message));
    });

  const targetIdentity = stringFlag(flags, 'target');
  const ownerId = stringFlag(flags, 'owner');
  const suiteId = stringFlag(flags, 'suite');
  const approvalIdentity = stringFlag(flags, 'approval');
  const operatorId = stringFlag(flags, 'operator');
  const now = resolveNow(flags, deps);

  try {
    if (targetIdentity === 'kind-offscreen-lab') {
      if (!ownerId || !suiteId || !approvalIdentity) {
        return blockedReceipt(
          [
            {
              id: 'missing-kind-fields',
              message:
                'kind-offscreen-lab ensure requires --owner, --suite, and --approval.',
            },
          ],
          targetIdentity,
        );
      }
    }

    const built = await buildTargetObservation(flags, deps, 'ensure');
    if (built.refusal) {
      return blockedReceipt([built.refusal], targetIdentity);
    }

    const verified = verifyTestlabTarget(built.observation, { intent: 'write' });
    if (!verified.ok) {
      return blockedReceipt(verified.refusals, targetIdentity);
    }

    if (!ownerId || !suiteId) {
      return blockedReceipt(
        [
          {
            id: 'missing-owner-or-suite',
            message: 'ensure requires --owner and --suite.',
          },
        ],
        targetIdentity,
      );
    }

    if (!deps.grantStore) {
      return blockedReceipt(
        [
          {
            id: 'missing-grant-store',
            message: 'ensure requires an injected grant store dependency.',
          },
        ],
        targetIdentity,
      );
    }

    const ensureInput = {
      ownerId,
      suiteId,
      targetIdentity: verified.target,
      now,
      ...(operatorId ? { operatorId } : {}),
      ...(approvalIdentity ? { approvalIdentity } : {}),
    };

    const result = await ensureTestlabGrant(deps.grantStore, ensureInput);
    const plan = planTestlabGrant({
      ...ensureInput,
      operatorId: ensureInput.operatorId ?? operatorId ?? '',
      approvalIdentity:
        ensureInput.approvalIdentity ??
        buildTestlabSuiteApprovalIdentity(suiteId),
    });

    const expiresAtMs =
      plan.ok === true
        ? plan.plan.grant.expiresAtMs
        : now + TESTLAB_GRANT_EXPIRY_MS;

    if (!result.ok) {
      const refusals =
        result.refusals ??
        (result.outcome === 'blocked'
          ? [{ id: 'plan-blocked', message: 'Grant plan was blocked.' }]
          : [{ id: 'refused', message: 'Grant ensure was refused.' }]);
      const receipt = blockedReceipt(refusals, verified.target);
      return Object.freeze({
        ...receipt,
        outcome: 'blocked',
      });
    }

    return Object.freeze({
      outcome: result.outcome,
      targetIdentity: verified.target,
      ownerId,
      suiteId,
      fundingId: result.fundingId,
      runId: result.runId,
      grantId: result.grantId,
      expiresAtMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(message);
    return blockedReceipt(
      [{ id: 'internal-error', message: redactSecrets(message) }],
      targetIdentity,
    );
  }
}

/**
 * @param {'plan' | 'status' | 'ensure'} command
 * @param {Record<string, string | boolean>} flags
 * @param {TestlabFundingDeps} [deps]
 */
export async function runTestlabFundingCommand(command, flags, deps = {}) {
  const logError =
    deps.logError ??
    ((message) => {
      console.error(redactSecrets(message));
    });

  try {
    if (command === 'plan') {
      return runTestlabFundingPlan(flags, deps);
    }
    if (command === 'status') {
      return runTestlabFundingStatus(flags, deps);
    }
    if (command === 'ensure') {
      return runTestlabFundingEnsure(flags, deps);
    }
    logError(
      'Usage: testlab-funding.mjs plan|status|ensure --target <disposable|kind-offscreen-lab> [flags]',
    );
    return blockedReceipt(
      [
        {
          id: 'invalid-command',
          message: `Unknown command: ${String(command)}`,
        },
      ],
      stringFlag(flags, 'target'),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(message);
    return blockedReceipt(
      [{ id: 'internal-error', message: redactSecrets(message) }],
      stringFlag(flags, 'target'),
    );
  }
}

/**
 * @param {unknown} receipt
 * @returns {number}
 */
export function serializeTestlabReceipt(receipt) {
  return JSON.stringify(receipt, (_key, value) =>
    typeof value === 'bigint' ? value.toString(10) : value,
  );
}

export function testlabFundingExitCode(receipt) {
  if (receipt && typeof receipt === 'object' && receipt.outcome === 'blocked') {
    return 1;
  }
  if (receipt && typeof receipt === 'object' && receipt.ok === false) {
    return 1;
  }
  return 0;
}

const invokedAsScript =
  process.argv[1] && process.argv[1].endsWith('testlab-funding.mjs');
if (invokedAsScript) {
  const { command, flags } = parseTestlabFundingArgv(process.argv.slice(2));
  const kindOperator =
    (command === 'status' || command === 'ensure') &&
    flags.target === 'kind-offscreen-lab';
  const receipt = kindOperator
    ? await import('./testlab-kind-cli.mjs').then((mod) =>
        mod.runBareKindFunding(command, flags, {
          runStatus: runTestlabFundingStatus,
          runEnsure: runTestlabFundingEnsure,
        }),
      )
    : await runTestlabFundingCommand(
        /** @type {'plan' | 'status' | 'ensure'} */ (command),
        flags,
      );
  console.log(serializeTestlabReceipt(receipt));
  process.exitCode = testlabFundingExitCode(receipt);
}
