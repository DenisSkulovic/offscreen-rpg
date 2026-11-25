import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/story-persistence/generations';
import { storyPassage } from '@offscreen/story-persistence/stories';
import { storytellerWriterMission } from '@offscreen/story-persistence/storyteller';
import type { DocumentStore } from '@offscreen/documents';
import type {
  WriterSceneRoundExecutionPlan,
  WriterSceneRoundFinalizeResult,
  WriterSceneRoundMissionState,
} from '@offscreen/game-authority-protocol/writer-scene-round-control';
import { defaultWriterContextId } from '@offscreen/story-engine/storyteller/writer-child-custody';
import { readLatestParentModelStepRow } from '@offscreen/story-engine/storyteller/writer-mission-custody';
import {
  validateWriterRoundCaptureAgainstPolicy,
  type WriterRoundCapturePolicyMode,
} from '@offscreen/story-engine/storyteller/writer-round-capture-validation';
import { finalizeSettledWriterSceneRound } from '@offscreen/story-engine/storyteller/writer-round-settled-finalization';
import type { WriterRoundModelPolicy } from '@offscreen/storyteller/providers/writer-round-transport';
import {
  writerMissionCaptureV3ContinuationSchema,
  type WriterMissionCapture,
} from '@offscreen/storyteller/tasks';
import type { WriterRoundPrivateSeamOptions } from './writer-round-private-seam.js';
import { createWriterRoundPrivateSeam } from './writer-round-private-seam.js';

export type WriterRoundControlSeam = {
  planRound(missionId: string): Promise<
    | WriterSceneRoundExecutionPlan
    | { status: 'held'; reason: string }
  >;
  readMissionState(missionId: string): Promise<WriterSceneRoundMissionState>;
  finalizeRound(missionId: string): Promise<WriterSceneRoundFinalizeResult>;
};

export type WriterRoundSeam = ReturnType<typeof createWriterRoundSeam>;

async function loadWriterMissionCapture(
  database: Database,
  missionId: string,
): Promise<
  | {
      capture: WriterMissionCapture;
      budgetSnapshot: WriterMissionCapture['budgets'];
      storyId: string;
      generationId: string;
    }
  | null
> {
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
    budgetSnapshot: mission.budgetSnapshot as WriterMissionCapture['budgets'],
    storyId: mission.storyId,
    generationId: mission.generationId,
  };
}

function createWriterRoundControlSeam(
  database: Database,
  storage: DocumentStore,
  options: WriterRoundPrivateSeamOptions,
): WriterRoundControlSeam {
  const policy = options.providerPolicy;
  const capturePolicyMode = options.capturePolicyMode ?? 'provider-default';

  return {
    async planRound(missionId) {
      const loaded = await loadWriterMissionCapture(database, missionId);
      if (!loaded) {
        return { status: 'held', reason: 'mission_not_found' };
      }
      const captureFault = validateWriterRoundCaptureAgainstPolicy(
        loaded.capture,
        policy,
        loaded.budgetSnapshot,
        capturePolicyMode,
      );
      if (captureFault) {
        return { status: 'held', reason: captureFault };
      }
      const contextId = defaultWriterContextId(missionId);
      const maxModelRounds = loaded.capture.budgets.maxModelRounds;
      const step = await readLatestParentModelStepRow(
        database,
        missionId,
        contextId,
      );
      if (!step) {
        return { status: 'held', reason: 'step_not_found' };
      }
      if (step.ordinal > maxModelRounds) {
        return { status: 'held', reason: 'max_model_rounds' };
      }
      if (step.state === 'held' || step.state === 'failed') {
        return { status: 'held', reason: step.state };
      }
      return {
        missionId,
        contextId,
        ordinal: step.ordinal,
        expectedRevision: step.revision,
        model: loaded.capture.modelSelection.model,
        maxModelRounds,
      };
    },

    async readMissionState(missionId) {
      const loaded = await loadWriterMissionCapture(database, missionId);
      if (!loaded) {
        return { status: 'held', reason: 'mission_not_found' };
      }
      const [existingPassage] = await database.db
        .select({ id: storyPassage.id })
        .from(storyPassage)
        .where(
          and(
            eq(storyPassage.storyId, loaded.storyId),
            eq(storyPassage.sourceGenerationId, loaded.generationId),
          ),
        )
        .limit(1);
      if (existingPassage) {
        return { status: 'replayed' };
      }
      const [mission] = await database.db
        .select({ state: storytellerWriterMission.state })
        .from(storytellerWriterMission)
        .where(eq(storytellerWriterMission.id, missionId))
        .limit(1);
      if (!mission) {
        return { status: 'held', reason: 'mission_not_found' };
      }
      if (mission.state === 'uncertain') {
        return { status: 'uncertain' };
      }
      if (mission.state === 'held' || mission.state === 'failed') {
        return { status: 'held', reason: mission.state };
      }
      return { status: 'pending' };
    },

    async finalizeRound(missionId) {
      const result = await finalizeSettledWriterSceneRound(database, storage, {
        missionId,
        policy,
        capturePolicyMode,
      });
      if (result.status === 'needs-next-round') {
        return {
          status: 'needs-next-round',
          nextOrdinal: result.nextOrdinal,
          nextRevision: result.nextRevision,
        };
      }
      if (result.status === 'published' || result.status === 'replayed') {
        return { status: result.status };
      }
      if (result.status === 'uncertain') {
        return { status: 'uncertain' };
      }
      return { status: 'held', reason: result.reason };
    },
  };
}

export function createWriterRoundSeam(
  database: Database,
  storage: DocumentStore,
  options: WriterRoundPrivateSeamOptions,
) {
  const privateSeam = createWriterRoundPrivateSeam(database, storage, options);
  const controlSeam = createWriterRoundControlSeam(database, storage, options);
  return {
    ...privateSeam,
    ...controlSeam,
  };
}

export function writerRoundCapturePolicyModeForBootstrap(
  mode:
    | 'unavailable'
    | 'scripted-offline-lab'
    | 'provider-authorized',
): WriterRoundCapturePolicyMode {
  if (mode === 'scripted-offline-lab') {
    return 'scripted-offline-lab';
  }
  if (mode === 'provider-authorized') {
    return 'provider-authorized';
  }
  return 'provider-default';
}