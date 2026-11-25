import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import type { Transaction } from '@offscreen/db';
import { gameActionExecution } from '@offscreen/story-persistence/campaign';
import { generation } from '@offscreen/story-persistence/generations';
import { storyPassage } from '@offscreen/story-persistence/stories';
import {
  storytellerWriterMission,
  storytellerWriterStep,
} from '@offscreen/story-persistence/storyteller';
import type { DocumentStore } from '@offscreen/documents';
import {
  prepareWriterMissionModelStep,
  publishAcceptedWriterScene,
  runWriterMissionModelRound,
} from '@offscreen/story-engine/storyteller';
import {
  writerMissionCaptureV3ContinuationSchema,
  writerRoundDecisionSchema,
  writerSceneProposalV3Schema,
  type WriterMissionCapture,
  type WriterSceneProposalV3,
} from '@offscreen/storyteller/tasks';

type NarrativeIntentPlanV1 = WriterSceneProposalV3['scene']['authoredIntents'][number];

type WriterSceneGenerationInput = Readonly<{
  writerMissionCapture?: unknown;
}>;

type ExecutedNarrativePlan = Readonly<{
  kind: 'narrative-intent.v1';
  key: string;
  label: string;
  intention: string;
  risk: string;
  fictionalDurationSeconds: number;
  effects: readonly [];
}>;

function isExecutedNarrativePlan(value: unknown): value is ExecutedNarrativePlan {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const plan = value as ExecutedNarrativePlan;
  return (
    plan.kind === 'narrative-intent.v1' &&
    typeof plan.key === 'string' &&
    typeof plan.label === 'string' &&
    typeof plan.intention === 'string'
  );
}

