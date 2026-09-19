import { z } from 'zod';

const policyIdSchema = z.string().regex(/^[a-z0-9][a-z0-9._:-]{0,99}$/);
const positiveCount = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const nonnegativeCount = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
const microusdSchema = z.string().regex(/^[1-9]\d{0,14}$/);
const windowLimitSchema = z.string().regex(/^[1-9]\d{0,17}$/);

const usageLimitShape = {
  maxInputTokensPerRequest: positiveCount.max(200_000),
  maxSerializedBytesPerRequest: positiveCount.max(1_000_000),
  maxGeneratedTokensPerRequest: positiveCount.max(32_000),
  maxReasoningTokensPerRequest: nonnegativeCount.max(32_000),
  maxInputTokensPerOperation: positiveCount.max(1_000_000),
  maxGeneratedTokensPerOperation: positiveCount.max(100_000),
  maxModelRoundsPerOperation: positiveCount.max(10),
  maxReadsPerOperation: nonnegativeCount.max(100),
  maxRetainedReadBytes: nonnegativeCount.max(1_000_000),
  maxMicrousdPerOperation: microusdSchema,
  maxInFlightDispatches: positiveCount.max(100),
  maxBackgroundJobsPerWindow: nonnegativeCount.max(10_000),
};

export const usageLimitsSchema = z
  .strictObject(usageLimitShape)
  .superRefine((limits, context) => {
    if (limits.maxInputTokensPerOperation < limits.maxInputTokensPerRequest) {
      context.addIssue({
        code: 'custom',
        path: ['maxInputTokensPerOperation'],
        message: 'Operation input limit must cover one request',
      });
    }
    if (
      limits.maxGeneratedTokensPerOperation <
      limits.maxGeneratedTokensPerRequest
    ) {
      context.addIssue({
        code: 'custom',
        path: ['maxGeneratedTokensPerOperation'],
        message: 'Operation output limit must cover one request',
      });
    }
    if (
      limits.maxReasoningTokensPerRequest >
      limits.maxGeneratedTokensPerRequest
    ) {
      context.addIssue({
        code: 'custom',
        path: ['maxReasoningTokensPerRequest'],
        message: 'Reasoning must fit the generated-token limit',
      });
    }
  });
export type UsageLimits = z.infer<typeof usageLimitsSchema>;
export const usageLimitKeys = Object.keys(usageLimitShape) as Array<
  keyof UsageLimits
>;

const usageLimitOverrideShape = {
  maxInputTokensPerRequest: usageLimitShape.maxInputTokensPerRequest.optional(),
  maxSerializedBytesPerRequest:
    usageLimitShape.maxSerializedBytesPerRequest.optional(),
  maxGeneratedTokensPerRequest:
    usageLimitShape.maxGeneratedTokensPerRequest.optional(),
  maxReasoningTokensPerRequest:
    usageLimitShape.maxReasoningTokensPerRequest.optional(),
  maxInputTokensPerOperation:
    usageLimitShape.maxInputTokensPerOperation.optional(),
  maxGeneratedTokensPerOperation:
    usageLimitShape.maxGeneratedTokensPerOperation.optional(),
  maxModelRoundsPerOperation:
    usageLimitShape.maxModelRoundsPerOperation.optional(),
  maxReadsPerOperation: usageLimitShape.maxReadsPerOperation.optional(),
  maxRetainedReadBytes: usageLimitShape.maxRetainedReadBytes.optional(),
  maxMicrousdPerOperation:
    usageLimitShape.maxMicrousdPerOperation.optional(),
  maxInFlightDispatches: usageLimitShape.maxInFlightDispatches.optional(),
  maxBackgroundJobsPerWindow:
    usageLimitShape.maxBackgroundJobsPerWindow.optional(),
};
export const usageLimitOverrideSchema = z.strictObject(
  usageLimitOverrideShape,
);
export type UsageLimitOverride = z.infer<typeof usageLimitOverrideSchema>;

const fixedWindowSchema = z.strictObject({
  kind: z.literal('fixed'),
  durationSeconds: positiveCount.max(366 * 24 * 60 * 60),
  anchorUtc: z.iso.datetime({ offset: true }),
});
const rollingWindowSchema = z.strictObject({
  kind: z.literal('rolling'),
  durationSeconds: positiveCount.max(366 * 24 * 60 * 60),
});
export const usageWindowDefinitionSchema = z.strictObject({
  id: policyIdSchema,
  version: positiveCount.max(1_000_000),
  scope: z.enum(['platform', 'account', 'story']),
  metric: z.enum([
    'requests',
    'input_tokens',
    'generated_tokens',
    'microusd',
    'background_jobs',
  ]),
  limit: windowLimitSchema,
  window: z.discriminatedUnion('kind', [fixedWindowSchema, rollingWindowSchema]),
});
export type UsageWindowDefinition = z.infer<
  typeof usageWindowDefinitionSchema
