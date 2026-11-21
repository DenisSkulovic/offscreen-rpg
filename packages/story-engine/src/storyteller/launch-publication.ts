import { and, eq, isNotNull, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storyLaunch } from '@offscreen/db/launch-schema';
import { storySceneCheckpoint } from '@offscreen/db/story-schema';
import { storytellerWriterMission } from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import { passageContentSchema } from '@offscreen/contracts/stories';
import type { z } from 'zod';
import { defaultWorldTimeDefinition } from '@offscreen/game/calendar';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import {
  writerOpeningSceneProposalV2Schema,
  type WriterOpeningSceneProposal,
} from '@offscreen/storyteller/tasks';
import { initializeCampaign } from '../campaign/settings';
import {
  initializeStoryInTransaction,
  quiescentCampaignOpeningCheckpoint,
} from '../stories/initialization';
import { checkpointPinsForRoot } from '../stories/passage-documents';
import {
  assertV2PostStateMatches,
  toV2FictionalState,
} from '../stories/scene-checkpoint-v2';
import { readSceneAfterState } from '../stories/scene-after-state';
import {
  checkpointWriterStore,
  insertStagedSceneCheckpointSelector,
  stageSceneCheckpointObject,
} from '../stories/scene-checkpoint';
import { stageStoryBootstrapDocuments } from '../stories/passage-documents';
import type { InitialStory } from '../stories/command-policy';
import { StoryError } from '../stories/errors';

type PassageContent = z.infer<typeof passageContentSchema>;

const LAUNCH_OPENING_PACE = {
  kind: 'rate' as const,
  fictionalSeconds: 1,
  realSeconds: 1,
};

const launchStorytellerProfile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

export type PublishLaunchOpeningSceneInput = Readonly<{
  ownerId: string;
  operationId: string;
  proposal: unknown;
}>;

export type PublishLaunchOpeningSceneResult = Readonly<{
  storyId: string;
  passageId: string;
  checkpointHash: string;
  replayed: boolean;
}>;

type LaunchGenerationInput = Readonly<{
  libraryRootHash?: string;
}>;

function parseOpeningProposal(proposal: unknown): WriterOpeningSceneProposal {
  const parsed = writerOpeningSceneProposalV2Schema.safeParse(proposal);
  if (!parsed.success) {
    throw new Error('launch_proposal_invalid');
  }
  return parsed.data;
}

function assertReadableOpeningInteraction(
  proposal: WriterOpeningSceneProposal,
): PassageContent {
  if (proposal.scene.interaction !== null) {
    throw new Error('launch_interaction_unsupported');
  }
  return passageContentSchema.parse(proposal.scene.content);
}

async function loadReadyReplayCheckpoint(
  database: Database,
  launch: typeof storyLaunch.$inferSelect,
): Promise<PublishLaunchOpeningSceneResult> {
  const checkpoints = await database.db
    .select({ checkpointHash: storySceneCheckpoint.checkpointHash })
    .from(storySceneCheckpoint)
    .where(
      and(
        eq(storySceneCheckpoint.storyId, launch.reservedStoryId),
        eq(storySceneCheckpoint.sceneSequence, 1),
      ),
    );
  const checkpoint = checkpoints[0];
  if (!checkpoint) {
    throw new Error('launch_checkpoint_missing');
  }
  return {
    storyId: launch.reservedStoryId,
    passageId: launch.reservedFirstPassageId,
    checkpointHash: checkpoint.checkpointHash,
    replayed: true,
  };
}

