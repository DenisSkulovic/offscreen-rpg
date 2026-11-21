import { campaign } from '@offscreen/db/campaign-schema';
import { and, eq } from 'drizzle-orm';
import { isDeepStrictEqual } from 'node:util';
import { generation } from '@offscreen/db/generation-schema';
import { story, storyResolution } from '@offscreen/db/story-schema';
import {
  interactionSchema,
  interactionSubmissionSchema,
  validateInteractionSubmission,
} from '@offscreen/contracts/interactions';
import { playablePresentation } from '@offscreen/storyteller/tasks';
import {
  publishedStorytellerSlice,
  storytellerResultSchema,
  storytellerTaskSchema,
} from '@offscreen/storyteller/tasks';
import { storytellerProfileSchema } from '@offscreen/storyteller/profiles';
import { executionPolicySchema } from '@offscreen/storyteller/tasks';
import type { Database } from '@offscreen/db';
import { storytellerKind } from './records';
import {
  assembleStorytellerContextFromResolutionCapture,
  captureStorytellerResolutionContextSql,
} from './context';
import type {
  PreparedStorytellerResolution,
  StorytellerResolutionFence,
} from '../stories/storyteller-resolution-contract';
import {
  canonicalContextDependencies,
  canonicalWorldEvidence,
} from './canonical-knowledge';
import { requireCurrentPassage } from '../stories/persistence';
import { StoryError } from '../stories/errors';
import { effectiveUsagePolicySchema } from '@offscreen/contracts/usage-policy';
import { prepareAdmittedStorytellerTask } from './task-admission';
import type { DocumentStore } from '@offscreen/documents';
import {
  publicationChangedDocumentId,
  readPassageDocument,
} from '../stories/passage-documents';
export {
  replayStorytellerResolutionIfMatching,
  commitStorytellerResolution,
} from '../stories/storyteller-resolution-authority';

export type {
  PrepareStorytellerResolution,
  PreparedStorytellerResolution,
  ResolutionPassageSource,
  StorytellerResolutionContextSqlCapture,
  StorytellerResolutionFence,
} from '../stories/storyteller-resolution-contract';

