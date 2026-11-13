import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertCoverageScenariosExist,
  coverageCannotBecomeAutomatedPass,
  resolveRunnableCoverage,
  searchMechanicsCoverage,
} from '../dist/developer-tools/index.js';

test('coverage search finds finite activity and item transfer runnables', () => {
  assertCoverageScenariosExist();
  const activity = searchMechanicsCoverage('duplicate-settlement');
  assert.ok(
    activity.some((entry) => entry.mechanicId === 'finite-activity-clock-wait'),
  );
  const items = searchMechanicsCoverage('item-transfer');
  assert.ok(items.some((entry) => entry.mechanicId === 'item-transfer-holder'));

  const resolved = resolveRunnableCoverage({
    mechanicId: 'finite-activity-clock-wait',
    lane: 'bench-policy',
  });
  assert.equal(resolved.ok, true);
  if (resolved.ok) {
    assert.equal(resolved.scenarioId, 'activity-clock-wait-eighty');
  }
});

test('blocked interrupt and manual QA cannot become automated passed', () => {
  const blocked = resolveRunnableCoverage({
    mechanicId: 'activity-interrupt-same-tick',
    lane: 'bench-policy',
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.automatedPassAllowed, false);
  assert.equal(
    coverageCannotBecomeAutomatedPass('finite-activity-clock-wait'),
    true,
  );
});
