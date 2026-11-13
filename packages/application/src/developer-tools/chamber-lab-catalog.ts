import {
  assertChamberLabCatalogue,
  canOpenScenarioOnLane,
  parseChamberLabScenario,
  scenarioKey,
  type ChamberLabLane,
  type ChamberLabScenarioDefinition,
} from '@offscreen/contracts/chamber-lab';
import { listChamberScenarios } from '@offscreen/contracts/chamber';
import { listQaJourneyCases } from './qa-catalog';

/**
 * Typed Chamber laboratory scenario catalogue (CH01).
 * Entries describe executable intent and lane availability; they do not run.
 */
export const chamberLabScenarioCatalog: readonly ChamberLabScenarioDefinition[] =
  assertChamberLabCatalogue([
    parseChamberLabScenario({
      id: 'calendar-named-year-projection',
      version: 1,
      family: 'calendar-time',
      name: 'Named-year calendar projection',
      searchTags: [
        'calendar',
        'named-year',
        'compile-world-date',
        'bench',
        'time',
      ],
      proofIntent:
        'Prove compileWorldDate / addCalendarMonths against real @offscreen/game/calendar for a fixed named-year definition and seed.',
      invariants: [
        'World date must match its time definition kind',
        'Projection is pure and seed-reproducible',
        'No Nest, DB, Temporal, browser or provider required',
      ],
      costClass: 'offline',
      fixture: {
        id: 'named-year-epoch-smoke',
        version: 1,
        owningSource: 'packages/game/src/calendar.ts#compileWorldDate',
        params: {
          kind: 'named-year',
        },
      },
      availabilityPerLane: {
        'bench-policy': { state: 'available' },
        'sandbox-db': {
          state: 'planned',
          reason: 'Persisted calendar specimen arrives with CH03/CH04',
        },
        connected: {
          state: 'planned',
          reason: 'Connected time proof is later CH13 work',
        },
      },
    }),
    parseChamberLabScenario({
      id: 'finite-action-overlap-eligibility',
      version: 1,
      family: 'finite-action',
      name: 'Finite-action overlap eligibility',
      searchTags: ['finite-action', 'overlap', 'eligibility', 'bench', 'check'],
      proofIntent:
        'Prove actionOverlapEligibility and resolveCheck against real @offscreen/game policies with an injected seed draw.',
      invariants: [
        'Intervening world obligation fails closed',
        'Unsupported resolution kinds fail closed',
        'Ability check uses production resolveCheck, not a Bench copy',
      ],
      costClass: 'offline',
      fixture: {
        id: 'overlap-and-check-smoke',
        version: 1,
        owningSource:
          'packages/game/src/immediate-actions.ts#actionOverlapEligibility',
        params: {
          resolutionKind: 'check',
        },
      },
      availabilityPerLane: {
        'bench-policy': { state: 'available' },
        'sandbox-db': {
          state: 'planned',
          reason: 'Persisted activity specimen arrives with CH03/CH04',
        },
        connected: {
          state: 'planned',
          reason: 'Connected activity proof is later CH13 work',
        },
      },
    }),
    parseChamberLabScenario({
      id: 'chamber-immediate-conversation',
      version: 1,
      family: 'scripted-chamber-scene',
      name: 'Legacy chamber.v2 immediate conversation',
      searchTags: ['chamber', 'chamber.v2', 'choice', 'connected', 'scripted'],
      proofIntent:
        'Index the existing scripted chamber.v2 scene as a connected legacy case without claiming a new mechanic.',
      invariants: [
        'Uses createChamber + chamber.v2 fixture authority',
        'Preserves historical chamber.v2 identity',
        'Does not invent a Chamber-only resolver',
      ],
      costClass: 'offline',
      fixture: {
        id: 'chamber-v2-opening',
        version: 1,
        owningSource:
          'packages/application/src/developer-tools/chamber-fixtures.ts#chamber.v2',
        params: {
          scenario: 'chamber.v2',
        },
      },
      availabilityPerLane: {
        'bench-policy': {
          state: 'blocked',
          reason:
            'chamber.v2 is a scripted story scene, not a pure game-policy input',
        },
        'sandbox-db': {
          state: 'planned',
          reason: 'Isolated Sandbox materialization is CH04',
        },
        connected: { state: 'available' },
      },
      legacy: {
        kind: 'chamber-scene',
        legacyId: 'chamber.v2',
        automatedPassAllowed: false,
      },
    }),
    parseChamberLabScenario({
      id: 'activity-interrupt-same-tick',
      version: 1,
      family: 'activity-interruption',
      name: 'Same-tick activity interruption',
      searchTags: ['activity', 'interrupt', 'same-tick', 'fault', 'planned'],
      proofIntent:
        'Reserve catalogue space for same-tick activity interruption once a real production policy seam exists.',
      invariants: [
        'Must use real activity admission authority when unblocked',
        'Blocked entries must not report automated passed',
      ],
      costClass: 'offline',
      fixture: {
        id: 'activity-interrupt-placeholder',
        version: 1,
        owningSource:
          'packages/game/src/activities.ts (no interrupt seam exported yet)',
        params: {},
      },
      availabilityPerLane: {
        'bench-policy': {
          state: 'blocked',
          reason:
            'No exported pure interrupt policy seam; unsupported until game authority exists',
        },
        'sandbox-db': {
          state: 'blocked',
          reason: 'Depends on a real interrupt policy and CH04 sandbox',
        },
        connected: {
          state: 'blocked',
          reason: 'Would falsely claim a mechanic the engine does not expose',
        },
      },
    }),
  ]);

