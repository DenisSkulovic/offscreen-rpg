import { campaign, campaignSettings, gameActivity } from '@offscreen/db/campaign-schema';
import { and, eq } from 'drizzle-orm';
import { isDeepStrictEqual } from 'node:util';
import { generation } from '@offscreen/db/generation-schema';
import { story, storyItem, storyPassage, storyResolution } from '@offscreen/db/story-schema';
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
import type { Transaction } from '@offscreen/db/outbox';
import { enqueue } from '@offscreen/db/outbox';
import {
  insertStorytellerTask,
  storytellerKind,
  storytellerNoticeTopicForWake,
} from './records';
import {
  activeSceneAnchorSchema,
  assembleStorytellerContextFromResolutionCapture,
  captureStorytellerResolutionContextSql,
  type StorytellerResolutionContextSqlCapture,
} from './context';
import {
  canonicalContextDependencies,
  canonicalWorldEvidence,
} from './canonical-knowledge';
import {
  incrementStoryViewVersion,
  lockOwnedStory,
  requireCurrentPassage,
} from '../stories/persistence';
import { StoryError } from '../stories/errors';
import { effectiveUsagePolicySchema } from '@offscreen/contracts/usage-policy';
import { prepareAdmittedStorytellerTask } from './task-admission';
import type { DocumentStore } from '@offscreen/documents';
import {
  publicationChangedDocumentId,
  readPassageDocument,
} from '../stories/passage-documents';
import { storyItemsSchema } from '@offscreen/contracts/stories';
import { campaignSettingsSchema } from '@offscreen/contracts/campaign';
import {
  isStorytellerActivityState,
  storytellerActivityContextFilter,
} from './activity-context';

export type StorytellerResolutionFence = Readonly<{
  ownerId: string;
  storyId: string;
  operationId: string;
  expectedRevision: number;
  submission: ReturnType<typeof interactionSubmissionSchema.parse>;
  viewVersion: number;
  premise: unknown;
  notes: unknown;
  activeSceneScope: unknown;
  documentRootHash: string | null;
  documentRootRevision: number;
  storyteller: unknown;
  execution: unknown;
  usagePolicy: unknown;
  activePassageId: string;
  activeContentDocumentHash: string | null;
  activeInlineContent: unknown | null;
  sourceGenerationId: string;
  sourceGenerationPart: string;
  activeInteraction: unknown;
  transitionId: string | null;
  sourceGeneration: {
    id: string;
    ownerId: string;
    kind: string;
    state: string;
    input: unknown;
    output: unknown;
  };
  selected: { id: string; label: string; intention: string };
  contextSql: StorytellerResolutionContextSqlCapture;
  canonical?: {
    rootHash: string;
    rootRevision: number;
    librarySectionSelection?: ReturnType<typeof canonicalWorldEvidence>;
    campaignDocumentIds?: string[];
  };
}>;

export type PreparedStorytellerResolution = Readonly<{
  fence: StorytellerResolutionFence;
  task: ReturnType<typeof prepareAdmittedStorytellerTask>;
}>;

function normalizeActiveSceneScope(scope: unknown) {
  if (scope === null || scope === undefined) return null;
  return activeSceneAnchorSchema.parse(scope);
}

/** Fast idempotent replay without CAS reads or story FOR UPDATE. */
export async function replayStorytellerResolutionIfMatching(
  database: Database,
  input: {
    ownerId: string;
    storyId: string;
    operationId: string;
    expectedRevision: number;
    submission: unknown;
  },
) {
  const submission = interactionSubmissionSchema.parse(input.submission);
  const [prior] = await database.db
    .select()
    .from(storyResolution)
    .where(
      and(
        eq(storyResolution.storyId, input.storyId),
        eq(storyResolution.operationId, input.operationId),
      ),
    );
  if (!prior) return false;
  if (
    prior.baseRevision !== input.expectedRevision ||
    !isDeepStrictEqual(prior.submission, submission)
  ) {
    throw new StoryError('conflict');
  }
  await database.db.transaction(async (tx) => {
    await enqueue(tx, {
      id: input.operationId,
      operationId: input.operationId,
      topic: await storytellerNoticeTopicForWake(tx, input.operationId),
    });
  });
  return true;
}

