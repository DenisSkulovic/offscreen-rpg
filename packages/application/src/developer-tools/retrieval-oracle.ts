import { z } from 'zod';

const pathSchema = z
  .string()
  .min(1)
  .max(320)
  .regex(/^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))(?!.*\\).+$/);

const retrievalOracleCaseSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  worldContrast: z.enum(['conventional', 'abstract']),
  informationNeed: z.string().trim().min(1).max(300),
  mode: z.enum(['exact', 'local-return', 'temporal', 'associative', 'absence']),
  query: z.string().trim().min(2).max(160),
  structuredCues: z.strictObject({
    identityPaths: z.array(pathSchema).max(8),
    placePaths: z.array(pathSchema).max(8),
    threadPaths: z.array(pathSchema).max(8),
  }),
  expectedPaths: z.array(pathSchema).max(12),
  acceptablePaths: z.array(pathSchema).max(12),
  forbiddenPaths: z.array(pathSchema).max(20),
  scope: z.strictObject({
    currentVersionsOnly: z.literal(true),
    branch: z.literal('current'),
    visibilities: z
      .array(z.enum(['player-known', 'storyteller-private']))
      .min(1)
      .max(2),
    time: z.enum(['current', 'historical', 'any']),
  }),
  abstainWhenExpectedMissing: z.boolean(),
  budget: z.strictObject({
    maxCandidates: z.number().int().min(1).max(8),
    maxReads: z.number().int().min(0).max(6),
    maxBytes: z.number().int().min(1024).max(48 * 1024),
    maxRounds: z.number().int().min(0).max(3),
  }),
});

export type RetrievalOracleCase = z.infer<typeof retrievalOracleCaseSchema>;

export const retrievalOracleCases = z
  .array(retrievalOracleCaseSchema)
  .min(1)
  .parse([
    {
      id: 'greywake.patient-tide-current',
      worldContrast: 'conventional',
      informationNeed:
        'Recover the current route for a later return without reviving the superseded exposed-road description.',
      mode: 'temporal',
      query: 'patient tide road',
      structuredCues: {
        identityPaths: ['identities/player.md'],
        placePaths: ['locations/quay.md'],
        threadPaths: ['threads/patient-tide-return.md'],
      },
      expectedPaths: ['threads/patient-tide-return.md'],
      acceptablePaths: ['possibilities/smugglers.md'],
      forbiddenPaths: ['developer/false-tide-road.md'],
      scope: {
        currentVersionsOnly: true,
        branch: 'current',
        visibilities: ['player-known', 'storyteller-private'],
        time: 'current',
      },
      abstainWhenExpectedMissing: true,
      budget: {
        maxCandidates: 4,
        maxReads: 1,
        maxBytes: 12 * 1024,
        maxRounds: 0,
      },
    },
    {
      id: 'gradient-life.no-human-economy',
      worldContrast: 'abstract',
      informationNeed:
        'Confirm that an abstract organism history does not supply invented tavern, wage or humanoid evidence.',
      mode: 'absence',
      query: 'tavern wage humanoid',
      structuredCues: {
        identityPaths: [],
        placePaths: [],
        threadPaths: [],
      },
      expectedPaths: [],
      acceptablePaths: [],
      forbiddenPaths: [
        'identities/keeper.md',
        'locations/warehouse.md',
        'threads/work.md',
      ],
      scope: {
        currentVersionsOnly: true,
        branch: 'current',
        visibilities: ['player-known', 'storyteller-private'],
        time: 'any',
      },
      abstainWhenExpectedMissing: true,
      budget: {
        maxCandidates: 4,
        maxReads: 0,
        maxBytes: 8 * 1024,
        maxRounds: 0,
      },
    },
  ]);

export function retrievalOracleCase(id: string): RetrievalOracleCase {
  const selected = retrievalOracleCases.find((candidate) => candidate.id === id);
  if (!selected) throw new Error(`Unknown retrieval oracle case: ${id}`);
  return selected;
}
