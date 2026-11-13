import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertChamberLabCatalogue,
  canOpenScenarioOnLane,
  chamberLabScenarioDefinitionSchema,
  parseChamberLabFixtureRecipe,
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

test('fixture recipe accepts accepted-finite-work overlay and rejects future due', () => {
  const recipe = parseChamberLabFixtureRecipe({
    id: 'accepted-shift-80pct',
    version: 1,
    seed: 141,
    overlays: [
      {
        kind: 'accepted-finite-work',
        requiredFictionalSeconds: 1000,
        progressRatio: 0.8,
        acceptedAtGameSecond: 100,
      },
    ],
  });
  assert.equal(recipe.overlays[0]?.kind, 'accepted-finite-work');
  assert.throws(() =>
    parseChamberLabFixtureRecipe({
      id: 'bad-due',
      version: 1,
      seed: 1,
      overlays: [
        {
          kind: 'due-decision-boundary',
          offerId: '00000000-0000-4000-8000-000000000001',
          interactionId: '00000000-0000-4000-8000-000000000002',
          gameSecond: 10,
          dueGameSecond: 20,
          prompt: 'Too early',
          options: [{ id: 'go', label: 'Go' }],
        },
      ],
    }),
  );
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
