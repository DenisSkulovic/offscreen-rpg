import {
  assertNoFakePass,
  buildBlockedPreflightReport,
  buildRecoveryNegativeMatrixEvidence,
  computeTurn03DistributedPocProofOverall,
  createEmptyTurn03DistributedPocProofReport,
  deriveRecoveryNegativeMatrixGateStatus,
  normalizeTurn03NegativeMatrix,
  TURN03_MANDATORY_GATE_IDS,
  TURN03_NEGATIVE_MATRIX_CASE_IDS,
} from './report.mjs';

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function pickString(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * @param {unknown} body
 * @param {string[]} keys
 * @returns {string | null}
 */
function pickFromBody(body, keys) {
  if (body == null || typeof body !== 'object') {
    return null;
  }
  /** @type {Record<string, unknown>} */
  const record = /** @type {Record<string, unknown>} */ (body);
  for (const key of keys) {
    const direct = pickString(record[key]);
    if (direct != null) {
      return direct;
    }
  }
  for (const key of keys) {
    const nested = record[key];
    if (nested != null && typeof nested === 'object') {
      /** @type {Record<string, unknown>} */
      const nestedRecord = /** @type {Record<string, unknown>} */ (nested);
      for (const nestedKey of ['id', 'hash', 'rootHash', 'checkpointHash', 'checkpointId']) {
        const found = pickString(nestedRecord[nestedKey]);
        if (found != null) {
          return found;
        }
      }
    }
  }
  return null;
}

/**
 * @param {{ method: string, path: string, body?: unknown }} call
 */
function mockGateEvidence(call) {
  return {
    tier: 'local',
    mocked: true,
    incomplete: true,
    summary: `Scripted local HTTP trace only: ${call.method} ${call.path}`,
  };
}

/**
 * @param {import('./report.mjs').Turn03DistributedPocProofReport} report
 * @param {string} gateId
 * @param {'NOT-RUN' | 'BLOCKED' | 'FAIL'} status
 * @param {object | null} evidence
 */
function setGate(report, gateId, status, evidence) {
  report.gates = report.gates.map((gate) =>
    gate.id === gateId ? { id: gate.id, status, evidence } : gate,
  );
}

/**
 * @param {import('./report.mjs').Turn03DistributedPocProofReport} report
 * @param {Record<string, 'PASS' | 'FAIL' | 'NOT-RUN'>} matrix
 */
function applyRecoveryNegativeMatrix(report, matrix) {
  const gateStatus = deriveRecoveryNegativeMatrixGateStatus(matrix);
  const summary =
    gateStatus === 'FAIL'
      ? 'Scripted negative matrix recorded at least one FAIL case'
      : 'Scripted local negative matrix; cross-pod proof not claimed';
  setGate(
    report,
    'recovery-negative-matrix',
    gateStatus,
    buildRecoveryNegativeMatrixEvidence(matrix, summary),
  );
}

/**
 * @param {import('./report.mjs').Turn03DistributedPocProofReport} report
 */
function applyNotRunNegativeMatrix(report) {
  const matrix = normalizeTurn03NegativeMatrix(null);
  applyRecoveryNegativeMatrix(report, matrix);
}

/**
 * @param {unknown} probeResult
 * @returns {Promise<Record<string, 'PASS' | 'FAIL' | 'NOT-RUN'>>}
 */
async function resolveNegativeMatrixProbe(probeResult) {
  const resolved = await probeResult;
  return normalizeTurn03NegativeMatrix(
    resolved == null || typeof resolved !== 'object'
      ? null
      : /** @type {Record<string, 'PASS' | 'FAIL' | 'NOT-RUN'>} */ (resolved),
  );
}

/**
 * @param {Awaited<ReturnType<import('./preflight.mjs').runTurn03Preflight>>} preflight
 */
function isPreflightBlocked(preflight) {
  const oauthMissing =
    preflight.missing.includes('oauthEnv') || !preflight.checks.oauthEnvPresent;
  return preflight.missing.length > 0 || oauthMissing;
}

/**
 * @param {{
 *   preflight: Awaited<ReturnType<import('./preflight.mjs').runTurn03Preflight>>,
 *   http?: (method: string, path: string, body?: unknown) => Promise<unknown>,
 *   runDisposableKind?: boolean,
 *   sourceSha?: string | null,
 *   imageDigests?: Record<string, string>,
 *   negativeMatrixProbe?: (
 *     ctx: {
 *       report: import('./report.mjs').Turn03DistributedPocProofReport,
 *       caseIds: readonly string[],
 *     },
 *   ) =>
 *     | Record<string, 'PASS' | 'FAIL' | 'NOT-RUN'>
 *     | Promise<Record<string, 'PASS' | 'FAIL' | 'NOT-RUN'>>,
 * }} options
 * @returns {Promise<import('./report.mjs').Turn03DistributedPocProofReport>}
 */
export async function runTurn03ColdTrace(options) {
  const { preflight, http, runDisposableKind = false, negativeMatrixProbe } =
    options;

  if (runDisposableKind !== true) {
    if (isPreflightBlocked(preflight)) {
      return buildBlockedPreflightReport(preflight);
    }
    const report = createEmptyTurn03DistributedPocProofReport();
    report.sourceSha = preflight.sourceSha ?? options.sourceSha ?? null;
    report.imageDigests = {
      ...preflight.imageDigests,
      ...(options.imageDigests ?? {}),
    };
    applyNotRunNegativeMatrix(report);
    report.overall = computeTurn03DistributedPocProofOverall(report.gates);
    assertNoFakePass(report);
    return report;
  }

  if (isPreflightBlocked(preflight)) {
    return buildBlockedPreflightReport(preflight);
  }

  if (typeof http !== 'function') {
    const report = createEmptyTurn03DistributedPocProofReport();
    report.sourceSha = preflight.sourceSha ?? options.sourceSha ?? null;
    report.imageDigests = {
      ...preflight.imageDigests,
      ...(options.imageDigests ?? {}),
    };
    applyNotRunNegativeMatrix(report);
    report.overall = computeTurn03DistributedPocProofOverall(report.gates);
    assertNoFakePass(report);
    return report;
  }

  const report = createEmptyTurn03DistributedPocProofReport();
  report.sourceSha = preflight.sourceSha ?? options.sourceSha ?? null;
  report.imageDigests = {
    ...preflight.imageDigests,
    ...(options.imageDigests ?? {}),
  };

  /** @type {Array<{ method: string, path: string, body?: unknown }>} */
  const sequence = [];

  /**
   * @param {string} method
   * @param {string} path
   * @param {unknown} [body]
   */
  async function request(method, path, body) {
    const call = body === undefined ? { method, path } : { method, path, body };
    sequence.push(call);
    return http(method, path, body);
  }

  const created = await request('POST', '/stories', {});
  const storyId = pickFromBody(created, ['storyId', 'id']);
  report.trace.storyId = storyId;

  if (storyId == null) {
    applyNotRunNegativeMatrix(report);
    report.overall = computeTurn03DistributedPocProofOverall(report.gates);
    assertNoFakePass(report);
    return report;
  }

  const started = await request('POST', `/stories/${storyId}/candidates/start`, {});
  report.trace.candidateId = pickFromBody(started, ['candidateId', 'id']);
  report.trace.generationId = pickFromBody(started, ['generationId']);

  const scene1 = await request('GET', `/stories/${storyId}/scenes/1`);
  report.trace.scene1Checkpoint = pickFromBody(scene1, [
    'scene1Checkpoint',
    'checkpointId',
    'checkpointHash',
    'checkpoint',
  ]);
  report.trace.passage1 = pickFromBody(scene1, ['passage1', 'passageId', 'passage']);
  report.trace.scene1Root = pickFromBody(scene1, ['scene1Root', 'rootHash', 'canonRootHash', 'root']);

  const command = await request('POST', `/stories/${storyId}/commands`, {});
  const commandId = pickFromBody(command, ['commandId', 'id', 'operationId']);
  report.trace.attemptId = pickFromBody(command, ['attemptId']);

  if (commandId != null) {
    const outbox = await request('GET', `/executor/outbox/${commandId}`);
    report.trace.workflowId = pickFromBody(outbox, ['workflowId', 'id']);
  }

  await request('POST', '/game-authority/scenes/2/commit', { storyId });
  await request('GET', `/stories/${storyId}/events`);
  const scene2 = await request('GET', `/stories/${storyId}/scenes/2`);
  report.trace.scene2Checkpoint = pickFromBody(scene2, [
    'scene2Checkpoint',
    'checkpointId',
    'checkpointHash',
    'checkpoint',
  ]);
  report.trace.passage2 = pickFromBody(scene2, ['passage2', 'passageId', 'passage']);
  report.trace.scene2Root = pickFromBody(scene2, ['scene2Root', 'rootHash', 'canonRootHash', 'root']);

  const forkBody = {
    fromSceneSequence: 1,
    scene1Checkpoint: report.trace.scene1Checkpoint,
  };
  const forked = await request('POST', `/stories/${storyId}/forks`, forkBody);
  const forkStoryId = pickFromBody(forked, ['forkStoryId', 'storyId', 'id']);
  report.trace.forkRoot = pickFromBody(forked, ['forkRoot', 'rootHash', 'branchRoot', 'root']);

  let parentFuture = pickFromBody(scene2, ['future', 'futureRoot', 'continuationRoot']);
  let forkFuture = null;
  if (forkStoryId != null) {
    const forkFutureResp = await request('GET', `/stories/${forkStoryId}/future`);
    forkFuture = pickFromBody(forkFutureResp, ['future', 'futureRoot', 'continuationRoot']);
  }
  if (parentFuture == null) {
    const parentFutureResp = await request('GET', `/stories/${storyId}/future`);
    parentFuture = pickFromBody(parentFutureResp, ['future', 'futureRoot', 'continuationRoot']);
  }

  const forkProofPresent =
    report.trace.scene1Checkpoint != null &&
    report.trace.forkRoot != null &&
    parentFuture != null &&
    forkFuture != null &&
    parentFuture !== forkFuture;

  for (const gateId of TURN03_MANDATORY_GATE_IDS) {
    const call = sequence[Math.min(sequence.length - 1, 0)] ?? {
      method: 'SCRIPT',
      path: 'turn03-local-trace',
    };
    const evidence = mockGateEvidence(call);
    if (gateId === 'historical-fork-independent-continuation') {
      setGate(
        report,
        gateId,
        forkProofPresent ? 'NOT-RUN' : 'FAIL',
        {
          ...evidence,
          summary: forkProofPresent
            ? 'Local mocked trace mapped fork fields; cross-pod proof not claimed'
            : 'Historical fork proof absent or contradictory (checkpoint, fork root, or divergent future)',
        },
      );
      continue;
    }
    setGate(report, gateId, 'NOT-RUN', evidence);
  }

  const matrix =
    typeof negativeMatrixProbe === 'function'
      ? await resolveNegativeMatrixProbe(
          negativeMatrixProbe({
            report,
            caseIds: TURN03_NEGATIVE_MATRIX_CASE_IDS,
          }),
        )
      : normalizeTurn03NegativeMatrix(null);
  applyRecoveryNegativeMatrix(report, matrix);

  report.overall = computeTurn03DistributedPocProofOverall(report.gates);
  assertNoFakePass(report);
  return report;
}