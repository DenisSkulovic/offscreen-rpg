/**
 * OBS00-L: local Story-mode funding bootstrap.
 *
 * Funding rows are financial evidence. A launcher restart may create missing
 * rows under the explicit launch policy, but must never clear `stopped`, set a
 * disabled run back to enabled, reset counters, or widen a saved run's cap.
 * Dispatch admission stays in `budget.reserve`/`budget.dispatch`; this module
 * only decides whether the local launcher may start provider-capable Story mode.
 */

import type { EffectiveUsagePolicy } from '@offscreen/contracts/usage-policy';

export type SqlClient = {
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }>;
};

export type StoryFundingDenial =
  | 'account-stopped'
  | 'run-disabled'
  | 'uncertain-attempt'
  | 'run-account-mismatch'
  | 'trial-cap-mismatch'
  | 'attempts-exhausted'
  | 'funds-exhausted';

export type StoryTrialCap = {
  runId: string;
  maxMicrousd: bigint;
  maxAttempts: number;
};

export type StoryFundingBootstrapInput = {
  accountId: string;
  /** Pre-OBS00-L local run; used only when no trial is requested. */
  defaultRunId: string;
  accountLimitMicrousd: bigint;
  defaultRunLimitMicrousd: bigint;
  defaultRunMaxAttempts: number;
  trial: StoryTrialCap | null;
  verifiedAt: string;
};

export type StoryFundingSnapshot = {
  runId: string;
  accountStopped: boolean;
  accountLimitMicrousd: string;
  accountSettledMicrousd: string;
  accountReservedMicrousd: string;
  runEnabled: boolean;
  runLimitMicrousd: string;
  runSettledMicrousd: string;
  runReservedMicrousd: string;
  runMaxAttempts: number;
  runAdmittedAttempts: number;
};

export type StoryFundingBootstrapResult =
  | { state: 'ready'; runId: string; snapshot: StoryFundingSnapshot }
  | {
      state: 'denied';
      runId: string;
      reasons: StoryFundingDenial[];
      snapshot: StoryFundingSnapshot | null;
    };

const DENIAL_TEXT: Record<StoryFundingDenial, string> = {
  'account-stopped':
    'the local funding account is stopped and a restart never clears a stop',
  'run-disabled':
    'the local Story run is disabled and a restart never re-enables it',
  'uncertain-attempt':
    'a provider attempt is uncertain and its liability is preserved',
  'run-account-mismatch':
    'the saved run belongs to a different funding account',
  'trial-cap-mismatch':
    'the saved trial run has a different cap; mint a new trial only with an explicit new --story-trial-id and owner authorization',
  'attempts-exhausted': 'the saved run has no remaining provider attempts',
  'funds-exhausted': 'the saved run or account has no remaining budget',
};

/** Safe operator message: reason codes and fixed text only. No credentials or payloads. */
export function describeStoryFundingDenial(
  reasons: readonly StoryFundingDenial[],
) {
  return `Local Story mode will not start live: ${reasons
    .map((reason) => DENIAL_TEXT[reason])
    .join(
      '; ',
    )}. Recovery is a separate audited owner procedure, not a launcher restart.`;
}

/**
 * Startup-pinned server-owned local authority. It is not a per-dispatch re-read
 * of a mutable entitlement and is not OBS00-B. `retainsCapturedAuthority` still
 * requires the task's captured policy to equal this pinned policy, and
 * `budget.dispatch` still denies a stopped account or disabled run.
 */
export function pinnedLocalStoryDispatchAuthority(
  policy: EffectiveUsagePolicy,
): () => EffectiveUsagePolicy {
  return () => policy;
}

function big(value: unknown) {
  return BigInt(String(value));
}