function assertStorytellerResolutionFence(
  current: typeof story.$inferSelect,
  active: typeof storyPassage.$inferSelect,
  source: typeof generation.$inferSelect,
  mechanics: typeof campaign.$inferSelect | undefined,
  items: unknown,
  commitments: StorytellerResolutionContextSqlCapture['commitments'],
  capturedSettings: unknown | null,
  fence: StorytellerResolutionFence,
) {
  if (current.revision !== fence.expectedRevision) {
    throw new StoryError('conflict');
  }
  if (current.viewVersion !== fence.viewVersion) {
    throw new StoryError('conflict');
  }
  if (
    current.documentRootHash !== fence.documentRootHash ||
    current.documentRootRevision !== fence.documentRootRevision
  ) {
    throw new StoryError('conflict');
  }
  if (
    !isDeepStrictEqual(
      normalizeActiveSceneScope(current.activeSceneScope),
      normalizeActiveSceneScope(fence.activeSceneScope),
    )
  ) {
    throw new StoryError('conflict');
  }
  if (!isDeepStrictEqual(current.continuityNotes, fence.notes)) {
    throw new StoryError('conflict');
  }
  if (!isDeepStrictEqual(current.premise, fence.premise)) {
    throw new StoryError('conflict');
  }
  if (active.id !== fence.activePassageId) {
    throw new StoryError('conflict');
  }
  if (active.contentDocumentHash !== fence.activeContentDocumentHash) {
    throw new StoryError('conflict');
  }
  if (
    fence.activeContentDocumentHash === null &&
    !isDeepStrictEqual(active.content, fence.activeInlineContent)
  ) {
    throw new StoryError('conflict');
  }
  if (active.sourceGenerationId !== fence.sourceGenerationId) {
    throw new StoryError('conflict');
  }
  if ((active.sourceGenerationPart ?? 'current') !== fence.sourceGenerationPart) {
    throw new StoryError('conflict');
  }
  if (!isDeepStrictEqual(active.interaction, fence.activeInteraction)) {
    throw new StoryError('conflict');
  }
  if (active.transitionId !== fence.transitionId) {
    throw new StoryError('conflict');
  }
  if (
    source.id !== fence.sourceGeneration.id ||
    source.ownerId !== fence.sourceGeneration.ownerId ||
    source.kind !== fence.sourceGeneration.kind ||
    source.state !== fence.sourceGeneration.state ||
    !isDeepStrictEqual(source.input, fence.sourceGeneration.input) ||
    !isDeepStrictEqual(source.output, fence.sourceGeneration.output)
  ) {
    throw new StoryError('conflict');
  }
  if (mechanics?.character) {
    throw new StoryError('conflict');
  }
  const parsedItems = storyItemsSchema.parse(items);
  if (!isDeepStrictEqual(parsedItems, fence.contextSql.items)) {
    throw new StoryError('conflict');
  }
  if (mechanics) {
    if (mechanics.settingsRevision !== fence.contextSql.settingsRevision) {
      throw new StoryError('conflict');
    }
    if (mechanics.gameSecond !== fence.contextSql.gameSecond) {
      throw new StoryError('conflict');
    }
    if (
      !isDeepStrictEqual(mechanics.worldConditions, fence.contextSql.worldConditions)
    ) {
      throw new StoryError('conflict');
    }
    if (
      !isDeepStrictEqual(
        mechanics.situationAuthorization,
        fence.contextSql.situationAuthorization,
      )
    ) {
      throw new StoryError('conflict');
    }
    if (mechanics.activeActivityId !== fence.contextSql.activeActivityId) {
      throw new StoryError('conflict');
    }
    if (
      !isDeepStrictEqual(
        mechanics.acceptedActivityPlan,
        fence.contextSql.acceptedActivityPlan,
      )
    ) {
      throw new StoryError('conflict');
    }
    if (
      capturedSettings === null ||
      !isDeepStrictEqual(capturedSettings, fence.contextSql.capturedSettings)
    ) {
      throw new StoryError('conflict');
    }
    if (!isDeepStrictEqual(commitments, fence.contextSql.commitments)) {
      throw new StoryError('conflict');
    }
  }
}

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
    ? await readPassageDocument(input.documentStore!, active.contentDocumentHash)
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
    (active.contentDocumentHash !== null || current.documentRootHash !== null) &&
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
    activeInlineContent: active.contentDocumentHash === null ? active.content : null,
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

