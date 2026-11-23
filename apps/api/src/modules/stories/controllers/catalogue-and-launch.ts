import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { createStoryApplication } from '@offscreen/story-engine/stories';
import { StoryError } from '@offscreen/story-engine/stories';
import { z } from 'zod';
import { storyLaunchRequestSchema } from '@offscreen/contracts/story-launch';
import { StoryPlayerIdentity } from '../story-player-identity.js';
import type { StorySeam } from '../game-authority-client.js';
import {
  runStoryLaunchRequest,
  runStoryRequest,
  STORIES,
  STORY_SEAM,
} from '../story-http-context.js';

@Controller('stories')
export class StoriesCatalogueAndLaunchController {
  constructor(
    @Inject(StoryPlayerIdentity)
    private readonly playerIdentity: StoryPlayerIdentity,
    @Inject(STORIES)
    private readonly stories: ReturnType<typeof createStoryApplication>,
    @Inject(STORY_SEAM)
    private readonly seam: StorySeam,
  ) {}

  @Get()
  list(@Req() request: Request, @Query('before') before?: string) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) =>
      this.stories.list(before ? { ownerId, before } : { ownerId }),
    );
  }

  @Put('launch/:operationId')
  @HttpCode(200)
  putLaunch(
    @Req() request: Request,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return runStoryLaunchRequest(
      this.playerIdentity,
      request,
      async (ownerId) => {
        const urlId = z.uuid().safeParse(operationId);
        const parsed = storyLaunchRequestSchema.safeParse(body);
        if (
          !urlId.success ||
          !parsed.success ||
          urlId.data !== parsed.data.operationId
        ) {
          throw new StoryError('conflict');
        }
        return this.seam.putLaunch({
          ownerId,
          operationId: urlId.data,
          body: parsed.data,
        });
      },
    );
  }

  @Get('launch/:operationId')
  getLaunch(
    @Req() request: Request,
    @Param('operationId') operationId: string,
  ) {
    return runStoryLaunchRequest(this.playerIdentity, request, (ownerId) => {
      const urlId = z.uuid().safeParse(operationId);
      if (!urlId.success) {
        throw new StoryError('not_found');
      }
      return this.seam.getLaunch({ ownerId, operationId: urlId.data });
    });
  }

  @Get('presets/catalogue')
  presetCatalogue(@Req() request: Request) {
    return runStoryRequest(this.playerIdentity, request, async () =>
      this.stories.campaignSettings.catalogue(),
    );
  }

  @Get('presets')
  presets(@Req() request: Request) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) =>
      this.stories.campaignSettings.presets(ownerId),
    );
  }

  @Put('presets/:presetId')
  savePreset(
    @Req() request: Request,
    @Param('presetId') id: string,
    @Body() body: unknown,
  ) {
    return runStoryRequest(this.playerIdentity, request, (ownerId) =>
      this.stories.campaignSettings.savePreset({ ownerId, id, body }),
    );
  }
}
