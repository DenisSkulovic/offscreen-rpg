/**
 * CH10: bridge manual QA journeys to executable LabRun scenarios.
 * Does not rewrite historical QA journals or invent auto-pass.
 */
import {
  parseQaLabStageBinding,
  type ChamberLabLane,
  type LabRunEvidenceCapsule,
  type QaLabCatalogueEntry,
  type QaLabStageBinding,
} from '@offscreen/contracts/chamber-lab';
import { findQaJourneyCase, listQaJourneyCases } from '../qa-catalog.js';
import {
  findChamberLabScenario,
  listChamberLabScenarios,
  openChamberLabScenario,
} from '../chamber-lab-catalog.js';
import { createLabRun, type LabRunHandle } from './lab-run.js';
import { refuseManualAsMachineProof } from './lab-evidence.js';

export class QaLabBridgeError extends Error {
  constructor(
    readonly code:
      | 'no-binding'
      | 'not-executable'
      | 'missing-evidence'
      | 'evidence-mismatch'
      | 'manual-not-machine'
      | 'billable-offline'
      | 'unknown-case',
    message: string,
  ) {
    super(message);
    this.name = 'QaLabBridgeError';
  }
}

/**
 * Curated stage bindings — not a wholesale catalog rewrite.
 * Unlisted stages default to human-manual / non-executable.
 */
const CURATED_BINDINGS: readonly QaLabStageBinding[] = [
  parseQaLabStageBinding({
    qaCaseId: 'finite-action-overlap',
    qaCaseVersion: 3,
    stageId: 'early-preparation',
    kind: 'machine-scenario',
    assessment: 'structural',
    scenarioId: 'finite-action-overlap-eligibility',
    scenarioVersion: 1,
    lane: 'bench-policy',
    missingPrerequisites: [],
    executable: true,
  }),
  parseQaLabStageBinding({
    qaCaseId: 'finite-action-overlap',
    qaCaseVersion: 3,
    stageId: 'late-preparation',
    kind: 'machine-scenario',
    assessment: 'structural',
    scenarioId: 'finite-action-overlap-eligibility',
    scenarioVersion: 1,
    lane: 'bench-policy',
    missingPrerequisites: [],
    executable: true,
  }),
  parseQaLabStageBinding({
    qaCaseId: 'quiet-activity-lifecycle',
    qaCaseVersion: 1,
    stageId: 'start-microbe',
    kind: 'machine-scenario',
    assessment: 'structural',
    scenarioId: 'activity-clock-wait-eighty',
    scenarioVersion: 1,
    lane: 'bench-policy',
    missingPrerequisites: [],
    executable: true,
  }),
  parseQaLabStageBinding({
    qaCaseId: 'storyteller-contrast',
    qaCaseVersion: 1,
    stageId: 'run-profile-one',
    kind: 'human-manual',
    assessment: 'human-judgment',
    scenarioId: null,
    scenarioVersion: null,
    lane: null,
    missingPrerequisites: [
      'Narrative quality remains human-judgment with referenced evidence',
    ],
    executable: false,
  }),
  parseQaLabStageBinding({
    qaCaseId: 'conservative-live-quality-probe',
    qaCaseVersion: 1,
    stageId: 'dispatch',
    kind: 'unavailable',
    assessment: 'structural',
    scenarioId: null,
    scenarioVersion: null,
    lane: null,
    missingPrerequisites: [
      'Billable QA stays unavailable offline',
      'Live provider route and spend authorization required',
    ],
    executable: false,
  }),
];

function defaultBinding(args: {
  qaCaseId: string;
  qaCaseVersion: number;
  stageId: string;
  assessment: 'structural' | 'human-judgment';
}): QaLabStageBinding {
  return parseQaLabStageBinding({
    qaCaseId: args.qaCaseId,
    qaCaseVersion: args.qaCaseVersion,
    stageId: args.stageId,
    kind: 'human-manual',
    assessment: args.assessment,
    scenarioId: null,
    scenarioVersion: null,
    lane: null,
    missingPrerequisites: [
      'No curated LabRun binding; stage remains operator journal evidence',
    ],
    executable: false,
  });
}

