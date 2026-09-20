import {
  storytellerTaskSchema,
  storytellerResultSchema,
  publishedStorytellerSlice,
} from '@offscreen/storyteller/tasks';
import { storytellerProfileSchema } from '@offscreen/storyteller/profiles';
import { continuityNotesSchema } from '@offscreen/storyteller/context';
import {
  generatedStorytellerOutputSchema,
  generationSourcePartSchema,
  playableContinuationArtifactSchema,
  playableOpeningArtifactSchema,
  publishedPlayableFromGeneration,
} from '@offscreen/storyteller/tasks';
import {
  chamberInspectorHistoryLimit,
  chamberInspectorSchema,
} from '@offscreen/contracts/chamber';
import { passageContentSchema } from '@offscreen/contracts/stories';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { campaignReport } from '@offscreen/db/campaign-schema';
import {
  storytellerAttempt,
  storytellerDispatchReview,
  storytellerPublication,
} from '@offscreen/db/storyteller-schema';
import {
  story,
  storyPassage,
  storyResolution,
} from '@offscreen/db/story-schema';
import { and, desc, eq, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { parseStoryIdentifier, StoryError } from '../stories/errors';
import { decisionPlanSchema, waitPlanSchema } from '../stories/plans';
import { createStories } from '../stories/index';
import { campaignReportSourceSchema } from '../campaign/report-source';
import type { DocumentStore } from '@offscreen/documents';
import { readPassageDocument } from '../stories/passage-documents';

type OwnedStory = Readonly<{
  ownerId: string;
  storyId: string;
}>;

const responseSourceSchema = z.enum(['player', 'default']);

function timestampIso(value: Date | null) {
  return value === null ? null : value.toISOString();
}

function parseSourcePart(value: unknown) {
  if (value == null) {
    return null;
  }
  const parsed = generationSourcePartSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error('Stored passage has an invalid generation source part');
  }
  return parsed.data;
}

function parseResponseSource(value: unknown) {
  if (value == null) {
    return null;
  }
  const parsed = responseSourceSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error('Stored passage has an invalid response source');
  }
  return parsed.data;
}

function invariantMissing(field: string): never {
  throw new Error(`Stored generation provenance is missing ${field}`);
}

