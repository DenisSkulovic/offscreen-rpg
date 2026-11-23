import { createStoryApplication } from '@offscreen/story-engine/stories';
import { createStoryResolution } from '@offscreen/story-engine/stories/resolution';
import { lockOwnedStory } from '@offscreen/story-engine/stories/persistence';
import { createStorytellerRuntime } from '@offscreen/story-engine/storyteller';
import { createStorytellerSavedGenerationPublish } from '@offscreen/story-engine/storyteller/saved-generation-publish';
import type { StorytellerGenerationPublishResponse } from '@offscreen/contracts/storyteller-task-custody';
import type { CampaignStart } from '@offscreen/story-interface/campaign';
import { forkStorySchema } from '@offscreen/story-interface/stories';
import { StoryError } from '@offscreen/story-engine/stories';
import type { Database } from '@offscreen/db';
import type { DocumentStore, RulePackageReference } from '@offscreen/documents';
import type { StoryLaunchStatus } from '@offscreen/story-interface/story-launch';
import { createLaunchPutService } from './launch-put.js';

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
  fork(args: {
    ownerId: string;
    sourceStoryId: string;
    forkStoryId: string;
    body: unknown;
  }): Promise<unknown>;
  putLaunch(args: {
    ownerId: string;
    operationId: string;
    body: unknown;
  }): Promise<StoryLaunchStatus>;
  getLaunch(args: {
    ownerId: string;
    operationId: string;
  }): Promise<StoryLaunchStatus>;
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

export type { WriterRoundPrivateSeam } from './writer-round-private-seam.js';
export type { WriterRoundSeam } from './writer-round-control-seam.js';

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
  const launch = createLaunchPutService(database, {
    ...(options.documentStore ? { documentStore: options.documentStore } : {}),
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
    fork(args: {
      ownerId: string;
      sourceStoryId: string;
      forkStoryId: string;
      body: unknown;
    }) {
      const body = forkStorySchema.safeParse(args.body);
      if (!body.success) {
        throw new StoryError('invalid');
      }
      return stories.fork({
        ownerId: args.ownerId,
        sourceStoryId: args.sourceStoryId,
        forkStoryId: args.forkStoryId,
        expectedRevision: body.data.expectedRevision,
        ...(body.data.sourcePassageId !== undefined
          ? { sourcePassageId: body.data.sourcePassageId }
          : {}),
        ...(body.data.sourceCheckpointHash !== undefined
          ? { sourceCheckpointHash: body.data.sourceCheckpointHash }
          : {}),
      });
    },
    putLaunch(args: {
      ownerId: string;
      operationId: string;
      body: unknown;
    }) {
      return launch.putLaunch(args);
    },
    getLaunch(args: { ownerId: string; operationId: string }) {
      return launch.getLaunch(args);
    },
  };
}