export function listCuratedQaLabBindings(): readonly QaLabStageBinding[] {
  return CURATED_BINDINGS;
}

export function resolveQaStageBinding(args: {
  qaCaseId: string;
  qaCaseVersion: number;
  stageId: string;
}): QaLabStageBinding {
  const curated = CURATED_BINDINGS.find(
    (entry) =>
      entry.qaCaseId === args.qaCaseId &&
      entry.qaCaseVersion === args.qaCaseVersion &&
      entry.stageId === args.stageId,
  );
  if (curated) return curated;

  const journey = findQaJourneyCase(args.qaCaseId, args.qaCaseVersion);
  if (!journey) {
    throw new QaLabBridgeError(
      'unknown-case',
      `Unknown QA case ${args.qaCaseId}@${args.qaCaseVersion}`,
    );
  }
  const stage = journey.stages.find((entry) => entry.id === args.stageId);
  if (!stage) {
    throw new QaLabBridgeError(
      'no-binding',
      `Unknown stage ${args.stageId} on ${args.qaCaseId}`,
    );
  }
  return defaultBinding({
    qaCaseId: args.qaCaseId,
    qaCaseVersion: args.qaCaseVersion,
    stageId: args.stageId,
    assessment: stage.assessment,
  });
}

export function searchQaLabCatalogue(term: string): QaLabCatalogueEntry[] {
  const needle = term.trim().toLowerCase();
  const entries: QaLabCatalogueEntry[] = [];

  for (const journey of listQaJourneyCases()) {
    for (const stage of journey.stages) {
      const binding = resolveQaStageBinding({
        qaCaseId: journey.id,
        qaCaseVersion: journey.version,
        stageId: stage.id,
      });
      const haystack = [
        journey.id,
        journey.name,
        stage.id,
        stage.name,
        stage.action,
        binding.scenarioId ?? '',
      ]
        .join('\n')
        .toLowerCase();
      if (!needle || haystack.includes(needle)) {
        entries.push({
          entryKind: 'stage-instructions',
          qaCaseId: journey.id,
          qaCaseVersion: journey.version,
          stageId: stage.id,
          name: stage.name,
          costClass: journey.costClass,
          assessment: stage.assessment,
          binding,
        });
      }
    }
  }

  for (const scenario of listChamberLabScenarios()) {
    for (const [lane, availability] of Object.entries(
      scenario.availabilityPerLane,
    ) as [ChamberLabLane, { state: string }][]) {
      if (!availability) continue;
      const haystack = [
        scenario.id,
        scenario.name,
        scenario.family,
        ...scenario.searchTags,
        lane,
      ]
        .join('\n')
        .toLowerCase();
      if (!needle || haystack.includes(needle)) {
        entries.push({
          entryKind: 'runnable-scenario',
          scenarioId: scenario.id,
          scenarioVersion: scenario.version,
          name: scenario.name,
          lane,
          costClass: scenario.costClass,
          availability: availability.state as 'available' | 'blocked' | 'planned',
        });
      }
    }
  }

  return entries;
}

export function openLabRunForQaStage(args: {
  qaCaseId: string;
  qaCaseVersion: number;
  stageId: string;
  seed?: number;
  gitCommit?: string;
  dirty?: boolean;
}): { binding: QaLabStageBinding; run: LabRunHandle } {
  const journey = findQaJourneyCase(args.qaCaseId, args.qaCaseVersion);
  if (journey && journey.costClass !== 'offline') {
    throw new QaLabBridgeError(
      'billable-offline',
      'Billable QA stays unavailable offline',
    );
  }
  const binding = resolveQaStageBinding(args);
  if (binding.kind !== 'machine-scenario' || !binding.executable) {
    throw new QaLabBridgeError(
      'not-executable',
      `Stage ${args.stageId} is ${binding.kind}; missing: ${binding.missingPrerequisites.join('; ') || 'n/a'}`,
    );
  }
  if (!binding.scenarioId || !binding.scenarioVersion || !binding.lane) {
    throw new QaLabBridgeError(
      'not-executable',
      'Binding lacks scenario/lane',
    );
  }
  const opened = openChamberLabScenario({
    id: binding.scenarioId,
    version: binding.scenarioVersion,
    lane: binding.lane,
  });
  if (!opened.ok) {
    throw new QaLabBridgeError('not-executable', opened.reason);
  }
  const run = createLabRun({
    lane: binding.lane,
    seed: args.seed ?? 141,
    scenarioId: binding.scenarioId,
    scenarioVersion: binding.scenarioVersion,
    ...(args.gitCommit !== undefined ? { gitCommit: args.gitCommit } : {}),
    ...(args.dirty !== undefined ? { dirty: args.dirty } : {}),
  });
  return { binding, run };
}

