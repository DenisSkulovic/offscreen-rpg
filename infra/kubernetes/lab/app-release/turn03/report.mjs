/** Mirrored from tools/api-integration/test/helpers/turn03-distributed-poc-proof.ts */

export const TURN03_DISTRIBUTED_POC_PROOF_SCHEMA =
  'offscreen.distributed-poc-proof.v1';

export const TURN03_MANDATORY_GATE_IDS = Object.freeze([
  'cluster-real-app',
  'candidate-start',
  'auth-ssr',
  'command-temporal-executor',
  'ga-scene-publication',
  'sse-get',
  'historical-fork-independent-continuation',
  'recovery-negative-matrix',
]);

/** @type {Set<string>} */
export const KIND_CROSS_POD_GATES = new Set([
  'cluster-real-app',
  'command-temporal-executor',
  'ga-scene-publication',
  'sse-get',
  'historical-fork-independent-continuation',
  'recovery-negative-matrix',
]);

/** Ordered negative cases recorded on recovery-negative-matrix gate evidence. */
export const TURN03_NEGATIVE_MATRIX_CASE_IDS = Object.freeze([
  'wrong-actor-cookie-rejected',
  'duplicate-lost-notice-no-double-apply',
  'stale-root-rejected',
  'unavailable-s3-recorded',
  'executor-restart-no-duplicate-effect',
  'delayed-lost-sse-corrected-by-get',
  'source-scoped-fork-excludes-parent-future',
]);

/**
 * @param {Record<string, 'PASS' | 'FAIL' | 'NOT-RUN'> | null | undefined} probeMatrix
 * @returns {Record<string, 'PASS' | 'FAIL' | 'NOT-RUN'>}
 */
export function normalizeTurn03NegativeMatrix(probeMatrix) {
  /** @type {Record<string, 'PASS' | 'FAIL' | 'NOT-RUN'>} */
  const matrix = {};
  for (const caseId of TURN03_NEGATIVE_MATRIX_CASE_IDS) {
    const status = probeMatrix?.[caseId];
    matrix[caseId] =
      status === 'PASS' || status === 'FAIL' || status === 'NOT-RUN'
        ? status
        : 'NOT-RUN';
  }
  return matrix;
}

/**
 * @param {Record<string, 'PASS' | 'FAIL' | 'NOT-RUN'>} matrix
 */
export function deriveRecoveryNegativeMatrixGateStatus(matrix) {
  if (Object.values(matrix).some((status) => status === 'FAIL')) {
    return 'FAIL';
  }
  if (Object.values(matrix).every((status) => status === 'PASS')) {
    return 'NOT-RUN';
  }
  return 'NOT-RUN';
}

/**
 * @param {Record<string, 'PASS' | 'FAIL' | 'NOT-RUN'>} matrix
 * @param {string} summary
 */
export function buildRecoveryNegativeMatrixEvidence(matrix, summary) {
  return {
    tier: 'local',
    mocked: true,
    incomplete: true,
    summary,
    matrix,
  };
}

/**
 * @returns {import('./report.mjs').Turn03DistributedPocProofReport}
 */
export function createEmptyTurn03DistributedPocProofReport() {
  return {
    schema: TURN03_DISTRIBUTED_POC_PROOF_SCHEMA,
    sourceSha: null,
    imageDigests: {},
    providerMode: 'scripted',
    fixture: {
      worldRoot: null,
      rulesRoot: null,
      startRoot: null,
    },
    trace: {
      storyId: null,
      candidateId: null,
      generationId: null,
      workflowId: null,
      attemptId: null,
      passage1: null,
      passage2: null,
      scene1Checkpoint: null,
      scene2Checkpoint: null,
      scene1Root: null,
      scene2Root: null,
      forkRoot: null,
    },
    gates: TURN03_MANDATORY_GATE_IDS.map((id) => ({
      id,
      status: 'NOT-RUN',
      evidence: null,
    })),
    overall: 'NOT-RUN',
  };
}

