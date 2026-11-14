import {
  createRequestAuditFixtureCases,
  type RequestAuditCaseId,
} from './request-audit-fixtures';
import {
  createStorytellerOperationTrace,
  type StorytellerOperationTrace,
} from './operation-trace';

export const operationTraceScenarioIds = [
  'opening',
  'ordinary-consequence',
  'memory-exploration',
  'historical-report',
  'failed-uncertain',
  'stale-publication',
  'interrupted-generation',
  'loaded-then-omitted',
  'duplicate-delivery',
] as const;

export type OperationTraceScenarioId =
  (typeof operationTraceScenarioIds)[number];

const STORY_A = '00000000-0000-4000-8000-000000000030';
const STORY_B = '00000000-0000-4000-8000-000000000099';
const MEMORY_SOURCE = 'x1';

function caseById(id: RequestAuditCaseId) {
  const [entry] = createRequestAuditFixtureCases({ caseIds: [id] });
  if (!entry) throw new Error(`Missing request-audit fixture ${id}`);
  return entry;
}

/**
 * Provider-free fixture operations covering SA01 normal and negative edges.
 * Memory exploration synthesizes request→read→final spans without SQL/provider I/O.
 */
export function createOperationTraceFixtureTraces(input?: {
  scenarioIds?: readonly OperationTraceScenarioId[];
}): ReadonlyArray<{
  id: OperationTraceScenarioId;
  foreignStoryId: string;
  trace: StorytellerOperationTrace;
}> {
  const selected = input?.scenarioIds ?? operationTraceScenarioIds;
  return selected.map((id) => ({
    id,
    foreignStoryId: STORY_B,
    trace: buildScenario(id),
  }));
}