>;

export const fundingModeSchema = z.enum(['sponsored', 'prepaid', 'on-demand']);
export const recoveryPolicySchema = z.enum(['explicit-resume', 'auto-resume']);

function unique<T>(values: readonly T[]) {
  return new Set(values).size === values.length;
}

export const usageEntitlementProfileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id: policyIdSchema,
    revision: positiveCount.max(1_000_000),
    enabled: z.boolean(),
    allowedRoutes: z.array(policyIdSchema).max(20),
    defaultRoute: policyIdSchema.nullable(),
    fundingModes: z.array(fundingModeSchema).max(3),
    recovery: recoveryPolicySchema,
    limits: usageLimitsSchema,
    windows: z.array(usageWindowDefinitionSchema).max(20),
  })
  .superRefine((profile, context) => {
    if (!unique(profile.allowedRoutes)) {
      context.addIssue({
        code: 'custom',
        path: ['allowedRoutes'],
        message: 'Routes must be unique',
      });
    }
    if (!unique(profile.fundingModes)) {
      context.addIssue({
        code: 'custom',
        path: ['fundingModes'],
        message: 'Funding modes must be unique',
      });
    }
    if (
      profile.defaultRoute !== null &&
      !profile.allowedRoutes.includes(profile.defaultRoute)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['defaultRoute'],
        message: 'Default route must be allowed',
      });
    }
    const windowKeys = profile.windows.map(
      (window) => `${window.scope}:${window.id}`,
    );
    if (!unique(windowKeys)) {
      context.addIssue({
        code: 'custom',
        path: ['windows'],
        message: 'Window identities must be unique within their scope',
      });
    }
  });
export type UsageEntitlementProfile = z.infer<
  typeof usageEntitlementProfileSchema
>;

export const usagePolicyRestrictionSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id: policyIdSchema,
    revision: positiveCount.max(1_000_000),
    enabled: z.boolean().optional(),
    allowedRoutes: z.array(policyIdSchema).max(20).optional(),
    fundingModes: z.array(fundingModeSchema).max(3).optional(),
    recovery: recoveryPolicySchema.optional(),
    limits: usageLimitOverrideSchema,
    windows: z.array(usageWindowDefinitionSchema).max(20).default([]),
  })
  .superRefine((restriction, context) => {
    if (restriction.allowedRoutes && !unique(restriction.allowedRoutes)) {
      context.addIssue({
        code: 'custom',
        path: ['allowedRoutes'],
        message: 'Routes must be unique',
      });
    }
    if (restriction.fundingModes && !unique(restriction.fundingModes)) {
      context.addIssue({
        code: 'custom',
        path: ['fundingModes'],
        message: 'Funding modes must be unique',
      });
    }
    const windowKeys = restriction.windows.map(
      (window) => `${window.scope}:${window.id}`,
    );
    if (!unique(windowKeys)) {
      context.addIssue({
        code: 'custom',
        path: ['windows'],
        message: 'Window identities must be unique within their scope',
      });
    }
    const limits = restriction.limits;
    if (
      limits.maxInputTokensPerRequest !== undefined &&
      limits.maxInputTokensPerOperation !== undefined &&
      limits.maxInputTokensPerOperation < limits.maxInputTokensPerRequest
    ) {
      context.addIssue({
        code: 'custom',
        path: ['limits', 'maxInputTokensPerOperation'],
        message: 'Operation input limit must cover one request',
      });
    }
    if (
      limits.maxGeneratedTokensPerRequest !== undefined &&
      limits.maxGeneratedTokensPerOperation !== undefined &&
      limits.maxGeneratedTokensPerOperation <
        limits.maxGeneratedTokensPerRequest
    ) {
      context.addIssue({
        code: 'custom',
        path: ['limits', 'maxGeneratedTokensPerOperation'],
        message: 'Operation output limit must cover one request',
      });
    }
  });
export type UsagePolicyRestriction = z.infer<
  typeof usagePolicyRestrictionSchema
>;
