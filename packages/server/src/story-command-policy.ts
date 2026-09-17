import {
  interactionSchema,
  interactionSpecificationSchema,
  interactionSubmissionSchema,
} from '@offscreen/contracts/interactions';
import {
  itemTransferSchema,
  passageContentSchema,
  storyItemsSchema,
} from '@offscreen/contracts/stories';
import type { storyPassage } from '@offscreen/db/story-schema';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { decisionPlanSchema, waitPlanSchema } from './story-plans';

export const initialStorySchema = z.strictObject({
  source: z.string().min(1).max(100),
  items: storyItemsSchema.default([]),
  content: passageContentSchema,
  interaction: interactionSpecificationSchema.nullable(),
});

export const continuationSchema = z.strictObject({
  expectedRevision: z.number().int().positive().max(2147483646),
  effects: z.array(itemTransferSchema).max(20).default([]),
  content: passageContentSchema,
  interaction: interactionSpecificationSchema.nullable(),
  response: interactionSubmissionSchema.nullable().default(null),
  wait: waitPlanSchema.nullable().default(null),
  decision: decisionPlanSchema.nullable().default(null),
});

export type InitialStory = z.infer<typeof initialStorySchema>;
export type StoryContinuation = z.infer<typeof continuationSchema>;

function passageContentMatches(
  passage: typeof storyPassage.$inferSelect,
  input: InitialStory | StoryContinuation,
) {
  return (
    isDeepStrictEqual(passage.content, input.content) &&
    isDeepStrictEqual(
      passage.interaction
        ? interactionSchema.parse(passage.interaction).specification
        : null,
      input.interaction,
    )
  );
}

export function initializationMatches(
  firstPassage: typeof storyPassage.$inferSelect,
  input: InitialStory,
) {
  return (
    passageContentMatches(firstPassage, input) &&
    isDeepStrictEqual(firstPassage.initialItems ?? [], input.items)
  );
}

export function continuationRetryMatches(
  priorPassage: typeof storyPassage.$inferSelect,
  input: StoryContinuation,
) {
  return (
    priorPassage.sequence === input.expectedRevision + 1 &&
    passageContentMatches(priorPassage, input) &&
    isDeepStrictEqual(priorPassage.effects ?? [], input.effects) &&
    isDeepStrictEqual(
      priorPassage.decisionPlan === null
        ? null
        : decisionPlanSchema.parse(priorPassage.decisionPlan),
      input.decision,
    ) &&
    isDeepStrictEqual(
      priorPassage.waitPlan === null
        ? null
        : waitPlanSchema.parse(priorPassage.waitPlan),
      input.wait,
    ) &&
    isDeepStrictEqual(
      priorPassage.response === null
        ? null
        : interactionSubmissionSchema.parse(priorPassage.response),
      input.response,
    )
  );
}

export function hasValidDecisionDefault(input: StoryContinuation) {
  if (!input.decision) {
    return true;
  }
  if (!input.interaction || input.wait) {
    return false;
  }
  return input.interaction.options.some(
    (option) => option.id === input.decision?.defaultOptionId,
  );
}