function createDocumentStoreLibraryReader(storage: DocumentStore) {
  return {
    readManifest: async () => {
      throw new Error('v1 manifest not supported for scripted writer scene');
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

function followUpIntent(
  key: string,
  label: string,
  intention: string,
): NarrativeIntentPlanV1 {
  return {
    kind: 'narrative-intent.v1',
    key,
    label,
    intention,
    risk: 'The path may draw unwanted attention.',
    fictionalDurationSeconds: 1,
    effects: [],
  };
}

/**
 * Deterministic P3-A v3 scene proposal for zero-provider continuation proof.
 * Tagged scripted: not a live model artifact.
 */
export function buildScriptedWriterSceneProposal(input: {
  capture: WriterMissionCapture & { version: 'writer-mission.v3' };
  executedPlan: ExecutedNarrativePlan;
}): WriterSceneProposalV3 {
  const nextSequence = input.capture.sceneScope.baseSceneSequence + 1;
  const optionA = `scripted-${nextSequence}-a`;
  const optionB = `scripted-${nextSequence}-b`;
  const intentA = followUpIntent(
    optionA,
    'Press onward',
    `Continue after ${input.executedPlan.label.toLowerCase()}.`,
  );
  const intentB = followUpIntent(
    optionB,
    'Wait and watch',
    `Hold still after ${input.executedPlan.label.toLowerCase()}.`,
  );
  return writerSceneProposalV3Schema.parse({
    version: 3,
    summary: `Scripted scene ${nextSequence} after ${input.executedPlan.key}.`,
    stagedObjectHashes: [],
    sourceEvidence: [],
    scene: {
      content: {
        version: 1,
        title: `Scene ${nextSequence}`,
        paragraphs: [
          `${input.executedPlan.intention} The world shifts into scene ${nextSequence}.`,
        ],
      },
      interaction: {
        kind: 'choice.v1',
        prompt: 'What next?',
        options: [
          { id: optionA, label: intentA.label },
          { id: optionB, label: intentB.label },
        ],
      },
      authoredIntents: [intentA, intentB],
    },
    documentChanges: [],
  });
}

function buildScriptedDecisionBody(proposal: WriterSceneProposalV3): string {
  return JSON.stringify(
    writerRoundDecisionSchema.parse({
      kind: 'final',
      proposal,
    }),
  );
}

async function loadMissionContext(database: Database, missionId: string) {
  const [mission] = await database.db
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, missionId))
    .limit(1);
  if (!mission) {
    throw new Error('writer_scene_mission_missing');
  }

  const [generationRow] = await database.db
    .select()
    .from(generation)
    .where(eq(generation.id, mission.generationId))
    .limit(1);
  if (!generationRow) {
    throw new Error('writer_scene_generation_missing');
  }

  const generationInput = (generationRow.input ?? {}) as WriterSceneGenerationInput;
  if (!generationInput.writerMissionCapture) {
    throw new Error('writer_scene_capture_missing');
  }

  const capture = writerMissionCaptureV3ContinuationSchema.parse(
    generationInput.writerMissionCapture,
  );
  if (capture.capturedRequestHash !== mission.captureSha256) {
    throw new Error('writer_scene_capture_mismatch');
  }

  const [step] = await database.db
    .select()
    .from(storytellerWriterStep)
    .where(
      and(
        eq(storytellerWriterStep.missionId, missionId),
        eq(storytellerWriterStep.contextId, missionId),
        eq(storytellerWriterStep.ordinal, 1),
      ),
    )
    .limit(1);
  if (!step) {
    throw new Error('writer_scene_step_missing');
  }

  const controllingId = capture.sceneScope.controllingIntentOrReceiptId;
  const [execution] = await database.db
    .select()
    .from(gameActionExecution)
    .where(eq(gameActionExecution.operationId, controllingId))
    .limit(1);
  if (!execution || !isExecutedNarrativePlan(execution.plan)) {
    throw new Error('writer_scene_execution_missing');
  }

  return { mission, capture, step, executedPlan: execution.plan };
}

async function passageAlreadyPublished(
  database: Database,
  storyId: string,
  generationId: string,
): Promise<boolean> {
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
  return Boolean(existing);
}

/**
 * One bounded scripted writer continuation round plus GA publication.
 * Never invokes a live provider transport.
 */
export async function runScriptedWriterScene(
  database: Database,
  storage: DocumentStore | undefined,
  missionId: string,
): Promise<void> {
  if (!storage) {
    throw new Error('document_store_unavailable');
  }

  const { mission, capture, step, executedPlan } =
    await loadMissionContext(database, missionId);

  if (await passageAlreadyPublished(database, mission.storyId, mission.generationId)) {
    return;
  }

  if (mission.state === 'uncertain' || step.state === 'uncertain') {
    return;
  }
  if (mission.state === 'held' || step.state === 'held') {
    return;
  }
  if (mission.state === 'failed' || step.state === 'failed') {
    return;
  }

  const proposal = buildScriptedWriterSceneProposal({ capture, executedPlan });
  const scriptedDecisionBody = buildScriptedDecisionBody(proposal);
  const reader = createDocumentStoreLibraryReader(storage);
  const access = { privateDocuments: false as const };

  if (mission.state !== 'proposal-ready') {
    const prepared = await prepareWriterMissionModelStep(database, storage, {
      missionId,
      ordinal: 1,
      expectedRevision: step.revision,
      capture,
    });
    const round = await runWriterMissionModelRound(database, {
      missionId,
      ordinal: 1,
      attemptId: randomUUID(),
      expectedRevision: prepared.revision,
      capture,
      access,
      reader,
      storage,
      scriptedDecisionBody,
    });
    if (round.status === 'uncertain' || round.status === 'held') {
      return;
    }
    if (round.status === 'replayed') {
      const [missionAfter] = await database.db
        .select({ state: storytellerWriterMission.state })
        .from(storytellerWriterMission)
        .where(eq(storytellerWriterMission.id, missionId))
        .limit(1);
      if (missionAfter?.state !== 'proposal-ready') {
        return;
      }
    } else if (round.status !== 'proposal-ready') {
      return;
    }
  }

  const [missionNow] = await database.db
    .select({ state: storytellerWriterMission.state })
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, missionId))
    .limit(1);
  if (missionNow?.state !== 'proposal-ready') {
    return;
  }

  await database.db.transaction(async (tx: Transaction) => {
    await publishAcceptedWriterScene(tx, storage, {
      missionId,
      proposal,
    });
  });
}