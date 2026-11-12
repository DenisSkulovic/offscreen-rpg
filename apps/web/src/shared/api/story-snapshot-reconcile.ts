import type { StorySnapshot } from '@offscreen/contracts/stories';

export type StorySnapshotReconcileInput = {
  viewerId: string;
  storyId: string;
  prior: StorySnapshot | undefined;
  /** Epoch of the write that produced `prior` (0 if none). */
  priorEpoch: number;
  next: StorySnapshot;
  /** Epoch of the request that produced `next`. Not Query dataUpdatedAt. */
  nextEpoch: number;
};

export type StorySnapshotReconcileResult = {
  snapshot: StorySnapshot | undefined;
  epoch: number;
  accepted: boolean;
};

function resolutionVersion(snapshot: StorySnapshot | undefined): number {
  return snapshot?.resolution?.version ?? 0;
}

/**
 * Pure domain gate for the story snapshot Query entry.
 * Rejects wrong story identity and non-monotonic versions; equal viewVersion
 * ties use request epoch, never transport arrival time.
 */
export function reconcileStorySnapshot(
  input: StorySnapshotReconcileInput,
): StorySnapshotReconcileResult {
  const { viewerId, storyId, prior, priorEpoch, next, nextEpoch } = input;
  if (!viewerId || next.id !== storyId) {
    return { snapshot: prior, epoch: priorEpoch, accepted: false };
  }
  if (prior && prior.id !== storyId) {
    return { snapshot: next, epoch: nextEpoch, accepted: true };
  }
  if (!prior) {
    return { snapshot: next, epoch: nextEpoch, accepted: true };
  }
  if (next.viewVersion > prior.viewVersion) {
    return { snapshot: next, epoch: nextEpoch, accepted: true };
  }
  if (next.viewVersion < prior.viewVersion) {
    return { snapshot: prior, epoch: priorEpoch, accepted: false };
  }
  const nextResolution = resolutionVersion(next);
  const priorResolution = resolutionVersion(prior);
  if (nextResolution < priorResolution) {
    return { snapshot: prior, epoch: priorEpoch, accepted: false };
  }
  if (nextResolution > priorResolution) {
    return { snapshot: next, epoch: nextEpoch, accepted: true };
  }
  if (nextEpoch < priorEpoch) {
    return { snapshot: prior, epoch: priorEpoch, accepted: false };
  }
  return { snapshot: next, epoch: nextEpoch, accepted: true };
}
