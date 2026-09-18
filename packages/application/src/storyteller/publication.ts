import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { campaign } from '@offscreen/db/campaign-schema';
import { generation } from '@offscreen/db/generation-schema';
import { storyResolution } from '@offscreen/db/story-schema';
import { storytellerPublication } from '@offscreen/db/storyteller-schema';
import { offerSchema } from '@offscreen/game/offers';
import type { ImmediateActionPlan } from '@offscreen/game/immediate-actions';
import {
  storytellerTaskSchema,
  validateStorytellerResult,
} from '@offscreen/storyteller/tasks';
import { interactionSubmissionSchema } from '@offscreen/contracts/interactions';
import { setPublication, storytellerKind } from './records';
import { translateGeneratedContinuation } from '../generations/generated-continuation';
import { commitStoryContinuation } from '../stories/continuation';
import {
  lockOwnedStory,
  insertContinuationPassage,
  advanceStoryView,
} from '../stories/persistence';
import { publishStorytellerNotes } from './memory';
import { StoryError } from '../stories/errors';
import { continuationSchema } from '../stories/command-policy';
import { loadOfferPlan, saveOfferPlans } from '../campaign/persistence';

export async function publishStorytellerResult(
  database: Database,
  id: string,
  realDurationMs: (gameDurationMs: number) => number,
) {
  await database.db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(generation)
      .where(and(eq(generation.id, id), eq(generation.kind, storytellerKind)));
    if (!record || record.state !== 'succeeded') {
      return;
    }
    const task = storytellerTaskSchema.parse(record.input);
    const result = validateStorytellerResult(task, record.output);
    if (task.task === 'opening') {
      await setPublication(tx, id, 'published');
      return;
    }
    const current = await lockOwnedStory(tx, {
      storyId: task.source.storyId,
      ownerId: record.ownerId,
    });
    const [publication] = await tx
      .select()
      .from(storytellerPublication)
      .where(eq(storytellerPublication.generationId, id));
    if (publication?.state === 'published' || publication?.state === 'stale') {
      return;
    }
    if (current.revision !== task.source.narrativeRevision) {
      await setPublication(tx, id, 'stale');
      return;
    }
    const [resolution] = await tx
      .select()
      .from(storyResolution)
      .where(eq(storyResolution.generationId, id));
    if (!resolution || resolution.basePassageId !== task.source.passageId) {
      throw new StoryError('invalid');
    }
    if (task.task === 'consequence') {
      if (
        result.scene.version !== 3 ||
        result.scene.next.kind !== 'opportunities'
      ) {
        throw new StoryError('invalid');
      }
      const candidates = new Map(
        task.context.resolution?.offer.nodes
          .filter((node) => node.action)
          .map((node) => [node.id, node] as const) ?? [],
      );
      const plannedOffer = offerSchema.parse({
        id: randomUUID(),
        nodes: result.scene.next.options.map((option) => {
          const candidate = candidates.get(option.id);
          if (!candidate?.action) {
            throw new StoryError('invalid');
          }
          return {
            id: option.id,
            parent: null,
            label: option.label,
            description: option.intention,
            action: candidate.action,
          };
        }),
      });
      const sourceOffer = task.context.resolution?.offer;
      if (!sourceOffer) {
        throw new StoryError('invalid');
      }
      const selectedPlans: ImmediateActionPlan[] = [];
      for (const option of result.scene.next.options) {
        const plan = await loadOfferPlan(tx, {
          storyId: current.id,
          offerId: sourceOffer.id,
          narrativeRevision: current.revision,
          actionKey: option.id,
        });
        if (!plan) {
          throw new StoryError('invalid');
        }
        selectedPlans.push(plan);
      }
      const passageId = await insertContinuationPassage(tx, {
        storyId: current.id,
        sequence: current.revision + 1,
        transitionId: resolution.operationId,
        sourceGenerationId: id,
        responseSource: null,
        input: {
          expectedRevision: current.revision,
          content: result.scene.content,
          effects: [],
          response: null,
          interaction: null,
          wait: null,
          decision: null,
          sourceGenerationPart: 'current',
        },
      });
      await publishStorytellerNotes(tx, {
        storyId: current.id,
        generationId: id,
        passageId,
        revision: current.revision + 1,
        sourcePart: 'current',
        notes: current.continuityNotes,
      });
      await saveOfferPlans(
        tx,
        current.id,
        current.revision + 1,
        plannedOffer.id,
        selectedPlans,
      );
      await tx
        .update(campaign)
        .set({ offer: plannedOffer })
        .where(eq(campaign.storyId, current.id));
      await advanceStoryView(tx, {
        storyId: current.id,
        revision: current.revision + 1,
        viewVersion: current.viewVersion + 1,
      });
      await setPublication(tx, id, 'published');
      return;
    }
    const proposed = translateGeneratedContinuation({
      output: result.scene,
      generationId: id,
      response: interactionSubmissionSchema.parse(resolution.submission),
      realDurationMs,
    });
    const continuation = continuationSchema.safeParse({
      ...proposed,
      expectedRevision: task.source.narrativeRevision,
    });
    if (!continuation.success) {
      throw new StoryError('invalid');
    }
    await commitStoryContinuation(tx, {
      ownerId: record.ownerId,
      storyId: task.source.storyId,
      transitionId: resolution.operationId,
      input: continuation.data,
      completingIntervalPassageId: undefined,
      completingDecisionPassageId: undefined,
      sourceGenerationId: id,
    });
    await setPublication(tx, id, 'published');
  });
}
