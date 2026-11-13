/**
 * CH16: replay manifests and semantic comparison across LabRun evidence.
 */
import { diffLabObservations } from './lab-observation.js';
import type {
  LabObservation,
  LabRunEvidenceCapsule,
  LabSemanticDelta,
} from '@offscreen/contracts/chamber-lab';

export class ReplayCompareError extends Error {
  constructor(
    readonly code:
      | 'fixture-mismatch'
      | 'lane-disabled'
      | 'provider-hidden'
      | 'invariant-unsatisfied'
      | 'schema-stale',
    message: string,
  ) {
    super(message);
    this.name = 'ReplayCompareError';
  }
}

export type ReplayManifest = {
  scenarioId: string;
  scenarioVersion: number;
  fixtureHash: string | null;
  seed: number;
  lane: LabRunEvidenceCapsule['lane'];
  steps: unknown[];
  faultHash: string | null;
};

export function extractReplayManifest(
  capsule: LabRunEvidenceCapsule,
): ReplayManifest {
  if (!capsule.scenarioId || !capsule.scenarioVersion) {
    throw new ReplayCompareError(
      'schema-stale',
      'Evidence capsule missing scenario identity for replay',
    );
  }
  return {
    scenarioId: capsule.scenarioId,
    scenarioVersion: capsule.scenarioVersion,
    fixtureHash: capsule.fixtureHash,
    seed: capsule.seed,
    lane: capsule.lane,
    steps: capsule.steps,
    faultHash: capsule.faultHash,
  };
}

export function assertReplayCompatible(args: {
  manifest: ReplayManifest;
  actualFixtureHash: string | null;
  laneEnabled: boolean;
  providerAttempted?: boolean;
}): void {
  if (!args.laneEnabled) {
    throw new ReplayCompareError(
      'lane-disabled',
      `Lane ${args.manifest.lane} is not enabled for replay`,
    );
  }
  if (args.providerAttempted === true) {
    throw new ReplayCompareError(
      'provider-hidden',
      'Replay refused: hidden provider attempt detected',
    );
  }
  if (
    args.manifest.fixtureHash &&
    args.actualFixtureHash &&
    args.manifest.fixtureHash !== args.actualFixtureHash
  ) {
    throw new ReplayCompareError(
      'fixture-mismatch',
      'Stale fixture hash refuses silent replay under same evidence id',
    );
  }
}

export type MechanicalCompareResult = {
  equal: boolean;
  delta: LabSemanticDelta | null;
  normalizedPaths: string[];
  invariantId: string;
  passed: boolean;
  subjectiveExcluded: true;
};

export function compareMechanicalRuns(args: {
  before: LabObservation;
  after: LabObservation;
  invariantId: string;
  /** Paths that must remain unchanged for the invariant. */
  mustUnchanged?: string[];
  /** Paths expected to change. */
  mustChange?: string[];
}): MechanicalCompareResult {
  const delta = diffLabObservations({
    before: args.before,
    after: args.after,
    normalizeVolatile: true,
  });
  const mustUnchanged = args.mustUnchanged ?? [];
  const mustChange = args.mustChange ?? [];
  for (const path of mustUnchanged) {
    if (delta.changes.some((change) => change.path === path)) {
      throw new ReplayCompareError(
        'invariant-unsatisfied',
        `Invariant ${args.invariantId} expected ${path} unchanged`,
      );
    }
  }
  for (const path of mustChange) {
    if (!delta.changes.some((change) => change.path === path)) {
      throw new ReplayCompareError(
        'invariant-unsatisfied',
        `Invariant ${args.invariantId} expected ${path} to change`,
      );
    }
  }
  const passed =
    mustUnchanged.every((path) => delta.unchanged.includes(path)) &&
    mustChange.every((path) =>
      delta.changes.some((change) => change.path === path),
    );
  return {
    equal: delta.changes.length === 0,
    delta,
    normalizedPaths: delta.normalizedForComparison
      ? delta.unchanged
      : [],
    invariantId: args.invariantId,
    passed,
    subjectiveExcluded: true,
  };
}

export type CriterionStatus = 'demonstrated' | 'blocked' | 'design-only';

export type LabCriterionEvidence = {
  id: string;
  status: CriterionStatus;
  note: string;
};

/** Honest C01–C16 map for provider-free laboratory proof. */
export function mapChamberCriteriaEvidence(): LabCriterionEvidence[] {
  return [
    { id: 'C01', status: 'demonstrated', note: 'Typed scenario catalogue' },
    { id: 'C02', status: 'demonstrated', note: 'Bench pure policy runner' },
    { id: 'C03', status: 'demonstrated', note: 'Fixture specimens + hash' },
    {
      id: 'C04',
      status: 'blocked',
      note: 'Live Sandbox provision gated; memory materialize proven',
    },
    { id: 'C05', status: 'demonstrated', note: 'Labeled clocks/entropy' },
    { id: 'C06', status: 'demonstrated', note: 'LabRun step orchestrator' },
    { id: 'C07', status: 'demonstrated', note: 'Observations/deltas' },
    { id: 'C08', status: 'demonstrated', note: 'Fault cut points (fake adapters)' },
    { id: 'C09', status: 'demonstrated', note: 'Evidence capsules' },
    { id: 'C10', status: 'demonstrated', note: 'QA/LabRun bridge' },
    { id: 'C11', status: 'demonstrated', note: 'Workbench + lab routes' },
    { id: 'C12', status: 'demonstrated', note: 'Cheap CLI modes' },
    {
      id: 'C13',
      status: 'blocked',
      note: 'Connected live Nest/Temporal boot gated; fake-offline proven',
    },
    { id: 'C14', status: 'demonstrated', note: 'Held packet lab evidence' },
    { id: 'C15', status: 'demonstrated', note: 'Mechanics coverage registry' },
    { id: 'C16', status: 'demonstrated', note: 'Replay/compare + criteria map' },
  ];
}
