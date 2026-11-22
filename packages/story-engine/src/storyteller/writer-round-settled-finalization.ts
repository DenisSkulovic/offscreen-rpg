/**
 * GA-owned settled writer scene round: interpret durable response, then publish.
 */
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { storyPassage, storySceneCheckpoint } from '@offscreen/db/story-schema';
import {
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import type { WriterSceneProposalV3 } from '@offscreen/storyteller/tasks';
import { writerSceneProposalV3Schema } from '@offscreen/storyteller/tasks';
import { defaultWriterContextId } from './writer-child-custody';
import {
  hashWriterMissionSerializedResponse,
  readDurableWriterMissionResponse,
  readLatestFinalizableParentModelStepRow,
  readWriterMissionStepRow,
} from './writer-mission-custody';
import {
  interpretPersistedWriterDecision,
  parseProviderDecisionBody,
  WriterLoopError,
} from './writer-loop';
import { publishAcceptedWriterScene } from './writer-continuation-publication';
import { recordWriterPublicationFailure } from './writer-publication-diagnostic';
import type { WriterRoundCapturePolicyMode } from './writer-round-capture-validation';
import { validateWriterRoundCaptureAgainstPolicy } from './writer-round-capture-validation';
import type { WriterRoundModelPolicy } from '@offscreen/storyteller/providers/writer-round-transport';
import { generation } from '@offscreen/db/generation-schema';
import { writerMissionCaptureV3ContinuationSchema } from '@offscreen/storyteller/tasks';
import type { z } from 'zod';

type WriterContinuationCapture = z.infer<
  typeof writerMissionCaptureV3ContinuationSchema
>;

export type FinalizeSettledWriterSceneRoundResult =
  | { status: 'published'; passageId: string; checkpointHash: string }
  | { status: 'replayed'; passageId: string; checkpointHash: string }
  | {
      status: 'needs-next-round';
      nextOrdinal: number;
      nextRevision: number;
    }
  | { status: 'held'; reason: string }
  | { status: 'uncertain' };

export type FinalizeSettledWriterSceneRoundInput = Readonly<{
  missionId: string;
  ordinal?: number;
  policy: WriterRoundModelPolicy;
  capturePolicyMode: WriterRoundCapturePolicyMode;
}>;

type LoadedMissionContext = Readonly<{
  capture: WriterContinuationCapture;
  budgetSnapshot: WriterContinuationCapture['budgets'];
  storyId: string;
  generationId: string;
}>;

async function loadMissionContext(
  database: Database,
  missionId: string,
): Promise<LoadedMissionContext | null> {
  const [mission] = await database.db
    .select({
      generationId: storytellerWriterMission.generationId,
      storyId: storytellerWriterMission.storyId,
      captureSha256: storytellerWriterMission.captureSha256,
      budgetSnapshot: storytellerWriterMission.budgetSnapshot,
    })
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, missionId))
    .limit(1);
  if (!mission) {
    return null;
  }
  const [generationRow] = await database.db
    .select({ input: generation.input })
    .from(generation)
    .where(eq(generation.id, mission.generationId))
    .limit(1);
  if (!generationRow) {
    return null;
  }
  const generationInput = (generationRow.input ?? {}) as {
    writerMissionCapture?: unknown;
  };
  const capture = writerMissionCaptureV3ContinuationSchema.safeParse(
    generationInput.writerMissionCapture,
  );
  if (!capture.success) {
    return null;
  }
  if (capture.data.capturedRequestHash !== mission.captureSha256) {
    return null;
  }
  return {
    capture: capture.data,
    budgetSnapshot: mission.budgetSnapshot as WriterContinuationCapture['budgets'],
    storyId: mission.storyId,
    generationId: mission.generationId,
  };
}

function createStorageLibraryReader(storage: DocumentStore) {
  return {
    readManifest: async (rootHash: string) => {
      const manifest = await storage.readManifest(rootHash);
      return {
        campaignId: manifest.campaignId,
        revision: manifest.revision,
        entries: manifest.entries,
      };
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

async function passageAlreadyPublished(
  database: Database,
  storyId: string,
  generationId: string,
  baseSceneSequence: number,
): Promise<{ passageId: string; checkpointHash: string } | null> {
  const [existing] = await database.db
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, storyId),
        eq(storyPassage.sourceGenerationId, generationId),
      ),
    )
    .limit(1);
  if (!existing) {
    return null;
  }
  const [checkpoint] = await database.db
    .select({ checkpointHash: storySceneCheckpoint.checkpointHash })
    .from(storySceneCheckpoint)
    .where(
      and(
        eq(storySceneCheckpoint.storyId, storyId),
        eq(storySceneCheckpoint.sceneSequence, baseSceneSequence + 1),
      ),
    )
    .limit(1);
  if (!checkpoint) {
    return null;
  }
  return { passageId: existing.id, checkpointHash: checkpoint.checkpointHash };
}

