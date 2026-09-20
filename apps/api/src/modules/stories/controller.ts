import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Inject,
  Param,
  Put,
  Query,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { createStoryApplication } from '@offscreen/application/stories';
import { StoryError } from '@offscreen/application/stories';
import { startStorySchema } from '@offscreen/contracts/stories';
import { IdentityService } from '../auth/identity.js';

export const STORIES = Symbol('STORIES');
@Controller('stories')
export class StoriesController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(STORIES)
    private readonly stories: ReturnType<typeof createStoryApplication>,
  ) {}
  private async run<T>(request: Request, work: (owner: string) => Promise<T>) {
    const user = await this.identity.requireUser(request.headers);
    try {
      return await work(user.id);
    } catch (error) {
      if (error instanceof StoryError) {
        throw new HttpException(
          { code: error.code },
          { invalid: 400, not_found: 404, conflict: 409 }[error.code],
        );
      }
      throw new ServiceUnavailableException('Story unavailable');
    }
  }
  @Get()
  list(@Req() request: Request, @Query('before') before?: string) {
    return this.run(request, (ownerId) =>
      this.stories.list(before ? { ownerId, before } : { ownerId }),
    );
  }
  @Get('presets/catalogue')
  presetCatalogue(@Req() request: Request) {
    return this.run(request, async () =>
      this.stories.campaignSettings.catalogue(),
    );
  }
  @Get('presets')
  presets(@Req() request: Request) {
    return this.run(request, (ownerId) =>
      this.stories.campaignSettings.presets(ownerId),
    );
  }
  @Put('presets/:presetId')
  savePreset(
    @Req() request: Request,
    @Param('presetId') id: string,
    @Body() body: unknown,
  ) {
    return this.run(request, (ownerId) =>
      this.stories.campaignSettings.savePreset({ ownerId, id, body }),
    );
  }
  @Get(':id/settings')
  settingsHistory(@Req() request: Request, @Param('id') storyId: string) {
    return this.run(request, (ownerId) =>
      this.stories.campaignSettings.history({ ownerId, storyId }),
    );
  }
  @Put(':id/settings/:operationId')
  settings(
    @Req() request: Request,
    @Param('id') storyId: string,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return this.run(request, async (ownerId) => {
      await this.stories.campaignSettings.update({
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
    return this.run(request, async (ownerId) => {
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
    return this.run(request, async (ownerId) => {
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
    return this.run(request, async (ownerId) => {
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
    return this.run(request, async (ownerId) => {
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
    return this.run(request, async (ownerId) => {
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
    return this.run(request, (ownerId) =>
      this.stories.retryResolution({ ownerId, storyId, retryId }),
    );
  }
  @Get(':id')
  read(@Req() request: Request, @Param('id') id: string) {
    return this.run(request, (ownerId) =>
      this.stories.read({ ownerId, storyId: id }),
    );
  }
  @Get(':id/history')
  history(
    @Req() request: Request,
    @Param('id') id: string,
    @Query('before') before: unknown,
  ) {
    return this.run(request, (ownerId) => {
      const query =
        before === undefined
          ? { ownerId, storyId: id }
          : { ownerId, storyId: id, before };
      return this.stories.history(query);
    });
  }
  @Put(':id/start')
  @HttpCode(200)
  startFromCandidate(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.run(request, (ownerId) => {
      const parsed = startStorySchema.safeParse(body);
      if (!parsed.success) {
        throw new StoryError('invalid');
      }
      return this.stories.startFromCandidate({
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
    return this.run(request, (ownerId) =>
      this.stories.admitResolution({
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
    return this.run(request, (ownerId) =>
      this.stories.control({ ownerId, storyId: id, operationId, body }),
    );
  }
}