export async function bootstrapLocalStoryFunding(
  client: SqlClient,
  input: StoryFundingBootstrapInput,
): Promise<StoryFundingBootstrapResult> {
  const runId = input.trial?.runId ?? input.defaultRunId;
  // New rows only. Existing `stopped`, `enabled`, caps and counters are left as saved.
  await client.query(
    `INSERT INTO storyteller_funding (id, limit_microusd, stopped, verified_at)
     VALUES ($1, $2, false, $3)
     ON CONFLICT (id) DO UPDATE SET verified_at = EXCLUDED.verified_at`,
    [input.accountId, input.accountLimitMicrousd.toString(), input.verifiedAt],
  );
  await client.query(
    `INSERT INTO storyteller_run (id, account_id, limit_microusd, max_attempts, enabled)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (id) DO NOTHING`,
    [
      runId,
      input.accountId,
      (input.trial?.maxMicrousd ?? input.defaultRunLimitMicrousd).toString(),
      input.trial?.maxAttempts ?? input.defaultRunMaxAttempts,
    ],
  );
  // The disposable Story-mode ledger can outlive a development process. Keep
  // aggregate reservations equal to actual unresolved transport liability
  // (reserved, dispatched and uncertain attempts all stay counted).
  await client.query(
    `UPDATE storyteller_funding
     SET reserved_microusd = COALESCE((
       SELECT sum(a.reserved_microusd)
       FROM storyteller_attempt a
       WHERE a.account_id = $1
         AND a.state IN ('reserved', 'dispatched', 'uncertain')
     ), 0)
     WHERE id = $1`,
    [input.accountId],
  );
  await client.query(
    `UPDATE storyteller_run
     SET reserved_microusd = COALESCE((
       SELECT sum(a.reserved_microusd)
       FROM storyteller_attempt a
       WHERE a.run_id = $1
         AND a.state IN ('reserved', 'dispatched', 'uncertain')
     ), 0)
     WHERE id = $1`,
    [runId],
  );
  const read = await client.query(
    `SELECT f.stopped AS account_stopped, f.limit_microusd AS account_limit,
            f.settled_microusd AS account_settled, f.reserved_microusd AS account_reserved,
            r.account_id AS run_account_id, r.enabled AS run_enabled,
            r.limit_microusd AS run_limit, r.settled_microusd AS run_settled,
            r.reserved_microusd AS run_reserved, r.max_attempts AS run_max_attempts,
            r.admitted_attempts AS run_admitted_attempts,
            EXISTS (SELECT 1 FROM storyteller_attempt WHERE state = 'uncertain') AS has_uncertain
     FROM storyteller_funding f, storyteller_run r
     WHERE f.id = $1 AND r.id = $2`,
    [input.accountId, runId],
  );
  const row = read.rows[0];
  if (!row) {
    return {
      state: 'denied',
      runId,
      reasons: ['run-account-mismatch'],
      snapshot: null,
    };
  }
  const snapshot: StoryFundingSnapshot = {
    runId,
    accountStopped: row['account_stopped'] === true,
    accountLimitMicrousd: String(row['account_limit']),
    accountSettledMicrousd: String(row['account_settled']),
    accountReservedMicrousd: String(row['account_reserved']),
    runEnabled: row['run_enabled'] === true,
    runLimitMicrousd: String(row['run_limit']),
    runSettledMicrousd: String(row['run_settled']),
    runReservedMicrousd: String(row['run_reserved']),
    runMaxAttempts: Number(row['run_max_attempts']),
    runAdmittedAttempts: Number(row['run_admitted_attempts']),
  };
  const reasons: StoryFundingDenial[] = [];
  if (row['run_account_id'] !== input.accountId) {
    reasons.push('run-account-mismatch');
  }
  if (snapshot.accountStopped) reasons.push('account-stopped');
  if (!snapshot.runEnabled) reasons.push('run-disabled');
  if (row['has_uncertain'] === true) reasons.push('uncertain-attempt');
  if (
    input.trial &&
    (big(snapshot.runLimitMicrousd) !== input.trial.maxMicrousd ||
      snapshot.runMaxAttempts !== input.trial.maxAttempts)
  ) {
    reasons.push('trial-cap-mismatch');
  }
  if (snapshot.runAdmittedAttempts >= snapshot.runMaxAttempts) {
    reasons.push('attempts-exhausted');
  }
  const runRemaining =
    big(snapshot.runLimitMicrousd) -
    big(snapshot.runSettledMicrousd) -
    big(snapshot.runReservedMicrousd);
  const accountRemaining =
    big(snapshot.accountLimitMicrousd) -
    big(snapshot.accountSettledMicrousd) -
    big(snapshot.accountReservedMicrousd);
  if (runRemaining <= 0n || accountRemaining <= 0n) {
    reasons.push('funds-exhausted');
  }
  return reasons.length
    ? { state: 'denied', runId, reasons, snapshot }
    : { state: 'ready', runId, snapshot };
}
