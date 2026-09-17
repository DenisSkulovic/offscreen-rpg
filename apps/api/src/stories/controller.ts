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
import type { createChamber } from '@offscreen/server/chamber';
import { StoryError } from '@offscreen/server/stories';
import { startChamberSchema } from '@offscreen/contracts/stories';
import { IdentityService } from '../auth/identity.js';

export const STORIES = Symbol('STORIES');
@Controller('stories')
export class StoriesController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(STORIES) private readonly stories: ReturnType<typeof createChamber>,
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
  @Put(':id/chamber')
  @HttpCode(200)
  start(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.run(request, (ownerId) => {
      const parsed = startChamberSchema.safeParse(body);
      if (!parsed.success) {
        throw new StoryError('invalid');
      }
      return this.stories.start({
        ownerId,
        storyId: id,
        scenario: parsed.data.scenario,
      });
    });
  }
  @Put(':id/responses/:operationId')
  @HttpCode(200)
  respond(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('operationId') operationId: string,
    @Body() body: unknown,
  ) {
    return this.run(request, (ownerId) =>
      this.stories.respond({ ownerId, storyId: id, operationId, body }),
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
