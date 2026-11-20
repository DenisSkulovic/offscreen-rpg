/**
 * Read-only chaos game oracle. Side-effect-free; never opens real DB/S3/HTTP.
 * Callers supply normalized SQL, store, HTTP view, and telemetry snapshots.
 */

export const ORACLE_SCHEMA = 'offscreen.chaos-oracle.v1';

/** @typedef {'pass' | 'fail'} OracleStatus */

/**
 * @typedef {{
 *   runId?: string,
 *   storyId: string,
 *   ownerId: string,
 *   frozenOperationIds?: string[],
 *   expectedRevision?: number,
 *   expectedRootHash?: string | null,
 *   expectedRootRevision?: number,
 *   expectedCheckpointHashes?: string[],
 *   executionMode?: 'scripted',
 *   modelDispatchAttempts?: number,
 *   forbiddenProviderInvoked?: boolean,
 *   parentFuturePassageIds?: string[],
 *   childPassageIds?: string[],
 * }} OracleAssertions
 */

/**
 * @typedef {{
 *   revision: number,
 *   rootHash: string | null,
 *   rootRevision: number,
 * }} SqlStoryRow
 */

/**
 * @typedef {{
 *   id: string,
 *   operationId: string,
 *   storyId: string,
 *   checkpointHash?: string | null,
 *   canonRootHash?: string | null,
 *   canonRootRevision?: number,
 * }} SqlPassageRow
 */

/**
 * @typedef {{
 *   id: string,
 *   storyId: string,
 *   revision: number,
 *   status: string,
 * }} SqlOperationRow
 */

/**
 * @typedef {{
 *   story?: SqlStoryRow,
 *   passages?: SqlPassageRow[],
 *   operations?: SqlOperationRow[],
 * }} SqlSnapshot
 */

/**
 * @typedef {Record<string, { revision: number, campaignId?: string }>} StoreRootIndex
 */

/**
 * @typedef {Record<string, unknown>} StoreCheckpointIndex
 */

/**
 * @typedef {{
 *   roots?: StoreRootIndex,
 *   checkpoints?: StoreCheckpointIndex,
 * }} StoreSnapshot
 */

/**
 * @typedef {{
 *   revision?: number,
 *   storyId?: string,
 *   ownerId?: string,
 *   passageIds?: string[],
 *   etag?: string,
 * }} HttpViewSnapshot
 */

/**
 * @typedef {{
 *   modelDispatchAttempts?: number,
 *   forbiddenProviderInvoked?: boolean,
 *   billableUsageRecords?: number,
 *   openRouterSecretMounted?: boolean,
 * }} TelemetrySnapshot
 */

/**
 * @typedef {{
 *   schema: string,
 *   status: OracleStatus,
 *   violations: string[],
 *   checks: Record<string, boolean>,
 * }} OracleResult
 */

/**
 * @param {Record<string, unknown>} store
 * @param {string | null | undefined} hash
 */
function rootPresent(store, hash) {
  if (hash == null) return true;
  return Object.prototype.hasOwnProperty.call(store.roots ?? {}, hash);
}

/**
 * @param {OracleAssertions} assertions
 * @param {SqlSnapshot} sql
 * @param {StoreSnapshot} store
 * @param {HttpViewSnapshot} [http]
 * @param {TelemetrySnapshot} [telemetry]
 * @returns {OracleResult}
 */
