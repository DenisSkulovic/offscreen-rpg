import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Param,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { createStoryApplication } from '@offscreen/story-engine/stories';
import { StoryError } from '@offscreen/story-engine/stories';
import { storyVisitAckBodySchema } from '@offscreen/contracts/stories';
import { StoryPlayerIdentity } from '../story-player-identity.js';
import { runStoryRequest, STORIES } from '../story-http-context.js';

@Controller('stories')
export class StoriesDocumentsController {
  constructor(
    @Inject(StoryPlayerIdentity)
    private readonly playerIdentity: StoryPlayerIdentity,
    @Inject(STORIES)
    private readonly stories: ReturnType<typeof createStoryApplication>,
  ) {}

  /** GM01: template-first custom intent interpretation; never mutates game state. */
  @Put(':id/custom-intents/:interpretOperationId')
  @HttpCode(200)
  interpretCustomIntent(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('interpretOperationId') interpretOperationId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) =>
      this.stories.interpretCustomIntent({
        ownerId,
        storyId: id,
        interpretOperationId,
        body,
      }),
    );
  }

  /** GM02: accept one reviewable inspect candidate into the finite-action path. */
  @Put(':id/custom-intent-accepts/:operationId')
  @HttpCode(200)
  acceptCustomIntent(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, async (ownerId) => {
      await this.stories.acceptCustomIntent({
        ownerId,
        storyId: id,
        operationId,
        body,
      });
      return this.stories.read({ ownerId, storyId: id });
    });
  }

  @Put(':id/visit/acks/:ackId')
  @HttpCode(200)
  acknowledgeVisit(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('ackId') ackId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) => {
      const parsed = storyVisitAckBodySchema.parse(body);
      return this.stories.acknowledgeVisit({
        ownerId,
        storyId: id,
        ackId,
        visitToken: parsed.visitToken,
        frontier: parsed.frontier,
      });
    });
  }

  @Put(':id/documents/:operationId')
  admitDocuments(
    @Req() request: Request,
    @Param('id') storyId: string,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) => {
      if (!this.stories.documents) {
        throw new StoryError('unavailable');
      }
      return this.stories.documents.admit({
        ownerId,
        storyId,
        operationId,
        body,
      });
    });
  }
}
