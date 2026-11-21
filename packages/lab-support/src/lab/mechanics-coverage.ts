/**
 * CH15: cross-mechanic per-lane coverage registry (truthful availability).
 */
import {
  findChamberLabScenario,
  listChamberLabScenarios,
} from '../chamber-lab-catalog.js';
import type { ChamberLabLane } from '@offscreen/contracts/chamber-lab';

export type CoverageLaneState = 'available' | 'blocked' | 'planned';

export type MechanicsCoverageEntry = {
  mechanicId: string;
  name: string;
  invariant: string;
  owningSource: string;
  scenarioId: string | null;
  scenarioVersion: number | null;
  fixtureId: string | null;
  lanes: Partial<Record<ChamberLabLane, { state: CoverageLaneState; reason?: string }>>;
  evidenceTier: ChamberLabLane[];
  injectedFailure: string | null;
  automatedPassAllowed: false;
  searchTags: string[];
};

const COVERAGE: readonly MechanicsCoverageEntry[] = [
  {
    mechanicId: 'finite-activity-clock-wait',
    name: 'Finite activity clock-wait progress',
    invariant:
      'Accepted partial shift progress is content-hashed and seed-reproducible; wage/settlement claims need Sandbox/Connected',
    owningSource:
      'packages/application/src/developer-tools/lab/fixture-specimens.ts#acceptedShiftEightyPercentRecipe',
    scenarioId: 'activity-clock-wait-eighty',
    scenarioVersion: 1,
    fixtureId: 'accepted-shift-eighty',
    lanes: {
      'bench-policy': { state: 'available' },
      'sandbox-db': {
        state: 'planned',
        reason: 'Persisted wage/receipt proof needs authorized Sandbox exercise',
      },
      connected: {
        state: 'planned',
        reason: 'Worker settlement proof awaits authorized connected stack',
      },
    },
    evidenceTier: ['bench-policy'],
    injectedFailure: 'duplicate-delivery with effectCount===1 (CH08/CH13)',
    automatedPassAllowed: false,
    searchTags: [
      'finite-activity',
      'clock-wait',
      'partial-shift',
      'duplicate-settlement',
    ],
  },
  {
    mechanicId: 'item-transfer-holder',
    name: 'Item holder transfer',
    invariant:
      'Same operationId+payload transfers once; body mismatch conflicts',
    owningSource:
      'packages/application/src/developer-tools/lab/lab-observation.ts#diffLabObservations',
    scenarioId: 'activity-clock-wait-eighty',
    scenarioVersion: 1,
    fixtureId: 'accepted-shift-eighty',
    lanes: {
      'bench-policy': { state: 'available' },
      'sandbox-db': {
        state: 'planned',
        reason: 'Persisted item receipt needs Sandbox materializer proof',
      },
    },
    evidenceTier: ['bench-policy'],
    injectedFailure: 'stale-revision / body-conflict on duplicate submission',
    automatedPassAllowed: false,
    searchTags: ['item-transfer', 'stale-version', 'duplicate-submission'],
  },
  {
    mechanicId: 'finite-action-overlap',
    name: 'Finite-action overlap eligibility',
    invariant: 'Intervening world obligation fails closed via real game policy',
    owningSource:
      'packages/game/src/immediate-actions.ts#actionOverlapEligibility',
    scenarioId: 'finite-action-overlap-eligibility',
    scenarioVersion: 1,
    fixtureId: 'overlap-and-check-smoke',
    lanes: {
      'bench-policy': { state: 'available' },
      'sandbox-db': {
        state: 'planned',
        reason: 'Persisted activity specimen arrives with CH04 materializer',
      },
    },
    evidenceTier: ['bench-policy'],
    injectedFailure: 'unsupported resolution kinds fail closed',
    automatedPassAllowed: false,
    searchTags: ['finite-action', 'overlap', 'eligibility'],
  },
  {
    mechanicId: 'activity-interrupt-same-tick',
    name: 'Same-tick activity interruption',
    invariant: 'Must use real activity admission authority when unblocked',
    owningSource: 'packages/game/src/activities.ts (no interrupt seam exported)',
    scenarioId: 'activity-interrupt-same-tick',
    scenarioVersion: 1,
    fixtureId: 'activity-interrupt-placeholder',
    lanes: {
      'bench-policy': {
        state: 'blocked',
        reason: 'No exported pure interrupt policy seam',
      },
      'sandbox-db': {
        state: 'blocked',
        reason: 'Depends on a real interrupt policy',
      },
      connected: {
        state: 'blocked',
        reason: 'Would falsely claim a mechanic the engine does not expose',
      },
    },
    evidenceTier: [],
    injectedFailure: null,
    automatedPassAllowed: false,
    searchTags: ['interrupt', 'same-tick', 'planned'],
  },
  {
    mechanicId: 'calendar-named-year',
    name: 'Named-year calendar projection',
    invariant: 'compileWorldDate projection is pure and seed-reproducible',
    owningSource: 'packages/game/src/calendar.ts#compileWorldDate',
    scenarioId: 'calendar-named-year-projection',
    scenarioVersion: 1,
    fixtureId: 'named-year-epoch-smoke',
    lanes: {
      'bench-policy': { state: 'available' },
    },
    evidenceTier: ['bench-policy'],
    injectedFailure: null,
    automatedPassAllowed: false,
    searchTags: ['calendar', 'named-year', 'nonhuman-time'],
  },
  {
    mechanicId: 'held-storyteller-packet',
    name: 'Held Storyteller packet capture',
    invariant: 'Held packet shows zero provider attempts and zero charge',
    owningSource:
      'packages/application/src/developer-tools/lab/packet-lab.ts#materializeHeldPacketEvidence',
    scenarioId: null,
    scenarioVersion: null,
    fixtureId: null,
    lanes: {
      'held-packet': { state: 'available' },
      'authorized-live': {
        state: 'blocked',
        reason: 'Live release requires fresh authorize/route/cap (CH14)',
      },
    },
    evidenceTier: ['held-packet'],
    injectedFailure: 'dispatch-tripwire on HTTP attempt',
    automatedPassAllowed: false,
    searchTags: ['packet', 'held', 'zero-call'],
  },
];