function buildScenario(id: OperationTraceScenarioId): StorytellerOperationTrace {
  switch (id) {
    case 'opening': {
      const { task } = caseById('opening-narrative');
      return createStorytellerOperationTrace({
        id: 'opening',
        storyId: '00000000-0000-4000-8000-000000000020',
        purposeLabel: 'opening narrative (simulated)',
        task,
        providerMode: 'simulated',
        reads: { count: 0, bytes: 0, timeMs: 0 },
        publication: {
          state: 'published',
          reason: 'fixture opening published',
          publishedPassageId: '00000000-0000-4000-8000-000000000010',
        },
        validation: {
          status: 'completed',
          summary: 'opening result validated',
        },
        stateTransitions: ['admitted', 'task-captured', 'published'],
      });
    }
    case 'ordinary-consequence': {
      const { task } = caseById('activity-consequence');
      return createStorytellerOperationTrace({
        id: 'ordinary-consequence',
        storyId: STORY_A,
        purposeLabel: 'ordinary single-shot consequence',
        task,
        providerMode: 'simulated',
        recipeVersion: 'single-turn.v1',
        reads: { count: 0, bytes: 0, timeMs: 0 },
        rounds: [
          {
            kind: 'final',
            status: 'completed',
            summary: 'single-shot consequence packet',
            paid: false,
          },
        ],
        publication: {
          state: 'published',
          reason: 'consequence published',
          publishedPassageId: '00000000-0000-4000-8000-000000000010',
        },
        validation: {
          status: 'completed',
          summary: 'consequence validated',
        },
      });
    }
    case 'memory-exploration': {
      // Packet body reuses the continuation fixture; recipe/rounds are traced
      // as a simulated memory-exploration.v1 lifecycle (no SQL/provider I/O).
      const { task } = caseById('scene-continuation');
      return createStorytellerOperationTrace({
        id: 'memory-exploration',
        storyId: STORY_A,
        purposeLabel: 'memory exploration request→read→final',
        task,
        providerMode: 'simulated',
        recipeVersion: 'memory-exploration.v1',
        sources: {
          requiredHandles: ['p7'],
          selectedHandles: ['p7', MEMORY_SOURCE],
          loadedHandles: ['p7', MEMORY_SOURCE],
          omitted: [],
          finalIncludedHandles: ['p7', MEMORY_SOURCE],
        },
        reads: { count: 1, bytes: 256, timeMs: 4 },
        rounds: [
          {
            kind: 'decision',
            status: 'completed',
            summary: 'needs_context → read_memory',
            paid: false,
          },
          {
            kind: 'final',
            status: 'completed',
            summary: `final packet includes ${MEMORY_SOURCE}`,
            paid: false,
          },
        ],
        publication: {
          state: 'published',
          reason: 'memory-backed continuation published',
          publishedPassageId: '00000000-0000-4000-8000-000000000010',
        },
        validation: {
          status: 'completed',
          summary: 'final candidate validated',
        },
        stateTransitions: [
          'admitted',
          'decision-round',
          'exact-read',
          'final-round',
          'published',
        ],
      });
    }
    case 'historical-report': {
      const { task } = caseById('history-report');
      return createStorytellerOperationTrace({
        id: 'historical-report',
        storyId: STORY_A,
        purposeLabel: 'historical report (non-current)',
        task,
        providerMode: 'simulated',
        reads: { count: 0, bytes: 0, timeMs: 0 },
        publication: {
          state: 'published',
          reason: 'report attached to historical hook; current scene unchanged',
          publishedPassageId: null,
        },
        validation: {
          status: 'completed',
          summary: 'report validated',
        },
      });
    }
    case 'failed-uncertain': {
      const { task } = caseById('scene-continuation');
      return createStorytellerOperationTrace({
        id: 'failed-uncertain',
        storyId: STORY_A,
        purposeLabel: 'failed/uncertain generation',
        task,
        providerMode: 'simulated',
        rounds: [
          {
            kind: 'final',
            status: 'uncertain',
            summary: 'provider attempt unsettled',
            paid: false,
          },
        ],
        validation: {
          status: 'not-run',
          summary: 'validation skipped while uncertain',
        },
        publication: {
          state: 'uncertain',
          reason: 'no publication while attempt unsettled',
          publishedPassageId: null,
        },
        cost: {
          settledMicrousd: null,
          uncertainReservationMicrousd: '12',
          providerDurationMs: null,
        },
        missingStages: ['providerDurationMs'],
      });
    }
    case 'stale-publication': {
      const { task } = caseById('scene-continuation');
      return createStorytellerOperationTrace({
        id: 'stale-publication',
        storyId: STORY_A,
        purposeLabel: 'stale publication fence',
        task,
        providerMode: 'simulated',
        sourceRevision: 7,
        rounds: [
          {
            kind: 'final',
            status: 'completed',
            summary: 'valid packet against superseded revision',
            paid: false,
          },
        ],
        validation: {
          status: 'completed',
          summary: 'result shape valid',
        },
        publication: {
          state: 'stale-refused',
          reason: 'narrative revision superseded; publication fenced',
          publishedPassageId: null,
        },
      });
    }
    case 'interrupted-generation': {
      const { task } = caseById('scene-continuation');
      return createStorytellerOperationTrace({
        id: 'interrupted-generation',
        storyId: STORY_A,
        purposeLabel: 'interrupted before publication',
        task,
        providerMode: 'not-run',
        transportPerformed: false,
        rounds: [
          {
            kind: 'final',
            status: 'interrupted',
            summary: 'generation interrupted before provider round',
            paid: false,
          },
        ],
        validation: {
          status: 'not-run',
          summary: 'no result to validate',
        },
        publication: {
          state: 'interrupted',
          reason: 'interrupted generation has no published scene',
          publishedPassageId: null,
        },
      });
    }
    case 'loaded-then-omitted': {
      const { task } = caseById('continuity-fifteen-turn');
      const loaded = task.context.evidence.map(
        (passage) => `p${passage.sequence}`,
      );
      const omittedHandle = 'p2';
      return createStorytellerOperationTrace({
        id: 'loaded-then-omitted',
        storyId: '00000000-0000-4000-8000-000000000040',
        purposeLabel: 'source loaded then omitted from final packet',
        task,
        providerMode: 'simulated',
        sources: {
          requiredHandles: ['p1', 'p6', 'p10', 'p15'],
          selectedHandles: loaded,
          loadedHandles: loaded,
          omitted: [
            {
              handle: omittedHandle,
              reason: 'loaded-then-pruned-from-final-packet',
            },
          ],
          finalIncludedHandles: loaded.filter(
            (handle) => handle !== omittedHandle,
          ),
        },
        reads: { count: 0, bytes: 0, timeMs: 0 },
        publication: {
          state: 'published',
          reason: 'continuation published without omitted handle',
          publishedPassageId: task.context.current?.id ?? null,
        },
        validation: {
          status: 'completed',
          summary: 'validated without omitted source body',
        },
      });
    }
    case 'duplicate-delivery': {
      const { task } = caseById('activity-consequence');
      return createStorytellerOperationTrace({
        id: 'duplicate-delivery',
        storyId: STORY_A,
        purposeLabel: 'duplicate delivery replay',
        task,
        providerMode: 'simulated',
        rounds: [
          {
            kind: 'final',
            status: 'completed',
            summary: 'first settled final round',
            paid: false,
          },
          {
            kind: 'duplicate-delivery',
            status: 'replayed',
            summary: 'replay uses saved result; no new paid round',
            paid: false,
          },
        ],
        publication: {
          state: 'published',
          reason: 'idempotent publication of saved result',
          publishedPassageId: '00000000-0000-4000-8000-000000000010',
        },
        validation: {
          status: 'completed',
          summary: 'saved result reused',
        },
        cost: {
          settledMicrousd: null,
          uncertainReservationMicrousd: null,
          providerDurationMs: null,
        },
      });
    }
    default: {
      const exhaustive: never = id;
      throw new Error(`Unknown operation-trace scenario: ${exhaustive}`);
    }
  }
}

export { STORY_A as operationTraceStoryA, STORY_B as operationTraceStoryB };
