import {
  storyRetrievalTuningSchema,
  type StoryRetrievalTuning,
} from '@offscreen/contracts/story-retrieval';

export type StoryRetrievalPosture = 'minimal' | 'balanced' | 'rich';

export type ResolvedStoryRetrievalRecipe = Readonly<{
  id: string;
  version: 1;
  posture: StoryRetrievalPosture;
  query: Readonly<{
    maxResults: number;
    maxExaminedUnits: number;
    maxExaminedBytes: number;
    maxUnitBytes: number;
    tuning: StoryRetrievalTuning;
  }>;
  assembly: Readonly<{
    maxReads: number;
    maxBytes: number;
  }>;
}>;

const profiles: Record<
  StoryRetrievalPosture,
  Omit<ResolvedStoryRetrievalRecipe, 'posture'>
> = {
  minimal: {
    id: 'minimal-lexical.v1',
    version: 1,
    query: {
      maxResults: 3,
      maxExaminedUnits: 64,
      maxExaminedBytes: 128 * 1024,
      maxUnitBytes: 8 * 1024,
      tuning: storyRetrievalTuningSchema.parse({
        id: 'minimal-lexical',
        version: 1,
        maxQueryTerms: 8,
        includeSourcePassages: false,
        fieldWeights: { title: 5, path: 3, context: 2, body: 1 },
        maxBodyTermFrequency: 2,
      }),
    },
    assembly: { maxReads: 1, maxBytes: 4 * 1024 },
  },
  balanced: {
    id: 'balanced-lexical.v1',
    version: 1,
    query: {
      maxResults: 6,
      maxExaminedUnits: 256,
      maxExaminedBytes: 512 * 1024,
      maxUnitBytes: 16 * 1024,
      tuning: storyRetrievalTuningSchema.parse({
        id: 'balanced-lexical',
        version: 1,
        maxQueryTerms: 16,
        includeSourcePassages: true,
        fieldWeights: { title: 5, path: 3, context: 2, body: 1 },
        maxBodyTermFrequency: 3,
      }),
    },
    assembly: { maxReads: 3, maxBytes: 12 * 1024 },
  },
  rich: {
    id: 'rich-lexical.v1',
    version: 1,
    query: {
      maxResults: 12,
      maxExaminedUnits: 1024,
      maxExaminedBytes: 2 * 1024 * 1024,
      maxUnitBytes: 64 * 1024,
      tuning: storyRetrievalTuningSchema.parse({
        id: 'rich-lexical',
        version: 1,
        maxQueryTerms: 24,
        includeSourcePassages: true,
        fieldWeights: { title: 6, path: 3, context: 2, body: 1 },
        maxBodyTermFrequency: 5,
      }),
    },
    assembly: { maxReads: 6, maxBytes: 48 * 1024 },
  },
};

export function resolveStoryRetrievalRecipe(input: {
  posture: StoryRetrievalPosture;
  operationLimits?: {
    maxReads: number;
    maxRetainedBytes: number;
  };
}): ResolvedStoryRetrievalRecipe {
  const profile = profiles[input.posture];
  const limits = input.operationLimits;
  if (
    limits &&
    (!Number.isInteger(limits.maxReads) ||
      limits.maxReads < 0 ||
      !Number.isInteger(limits.maxRetainedBytes) ||
      limits.maxRetainedBytes < 0)
  ) {
    throw new Error('Retrieval operation limits must be nonnegative integers');
  }
  return {
    ...profile,
    posture: input.posture,
    query: {
      ...profile.query,
      tuning: {
        ...profile.query.tuning,
        fieldWeights: { ...profile.query.tuning.fieldWeights },
      },
    },
    assembly: {
      maxReads: Math.min(
        profile.assembly.maxReads,
        limits?.maxReads ?? profile.assembly.maxReads,
      ),
      maxBytes: Math.min(
        profile.assembly.maxBytes,
        limits?.maxRetainedBytes ?? profile.assembly.maxBytes,
      ),
    },
  };
}
