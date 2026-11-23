import {
  Controller,
  Header,
  HttpException,
  Inject,
  Optional,
  Param,
  Req,
  ServiceUnavailableException,
  Sse,
  type MessageEvent,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { StoryError } from '@offscreen/story-engine/stories';
import { StoryPlayerIdentity } from '../story-player-identity.js';
import type { StorySeam } from '../game-authority-client.js';
import type { StoryUpdateHub } from '../story-update-hub.js';
import {
  mapStoryErrorToHttp,
  STORY_SEAM,
  STORY_UPDATE_HUB,
} from '../story-http-context.js';

@Controller('stories')
export class StoriesEventsController {
  constructor(
    @Inject(StoryPlayerIdentity)
    private readonly playerIdentity: StoryPlayerIdentity,
    @Optional()
    @Inject(STORY_UPDATE_HUB)
    private readonly updates: StoryUpdateHub | null,
    @Inject(STORY_SEAM)
    private readonly seam: StorySeam,
  ) {}

  /**
   * Authenticated committed-view invalidation hints (W16).
   * Never emits narrative; clients must GET the authorized snapshot.
   */
  @Sse(':id/updates')
  @Header('Cache-Control', 'no-store, no-transform')
  @Header('X-Accel-Buffering', 'no')
  async storyUpdates(
    @Req() request: Request,
    @Param('id') id: string,
  ): Promise<Observable<MessageEvent>> {
    if (!this.updates) {
      throw new ServiceUnavailableException('Story updates unavailable');
    }
    const user = await this.playerIdentity.requireStoryPlayer(request.headers);
    try {
      await this.seam.read({ ownerId: user.id, storyId: id });
    } catch (error) {
      if (error instanceof StoryError) {
        throw mapStoryErrorToHttp(error);
      }
      throw new ServiceUnavailableException('Story unavailable');
    }
    try {
      return this.updates.subscribe({
        ownerId: user.id,
        storyId: id,
        stillAuthorized: async () => {
          try {
            await this.playerIdentity.requireStoryPlayer(request.headers);
            await this.seam.read({ ownerId: user.id, storyId: id });
            return true;
          } catch {
            return false;
          }
        },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'story_stream_limit' ||
          error.message === 'owner_stream_limit')
      ) {
        throw new HttpException({ code: 'rate_limited' }, 429);
      }
      throw new ServiceUnavailableException('Story updates unavailable');
    }
  }
}
