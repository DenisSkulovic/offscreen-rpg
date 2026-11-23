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
import {
  assertFrozenIdentity,
  normalizeHttpResult,
  runPublicRouteTrace,
  TraceAbort,
} from './trace-route.mjs';

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
 *   identity?: {
 *     draftId: string,
 *     generationId: string,
 *     storyId: string,
 *     operationId: string,
 *     forkId: string,
 *     sourcePins: Record<string, unknown>,
 *     campaign: Record<string, unknown>,
 *     draft: Record<string, unknown>,
 *   },
 *   poll?: {
 *     maxAttempts?: number,
 *     sleep?: (attempt: number) => Promise<void>,
 *   },
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

  /** @type {{ method: string, path: string } | null} */
  let lastCall = null;
  /** @type {boolean} */
  let forkProofPresent = false;

  try {
    const identity = assertFrozenIdentity(options.identity);
    const maxAttempts = options.poll?.maxAttempts ?? 3;
    const sleep = options.poll?.sleep ?? (async () => {});
    const traced = await runPublicRouteTrace({
      identity,
      maxAttempts,
      sleep,
      request: async (method, path, body) => {
        lastCall = { method, path };
        return normalizeHttpResult(await http(method, path, body));
      },
    });
    report.trace.storyId = identity.storyId;
    report.trace.candidateId = identity.generationId;
    report.trace.generationId = identity.generationId;
    report.trace.passage1 = traced.scene1.passageId;
    report.trace.scene1Checkpoint = traced.scene1.checkpointHash;
    report.trace.scene1Root = traced.scene1.rootHash;
    report.trace.passage2 = traced.scene2.passageId;
    report.trace.scene2Checkpoint = traced.scene2Checkpoint?.checkpointHash ?? null;
    report.trace.scene2Root = traced.scene2Checkpoint?.rootHash ?? null;
    report.trace.forkRoot = traced.forkProved ? traced.scene1.checkpointHash : null;
    forkProofPresent = traced.forkProved;
  } catch (error) {
    const abort =
      error instanceof TraceAbort
        ? error
        : new TraceAbort('FAIL', error instanceof Error ? error.message : 'trace failed');
    const evidence = mockGateEvidence(
      lastCall ?? { method: 'SCRIPT', path: 'turn03-public-trace' },
    );
    for (const gateId of TURN03_MANDATORY_GATE_IDS) {
      setGate(
        report,
        gateId,
        gateId === abort.gateId ? abort.status : 'NOT-RUN',
        { ...evidence, summary: abort.summary },
      );
    }
    applyNotRunNegativeMatrix(report);
    report.overall = computeTurn03DistributedPocProofOverall(report.gates);
    assertNoFakePass(report);
    return report;
  }

  for (const gateId of TURN03_MANDATORY_GATE_IDS) {
    const evidence = mockGateEvidence(
      lastCall ?? { method: 'SCRIPT', path: 'turn03-public-trace' },
    );
    if (gateId === 'historical-fork-independent-continuation') {
      setGate(report, gateId, forkProofPresent ? 'NOT-RUN' : 'FAIL', {
        ...evidence,
        summary: forkProofPresent
          ? 'Local mocked public-route trace mapped the scene-1 fork; cross-pod proof is not claimed'
          : 'Historical fork was not proved from the child lineage and the unchanged parent scene 2',
      });
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