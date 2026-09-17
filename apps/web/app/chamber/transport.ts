import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { chamberInspectorSchema } from '@offscreen/contracts/chamber';
import type { StorySnapshot } from '@offscreen/contracts/stories';

const requestTimeoutMs = 10000;

export function preferNewerSnapshot(
  prior: StorySnapshot | null | undefined,
  next: StorySnapshot,
) {
  if (!prior || next.viewVersion >= prior.viewVersion) {
    return next;
  }
  return prior;
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

export async function readChamberInspector(
  storyId: string,
  signal?: AbortSignal,
) {
  const response = await fetch(`/api/chamber-tools/stories/${storyId}`, {
    cache: 'no-store',
    signal:
      signal === undefined
        ? AbortSignal.timeout(requestTimeoutMs)
        : AbortSignal.any([signal, AbortSignal.timeout(requestTimeoutMs)]),
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error('Unavailable');
  }
  return chamberInspectorSchema.parse(await response.json());
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
