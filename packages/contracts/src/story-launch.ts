import { z } from 'zod';

const sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/);

const launchVerbatimPromptSchema = z
  .string()
  .min(1)
  .max(24000)
  .refine((value) => value.trim().length > 0);

const storyLaunchPromptSourceSchema = z.strictObject({
  kind: z.literal('prompt'),
  prompt: launchVerbatimPromptSchema,
});

const storyLaunchPresetSourceSchema = z.strictObject({
  kind: z.literal('preset'),
  presetId: z.string().min(1).max(200),
  presetRootHash: sha256HexSchema,
  customPrompt: launchVerbatimPromptSchema.optional(),
});

const storyLaunchSourceSchema = z.discriminatedUnion('kind', [
  storyLaunchPromptSourceSchema,
  storyLaunchPresetSourceSchema,
]);

const storyLaunchHintsSchema = z.strictObject({
  storytellerProfile: z.string().min(1).max(160).optional(),
  worldInvention: z.enum(['original', 'source-bound']).optional(),
});

/**
 * Launch command envelope. `operationId` is the client-supplied idempotency identity.
 * Parser success is not authentication, persistence, or spend authorization.
 */
export const storyLaunchRequestSchema = z.strictObject({
  operationId: z.uuid(),
  source: storyLaunchSourceSchema,
  hints: storyLaunchHintsSchema.optional(),
});

export type StoryLaunchRequest = z.infer<typeof storyLaunchRequestSchema>;

function storyLaunchStatusVariant<T extends z.ZodRawShape>(extra: T) {
  return z.strictObject({
    operationId: z.uuid(),
    requestHash: sha256HexSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    ...extra,
  });
}

const storyLaunchPendingSchema = storyLaunchStatusVariant({
  state: z.literal('pending'),
  storyId: z.uuid().optional(),
});

const storyLaunchPreparingSchema = storyLaunchStatusVariant({
  state: z.literal('preparing'),
  storyId: z.uuid().optional(),
});

const storyLaunchComposingSchema = storyLaunchStatusVariant({
  state: z.literal('composing'),
  storyId: z.uuid().optional(),
});

const storyLaunchReadySchema = storyLaunchStatusVariant({
  state: z.literal('ready'),
  storyId: z.uuid(),
  sceneSequence: z.number().int().positive(),
});

const storyLaunchHeldSchema = storyLaunchStatusVariant({
  state: z.literal('held'),
  storyId: z.uuid().optional(),
  reason: z.enum(['policy', 'authorization', 'capacity']),
});

const storyLaunchFailedSchema = storyLaunchStatusVariant({
  state: z.literal('failed'),
  storyId: z.uuid().optional(),
  reason: z.enum(['rejected', 'not-admitted', 'unavailable']),
});

const storyLaunchUncertainSchema = storyLaunchStatusVariant({
  state: z.literal('uncertain'),
  storyId: z.uuid().optional(),
  explanation: z.string().min(1).max(500),
});

/**
 * Launch operation status. `requestHash` is the immutable accepted request identity.
 * Parser success is not authentication, persistence, or spend authorization.
 * The `uncertain` state never authorizes an automatic retry.
 */
export const storyLaunchStatusSchema = z.discriminatedUnion('state', [
  storyLaunchPendingSchema,
  storyLaunchPreparingSchema,
  storyLaunchComposingSchema,
  storyLaunchReadySchema,
  storyLaunchHeldSchema,
  storyLaunchFailedSchema,
  storyLaunchUncertainSchema,
]);

export type StoryLaunchStatus = z.infer<typeof storyLaunchStatusSchema>;
