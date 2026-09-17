import {
  playableContinuationArtifactSchema,
  playableOpeningArtifactSchema,
  playableProposalSchema,
} from '@offscreen/ai/playable';
import {
  chamberInspectorHistoryLimit,
  chamberInspectorSchema,
} from '@offscreen/contracts/chamber';
import { passageContentSchema } from '@offscreen/contracts/stories';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import {
  story,
  storyPassage,
  storyResolution,
} from '@offscreen/db/story-schema';
import { and, desc, eq, lte } from 'drizzle-orm';
import { z } from 'zod';
import { parseStoryIdentifier, StoryError } from './story-errors';
import { decisionPlanSchema, waitPlanSchema } from './story-plans';
import { createStories } from './stories';

type OwnedStory = Readonly<{
  ownerId: string;
  storyId: string;
}>;

const responseSourceSchema = z.enum(['player', 'default']);

function timestampIso(value: Date | null) {
  return value === null ? null : value.toISOString();
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
}) {
  const artifact = playableOpeningArtifactSchema.safeParse(row.input);
  const proposal = playableProposalSchema.safeParse(row.output);
  const optionIntentions =
    proposal.success && proposal.data.next.kind === 'choice'
      ? proposal.data.next.options.map((option) => ({
          id: option.id,
          intention: option.intention,
        }))
      : null;
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

export function createChamberInspector(database: Database) {
  const stories = createStories(database);

  return {
    async inspect({ ownerId, storyId }: OwnedStory) {
      const id = parseStoryIdentifier(storyId);
      const snapshot = await stories.read({ ownerId, storyId: id });
      const [current] = await database.db
        .select({
          createdAt: story.createdAt,
          source: story.source,
          sequence: storyPassage.sequence,
          transitionId: storyPassage.transitionId,
          responseSource: storyPassage.responseSource,
          sourceGenerationId: storyPassage.sourceGenerationId,
          waitPlan: storyPassage.waitPlan,
          decisionPlan: storyPassage.decisionPlan,
          dueAt: storyPassage.dueAt,
          remainingMs: storyPassage.remainingMs,
          intervalVersion: storyPassage.intervalVersion,
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
        })
        .from(storyResolution)
        .innerJoin(generation, eq(generation.id, storyResolution.generationId))
        .where(
          and(
            eq(storyResolution.storyId, id),
            eq(storyResolution.basePassageId, snapshot.current.id),
            eq(storyResolution.baseRevision, snapshot.revision),
          ),
        );
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
      const continuationProposal = playableProposalSchema.safeParse(
        activeResolution?.generationOutput,
      );
      return chamberInspectorSchema.parse({
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
          intervalVersion: current.intervalVersion,
          controlRevision: current.controlRevision,
          decisionPlan:
            current.decisionPlan === null
              ? null
              : decisionPlanSchema.parse(current.decisionPlan),
          responseDueAt:
            snapshot.decision?.dueAt ?? timestampIso(current.responseDueAt),
        },
        items: snapshot.items,
        recentHistory: history.map((entry) => ({
          sequence: entry.sequence,
          passageId: entry.passageId,
          transitionId: entry.transitionId,
          title: passageContentSchema.parse(entry.content).title,
          responseSource: parseResponseSource(entry.responseSource),
          hasInteraction: entry.interaction !== null,
          hasWait: entry.waitPlan !== null,
          hasDecision: entry.decisionPlan !== null,
          hasEffect: hasCommittedEffects(entry.effects),
        })),
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
              },
      });
    },
  };
}
