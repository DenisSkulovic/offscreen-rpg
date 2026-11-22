import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { Transaction } from '@offscreen/db/outbox';
import { campaign, gameOffer } from '@offscreen/db/campaign-schema';
import { generation } from '@offscreen/db/generation-schema';
import {
  story,
  storyPassage,
  storySceneCheckpoint,
} from '@offscreen/db/story-schema';
import { storytellerWriterMission } from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import { offerSchema } from '@offscreen/game/offers';
import type { NarrativeIntentPlan } from '@offscreen/game/narrative-intent';
import { narrativeIntentPlanSchema } from '@offscreen/game/narrative-intent';
import {
  writerMissionCaptureV3ContinuationSchema,
  writerSceneProposalV3Schema,
  type WriterSceneProposalV3,
} from '@offscreen/storyteller/tasks';
import { attachWriterPublicationStage } from './writer-publication-diagnostic';
import { continuationSchema } from '../stories/command-policy';
import { StoryError } from '../stories/errors';
import {
  advanceStoryView,
  insertContinuationPassage,
  lockOwnedStory,
} from '../stories/persistence';
import { saveOfferPlans } from '../campaign/persistence';
import {
  checkpointPinsForRoot,
  stageStoryPublicationDocuments,
} from '../stories/passage-documents';
import {
  assertV2PostStateMatches,
  toV2FictionalState,
  wrapAdmittedPassagePlan,
} from '../stories/scene-checkpoint-v2';
import { readSceneAfterState } from '../stories/scene-after-state';
import {
  checkpointWriterStore,
  insertStagedSceneCheckpointSelector,
  stageSceneCheckpointObject,
} from '../stories/scene-checkpoint';
import { commitStagedStoryPublication } from '../stories/continuation';
import { sceneCheckpointSchema } from '@offscreen/documents';
import { envelopPublicationOffer } from './publication-candidate';

export type PublishAcceptedWriterSceneInput = Readonly<{
  missionId: string;
  proposal: unknown;
}>;

export type PublishAcceptedWriterSceneResult = Readonly<{
  passageId: string;
  checkpointHash: string;
  replayed: boolean;
}>;

type WriterSceneGenerationInput = Readonly<{
  writerMissionCapture?: unknown;
}>;

function buildChoiceOffer(
  offerId: string,
  interaction: NonNullable<WriterSceneProposalV3['scene']['interaction']>,
  plans: readonly NarrativeIntentPlan[],
) {
  if (interaction.kind !== 'choice.v1') {
    throw new StoryError('invalid', 'writer_scene_interaction_unsupported');
  }
  return offerSchema.parse({
    id: offerId,
    nodes: interaction.options.map((option) => {
      const plan = plans.find((entry) => entry.key === option.id);
      if (!plan) {
        throw new StoryError('invalid', 'writer_scene_plan_missing');
      }
      return {
        id: option.id,
        parent: null,
        label: option.label,
        description: plan.intention,
        action: {
          kind: 'attempt',
          timing: {
            kind: 'finite',
            fictionalSeconds: plan.fictionalDurationSeconds,
          },
        },
      };
    }),
  });
}

function assertAdoptableDocumentChanges(
  proposal: WriterSceneProposalV3,
): void {
  for (const change of proposal.documentChanges) {
    if (change.changeKind !== 'adopt') {
      throw new StoryError('invalid', 'writer_scene_document_change_rejected');
    }
    if (change.authority !== 'canon' || change.visibility !== 'public') {
      throw new StoryError('invalid', 'writer_scene_document_change_rejected');
    }
  }
}

function assertSourceEvidenceRootHashes(
  proposal: WriterSceneProposalV3,
  baseRootHash: string,
): void {
  for (const evidence of proposal.sourceEvidence) {
    if (evidence.assertedAsFact && evidence.rootHash !== baseRootHash) {
      throw new StoryError('conflict', 'writer_scene_source_forged');
    }
  }
}