export async function commitStorytellerResolution(
  tx: Transaction,
  prepared: PreparedStorytellerResolution,
) {
  const { fence } = prepared;
  const current = await lockOwnedStory(tx, {
    ownerId: fence.ownerId,
    storyId: fence.storyId,
  });
  const [prior] = await tx
    .select()
    .from(storyResolution)
    .where(
      and(
        eq(storyResolution.storyId, fence.storyId),
        eq(storyResolution.operationId, fence.operationId),
      ),
    );
  if (prior) {
    if (
      prior.baseRevision !== fence.expectedRevision ||
      !isDeepStrictEqual(prior.submission, fence.submission)
    ) {
      throw new StoryError('conflict');
    }
    await enqueue(tx, {
      id: fence.operationId,
      operationId: fence.operationId,
      topic: await storytellerNoticeTopicForWake(tx, fence.operationId),
    });
    return;
  }
  const active = await requireCurrentPassage(tx, {
    storyId: fence.storyId,
    sequence: fence.expectedRevision,
  });
  const [source] = await tx
    .select()
    .from(generation)
    .where(eq(generation.id, fence.sourceGenerationId));
  if (!source) throw new StoryError('conflict');
  const [mechanics] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, fence.storyId));
  const items = await tx
    .select({
      key: storyItem.key,
      label: storyItem.label,
      holderKey: storyItem.holderKey,
    })
    .from(storyItem)
    .where(eq(storyItem.storyId, fence.storyId));
  const commitments = mechanics
    ? (
        await tx
          .select()
          .from(gameActivity)
          .where(
            storytellerActivityContextFilter({
              storyId: fence.storyId,
              activeActivityId: mechanics.activeActivityId,
            }),
          )
      ).map((record) => ({
        id: record.id,
        revision: record.revision,
        state: record.state,
        plan: record.plan,
        progress: record.progress,
      }))
    : [];
  const [captured] =
    mechanics && mechanics.settingsRevision !== null
      ? await tx
          .select({ settings: campaignSettings.settings })
          .from(campaignSettings)
          .where(
            and(
              eq(campaignSettings.storyId, fence.storyId),
              eq(campaignSettings.revision, mechanics.settingsRevision),
            ),
          )
      : [];
  const parsedSettings = captured
    ? campaignSettingsSchema.parse(captured.settings)
    : null;
  assertStorytellerResolutionFence(
    current,
    active,
    source,
    mechanics,
    items,
    commitments,
    parsedSettings,
    fence,
  );
  const [existing] = await tx
    .select()
    .from(storyResolution)
    .where(
      and(
        eq(storyResolution.storyId, fence.storyId),
        eq(storyResolution.baseRevision, fence.expectedRevision),
      ),
    );
  if (existing) throw new StoryError('conflict');
  await insertStorytellerTask(tx, {
    id: fence.operationId,
    ownerId: fence.ownerId,
    task: prepared.task,
  });
  await tx.insert(storyResolution).values({
    generationId: fence.operationId,
    storyId: fence.storyId,
    basePassageId: fence.activePassageId,
    baseRevision: fence.expectedRevision,
    operationId: fence.operationId,
    submission: fence.submission,
  });
  await incrementStoryViewVersion(tx, {
    storyId: fence.storyId,
    viewVersion: current.viewVersion + 1,
  });
}