import { createStoryApplication } from '@offscreen/application/stories';
import { createStoryResolution } from '@offscreen/application/stories/resolution';
import { lockOwnedStory } from '@offscreen/application/stories/persistence';
import type { Database } from '@offscreen/db';
import type { DocumentStore } from '@offscreen/documents';

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
};

export type GameAuthoritySeam = {
  read(args: { ownerId: string; storyId: string }): Promise<unknown>;
  admitResolution(args: {
    ownerId: string;
    storyId: string;
    operationId: string;
    body: unknown;
  }): Promise<unknown>;
};

export function createGameAuthoritySeam(
  database: Database,
  options: GameAuthorityApplicationOptions = {},
): GameAuthoritySeam {
  const stories = createStoryApplication(
    database,
    options.documentStore ? { documentStore: options.documentStore } : {},
  );
  return {
    read(args: { ownerId: string; storyId: string }) {
      return stories.read(args);
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