/**
 * Machine structural pass requires a matching successful LabRun capsule.
 * Operator-selected strings never become automated proof.
 */
export function claimStructuralMachinePass(args: {
  binding: QaLabStageBinding;
  capsule: LabRunEvidenceCapsule | null;
  operatorSelectedPass?: boolean;
}): {
  passed: boolean;
  evidenceId: string;
  proofBoundary: 'bench-policy' | 'sandbox-db';
} {
  if (args.binding.assessment === 'human-judgment') {
    refuseManualAsMachineProof({ qaDisposition: 'passed' });
  }
  if (args.binding.kind !== 'machine-scenario' || !args.binding.executable) {
    throw new QaLabBridgeError(
      'not-executable',
      'Cannot claim machine pass without an executable binding',
    );
  }
  if (args.operatorSelectedPass === true && !args.capsule) {
    throw new QaLabBridgeError(
      'missing-evidence',
      'Operator-selected pass is rejected without a matching LabRun capsule',
    );
  }
  if (!args.capsule) {
    throw new QaLabBridgeError(
      'missing-evidence',
      'Structural machine pass requires finalized LabRun evidence',
    );
  }
  if (args.capsule.authority !== 'lab-run-machine') {
    throw new QaLabBridgeError(
      'evidence-mismatch',
      'QA human journal cannot satisfy machine structural pass',
    );
  }
  if (
    args.binding.scenarioId &&
    args.capsule.scenarioId &&
    args.capsule.scenarioId !== args.binding.scenarioId
  ) {
    throw new QaLabBridgeError(
      'evidence-mismatch',
      `Capsule scenario ${args.capsule.scenarioId} does not match binding ${args.binding.scenarioId}`,
    );
  }
  if (
    args.capsule.status !== 'completed' &&
    args.capsule.status !== 'paused'
  ) {
    throw new QaLabBridgeError(
      'evidence-mismatch',
      `Capsule status ${args.capsule.status} is not a successful machine pass`,
    );
  }
  const failedAssert = args.capsule.assertionResults.some(
    (result) => result.passed === false,
  );
  if (failedAssert) {
    throw new QaLabBridgeError(
      'evidence-mismatch',
      'Capsule contains failed structural assertions',
    );
  }
  return {
    passed: true,
    evidenceId: args.capsule.evidenceId,
    proofBoundary:
      args.binding.lane === 'sandbox-db' ? 'sandbox-db' : 'bench-policy',
  };
}

export function describeQaLabBridgeForCase(args: {
  qaCaseId: string;
  qaCaseVersion: number;
}) {
  const journey = findQaJourneyCase(args.qaCaseId, args.qaCaseVersion);
  if (!journey) {
    throw new QaLabBridgeError(
      'unknown-case',
      `Unknown QA case ${args.qaCaseId}@${args.qaCaseVersion}`,
    );
  }
  return {
    qaCaseId: journey.id,
    qaCaseVersion: journey.version,
    costClass: journey.costClass,
    automatedPassAllowed: false as const,
    stages: journey.stages.map((stage) =>
      resolveQaStageBinding({
        qaCaseId: journey.id,
        qaCaseVersion: journey.version,
        stageId: stage.id,
      }),
    ),
  };
}

/** Scenario used by quiet-activity structural binding; must exist in catalogue. */
export function assertActivityScenarioRegistered(): void {
  const scenario = findChamberLabScenario('activity-clock-wait-eighty', 1);
  if (!scenario) {
    throw new Error(
      'activity-clock-wait-eighty@1 missing from chamber lab catalogue',
    );
  }
}