export function readOnlyOracle({
  assertions,
  sql,
  store,
  http,
  telemetry,
}) {
  /** @type {string[]} */
  const violations = [];
  /** @type {Record<string, boolean>} */
  const checks = {};

  const passages = sql.passages ?? [];
  const operations = sql.operations ?? [];
  const story = sql.story;

  const dispatchAttempts =
    telemetry?.modelDispatchAttempts ?? assertions.modelDispatchAttempts ?? 0;
  checks.zeroProviderDispatch = dispatchAttempts === 0;
  if (dispatchAttempts !== 0) {
    violations.push('model_dispatch_attempts_nonzero');
  }

  const forbiddenInvoked =
    telemetry?.forbiddenProviderInvoked === true ||
    assertions.forbiddenProviderInvoked === true;
  checks.forbiddenProviderUntouched = !forbiddenInvoked;
  if (forbiddenInvoked) {
    violations.push('forbidden_provider_invoked');
  }

  const billable =
    telemetry?.billableUsageRecords ??
    (telemetry?.openRouterSecretMounted ? 1 : 0);
  checks.noBillableUsage = billable === 0;
  if (billable !== 0) {
    violations.push('billable_usage_present');
  }

  const executionMode = assertions.executionMode ?? 'scripted';
  checks.scriptedExecution = executionMode === 'scripted';
  if (executionMode !== 'scripted') {
    violations.push('execution_mode_not_scripted');
  }

  /** @type {Map<string, number>} */
  const byOperation = new Map();
  /** @type {Set<string>} */
  const passageIds = new Set();
  for (const row of passages) {
    if (passageIds.has(row.id)) {
      violations.push('duplicate_passage_id');
    }
    passageIds.add(row.id);
    const count = (byOperation.get(row.operationId) ?? 0) + 1;
    byOperation.set(row.operationId, count);
    if (count > 1) {
      violations.push('duplicate_passage_for_operation');
    }
    if (row.storyId !== assertions.storyId) {
      violations.push('passage_story_mismatch');
    }
  }
  checks.uniqueOperationPassages = !violations.some((v) =>
    v.startsWith('duplicate_'),
  );

  for (const operationId of assertions.frozenOperationIds ?? []) {
    const match = passages.filter((p) => p.operationId === operationId);
    if (match.length > 1) {
      violations.push('frozen_operation_duplicate_effect');
    }
  }
  checks.frozenOperationSingleton =
    !violations.includes('frozen_operation_duplicate_effect');

  if (story && assertions.expectedRevision != null) {
    checks.expectedRevision = story.revision === assertions.expectedRevision;
    if (story.revision !== assertions.expectedRevision) {
      violations.push('story_revision_mismatch');
    }
  }

  if (story && assertions.expectedRootHash !== undefined) {
    checks.expectedRootHash = story.rootHash === assertions.expectedRootHash;
    if (story.rootHash !== assertions.expectedRootHash) {
      violations.push('story_root_hash_mismatch');
    }
  }

  if (story && assertions.expectedRootRevision != null) {
    checks.expectedRootRevision =
      story.rootRevision === assertions.expectedRootRevision;
    if (story.rootRevision !== assertions.expectedRootRevision) {
      violations.push('story_root_revision_mismatch');
    }
  }

  if (story?.rootHash != null) {
    const root = store.roots?.[story.rootHash];
    checks.rootObjectPresent = root != null;
    if (root == null) {
      violations.push('missing_canon_root_object');
    } else if (root.revision !== story.rootRevision) {
      violations.push('invalid_root_revision');
    }
  }

  for (const hash of assertions.expectedCheckpointHashes ?? []) {
    const object = store.checkpoints?.[hash];
    checks[`checkpoint_${hash}`] = object != null;
    if (object == null) {
      violations.push('missing_checkpoint_object');
      break;
    }
  }

  for (const row of passages) {
    if (!row.checkpointHash) continue;
    const stored = store.checkpoints?.[row.checkpointHash];
    if (stored == null) {
      violations.push('passage_checkpoint_missing');
      continue;
    }
    if (row.canonRootHash != null && !rootPresent(store, row.canonRootHash)) {
      violations.push('passage_canon_root_missing');
    }
  }

  if (http?.revision != null && story) {
    checks.httpViewRevisionAligned = http.revision === story.revision;
    if (http.revision !== story.revision) {
      violations.push('http_view_revision_stale');
    }
  }

  if (http?.ownerId != null) {
    checks.httpOwnerScoped = http.ownerId === assertions.ownerId;
    if (http.ownerId !== assertions.ownerId) {
      violations.push('http_view_owner_mismatch');
    }
  }

  const parentFuture = new Set(assertions.parentFuturePassageIds ?? []);
  const childIds = assertions.childPassageIds ?? http?.passageIds ?? [];
  const leaked = childIds.filter((id) => parentFuture.has(id));
  checks.noBranchLeak = leaked.length === 0;
  if (leaked.length > 0) {
    violations.push('branch_leak_parent_future');
  }

  for (const op of operations) {
    if (op.storyId !== assertions.storyId) {
      violations.push('operation_story_mismatch');
    }
  }

  const uniqueViolations = [...new Set(violations)];
  return {
    schema: ORACLE_SCHEMA,
    status: uniqueViolations.length === 0 ? 'pass' : 'fail',
    violations: uniqueViolations,
    checks,
  };
}

/**
 * @param {OracleResult} result
 */
export function assertOraclePass(result) {
  if (result.status !== 'pass') {
    throw new Error(
      `Oracle failed: ${result.violations.join(', ') || 'unknown'}`,
    );
  }
  return result;
}