function hasCommittedEffects(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

function inspectGeneration(row: {
  id: string;
  kind: string;
  state: 'pending' | 'running' | 'succeeded' | 'failed' | 'uncertain';
  failureCode: string | null;
  input: unknown;
  output: unknown;
  sourcePart: 'current' | 'arrival' | null;
}) {
  const artifact = playableOpeningArtifactSchema.safeParse(row.input);
  let published: ReturnType<typeof publishedPlayableFromGeneration> | null;
  try {
    if (row.sourcePart === null) {
      published = null;
    } else if (storytellerResultSchema.safeParse(row.output).success) {
      published = publishedStorytellerSlice(row.output, row.sourcePart);
    } else {
      published = publishedPlayableFromGeneration({
        output: row.output,
        sourcePart: row.sourcePart,
      });
    }
  } catch {
    published = null;
  }
  const optionIntentions =
    published?.next.kind === 'choice'
      ? published.next.options.map((option) => ({
          id: option.id,
          intention: option.intention,
        }))
      : null;
  const proposal = generatedStorytellerOutputSchema.safeParse(row.output);
  return {
    id: row.id,
    kind: row.kind,
    state: row.state,
    failureCode: row.failureCode,
    sourceDraftId: artifact.success ? artifact.data.source.draftId : null,
    sourceDraftRevision: artifact.success
      ? artifact.data.source.draftRevision
      : null,
    proposal: proposal.success ? proposal.data : null,
    optionIntentions,
  };
}

export function createChamberInspector(
  database: Database,
  documentStore?: DocumentStore,
) {
  const stories = createStories(
    database,
    documentStore ? { documentStore } : {},
  );

  return {
    async inspect({ ownerId, storyId }: OwnedStory) {
      const id = parseStoryIdentifier(storyId);
      const snapshot = await stories.read({ ownerId, storyId: id });
      const [current] = await database.db
        .select({
          createdAt: story.createdAt,
          source: story.source,
          storyteller: story.storyteller,
          continuityNotes: story.continuityNotes,
          documentRootHash: story.documentRootHash,
          documentRootRevision: story.documentRootRevision,
          sequence: storyPassage.sequence,
          transitionId: storyPassage.transitionId,
          responseSource: storyPassage.responseSource,
          sourceGenerationId: storyPassage.sourceGenerationId,
          sourceGenerationPart: storyPassage.sourceGenerationPart,
          waitPlan: storyPassage.waitPlan,
          decisionPlan: storyPassage.decisionPlan,
          dueAt: storyPassage.dueAt,
          remainingMs: storyPassage.remainingMs,
          controlRevision: storyPassage.controlRevision,
          responseDueAt: storyPassage.responseDueAt,
          generationId: generation.id,
          generationKind: generation.kind,
          generationState: generation.state,
          generationFailureCode: generation.failureCode,
          generationInput: generation.input,
          generationOutput: generation.output,
        })
        .from(story)
        .innerJoin(
          storyPassage,
          and(
            eq(storyPassage.storyId, story.id),
            eq(storyPassage.sequence, story.revision),
          ),
        )
        .leftJoin(
          generation,
          eq(generation.id, storyPassage.sourceGenerationId),
        )
        .where(and(eq(story.id, id), eq(story.ownerId, ownerId)));
      if (!current) {
        throw new StoryError('not_found');
      }
      const history = await database.db
        .select({
          sequence: storyPassage.sequence,
          passageId: storyPassage.id,
          transitionId: storyPassage.transitionId,
          content: storyPassage.content,
          contentDocumentHash: storyPassage.contentDocumentHash,
          responseSource: storyPassage.responseSource,
          interaction: storyPassage.interaction,
          waitPlan: storyPassage.waitPlan,
          decisionPlan: storyPassage.decisionPlan,
          effects: storyPassage.effects,
        })
        .from(storyPassage)
        .where(
          and(
            eq(storyPassage.storyId, id),
            lte(storyPassage.sequence, snapshot.revision),
          ),
        )
        .orderBy(desc(storyPassage.sequence))
        .limit(chamberInspectorHistoryLimit);
      const [activeResolution] = await database.db
        .select({
          operationId: storyResolution.operationId,
          basePassageId: storyResolution.basePassageId,
          baseRevision: storyResolution.baseRevision,
          generationId: storyResolution.generationId,
          generationKind: generation.kind,
          generationState: generation.state,
          generationInput: generation.input,
          generationOutput: generation.output,
          dispatchReviewRevision: storytellerDispatchReview.revision,
          dispatchReviewMode: storytellerDispatchReview.mode,
          dispatchReviewState: storytellerDispatchReview.state,
          dispatchReviewPacketSha256: storytellerDispatchReview.packetSha256,
          dispatchReviewPacket: storytellerDispatchReview.packet,
          dispatchReviewInspection: storytellerDispatchReview.inspection,
          dispatchReviewPreparedAt: storytellerDispatchReview.preparedAt,
          dispatchReviewReviewedAt: storytellerDispatchReview.reviewedAt,
        })
        .from(storyResolution)
        .innerJoin(generation, eq(generation.id, storyResolution.generationId))
        .leftJoin(
          storytellerDispatchReview,
          eq(
            storytellerDispatchReview.generationId,
            storyResolution.generationId,
          ),
        )
        .where(
          and(
            eq(storyResolution.storyId, id),
            eq(storyResolution.basePassageId, snapshot.current.id),
            eq(storyResolution.baseRevision, snapshot.revision),
          ),
        );
      const reportRows = await database.db
        .select({
          hookId: campaignReport.id,
          source: campaignReport.source,
          sourcePassageId: campaignReport.sourcePassageId,
          sourceRevision: campaignReport.sourceRevision,
          sourceTick: campaignReport.sourceTick,
          state: campaignReport.state,
          generationId: campaignReport.generationId,
          generationState: generation.state,
          generationFailureCode: generation.failureCode,
          publicationState: storytellerPublication.state,
          publicationFailureCode: storytellerPublication.failureCode,
        })
        .from(campaignReport)
        .leftJoin(generation, eq(generation.id, campaignReport.generationId))
        .leftJoin(
          storytellerPublication,
          eq(storytellerPublication.generationId, campaignReport.generationId),
        )
        .where(eq(campaignReport.storyId, id))
        .orderBy(desc(campaignReport.createdAt))
        .limit(100);
      const activityReports = reportRows.flatMap((report) => {
        const source = campaignReportSourceSchema.parse(report.source);
        return source.kind === 'activity'
          ? [
              {
                ...report,
                activityId: source.activityId,
                activityRevision: source.activityRevision,
              },
            ]
          : [];
      });
      const costScope = sql`${storytellerAttempt.ownerId} = ${ownerId} AND (${storytellerAttempt.storyId} = ${id} OR ${storytellerAttempt.generationId} IN (SELECT ${storyPassage.sourceGenerationId} FROM ${storyPassage} WHERE ${storyPassage.storyId} = ${id} AND ${storyPassage.sourceGenerationId} IS NOT NULL) OR ${storytellerAttempt.generationId} IN (SELECT ${storyResolution.generationId} FROM ${storyResolution} WHERE ${storyResolution.storyId} = ${id}))`;
      const [costTotals] = await database.db
        .select({
          attempts: sql<number>`count(*)::int`,
          estimatedMicrousd: sql<string>`COALESCE(sum(${storytellerAttempt.estimatedMicrousd}), 0)::text`,
          reservedMicrousd: sql<string>`COALESCE(sum(CASE WHEN ${storytellerAttempt.state} IN ('reserved','dispatched','uncertain') THEN ${storytellerAttempt.reservedMicrousd} ELSE 0 END), 0)::text`,
          chargedMicrousd: sql<string>`COALESCE(sum(${storytellerAttempt.chargedMicrousd}), 0)::text`,
          uncertainAttempts: sql<number>`count(*) FILTER (WHERE ${storytellerAttempt.state} = 'uncertain')::int`,
          differentAttempts: sql<number>`count(*) FILTER (WHERE ${storytellerAttempt.reconciliation} = 'different')::int`,
        })
        .from(storytellerAttempt)
        .where(costScope);
      const costAttempts = await database.db
        .select()
        .from(storytellerAttempt)
        .where(costScope)
        .orderBy(desc(storytellerAttempt.createdAt))
        .limit(50);
      const sourceGeneration =
        current.generationId === null
          ? null
          : inspectGeneration({
              id: current.generationId,
              kind:
                current.generationKind ?? invariantMissing('generation kind'),
              state:
                current.generationState ?? invariantMissing('generation state'),
              failureCode: current.generationFailureCode,
              input: current.generationInput,
              output: current.generationOutput,
              sourcePart: parseSourcePart(current.sourceGenerationPart),
            });
      const continuationArtifact = playableContinuationArtifactSchema.safeParse(
        activeResolution?.generationInput,
      );
      const selectedOptionId = continuationArtifact.success
        ? continuationArtifact.data.selectedOptionId
        : null;
      const selectedIntention =
        sourceGeneration?.optionIntentions?.find(
          (option) => option.id === selectedOptionId,
        )?.intention ?? null;
      const continuationProposal = generatedStorytellerOutputSchema.safeParse(
        activeResolution?.generationOutput,
      );
      const activeTask = storytellerTaskSchema.safeParse(
        activeResolution?.generationInput,
      );
      const recentHistory = await Promise.all(
        history.map(async (entry) => {
          if (entry.contentDocumentHash !== null && !documentStore) {
            throw new StoryError('unavailable', 'document_store');
          }
          const content = entry.contentDocumentHash
            ? await readPassageDocument(documentStore!, entry.contentDocumentHash)
            : passageContentSchema.parse(entry.content);
          return {
            sequence: entry.sequence,
            passageId: entry.passageId,
            transitionId: entry.transitionId,
            title: content.title,
            responseSource: parseResponseSource(entry.responseSource),
            hasInteraction: entry.interaction !== null,
            hasWait: entry.waitPlan !== null,
            hasDecision: entry.decisionPlan !== null,
            hasEffect: hasCommittedEffects(entry.effects),
          };
        }),
      );
      return chamberInspectorSchema.parse({
        documents: {
          rootHash: current.documentRootHash,
          rootRevision: current.documentRootRevision,
        },
        costAccounting: {
          totals: costTotals ?? {
            attempts: 0,
            estimatedMicrousd: '0',
            reservedMicrousd: '0',
            chargedMicrousd: '0',
            uncertainAttempts: 0,
            differentAttempts: 0,
          },
          recentAttempts: costAttempts.map((attempt) => ({
            id: attempt.id,
            generationId: attempt.generationId,
            purpose: attempt.purpose,
            state: attempt.state,
            profile: {
              id: attempt.storytellerProfileId,
              revision: attempt.storytellerProfileRevision,
            },
            requestedModel: attempt.requestedModel,
            requestedProvider: attempt.requestedProvider,
            reportedModel: attempt.reportedModel,
            providerId: attempt.providerId,
            priceVersion: attempt.priceVersion,
            estimationMethod: attempt.estimationMethod,
            requestBytes: attempt.requestBytes,
            estimatedInputTokens: attempt.estimatedInputTokens,
            estimatedMicrousd: attempt.estimatedMicrousd.toString(),
            reservedMicrousd: attempt.reservedMicrousd.toString(),
            chargedMicrousd: attempt.chargedMicrousd?.toString() ?? null,
            calculatedMicrousd: attempt.calculatedMicrousd?.toString() ?? null,
            reconciliation: attempt.reconciliation,
            promptTokens: attempt.promptTokens,
            completionTokens: attempt.completionTokens,
            reasoningTokens: attempt.reasoningTokens,
            cachedTokens: attempt.cachedTokens,
            cacheWriteTokens: attempt.cacheWriteTokens,
            totalTokens: attempt.totalTokens,
            httpStatus: attempt.httpStatus,
            finishReason: attempt.finishReason,
            durationMs: attempt.durationMs,
            createdAt: attempt.createdAt.toISOString(),
            dispatchedAt: timestampIso(attempt.dispatchedAt),
            settledAt: timestampIso(attempt.settledAt),
          })),
        },
        acceptedActivityPlan: snapshot.campaign?.acceptedActivityPlan ?? null,
        activityAccess: snapshot.campaign?.activityAccess ?? { kind: 'none' },
        activityReports,
        storyteller:
          current.storyteller == null
            ? null
            : {
                profile: storytellerProfileSchema.parse(current.storyteller),
                notes: continuityNotesSchema.parse(
                  current.continuityNotes ?? [],
                ),
                context: activeTask.success ? activeTask.data.context : null,
                librarySelection: activeTask.success
                  ? (activeTask.data.context.canonicalKnowledge
                      ?.librarySelection ?? null)
                  : null,
                documentSelection: activeTask.success
                  ? (activeTask.data.context.canonicalKnowledge
                      ?.documentSelection ?? null)
                  : null,
              },
        story: {
          id: snapshot.id,
          source: current.source,
          revision: snapshot.revision,
          viewVersion: snapshot.viewVersion,
          createdAt: current.createdAt.toISOString(),
        },
        current: {
          passageId: snapshot.current.id,
          sequence: current.sequence,
          transitionId: current.transitionId,
          content: snapshot.current.content,
          interaction: snapshot.current.interaction,
          responseSource: parseResponseSource(current.responseSource),
          sourceGenerationId: current.sourceGenerationId,
          sourceGenerationPart: parseSourcePart(current.sourceGenerationPart),
        },
        timing: {
          waitPlan:
            current.waitPlan === null
              ? null
              : waitPlanSchema.parse(current.waitPlan),
          dueAt: snapshot.waiting
            ? snapshot.waiting.dueAt
            : timestampIso(current.dueAt),
          remainingMs: snapshot.waiting
            ? snapshot.waiting.remainingMs
            : (current.remainingMs ?? null),
          controlRevision: current.controlRevision,
          decisionPlan:
            current.decisionPlan === null
              ? null
              : decisionPlanSchema.parse(current.decisionPlan),
          responseDueAt:
            snapshot.decision?.dueAt ?? timestampIso(current.responseDueAt),
        },
        items: snapshot.items,
        recentHistory,
        generation: sourceGeneration,
        resolution:
          activeResolution === undefined
            ? null
            : {
                operationId: activeResolution.operationId,
                basePassageId: activeResolution.basePassageId,
                baseRevision: activeResolution.baseRevision,
                generationId: activeResolution.generationId,
                kind:
                  activeResolution.generationKind ??
                  invariantMissing('resolution generation kind'),
                state:
                  activeResolution.generationState ??
                  invariantMissing('resolution generation state'),
                selectedOptionId,
                selectedIntention,
                proposal: continuationProposal.success
                  ? continuationProposal.data
                  : null,
                dispatchReview:
                  activeResolution.dispatchReviewState === null
                    ? null
                    : {
                        revision:
                          activeResolution.dispatchReviewRevision ??
                          invariantMissing('dispatch review revision'),
                        mode:
                          activeResolution.dispatchReviewMode ??
                          invariantMissing('dispatch review mode'),
                        state: activeResolution.dispatchReviewState,
                        packetSha256:
                          activeResolution.dispatchReviewPacketSha256 ??
                          invariantMissing('dispatch review packet hash'),
                        packet: activeResolution.dispatchReviewPacket,
                        inspection: activeResolution.dispatchReviewInspection,
                        preparedAt:
                          timestampIso(
                            activeResolution.dispatchReviewPreparedAt,
                          ) ??
                          invariantMissing('dispatch review preparation time'),
                        reviewedAt: timestampIso(
                          activeResolution.dispatchReviewReviewedAt,
                        ),
                      },
              },
      });
    },
  };
}
