import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import type { Transaction } from '@offscreen/db/outbox';
import { sql } from 'drizzle-orm';
import {
  storytellerWriterChild,
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/story-persistence/storyteller';
import { defaultWriterContextId } from './writer-child-custody';
import type { WriterMissionCapture } from '@offscreen/storyteller/tasks';

type WriterMissionBudgetSnapshot = WriterMissionCapture['budgets'];

export type WriterMissionRowInsert = {
  missionId: string;
  generationId: string;
  operationId: string;
  ownerId: string;
  storyId: string;
  captureSha256: string;
  libraryRootHash: string;
  libraryRootRevision: number;
  stageRootHash?: string | null;
  stageRootRevision?: number | null;
  nextRevision?: number;
  state?:
    | 'captured'
    | 'active'
    | 'proposal-ready'
    | 'held'
    | 'failed'
    | 'uncertain';
  budgetSnapshot: WriterMissionBudgetSnapshot;
};

export type WriterMissionParentStepInsert = {
  ordinal: number;
  requestCasHash: string;
  resultCasHash?: string | null;
  responseObjectHash?: string | null;
  attemptId?: string | null;
  toolCallId?: string | null;
  revision: number;
  state:
    | 'captured'
    | 'model-request-prepared'
    | 'attempt-reserved'
    | 'dispatched'
    | 'result-settled'
    | 'tools-applied'
    | 'proposal-ready'
    | 'held'
    | 'failed'
    | 'uncertain';
};

/** Inserts one mission row and one parent step (contextId = missionId). */
export async function insertWriterMissionParentStepInTransaction(
  tx: Transaction,
  mission: WriterMissionRowInsert,
  step: WriterMissionParentStepInsert,
) {
  await tx.insert(storytellerWriterMission).values({
    id: mission.missionId,
    generationId: mission.generationId,
    operationId: mission.operationId,
    ownerId: mission.ownerId,
    storyId: mission.storyId,
    captureSha256: mission.captureSha256,
    libraryRootHash: mission.libraryRootHash,
    libraryRootRevision: mission.libraryRootRevision,
    stageRootHash: mission.stageRootHash ?? null,
    stageRootRevision: mission.stageRootRevision ?? null,
    nextRevision: mission.nextRevision ?? 1,
    state: mission.state ?? 'captured',
    budgetSnapshot: mission.budgetSnapshot,
  });
  await tx.insert(storytellerWriterStep).values({
    missionId: mission.missionId,
    contextId: mission.missionId,
    ordinal: step.ordinal,
    attemptId: step.attemptId ?? null,
    toolCallId: step.toolCallId ?? null,
    requestCasHash: step.requestCasHash,
    resultCasHash: step.resultCasHash ?? null,
    responseObjectHash: step.responseObjectHash ?? null,
    revision: step.revision,
    state: step.state,
  });
}

/** Inserts one mission row and one parent step (contextId = missionId). */
export async function insertWriterMissionParentStep(
  database: Database,
  mission: WriterMissionRowInsert,
  step: WriterMissionParentStepInsert,
) {
  await database.db.transaction(async (tx) => {
    await insertWriterMissionParentStepInTransaction(tx, mission, step);
  });
}

/** Replays stored request/result CAS hashes for one context-local step ordinal. */
export async function replayWriterMissionParentStepHashes(
  database: Database,
  missionId: string,
  ordinal: number,
  contextId?: string,
) {
  const resolvedContextId = defaultWriterContextId(missionId, contextId);
  const rows = await database.db
    .select({
      requestCasHash: storytellerWriterStep.requestCasHash,
      resultCasHash: storytellerWriterStep.resultCasHash,
    })
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, resolvedContextId),
        eq(storytellerWriterStep.ordinal, ordinal),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new Error('writer_mission_step_not_found');
  }
  return {
    requestCasHash: row.requestCasHash,
    resultCasHash: row.resultCasHash,
  };
}

export type WriterResearchChildRowInsert = {
  childId: string;
  parentToolCallId: string;
  childOrdinal: number;
  question: string;
  requestSha256: string;
  rootHash: string;
  rootRevision: number;
  toolAllowlist: string[];
  skillHashes: string[];
  policy: typeof storytellerWriterChild.$inferInsert.policy;
  maxMicrousd: number;
  state?: typeof storytellerWriterChild.$inferInsert.state;
};

/** Inserts one child registry row and one prepared model step at context-local ordinal 1. */
export async function insertWriterResearchChildStepInTransaction(
  tx: Transaction,
  missionId: string,
  child: WriterResearchChildRowInsert,
  step: WriterMissionParentStepInsert,
) {
  await tx.insert(storytellerWriterChild).values({
    childId: child.childId,
    missionId,
    parentToolCallId: child.parentToolCallId,
    childOrdinal: child.childOrdinal,
    question: child.question,
    requestSha256: child.requestSha256,
    rootHash: child.rootHash,
    rootRevision: child.rootRevision,
    toolAllowlist: child.toolAllowlist,
    skillHashes: child.skillHashes,
    policy: child.policy,
    maxMicrousd: child.maxMicrousd,
    state: child.state ?? 'pending',
  });
  await tx.insert(storytellerWriterStep).values({
    missionId,
    contextId: child.childId,
    ordinal: step.ordinal,
    attemptId: step.attemptId ?? null,
    toolCallId: step.toolCallId ?? null,
    requestCasHash: step.requestCasHash,
    resultCasHash: step.resultCasHash ?? null,
    responseObjectHash: step.responseObjectHash ?? null,
    revision: step.revision,
    state: step.state,
  });
  await tx
    .update(storytellerWriterMission)
    .set({
      nextRevision: sql`GREATEST(${storytellerWriterMission.nextRevision}, ${step.ordinal + 1})`,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(eq(storytellerWriterMission.id, missionId));
}