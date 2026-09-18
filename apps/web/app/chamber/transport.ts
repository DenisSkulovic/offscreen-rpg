import { chamberInspectorSchema } from '@offscreen/contracts/chamber';
import {
  preferNewerSnapshot,
  readSnapshotFromResponse,
  readStorySnapshot,
  submitStoryJson,
} from '../stories/story-transport';

const requestTimeoutMs = 10000;

export {
  preferNewerSnapshot,
  readSnapshotFromResponse,
  readStorySnapshot,
  submitStoryJson,
};

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
