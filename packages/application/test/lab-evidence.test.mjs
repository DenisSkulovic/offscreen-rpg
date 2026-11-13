import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  createLabRun,
  finalizeLabRunEvidence,
  LabEvidenceError,
  redactLabEvidenceValue,
  refuseManualAsMachineProof,
} from '../dist/developer-tools/index.js';

test('finalize exports redacted capsule + replay command; private stays gated', async () => {
  const run = createLabRun({
    lane: 'bench-policy',
    seed: 141,
    scenarioId: 'activity-shift-eighty',
    scenarioVersion: 1,
    gitCommit: 'ab4c4759d1cee701',
    dirty: false,
  });
  await run.runAll([
    { kind: 'load' },
    { kind: 'assert', invariantId: 'item-count', expected: 1 },
  ]);
  const { capsule, markdown } = run.finalizeEvidence({
    providerPacket: {
      prompt: 'secret world bible',
      authorization: 'Bearer sk-abcdefghijklmnopqrstuvwxyz',
    },
    operatorNote: 'player looked sad',
  });
  assert.equal(capsule.authority, 'lab-run-machine');
  assert.equal(capsule.manualPassedIsNotMachineProof, true);
  assert.equal(capsule.redactionLevel, 'default');
  assert.equal(capsule.semanticDiff, null);
  assert.match(
    capsule.replayCommand,
    /pnpm chamber:scenario -- activity-shift-eighty --lane=bench-policy --seed=141/,
  );
  assert.match(markdown, /manualPassedIsNotMachineProof: true/);
  const serialized = JSON.stringify(capsule);
  assert.equal(serialized.includes('secret world bible'), false);
  assert.equal(serialized.includes('sk-abcdefghijklmnopqrstuvwxyz'), false);
  assert.equal(serialized.includes('player looked sad'), false);
  assert.ok(capsule.artifacts.some((a) => a.kind === 'provider-packet'));
  assert.ok(
    capsule.artifacts.every(
      (a) =>
        a.kind !== 'provider-packet' || a.redactedFromDefault === true,
    ),
  );

  const again = run.evidence();
  assert.equal(again.evidenceId, capsule.evidenceId);
  assert.throws(
    () =>
      run.finalizeEvidence({
        operatorNote: 'mutate',
      }),
    (error) =>
      error instanceof LabEvidenceError && error.code === 'already-finalized',
  );

  const mutated = { ...capsule, seed: 999 };
  assert.throws(
    () => run.assertEvidenceFrozen(mutated),
    (error) => error instanceof LabEvidenceError && error.code === 'immutable',
  );
});

test('fixture hash mismatch refuses same-run finalize', () => {
  assert.throws(
    () =>
      finalizeLabRunEvidence({
        runId: randomUUID(),
        fixtureHash: 'a'.repeat(64),
        expectedFixtureHash: 'b'.repeat(64),
        seed: 1,
        lane: 'bench-policy',
        status: 'completed',
        steps: [],
        gitCommit: 'deadbeefcafe',
        dirty: false,
        startedAt: new Date().toISOString(),
      }),
    (error) =>
      error instanceof LabEvidenceError &&
      error.code === 'fixture-version-mismatch',
  );
});

test('redactor strips secrets; manual passed is not machine proof', () => {
  const redacted = redactLabEvidenceValue({
    authorization: 'secret',
    nested: { apiKey: 'x', ok: 1 },
    prompt: 'canon',
  });
  assert.equal(redacted.authorization, '<redacted>');
  assert.equal(redacted.nested.apiKey, '<redacted>');
  assert.equal(redacted.nested.ok, 1);
  assert.equal(redacted.prompt, '<redacted>');
  assert.throws(
    () => refuseManualAsMachineProof({ qaDisposition: 'passed' }),
    (error) =>
      error instanceof LabEvidenceError && error.code === 'authority-confusion',
  );
});

test('replay allocates a new run id; prior evidence stays frozen', async () => {
  const run = createLabRun({
    lane: 'bench-policy',
    seed: 3,
    scenarioId: 'activity-shift-eighty',
    gitCommit: 'abcdef0123456789',
    dirty: true,
  });
  await run.step({
    stepId: randomUUID(),
    ordinal: 1,
    expectedRunRevision: 0,
    command: { kind: 'load' },
  });
  const first = run.finalizeEvidence();
  const replayed = await run.replay();
  assert.notEqual(replayed.snapshot().runId, run.snapshot().runId);
  await replayed.step({
    stepId: randomUUID(),
    ordinal: 1,
    expectedRunRevision: 0,
    command: { kind: 'load' },
  });
  const second = replayed.finalizeEvidence();
  assert.notEqual(second.capsule.evidenceId, first.capsule.evidenceId);
  assert.equal(run.evidence().evidenceId, first.capsule.evidenceId);
});
