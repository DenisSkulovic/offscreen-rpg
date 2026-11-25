import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/story-persistence/generations';
import {
  storytellerWriterChild,
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/story-persistence/storyteller';
import type { DocumentStore } from '@offscreen/documents';
import {
  joinWriterResearchParent,
  resolveWriterResearchJoinTarget,
  submitWriterResearchJoinNotice,
  type JoinWriterResearchParentResult,
} from '@offscreen/story-engine/storyteller';
import {
  runWriterResearchChildModelRound,
  writerResearchJoinOperationId,
} from '@offscreen/story-engine/storyteller';
import {
  writerMissionCaptureV3ContinuationSchema,
  type WriterMissionCapture,
} from '@offscreen/storyteller/tasks';

function createDocumentStoreLibraryReader(storage: DocumentStore) {
  return {
    readManifest: async () => {
      throw new Error('v1 manifest not supported for writer research worker');
    },
    readDocument: async (objectHash: string) => {
      const document = await storage.readDocument(objectHash);
      return {
        envelope: document.envelope,
        body: document.body,
      };
    },
    readSourcePassage: async (objectHash: string) => {
      const passage = await storage.readSourcePassage(objectHash);
      return {
        envelope: passage.envelope,
        content: passage.content,
      };
    },
    readLibraryRoot: (rootHash: string) => storage.readLibraryRoot(rootHash),
    readLibraryNode: (hash: string) => storage.readLibraryNode(hash),
  };
}

function scriptedResearchFixture(childId: string): string {
  return JSON.stringify({
    kind: 'final',
    result: {
      version: 'writer-research-result.v1',
      claims: [
        {
          text: `Fixture findings for ${childId.slice(0, 8)}`,
          evidence: [],
        },
      ],
      gaps: [],
      contradictions: [],
    },
  });
}

async function loadWriterMissionCapture(
  database: Database,
  missionId: string,
): Promise<WriterMissionCapture> {
  const [mission] = await database.db
    .select({ generationId: storytellerWriterMission.generationId })
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, missionId))
    .limit(1);
  if (!mission) {
    throw new Error('writer_research_mission_not_found');
  }
  const [row] = await database.db
    .select({ input: generation.input })
    .from(generation)
    .where(eq(generation.id, mission.generationId))
    .limit(1);
  const input = row?.input as { writerMissionCapture?: unknown } | undefined;
  const captureRaw = input?.writerMissionCapture;
  if (!captureRaw) {
    throw new Error('writer_research_capture_missing');
  }
  return writerMissionCaptureV3ContinuationSchema.parse(captureRaw);
}

async function resolveJoinTargetByOperationId(
  database: Database,
  joinOperationId: string,
): Promise<{ missionId: string; parentToolCallId: string }> {
  const groups = await database.db
    .selectDistinct({
      missionId: storytellerWriterChild.missionId,
      parentToolCallId: storytellerWriterChild.parentToolCallId,
    })
    .from(storytellerWriterChild);
  for (const group of groups) {
    if (
      writerResearchJoinOperationId(group.missionId, group.parentToolCallId) ===
      joinOperationId
    ) {
      return {
        missionId: group.missionId,
        parentToolCallId: group.parentToolCallId,
      };
    }
  }
  throw new Error('writer_research_join_target_not_found');
}

export async function runScriptedWriterResearchChild(
  database: Database,
  documentStore: DocumentStore | undefined,
  childId: string,
): Promise<void> {
  if (!documentStore) {
    throw new Error('writer_research_document_store_required');
  }
  const reader = createDocumentStoreLibraryReader(documentStore);
  const [child] = await database.db
    .select()
    .from(storytellerWriterChild)
    .where(eq(storytellerWriterChild.childId, childId))
    .limit(1);
  if (!child) {
    throw new Error('writer_research_child_not_found');
  }
  if (child.state === 'ready') {
    return;
  }
  const [modelStep] = await database.db
    .select()
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, child.missionId),
        eq(storytellerWriterStep.contextId, childId),
        eq(storytellerWriterStep.ordinal, 1),
        sql`${storytellerWriterStep.toolCallId} IS NULL`,
      ),
    )
    .limit(1);
  if (!modelStep) {
    throw new Error('writer_research_child_step_missing');
  }
  const round = await runWriterResearchChildModelRound(database, {
    childId,
    ordinal: 1,
    attemptId: randomUUID(),
    expectedRevision: modelStep.revision,
    reader,
    storage: documentStore,
    scriptedDecisionBody: scriptedResearchFixture(childId),
  });
  if (round.status !== 'research-ready') {
    throw new Error(`writer_research_child_not_ready:${round.status}`);
  }
  const target = resolveWriterResearchJoinTarget({
    missionId: child.missionId,
    parentToolCallId: child.parentToolCallId,
  });
  await database.db.transaction(async (tx) => {
    await submitWriterResearchJoinNotice(tx, target);
  });
}

export async function runWriterResearchParentJoin(
  database: Database,
  documentStore: DocumentStore | undefined,
  joinOperationId: string,
): Promise<JoinWriterResearchParentResult> {
  if (!documentStore) {
    throw new Error('writer_research_document_store_required');
  }
  const resolved = await resolveJoinTargetByOperationId(database, joinOperationId);
  const capture = await loadWriterMissionCapture(database, resolved.missionId);
  const reader = createDocumentStoreLibraryReader(documentStore);
  return joinWriterResearchParent(database, documentStore, {
    missionId: resolved.missionId,
    parentToolCallId: resolved.parentToolCallId,
    capture,
    access: { privateDocuments: false },
    reader,
  });
}