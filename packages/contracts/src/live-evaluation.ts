import { z } from 'zod';

const unsignedIntegerString = z.string().regex(/^\d+$/);
const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const evaluationRouteSchema = z.strictObject({
  provider: z.literal('openrouter'),
  endpointProvider: z.string().min(1).max(100),
  route: z.string().regex(/^[a-z0-9][a-z0-9._:-]{0,99}$/),
  model: z.string().min(1).max(160),
  priceVersion: z.string().min(1).max(100),
  outputProtocol: z.enum([
    'native-json-schema',
    'json-object-local-validation',
  ]),
  inputMicrousdPerMillion: unsignedIntegerString,
  outputMicrousdPerMillion: unsignedIntegerString,
  supportsStructuredOutput: z.literal(true),
  reasoning: z.literal('disabled'),
  verifiedAt: z.iso.datetime(),
  validUntil: z.iso.datetime(),
  maxContextTokens: z.number().int().positive(),
});

export const liveEvaluationRecipeSchema = z.strictObject({
  primaryCalls: z.number().int().min(1).max(3),
  retrievalReads: z.number().int().nonnegative(),
  repairCalls: z.number().int().nonnegative(),
  judgeCalls: z.number().int().nonnegative(),
  comparisonCalls: z.number().int().nonnegative(),
  backgroundCalls: z.number().int().nonnegative(),
  maxInFlightCalls: z.number().int().min(1),
  maxInputTokens: z.number().int().positive(),
  maxGeneratedTokens: z.number().int().positive(),
  maxReasoningTokens: z.number().int().nonnegative(),
  maxMicrousd: unsignedIntegerString,
});
export type LiveEvaluationRecipe = z.infer<typeof liveEvaluationRecipeSchema>;

export const evaluationPacketConfigSchema = z
  .strictObject({
    version: z.literal('evaluation-packet.v1'),
    id: z.uuid(),
    accountId: z.uuid(),
    runId: z.uuid(),
    case: z.strictObject({
      id: z.string().min(1),
      version: z.string().min(1),
    }),
    route: evaluationRouteSchema,
    recipe: liveEvaluationRecipeSchema,
  })
  .superRefine((config, context) => {
    const recipe = config.recipe;
    if (
      recipe.primaryCalls > 3 ||
      recipe.retrievalReads !== 0 ||
      recipe.repairCalls !== 0 ||
      recipe.judgeCalls !== 0 ||
      recipe.comparisonCalls !== 0 ||
      recipe.backgroundCalls !== 0 ||
      recipe.maxInFlightCalls !== 1 ||
      recipe.maxReasoningTokens !== 0
    ) {
      context.addIssue({
        code: 'custom',
        path: ['recipe'],
        message:
          'Live POC runs permit one to three primary calls and no optional calls',
      });
    }
    if (config.recipe.maxInputTokens > config.route.maxContextTokens) {
      context.addIssue({
        code: 'custom',
        path: ['recipe', 'maxInputTokens'],
        message: 'Input limit exceeds the captured route context capacity',
      });
    }
    if (
      config.recipe.primaryCalls > 1 &&
      (config.recipe.maxMicrousd !== '0' ||
        config.route.inputMicrousdPerMillion !== '0' ||
        config.route.outputMicrousdPerMillion !== '0')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['recipe', 'primaryCalls'],
        message:
          'Short playable loops are restricted to verified zero-price routes',
      });
    }
    if (
      Date.parse(config.route.validUntil) <= Date.parse(config.route.verifiedAt)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['route', 'validUntil'],
        message: 'Route metadata validity must end after verification',
      });
    }
  });
export type EvaluationPacketConfig = z.infer<
  typeof evaluationPacketConfigSchema
>;

export const memoryEvaluationRecipeSchema = z.strictObject({
  modelRounds: z.literal(2),
  retrievalReads: z.literal(1),
  maxInFlightCalls: z.literal(1),
  repairCalls: z.literal(0),
  judgeCalls: z.literal(0),
  comparisonCalls: z.literal(0),
  backgroundCalls: z.literal(0),
  maxInputTokensPerRound: z.number().int().positive(),
  maxInputTokensPerOperation: z.number().int().positive(),
  maxSerializedBytesPerRequest: z.number().int().positive(),
  maxRetainedReadBytes: z.number().int().min(1024),
  maxGeneratedTokensPerOperation: z.number().int().positive(),
  maxReasoningTokensPerRequest: z.literal(0),
  maxMicrousd: z.literal('0'),
});

