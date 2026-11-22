import { createHash } from 'node:crypto';
import {
  canonicalStoryLaunchRequestJson,
  type StoryLaunchRequest,
} from '@offscreen/contracts/story-launch';
import { canonicalResolutionRequestJson } from '@offscreen/contracts/stories';

export function digestResolutionRequest(input: {
  expectedRevision: number;
  submission: unknown;
}): string {
  const bytes = Buffer.from(canonicalResolutionRequestJson(input), 'utf8');
  return createHash('sha256').update(bytes).digest('hex');
}

export function hashStoryLaunchRequest(request: StoryLaunchRequest): string {
  const bytes = Buffer.from(canonicalStoryLaunchRequestJson(request), 'utf8');
  return createHash('sha256').update(bytes).digest('hex');
}