export function listMechanicsCoverage(): readonly MechanicsCoverageEntry[] {
  return COVERAGE;
}

export function searchMechanicsCoverage(
  term: string,
): MechanicsCoverageEntry[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [...COVERAGE];
  return COVERAGE.filter((entry) => {
    const haystack = [
      entry.mechanicId,
      entry.name,
      entry.invariant,
      entry.owningSource,
      entry.scenarioId ?? '',
      ...entry.searchTags,
    ]
      .join('\n')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function resolveRunnableCoverage(args: {
  mechanicId: string;
  lane: ChamberLabLane;
}):
  | {
      ok: true;
      entry: MechanicsCoverageEntry;
      scenarioId: string;
      scenarioVersion: number;
    }
  | { ok: false; reason: string; automatedPassAllowed: false } {
  const entry = COVERAGE.find((row) => row.mechanicId === args.mechanicId);
  if (!entry) {
    return {
      ok: false,
      reason: `Unknown mechanic ${args.mechanicId}`,
      automatedPassAllowed: false,
    };
  }
  const lane = entry.lanes[args.lane];
  if (!lane || lane.state !== 'available') {
    return {
      ok: false,
      reason:
        lane?.reason ??
        `Lane ${args.lane} is ${lane?.state ?? 'absent'} for ${args.mechanicId}`,
      automatedPassAllowed: false,
    };
  }
  if (!entry.scenarioId || !entry.scenarioVersion) {
    return {
      ok: false,
      reason: 'Coverage entry has no executable scenario id',
      automatedPassAllowed: false,
    };
  }
  const scenario = findChamberLabScenario(
    entry.scenarioId,
    entry.scenarioVersion,
  );
  if (!scenario) {
    return {
      ok: false,
      reason: `Scenario ${entry.scenarioId}@${entry.scenarioVersion} missing from lab catalogue`,
      automatedPassAllowed: false,
    };
  }
  return {
    ok: true,
    entry,
    scenarioId: entry.scenarioId,
    scenarioVersion: entry.scenarioVersion,
  };
}

/** Manual QA / planned entries never upgrade to automated passed. */
export function coverageCannotBecomeAutomatedPass(
  mechanicId: string,
): boolean {
  const entry = COVERAGE.find((row) => row.mechanicId === mechanicId);
  return entry ? entry.automatedPassAllowed === false : true;
}

export function assertCoverageScenariosExist(): void {
  for (const entry of COVERAGE) {
    if (!entry.scenarioId || !entry.scenarioVersion) continue;
    if (!findChamberLabScenario(entry.scenarioId, entry.scenarioVersion)) {
      throw new Error(
        `Coverage ${entry.mechanicId} points at missing scenario ${entry.scenarioId}@${entry.scenarioVersion}`,
      );
    }
  }
  void listChamberLabScenarios;
}
