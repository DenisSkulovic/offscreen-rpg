import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertReplayCompatible,
  compareMechanicalRuns,
  createLabRun,
  extractReplayManifest,
  mapChamberCriteriaEvidence,
  ReplayCompareError,
} from '../dist/developer-tools/index.js';

test('replay manifest + clock compare identifies mechanical change', async () => {
  const run = createLabRun({
    lane: 'bench-policy',
    seed: 141,
    scenarioId: 'activity-clock-wait-eighty',
    scenarioVersion: 1,
    gitCommit: 'replaycompare01',
    dirty: false,
  });
  await run.step({
    stepId: crypto.randomUUID(),
    ordinal: 1,
    expectedRunRevision: 0,
    command: { kind: 'load' },
  });
  const before = run.observe();
  await run.step({
    stepId: crypto.randomUUID(),
    ordinal: 2,
    expectedRunRevision: run.snapshot().revision,
    command: { kind: 'advanceClock', targetGameSecond: 1000 },
  });
  const after = run.observe();
  const compared = compareMechanicalRuns({
    before,
    after,
    invariantId: 'clock-advances',
    mustChange: ['clock.gameSecond'],
  });
  assert.equal(compared.passed, true);
  assert.equal(compared.subjectiveExcluded, true);

  const { capsule } = run.finalizeEvidence();
  const manifest = extractReplayManifest(capsule);
  assert.equal(manifest.scenarioId, 'activity-clock-wait-eighty');
  assertReplayCompatible({
    manifest,
    actualFixtureHash: capsule.fixtureHash,
    laneEnabled: true,
  });
  assert.throws(
    () =>
      assertReplayCompatible({
        manifest,
        actualFixtureHash: 'b'.repeat(64),
        laneEnabled: true,
      }),
    (error) =>
      error instanceof ReplayCompareError && error.code === 'fixture-mismatch',
  );
});

test('C01–C16 map is honest; provider attempt blocks replay', () => {
  const map = mapChamberCriteriaEvidence();
  assert.equal(map.length, 16);
  assert.ok(map.every((row) => ['demonstrated', 'blocked', 'design-only'].includes(row.status)));
  assert.equal(map.find((row) => row.id === 'C13')?.status, 'demonstrated');
  assert.equal(map.find((row) => row.id === 'C04')?.status, 'demonstrated');
  assert.throws(
    () =>
      assertReplayCompatible({
        manifest: {
          scenarioId: 'activity-clock-wait-eighty',
          scenarioVersion: 1,
          fixtureHash: null,
          seed: 1,
          lane: 'bench-policy',
          steps: [],
          faultHash: null,
        },
        actualFixtureHash: null,
        laneEnabled: true,
        providerAttempted: true,
      }),
    (error) =>
      error instanceof ReplayCompareError && error.code === 'provider-hidden',
  );
});
