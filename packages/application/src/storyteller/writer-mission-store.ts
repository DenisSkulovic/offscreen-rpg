import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/db/storyteller-schema';
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
export async function insertWriterMissionParentStep(
  database: Database,
  mission: WriterMissionRowInsert,
  step: WriterMissionParentStepInsert,
) {
  await database.db.transaction(async (tx) => {
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
      revision: step.revision,
      state: step.state,
    });
  });
}

/** Replays stored request/result CAS hashes for one parent step ordinal. */
export async function replayWriterMissionParentStepHashes(
  database: Database,
  missionId: string,
  ordinal: number,
) {
  const rows = await database.db
    .select({
      requestCasHash: storytellerWriterStep.requestCasHash,
      resultCasHash: storytellerWriterStep.resultCasHash,
    })
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, missionId),
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