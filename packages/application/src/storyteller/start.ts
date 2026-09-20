import {
  campaignStartSchema,
  campaignSettingsSchema,
} from '@offscreen/contracts/campaign';
import { campaignSettings } from '@offscreen/db/campaign-schema';
import { isDeepStrictEqual } from 'node:util';
import { initializeCampaign } from '../campaign/settings';
import type { CampaignStart } from '@offscreen/contracts/campaign';
import { and, eq } from 'drizzle-orm';
import type { generation } from '@offscreen/db/generation-schema';
import { draftOpening } from '@offscreen/db/generation-schema';
import { storyDraft } from '@offscreen/db/draft-schema';
import { storyPassage } from '@offscreen/db/story-schema';
import {
  storytellerTaskSchema,
  mechanicalOpeningSceneSchema,
  validateStorytellerResult,
} from '@offscreen/storyteller/tasks';
import {
  playablePresentation,
  playableProposalSchema,
} from '@offscreen/storyteller/tasks';
import type { Transaction } from '../outbox/index';
import { initializeStoryInTransaction } from '../stories/initialization';
import { publishStorytellerNotes } from './memory';
import { StoryError } from '../stories/errors';
import type { ImmediateActionPlan } from '@offscreen/game/immediate-actions';

export async function startStorytellerCandidate(
  tx: Transaction,
  input: {
    ownerId: string;
    storyId: string;
    expectedDraftRevision: number;
    campaign?: CampaignStart;
    candidate: typeof generation.$inferSelect;
  },
) {
  const task = storytellerTaskSchema.parse(input.candidate.input);
  if (task.task !== 'opening') {
    throw new StoryError('invalid');
  }
  const [draft] = await tx
    .select()
    .from(storyDraft)
    .where(
      and(
        eq(storyDraft.id, task.source.draftId),
        eq(storyDraft.ownerId, input.ownerId),
      ),
    )
    .for('update');
  const [latest] = await tx
    .select()
    .from(draftOpening)
    .where(eq(draftOpening.draftId, task.source.draftId));
  if (!draft) {
    throw new StoryError('not_found');
  }
  if (
    draft.revision !== input.expectedDraftRevision ||
    task.source.draftRevision !== draft.revision ||
    latest?.generationId !== input.candidate.id ||
    input.candidate.state !== 'succeeded'
  ) {
    throw new StoryError('conflict');
  }
  const options = campaignStartSchema.parse(input.campaign ?? {});
  if (options.mechanics !== Boolean(task.context.mechanicalOpening)) {
    throw new StoryError('invalid');
  }
  const result = validateStorytellerResult(task, input.candidate.output);
  let openingPlans: ImmediateActionPlan[] = [];
  const presentation = task.context.mechanicalOpening
    ? (() => {
        const scene = mechanicalOpeningSceneSchema.parse(result.scene);
        openingPlans = scene.next.plans;
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
    : playablePresentation(playableProposalSchema.parse(result.scene));
  const created = await initializeStoryInTransaction(tx, {
    ownerId: input.ownerId,
    storyId: input.storyId,
    input: {
      source: 'playable.opening.v1',
      sourceGenerationId: input.candidate.id,
      sourceGenerationPart: 'current',
      premise: task.context.premise,
      storyteller: task.profile,
      execution: task.execution,
      usagePolicy:
        task.resources.authority.kind === 'effective-usage-policy'
          ? task.resources.authority.policy
          : null,
      items: [],
      ...presentation,
    },
  });
  if (!created) {
    // A retry must recover the accepted creation settings, not silently accept
    // a different lock or pace under the same story identity.
    const [initialSettings] = await tx
      .select()
      .from(campaignSettings)
      .where(
        and(
          eq(campaignSettings.storyId, input.storyId),
          eq(campaignSettings.revision, 1),
        ),
      );
    if (initialSettings) {
      const accepted = campaignSettingsSchema.parse(initialSettings.settings);
      if (
        accepted.locked !== options.locked ||
        !isDeepStrictEqual(accepted.pace, options.pace) ||
        !isDeepStrictEqual(accepted.time, options.time)
      ) {
        throw new StoryError('conflict');
      }
    }
    return;
  }
  await initializeCampaign(
    tx,
    input.storyId,
    task.profile,
    options,
    task.context.mechanicalOpening
      ? {
          character: task.context.mechanicalOpening.character,
          storyFacts: task.context.mechanicalOpening.storyFacts,
          plans: openingPlans,
          activityAccess: mechanicalOpeningSceneSchema.parse(result.scene).next
            .activityAccess,
        }
      : undefined,
  );
  const [passage] = await tx
    .select({ id: storyPassage.id })
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, input.storyId),
        eq(storyPassage.sequence, 1),
      ),
    );
  if (!passage) {
    throw new Error('Missing initialized passage');
  }
  await publishStorytellerNotes(tx, {
    storyId: input.storyId,
    generationId: input.candidate.id,
    passageId: passage.id,
    revision: 1,
    sourcePart: 'current',
    notes: [],
  });
}