/** Read-only SQL snapshot, off-lock materialization, no game mutation. */
export async function prepareStorytellerResolution(
  database: Database,
  input: {
    ownerId: string;
    storyId: string;
    operationId: string;
    expectedRevision: number;
    submission: unknown;
    documentStore?: DocumentStore;
  },
): Promise<PreparedStorytellerResolution> {
  const submission = interactionSubmissionSchema.parse(input.submission);
  const snapshot = await database.db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(story)
      .where(
        and(eq(story.id, input.storyId), eq(story.ownerId, input.ownerId)),
      );
    if (!current) throw new StoryError('not_found');
    const [mechanics] = await tx
      .select()
      .from(campaign)
      .where(eq(campaign.storyId, current.id));
    if (mechanics?.character) throw new StoryError('conflict');
    const [prior] = await tx
      .select()
      .from(storyResolution)
      .where(
        and(
          eq(storyResolution.storyId, current.id),
          eq(storyResolution.operationId, input.operationId),
        ),
      );
    if (prior) {
      if (
        prior.baseRevision !== input.expectedRevision ||
        !isDeepStrictEqual(prior.submission, submission)
      ) {
        throw new StoryError('conflict');
      }
      throw new StoryError('conflict', 'replay_pending');
    }
    if (current.revision !== input.expectedRevision) {
      throw new StoryError('conflict');
    }
    const active = await requireCurrentPassage(tx, {
      storyId: current.id,
      sequence: current.revision,
    });
    if (
      !active.sourceGenerationId ||
      !active.interaction ||
      active.waitPlan ||
      active.decisionPlan
    ) {
      throw new StoryError('conflict');
    }
    const [existing] = await tx
      .select()
      .from(storyResolution)
      .where(
        and(
          eq(storyResolution.storyId, current.id),
          eq(storyResolution.baseRevision, current.revision),
        ),
      );
    if (existing) throw new StoryError('conflict');
    const [source] = await tx
      .select()
      .from(generation)
      .where(eq(generation.id, active.sourceGenerationId));
    if (
      !source ||
      source.ownerId !== current.ownerId ||
      source.kind !== storytellerKind ||
      source.state !== 'succeeded'
    ) {
      throw new StoryError('invalid');
    }
    const sourceTask = storytellerTaskSchema.parse(source.input);
    if (
      sourceTask.task === 'continuation' &&
      sourceTask.source.storyId !== current.id
    ) {
      throw new StoryError('invalid');
    }
    const contextSql = await captureStorytellerResolutionContextSql(tx, {
      storyId: current.id,
      revision: current.revision,
      notes: current.continuityNotes,
      activeSceneScope: current.activeSceneScope,
    });
    return { current, active, source, mechanics, contextSql };
  });

  const { current, active, source, contextSql } = snapshot;
  const part =
    active.sourceGenerationPart === 'arrival' ? 'arrival' : 'current';
  const published = publishedStorytellerSlice(source.output, part);
  const presentation = playablePresentation(published);
  const offer = interactionSchema.parse(active.interaction);
  if (active.contentDocumentHash !== null && !input.documentStore) {
    throw new StoryError('unavailable', 'document_store');
  }
  const activeContent = active.contentDocumentHash
    ? await readPassageDocument(
        input.documentStore!,
        active.contentDocumentHash,
      )
    : active.content;
  if (
    !isDeepStrictEqual(presentation.content, activeContent) ||
    !isDeepStrictEqual(presentation.interaction, offer.specification) ||
    published.next.kind !== 'choice'
  ) {
    throw new StoryError('conflict');
  }
  validateInteractionSubmission(offer, submission);
  const selected = published.next.options.find(
    (option) => option.id === submission.answer.optionId,
  );
  if (!selected) {
    throw new StoryError('invalid');
  }
  const sourceCampaignCatalogue =
    storytellerTaskSchema.parse(source.input).context.canonicalKnowledge
      ?.catalogue ?? [];
  const selectedCampaignDocumentIds = (selected.campaignDocuments ?? []).map(
    (handle) => {
      const entry = sourceCampaignCatalogue.find(
        (candidate) => candidate.handle === handle,
      );
      if (!entry) throw new StoryError('invalid');
      return entry.documentId;
    },
  );
  const sourceResult = storytellerResultSchema.parse(source.output);
  const sourcePublicationOperationId = active.transitionId;
  if (
    (selected.createdDocuments?.length ?? 0) > 0 &&
    !sourcePublicationOperationId
  ) {
    throw new StoryError('invalid');
  }
  const selectedCreatedDocumentIds = (selected.createdDocuments ?? []).map(
    (index) => {
      const change = sourceResult.documentChanges[index];
      if (!change) throw new StoryError('invalid');
      return publicationChangedDocumentId(
        sourcePublicationOperationId!,
        index,
        change,
      );
    },
  );
  const selectedDocumentIds = [
    ...new Set([...selectedCampaignDocumentIds, ...selectedCreatedDocumentIds]),
  ];
  const canonicalDeps = canonicalContextDependencies(
    current,
    input.documentStore,
    selected.worldSections?.length
      ? canonicalWorldEvidence(selected.worldSections)
      : undefined,
    selectedDocumentIds.length ? selectedDocumentIds : undefined,
  );
  const canonicalPin: StorytellerResolutionFence['canonical'] =
    'canonical' in canonicalDeps
      ? (canonicalDeps.canonical as NonNullable<
          StorytellerResolutionFence['canonical']
        >)
      : undefined;
  if (
    (active.contentDocumentHash !== null ||
      current.documentRootHash !== null) &&
    !input.documentStore
  ) {
    throw new StoryError('unavailable', 'document_store');
  }
  const context = await assembleStorytellerContextFromResolutionCapture(
    input.documentStore,
    contextSql,
    {
      storyId: current.id,
      revision: current.revision,
      premise: current.premise,
      notes: current.continuityNotes,
      activeSceneScope: current.activeSceneScope,
      selected: {
        id: selected.id,
        label: selected.label,
        intention: selected.intention,
      },
      ...(canonicalPin ? { canonical: canonicalPin } : {}),
    },
  );
  const task = prepareAdmittedStorytellerTask(
    {
      task: 'continuation',
      source: {
        storyId: current.id,
        narrativeRevision: current.revision,
        passageId: active.id,
        interactionId: offer.id,
      },
      profile: storytellerProfileSchema.parse(current.storyteller),
      execution: executionPolicySchema.parse(current.execution),
      context,
    },
    current.usagePolicy === null
      ? null
      : effectiveUsagePolicySchema.parse(current.usagePolicy),
  );
  const fence: StorytellerResolutionFence = {
    ownerId: current.ownerId,
    storyId: current.id,
    operationId: input.operationId,
    expectedRevision: input.expectedRevision,
    submission,
    viewVersion: current.viewVersion,
    premise: current.premise,
    notes: current.continuityNotes,
    activeSceneScope: current.activeSceneScope,
    documentRootHash: current.documentRootHash,
    documentRootRevision: current.documentRootRevision,
    storyteller: current.storyteller,
    execution: current.execution,
    usagePolicy: current.usagePolicy,
    activePassageId: active.id,
    activeContentDocumentHash: active.contentDocumentHash,
    activeInlineContent:
      active.contentDocumentHash === null ? active.content : null,
    sourceGenerationId: active.sourceGenerationId!,
    sourceGenerationPart: part,
    activeInteraction: active.interaction,
    transitionId: active.transitionId,
    sourceGeneration: {
      id: source.id,
      ownerId: source.ownerId,
      kind: source.kind,
      state: source.state,
      input: source.input,
      output: source.output,
    },
    selected: {
      id: selected.id,
      label: selected.label,
      intention: selected.intention,
    },
    contextSql,
    ...(canonicalPin ? { canonical: canonicalPin } : {}),
  };
  return { fence, task };
}