/**
 * @param {{ id: string, status: string, evidence: object | null }} gate
 */
export function isTurn03GatePassAdmissible(gate) {
  if (gate.status !== 'PASS') {
    return true;
  }
  const evidence = gate.evidence;
  if (evidence == null) {
    return false;
  }
  if (evidence.mocked === true || evidence.incomplete === true) {
    return false;
  }
  if (KIND_CROSS_POD_GATES.has(gate.id)) {
    return evidence.tier === 'kind-cross-pod';
  }
  return true;
}

/**
 * @param {readonly { id: string, status: string, evidence: object | null }[]} gates
 */
export function computeTurn03DistributedPocProofOverall(gates) {
  let sawFail = false;
  let sawBlocked = false;
  let sawNotRun = false;
  let sawInadmissiblePass = false;

  for (const gate of gates) {
    if (gate.status === 'FAIL') {
      sawFail = true;
      continue;
    }
    if (gate.status === 'BLOCKED') {
      sawBlocked = true;
      continue;
    }
    if (gate.status === 'NOT-RUN') {
      sawNotRun = true;
      continue;
    }
    if (gate.status === 'PASS' && !isTurn03GatePassAdmissible(gate)) {
      sawInadmissiblePass = true;
    }
  }

  if (sawFail || sawInadmissiblePass) {
    return 'FAIL';
  }
  if (sawBlocked) {
    return 'BLOCKED';
  }
  if (sawNotRun) {
    return 'NOT-RUN';
  }
  return 'PASS';
}

const CLUSTER_PREREQ_KEYS = new Set([
  'context',
  'cluster',
  'images',
  'gateway',
  'postgresSecret',
  'objectStore',
  'temporal',
]);

/**
 * @param {Awaited<ReturnType<import('./preflight.mjs').runTurn03Preflight>>} preflight
 */
export function buildBlockedPreflightReport(preflight) {
  const report = createEmptyTurn03DistributedPocProofReport();
  report.sourceSha = preflight.sourceSha ?? null;
  report.imageDigests = { ...preflight.imageDigests };

  const oauthMissing = preflight.missing.includes('oauthEnv');
  const clusterMissing = preflight.missing.filter((m) =>
    CLUSTER_PREREQ_KEYS.has(m),
  );

  const gates = report.gates.map((gate) => {
    if (gate.id === 'cluster-real-app' && clusterMissing.length > 0) {
      return {
        id: gate.id,
        status: 'BLOCKED',
        evidence: {
          tier: 'kind-cross-pod',
          mocked: false,
          incomplete: true,
          summary: `Cluster release prerequisites missing: ${clusterMissing.join(', ')}`,
        },
      };
    }
    if (gate.id === 'auth-ssr' && oauthMissing) {
      return {
        id: gate.id,
        status: 'BLOCKED',
        evidence: {
          tier: 'pure',
          mocked: false,
          incomplete: true,
          summary: 'GitHub OAuth env prerequisites missing',
        },
      };
    }
    return { ...gate, status: 'NOT-RUN', evidence: null };
  });

  report.gates = gates;
  report.overall = computeTurn03DistributedPocProofOverall(gates);
  return report;
}

/**
 * @param {ReturnType<typeof createEmptyTurn03DistributedPocProofReport>} report
 */
export function assertNoFakePass(report) {
  for (const gate of report.gates) {
    if (gate.status !== 'PASS') {
      continue;
    }
    if (!isTurn03GatePassAdmissible(gate)) {
      throw new Error(
        `Inadmissible PASS on gate ${gate.id}: evidence must not be mocked, incomplete, missing, or wrong tier for kind-cross-pod gates`,
      );
    }
  }
}

/**
 * @param {ReturnType<typeof createEmptyTurn03DistributedPocProofReport>} report
 */
export function renderReport(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}