import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  computeTurn03DistributedPocProofOverall,
  createEmptyTurn03DistributedPocProofReport,
  finalizeTurn03DistributedPocProofReport,
  isTurn03GatePassAdmissible,
  parseTurn03DistributedPocProofReport,
  TURN03_DISTRIBUTED_POC_PROOF_SCHEMA,
  TURN03_MANDATORY_GATE_IDS,
  withTurn03GateUpdate,
  writeTurn03DistributedPocProofReport,
  type Turn03DistributedPocProofGate,
} from './helpers/turn03-distributed-poc-proof.js';

function allGatesPass(
  tier: 'kind-cross-pod' | 'local' = 'kind-cross-pod',
): Turn03DistributedPocProofGate[] {
  return TURN03_MANDATORY_GATE_IDS.map((id) => ({
    id,
    status: 'PASS' as const,
    evidence: {
      tier:
        id === 'candidate-start' || id === 'auth-ssr' ? 'local' : tier,
      summary: `gate ${id} evidence`,
    },
  }));
}

test('empty scorecard matches PROOF schema with NOT-RUN fidelity', () => {
  const report = createEmptyTurn03DistributedPocProofReport();
  assert.equal(report.schema, TURN03_DISTRIBUTED_POC_PROOF_SCHEMA);
  assert.equal(report.overall, 'NOT-RUN');
  assert.equal(report.providerMode, 'scripted');
  assert.equal(report.sourceSha, null);
  assert.deepEqual(report.imageDigests, {});
  assert.equal(report.gates.length, 8);
  assert.ok(report.gates.every((gate) => gate.status === 'NOT-RUN'));
  assert.ok(parseTurn03DistributedPocProofReport(report));
});

test('overall stays NOT-RUN until every mandatory gate is admissible PASS', () => {
  const base = createEmptyTurn03DistributedPocProofReport();
  let report = base;
  for (const gateId of TURN03_MANDATORY_GATE_IDS) {
    report = withTurn03GateUpdate(report, gateId, 'PASS', {
      tier:
        gateId === 'candidate-start' || gateId === 'auth-ssr'
          ? 'local'
          : 'kind-cross-pod',
      summary: 'observed',
    });
    if (gateId !== TURN03_MANDATORY_GATE_IDS.at(-1)) {
      assert.notEqual(report.overall, 'PASS');
    }
  }
  assert.equal(report.overall, 'PASS');
});

test('mocked or incomplete PASS cannot yield overall PASS', () => {
  const gates = allGatesPass();
  gates[0] = {
    id: 'cluster-real-app',
    status: 'PASS',
    evidence: { mocked: true, tier: 'kind-cross-pod' },
  };
  assert.equal(computeTurn03DistributedPocProofOverall(gates), 'FAIL');
  assert.equal(
    isTurn03GatePassAdmissible(gates[0]),
    false,
  );

  const incomplete = allGatesPass();
  incomplete[3] = {
    id: 'command-temporal-executor',
    status: 'PASS',
    evidence: { incomplete: true, tier: 'kind-cross-pod' },
  };
  assert.equal(computeTurn03DistributedPocProofOverall(incomplete), 'FAIL');
});

test('local or pure tier cannot PASS kind-cross-pod gates', () => {
  const gate = {
    id: 'cluster-real-app' as const,
    status: 'PASS' as const,
    evidence: { tier: 'pure' as const, summary: 'in-process only' },
  };
  assert.equal(isTurn03GatePassAdmissible(gate), false);
  assert.equal(
    computeTurn03DistributedPocProofOverall([gate, ...allGatesPass().slice(1)]),
    'FAIL',
  );
});

test('finalize rejects forged overall PASS', () => {
  const report = {
    ...createEmptyTurn03DistributedPocProofReport(),
    overall: 'PASS' as const,
  };
  assert.throws(() => finalizeTurn03DistributedPocProofReport(report), {
    message:
      'overall=PASS is not allowed while mandatory gates are incomplete, mocked, or not PASS',
  });
});

test('reporter writes JSON without model or cluster side effects', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'turn03-proof-'));
  try {
    const path = join(dir, 'scorecard.json');
    const report = finalizeTurn03DistributedPocProofReport(
      createEmptyTurn03DistributedPocProofReport(),
    );
    await writeTurn03DistributedPocProofReport(path, report);
    const onDisk = parseTurn03DistributedPocProofReport(
      JSON.parse(await readFile(path, 'utf8')),
    );
    assert.equal(onDisk.overall, 'NOT-RUN');
    assert.equal(onDisk.gates.length, 8);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});