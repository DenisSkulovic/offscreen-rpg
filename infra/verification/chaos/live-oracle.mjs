/**
 * Live-game oracle adapter (K8S10 T03). Wraps readOnlyOracle; never throws on fail.
 */

import { assertOraclePass, readOnlyOracle } from './oracle.mjs';

export const LIVE_ORACLE_SCHEMA = 'offscreen.chaos-live-oracle.v1';

/** @typedef {import('./oracle.mjs').OracleAssertions} OracleAssertions */
/** @typedef {import('./oracle.mjs').SqlSnapshot} SqlSnapshot */

/**
 * @param {SqlSnapshot} sql
 * @param {string[]} [frozenOperationIds]
 * @returns {string[]}
 */
export function detectDuplicateAppliedEffects(sql, frozenOperationIds = []) {
  /** @type {string[]} */
  const violations = [];
  const operations = sql.operations ?? [];
  const passages = sql.passages ?? [];

  /** @type {Map<string, number>} */
  const committedById = new Map();
  for (const op of operations) {
    if (op.status !== 'committed') {
      continue;
    }
    const count = (committedById.get(op.id) ?? 0) + 1;
    committedById.set(op.id, count);
    if (count > 1) {
      violations.push('duplicate_committed_operation');
    }
  }

  for (const operationId of frozenOperationIds) {
    if ((committedById.get(operationId) ?? 0) > 1) {
      violations.push('duplicate_applied_effect_for_operation');
    }
    const passageCount = passages.filter(
      (p) => p.operationId === operationId,
    ).length;
    if (passageCount > 1) {
      violations.push('duplicate_passage_for_operation');
    }
  }

  return [...new Set(violations)];
}

/**
 * @param {{
 *   status?: string,
 *   reason?: string,
 *   evidence?: {
 *     sql: SqlSnapshot,
 *     store: import('./oracle.mjs').StoreSnapshot,
 *     http?: import('./oracle.mjs').HttpViewSnapshot,
 *     telemetry?: import('./oracle.mjs').TelemetrySnapshot,
 *   } | null,
 *   assertions?: OracleAssertions,
 *   sql?: SqlSnapshot,
 *   store?: import('./oracle.mjs').StoreSnapshot,
 *   http?: import('./oracle.mjs').HttpViewSnapshot,
 *   telemetry?: import('./oracle.mjs').TelemetrySnapshot,
 *   assertionsInput?: OracleAssertions,
 * }} evidenceOrDriverResult
 */
export function assessLiveGameOracle(evidenceOrDriverResult) {
  if (evidenceOrDriverResult?.status === 'BLOCKED') {
    return {
      schema: LIVE_ORACLE_SCHEMA,
      pass: false,
      violations: ['live-adapters-missing'],
    };
  }

  const evidence =
    evidenceOrDriverResult?.evidence ??
    (evidenceOrDriverResult?.sql
      ? {
          sql: evidenceOrDriverResult.sql,
          store: evidenceOrDriverResult.store ?? {},
          http: evidenceOrDriverResult.http,
          telemetry: evidenceOrDriverResult.telemetry,
        }
      : null);

  const assertions =
    evidenceOrDriverResult?.assertions ??
    evidenceOrDriverResult?.assertionsInput;

  if (!evidence?.sql || !assertions) {
    return {
      schema: LIVE_ORACLE_SCHEMA,
      pass: false,
      violations: ['live_evidence_incomplete'],
    };
  }

  const extraViolations = detectDuplicateAppliedEffects(
    evidence.sql,
    assertions.frozenOperationIds,
  );

  const oracleResult = readOnlyOracle({
    assertions,
    sql: evidence.sql,
    store: evidence.store ?? {},
    http: evidence.http,
    telemetry: evidence.telemetry,
  });

  const violations = [
    ...new Set([...extraViolations, ...oracleResult.violations]),
  ];
  const pass = violations.length === 0 && oracleResult.status === 'pass';

  if (pass) {
    assertOraclePass(oracleResult);
  }

  return {
    schema: LIVE_ORACLE_SCHEMA,
    pass,
    violations,
    oracle: oracleResult,
  };
}