export function listChamberLabScenarios(): readonly ChamberLabScenarioDefinition[] {
  return chamberLabScenarioCatalog;
}

export function findChamberLabScenario(
  id: string,
  version: number,
): ChamberLabScenarioDefinition | undefined {
  return chamberLabScenarioCatalog.find(
    (entry) => entry.id === id && entry.version === version,
  );
}

export function searchChamberLabScenarios(
  term: string,
): readonly ChamberLabScenarioDefinition[] {
  const needle = term.trim().toLowerCase();
  if (!needle) {
    return chamberLabScenarioCatalog;
  }
  return chamberLabScenarioCatalog.filter((entry) => {
    const haystack = [
      entry.id,
      entry.name,
      entry.family,
      entry.proofIntent,
      ...entry.searchTags,
      ...entry.invariants,
      entry.fixture.id,
      entry.fixture.owningSource,
      entry.legacy?.legacyId ?? '',
    ]
      .join('\n')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function openChamberLabScenario(args: {
  id: string;
  version: number;
  lane: ChamberLabLane;
}):
  | { ok: true; scenario: ChamberLabScenarioDefinition }
  | { ok: false; reason: string } {
  const scenario = findChamberLabScenario(args.id, args.version);
  if (!scenario) {
    return {
      ok: false,
      reason: `Unknown scenario ${scenarioKey(args.id, args.version)}`,
    };
  }
  const gate = canOpenScenarioOnLane(scenario, args.lane);
  if (!gate.ok) {
    return gate;
  }
  return { ok: true, scenario };
}

/** Legacy chamber.v1–v5 remain addressable; not auto-upgraded to lab passes. */
export function listLegacyChamberSceneMetadata() {
  return listChamberScenarios().map((entry) => ({
    legacyId: entry.id,
    name: entry.name,
    description: entry.description,
    automatedPassAllowed: false as const,
  }));
}

/**
 * Manual QA cases stay operator journals. Mapping a label never yields automated passed.
 */
export function listLegacyQaJourneyBridge() {
  return listQaJourneyCases().map((entry) => ({
    legacyId: entry.id,
    legacyVersion: entry.version,
    name: entry.name,
    costClass: entry.costClass,
    availability: entry.availability,
    drivers: entry.drivers,
    automatedPassAllowed: false as const,
  }));
}

export function qaJourneyCannotBecomeAutomatedPass(args: {
  id: string;
  version: number;
}): boolean {
  const bridge = listLegacyQaJourneyBridge().find(
    (entry) =>
      entry.legacyId === args.id && entry.legacyVersion === args.version,
  );
  return bridge ? bridge.automatedPassAllowed === false : true;
}
