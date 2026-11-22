import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  computeTurn03DistributedPocProofOverall,
  createEmptyTurn03DistributedPocProofReport,
  isTurn03GatePassAdmissible,
  TURN03_MANDATORY_GATE_IDS,
  type Turn03DistributedPocProofGate,
} from './helpers/turn03-distributed-poc-proof.js';

test('empty report overall NOT-RUN and exactly eight gates', () => {
  const report = createEmptyTurn03DistributedPocProofReport();
  assert.equal(report.overall, 'NOT-RUN');
  assert.equal(report.gates.length, 8);
  assert.deepEqual(
    report.gates.map((gate) => gate.id),
    [...TURN03_MANDATORY_GATE_IDS],
  );
  assert.equal(computeTurn03DistributedPocProofOverall(report.gates), 'NOT-RUN');
});

test('kind-cross-pod gate PASS with local tier or mocked true => overall FAIL', () => {
  const localTierGate: Turn03DistributedPocProofGate = {
    id: 'cluster-real-app',
    status: 'PASS',
    evidence: { tier: 'local', mocked: false, summary: 'local tier' },
  };
  assert.equal(isTurn03GatePassAdmissible(localTierGate), false);
  assert.equal(
    computeTurn03DistributedPocProofOverall([
      ...createEmptyTurn03DistributedPocProofReport().gates.map((gate) =>
        gate.id === 'cluster-real-app'
          ? localTierGate
          : { ...gate, status: 'NOT-RUN' as const },
      ),
    ]),
    'FAIL',
  );

  const mockedGate: Turn03DistributedPocProofGate = {
    id: 'sse-get',
    status: 'PASS',
    evidence: { tier: 'kind-cross-pod', mocked: true, summary: 'mocked' },
  };
  assert.equal(isTurn03GatePassAdmissible(mockedGate), false);
  assert.equal(
    computeTurn03DistributedPocProofOverall([
      ...createEmptyTurn03DistributedPocProofReport().gates.map((gate) =>
        gate.id === 'sse-get' ? mockedGate : { ...gate, status: 'NOT-RUN' as const },
      ),
    ]),
    'FAIL',
  );
});

test('all eight admissible kind-cross-pod PASS => overall PASS (pure helper check)', () => {
  const gates: Turn03DistributedPocProofGate[] = TURN03_MANDATORY_GATE_IDS.map(
    (id) => ({
      id,
      status: 'PASS',
      evidence: {
        tier:
          id === 'candidate-start' || id === 'auth-ssr'
            ? 'local'
            : 'kind-cross-pod',
        summary: `observed ${id}`,
      },
    }),
  );
  assert.ok(gates.every((gate) => isTurn03GatePassAdmissible(gate)));
  assert.equal(computeTurn03DistributedPocProofOverall(gates), 'PASS');
});