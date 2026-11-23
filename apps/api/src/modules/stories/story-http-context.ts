import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { StoryError } from '@offscreen/story-engine/stories';
import type { Request } from 'express';
import type { StoryPlayerIdentity } from './story-player-identity.js';

export const STORIES = Symbol('STORIES');
export const STORY_SEAM = Symbol('STORY_SEAM');
export const STORY_UPDATE_HUB = Symbol('STORY_UPDATE_HUB');

const STORY_CODE_STATUS = {
  invalid: 400,
  not_found: 404,
  conflict: 409,
  unavailable: 503,
} as const;

export function mapStoryErrorToHttp(error: StoryError): HttpException {
  return new HttpException(
    {
      code: error.code,
      ...(error.reason ? { reason: error.reason } : {}),
    },
    STORY_CODE_STATUS[error.code],
  );
}

export async function runStoryRequest<T>(
  playerIdentity: StoryPlayerIdentity,
  request: Request,
  work: (owner: string) => Promise<T>,
): Promise<T> {
  const user = await playerIdentity.requireStoryPlayer(request.headers);
  try {
    return await work(user.id);
  } catch (error) {
    if (error instanceof StoryError) {
      throw mapStoryErrorToHttp(error);
    }
    throw new ServiceUnavailableException('Story unavailable');
  }
}

export async function runStoryLaunchRequest<T>(
  playerIdentity: StoryPlayerIdentity,
  request: Request,
  work: (owner: string) => Promise<T>,
): Promise<T> {
  const user = await playerIdentity.requireStoryPlayer(request.headers);
  try {
    return await work(user.id);
  } catch (error) {
    if (
      error instanceof StoryError &&
      error.code === 'invalid' &&
      error.reason === 'not-admitted'
    ) {
      throw new HttpException({ code: 'not-admitted' }, 403);
    }
    if (error instanceof StoryError) {
      throw mapStoryErrorToHttp(error);
    }
    throw new ServiceUnavailableException('Story unavailable');
  }
}
