import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createSeededDraw,
  listBenchScenarios,
  runBenchScenario,
} from '../src/lab/bench.js';

test('calendar bench passes against real compileWorldDate policy', () => {
  const result = runBenchScenario({
    scenarioId: 'calendar-named-year-projection',
    seed: 141,
  });
  assert.equal(result.ok, true);
  assert.equal(result.lane, 'bench-policy');
  assert.ok(result.assertions.every((entry) => entry.passed));
});

test('finite-action bench uses production eligibility and seeded resolveCheck', () => {
  const a = runBenchScenario({
    scenarioId: 'finite-action-overlap-eligibility',
    seed: 7,
  });
  const b = runBenchScenario({
    scenarioId: 'finite-action-overlap-eligibility',
    seed: 7,
  });
  assert.equal(a.ok, true);
  assert.deepEqual(a.observation, b.observation);
  assert.ok(
    a.assertions.some(
      (entry) =>
        entry.id === 'intervening-fails-closed' && entry.passed === true,
    ),
  );
});

test('same seed draw is reproducible; blocked catalogue cannot open on bench', () => {
  const drawA = createSeededDraw(99);
  const drawB = createSeededDraw(99);
  assert.deepEqual([drawA(), drawA()], [drawB(), drawB()]);

  const blocked = runBenchScenario({
    scenarioId: 'activity-interrupt-same-tick',
    seed: 1,
  });
  assert.equal(blocked.ok, false);
  assert.match(
    blocked.error ?? '',
    /blocked|not declared|No Bench runner|unsupported until game authority/i,
  );

  const connectedOnly = runBenchScenario({
    scenarioId: 'chamber-immediate-conversation',
    seed: 1,
  });
  assert.equal(connectedOnly.ok, false);

  assert.ok(listBenchScenarios().includes('calendar-named-year-projection@1'));
});
