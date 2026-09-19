import {
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { createChamber } from '@offscreen/application/developer-tools';
import { StoryError } from '@offscreen/application/stories';
import { IdentityService } from '../auth/identity.js';
import { STORIES } from './controller.js';
import { OPENINGS } from '../drafts/openings-controller.js';
import type { createScriptedOpenings } from '@offscreen/application/generations';

@Controller('chamber-tools')
export class ChamberToolsController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(STORIES) private readonly stories: ReturnType<typeof createChamber>,
    @Inject(OPENINGS)
    private readonly openings: ReturnType<typeof createScriptedOpenings>,
  ) {}

  @Get('generations/:id/dispatch-review')
  async inspectDispatchReview(
    @Req() request: Request,
    @Param('id') id: string,
  ) {
    const user = await this.identity.requireUser(request.headers);
    const review = await this.openings.dispatchReview(user.id, id);
    if (!review) throw new HttpException({ code: 'not_found' }, 404);
    return { review };
  }

  @Get('stories/:id')
  async inspect(@Req() request: Request, @Param('id') id: string) {
    const user = await this.identity.requireUser(request.headers);
    try {
      return await this.stories.inspect({ ownerId: user.id, storyId: id });
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
}
