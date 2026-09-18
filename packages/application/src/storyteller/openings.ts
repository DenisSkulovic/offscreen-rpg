import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { storyDraft } from '@offscreen/db/draft-schema';
import { generation, draftOpening } from '@offscreen/db/generation-schema';
import {
  storytellerCatalogue,
  storytellerSummary,
} from '@offscreen/storyteller/profiles';
import {
  prepareStorytellerTask,
  mechanicalOpeningSceneSchema,
  storytellerTaskSchema,
  storytellerResultSchema,
} from '@offscreen/storyteller/tasks';
import {
  offlineExecution,
  type ExecutionPolicy,
} from '@offscreen/storyteller/tasks';
import {
  playablePresentation,
  playableProposalSchema,
} from '@offscreen/storyteller/tasks';
import {
  mechanicalContentCatalogueSchema,
  openingPreviewSchema,
} from '@offscreen/contracts/openings';
import { GenerationError, validId } from '../generations/index';
import { insertStorytellerTask, storytellerKind } from './records';
import {
  mechanicalContentCatalogue,
  mechanicalOpening,
} from '../campaign/fixtures/mechanical-content';

export function createStorytellerOpenings(
  database: Database,
  execution: ExecutionPolicy = offlineExecution,
) {
  async function read(ownerId: string, id: string) {
    const [row] = await database.db
      .select()
      .from(generation)
      .where(
        and(
          eq(generation.id, id),
          eq(generation.ownerId, ownerId),
          eq(generation.kind, storytellerKind),
        ),
      );
    if (!row) {
      throw new GenerationError('not_found');
    }
    const task = storytellerTaskSchema.parse(row.input);
    if (task.task !== 'opening') {
      throw new GenerationError('invalid');
    }
    const [draft] = await database.db
      .select()
      .from(storyDraft)
      .where(
        and(
          eq(storyDraft.id, task.source.draftId),
          eq(storyDraft.ownerId, ownerId),
        ),
      );
    const [latest] = await database.db
      .select()
      .from(draftOpening)
      .where(eq(draftOpening.draftId, task.source.draftId));
    const result =
      row.state === 'succeeded'
        ? storytellerResultSchema.parse(row.output)
        : null;
    const presentation = result
      ? task.context.mechanicalOpening
        ? (() => {
            const scene = mechanicalOpeningSceneSchema.parse(result.scene);
            return {
              content: scene.content,
              interaction: scene.next.plans.length
                ? {
                    kind: 'choice.v1' as const,
                    prompt: 'What do you attempt?',
                    options: scene.next.plans.map((plan) => ({
                      id: plan.key,
                      label: plan.label,
                      description: plan.intention,
                      risk: plan.risk,
                    })),
                  }
                : null,
            };
          })()
        : playablePresentation(playableProposalSchema.parse(result.scene))
      : null;
    return openingPreviewSchema.parse({
      id: row.id,
      sourceRevision: task.source.draftRevision,
      isCurrent:
        draft?.revision === task.source.draftRevision &&
        latest?.generationId === id,
      mode: task.execution.mode,
      contentId: task.context.mechanicalOpening?.id,
      storyteller: storytellerSummary(task.profile),
      state: row.state,
      candidate: presentation?.interaction ? presentation : null,
    });
  }
  return {
    catalogue() {
      return mechanicalContentCatalogueSchema.parse({
        entries: mechanicalContentCatalogue(),
      });
    },
    async handles(ownerId: string, draftId: string, operationId: string) {
      const [prior] = await database.db
        .select()
        .from(generation)
        .where(eq(generation.id, validId(operationId)));
      if (prior) {
        return prior.ownerId === ownerId && prior.kind === storytellerKind;
      }
      const [draft] = await database.db
        .select()
        .from(storyDraft)
        .where(
          and(
            eq(storyDraft.id, validId(draftId)),
            eq(storyDraft.ownerId, ownerId),
          ),
        );
      return draft?.storyteller != null;
    },
    async latest(ownerId: string, draftId: string) {
      const [row] = await database.db
        .select({ id: generation.id })
        .from(storyDraft)
        .innerJoin(draftOpening, eq(draftOpening.draftId, storyDraft.id))
        .innerJoin(generation, eq(generation.id, draftOpening.generationId))
        .where(
          and(
            eq(storyDraft.id, validId(draftId)),
            eq(storyDraft.ownerId, ownerId),
            eq(generation.kind, storytellerKind),
          ),
        );
      return row ? read(ownerId, row.id) : null;
    },
    async request(
      ownerId: string,
      draftId: string,
      id: string,
      expectedRevision: number,
      contentId?: string,
    ) {
      validId(id);
      validId(draftId);
      await database.db.transaction(async (tx) => {
        const [draft] = await tx
          .select()
          .from(storyDraft)
          .where(
            and(eq(storyDraft.id, draftId), eq(storyDraft.ownerId, ownerId)),
          )
          .for('update');
        if (!draft) {
          throw new GenerationError('not_found');
        }
        const [prior] = await tx
          .select()
          .from(generation)
          .where(eq(generation.id, id));
        if (prior) {
          if (prior.ownerId !== ownerId || prior.kind !== storytellerKind) {
            throw new GenerationError('not_found');
          }
          const original = storytellerTaskSchema.parse(prior.input);
          if (
            original.task !== 'opening' ||
            original.source.draftId !== draftId ||
            original.source.draftRevision !== expectedRevision ||
            original.context.mechanicalOpening?.id !== contentId
          ) {
            throw new GenerationError('conflict');
          }
          return;
        }
        if (draft.revision !== expectedRevision) {
          throw new GenerationError('conflict');
        }
        if (!draft.premise.trim() || !draft.storyteller) {
          throw new GenerationError('invalid');
        }
        const [latest] = await tx
          .select({ state: generation.state })
          .from(draftOpening)
          .innerJoin(generation, eq(generation.id, draftOpening.generationId))
          .where(eq(draftOpening.draftId, draftId));
        if (
          latest &&
          ['pending', 'running', 'uncertain'].includes(latest.state)
        ) {
          throw new GenerationError('busy');
        }
        const seed = contentId ? mechanicalOpening(contentId) : undefined;
        const task = prepareStorytellerTask({
          task: 'opening',
          source: { draftId, draftRevision: draft.revision },
          profile: storytellerCatalogue.resolve(draft.storyteller),
          execution,
          context: {
            ...(seed ? { mechanicalOpening: { ...seed, storyFacts: [] } } : {}),
            premise: {
              title: seed?.opening.title ?? draft.title,
              premise: seed?.opening.paragraphs.join('\n') ?? draft.premise,
              storytellingDirection: draft.storytellingDirection,
            },
            current: null,
            selected: null,
            items: [],
            notes: [],
            evidence: [],
          },
        });
        await insertStorytellerTask(tx, { id, ownerId, task });
        await tx
          .insert(draftOpening)
          .values({ draftId, generationId: id })
          .onConflictDoUpdate({
            target: draftOpening.draftId,
            set: { generationId: id },
          });
      });
      return read(ownerId, id);
    },
  };
}
