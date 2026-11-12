import type { StorySnapshot } from '@offscreen/contracts/stories';

/** True while Play must keep a foreground pending-status GET loop (pre-SSE). */
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

/** Foreground pending poll cadence before W17 SSE ownership. */
export const PENDING_STORY_REFETCH_MS = 2_000;
