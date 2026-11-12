import type { StorySnapshot } from '@offscreen/contracts/stories';

/** True while Play must keep a foreground pending-status GET loop. */
export function storyNeedsPendingRefresh(
  story: StorySnapshot | undefined,
): boolean {
  if (!story) {
    return false;
  }
  return (
    story.resolution?.state === 'pending' ||
    story.resolution?.state === 'running' ||
    story.waiting != null ||
    story.campaign?.activity?.state === 'running' ||
    story.campaign?.actionExecution?.state === 'running' ||
    story.campaign?.holds.some(
      (hold) =>
        hold.kind === 'storyteller' || hold.kind === 'storyteller-intent',
    ) === true
  );
}

/** Fallback pending poll when the live SSE stream is unavailable. */
export const PENDING_STORY_REFETCH_MS = 2_000;

/** Safety reconciliation poll while SSE is healthy and status is unresolved. */
export const SAFETY_STORY_REFETCH_MS = 30_000;

/** Pending GET cadence: 30s with healthy SSE, else bounded 2s fallback. */
export function pendingStoryRefetchMs(liveStreamHealthy: boolean): number {
  return liveStreamHealthy ? SAFETY_STORY_REFETCH_MS : PENDING_STORY_REFETCH_MS;
}
