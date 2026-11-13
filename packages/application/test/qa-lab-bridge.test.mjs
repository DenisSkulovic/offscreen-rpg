import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertActivityScenarioRegistered,
  claimStructuralMachinePass,
  describeQaLabBridgeForCase,
  openLabRunForQaStage,
  QaLabBridgeError,
  resolveQaStageBinding,
  searchQaLabCatalogue,
} from '../dist/developer-tools/index.js';

test('structural activity stage launches LabRun and claims machine pass from capsule', async () => {
  assertActivityScenarioRegistered();
  const { binding, run } = openLabRunForQaStage({
    qaCaseId: 'quiet-activity-lifecycle',
    qaCaseVersion: 1,
    stageId: 'start-microbe',
    seed: 141,
    gitCommit: '8025346deadbeef',
    dirty: false,
  });
  assert.equal(binding.kind, 'machine-scenario');
  assert.equal(binding.executable, true);
  await run.runAll([
    { kind: 'load' },
    { kind: 'assert', invariantId: 'item-count', expected: 1 },
  ]);
  const { capsule } = run.finalizeEvidence();
  const claim = claimStructuralMachinePass({ binding, capsule });
  assert.equal(claim.passed, true);
  assert.equal(claim.evidenceId, capsule.evidenceId);
});

test('human storyteller stage stays manual; operator pass without LabRun rejected', () => {
  const binding = resolveQaStageBinding({
    qaCaseId: 'storyteller-contrast',
    qaCaseVersion: 1,
    stageId: 'run-profile-one',
  });
  assert.equal(binding.kind, 'human-manual');
  assert.equal(binding.executable, false);
  assert.throws(
    () =>
      claimStructuralMachinePass({
        binding,
        capsule: null,
        operatorSelectedPass: true,
      }),
    (error) =>
      error instanceof QaLabBridgeError ||
      error?.code === 'authority-confusion',
  );
  assert.throws(
    () =>
      claimStructuralMachinePass({
        binding: resolveQaStageBinding({
          qaCaseId: 'finite-action-overlap',
          qaCaseVersion: 3,
          stageId: 'early-preparation',
        }),
        capsule: null,
        operatorSelectedPass: true,
      }),
    (error) =>
      error instanceof QaLabBridgeError && error.code === 'missing-evidence',
  );
});

test('billable live QA cannot open offline LabRun; catalogue distinguishes kinds', () => {
  assert.throws(
    () =>
      openLabRunForQaStage({
        qaCaseId: 'conservative-live-quality-probe',
        qaCaseVersion: 1,
        stageId: 'dispatch',
      }),
    (error) =>
      error instanceof QaLabBridgeError &&
      (error.code === 'not-executable' || error.code === 'billable-offline'),
  );

  const search = searchQaLabCatalogue('quiet-activity');
  assert.ok(search.some((entry) => entry.entryKind === 'stage-instructions'));
  assert.ok(search.some((entry) => entry.entryKind === 'runnable-scenario'));

  const described = describeQaLabBridgeForCase({
    qaCaseId: 'finite-action-overlap',
    qaCaseVersion: 3,
  });
  assert.equal(described.automatedPassAllowed, false);
  assert.ok(
    described.stages.some(
      (stage) =>
        stage.stageId === 'early-preparation' && stage.executable === true,
    ),
  );
});
