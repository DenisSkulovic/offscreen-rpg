import {
  creativeExplorationLimitsSchema,
  creativeExplorationRecipeSchema,
  disabledCreativeExplorationRecipe,
  type CreativeExplorationLimits,
  type CreativeExplorationPosture,
  type CreativeExplorationRecipe,
} from '@offscreen/contracts/creative-exploration';

const zeroLimits: CreativeExplorationLimits = {
  maxLenses: 0,
  maxQueries: 0,
  maxCandidatesPerQuery: 0,
  maxReads: 0,
  maxLeads: 0,
  maxCandidateDirections: 0,
  maxRetainedBytes: 0,
  maxModelRounds: 0,
  maxGeneratedTokens: 0,
  maxLatencyMs: 0,
  maxCostMicrousd: 0,
};

const profiles: Record<CreativeExplorationPosture, CreativeExplorationLimits> =
  {
    off: zeroLimits,
    minimal: {
      maxLenses: 1,
      maxQueries: 1,
      maxCandidatesPerQuery: 3,
      maxReads: 1,
      maxLeads: 2,
      maxCandidateDirections: 2,
      maxRetainedBytes: 4 * 1024,
      maxModelRounds: 1,
      maxGeneratedTokens: 512,
      maxLatencyMs: 10_000,
      maxCostMicrousd: 0,
    },
    balanced: {
      maxLenses: 3,
      maxQueries: 3,
      maxCandidatesPerQuery: 6,
      maxReads: 3,
      maxLeads: 6,
      maxCandidateDirections: 3,
      maxRetainedBytes: 12 * 1024,
      maxModelRounds: 2,
      maxGeneratedTokens: 1536,
      maxLatencyMs: 30_000,
      maxCostMicrousd: 1000,
    },
    rich: {
      maxLenses: 6,
      maxQueries: 6,
      maxCandidatesPerQuery: 12,
      maxReads: 6,
      maxLeads: 12,
      maxCandidateDirections: 6,
      maxRetainedBytes: 48 * 1024,
      maxModelRounds: 3,
      maxGeneratedTokens: 4096,
      maxLatencyMs: 90_000,
      maxCostMicrousd: 10_000,
    },
  };

type PartialLimits = Partial<CreativeExplorationLimits>;

function boundedLimits(
  requested: CreativeExplorationLimits,
  operationLimits?: PartialLimits,
) {
  if (!operationLimits) return requested;
  const parsed = creativeExplorationLimitsSchema
    .partial()
    .parse(operationLimits);
  return creativeExplorationLimitsSchema.parse(
    Object.fromEntries(
      Object.entries(requested).map(([key, value]) => [
        key,
        Math.min(
          value,
          parsed[key as keyof CreativeExplorationLimits] ?? value,
        ),
      ]),
    ),
  );
}

/** Resolves captured optional work; operation limits can only narrow it. */
export function resolveCreativeExplorationRecipe(input: {
  posture: CreativeExplorationPosture;
  requested?: PartialLimits;
  operationLimits?: PartialLimits;
}): CreativeExplorationRecipe {
  if (input.posture === 'off') {
    return creativeExplorationRecipeSchema.parse(
      disabledCreativeExplorationRecipe,
    );
  }
  const requested = creativeExplorationLimitsSchema.parse({
    ...profiles[input.posture],
    ...input.requested,
  });
  const limits = boundedLimits(requested, input.operationLimits);
  const enabled =
    limits.maxLenses > 0 &&
    limits.maxQueries > 0 &&
    limits.maxCandidatesPerQuery > 0 &&
    limits.maxReads > 0 &&
    limits.maxLeads > 0 &&
    limits.maxCandidateDirections > 0 &&
    limits.maxRetainedBytes >= 1024 &&
    limits.maxModelRounds > 0 &&
    limits.maxGeneratedTokens > 0 &&
    limits.maxLatencyMs > 0;
  return creativeExplorationRecipeSchema.parse({
    format: 'offscreen.creative-exploration-recipe.v1',
    id: enabled
      ? `creative-${input.posture}.v1`
      : `creative-${input.posture}-disabled.v1`,
    posture: input.posture,
    enabled,
    limits: enabled ? limits : zeroLimits,
  });
}