function finalProposalFromDecisionBody(body: string): WriterSceneProposalV3 | null {
  const decision = parseProviderDecisionBody(body);
  if (!decision || decision.kind !== 'final') {
    return null;
  }
  if (decision.proposal.version !== 3) {
    return null;
  }
  return writerSceneProposalV3Schema.parse(decision.proposal);
}

function decisionRequestsResearchDelegate(body: string): boolean {
  const decision = parseProviderDecisionBody(body);
  if (!decision || decision.kind !== 'tool-calls') {
    return false;
  }
  return decision.calls.some((call) => call.name === 'research.delegate');
}

async function readNextPreparedParentModelStep(
  database: Database,
  missionId: string,
  contextId: string,
  afterOrdinal: number,
) {
  const [step] = await database.db
    .select({
      ordinal: storytellerWriterStep.ordinal,
      revision: storytellerWriterStep.revision,
      state: storytellerWriterStep.state,
    })
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, contextId),
        sql`${storytellerWriterStep.ordinal} > ${afterOrdinal}`,
        isNull(storytellerWriterStep.toolCallId),
      ),
    )
    .orderBy(asc(storytellerWriterStep.ordinal))
    .limit(1);
  return step ?? null;
}

function mapWriterLoopErrorToHeldReason(error: WriterLoopError): string {
  if (error.code === 'invalid_step_state') {
    return 'max_model_rounds';
  }
  return error.code;
}

/**
 * Interprets a settled provider response (if needed) and publishes one v3 scene passage.
 * Idempotent when the generation already has a committed passage.
 */
