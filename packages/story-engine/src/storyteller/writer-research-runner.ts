/**
 * WR04 T03: load child SQL grant and run bounded read-only research rounds.
 */
import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  storytellerWriterChild,
  storytellerWriterMission,
} from '@offscreen/story-persistence/storyteller';
import type { DocumentStore } from '@offscreen/documents';
import type { WriterResearchCaptureV1 } from '@offscreen/storyteller/tasks';
import type { LibraryAccess } from './library-navigation';
import {
  buildWriterResearchCaptureFromChildRow,
  runWriterResearchModelRound,
  type RunWriterResearchModelRoundInput,
  type WriterResearchLoopRoundResult,
  WriterResearchLoopError,
} from './writer-research';

type LibraryReader = RunWriterResearchModelRoundInput['reader'];

export type LoadedWriterResearchChild = Readonly<{
  childId: string;
  missionId: string;
  storyId: string;
  capture: WriterResearchCaptureV1;
  required: boolean;
  child: typeof storytellerWriterChild.$inferSelect;
}>;

/** Trust only durable child registry rows; never model or HTTP hints. */
export async function loadWriterResearchChildGrant(
  database: Database,
  childId: string,
  options?: { required?: boolean },
): Promise<LoadedWriterResearchChild> {
  const [child] = await database.db
    .select()
    .from(storytellerWriterChild)
    .where(eq(storytellerWriterChild.childId, childId))
    .limit(1);
  if (!child) {
    throw new WriterResearchLoopError('child_not_found');
  }
  const [mission] = await database.db
    .select({
      storyId: storytellerWriterMission.storyId,
    })
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, child.missionId))
    .limit(1);
  if (!mission) {
    throw new WriterResearchLoopError('child_not_found');
  }
  const capture = buildWriterResearchCaptureFromChildRow({
    missionId: child.missionId,
    child,
    required: options?.required ?? true,
  });
  return {
    childId,
    missionId: child.missionId,
    storyId: mission.storyId,
    capture,
    required: options?.required ?? true,
    child,
  };
}

export async function runWriterResearchChildModelRound(
  database: Database,
  input: {
    childId: string;
    ordinal: number;
    attemptId: string;
    expectedRevision: number;
    access?: LibraryAccess;
    reader: LibraryReader;
    storage: DocumentStore;
    scriptedDecisionBody: string;
    required?: boolean;
  },
): Promise<WriterResearchLoopRoundResult> {
  const grantOptions =
    input.required === undefined ? undefined : { required: input.required };
  const loaded = await loadWriterResearchChildGrant(
    database,
    input.childId,
    grantOptions,
  );
  const roundInput: RunWriterResearchModelRoundInput = {
    missionId: loaded.missionId,
    contextId: loaded.childId,
    childId: loaded.childId,
    ordinal: input.ordinal,
    attemptId: input.attemptId,
    expectedRevision: input.expectedRevision,
    storyId: loaded.storyId,
    capture: loaded.capture,
    required: loaded.required,
    reader: input.reader,
    storage: input.storage,
    scriptedDecisionBody: input.scriptedDecisionBody,
  };
  if (input.access !== undefined) {
    roundInput.access = input.access;
  }
  return runWriterResearchModelRound(database, roundInput);
}