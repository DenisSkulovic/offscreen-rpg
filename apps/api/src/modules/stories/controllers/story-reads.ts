import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  CampaignDocumentRoot,
  ResolvedOwnedLibraryDocument,
  createStoryApplication,
} from '@offscreen/story-engine/stories';
import { StoryError } from '@offscreen/story-engine/stories';
import { StoryPlayerIdentity } from '../story-player-identity.js';
import type { StorySeam } from '../game-authority-client.js';
import { runStoryRequest, STORIES, STORY_SEAM } from '../story-http-context.js';

@Controller('stories')
export class StoriesReadsController {
  constructor(
    @Inject(StoryPlayerIdentity)
    private readonly playerIdentity: StoryPlayerIdentity,
    @Inject(STORIES)
    private readonly stories: ReturnType<typeof createStoryApplication>,
    @Inject(STORY_SEAM)
    private readonly seam: StorySeam,
  ) {}

  @Get(':id/settings')
  settingsHistory(@Req() request: Request, @Param('id') storyId: string) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) =>
      this.stories.campaignSettings.history({ ownerId, storyId }),
    );
  }

  @Get(':id/scenes/:sequence')
  historicalScene(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('sequence') sequence: string,
  ) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) => {
      const parsed = Number(sequence);
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new StoryError('invalid');
      }
      return this.stories.readHistoricalScene({
        ownerId,
        storyId: id,
        sequence: parsed,
      });
    });
  }

  @Get(':id/history')
  history(
    @Req() request: Request,
    @Param('id') id: string,
    @Query('before') before: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) => {
      const query =
        before === undefined
          ? { ownerId, storyId: id }
          : { ownerId, storyId: id, before };
      return this.stories.history(query);
    });
  }

  @Get(':id/events')
  events(
    @Req() request: Request,
    @Param('id') id: string,
    @Query('before') before: unknown,
    @Query('limit') limit: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) => {
      const query: {
        ownerId: string;
        storyId: string;
        before?: unknown;
        limit?: unknown;
      } = { ownerId, storyId: id };
      if (before !== undefined) {
        query.before = before;
      }
      if (limit !== undefined) {
        query.limit = limit;
      }
      return this.stories.events(query);
    });
  }

  @Get(':id/visit')
  visit(@Req() request: Request, @Param('id') id: string) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) =>
      this.stories.visit({ ownerId, storyId: id }),
    );
  }

  @Get(':id/documents/projected-passages')
  projectedPassages(
    @Req() request: Request,
    @Param('id') storyId: string,
    @Query('limit') limit?: string,
  ) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) => {
      if (!this.stories.documents) {
        throw new StoryError('unavailable');
      }
      const parsedLimit = limit === undefined ? undefined : Number(limit);
      return this.stories.documents.projectPassageSources({
        ownerId,
        storyId,
        ...(parsedLimit === undefined ? {} : { limit: parsedLimit }),
      });
    });
  }

  @Get(':id/documents/:documentId')
  document(
    @Req() request: Request,
    @Param('id') storyId: string,
    @Param('documentId') documentId: string,
    @Query('revision') revision?: string,
  ): Promise<ResolvedOwnedLibraryDocument> {
    return runStoryRequest(this.playerIdentity, request, (ownerId) => {
      if (!this.stories.documents) {
        throw new StoryError('unavailable');
      }
      const parsedRevision =
        revision === undefined ? undefined : Number(revision);
      if (
        parsedRevision !== undefined &&
        (!Number.isInteger(parsedRevision) || parsedRevision < 1)
      ) {
        throw new StoryError('invalid');
      }
      return this.stories.documents.readDocument({
        ownerId,
        storyId,
        documentId,
        ...(parsedRevision === undefined ? {} : { revision: parsedRevision }),
      });
    });
  }

  @Get(':id/documents')
  documents(
    @Req() request: Request,
    @Param('id') storyId: string,
  ): Promise<CampaignDocumentRoot> {
    return runStoryRequest(this.playerIdentity, request, (ownerId) => {
      if (!this.stories.documents) {
        throw new StoryError('unavailable');
      }
      return this.stories.documents.readRoot({ ownerId, storyId });
    });
  }

  @Get(':id/resolutions/:operationId/receipt')
  resolutionReceipt(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('operationId') operationId: string,
  ) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) =>
      this.stories.readResolutionReceipt({
        ownerId,
        storyId: id,
        operationId,
      }),
    );
  }

  @Get(':id')
  read(@Req() request: Request, @Param('id') id: string) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) =>
      this.seam.read({ ownerId, storyId: id }),
    );
  }
}
