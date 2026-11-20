import { createStoryApplication } from '@offscreen/application/stories';
import { createStoryResolution } from '@offscreen/application/stories/resolution';
import { lockOwnedStory } from '@offscreen/application/stories/persistence';
import { createStorytellerRuntime } from '@offscreen/application/storyteller';
import { createStorytellerSavedGenerationPublish } from '@offscreen/application/storyteller/saved-generation-publish';
import type { StorytellerGenerationPublishResponse } from '@offscreen/contracts/storyteller-task-custody';
import type { CampaignStart } from '@offscreen/contracts/campaign';
import type { Database } from '@offscreen/db';
import type { DocumentStore, RulePackageReference } from '@offscreen/documents';

/**
 * The functions the story façade already uses for this seam.
 * The HTTP handler calls `createStoryApplication` once. It does not call
 * `createStoryResolution` or `lockOwnedStory` a second time, and it does not
 * insert a receipt of its own.
 */
export const gameAuthorityWriters = {
  createStoryResolution,
  lockOwnedStory,
};

export type GameAuthorityApplicationOptions = {
  documentStore?: DocumentStore;
  defaultRules?: RulePackageReference;
};

export type GameAuthoritySeam = {
  read(args: { ownerId: string; storyId: string }): Promise<unknown>;
  startFromCandidate(args: {
    ownerId: string;
    storyId: string;
    candidateId: string;
    expectedDraftRevision: number;
    campaign?: CampaignStart;
  }): Promise<unknown>;
  admitResolution(args: {
    ownerId: string;
    storyId: string;
    operationId: string;
    body: unknown;
  }): Promise<unknown>;
};

/** Least-privilege Storyteller generation custody; owner and root come from the database. */
export type StorytellerTaskCustodySeam = {
  fetchCommittedGeneration(generationId: string): Promise<unknown>;
  claimGeneration(input: {
    generationId: string;
    pinnedRoot: string | null;
  }): Promise<unknown>;
  saveValidatedResult(input: {
    generationId: string;
    pinnedRoot: string | null;
    resultHash: string;
    result: unknown;
  }): Promise<unknown>;
  readValidatedResult(generationId: string): Promise<unknown>;
};

/** Control identity publish bridge: adopts saved attempt output then publishes on GA. */
export type StorytellerPublicationSeam = {
  publishSavedGeneration(
    generationId: string,
  ): Promise<StorytellerGenerationPublishResponse>;
};

export function createStorytellerPublicationSeam(
  database: Database,
  options: GameAuthorityApplicationOptions = {},
): StorytellerPublicationSeam {
  const publish = createStorytellerSavedGenerationPublish(
    database,
    options.documentStore ? { documentStore: options.documentStore } : {},
  );
  return {
    publishSavedGeneration(generationId) {
      return publish.publishSavedGeneration(generationId);
    },
  };
}

export function createStorytellerTaskCustodySeam(
  database: Database,
  options: GameAuthorityApplicationOptions = {},
): StorytellerTaskCustodySeam {
  const runtime = createStorytellerRuntime(
    database,
    options.documentStore ? { documentStore: options.documentStore } : {},
  );
  return {
    fetchCommittedGeneration: (generationId) =>
      runtime.fetchCommittedGeneration(generationId),
    claimGeneration: (input) => runtime.claimGeneration(input),
    saveValidatedResult: (input) => runtime.saveValidatedResult(input),
    readValidatedResult: (generationId) =>
      runtime.readValidatedResult(generationId),
  };
}

export function createGameAuthoritySeam(
  database: Database,
  options: GameAuthorityApplicationOptions = {},
): GameAuthoritySeam {
  const stories = createStoryApplication(database, {
    ...(options.documentStore ? { documentStore: options.documentStore } : {}),
    ...(options.defaultRules ? { defaultRules: options.defaultRules } : {}),
  });
  return {
    read(args: { ownerId: string; storyId: string }) {
      return stories.read(args);
    },
    startFromCandidate(args: {
      ownerId: string;
      storyId: string;
      candidateId: string;
      expectedDraftRevision: number;
      campaign?: CampaignStart;
    }) {
      return stories.startFromCandidate(args);
    },
    admitResolution(args: {
      ownerId: string;
      storyId: string;
      operationId: string;
      body: unknown;
    }) {
      return stories.admitResolution(args);
    },
  };
}
