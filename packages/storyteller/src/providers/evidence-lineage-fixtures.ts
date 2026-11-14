import {
  createRequestAuditFixtureCases,
  type RequestAuditCaseId,
} from './request-audit-fixtures';
import {
  createStorytellerEvidenceLineage,
  type StorytellerEvidenceLineage,
} from './evidence-lineage';

export const evidenceLineageScenarioIds = [
  'gift-recall',
  'rumor-corrected',
  'selected-then-pruned',
  'ordinary-no-memory',
  'false-citation-rejected',
] as const;

export type EvidenceLineageScenarioId =
  (typeof evidenceLineageScenarioIds)[number];

export type EvidenceLineageFixture = Readonly<{
  id: EvidenceLineageScenarioId;
  lineage: StorytellerEvidenceLineage | null;
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
      return {
        id,
        rejected: false,
        rejectionMessage: null,
        lineage: createStorytellerEvidenceLineage({
          task,
          storedHandles: handles,
          eligibleHandles: handles,
          discoveredHandles: ['p1', gift, 'p10', 'p15'],
          exactLoadedHandles: ['p1', gift, 'p10', 'p15'],
          cited: { itemIds: [gift], sourceIds: [] },
          publication: {
            state: 'published',
            preservedHandles: [gift, 'p15'],
          },
        }),
      };
    }
    case 'rumor-corrected': {
      const task = caseTask('continuity-fifteen-turn');
      const rumor = 'p2';
      const correction = 'p10';
      const handles = passageHandles(task);
      return {
        id,
        rejected: false,
        rejectionMessage: null,
        lineage: createStorytellerEvidenceLineage({
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
            state: 'published',
            preservedHandles: [correction],
          },
        }),
      };
    }
    case 'selected-then-pruned': {
      const task = caseTask('continuity-fifteen-turn');
      const pruned = 'p2';
      const handles = passageHandles(task);
      return {
        id,
        rejected: false,
        rejectionMessage: null,
        lineage: createStorytellerEvidenceLineage({
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
          publication: { state: 'published', preservedHandles: ['p15'] },
        }),
      };
    }
    case 'ordinary-no-memory': {
      const task = caseTask('activity-consequence');
      const handles = passageHandles(task);
      return {
        id,
        rejected: false,
        rejectionMessage: null,
        lineage: createStorytellerEvidenceLineage({
          task,
          storedHandles: handles,
          eligibleHandles: handles,
          discoveredHandles: handles,
          exactLoadedHandles: handles,
          cited: { itemIds: [], sourceIds: [] },
          publication: {
            state: 'published',
            preservedHandles: handles,
          },
        }),
      };
    }
    case 'false-citation-rejected': {
      const task = caseTask('scene-continuation');
      let lineage: StorytellerEvidenceLineage | null = null;
      let rejected = false;
      let rejectionMessage: RegExp | null = /false citation/;
      try {
        lineage = createStorytellerEvidenceLineage({
          task,
          exactLoadedHandles: passageHandles(task),
          prunedFromFinal: [
            {
              handle: 'p7',
              reason: 'deliberately-pruned',
            },
          ],
          cited: { itemIds: ['p7'], sourceIds: [] },
          publication: { state: 'not-run' },
        });
      } catch (error) {
        rejected = error instanceof Error && /false citation/.test(error.message);
        if (!rejected) throw error;
      }
      return { id, lineage, rejected, rejectionMessage };
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