export async function finalizeSettledWriterSceneRound(
  database: Database,
  storage: DocumentStore,
  input: FinalizeSettledWriterSceneRoundInput,
): Promise<FinalizeSettledWriterSceneRoundResult> {
  const loaded = await loadMissionContext(database, input.missionId);
  if (!loaded) {
    return { status: 'held', reason: 'mission_not_found' };
  }

  const captureFault = validateWriterRoundCaptureAgainstPolicy(
    loaded.capture,
    input.policy,
    loaded.budgetSnapshot,
    input.capturePolicyMode,
  );
  if (captureFault) {
    return { status: 'held', reason: captureFault };
  }

  const existingPassage = await passageAlreadyPublished(
    database,
    loaded.storyId,
    loaded.generationId,
    loaded.capture.sceneScope.baseSceneSequence,
  );
  if (existingPassage) {
    return {
      status: 'replayed',
      passageId: existingPassage.passageId,
      checkpointHash: existingPassage.checkpointHash,
    };
  }

  const [missionRow] = await database.db
    .select({ state: storytellerWriterMission.state })
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, input.missionId))
    .limit(1);
  if (!missionRow) {
    return { status: 'held', reason: 'mission_not_found' };
  }
  if (missionRow.state === 'uncertain') {
    return { status: 'uncertain' };
  }
  if (missionRow.state === 'held' || missionRow.state === 'failed') {
    return { status: 'held', reason: missionRow.state };
  }

  const contextId = defaultWriterContextId(input.missionId);
  const latestParent = await readLatestFinalizableParentModelStepRow(
    database,
    input.missionId,
    contextId,
  );
  if (!latestParent) {
    return { status: 'held', reason: 'step_not_found' };
  }
  if (input.ordinal !== undefined && input.ordinal !== latestParent.ordinal) {
    return { status: 'held', reason: 'revision_conflict' };
  }
  const ordinal = latestParent.ordinal;
  const step = await readWriterMissionStepRow(
    database,
    input.missionId,
    contextId,
    ordinal,
  );

  const reader = createStorageLibraryReader(storage);
  const access = { privateDocuments: false as const };

  let proposal: WriterSceneProposalV3 | undefined;

  if (missionRow.state === 'proposal-ready') {
    if (!step.resultCasHash || !step.attemptId || !step.requestCasHash) {
      return { status: 'held', reason: 'strict_response_pointer_missing' };
    }
    try {
      const body = await readDurableWriterMissionResponse(database, storage, {
        missionId: input.missionId,
        contextId,
        ordinal,
        attemptId: step.attemptId,
        requestSha256: step.requestCasHash,
      });
      proposal = finalProposalFromDecisionBody(body) ?? undefined;
    } catch {
      return { status: 'held', reason: 'response_rehydrate_failed' };
    }
    if (!proposal) {
      return { status: 'held', reason: 'malformed_decision' };
    }
  } else if (step.state === 'tools-applied') {
    const next = await readNextPreparedParentModelStep(
      database,
      input.missionId,
      contextId,
      ordinal,
    );
    if (!next || next.state !== 'model-request-prepared') {
      return { status: 'held', reason: 'next_step_not_prepared' };
    }
    return {
      status: 'needs-next-round',
      nextOrdinal: next.ordinal,
      nextRevision: next.revision,
    };
  } else if (step.state === 'result-settled' || step.state === 'proposal-ready') {
    if (!step.resultCasHash || !step.attemptId || !step.requestCasHash) {
      return { status: 'held', reason: 'strict_response_pointer_missing' };
    }
    let body: string;
    try {
      body = await readDurableWriterMissionResponse(database, storage, {
        missionId: input.missionId,
        contextId,
        ordinal,
        attemptId: step.attemptId,
        requestSha256: step.requestCasHash,
      });
    } catch {
      return { status: 'held', reason: 'response_rehydrate_failed' };
    }
    const bodyHash = hashWriterMissionSerializedResponse(body);
    if (bodyHash !== step.resultCasHash) {
      return { status: 'held', reason: 'response_hash_mismatch' };
    }

    if (step.state === 'proposal-ready') {
      proposal = finalProposalFromDecisionBody(body) ?? undefined;
      if (!proposal) {
        return { status: 'held', reason: 'malformed_decision' };
      }
    } else {
      if (decisionRequestsResearchDelegate(body)) {
        return { status: 'held', reason: 'research_delegate_unsupported' };
      }
      let interpreted;
      try {
        interpreted = await interpretPersistedWriterDecision(database, {
          missionId: input.missionId,
          contextId,
          ordinal,
          capture: loaded.capture,
          access,
          reader,
          storage,
          body,
          resultCasHash: step.resultCasHash,
          wireSha256: step.requestCasHash,
          transportInvoked: true,
        });
      } catch (error) {
        if (error instanceof WriterLoopError) {
          return {
            status: 'held',
            reason: mapWriterLoopErrorToHeldReason(error),
          };
        }
        throw error;
      }
      if (interpreted.status === 'uncertain') {
        return { status: 'uncertain' };
      }
      if (interpreted.status === 'tool-round-complete') {
        const next = await readNextPreparedParentModelStep(
          database,
          input.missionId,
          contextId,
          ordinal,
        );
        if (!next || next.state !== 'model-request-prepared') {
          return { status: 'held', reason: 'next_step_not_prepared' };
        }
        return {
          status: 'needs-next-round',
          nextOrdinal: next.ordinal,
          nextRevision: next.revision,
        };
      }
      if (interpreted.status !== 'proposal-ready') {
        return {
          status: 'held',
          reason:
            interpreted.status === 'held'
              ? (interpreted.reason ?? 'held')
              : 'research_delegate_unsupported',
        };
      }
      if (
        interpreted.proposal.kind !== 'final' ||
        interpreted.proposal.proposal.version !== 3
      ) {
        return { status: 'held', reason: 'malformed_decision' };
      }
      proposal = writerSceneProposalV3Schema.parse(interpreted.proposal.proposal);
    }
  } else {
    return { status: 'held', reason: 'step_not_settled' };
  }

  if (!proposal) {
    return { status: 'held', reason: 'proposal_missing' };
  }

  try {
    const published = await database.db.transaction(async (tx) =>
      publishAcceptedWriterScene(tx, storage, {
        missionId: input.missionId,
        proposal,
      }),
    );
    return {
      status: published.replayed ? 'replayed' : 'published',
      passageId: published.passageId,
      checkpointHash: published.checkpointHash,
    };
  } catch (error) {
    const after = await passageAlreadyPublished(
      database,
      loaded.storyId,
      loaded.generationId,
      loaded.capture.sceneScope.baseSceneSequence,
    );
    if (after) {
      return {
        status: 'replayed',
        passageId: after.passageId,
        checkpointHash: after.checkpointHash,
      };
    }
    return recordWriterPublicationFailure(error, {
      missionId: input.missionId,
      generationId: loaded.generationId,
      storyId: loaded.storyId,
    });
  }
}