function mapCanonAdoptChanges(
  proposal: WriterSceneProposalV3,
  store: DocumentStore,
  manifestRootHash: string,
) {
  return Promise.all(
    proposal.documentChanges.map(async (change) => {
      const manifest = await store.readManifest(manifestRootHash);
      const entry = manifest.entries.find(
        (item) => item.documentId === change.documentId,
      );
      if (!entry || entry.objectHash !== change.expectedBaseObjectHash) {
        throw new StoryError('conflict', 'writer_scene_document_base_stale');
      }
      const staged = await store.readDocument(change.stagedObjectHash);
      if (
        staged.envelope.authority !== 'canon' ||
        staged.envelope.visibility !== 'player-known'
      ) {
        throw new StoryError('invalid', 'writer_scene_document_change_rejected');
      }
      return {
        operation: 'revise' as const,
        documentId: change.documentId,
        expectedRevision: entry.revision,
        path: change.path,
        kind: entry.kind as 'lore',
        authority: 'canon' as const,
        visibility: 'player-known' as const,
        title: staged.title,
        body: staged.body,
        reason: 'Writer scene canon adopt',
      };
    }),
  );
}

/** Commits one accepted v3 writer scene under the story row lock. */
export async function publishAcceptedWriterScene(
  tx: Transaction,
  store: DocumentStore,
  input: PublishAcceptedWriterSceneInput,
): Promise<PublishAcceptedWriterSceneResult> {
  let publicationStage = 'validate-proposal';
  try {
    return await publishAcceptedWriterSceneAtStage(tx, store, input, (stage) => {
      publicationStage = stage;
    });
  } catch (error) {
    attachWriterPublicationStage(error, publicationStage);
    throw error;
  }
}

