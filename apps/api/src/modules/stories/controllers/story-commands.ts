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
import {
  forkStorySchema,
  startStorySchema,
} from '@offscreen/contracts/stories';
import { StoryPlayerIdentity } from '../story-player-identity.js';
import type { StorySeam } from '../game-authority-client.js';
import { runStoryRequest, STORIES, STORY_SEAM } from '../story-http-context.js';

@Controller('stories')
export class StoriesCommandsController {
  constructor(
    @Inject(StoryPlayerIdentity)
    private readonly playerIdentity: StoryPlayerIdentity,
    @Inject(STORIES)
    private readonly stories: ReturnType<typeof createStoryApplication>,
    @Inject(STORY_SEAM)
    private readonly seam: StorySeam,
  ) {}

  @Put(':id/settings/:operationId')
  settings(
    @Req() request: Request,
    @Param('id') storyId: string,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, async (ownerId) => {
      await this.stories.campaignSettings.update({
        ownerId,
        storyId,
        operationId,
        body,
      });
      return this.stories.read({ ownerId, storyId });
    });
  }

  @Put(':id/delegation-policy/:operationId')
  delegationPolicy(
    @Req() request: Request,
    @Param('id') storyId: string,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, async (ownerId) => {
      await this.stories.delegationPolicy.update({
        ownerId,
        storyId,
        operationId,
        body,
      });
      return this.stories.read({ ownerId, storyId });
    });
  }

  @Put(':id/delegated-offers/:operationId')
  delegatedOfferControl(
    @Req() request: Request,
    @Param('id') storyId: string,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, async (ownerId) => {
      await this.stories.delegatedOfferControl.control({
        ownerId,
        storyId,
        operationId,
        body,
      });
      return this.stories.read({ ownerId, storyId });
    });
  }

  @Put(':id/actions/:operationId')
  campaignAction(
    @Req() request: Request,
    @Param('id') storyId: string,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, async (ownerId) => {
      await this.stories.campaignAction({
        ownerId,
        storyId,
        operationId,
        body,
      });
      return this.stories.read({ ownerId, storyId });
    });
  }

  @Put(':id/activity-controls/:operationId')
  campaignControl(
    @Req() request: Request,
    @Param('id') storyId: string,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, async (ownerId) => {
      await this.stories.campaignControl({
        ownerId,
        storyId,
        operationId,
        body,
      });
      return this.stories.read({ ownerId, storyId });
    });
  }

  @Put(':id/action-execution-controls/:operationId')
  actionExecutionControl(
    @Req() request: Request,
    @Param('id') storyId: string,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, async (ownerId) => {
      await this.stories.actionExecutionControl({
        ownerId,
        storyId,
        operationId,
        body,
      });
      return this.stories.read({ ownerId, storyId });
    });
  }

  @Put(':id/accepted-plan-controls/:operationId')
  acceptedPlanControl(
    @Req() request: Request,
    @Param('id') storyId: string,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, async (ownerId) => {
      await this.stories.acceptedPlanControl({
        ownerId,
        storyId,
        operationId,
        body,
      });
      return this.stories.read({ ownerId, storyId });
    });
  }

  @Put(':id/world-obligation-controls/:operationId')
  worldObligationControl(
    @Req() request: Request,
    @Param('id') storyId: string,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, async (ownerId) => {
      await this.stories.worldObligationControl({
        ownerId,
        storyId,
        operationId,
        body,
      });
      return this.stories.read({ ownerId, storyId });
    });
  }

  @Put(':id/retries/:retryId')
  retry(
    @Req() request: Request,
    @Param('id') storyId: string,
    @Param('retryId') retryId: string,
  ) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) =>
      this.stories.retryResolution({ ownerId, storyId, retryId }),
    );
  }

  @Put(':id/forks/:forkId')
  @HttpCode(200)
  fork(
    @Req() request: Request,
    @Param('id') sourceStoryId: string,
    @Param('forkId') forkStoryId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) => {
      const parsed = forkStorySchema.safeParse(body);
      if (!parsed.success) {
        throw new StoryError('invalid');
      }
      return this.seam.fork({
        ownerId,
        sourceStoryId,
        forkStoryId,
        expectedRevision: parsed.data.expectedRevision,
        ...(parsed.data.sourcePassageId
          ? { sourcePassageId: parsed.data.sourcePassageId }
          : {}),
        ...(parsed.data.sourceCheckpointHash
          ? { sourceCheckpointHash: parsed.data.sourceCheckpointHash }
          : {}),
      });
    });
  }

  @Put(':id/start')
  @HttpCode(200)
  startFromCandidate(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) => {
      const parsed = startStorySchema.safeParse(body);
      if (!parsed.success) {
        throw new StoryError('invalid');
      }
      return this.seam.startFromCandidate({
        ownerId,
        storyId: id,
        candidateId: parsed.data.candidateId,
        expectedDraftRevision: parsed.data.expectedDraftRevision,
        ...(parsed.data.campaign ? { campaign: parsed.data.campaign } : {}),
      });
    });
  }

  @Put(':id/resolutions/:operationId')
  @HttpCode(202)
  admitResolution(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) =>
      this.seam.admitResolution({
        ownerId,
        storyId: id,
        operationId,
        body,
      }),
    );
  }

  @Put(':id/controls/:operationId')
  @HttpCode(200)
  control(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) =>
      this.stories.control({ ownerId, storyId: id, operationId, body }),
    );
  }
}
