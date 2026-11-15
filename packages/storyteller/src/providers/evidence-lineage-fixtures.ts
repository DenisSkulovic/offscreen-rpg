import {
  createRequestAuditFixtureCases,
  type RequestAuditCaseId,
} from './request-audit-fixtures';
import {
  createStorytellerEvidenceLineage,
  createStorytellerEvidenceLineageV2,
  type StorytellerEvidenceLineage,
  type StorytellerEvidenceLineageV2,
} from './evidence-lineage';

export const evidenceLineageScenarioIds = [
  'gift-recall',
  'rumor-corrected',
  'selected-then-pruned',
  'ordinary-no-memory',
  'false-citation-rejected',
  'packet-included-uncited',
] as const;

export type EvidenceLineageScenarioId =
  (typeof evidenceLineageScenarioIds)[number];

export type EvidenceLineageFixture = Readonly<{
  id: EvidenceLineageScenarioId;
  lineage: StorytellerEvidenceLineage | null;
  lineageV2: StorytellerEvidenceLineageV2 | null;
  rejected: boolean;
  rejectionMessage: RegExp | null;
}>;

/**
 * Deterministic SA05 fixtures. Gift/rumor paths reuse continuity audit tasks;
 * false citation expects lineage construction to throw.
 */
export function createEvidenceLineageFixtures(input?: {
  scenarioIds?: readonly EvidenceLineageScenarioId[];
}): readonly EvidenceLineageFixture[] {
  const selected = input?.scenarioIds ?? evidenceLineageScenarioIds;
  return selected.map((id) => build(id));
}

function build(id: EvidenceLineageScenarioId): EvidenceLineageFixture {
  switch (id) {
    case 'gift-recall': {
      const task = caseTask('continuity-fifteen-turn');
      const gift = 'p6';
      const handles = passageHandles(task);
      const input = {
        task,
        storedHandles: handles,
        eligibleHandles: handles,
        discoveredHandles: ['p1', gift, 'p10', 'p15'],
        exactLoadedHandles: ['p1', gift, 'p10', 'p15'],
        cited: { itemIds: [gift], sourceIds: [] },
        publication: {
          state: 'published' as const,
          preservedHandles: [gift, 'p15'],
        },
      };
      return {
        id,
        rejected: false,
        rejectionMessage: null,
        lineage: createStorytellerEvidenceLineage(input),
        lineageV2: createStorytellerEvidenceLineageV2(input),
      };
    }
    case 'rumor-corrected': {
      const task = caseTask('continuity-fifteen-turn');
      const rumor = 'p2';
      const correction = 'p10';
      const handles = passageHandles(task);
      const input = {
        task,
        storedHandles: handles,
        eligibleHandles: handles,
        discoveredHandles: [rumor, correction, 'p15'],
        exactLoadedHandles: [rumor, correction, 'p15'],
        prunedFromFinal: [
          {
            handle: rumor,
            reason: 'superseded-rumor-pruned-from-final-packet',
          },
        ],
        cited: { itemIds: [correction], sourceIds: [] },
        publication: {
          state: 'published' as const,
          preservedHandles: [correction],
        },
      };
      return {
        id,
        rejected: false,
        rejectionMessage: null,
        lineage: createStorytellerEvidenceLineage(input),
        lineageV2: createStorytellerEvidenceLineageV2(input),
      };
    }
    case 'selected-then-pruned': {
      const task = caseTask('continuity-fifteen-turn');
      const pruned = 'p2';
      const handles = passageHandles(task);
      const input = {
        task,
        storedHandles: handles,
        eligibleHandles: handles,
        discoveredHandles: handles,
        exactLoadedHandles: handles,
        prunedFromFinal: [
          {
            handle: pruned,
            reason: 'loaded-then-pruned-from-final-packet',
          },
        ],
        cited: { itemIds: [], sourceIds: [] },
        publication: {
          state: 'published' as const,
          preservedHandles: ['p15'],
        },
      };
      return {
        id,
        rejected: false,
        rejectionMessage: null,
        lineage: createStorytellerEvidenceLineage(input),
        lineageV2: createStorytellerEvidenceLineageV2(input),
      };
    }
    case 'ordinary-no-memory': {
      const task = caseTask('activity-consequence');
      const handles = passageHandles(task);
      const input = {
        task,
        storedHandles: handles,
        eligibleHandles: handles,
        discoveredHandles: handles,
        exactLoadedHandles: handles,
        cited: { itemIds: [], sourceIds: [] },
        publication: {
          state: 'published' as const,
          preservedHandles: handles,
        },
      };
      return {
        id,
        rejected: false,
        rejectionMessage: null,
        lineage: createStorytellerEvidenceLineage(input),
        lineageV2: createStorytellerEvidenceLineageV2(input),
      };
    }
    case 'packet-included-uncited': {
      const task = caseTask('continuity-fifteen-turn');
      const included = 'p15';
      const handles = passageHandles(task);
      const input = {
        task,
        storedHandles: handles,
        eligibleHandles: handles,
        discoveredHandles: [included],
        exactLoadedHandles: [included],
        cited: { itemIds: [], sourceIds: [] },
        publication: {
          state: 'published' as const,
          preservedHandles: [included],
        },
      };
      return {
        id,
        rejected: false,
        rejectionMessage: null,
        lineage: createStorytellerEvidenceLineage(input),
        lineageV2: createStorytellerEvidenceLineageV2(input),
      };
    }
    case 'false-citation-rejected': {
      const task = caseTask('scene-continuation');
      let lineage: StorytellerEvidenceLineage | null = null;
      let lineageV2: StorytellerEvidenceLineageV2 | null = null;
      let rejected = false;
      let rejectionMessage: RegExp | null = /false citation/;
      const input = {
        task,
        exactLoadedHandles: passageHandles(task),
        prunedFromFinal: [
          {
            handle: 'p7',
            reason: 'deliberately-pruned',
          },
        ],
        cited: { itemIds: ['p7'], sourceIds: [] },
        publication: { state: 'not-run' as const },
      };
      try {
        lineage = createStorytellerEvidenceLineage(input);
      } catch (error) {
        rejected = error instanceof Error && /false citation/.test(error.message);
        if (!rejected) throw error;
      }
      try {
        lineageV2 = createStorytellerEvidenceLineageV2(input);
      } catch (error) {
        const v2Rejected =
          error instanceof Error && /false citation/.test(error.message);
        rejected = rejected || v2Rejected;
        if (!v2Rejected && !(error instanceof Error && /false citation/.test(error.message))) {
          throw error;
        }
      }
      return { id, lineage, lineageV2, rejected, rejectionMessage };
    }
    default: {
      const exhaustive: never = id;
      throw new Error(`Unknown evidence-lineage scenario: ${exhaustive}`);
    }
  }
}

function caseTask(id: RequestAuditCaseId) {
  const [entry] = createRequestAuditFixtureCases({ caseIds: [id] });
  if (!entry) throw new Error(`Missing request-audit fixture ${id}`);
  return entry.task;
}

function passageHandles(task: {
  context: { evidence: ReadonlyArray<{ sequence: number }> };
}) {
  return task.context.evidence.map((passage) => `p${passage.sequence}`);
}
