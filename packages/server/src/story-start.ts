import type { CampaignStart } from '@offscreen/contracts/campaign';
import { storytellerKind } from './storyteller-records';
import { startStorytellerCandidate } from './storyteller-start';
import {
  playableOpeningArtifactSchema,
  playablePresentation,
  playableProposalSchema,
  premiseContentSchema,
  validatePlayableResult,
} from '@offscreen/ai/playable';
import type { Database } from '@offscreen/db';
import { storyDraft } from '@offscreen/db/draft-schema';
import { draftOpening, generation } from '@offscreen/db/generation-schema';
import { and, eq } from 'drizzle-orm';
import { initializeStoryInTransaction } from './story-initialization';
import { parseStoryIdentifier, StoryError } from './story-errors';

export const playableOpeningStorySource = 'playable.opening.v1';

const playableOpeningKinds = new Set([
  'opening.playable.v1',
  'opening.playable.scripted.v1',
]);

type StartFromCandidate = Readonly<{
  ownerId: string;
  storyId: string;
  candidateId: string;
  expectedDraftRevision: number;
    campaign?: CampaignStart;
}>;

export function createStoryStart(database: Database) {
  return async function startFromCandidate({
    ownerId,
    storyId,
    candidateId,
    expectedDraftRevision,
    campaign,
  }: StartFromCandidate) {
    const id = parseStoryIdentifier(storyId);
    const generationId = parseStoryIdentifier(candidateId);
    if (
      !Number.isSafeInteger(expectedDraftRevision) ||
      expectedDraftRevision < 1 ||
      expectedDraftRevision > 2147483646
    ) {
      throw new StoryError('invalid');
    }

    await database.db.transaction(async (tx) => {
      const [candidate] = await tx
        .select()
        .from(generation)
        .where(eq(generation.id, generationId));
      if (!candidate || candidate.ownerId !== ownerId) {
        throw new StoryError('not_found');
      }
      if (candidate.kind === storytellerKind) {
        await startStorytellerCandidate(tx, {
          ownerId,
          storyId: id,
          expectedDraftRevision,
          candidate,
          ...(campaign ? { campaign } : {}),
        });
        return;
      }
      const artifact = playableOpeningArtifactSchema.safeParse(candidate.input);
      if (!artifact.success) {
        throw new StoryError('invalid');
      }
      const [draft] = await tx
        .select()
        .from(storyDraft)
        .where(
          and(
            eq(storyDraft.id, artifact.data.source.draftId),
            eq(storyDraft.ownerId, ownerId),
          ),
        )
        .for('update');
      if (!draft) {
        throw new StoryError('not_found');
      }
      if (draft.revision !== expectedDraftRevision) {
        throw new StoryError('conflict');
      }
      if (!playableOpeningKinds.has(candidate.kind)) {
        throw new StoryError('conflict');
      }
      if (candidate.state !== 'succeeded') {
        throw new StoryError('conflict');
      }
      if (artifact.data.source.draftRevision !== expectedDraftRevision) {
        throw new StoryError('conflict');
      }
      const [currentOpening] = await tx
        .select({ generationId: draftOpening.generationId })
        .from(draftOpening)
        .where(eq(draftOpening.draftId, draft.id));
      if (currentOpening?.generationId !== generationId) {
        throw new StoryError('conflict');
      }
      const proposal = playableProposalSchema.safeParse(candidate.output);
      if (!proposal.success) {
        throw new StoryError('invalid');
      }
      try {
        validatePlayableResult('opening', proposal.data);
      } catch {
        throw new StoryError('invalid');
      }
      const presentation = playablePresentation(proposal.data);
      if (!presentation.interaction) {
        throw new StoryError('invalid');
      }
      await initializeStoryInTransaction(tx, {
        ownerId,
        storyId: id,
        input: {
          source: playableOpeningStorySource,
          sourceGenerationId: generationId,
          premise: premiseContentSchema.parse({
            title: draft.title,
            premise: draft.premise,
            storytellingDirection: draft.storytellingDirection,
          }),
          items: [],
          content: presentation.content,
          interaction: presentation.interaction,
        },
      });
    });
  };
}
