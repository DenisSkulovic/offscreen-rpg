import { campaign } from '@offscreen/db/campaign-schema';
import { and, eq } from 'drizzle-orm';
import { isDeepStrictEqual } from 'node:util';
import { generation } from '@offscreen/db/generation-schema';
import { storyResolution } from '@offscreen/db/story-schema';
import {
  interactionSchema,
  interactionSubmissionSchema,
  validateInteractionSubmission,
} from '@offscreen/contracts/interactions';
import { playablePresentation } from '@offscreen/storyteller/tasks';
import {
  publishedStorytellerSlice,
  storytellerTaskSchema,
} from '@offscreen/storyteller/tasks';
import { storytellerProfileSchema } from '@offscreen/storyteller/profiles';
import { executionPolicySchema } from '@offscreen/storyteller/tasks';
import type { Transaction } from '../outbox/index';
import { enqueue } from '../outbox/index';
import {
  insertStorytellerTask,
  storytellerKind,
  storytellerTopic,
} from './records';
import {
  canonicalContextDependencies,
  canonicalWorldEvidence,
  loadStorytellerContext,
} from './context';
import {
  incrementStoryViewVersion,
  requireCurrentPassage,
  type lockOwnedStory,
} from '../stories/persistence';
import { StoryError } from '../stories/errors';
import { effectiveUsagePolicySchema } from '@offscreen/contracts/usage-policy';
import { prepareAdmittedStorytellerTask } from './task-admission';
import type { DocumentStore } from '@offscreen/documents';
import { readPassageDocument } from '../stories/passage-documents';

export async function admitStorytellerResolution(
  tx: Transaction,
  input: {
    current: Awaited<ReturnType<typeof lockOwnedStory>>;
    operationId: string;
    expectedRevision: number;
    submission: unknown;
    documentStore?: DocumentStore;
  },
) {
  const { current, operationId, expectedRevision } = input;
  const [mechanics] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, current.id));
  // Mechanical intentions enter through campaign actions; consequence narration
  // shares this runtime but cannot bypass the admitted plan or reroll its results.
  if (mechanics?.character) throw new StoryError('conflict');
  const submission = interactionSubmissionSchema.parse(input.submission);
  const [prior] = await tx
    .select()
    .from(storyResolution)
    .where(
      and(
        eq(storyResolution.storyId, current.id),
        eq(storyResolution.operationId, operationId),
      ),
    );
  if (prior) {
    if (
      prior.baseRevision !== expectedRevision ||
      !isDeepStrictEqual(prior.submission, submission)
    ) {
      throw new StoryError('conflict');
    }
    await enqueue(tx, {
      id: operationId,
      operationId,
      topic: storytellerTopic,
    });
    return;
  }
  if (current.revision !== expectedRevision) {
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
  if (existing) {
    throw new StoryError('conflict');
  }
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
    sourceTask.context.canonicalKnowledge?.catalogue ?? [];
  const selectedCampaignDocumentIds = (
    selected.campaignDocuments ?? []
  ).map((handle) => {
    const entry = sourceCampaignCatalogue.find(
      (candidate) => candidate.handle === handle,
    );
    if (!entry) {
      throw new StoryError('invalid');
    }
    return entry.documentId;
  });
  const context = await loadStorytellerContext(tx, {
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
    ...canonicalContextDependencies(
      current,
      input.documentStore,
      selected.worldSections?.length
        ? canonicalWorldEvidence(selected.worldSections)
        : undefined,
      selectedCampaignDocumentIds.length
        ? selectedCampaignDocumentIds
        : undefined,
    ),
  });
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
  await insertStorytellerTask(tx, {
    id: operationId,
    ownerId: current.ownerId,
    task,
  });
  await tx.insert(storyResolution).values({
    generationId: operationId,
    storyId: current.id,
    basePassageId: active.id,
    baseRevision: current.revision,
    operationId,
    submission,
  });
  await incrementStoryViewVersion(tx, {
    storyId: current.id,
    viewVersion: current.viewVersion + 1,
  });
}
