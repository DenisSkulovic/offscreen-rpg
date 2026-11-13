import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertChamberLabCatalogue,
  canOpenScenarioOnLane,
  chamberLabScenarioDefinitionSchema,
  parseChamberLabScenario,
  scenarioKey,
} from '../src/chamber-lab';

const validOfflineBench = {
  id: 'calendar-named-year-projection',
  version: 1,
  family: 'calendar-time' as const,
  name: 'Named-year calendar projection',
  searchTags: ['calendar', 'bench'],
  proofIntent: 'Prove compileWorldDate against real calendar policy.',
  invariants: ['Pure and seed-reproducible'],
  costClass: 'offline' as const,
  fixture: {
    id: 'named-year-epoch-smoke',
    version: 1,
    owningSource: 'packages/game/src/calendar.ts#compileWorldDate',
    params: {},
  },
  availabilityPerLane: {
    'bench-policy': { state: 'available' as const },
  },
};

test('accepts a strict offline bench scenario', () => {
  const parsed = parseChamberLabScenario(validOfflineBench);
  assert.equal(
    scenarioKey(parsed.id, parsed.version),
    'calendar-named-year-projection@1',
  );
  assert.equal(canOpenScenarioOnLane(parsed, 'bench-policy').ok, true);
});

test('rejects unknown fields', () => {
  assert.throws(() =>
    chamberLabScenarioDefinitionSchema.parse({
      ...validOfflineBench,
      pluginPath: './evil.js',
    }),
  );
});

test('rejects duplicate id@version in a catalogue', () => {
  const first = parseChamberLabScenario(validOfflineBench);
  const second = parseChamberLabScenario({
    ...validOfflineBench,
    name: 'Duplicate',
  });
  assert.throws(
    () => assertChamberLabCatalogue([first, second]),
    /Duplicate chamber-lab scenario/,
  );
});

test('rejects non-offline cost with available bench-policy', () => {
  assert.throws(() =>
    parseChamberLabScenario({
      ...validOfflineBench,
      costClass: 'live-billable',
      availabilityPerLane: {
        'bench-policy': { state: 'available' },
        'authorized-live': { state: 'available' },
      },
    }),
  );
});

test('rejects blocked lane without reason', () => {
  assert.throws(() =>
    parseChamberLabScenario({
      ...validOfflineBench,
      availabilityPerLane: {
        'bench-policy': { state: 'blocked' },
      },
    }),
  );
});

test('canOpenScenarioOnLane fails for undeclared or blocked lanes', () => {
  const parsed = parseChamberLabScenario({
    ...validOfflineBench,
    availabilityPerLane: {
      'bench-policy': {
        state: 'blocked',
        reason: 'Not yet wired',
      },
      connected: { state: 'available' },
    },
  });
  assert.equal(canOpenScenarioOnLane(parsed, 'bench-policy').ok, false);
  assert.equal(canOpenScenarioOnLane(parsed, 'sandbox-db').ok, false);
  assert.equal(canOpenScenarioOnLane(parsed, 'connected').ok, true);
});

test('legacy bridge never permits automated pass', () => {
  const parsed = parseChamberLabScenario({
    ...validOfflineBench,
    id: 'chamber-immediate-conversation',
    family: 'scripted-chamber-scene',
    availabilityPerLane: {
      connected: { state: 'available' },
    },
    legacy: {
      kind: 'chamber-scene',
      legacyId: 'chamber.v2',
      automatedPassAllowed: false,
    },
  });
  assert.equal(parsed.legacy?.automatedPassAllowed, false);
  assert.throws(() =>
    parseChamberLabScenario({
      ...validOfflineBench,
      legacy: {
        kind: 'qa-journey',
        legacyId: 'finite-action-overlap',
        legacyVersion: 3,
        automatedPassAllowed: true,
      },
    }),
  );
});
