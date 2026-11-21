import type { interactionSubmissionSchema } from '@offscreen/contracts/interactions';
import type { Database } from '@offscreen/db';
import type { DocumentStore } from '@offscreen/documents';
import type { StorytellerTask } from '@offscreen/storyteller/tasks';

/** Mirrors `ReturnType<typeof canonicalWorldEvidence>` without storyteller runtime import. */
export type StorytellerResolutionLibrarySectionSelection = Readonly<{
  handles: string[];
  ruleTopics: string[];
  maxReads: number;
  maxBytes: number;
}>;

export type ResolutionPassageSource = Readonly<
  | {
      storage: 'inline';
      passageId: string;
      sequence: number;
      inlineContent: unknown;
      response: string | null;
    }
  | {
      storage: 'cas';
      passageId: string;
      sequence: number;
      contentHash: string;
      response: string | null;
    }
>;

export type StorytellerResolutionContextSqlCapture = Readonly<{
  passages: ResolutionPassageSource[];
  items: Array<{
    key: string;
    label: string;
    holderKey: string | null;
  }>;
  settingsRevision: number | null;
  capturedSettings: unknown | null;
  gameSecond: number | null;
  worldConditions: unknown | null;
  situationAuthorization: unknown | null;
  activeActivityId: string | null;
  acceptedActivityPlan: unknown | null;
  commitments: Array<{
    id: string;
    revision: number;
    state: string;
    plan: unknown;
    progress: unknown;
  }>;
}>;

export type StorytellerResolutionFence = Readonly<{
  ownerId: string;
  storyId: string;
  operationId: string;
  expectedRevision: number;
  submission: ReturnType<typeof interactionSubmissionSchema.parse>;
  viewVersion: number;
  premise: unknown;
  notes: unknown;
  activeSceneScope: unknown;
  documentRootHash: string | null;
  documentRootRevision: number;
  storyteller: unknown;
  execution: unknown;
  usagePolicy: unknown;
  activePassageId: string;
  activeContentDocumentHash: string | null;
  activeInlineContent: unknown | null;
  sourceGenerationId: string;
  sourceGenerationPart: string;
  activeInteraction: unknown;
  transitionId: string | null;
  sourceGeneration: {
    id: string;
    ownerId: string;
    kind: string;
    state: string;
    input: unknown;
    output: unknown;
  };
  selected: { id: string; label: string; intention: string };
  contextSql: StorytellerResolutionContextSqlCapture;
  canonical?: {
    rootHash: string;
    rootRevision: number;
    librarySectionSelection?: StorytellerResolutionLibrarySectionSelection;
    campaignDocumentIds?: string[];
  };
}>;

export type PreparedStorytellerResolution = Readonly<{
  fence: StorytellerResolutionFence;
  task: StorytellerTask;
}>;

export type PrepareStorytellerResolution = (
  database: Database,
  input: {
    ownerId: string;
    storyId: string;
    operationId: string;
    expectedRevision: number;
    submission: unknown;
    documentStore?: DocumentStore;
  },
) => Promise<PreparedStorytellerResolution>;
