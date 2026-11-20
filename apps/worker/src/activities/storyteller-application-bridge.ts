import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const requireFromModule = createRequire(__filename);
const applicationStorytellerDist = dirname(
  requireFromModule.resolve('@offscreen/application/storyteller'),
);

type GenerationAdoptionModule = {
  createStorytellerGenerationAdoption: (
    database: unknown,
  ) => {
    adoptSavedStorytellerGeneration: (input: {
      generationId: string;
      pinnedRoot: string | null;
    }) => Promise<AdoptSavedStorytellerOutcome>;
  };
};

type PublicationModule = {
  publishStorytellerResult: (
    database: unknown,
    generationId: string,
    realDurationMs: () => number,
    documentStore?: unknown,
  ) => Promise<void>;
};

type RecordsModule = {
  storytellerKind: string;
};

export type AdoptSavedStorytellerOutcome = {
  status:
    | 'adopted'
    | 'idempotent'
    | 'held'
    | 'refused';
  generationId?: string;
  reason?: string;
  attemptId?: string;
  resultHash?: string;
  statusRevision?: number;
};

export const { createStorytellerGenerationAdoption } =
  requireFromModule(join(applicationStorytellerDist, 'generation-adoption.js')) as GenerationAdoptionModule;

export const { publishStorytellerResult } = requireFromModule(
  join(applicationStorytellerDist, 'publication.js'),
) as PublicationModule;

export const { storytellerKind } = requireFromModule(
  join(applicationStorytellerDist, 'records.js'),
) as RecordsModule;