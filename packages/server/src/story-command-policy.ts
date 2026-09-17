import { premiseContentSchema } from '@offscreen/ai/playable';
import {
  interactionSchema,
  interactionSpecificationSchema,
  interactionSubmissionSchema,
} from '@offscreen/contracts/interactions';
import {
  controlIntervalSchema,
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
  sourceGenerationId: z.uuid().nullable().optional(),
  premise: premiseContentSchema.nullable().optional(),
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
  sourceGenerationId: z.uuid().nullable().optional(),
});

export type InitialStory = z.infer<typeof initialStorySchema>;
export type StoryContinuation = z.infer<typeof continuationSchema>;
export type IntervalControl = z.infer<typeof controlIntervalSchema>;

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
  storedPremise: unknown = null,
) {
  return (
    passageContentMatches(firstPassage, input) &&
    isDeepStrictEqual(firstPassage.initialItems ?? [], input.items) &&
    (firstPassage.sourceGenerationId ?? null) ===
      (input.sourceGenerationId ?? null) &&
    isDeepStrictEqual(storedPremise ?? null, input.premise ?? null)
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
    ) &&
    (priorPassage.sourceGenerationId ?? null) ===
      (input.sourceGenerationId ?? null)
  );
}

export function hasValidDecisionDefault(input: StoryContinuation) {
  const decision = input.decision;
  if (!decision) {
    return true;
  }
  if (!input.interaction || input.wait) {
    return false;
  }
  return input.interaction.options.some(
    (option) => option.id === decision.defaultOptionId,
  );
}

export function continuationIncludesWaitWithOffer(input: StoryContinuation) {
  return Boolean(input.wait && input.interaction !== null);
}

export function continuationResponseProvenance(args: {
  response: StoryContinuation['response'];
  completingDecisionPassageId: string | undefined;
}): 'player' | 'default' | null {
  if (args.response === null) {
    return null;
  }
  if (args.completingDecisionPassageId) {
    return 'default';
  }
  return 'player';
}

export function activeWaitBlocksContinuation(args: {
  waitPlan: unknown;
  currentPassageId: string;
  completingIntervalPassageId: string | undefined;
}) {
  return (
    args.waitPlan !== null &&
    args.completingIntervalPassageId !== args.currentPassageId
  );
}

export function continuationMissesResponseDeadline(args: {
  currentPassageId: string;
  expired: boolean;
  completingDecisionPassageId: string | undefined;
}) {
  const applyingSavedDefault =
    args.completingDecisionPassageId === args.currentPassageId;
  if (applyingSavedDefault) {
    return !args.expired;
  }
  return args.expired;
}

export function intervalControlReceiptMatches(
  storedRequest: unknown,
  input: IntervalControl,
) {
  return isDeepStrictEqual(controlIntervalSchema.parse(storedRequest), input);
}

export function isControllableInterval<
  Interval extends {
    intervalVersion: number;
    waitPlan: unknown;
    controlRevision: number;
  },
>(
  interval: Interval | undefined,
  expectedControlRevision: number,
): interval is Interval {
  return (
    interval !== undefined &&
    interval.intervalVersion === 1 &&
    interval.waitPlan !== null &&
    interval.controlRevision === expectedControlRevision
  );
}

export function heldRemainderMs(
  remainingMs: number | null,
): remainingMs is number {
  return remainingMs !== null;
}

export function pauseIsRejectedAfterCutoff(args: {
  remainingMs: number | null;
  dueAtMs: number;
  nowMs: number;
}) {
  return args.remainingMs !== null || args.dueAtMs <= args.nowMs;
}