export const memoryEvaluationPacketConfigSchema = z
  .strictObject({
    version: z.literal('memory-evaluation-packet.v1'),
    id: z.uuid(),
    accountId: z.uuid(),
    runId: z.uuid(),
    case: z.strictObject({
      id: z.string().min(1),
      version: z.string().min(1),
    }),
    route: evaluationRouteSchema,
    recipe: memoryEvaluationRecipeSchema,
  })
  .superRefine((config, context) => {
    if (
      config.route.inputMicrousdPerMillion !== '0' ||
      config.route.outputMicrousdPerMillion !== '0'
    ) {
      context.addIssue({
        code: 'custom',
        path: ['route'],
        message:
          'Memory evaluation is restricted to verified-zero-price routes',
      });
    }
    if (
      config.recipe.maxInputTokensPerOperation !==
      config.recipe.maxInputTokensPerRound * config.recipe.modelRounds
    ) {
      context.addIssue({
        code: 'custom',
        path: ['recipe', 'maxInputTokensPerOperation'],
        message: 'Memory operation input must equal both admitted rounds',
      });
    }
    if (
      config.recipe.maxSerializedBytesPerRequest >
      config.recipe.maxInputTokensPerRound * 4
    ) {
      context.addIssue({
        code: 'custom',
        path: ['recipe', 'maxSerializedBytesPerRequest'],
        message:
          'Serialized request limit exceeds the route input byte upper bound',
      });
    }
    if (config.recipe.maxInputTokensPerRound > config.route.maxContextTokens) {
      context.addIssue({
        code: 'custom',
        path: ['recipe', 'maxInputTokensPerRound'],
        message: 'Per-round input exceeds the captured route context capacity',
      });
    }
    if (
      Date.parse(config.route.validUntil) <= Date.parse(config.route.verifiedAt)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['route', 'validUntil'],
        message: 'Route metadata validity must end after verification',
      });
    }
  });
export type MemoryEvaluationPacketConfig = z.infer<
  typeof memoryEvaluationPacketConfigSchema
>;

export const memoryEvaluationManifestSchema = z.strictObject({
  version: z.literal('memory-live-evaluation.v1'),
  id: z.uuid(),
  gate: z.literal('bounded-memory-operation'),
  case: z.strictObject({ id: z.string().min(1), version: z.string().min(1) }),
  firstPacket: z.strictObject({
    generationId: z.uuid(),
    attemptId: z.uuid(),
    sha256,
    serializedBytes: z.number().int().positive(),
    reservedInputTokens: z.number().int().positive(),
    inputBoundMethod: z.literal('utf8-byte-capped-by-route'),
  }),
  route: evaluationRouteSchema.omit({ maxContextTokens: true }),
  recipe: memoryEvaluationRecipeSchema,
  reservationMicrousd: z.literal('0'),
  createdAt: z.iso.datetime(),
});
export type MemoryEvaluationManifest = z.infer<
  typeof memoryEvaluationManifestSchema
>;

export const evaluationPacketInspectionSchema = z.object({
  serializedBytes: z.number().int().positive(),
});

export const liveEvaluationManifestSchema = z
  .strictObject({
    version: z.literal('live-evaluation.v1'),
    id: z.uuid(),
    gate: z.enum(['single-structured-response', 'short-playable-loop']),
    case: z.strictObject({
      id: z.string().min(1),
      version: z.string().min(1),
    }),
    packet: z.strictObject({
      generationId: z.uuid(),
      sha256,
      serializedBytes: z.number().int().positive(),
      inputTokenUpperBound: z.number().int().positive(),
      inputBoundMethod: z.literal('utf8-byte-upper-bound'),
    }),
    route: z.strictObject({
      provider: z.literal('openrouter'),
      endpointProvider: z.string().min(1).max(100),
      route: z.string().min(1),
      model: z.string().min(1),
      priceVersion: z.string().min(1),
      outputProtocol: z.enum([
        'native-json-schema',
        'json-object-local-validation',
      ]),
      inputMicrousdPerMillion: unsignedIntegerString,
      outputMicrousdPerMillion: unsignedIntegerString,
      supportsStructuredOutput: z.boolean(),
      reasoning: z.literal('disabled'),
      verifiedAt: z.iso.datetime(),
      validUntil: z.iso.datetime(),
    }),
    recipe: liveEvaluationRecipeSchema,
    reservationMicrousd: unsignedIntegerString,
    createdAt: z.iso.datetime(),
  })
  .superRefine((manifest, context) => {
    if (
      manifest.packet.inputTokenUpperBound < manifest.packet.serializedBytes
    ) {
      context.addIssue({
        code: 'custom',
        path: ['packet', 'inputTokenUpperBound'],
        message: 'UTF-8 byte upper bound cannot be smaller than packet bytes',
      });
    }
    if (
      Date.parse(manifest.route.validUntil) <=
      Date.parse(manifest.route.verifiedAt)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['route', 'validUntil'],
        message: 'Price validity must end after verification',
      });
    }
  });

export type LiveEvaluationManifest = z.infer<
  typeof liveEvaluationManifestSchema
>;
