import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPlayabilityRunManifest,
  formatPlayabilityRunManifest,
  unobservedPlayabilityRubric,
} from '../dist/developer-tools/playability-harness.js';

test('playability trajectory replays to the same canonical state without provider spend', () => {
  const first = createPlayabilityRunManifest({
    id: 'sa11-replay-a',
    createdAt: '2026-11-14T15:00:00.000Z',
  });
  const second = createPlayabilityRunManifest({
    id: 'sa11-replay-b',
    createdAt: '2026-11-14T16:00:00.000Z',
  });

  assert.equal(first.version, 'playability-run.v1');
  assert.equal(first.providerTransportPerformed, false);
  assert.equal(first.providerChargeMicrousd, '0');
  assert.equal(first.proposalOrigin, 'scripted-fixture');
  assert.ok(first.stages.length >= 10);
  assert.ok(first.stages.length <= 15);
  assert.equal(first.allObjectiveAssertionsPassed, true);
  assert.deepEqual(first.objectiveFailures, []);
  assert.equal(first.canonicalStateSha256, second.canonicalStateSha256);
  assert.deepEqual(first.memoryBenchmarks.sceneCounts, [200, 2000]);
  assert.equal(first.memoryBenchmarks.retrievalExecuted, false);
  assert.equal(first.memoryBenchmarks.forkIsolationDeclared, true);

  const quiet = first.stages.find((stage) => stage.id === 'L6-quiet-weeks');
  assert.ok(quiet);
  assert.equal(quiet.taskPacket, null);
  assert.equal(quiet.publication, 'none');

  const profiles = first.stages.filter((stage) => stage.scenarioRef === 'L8');
  assert.equal(profiles.length, 2);
  assert.notEqual(
    profiles[0].taskPacket.guidanceFingerprint,
    profiles[1].taskPacket.guidanceFingerprint,
  );
  assert.deepEqual(profiles[0].mechanics, profiles[1].mechanics);
  assert.equal(profiles[0].acceptedIntent, profiles[1].acceptedIntent);

  for (const stage of first.stages) {
    assert.deepEqual(stage.humanRubric, unobservedPlayabilityRubric());
    assert.equal(stage.providerTransportPerformed, false);
    assert.equal(stage.proposalOrigin, 'scripted-fixture');
  }

  assert.match(
    formatPlayabilityRunManifest(first),
    /provider transport: not performed/,
  );
  assert.match(formatPlayabilityRunManifest(first), /human rubric: unobserved/);
});

test('negative signatures are represented as objective failures when forced', () => {
  const run = createPlayabilityRunManifest();
  const giftRecall = run.stages.find((stage) => stage.id === 'L4-gift-recalled');
  assert.ok(
    giftRecall.assertions.some(
      (assertion) =>
        assertion.id === 'failed-gift-rejected' && assertion.passed,
    ),
  );
  const outage = run.stages.find((stage) => stage.id === 'L11-uncertain-outage');
  assert.ok(
    outage.assertions.some(
      (assertion) =>
        assertion.id === 'uncertain-no-auto-retry' && assertion.passed,
    ),
  );
  const nonhuman = run.stages.find((stage) => stage.id === 'L7-nonhuman');
  assert.equal(nonhuman.sourceRootLabel, 'gradient-life');
  assert.ok(
    run.outstandingAuthorityGaps.some((gap) => gap.includes('L14')),
  );
});