async function publishAcceptedWriterSceneAtStage(
  tx: Transaction,
  store: DocumentStore,
  input: PublishAcceptedWriterSceneInput,
  mark: (stage: string) => void,
): Promise<PublishAcceptedWriterSceneResult> {
  const proposal = writerSceneProposalV3Schema.parse(input.proposal);
  mark('validate-proposal');
  assertAdoptableDocumentChanges(proposal);
  const plans = proposal.scene.authoredIntents.map((plan) =>
    narrativeIntentPlanSchema.parse(plan),
  );

  mark('lock-mission');
  const [mission] = await tx
    .select()
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, input.missionId))
    .for('update');
  if (!mission || mission.state !== 'proposal-ready') {
    throw new StoryError('conflict', 'writer_scene_mission_not_ready');
  }

  mark('read-generation');
  const [generationRow] = await tx
    .select()
    .from(generation)
    .where(eq(generation.id, mission.generationId))
    .limit(1);
  if (!generationRow) {
    throw new StoryError('invalid', 'writer_scene_generation_missing');
  }
  const generationInput = (generationRow.input ??
    {}) as WriterSceneGenerationInput;
  const capture = writerMissionCaptureV3ContinuationSchema.parse(
    generationInput.writerMissionCapture,
  );
  if (capture.capturedRequestHash !== mission.captureSha256) {
    throw new StoryError('conflict', 'writer_scene_capture_mismatch');
  }

  const [existingPassage] = await tx
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, mission.storyId),
        eq(storyPassage.sourceGenerationId, mission.generationId),
      ),
    )
    .limit(1);
  if (existingPassage) {
    const [checkpoint] = await tx
      .select({ checkpointHash: storySceneCheckpoint.checkpointHash })
      .from(storySceneCheckpoint)
      .where(
        and(
          eq(storySceneCheckpoint.storyId, mission.storyId),
          eq(
            storySceneCheckpoint.sceneSequence,
            capture.sceneScope.baseSceneSequence + 1,
          ),
        ),
      )
      .limit(1);
    if (!checkpoint) {
      throw new StoryError('conflict', 'writer_scene_checkpoint_missing');
    }
    return {
      passageId: existingPassage.id,
      checkpointHash: checkpoint.checkpointHash,
      replayed: true,
    };
  }

  mark('lock-story');
  const current = await lockOwnedStory(tx, {
    ownerId: mission.ownerId,
    storyId: mission.storyId,
  });

  mark('base-identity');
  const [committedCheckpoint] = await tx
    .select({ checkpointHash: storySceneCheckpoint.checkpointHash })
    .from(storySceneCheckpoint)
    .where(
      and(
        eq(storySceneCheckpoint.storyId, mission.storyId),
        eq(storySceneCheckpoint.sceneSequence, capture.sceneScope.baseSceneSequence),
      ),
    )
    .limit(1);
  if (
    !committedCheckpoint ||
    committedCheckpoint.checkpointHash !== capture.sceneScope.baseCheckpointHash ||
    current.documentRootHash !== capture.sceneScope.baseRootHash ||
    current.documentRootRevision !== capture.sceneScope.baseRootRevision ||
    current.revision !== capture.sceneScope.baseNarrativeRevision
  ) {
    throw new StoryError('conflict', 'writer_scene_base_stale');
  }

  mark('document-store');
  const writer = checkpointWriterStore(store);
  if (!writer) {
    throw new StoryError('unavailable', 'document_store');
  }

  const nextSequence = capture.sceneScope.baseSceneSequence + 1;
  const passageId = randomUUID();
  const transitionId = mission.generationId;
  const interactionId = proposal.scene.interaction ? randomUUID() : null;

  mark('canon-adopt');
  const publicationChanges =
    proposal.documentChanges.length > 0
      ? await mapCanonAdoptChanges(
          proposal,
          store,
          capture.sceneScope.baseRootHash,
        )
      : [];

  mark('stage-documents');
  const stagedPublication = await stageStoryPublicationDocuments({
    storage: store,
    storyId: mission.storyId,
    passageId,
    sequence: nextSequence,
    operationId: transitionId,
    rootHash: capture.sceneScope.baseRootHash,
    rootRevision: capture.sceneScope.baseRootRevision,
    content: proposal.scene.content,
    changes: publicationChanges,
  });

  const continuationInput = continuationSchema.parse({
    expectedRevision: current.revision,
    effects: [],
    content: proposal.scene.content,
    interaction: proposal.scene.interaction,
    response: null,
    wait: null,
    decision: null,
    sourceGenerationId: mission.generationId,
    sourceGenerationPart: 'current',
  });

  if (proposal.scene.interaction?.kind === 'choice.v1') {
    for (const option of proposal.scene.interaction.options) {
      const hasPlan = plans.some((plan) => plan.key === option.id);
      if (!hasPlan) {
        throw new StoryError('invalid', 'writer_scene_plan_missing');
      }
    }
  }

  assertSourceEvidenceRootHashes(
    proposal,
    capture.sceneScope.baseRootHash,
  );

  mark('insert-passage');
  await insertContinuationPassage(tx, {
    storyId: mission.storyId,
    sequence: nextSequence,
    transitionId,
    input: continuationInput,
    responseSource: null,
    sourceGenerationId: mission.generationId,
    passageId,
    contentDocumentHash: stagedPublication.passageObjectHash,
    ...(interactionId ? { interactionId } : {}),
  });

  mark('campaign-offer');
  const offerId = randomUUID();
  if (proposal.scene.interaction?.kind === 'choice.v1') {
    const plannedOffer = buildChoiceOffer(
      offerId,
      proposal.scene.interaction,
      plans,
    );
    const offer = envelopPublicationOffer(plannedOffer);
    await saveOfferPlans(
      tx,
      mission.storyId,
      nextSequence,
      offerId,
      plans,
    );
    await tx
      .update(campaign)
      .set({
        offer,
        situationAuthorization: {
          version: 2,
          offerId,
          activityAccess: {
            kind: 'selected',
            actionKeys: plans.map((plan) => plan.key),
          },
          preparedPlans: [],
        },
      })
      .where(eq(campaign.storyId, mission.storyId));
  } else {
    await tx
      .update(campaign)
      .set({
        offer: null,
        situationAuthorization: {
          version: 2,
          offerId: null,
          activityAccess: { kind: 'none' },
          preparedPlans: [],
        },
      })
      .where(eq(campaign.storyId, mission.storyId));
  }

  mark('commit-canon');
  await commitStagedStoryPublication(tx, {
    storyId: mission.storyId,
    operationId: transitionId,
    staged: stagedPublication,
  });

  if (current.storyteller != null) {
    await tx
      .update(story)
      .set({
        activeSceneScope: {
          version: 'active-scene-anchor.v1',
          fromSequence: nextSequence,
          requiredPassageIds: [passageId],
          recallCues: [],
        },
      })
      .where(eq(story.id, mission.storyId));
  }

  await advanceStoryView(tx, {
    storyId: mission.storyId,
    revision: nextSequence,
    viewVersion: current.viewVersion + 1,
  });

  const pins = await checkpointPinsForRoot({
    storage: writer,
    rootHash: stagedPublication.rootHash,
    storytellerProfile: current.storyteller ?? null,
  });

  mark('scene-checkpoint');
  const sceneAfter = await readSceneAfterState(tx, mission.storyId);
  const narrativeOnly =
    sceneAfter.campaign?.character == null &&
    sceneAfter.campaign?.content == null;
  const checkpointSceneAfter = narrativeOnly
    ? {
        ...sceneAfter,
        campaign: null,
        gameOffers: [],
        actionExecutions: [],
        activities: [],
        worldObligations: [],
      }
    : sceneAfter;
  const actualAfter = toV2FictionalState(checkpointSceneAfter);

  const checkpointCandidate = sceneCheckpointSchema.parse({
    format: 'offscreen.scene-checkpoint.v2',
    stateSchemaVersion: 2,
    storyId: mission.storyId,
    passageId,
    sceneSequence: nextSequence,
    transitionId,
    source: current.source,
    premise: current.premise ?? null,
    storyteller: current.storyteller ?? null,
    execution: current.execution ?? null,
    usagePolicy: current.usagePolicy ?? null,
    canon: {
      rootHash: stagedPublication.rootHash,
      rootRevision: stagedPublication.rootRevision,
    },
    ancestor: { storyId: null, rootHash: null, rootRevision: null },
    pins,
    passage: {
      response: continuationInput.response,
      responseSource: null,
      initialItems: null,
      effects: continuationInput.effects,
      decisionPlan: wrapAdmittedPassagePlan('decision', continuationInput.decision),
      waitPlan: wrapAdmittedPassagePlan('wait', continuationInput.wait),
      controlRevision: 0,
      content: stagedPublication.passageObjectHash ? null : continuationInput.content,
      contentDocumentHash: stagedPublication.passageObjectHash,
      interaction:
        continuationInput.interaction && interactionId
          ? { id: interactionId, specification: continuationInput.interaction }
          : null,
    },
    fictionalState: actualAfter,
  });

  const stagedCheckpoint = await stageSceneCheckpointObject(
    writer,
    checkpointCandidate,
  );

  const sceneAfterCommit = await readSceneAfterState(tx, mission.storyId);
  const checkpointSceneAfterCommit = narrativeOnly
    ? {
        ...sceneAfterCommit,
        campaign: null,
        gameOffers: [],
        actionExecutions: [],
        activities: [],
        worldObligations: [],
      }
    : sceneAfterCommit;
  const actual = toV2FictionalState(checkpointSceneAfterCommit);
  if (stagedCheckpoint.checkpoint.format !== 'offscreen.scene-checkpoint.v2') {
    throw new StoryError('conflict', 'state_not_representable');
  }
  assertV2PostStateMatches(stagedCheckpoint.checkpoint.fictionalState, actual);

  mark('checkpoint-selector');
  const selector = await insertStagedSceneCheckpointSelector(tx, {
    ownerId: mission.ownerId,
    operationId: transitionId,
    staged: stagedCheckpoint,
  });

  await tx
    .update(storytellerWriterMission)
    .set({
      state: 'proposal-ready',
      updatedAt: sql`clock_timestamp()`,
    })
    .where(eq(storytellerWriterMission.id, mission.id));

  if (proposal.scene.interaction?.kind === 'choice.v1') {
    const stored = await tx
      .select({ id: gameOffer.id })
      .from(gameOffer)
      .where(
        and(eq(gameOffer.storyId, mission.storyId), eq(gameOffer.id, offerId)),
      )
      .limit(1);
    if (!stored.length) {
      throw new StoryError('conflict', 'writer_scene_plan_missing');
    }
  }

  return {
    passageId,
    checkpointHash: selector.checkpointHash,
    replayed: false,
  };
}
