import type { QueryClient } from '@tanstack/react-query';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { queryKeys } from './query-keys';
import { reconcileStorySnapshot } from './story-snapshot-reconcile';

const epochs = new Map<string, number>();

function epochKey(viewerId: string, storyId: string) {
  return `${viewerId}:${storyId}`;
}

export function clearStorySnapshotEpochs() {
  epochs.clear();
}

export function peekStorySnapshotEpoch(viewerId: string, storyId: string) {
  return epochs.get(epochKey(viewerId, storyId)) ?? 0;
}

let nextWriteEpoch = 1;

/** Allocate a monotonic request epoch for one story read/command completion. */
export function allocateStorySnapshotEpoch() {
  const epoch = nextWriteEpoch;
  nextWriteEpoch += 1;
  return epoch;
}

export function resetStorySnapshotEpochCounterForTests() {
  nextWriteEpoch = 1;
  epochs.clear();
}

/**
 * Sole allowed Query write for Play story snapshots. Callers must not
 * `setQueryData` the snapshot key directly.
 */
export function writeStorySnapshot(
  queryClient: QueryClient,
  ctx: { viewerId: string; storyId: string; requestEpoch: number },
  next: StorySnapshot,
) {
  const key = queryKeys.storySnapshot(ctx.viewerId, ctx.storyId);
  queryClient.setQueryData(key, (prior: StorySnapshot | undefined) => {
    const priorEpoch = epochs.get(epochKey(ctx.viewerId, ctx.storyId)) ?? 0;
    const result = reconcileStorySnapshot({
      viewerId: ctx.viewerId,
      storyId: ctx.storyId,
      prior,
      priorEpoch,
      next,
      nextEpoch: ctx.requestEpoch,
    });
    if (result.accepted) {
      epochs.set(epochKey(ctx.viewerId, ctx.storyId), result.epoch);
    }
    return result.snapshot;
  });
}
