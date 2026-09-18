import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { storyDraft } from '@offscreen/db/draft-schema';
import { generation, draftOpening } from '@offscreen/db/generation-schema';
import {
  playableOpeningArtifactSchema,
  playableProposalSchema,
  preparePlayableOpening,
} from '@offscreen/storyteller/tasks';
import { createGenerations, GenerationError, validId } from './service';
import type { Transaction } from '../outbox/index';

export function createOpenings(
  database: Database,
  kind = 'opening.playable.v1',
  dispatch?: (tx: Transaction, id: string) => Promise<void>,
) {
  const operations = createGenerations(database, {
    kind,
    input: playableOpeningArtifactSchema,
    output: playableProposalSchema,
  });
  async function read(owner: string, id: string) {
    const operation = await operations.read(owner, id);
    const [current] = await database.db
      .select({ revision: storyDraft.revision })
      .from(storyDraft)
      .innerJoin(draftOpening, eq(draftOpening.draftId, storyDraft.id))
      .where(
        and(
          eq(storyDraft.ownerId, owner),
          eq(storyDraft.id, operation.input.source.draftId),
          eq(draftOpening.generationId, id),
        ),
      );
    return {
      ...operation,
      isCurrent: current?.revision === operation.input.source.draftRevision,
    };
  }
  return {
    read,
    async latest(owner: string, draftId: string) {
      const [row] = await database.db
        .select({ id: draftOpening.generationId })
        .from(storyDraft)
        .leftJoin(draftOpening, eq(draftOpening.draftId, storyDraft.id))
        .where(
          and(
            eq(storyDraft.id, validId(draftId)),
            eq(storyDraft.ownerId, owner),
          ),
        );
      if (!row) throw new GenerationError('not_found');
      return row.id ? read(owner, row.id) : null;
    },
    async request(
      owner: string,
      draftId: string,
      id: string,
      expectedRevision: number,
    ) {
      validId(draftId);
      validId(id);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)
        throw new GenerationError('invalid');
      await database.db.transaction(async (tx) => {
        const [draft] = await tx
          .select()
          .from(storyDraft)
          .where(and(eq(storyDraft.id, draftId), eq(storyDraft.ownerId, owner)))
          .for('update');
        if (!draft) throw new GenerationError('not_found');
        const [prior] = await tx
          .select()
          .from(generation)
          .where(eq(generation.id, id));
        if (prior) {
          if (prior.ownerId !== owner || prior.kind !== kind)
            throw new GenerationError('not_found');
          const source = playableOpeningArtifactSchema.parse(
            prior.input,
          ).source;
          if (
            source.draftId !== draftId ||
            source.draftRevision !== expectedRevision
          )
            throw new GenerationError('conflict');
          return; // An admitted retry remains valid after subsequent draft edits.
        }
        if (draft.revision !== expectedRevision)
          throw new GenerationError('conflict');
        const [latest] = await tx
          .select({ state: generation.state })
          .from(draftOpening)
          .innerJoin(generation, eq(generation.id, draftOpening.generationId))
          .where(eq(draftOpening.draftId, draftId));
        if (
          latest &&
          ['pending', 'running', 'uncertain'].includes(latest.state)
        )
          throw new GenerationError('busy');
        const artifact = playableOpeningArtifactSchema.parse(
          preparePlayableOpening({
            id: draft.id,
            revision: draft.revision,
            title: draft.title,
            premise: draft.premise,
            storytellingDirection: draft.storytellingDirection,
            createdAt: draft.createdAt.toISOString(),
            updatedAt: draft.updatedAt.toISOString(),
          }),
        );
        await operations.insert(tx, owner, id, artifact);
        await dispatch?.(tx, id);
        await tx
          .insert(draftOpening)
          .values({ draftId, generationId: id })
          .onConflictDoUpdate({
            target: draftOpening.draftId,
            set: { generationId: id },
          });
      });
      return read(owner, id);
    },
    claim: operations.claim,
    settle: operations.settle,
  };
}
