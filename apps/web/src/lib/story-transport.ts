import { storySnapshotSchema } from '@offscreen/contracts/stories';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { reconcileStorySnapshot } from '@/src/shared/api/story-snapshot-reconcile';

const requestTimeoutMs = 10000;

/**
 * Legacy local-state helper (Chamber). Prefer `writeStorySnapshot` for Query.
 * Still rejects cross-story swaps; does not encode viewer identity.
 */
export function preferNewerSnapshot(
  prior: StorySnapshot | null | undefined,
  next: StorySnapshot,
) {
  const result = reconcileStorySnapshot({
    viewerId: 'local',
    storyId: next.id,
    prior: prior && prior.id === next.id ? prior : undefined,
    priorEpoch: 0,
    next,
    nextEpoch: 1,
  });
  if (prior && prior.id !== next.id) {
    return prior;
  }
  return result.snapshot ?? prior ?? next;
}

export async function readStorySnapshot(storyId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/stories/${storyId}`, {
    cache: 'no-store',
    signal:
      signal === undefined
        ? AbortSignal.timeout(requestTimeoutMs)
        : AbortSignal.any([signal, AbortSignal.timeout(requestTimeoutMs)]),
  });
  if (!response.ok) {
    throw new Error('Unavailable');
  }
  return storySnapshotSchema.parse(await response.json());
}

export async function readSnapshotFromResponse(response: Response) {
  return storySnapshotSchema.parse(await response.json());
}

export async function submitStoryJson(args: {
  url: string;
  body: unknown;
  signal?: AbortSignal;
}) {
  return fetch(args.url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args.body),
    signal: args.signal ?? AbortSignal.timeout(requestTimeoutMs),
  });
}