export async function publishLaunchOpeningScene(
  database: Database,
  storage: DocumentStore,
  input: PublishLaunchOpeningSceneInput,
): Promise<PublishLaunchOpeningSceneResult> {
  const launchRows = await database.db
    .select()
    .from(storyLaunch)
    .where(
      and(
        eq(storyLaunch.ownerId, input.ownerId),
        eq(storyLaunch.operationId, input.operationId),
      ),
    )
    .limit(1);
  const launch = launchRows[0];
  if (!launch) {
    throw new Error('launch_not_found');
  }

  if (launch.state === 'ready' && launch.sceneSequence === 1) {
    return loadReadyReplayCheckpoint(database, launch);
  }

  if (launch.state !== 'composing' || !launch.generationId) {
    throw new Error('launch_not_ready');
  }

  const passageContent = assertReadableOpeningInteraction(
    parseOpeningProposal(input.proposal),
  );

  const generationRows = await database.db
    .select()
    .from(generation)
    .where(eq(generation.id, launch.generationId))
    .limit(1);
  const generationRow = generationRows[0];
  if (!generationRow || generationRow.ownerId !== input.ownerId) {
    throw new Error('launch_generation_missing');
  }
  const generationInput = (generationRow.input ?? {}) as LaunchGenerationInput;

  const missionRows = await database.db
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.generationId, launch.generationId))
    .limit(1);
  const mission = missionRows[0];
  if (!mission || mission.storyId !== launch.reservedStoryId) {
    throw new Error('launch_writer_mission_missing');
  }
  if (mission.state !== 'proposal-ready') {
    throw new Error('launch_writer_mission_not_ready');
  }
  if (mission.libraryRootHash !== generationInput.libraryRootHash) {
    throw new Error('launch_source_mismatch');
  }

  const writer = checkpointWriterStore(storage);
  if (!writer) {
    throw new StoryError('unavailable', 'document_store');
  }

  const openingInput: InitialStory = {
    source: 'launch',
    storyteller: null,
    execution: null,
    usagePolicy: null,
    premise: null,
    items: [],
    content: passageContent,
    interaction: null,
  };

  const stagedPassage = await stageStoryBootstrapDocuments({
    storage,
    storyId: launch.reservedStoryId,
    passageId: launch.reservedFirstPassageId,
    sequence: 1,
    operationId: launch.reservedStoryId,
    rootHash: null,
    rootRevision: 0,
    content: passageContent,
  });

  const pins = await checkpointPinsForRoot({
    storage: writer,
    rootHash: stagedPassage.rootHash,
    storytellerProfile: null,
  });

  const checkpoint = quiescentCampaignOpeningCheckpoint({
    storyId: launch.reservedStoryId,
    passageId: launch.reservedFirstPassageId,
    input: openingInput,
    interactionId: null,
    rootHash: stagedPassage.rootHash,
    rootRevision: stagedPassage.rootRevision,
    contentDocumentHash: stagedPassage.objectHash,
    pins,
    pace: LAUNCH_OPENING_PACE,
  });

  const staged = await stageSceneCheckpointObject(writer, checkpoint);

  return database.db.transaction(async (tx) => {
    const lockedRows = await tx
      .select()
      .from(storyLaunch)
      .where(
        and(
          eq(storyLaunch.ownerId, input.ownerId),
          eq(storyLaunch.operationId, input.operationId),
        ),
      )
      .for('update');
    const lockedLaunch = lockedRows[0];
    if (!lockedLaunch) {
      throw new Error('launch_not_found');
    }
    if (
      lockedLaunch.state === 'ready' &&
      lockedLaunch.sceneSequence === 1
    ) {
      const checkpoints = await tx
        .select({ checkpointHash: storySceneCheckpoint.checkpointHash })
        .from(storySceneCheckpoint)
        .where(
          and(
            eq(storySceneCheckpoint.storyId, lockedLaunch.reservedStoryId),
            eq(storySceneCheckpoint.sceneSequence, 1),
          ),
        );
      const existing = checkpoints[0];
      if (!existing) {
        throw new Error('launch_checkpoint_missing');
      }
      return {
        storyId: lockedLaunch.reservedStoryId,
        passageId: lockedLaunch.reservedFirstPassageId,
        checkpointHash: existing.checkpointHash,
        replayed: true,
      };
    }
    if (
      lockedLaunch.state !== 'composing' ||
      !lockedLaunch.generationId
    ) {
      throw new Error('launch_not_ready');
    }

    const lockedMissionRows = await tx
      .select()
      .from(storytellerWriterMission)
      .where(eq(storytellerWriterMission.generationId, lockedLaunch.generationId))
      .limit(1);
    const lockedMission = lockedMissionRows[0];
    if (
      !lockedMission ||
      lockedMission.storyId !== lockedLaunch.reservedStoryId ||
      lockedMission.state !== 'proposal-ready' ||
      lockedMission.libraryRootHash !== mission.libraryRootHash
    ) {
      throw new Error('launch_source_mismatch');
    }

    const created = await initializeStoryInTransaction(tx, {
      ownerId: input.ownerId,
      storyId: lockedLaunch.reservedStoryId,
      input: openingInput,
      stagedPassage,
    });
    if (!created) {
      throw new Error('launch_story_conflict');
    }

    await initializeCampaign(
      tx,
      lockedLaunch.reservedStoryId,
      launchStorytellerProfile,
      {
        mechanics: false,
        locked: false,
        pace: LAUNCH_OPENING_PACE,
        time: defaultWorldTimeDefinition,
        worldObligations: [],
        worlds: [],
      },
    );

    const actual = toV2FictionalState(
      await readSceneAfterState(tx, lockedLaunch.reservedStoryId),
    );
    if (staged.checkpoint.format !== 'offscreen.scene-checkpoint.v2') {
      throw new Error('launch_checkpoint_version_mismatch');
    }
    assertV2PostStateMatches(staged.checkpoint.fictionalState, actual);

    const selector = await insertStagedSceneCheckpointSelector(tx, {
      ownerId: input.ownerId,
      operationId: lockedLaunch.reservedStoryId,
      staged,
    });

    const updated = await tx
      .update(storyLaunch)
      .set({
        state: 'ready',
        sceneSequence: 1,
        updatedAt: sql`clock_timestamp()`,
      })
      .where(
        and(
          eq(storyLaunch.ownerId, input.ownerId),
          eq(storyLaunch.operationId, input.operationId),
          eq(storyLaunch.state, 'composing'),
          isNotNull(storyLaunch.generationId),
        ),
      )
      .returning({ reservedStoryId: storyLaunch.reservedStoryId });
    if (updated.length !== 1) {
      throw new Error('launch_ready_transition_conflict');
    }

    return {
      storyId: lockedLaunch.reservedStoryId,
      passageId: lockedLaunch.reservedFirstPassageId,
      checkpointHash: selector.checkpointHash,
      replayed: false,
    };
  });
}