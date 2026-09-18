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

@Controller('chamber-tools')
export class ChamberToolsController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(STORIES) private readonly stories: ReturnType<typeof createChamber>,
  ) {}

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
