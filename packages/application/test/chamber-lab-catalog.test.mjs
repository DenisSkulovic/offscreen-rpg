import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findChamberLabScenario,
  listChamberLabScenarios,
  listLegacyChamberSceneMetadata,
  listLegacyQaJourneyBridge,
  openChamberLabScenario,
  qaJourneyCannotBecomeAutomatedPass,
  searchChamberLabScenarios,
} from '../dist/developer-tools/chamber-lab-catalog.js';

test('catalogue seeds calendar bench and chamber.v2 connected cases', () => {
  const listed = listChamberLabScenarios();
  assert.ok(listed.length >= 3);
  const calendar = findChamberLabScenario('calendar-named-year-projection', 1);
  const scene = findChamberLabScenario('chamber-immediate-conversation', 1);
  const blocked = findChamberLabScenario('activity-interrupt-same-tick', 1);
  assert.ok(calendar);
  assert.ok(scene);
  assert.ok(blocked);
  assert.equal(calendar.family, 'calendar-time');
  assert.equal(scene.legacy?.legacyId, 'chamber.v2');
  assert.equal(scene.legacy?.automatedPassAllowed, false);
  assert.equal(
    blocked.availabilityPerLane['bench-policy']?.state,
    'blocked',
  );
});

test('search by mechanic term returns the calendar scenario', () => {
  const hits = searchChamberLabScenarios('calendar');
  assert.ok(
    hits.some(
      (entry) =>
        entry.id === 'calendar-named-year-projection' && entry.version === 1,
    ),
  );
  assert.equal(
    openChamberLabScenario({
      id: 'calendar-named-year-projection',
      version: 1,
      lane: 'bench-policy',
    }).ok,
    true,
  );
});

test('blocked interruption and missing fixture/lane cannot open', () => {
  assert.equal(
    openChamberLabScenario({
      id: 'activity-interrupt-same-tick',
      version: 1,
      lane: 'bench-policy',
    }).ok,
    false,
  );
  assert.equal(
    openChamberLabScenario({
      id: 'calendar-named-year-projection',
      version: 1,
      lane: 'authorized-live',
    }).ok,
    false,
  );
  assert.equal(
    openChamberLabScenario({
      id: 'no-such-scenario',
      version: 1,
      lane: 'bench-policy',
    }).ok,
    false,
  );
});

test('legacy chamber scenes and QA journeys never auto-upgrade to automated pass', () => {
  const scenes = listLegacyChamberSceneMetadata();
  assert.equal(scenes.length, 5);
  assert.ok(scenes.every((entry) => entry.automatedPassAllowed === false));
  const qa = listLegacyQaJourneyBridge();
  assert.equal(qa.length, 15);
  assert.ok(qa.every((entry) => entry.automatedPassAllowed === false));
  assert.equal(
    qaJourneyCannotBecomeAutomatedPass({
      id: 'finite-action-overlap',
      version: 3,
    }),
    true,
  );
});
