import { writeFile } from 'node:fs/promises';
import { z } from 'zod';

/** Machine ledger for TURN03 distributed POC; fields match PROOF.md scorecard. */
export const TURN03_DISTRIBUTED_POC_PROOF_SCHEMA =
  'offscreen.distributed-poc-proof.v1' as const;

export const TURN03_MANDATORY_GATE_IDS = [
  'cluster-real-app',
  'candidate-start',
  'auth-ssr',
  'command-temporal-executor',
  'ga-scene-publication',
  'sse-get',
  'historical-fork-independent-continuation',
  'recovery-negative-matrix',
] as const;

export type Turn03MandatoryGateId = (typeof TURN03_MANDATORY_GATE_IDS)[number];

export const turn03GateStatusSchema = z.enum([
  'PASS',
  'FAIL',
  'BLOCKED',
  'NOT-RUN',
]);

export type Turn03GateStatus = z.infer<typeof turn03GateStatusSchema>;

export const turn03OverallStatusSchema = z.enum([
  'PASS',
  'FAIL',
  'BLOCKED',
  'NOT-RUN',
]);

export type Turn03OverallStatus = z.infer<typeof turn03OverallStatusSchema>;

export const turn03ExecutionTierSchema = z.enum([
  'pure',
  'local',
  'compose',
  'kind-cross-pod',
]);

export type Turn03ExecutionTier = z.infer<typeof turn03ExecutionTierSchema>;

export const turn03GateEvidenceSchema = z
  .object({
    tier: turn03ExecutionTierSchema.optional(),
    /** True when the gate was satisfied only by stubs, fixtures or omitted stages. */
    mocked: z.boolean().optional(),
    /** True when required artifacts or hashes are still missing. */
    incomplete: z.boolean().optional(),
    summary: z.string().nullable().optional(),
  })
  .nullable();

export type Turn03GateEvidence = z.infer<typeof turn03GateEvidenceSchema>;

const nullableString = z.string().nullable();

export const turn03DistributedPocProofGateSchema = z.object({
  id: z.enum(TURN03_MANDATORY_GATE_IDS),
  status: turn03GateStatusSchema,
  evidence: turn03GateEvidenceSchema,
});

export type Turn03DistributedPocProofGate =
  z.infer<typeof turn03DistributedPocProofGateSchema>;

export const turn03DistributedPocProofReportSchema = z.object({
  schema: z.literal(TURN03_DISTRIBUTED_POC_PROOF_SCHEMA),
  sourceSha: nullableString,
  imageDigests: z.record(z.string(), z.string()),
  providerMode: z.literal('scripted'),
  fixture: z.object({
    worldRoot: nullableString,
    rulesRoot: nullableString,
    startRoot: nullableString,
  }),
  trace: z.object({
    storyId: nullableString,
    candidateId: nullableString,
    generationId: nullableString,
    workflowId: nullableString,
    attemptId: nullableString,
    passage1: nullableString,
    passage2: nullableString,
    scene1Checkpoint: nullableString,
    scene2Checkpoint: nullableString,
    scene1Root: nullableString,
    scene2Root: nullableString,
    forkRoot: nullableString,
  }),
  gates: z.array(turn03DistributedPocProofGateSchema).length(
    TURN03_MANDATORY_GATE_IDS.length,
  ),
  overall: turn03OverallStatusSchema,
});

export type Turn03DistributedPocProofReport = z.infer<
  typeof turn03DistributedPocProofReportSchema
>;

/** Gates that require a real kind cross-pod tier when marked PASS. */
const KIND_CROSS_POD_GATES = new Set<Turn03MandatoryGateId>([
  'cluster-real-app',
  'command-temporal-executor',
  'ga-scene-publication',
  'sse-get',
  'historical-fork-independent-continuation',
  'recovery-negative-matrix',
]);

export function createEmptyTurn03DistributedPocProofReport(): Turn03DistributedPocProofReport {
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

export function isTurn03GatePassAdmissible(
  gate: Turn03DistributedPocProofGate,
): boolean {
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

/** Derive overall from mandatory gates; never upgrades incomplete or mocked PASS. */
export function computeTurn03DistributedPocProofOverall(
  gates: readonly Turn03DistributedPocProofGate[],
): Turn03OverallStatus {
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

export function withTurn03GateUpdate(
  report: Turn03DistributedPocProofReport,
  gateId: Turn03MandatoryGateId,
  status: Turn03GateStatus,
  evidence: Turn03GateEvidence,
): Turn03DistributedPocProofReport {
  const gates = report.gates.map((gate) =>
    gate.id === gateId ? { id: gate.id, status, evidence } : gate,
  );
  return {
    ...report,
    gates,
    overall: computeTurn03DistributedPocProofOverall(gates),
  };
}

export function finalizeTurn03DistributedPocProofReport(
  report: Turn03DistributedPocProofReport,
): Turn03DistributedPocProofReport {
  const parsed = turn03DistributedPocProofReportSchema.parse(report);
  const overall = computeTurn03DistributedPocProofOverall(parsed.gates);
  if (parsed.overall === 'PASS' && overall !== 'PASS') {
    throw new Error(
      'overall=PASS is not allowed while mandatory gates are incomplete, mocked, or not PASS',
    );
  }
  return { ...parsed, overall };
}

export function parseTurn03DistributedPocProofReport(
  value: unknown,
): Turn03DistributedPocProofReport {
  return turn03DistributedPocProofReportSchema.parse(value);
}

/** Pure file writer for T03; does not contact clusters, models or brokers. */
export async function writeTurn03DistributedPocProofReport(
  filePath: string,
  report: Turn03DistributedPocProofReport,
): Promise<void> {
  const finalized = finalizeTurn03DistributedPocProofReport(report);
  await writeFile(filePath, `${JSON.stringify(finalized, null, 2)}\n`, 'utf8');
}